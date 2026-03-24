# service-settlement-payroll

이 repo는 settlement write owner runtime이다.

현재 ownership:
- `SettlementRun`, `SettlementItem` write
- `deduction`, `incentive`, `payout_status` write 상태 관리
- local bootstrap seed command

이 repo가 소유하지 않는 것:
- registry/master data
- source delivery or input record truth
- read-model only settlement consumers
- gateway, compose, or platform glue

정산 결과 read model은 `service-settlement-operations-view`가 읽는다.

아키텍처 정본:
- `../../docs/decisions/specs/2026-03-23-settlement-phase-2-decomposition-design.md`
- `../../docs/archive/historical/rollout/2026-03-23-settlement-phase-2-decomposition-implementation-plan.md`
- `../../docs/mappings/`
