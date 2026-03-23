# service-settlement-operations-view

이 repo는 정산 운영 조회 `operations-view`를 소유하는 Django read-only fan-out repo다.

현재 역할:
- 외부 read API `health/`, `runs/`, `items/`, `drivers/<driver_id>/latest-settlement/` 제공
- gateway 외부 prefix `/api/settlement-ops/` 뒤에서 payroll read fan-out 수행
- authenticated read 전용 settlement run / item 조회
- driver 단위 latest settlement summary read 조립

업스트림 write owner:
- `service-settlement-payroll`
- 이 repo는 정산 write ownership, migration, seed runtime을 가지지 않음

이 repo는 절대 소유하지 않음:
- `SettlementRun`, `SettlementItem` write
- payout/result truth
- settlement seed runtime

포함:
- Django/DRF runtime
- payroll source client
- read-only settlement API test

포함하지 않음:
- 로컬 settlement table ownership
- write endpoint (`POST`, `PATCH`, `DELETE`)
- 정산 seed command
- 정산 정책/기준표 정본
- 배송 원천 기록 정본
- 계산 엔진 구현
- 플랫폼 전체 compose와 gateway 설정

아키텍처 정본:
- `../../docs/decisions/06-settlement-process-note.md`
- `../../docs/mappings/`
