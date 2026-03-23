# Implementation Handoff Checklist

## Source of Truth Docs

- [docs/superpowers/specs/2026-03-19-account-driver-settlement-msa-design.md](../specs/2026-03-19-account-driver-settlement-msa-design.md)
- [docs/superpowers/plans/2026-03-19-account-driver-settlement-msa-master-plan.md](./2026-03-19-account-driver-settlement-msa-master-plan.md)
- [goal/06-id-and-state-dictionary.md](../../../goal/06-id-and-state-dictionary.md)
- [goal/07-legacy-api-mapping.md](../../../goal/07-legacy-api-mapping.md)
- [goal/08-rollout-order.md](../../../goal/08-rollout-order.md)
- [goal/11-account-driver-settlement-boundary-map.md](../../../goal/11-account-driver-settlement-boundary-map.md)
- [goal/12-account-driver-settlement-owned-data-matrix.md](../../../goal/12-account-driver-settlement-owned-data-matrix.md)
- [goal/13-account-driver-settlement-compose-simulation.md](../../../goal/13-account-driver-settlement-compose-simulation.md)
- [reference/03-account-driver-settlement-legacy-cut-map.md](../../../reference/03-account-driver-settlement-legacy-cut-map.md)
- [reference/04-account-driver-settlement-source-index.md](../../../reference/04-account-driver-settlement-source-index.md)

## Repo Target Decisions

- 실제 server repo 경로 확정
- `web-front`와 `admin-front`가 하나의 frontend repo를 공유하는지, 아니면 두 개 repo로 분리되는지와 각 실제 repo 경로 확정
- account-auth service target repo 확정
- driver-profile service target repo 확정
- settlement service target repo 확정
- org-master service target repo 확정
