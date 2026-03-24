# service-settlement-registry

이 repo는 정산 기준표와 정책 `registry` 정본을 위한 empty shell이다.

현재 역할:
- empty shell
- 경계와 이름만 고정

이 repo는 절대 소유하지 않음:
- `SettlementRun`
- `SettlementItem`
- payout/result truth
- run/item CRUD

미래 역할:
- 정산 기준, 정책, 버전, 적용기간 registry

아직 포함하지 않음:
- runtime code
- DB migration
- API
- seed command

현재 정본:
- `../../docs/mappings/`

이력 / 컨텍스트:
- `../../docs/archive/historical/rollout/2026-03-20-settlement-phase-1-decomposition-implementation-plan.md`
