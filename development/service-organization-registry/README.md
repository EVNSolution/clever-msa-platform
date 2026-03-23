# service-organization-registry

이 repo는 조직 기준 마스터 `registry`를 소유한다.

현재 역할:
- `Company`, `Fleet` 정본
- 조직 기준 식별자와 기본 CRUD
- 다른 서비스가 참조하는 organization source

포함:
- Django/DRF runtime
- organization migration
- organization test
- service-local seed command

포함하지 않음:
- account/auth 로직
- driver profile 로직
- vehicle/assignment 로직
- 플랫폼 전체 compose와 gateway 설정

아키텍처 정본:
- `../../docs/boundaries/`
- `../../docs/mappings/`
