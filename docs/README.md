# Docs

이 폴더는 `clever-msa-platform`의 문서 정본이다.

## Start Here

- 플랫폼 전체 구조와 작업 원칙: [../WORKSPACE.md](/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/WORKSPACE.md)
- target repo와 migration 상태: [../repo-map.md](/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/repo-map.md)
- 현재 runtime repo / compose service / gateway prefix inventory: [mappings/current-runtime-inventory.md](/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/mappings/current-runtime-inventory.md)
- 현재 코드에서 target repo로 가는 이동표: [mappings/current-to-target-repo-map.md](/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/mappings/current-to-target-repo-map.md)
- repo별 책임 경계: [mappings/repo-responsibility-matrix.md](/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/mappings/repo-responsibility-matrix.md)
- 디자인 canonical contract: [contracts/21-design-system-and-surface-rules.md](/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/contracts/21-design-system-and-surface-rules.md)
- rollout living docs와 active plan 규칙: [rollout/README.md](/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/rollout/README.md)
- 운영/검증 runbook index: [runbooks/README.md](/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/runbooks/README.md)
- `ev-dashboard` prod 전 temporary lane gate: [runbooks/ev-dashboard-preprod-release-gate.md](/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/runbooks/ev-dashboard-preprod-release-gate.md)
- `ev-dashboard` 배포 전 gate: [runbooks/ev-dashboard-ecs-preflight-gate.md](/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/runbooks/ev-dashboard-ecs-preflight-gate.md)
- `ev-dashboard` 배포 중 operator sequence: [runbooks/ev-dashboard-ecs-deploy-operator-loop.md](/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/runbooks/ev-dashboard-ecs-deploy-operator-loop.md)
- `ev-dashboard` UI smoke와 decommission close-out: [runbooks/ev-dashboard-ui-smoke-and-decommission.md](/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/runbooks/ev-dashboard-ui-smoke-and-decommission.md)
- 문서 정본 정렬 계획: [superpowers/plans/2026-04-15-platform-docs-canonical-truth-alignment-implementation-plan.md](/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/superpowers/plans/2026-04-15-platform-docs-canonical-truth-alignment-implementation-plan.md)
- 다음 개발/배포 시나리오 계획: [superpowers/plans/2026-04-15-platform-next-development-and-deploy-scenarios-plan.md](/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/superpowers/plans/2026-04-15-platform-next-development-and-deploy-scenarios-plan.md)

- `goals/`: 플랫폼의 목표 상태와 상위 방향
- `boundaries/`: 서비스 경계와 소유 데이터
- `mappings/`: 현재 구조와 목표 구조 사이의 이동표
- `contracts/`: 공통 ID, 상태, read model, integration contract
- `decisions/`: 왜 이런 구조를 택했는지에 대한 결정 기록과 spec
- `rollout/`: living rollout docs와 active plan only 영역
- `archive/`: 더 이상 정본이 아닌 문서 보관, completed rollout artifact 포함

실행 코드, compose, env, seed script는 이 폴더에 두지 않는다.

현재 runtime naming, compose service, gateway prefix 같은 질문은 historical rollout plan이 아니라 `mappings/current-runtime-inventory.md`를 먼저 본다. `ev-dashboard` 운영 절차 질문은 `runbooks/README.md`부터 보고, prod 정본은 `infra-ev-dashboard-platform -> CDK/ECS -> ev-dashboard.com` 기준으로 읽는다. `clever-deploy-control` 관련 문서는 bridge lane이나 legacy reference가 필요할 때만 본다.
