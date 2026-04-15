# ev-dashboard Runbook Entry Environment Review Design

**Date:** 2026-04-15

**Status:** approved design baseline

## Goal

`ev-dashboard` 관련 runbook 체계의 시작점을 `환경 검토`로 통일한다.

목표는 operator 가 `deploy`, `full shutdown`, `cold start rebuild` 중 어떤 작업을 하더라도, 먼저 같은 환경 검토 문서를 보고 현재 계정/도메인/이미지/권한/네트워크 전제가 맞는지 확인하게 만드는 것이다.

## Problem

현재 runbook 체계는 `deploy`와 `smoke/decommission`에는 강하지만, 다음 두 경우에서 entry gate 가 약하다.

1. runtime 을 다 내린 뒤 다시 올리는 cold start
2. operator 가 지금 무엇이 남아 있어야 하는지부터 확인해야 하는 shutdown/rebuild 전환 시점

현재 [docs/runbooks/README.md](/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/runbooks/README.md)는 `preprod release gate -> preflight -> deploy loop -> UI smoke/decommission` 순서로 시작한다.

이 순서는 “이미 ECS 경로가 살아 있고 deploy를 반복하는 운영”에는 맞지만, 아래 질문의 entry gate 역할은 부족하다.

- hosted zone 이 남아 있는가
- ECR image 가 남아 있는가
- GitHub vars/secrets 가 rebuild 가능한 상태인가
- VPC/subnet/OIDC role 이 여전히 유효한가
- 지금 destroy 를 해도 되는가
- 지금 fresh rebuild 를 시작해도 되는가

## Decision

runbook 인덱스의 맨 앞에 `환경 검토` 단계를 추가한다.

즉, `ev-dashboard` 관련 operator flow 는 아래 순서로 재정렬한다.

1. `환경 검토`
2. `cold start rebuild`
3. `deploy preflight`
4. `deploy operator loop`
5. `UI smoke / decommission`

핵심 원칙은 아래다.

- 모든 작업은 `환경 검토`를 선행한다.
- `환경 검토`는 deploy 전용 문서가 아니다.
- `destroy`, `rebuild`, `deploy`, `post-deploy verification` 모두 같은 entry gate 를 공유한다.

## Proposed Runbook Structure

### 1. Runbook Index Update

[docs/runbooks/README.md](/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/runbooks/README.md) 의 `Start Here` 와 `Runtime And Deploy` 섹션을 아래 구조로 바꾼다.

- `0. 환경 검토`
- `1. cold start rebuild`
- `2. deploy preflight`
- `3. deploy operator loop`
- `4. UI smoke / decommission`

이렇게 하면 operator 는 언제나 같은 진입점에서 시작한다.

### 2. New Entry Gate Runbook

새 문서를 추가한다.

권장 문서명:

- `docs/runbooks/ev-dashboard-runtime-environment-review.md`

이 문서의 역할은 아래와 같다.

- 현재 runtime 관련 선행조건 점검
- retained asset 과 destroyable runtime 을 구분
- 다음에 어떤 runbook 으로 분기해야 하는지 결정

### 3. New Cold Start Rebuild Runbook

환경 검토 문서가 생기면, cold start rebuild 용 runbook 도 분리하는 편이 맞다.

권장 문서명:

- `docs/runbooks/ev-dashboard-cold-start-rebuild.md`

이 문서는 아래만 다룬다.

- full destroy 이후 fresh rebuild 순서
- image/vars/OIDC/VPC 확인 뒤 `preflight -> deploy -> smoke` 로 가는 절차
- 새 ACM/ALB/RDS/Redis/secret 생성 확인

즉:

- `environment-review` 는 entry gate
- `cold-start-rebuild` 는 실행 경로

## Environment Review Content

새 `환경 검토` 문서에는 최소 아래 체크가 들어가야 한다.

### 1. Retained Asset Check

- Route53 hosted zone 존재
- ECR repository 존재
- 필요한 immutable SHA image 존재
- source of truth 문서 경로 확인

### 2. Infra Prerequisite Check

- VPC ID 유효
- public subnet ID 유효
- private subnet ID 유효
- CDK bootstrap 상태
- GitHub OIDC infra role 유효

### 3. GitHub Configuration Check

- required repo/environment variables 존재
- required secret 존재
- desired count 정책 확인
- deploy environment (`dev`, `stage`, `prod`) 와 domain 조합 일치

### 4. Runtime Policy Check

- 지금 작업이 `destroy`, `cold rebuild`, `deploy`, `smoke` 중 무엇인지 결정
- 데이터 복구가 필요한지 여부 결정
- fresh secret / fresh certificate / fresh datastore 생성 정책 확인

### 5. Branching Rule

검토 결과에 따라 바로 다음 문서가 결정되어야 한다.

- `destroy` 를 할 때
  - shutdown design / destroy plan 으로 이동
- `cold start rebuild`
  - `ev-dashboard-cold-start-rebuild.md`
- `routine deploy`
  - `ev-dashboard-ecs-preflight-gate.md`
- `post-deploy validation`
  - `ev-dashboard-ui-smoke-and-decommission.md`

## Cold Start Rebuild Content

새 rebuild runbook 에는 최소 아래가 필요하다.

### 1. Preconditions

- hosted zone retained
- ECR retained
- required SHA image confirmed
- GitHub vars/secrets confirmed
- OIDC role and CDK bootstrap confirmed

### 2. Fresh Provision Assumptions

- no snapshot restore
- new RDS instances
- new Redis node
- new runtime secrets
- new ACM certificate
- new alias records

### 3. Execution Path

기본 흐름:

```text
environment review
-> image/config validation
-> infra preflight
-> cdk deploy
-> deploy operator loop
-> UI smoke
```

### 4. Completion Criteria

- `ev-dashboard.com` 응답
- `api.ev-dashboard.com` 응답
- required public smoke 통과
- retained asset 와 rebuilt asset 가 문서대로 일치

## Why This Structure

이 구조의 장점은 아래다.

- runbook 진입점이 하나로 정리된다.
- shutdown 이후 rebuild 공백을 메운다.
- 기존 deploy runbook 을 오염시키지 않는다.
- `deploy 중 판단`, `UI smoke`, `decommission` 문서의 책임이 그대로 유지된다.

반대로, 환경 검토를 각 문서 서두에 중복 복붙하면 drift 가 생긴다.

특히 아래는 자주 바뀔 수 있다.

- retained asset 기준
- required vars/secrets 목록
- OIDC/bootstrap 전제
- fresh rebuild 정책

이 기준은 한 문서에서만 관리하는 편이 맞다.

## File Plan

이번 문서 체계 개편에서 바뀌는 파일은 아래로 제한한다.

- Modify:
  - [docs/runbooks/README.md](/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/runbooks/README.md)
- Create:
  - [docs/runbooks/ev-dashboard-runtime-environment-review.md](/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/runbooks/ev-dashboard-runtime-environment-review.md)
  - [docs/runbooks/ev-dashboard-cold-start-rebuild.md](/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/runbooks/ev-dashboard-cold-start-rebuild.md)

기존 문서는 링크 관계만 조정하고, 핵심 책임은 유지한다.

## Non-Goals

이번 개편에서 하지 않는 것:

- infra 코드 변경
- deploy workflow 변경
- shutdown 실행
- legacy EC2 bridge lane 문서 통합
- local development runbook 체계 개편

## Acceptance Criteria

아래가 충족되면 이 설계는 구현 완료로 본다.

1. `docs/runbooks/README.md` 의 첫 진입점이 `환경 검토` 로 바뀐다.
2. `환경 검토` 문서가 retained asset, infra prerequisite, GitHub config, branching rule 을 정의한다.
3. `cold start rebuild` 문서가 full destroy 이후 fresh rebuild 절차를 정의한다.
4. 기존 deploy/smoke/decommission 문서는 entry gate 뒤의 specialized runbook 로 남는다.
5. operator 가 “지금 destroy 할지, rebuild 할지, deploy 할지”를 runbook 체계 안에서 바로 결정할 수 있다.
