# Runbooks

이 폴더는 실제 운영과 검증 순서를 바로 실행할 수 있게 정리한 runbook 모음이다.

## Start Here

`ev-dashboard` current runtime를 다룰 때는 아래 순서로 본다.

0. deployment repo truth: [../rollout/current-deployment-source-of-truth.md](../rollout/current-deployment-source-of-truth.md)
1. 환경 검토: [ev-dashboard-runtime-environment-review.md](ev-dashboard-runtime-environment-review.md)
2. cold start rebuild: [ev-dashboard-cold-start-rebuild.md](ev-dashboard-cold-start-rebuild.md)
3. deploy 전 검수 gate: [ev-dashboard-ecs-preflight-gate.md](ev-dashboard-ecs-preflight-gate.md)
4. deploy 중 wait signal과 time budget: [ev-dashboard-ecs-deploy-operator-loop.md](ev-dashboard-ecs-deploy-operator-loop.md)
5. cutover 이후 UI smoke와 decommission: [ev-dashboard-ui-smoke-and-decommission.md](ev-dashboard-ui-smoke-and-decommission.md)
6. current runtime truth: [../mappings/current-runtime-inventory.md](../mappings/current-runtime-inventory.md)

## Runtime And Deploy

- `ev-dashboard` 환경 검토: [ev-dashboard-runtime-environment-review.md](ev-dashboard-runtime-environment-review.md)
- `ev-dashboard` cold start rebuild: [ev-dashboard-cold-start-rebuild.md](ev-dashboard-cold-start-rebuild.md)
- `ev-dashboard` deploy preflight gate: [ev-dashboard-ecs-preflight-gate.md](ev-dashboard-ecs-preflight-gate.md)
- `ev-dashboard` deploy operator loop: [ev-dashboard-ecs-deploy-operator-loop.md](ev-dashboard-ecs-deploy-operator-loop.md)
- `ev-dashboard` UI smoke와 old path decommission: [ev-dashboard-ui-smoke-and-decommission.md](ev-dashboard-ui-smoke-and-decommission.md)
- `ev-dashboard` prod 전 temporary lane release gate: [ev-dashboard-preprod-release-gate.md](ev-dashboard-preprod-release-gate.md)

## Local Development

- 로컬 배차/정산 통합 스택: [local-dispatch-settlement-stack.md](local-dispatch-settlement-stack.md)
- front driver app 로컬 준비: [front-driver-app-local-setup.md](front-driver-app-local-setup.md)

## Policy Runbooks

- 회사 단위 navigation policy: [company-navigation-policy.md](company-navigation-policy.md)
- 매니저 단위 navigation policy: [manager-navigation-policy.md](manager-navigation-policy.md)

## Usage Rules

1. runbook은 current operator sequence를 적는다. historical execution record는 `docs/rollout/` 또는 `docs/archive/`에 둔다.
2. `ev-dashboard` 관련 운영 질문은 slice implementation plan보다 이 폴더의 `Start Here` 순서와 current runtime truth를 먼저 본다.
3. deploy가 끝나면 root [lesson.md](../../lesson.md)와 관련 runbook을 같이 갱신한다.
4. current operator runbook에서 legacy bridge target을 기본 target처럼 쓰지 않는다. legacy bridge는 historical evidence가 필요할 때만 언급한다.
