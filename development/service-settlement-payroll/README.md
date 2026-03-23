# service-settlement-payroll

이 repo는 settlement write owner다.

현재 ownership:
- `SettlementRun`, `SettlementItem` write
- later phase에서 `deduction`, `incentive`, `payout_status` 계열 write 상태 관리
- local bootstrap seed command

이 repo가 소유하지 않는 것:
- registry/master data
- source delivery or input record truth
- read-model only settlement consumers
- gateway, compose, or platform glue

현재 코드는 placeholder settlement write behavior를 유지하는 bootstrap 단계다.
정산 결과 read model은 다른 repo 경계로 분리한다.

아키텍처 정본:
- `../../docs/decisions/`
- `../../docs/mappings/`
