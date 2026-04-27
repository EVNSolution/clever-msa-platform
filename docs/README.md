# Docs

이 폴더는 `clever-msa-platform`의 문서 정본이다.

이 `README.md`는 문서 index와 진입 안내만 담당한다. canonical truth는 링크된 실제 문서들에 있다.

## Start Here

- 플랫폼 전체 구조와 작업 원칙: [../WORKSPACE.md](../WORKSPACE.md)
- current deployment repo truth: [rollout/current-deployment-source-of-truth.md](rollout/current-deployment-source-of-truth.md)
- 상위 목표 문서 index: [goals/README.md](goals/README.md)
- target source slice와 migration 상태: [../repo-map.md](../repo-map.md)
- 현재 runtime repo / compose service / gateway prefix inventory: [mappings/current-runtime-inventory.md](mappings/current-runtime-inventory.md)
- 현재 코드에서 target repo로 가는 이동표: [mappings/current-to-target-repo-map.md](mappings/current-to-target-repo-map.md)
- repo별 책임 경계: [mappings/repo-responsibility-matrix.md](mappings/repo-responsibility-matrix.md)
- 디자인 canonical contract: [contracts/21-design-system-and-surface-rules.md](contracts/21-design-system-and-surface-rules.md)
- rollout living docs와 active plan 규칙: [rollout/README.md](rollout/README.md)
- 운영/검증 runbook index: [runbooks/README.md](runbooks/README.md)
- `ev-dashboard` prod 전 temporary lane gate: [runbooks/ev-dashboard-preprod-release-gate.md](runbooks/ev-dashboard-preprod-release-gate.md)
- `ev-dashboard` 배포 전 gate: [runbooks/ev-dashboard-ecs-preflight-gate.md](runbooks/ev-dashboard-ecs-preflight-gate.md)
- `ev-dashboard` 배포 중 operator sequence: [runbooks/ev-dashboard-ecs-deploy-operator-loop.md](runbooks/ev-dashboard-ecs-deploy-operator-loop.md)
- `ev-dashboard` UI smoke와 decommission close-out: [runbooks/ev-dashboard-ui-smoke-and-decommission.md](runbooks/ev-dashboard-ui-smoke-and-decommission.md)
- 문서 정본 정렬 계획: [superpowers/plans/2026-04-15-platform-docs-canonical-truth-alignment-implementation-plan.md](superpowers/plans/2026-04-15-platform-docs-canonical-truth-alignment-implementation-plan.md)
- 다음 개발/배포 시나리오 계획: [superpowers/plans/2026-04-15-platform-next-development-and-deploy-scenarios-plan.md](superpowers/plans/2026-04-15-platform-next-development-and-deploy-scenarios-plan.md)
- `archive/develop` cleanup 계획: [superpowers/plans/2026-04-15-archive-develop-cleanup-implementation-plan.md](superpowers/plans/2026-04-15-archive-develop-cleanup-implementation-plan.md)
- 서비스 source slice template baseline: [superpowers/specs/2026-04-15-service-repo-template-baseline-design.md](superpowers/specs/2026-04-15-service-repo-template-baseline-design.md)
- 서비스 source slice template rollout 계획: [superpowers/plans/2026-04-15-service-repo-template-rollout-implementation-plan.md](superpowers/plans/2026-04-15-service-repo-template-rollout-implementation-plan.md)
- 서비스 repo template audit matrix: [mappings/service-repo-template-audit-matrix.md](mappings/service-repo-template-audit-matrix.md)

- `goals/`: 플랫폼의 목표 상태와 상위 방향
- `boundaries/`: 서비스 경계와 소유 데이터
- `mappings/`: 현재 구조와 목표 구조 사이의 이동표
- `contracts/`: 공통 ID, 상태, read model, integration contract
- `decisions/`: 왜 이런 구조를 택했는지에 대한 결정 기록과 spec
- `rollout/`: living rollout docs와 active plan only 영역
- `archive/`: 더 이상 정본이 아닌 문서 보관, completed rollout artifact 포함

실행 코드, compose, env, seed script는 이 폴더에 두지 않는다.

현재 runtime naming, compose service, gateway prefix 같은 질문은 historical rollout plan이 아니라 `mappings/current-runtime-inventory.md`를 먼저 본다. 배포 slice ownership과 current deploy truth는 `rollout/current-deployment-source-of-truth.md`를 먼저 본다. 운영 절차 질문은 `runbooks/README.md`부터 보고, prod 런타임 정본은 `runtime-prod-platform -> EVDash-msa(/data) -> runtime-prod-release` 기준으로 읽는다. `infra-ev-dashboard-platform`, `clever-deploy-control` 관련 문서는 bridge lane이나 legacy reference가 필요할 때만 본다.

`goals/`는 상위 목표와 north-star를 보관하는 폴더다. current runtime truth나 operator 절차를 찾을 때는 `goals/`부터 읽지 않는다.
