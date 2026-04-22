# Rollout

이 폴더는 이행 순서와 current rollout truth를 다룬다.

## 구성 원칙

- `docs/rollout/*.md`
  - living rollout truth
  - 현재 rollout order, current simulation guide, 현재도 유효한 transition note를 둔다
- `docs/rollout/plans/*.md`
  - active plan only
  - 아직 실행 전이거나 진행 중이거나 deferred execution gate가 살아 있는 계획만 둔다
- `docs/archive/historical/rollout/*.md`
  - completed implementation plan, checklist, handoff
  - 현재 runtime truth가 아니라 historical execution snapshot이다

## 사용 규칙

1. 현재 runtime naming, compose service, gateway prefix를 확인할 때는 historical rollout plan이 아니라 [../mappings/current-runtime-inventory.md](../mappings/current-runtime-inventory.md)를 먼저 본다.
2. plan이 구현 완료되면 `docs/rollout/plans/`에 남기지 않고 `docs/archive/historical/rollout/`로 이동한다.
3. archived rollout 문서는 당시 실행 기준을 보존하기 위한 문서이며, current truth로 인용하지 않는다.

## Start Here

- current deployment repo truth: [current-deployment-source-of-truth.md](current-deployment-source-of-truth.md)
- 현재 runtime/service/prefix inventory: [../mappings/current-runtime-inventory.md](../mappings/current-runtime-inventory.md)
- prod runtime/deploy 구조 다이어그램: [../mappings/prod-runtime-deployment-diagram.md](../mappings/prod-runtime-deployment-diagram.md)
- runtime/deploy runbook index: [../runbooks/README.md](../runbooks/README.md)
- `ev-dashboard` deploy gate: [../runbooks/ev-dashboard-ecs-preflight-gate.md](../runbooks/ev-dashboard-ecs-preflight-gate.md)
- `ev-dashboard` deploy operator loop: [../runbooks/ev-dashboard-ecs-deploy-operator-loop.md](../runbooks/ev-dashboard-ecs-deploy-operator-loop.md)
- `ev-dashboard` UI smoke와 decommission close-out: [../runbooks/ev-dashboard-ui-smoke-and-decommission.md](../runbooks/ev-dashboard-ui-smoke-and-decommission.md)
- `ev-dashboard` transition background / bridge-lane note: [2026-04-13-ecs-cdk-oidc-actions-transition.md](2026-04-13-ecs-cdk-oidc-actions-transition.md)
- 플랫폼 전체 구조와 작업 원칙: [../../WORKSPACE.md](../../WORKSPACE.md)
- repo 상태와 active runtime / empty shell 구분: [../../repo-map.md](../../repo-map.md)
- 새 EC2 부트스트랩 가이드: [2026-04-07-ec2-host-bootstrap.md](2026-04-07-ec2-host-bootstrap.md)
- 정산 phase 2 gate 정리: [12-settlement-phase-2-api-gates.md](12-settlement-phase-2-api-gates.md)
- 남은 empty-shell 서비스 구현 우선순위: [09-remaining-empty-shell-service-priority.md](09-remaining-empty-shell-service-priority.md)
- phase 1 구현물 정리 우선순위: [10-phase-1-runtime-refactor-priority.md](10-phase-1-runtime-refactor-priority.md)
- final phase 기능 backlog: [11-final-phase-feature-backlog.md](11-final-phase-feature-backlog.md)
- 현재 작업 방식: [15-ui-first-working-mode.md](15-ui-first-working-mode.md)
- UI 레이아웃 current lessons: [17-ui-layout-lessons.md](17-ui-layout-lessons.md)
- 웹 우선 전체 완성 순서: [16-web-first-platform-delivery-order.md](16-web-first-platform-delivery-order.md)
- 현재 front UI 규칙 감사: [14-front-ui-rule-audit.md](14-front-ui-rule-audit.md)
- `ev-dashboard` backend migration execution record: [../superpowers/plans/2026-04-14-ev-dashboard-backend-slices-implementation-plan.md](../superpowers/plans/2026-04-14-ev-dashboard-backend-slices-implementation-plan.md)

## ev-dashboard Current Operator Sequence

`ev-dashboard` current work는 rollout plan보다 아래 순서로 읽는 것이 맞다.

1. [../runbooks/ev-dashboard-ecs-preflight-gate.md](../runbooks/ev-dashboard-ecs-preflight-gate.md)
2. [../runbooks/ev-dashboard-ecs-deploy-operator-loop.md](../runbooks/ev-dashboard-ecs-deploy-operator-loop.md)
3. [2026-04-13-ecs-cdk-oidc-actions-transition.md](2026-04-13-ecs-cdk-oidc-actions-transition.md)
4. [../runbooks/ev-dashboard-ui-smoke-and-decommission.md](../runbooks/ev-dashboard-ui-smoke-and-decommission.md)

backend slice migration 자체는 완료됐고, 남은 것은 operational close-out이다.

current operator/current truth는 root workflow나 `clever-deploy-control`이 아니라 [current-deployment-source-of-truth.md](current-deployment-source-of-truth.md) -> `runtime-prod-platform -> EVDash-msa(/data) -> runtime-prod-release` 기준으로 읽는다. old central-deploy/root-workflow 문서는 [../archive/historical/rollout/](../archive/historical/rollout/) 아래 historical reference로만 남긴다.
