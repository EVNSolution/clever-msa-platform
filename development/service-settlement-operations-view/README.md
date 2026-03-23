# service-settlement-operations-view

이 repo는 정산 placeholder runtime과 운영 조회 `operations-view`를 임시로 소유한다.

현재 역할:
- `SettlementRun`, `SettlementItem` placeholder CRUD
- 정산 health, serializer, admin write / authenticated read
- seed 대상 bootstrap settlement runtime

미래 역할:
- 정산 결과와 운영 조회 중심 read model
- 현재 placeholder write는 점진적으로 축소

포함:
- Django/DRF runtime
- settlement migration
- settlement test
- service-local seed command

포함하지 않음:
- 정산 정책/기준표 정본
- 배송 원천 기록 정본
- 계산 엔진 구현
- 플랫폼 전체 compose와 gateway 설정

아키텍처 정본:
- `../../docs/decisions/06-settlement-process-note.md`
- `../../docs/mappings/`
