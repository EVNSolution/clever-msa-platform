# ev-dashboard Full Bootstrap Optimization Design

## Purpose

이 문서는 `infra-ev-dashboard-platform`의 다음 최적화 단계를 `full` 배포의 bootstrap 시간 축으로 고정한다.

이번 단계의 목표는 아래 두 가지다.

1. `RUN_PROFILE=full`에서 **불필요한 app host replacement를 줄인다.**
2. replacement가 실제로 필요할 때만 EC2 bootstrap, image pull, public smoke를 타게 만들어 **full 회귀 시간을 줄인다.**

이번 단계는 deploy contract, gateway semantics, runtime surface를 바꾸는 작업이 아니다. 현재 운영 `full`이 성공한 상태를 유지하면서 **replacement surface만 줄이는 최적화**다.

## Current Evidence

현재 증거는 아래와 같다.

1. 현재 운영 `full`은 실제로 성공한다.
   - 최근 성공 run: `24544265674`
   - `prod`에서 app host replacement 포함으로 `UPDATE_COMPLETE` + public smoke green
2. 현재 `full`의 비용은 stack event count 자체보다 **app host replacement + bootstrap**이 크다.
   - 최근 성공 run의 감각적 분해:
     - preflight 약 `47s`
     - unit tests 약 `1m39s`
     - synth 약 `10s`
     - deploy stack 약 `2m31s`
     - post-deploy smoke 약 `3m`
     - 총 약 `8m20s`
3. prod stack 자체는 이미 작지 않다.
   - 총 리소스 약 `80`
   - 그중 `SecretsManager::Secret`가 `49`
   - 그러나 이번 성공 run에서 실제 update 이벤트의 중심은
     - `RuntimeImageMapParam`
     - 새 app host create
     - target group update
     - 이전 app host delete
     였다.
4. 현재 app host replacement는 bootstrap 비용을 동반한다.
   - 새 app host에서 bootstrap package fetch
   - Docker install / runtime bootstrap
   - ECR login / image pull
   - full reconcile
   - ALB target healthy 전환
   - public smoke poll

즉 현재 `full` 시간 최적화의 가장 직접적인 레버는 **stack 전체 단순화보다 먼저 replacement 빈도를 줄이는 것**이다.

## Current Problem

현재 `full` 경로는 아래 순서다.

```text
preflight
-> unit tests
-> cdk synth
-> CloudFormation update
-> app host replacement (when triggered)
-> app host bootstrap + full reconcile
-> public smoke poll
```

이 경로에서 시간 비용이 커지는 핵심 이유는 아래다.

1. `ev-dashboard-platform-stack.ts`의 `appRuntimeFingerprint`가 너무 넓은 입력면을 잡고 있다.
2. `Ec2AppHost`는 `userDataCausesReplacement: true`라서 bootstrap surface가 바뀌면 새 host를 만든다.
3. 현재 fingerprint는 `runProfile`과 전체 `imageMap`을 포함하므로, 실제 live runtime이 바뀌지 않아도 replacement가 일어날 수 있다.
4. replacement가 한 번 발생하면 `app_host.py`가 enabled 서비스 전체를 다시 pull/run 하므로 bootstrap cost가 그대로 따라온다.

즉 지금 문제는 “full이 원래 느리다”가 아니라, **full이 바뀐 범위보다 더 넓은 replacement를 일으킬 수 있다**는 점이다.

## Locked Requirements

이번 최적화에서 아래는 유지한다.

1. `RUN_PROFILE=full`의 의미는 유지한다.
2. `warm-host-partial` / `incremental-expand` / `full` profile semantics는 유지한다.
3. `gatewayRouteGroups`의 순서와 `bootstrap-proof / partial / full` profile 산출 semantics는 유지한다.
4. `edge-api-gateway`는 backend 뒤, `front-web-console`은 마지막이라는 runtime ordering은 유지한다.
5. 현재 proven host sizing record와 preflight policy 의미는 유지한다.
6. smoke contract는 “운영 full이 green이어야 한다”는 의미를 유지한다.

이번 단계에서 바꾸는 것은 아래다.

1. app host replacement를 유발하는 runtime fingerprint 입력면
2. stack 안에서 app host bootstrap material로 간주하는 metadata의 경계
3. replacement가 필요 없는 변화는 existing host update로 끝나도록 만드는 internal contract

## Non-Goals

이번 단계는 아래를 하지 않는다.

1. `SecretsManager::Secret` 수를 줄이는 작업
2. SSM/runtime image map/secret 주입 구조의 대규모 단순화
3. telemetry listener cutover
4. `warm-host-partial` 동작 변경
5. gateway/front runtime contract 변경
6. smoke suite 자체를 축소해서 green 기준을 낮추는 작업

즉 이번 단계는 **bootstrap 시간 최적화**까지만 다루고, **stack secret/metadata simplification**은 다음 계획으로 넘긴다.

## Options Considered

### 1. Only tune smoke timing

구조:

- `postDeploySmoke.ts`의 poll/timeout만 줄인다.

장점:

- 구현 범위가 작다.

단점:

- replacement가 계속 발생하면 본질 비용은 그대로다.
- green 기준은 같아도 root cause를 건드리지 못한다.

### 2. Rework bootstrap internals first

구조:

- `app_host.py`에서 image pull/run 전략을 먼저 바꾼다.

장점:

- replacement가 unavoidable일 때 시간을 줄일 수 있다.

단점:

- host runtime behavior 자체를 먼저 바꾸게 된다.
- 현재 병목의 첫 원인인 “왜 replacement가 일어났는가”를 건드리지 못한다.

### 3. Narrow replacement surface first

구조:

- `appRuntimeFingerprint`와 related bootstrap inputs를 재정의한다.
- 실제 live runtime을 바꾸는 변화만 replacement를 유발하게 만든다.
- smoke semantics와 gateway/front ordering은 그대로 둔다.

장점:

- 가장 큰 비용원인 replacement 빈도를 직접 줄인다.
- runtime behavior를 크게 바꾸지 않는다.
- 이후 bootstrap 내부 최적화와 stack 단순화 모두의 기반이 된다.

단점:

- runtime fingerprint contract를 테스트로 고정해야 한다.

## Decision

이번 단계는 **3번, replacement surface를 먼저 줄이는 접근**을 채택한다.

즉 이번 phase의 중심은 아래다.

```text
full deploy time problem
-> app host replacement happens too broadly
-> narrow runtime fingerprint and bootstrap-bound metadata
-> keep existing full semantics
-> reduce how often full must pay the bootstrap cost
```

## Target Design

### 1. Make the app-host runtime payload explicit

현재 `ev-dashboard-platform-stack.ts`는 runtime image map, service manifest, secret map, `appRuntimeFingerprint`를 같은 흐름에서 조합한다.

이번 단계에서는 여기서 **“app host replacement를 정당화하는 material”**을 별도 payload 개념으로 명시한다.

이 payload는 아래만 포함해야 한다.

1. enabled runtime service set
2. enabled service의 image identity
3. enabled service의 host-visible runtime spec
   - container/host port
   - environment
   - enabled flag
4. bootstrap package identity

반대로 아래는 replacement payload에서 제외 검토 대상이다.

1. `runProfile`
2. disabled service image changes
3. disabled service runtime metadata
4. stack-local metadata 중 host bootstrap과 직접 무관한 값

이 payload는 반드시 **deterministic normalized form**으로 hash해야 한다.

정규화 규칙은 아래를 따른다.

1. service list 순서는 stable sort로 고정한다.
2. service 내부 `environment` key 순서는 stable sort로 고정한다.
3. object key 순서는 stable sort로 고정한다.
4. `undefined`는 hash payload에 넣지 않고, `null`이 의미 있는 필드만 명시적으로 `null`을 쓴다.
5. disabled service는 payload에서 완전히 제외한다.

즉 “실제 runtime 변화 없음”과 “serialization noise”를 분리하는 것이 이번 단계의 필수 조건이다.

### 2. Keep host replacement tied to actual bootstrap contract changes

`Ec2AppHost`의 `userDataCausesReplacement: true`는 유지한다.

다만 replacement를 유발하는 fingerprint 입력면을 줄여서, 아래 경우에만 새 host가 생기도록 만든다.

1. enabled app runtime spec이 실제로 달라질 때
2. enabled image set이 실제로 달라질 때
3. bootstrap package 자체가 달라질 때

이렇게 하면 동일 runtime인데 profile 이름이나 disabled service image만 바뀌는 경우는 replacement를 피할 수 있다.

### 3. Preserve current runtime contract

이번 단계는 runtime ordering과 deploy surface를 바꾸지 않는다.

즉 아래는 그대로 유지한다.

1. app host service ordering
2. gateway route-group semantics
3. public smoke contract
4. `warm-host-partial`과 `full`의 operator meaning

이번 단계는 새 runtime behavior를 도입하는 작업이 아니라, **replacement boundary를 정리하는 작업**이다.

## Expected Outcomes

이 설계가 맞으면 아래 결과를 기대할 수 있다.

1. 같은 live runtime에 대해 `full` rerun 시 불필요한 app host replacement가 줄어든다.
2. CloudFormation update가 있어도 app host bootstrap을 생략하는 경우가 생긴다.
3. `full` 회귀 시간은 app host replacement가 사라진 케이스에서 크게 줄어든다.
4. 이후 phase에서 stack secret/metadata 단순화를 해도 “무엇이 host replacement material인가”를 명확히 유지할 수 있다.

## Success Criteria

이번 단계 완료 기준은 아래다.

1. `appRuntimeFingerprint` 입력면이 명시적 helper 또는 typed payload로 분리된다.
2. `runProfile` 변경만으로는 app host replacement가 발생하지 않는다.
3. disabled service image change만으로는 app host replacement가 발생하지 않는다.
4. enabled runtime image/spec change는 여전히 replacement를 유발한다.
5. bootstrap package identity change는 replacement를 유발한다.
6. deploy-path tests와 stack tests가 green이다.
7. 실제 `full` 회귀에서 아래 두 시나리오가 설명 가능해진다.
   - no-op full rerun -> replacement 없음
   - enabled image/spec change -> replacement 있음
8. live regression evidence는 최소 아래를 남긴다.
   - `AppHost` instance id before/after
   - stack events around `AppHost`
   - public smoke 결과

## Risks And Guards

### Risk 1: Narrowing fingerprint too far

Guard:

- stack tests에서 “replacement must still happen” 케이스를 먼저 RED/GREEN으로 잠근다.

### Risk 2: Accidentally changing gateway/front semantics

Guard:

- `gatewayRouteGroups` ordering and semantics are out of scope.
- gateway/front/runtime-contract changes must not be bundled into this phase.

### Risk 3: Confusing this phase with stack simplification

Guard:

- secret/SSM/env injection simplification은 다음 계획으로만 문서화한다.
- 이번 phase에서는 bootstrap-bound metadata 경계만 정리한다.

## Next Plan

이번 단계 다음 계획은 아래로 고정한다.

### Next Plan: stack secret/metadata simplification

다음 단계에서는 아래를 다룬다.

1. `SecretsManager::Secret` 수와 secret ownership grouping 재정리
2. runtime image map / secret map / env injection diff surface 축소
3. stack resource/event surface 단순화
4. operator가 stack diff를 더 읽기 쉽게 만드는 구조 정리

즉 순서는 아래다.

```text
Current Plan: full bootstrap optimization
Next Plan: stack secret/metadata simplification
```
