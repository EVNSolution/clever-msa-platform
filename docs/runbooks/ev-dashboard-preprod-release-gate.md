# ev-dashboard Pre-Prod Release Gate

이 문서는 `ev-dashboard` release에서 prod 직전 한 단계의 검증을 어떻게 수행하는지 고정한다.

## Purpose

- prod 전에 same artifact를 한 번 더 검증한다.
- 상시 candidate 환경 없이 temporary runtime lane으로 운영한다.
- 기본 비용을 낮추기 위해 snapshot clone DB는 기본값으로 두지 않는다.

## Current Default

현재 기본 pre-prod는 아래다.

- same AWS account
- same region `ap-northeast-2`
- temporary EC2 app/data host lane
- short-lived subdomain
  - `candidate.ev-dashboard.com`
  - `api.candidate.ev-dashboard.com`

이 lane은 release candidate 검증이 끝나면 제거한다.

## Important Boundary

이 runbook의 기본값은 low-cost mode다. 즉 prod와 같은 데이터 계층을 공유할 수 있다는 뜻이다. 따라서 이 gate는 모든 release에 동일하게 적용되지 않는다.

### Allowed By Default

- same SHA image runtime proof
- auth/docs/admin smoke
- read-only browser smoke
- 좁고 가역적인 reversible write smoke

### Not Allowed By Default

- long-lived dummy data seed
- dispatch/settlement 같은 큰 write workflow
- 외부 side effect
- schema-changing release를 migration까지 포함해 \"완전 격리 검증\"한 것처럼 간주하는 주장

## Mandatory Decision Before Pre-Prod

release를 아래 둘 중 하나로 먼저 분류한다.

### 1. Schema-Compatible Release

아래가 모두 참일 때:

- migration file이 없음
- startup migration behavior 변경 없음
- shared-data mode에서 read-only 또는 reversible write smoke만 하면 됨

이 경우 이 runbook의 temporary lane을 그대로 사용한다.

### 2. Migration-Bearing Or Side-Effect Release

아래 중 하나라도 참일 때:

- migration file 포함
- startup migration behavior 변경
- 외부 연동 write 확인 필요
- dispatch / settlement / telemetry ingest처럼 fan-out 큰 검증 필요

이 경우 low-cost pre-prod를 완전한 증거로 취급하지 않는다. 별도 승인과 더 비싼 검증 방식이 필요하다.

## Release Sequence

### Phase 1. Build Once

1. image를 SHA tag로 한 번만 build한다.
2. ECR image URI를 고정한다.
3. prod와 pre-prod 모두 같은 image URI를 사용한다.

### Phase 2. Bring Up Temporary Lane

1. short-lived candidate subdomain을 기존 hosted zone에 추가한다.
2. pre-prod용 env를 준비한다.
   - `APEX_DOMAIN=candidate.ev-dashboard.com`
   - `API_DOMAIN=api.candidate.ev-dashboard.com`
3. temporary runtime lane을 띄운다.

기본 원칙:

- 새 hosted zone은 만들지 않는다.
- 새 branded test domain은 만들지 않는다.
- candidate가 끝나면 alias record와 lane을 정리한다.

### Phase 3. Candidate Smoke

필수 smoke:

- front shell `200`
- auth health `200`
- openapi/swagger/admin proof
- slice별 protected `401`
- scope-aware browser smoke

browser smoke는 workflow가 아니라 agent runbook 영역이다. 변경 범위에 따라 시나리오를 선택한다.

### Phase 4. Teardown Or Scale Down

candidate proof가 끝나면:

- temporary lane을 destroy 또는 scale-down
- candidate subdomain alias 정리

### Phase 5. Prod Release

1. same SHA image를 prod에 배포한다.
2. prod smoke를 수행한다.
3. prod smoke는 final confirmation 용도다. candidate에서 이미 검증한 시나리오를 다시 크게 반복하지 않는다.

## What Counts As Success

pre-prod gate가 통과했다고 부를 수 있으려면 아래가 필요하다.

1. same SHA image가 temporary lane에서 떠야 한다.
2. public edge smoke가 통과해야 한다.
3. 이번 변경 범위에 맞는 browser smoke가 통과해야 한다.
4. release가 shared-data mode 허용 범위 안에 있어야 한다.

셋째나 넷째가 비면 \"candidate complete\"라고 부르지 않는다.

## Cost Notes

이 방식의 추가 비용은 주로 아래다.

- temporary ALB
- temporary EC2 app/data host runtime
- short-lived logs

기본값에서는 아래를 추가하지 않는다.

- extra hosted zone
- long-lived candidate environment
- snapshot clone DB
- extra Redis

즉 `prod 전에 한 단계`를 두는 구조 중에서 현재는 가장 싼 편이다.

## Linked Runbooks

- deploy 전 로컬 gate: [ev-dashboard-ecs-preflight-gate.md](/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/runbooks/ev-dashboard-ecs-preflight-gate.md)
- deploy 중 판단: [ev-dashboard-ecs-deploy-operator-loop.md](/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/runbooks/ev-dashboard-ecs-deploy-operator-loop.md)
- deploy 후 close-out: [ev-dashboard-ui-smoke-and-decommission.md](/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/runbooks/ev-dashboard-ui-smoke-and-decommission.md)
- 설계 정본: [../superpowers/specs/2026-04-14-ev-dashboard-preprod-gate-design.md](/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/superpowers/specs/2026-04-14-ev-dashboard-preprod-gate-design.md)
