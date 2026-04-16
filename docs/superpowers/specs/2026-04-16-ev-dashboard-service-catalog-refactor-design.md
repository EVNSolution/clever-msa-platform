# ev-dashboard Service Catalog Refactor Design

## Purpose

이 문서는 `infra-ev-dashboard-platform` 배포 코드의 서비스 메타데이터를 단일 카탈로그로 끌어올리는 1차 리팩터링 설계를 고정한다.

목표는 아래다.

1. 서비스 정의의 중복 복제를 줄인다.
2. `warm-host-partial`과 `incremental-expand`의 기존 동작을 유지한 채, 서비스 메타 참조 경로를 하나로 모은다.
3. wave, route group, impact, health-path, env-key, desired-count key 같은 반복 정의를 한 곳으로 관리한다.
4. 이후 `config.ts`, `preflight.ts`, `ev-dashboard-platform-stack.ts`를 더 작게 나눌 수 있는 기반을 만든다.

## Current Problem

현재 배포 코드에서 서비스 메타데이터는 여러 파일에 분산되어 있다.

- `.github/workflows/deploy-ecs.yml`
- `lib/config.ts`
- `lib/preflight.ts`
- `lib/releaseImpact.ts`
- `lib/releaseWavePolicy.ts`
- `lib/gatewayRouteProfile.ts`
- `lib/ev-dashboard-platform-stack.ts`

이 구조의 문제는 아래와 같다.

1. 서비스 하나를 추가하거나 이름을 바꾸면 여러 파일을 동시에 수정해야 한다.
2. wave, route group, slice, env key가 서로 어긋날 위험이 크다.
3. `stack.ts`를 나누기 전에 먼저 정리해야 할 공통 정의가 흩어져 있다.
4. 배포 경로 최적화보다 메타데이터 동기화 비용이 더 큰 상태다.

즉 현재 부채의 중심은 “파일이 크다”보다 **같은 서비스 정의가 여러 군데에 중복되어 있다**는 점이다.

## Locked Requirements

이번 리팩터링에서 아래는 유지한다.

1. `warm-host-partial`은 기존 running host 기준 partial deploy lane으로 유지한다.
2. `incremental-expand`는 baseline 확장 / stack 재배포 lane으로 유지한다.
3. `backend-only`, `gateway-required`, `front-required` 영향 판정 의미는 유지한다.
4. `edge-api-gateway`는 backend 뒤, `front-web-console`은 마지막이라는 wave 정책은 유지한다.
5. 현재 proven deploy behavior를 깨는 구조 변경은 하지 않는다.

이번 리팩터링에서 새로 고정하는 것은 아래다.

1. 서비스 메타데이터는 `serviceCatalog.ts` 한 곳에서 정의한다.
2. 기존 매핑 파일은 카탈로그를 소비하는 thin wrapper로 바꾼다.
3. `config.ts`, `preflight.ts`, `stack.ts`는 카탈로그를 읽는 방향으로 단계적으로 축소한다.
4. 1차 단계에서는 서비스 동작을 바꾸지 않고 메타 참조 경로만 바꾼다.

## Options Considered

### 1. Keep the current distributed metadata

구조:

- 각 파일이 자기 책임 안에서 서비스 메타를 직접 관리한다.

장점:

- 당장 코드 이동이 없다.

단점:

- 중복이 계속 남는다.
- 이후 리팩터링도 같은 중복 위에서 진행해야 한다.
- 배포 경로와 문서가 어긋날 위험이 계속된다.

### 2. Split `ev-dashboard-platform-stack.ts` first

구조:

- stack file을 app host / data host / DNS / service defs 등으로 먼저 나눈다.

장점:

- 가장 큰 파일을 먼저 줄일 수 있다.

단점:

- 중복 메타 정의는 그대로 남는다.
- 분해한 파일들끼리 다시 같은 서비스 정의를 복제할 가능성이 높다.
- 문제의 근본보다 결과물만 나누는 순서다.

### 3. Create a shared service catalog first

구조:

- 새 `serviceCatalog.ts`에 서비스 메타를 모은다.
- `releaseWavePolicy.ts`, `releaseImpact.ts`, `gatewayRouteProfile.ts`부터 카탈로그를 읽게 바꾼다.
- 그 다음 `config.ts`, `preflight.ts`, `stack.ts`를 카탈로그 소비형으로 바꾼다.

장점:

- 중복 제거 효과가 가장 크다.
- 기존 배포 behavior를 유지하면서 점진적으로 얇게 만들 수 있다.
- 이후 stack 분해도 같은 카탈로그를 기준으로 할 수 있다.

단점:

- 1차 단계에서는 새 abstraction layer를 도입해야 한다.

## Decision

이번 리팩터링은 **3번, 서비스 카탈로그를 먼저 만드는 구조**를 채택한다.

즉 1차 목표는 아래다.

```text
service metadata duplicated across many files
-> central service catalog
-> wave / route-group / impact modules consume catalog
-> config / preflight / stack migrate later
```

이 설계는 behavior 변경이 아니라 **metadata ownership 이동**이다.

## Target Model

### 1. New Catalog Module

새 파일:

- `development/infra-ev-dashboard-platform/lib/serviceCatalog.ts`

여기에 아래 메타를 모은다.

- service name
- image env key
- desired count env key
- cpu env key
- memory env key
- default health path env key
- route group
- release wave
- slice name
- deploy/runtime classification
- gateway/front relevance

카탈로그는 “현재 runtime contract에 필요한 메타데이터 정본” 역할을 한다.

이 단계에서 `slice`는 설명용 informational metadata로만 두고, preflight dependency truth는 아직 그 값을 기준으로 정본화하지 않는다.

### 2. Thin Consumers

아래 파일은 직접 매핑을 소유하지 않고 카탈로그를 읽는 consumer로 바꾼다.

- `lib/releaseWavePolicy.ts`
- `lib/releaseImpact.ts`
- `lib/gatewayRouteProfile.ts`

1차 단계에서는 이 세 파일만 먼저 바꾼다.

이유는 아래다.

1. 현재 중복이 명확하다.
2. 런타임 behavior 변경 없이 refactor 효과를 바로 볼 수 있다.
3. 테스트 범위가 비교적 작다.

이 단계에서 `gatewayRouteProfile.ts`의 `gatewayRouteGroups` 순서와 `bootstrap-proof / partial / full` 산출 semantics는 변경하지 않는다.

### 3. Deferred Consumers

아래 파일은 2차 단계에서 카탈로그를 읽게 바꾼다.

- `lib/config.ts`
- `lib/preflight.ts`
- `lib/ev-dashboard-platform-stack.ts`

이 파일들은 env parsing, AWS lookup, service manifest assembly까지 얽혀 있으므로 1차 단계에서 한 번에 건드리지 않는다.

### 4. Workflow Boundary

`.github/workflows/deploy-ecs.yml`는 1차 단계에서 구조를 바꾸지 않는다.

이유:

- 현재 workflow는 deploy contract의 입력면이다.
- 먼저 내부 메타 소비를 바꾼 뒤, 이후 단계에서 workflow env 중복을 줄이는 편이 안전하다.

즉 workflow env 나열은 “문제의 증상”이지만, 1차 단계의 직접 변경 대상은 아니다.

## Catalog Shape

1차 단계에서 필요한 최소 shape는 아래다.

```ts
type ServiceCatalogEntry = {
  service: ReleaseManifestServiceName;
  routeGroup?: GatewayRouteGroup;
  wave: 1 | 2 | 3 | 4;
  slice:
    | 'auth-surface'
    | 'company-governance'
    | 'people-and-assets'
    | 'dispatch-inputs'
    | 'dispatch-read-models'
    | 'settlement'
    | 'support-surface'
    | 'terminal-and-telemetry';
  imageEnvKey: string;
  desiredCountEnvKey: string;
  cpuEnvKey: string;
  memoryEnvKey: string;
  healthCheckPathEnvKey?: string;
};
```

주의:

- 1차 단계에서는 `stack.ts` 전체를 옮길 만큼 큰 runtime spec까지 넣지 않는다.
- 먼저 중복이 심한 metadata만 올린다.
- 이후 단계에서 필요하면 container name, internal URL, port, bootstrap/runtime flags를 추가한다.

## Migration Order

### Phase 1

- `serviceCatalog.ts` 생성
- `releaseWavePolicy.ts`가 catalog 기반으로 wave 계산
- `releaseImpact.ts`가 catalog 기반으로 touched route groups 계산
- `gatewayRouteProfile.ts`가 catalog 기반으로 enabled route groups 계산

### Phase 2

- `config.ts`의 env key 반복 제거
- `preflight.ts`의 image key / slice state / dependency 일부를 catalog 참조로 이동

### Phase 3

- `ev-dashboard-platform-stack.ts`의 service-definition metadata를 catalog 소비형으로 재배치
- 이후 필요하면 stack file 분해

## Non-Goals

이번 1차 설계는 아래를 하지 않는다.

1. `warm-host-partial` behavior 변경
2. `incremental-expand` 제거
3. `app_host.py` 책임 분해
4. workflow input contract 축소
5. blue/green 같은 무중단 교체 추가

이 작업은 “서비스 메타 정본화”까지만 담당한다.

## Risks And Guards

### Risk 1: Catalog abstraction drifts from current behavior

Guard:

- 기존 `releaseImpact`, `releaseWavePolicy`, `gatewayRouteProfile` 테스트를 그대로 유지하고 catalog 기반으로만 바꾼다.

### Risk 2: Catalog is too ambitious in phase 1

Guard:

- runtime spec 전체가 아니라 metadata subset만 먼저 올린다.

### Risk 3: Stack refactor pressure leaks into phase 1

Guard:

- `stack.ts`는 이번 단계에서 읽지 않는다.
- 1차 성공 기준은 consumer 3개 전환과 테스트 통과다.

## Success Criteria

이번 1차 리팩터링이 성공했다는 기준은 아래다.

1. 서비스별 wave mapping이 `releaseWavePolicy.ts` 내부 상수에서 사라진다.
2. 서비스별 route-group mapping이 `releaseImpact.ts` 내부 상수에서 사라진다.
3. `gatewayRouteProfile.ts`가 서비스별 desired-count 분기를 직접 소유하지 않는다.
4. 관련 테스트가 기존 behavior를 유지한 채 green이다.
5. 이후 `config.ts`와 `preflight.ts`를 catalog 기반으로 바꿀 수 있는 얇은 경계가 생긴다.
