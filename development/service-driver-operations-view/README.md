# service-driver-operations-view

이 repo는 배송원 운영 조회 `operations-view`를 소유한다.

현재 역할:
- driver summary와 detail 조회
- profile, account, settlement-ops scoped latest-settlement summary, assignment 정보를 조합한 운영 view
- 쓰기 없는 read-only query service

포함:
- Django/DRF query runtime
- view contract test
- source client와 summary assembler

포함하지 않음:
- driver profile 정본 쓰기
- account access 정본 쓰기
- settlement 정본 쓰기
- settlement payroll collection 직접 fan-out
- 플랫폼 전체 compose와 gateway 설정

아키텍처 정본:
- `../../docs/contracts/`
- `../../docs/mappings/`
