# service-vehicle-registry

이 repo는 차량 `registry` 정본을 소유한다.

현재 역할:
- 차량 기본 정보 CRUD
- bootstrap 단계의 vehicle registry
- 이후 `vehicle_master + vehicle_operator_access` 구조로 확장될 기준점

포함:
- Django/DRF runtime
- vehicle migration
- vehicle test
- service-local seed command

포함하지 않음:
- 배송원 배정 정본
- telemetry 수집
- vehicle operations read model
- 플랫폼 전체 compose와 gateway 설정

아키텍처 정본:
- `../../docs/boundaries/`
- `../../docs/mappings/`
