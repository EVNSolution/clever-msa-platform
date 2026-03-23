# service-vehicle-assignment

이 repo는 운영사의 차량 `assignment` 정본을 소유한다.

현재 역할:
- 배송원-차량 배정과 해제
- 운영사 기준 assignment lifecycle
- 이후 handover workflow가 붙을 중심축

포함:
- Django/DRF runtime
- assignment migration
- assignment test
- service-local seed command

포함하지 않음:
- vehicle registry 정본
- driver profile 정본
- telemetry 수집
- 플랫폼 전체 compose와 gateway 설정

아키텍처 정본:
- `../../docs/boundaries/`
- `../../docs/mappings/`
