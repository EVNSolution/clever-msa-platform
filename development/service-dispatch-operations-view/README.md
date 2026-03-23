# service-dispatch-operations-view

배차 운영 조회 `operations-view`를 소유하는 Django read-model repo다.

이 repo의 1차 역할:
- `service-dispatch-registry`의 계획 정본과 `service-vehicle-assignment`의 현재 truth를 비교하는 상황판 제공
- 사람이 읽을 수 있는 배차 유닛 상태와 요약을 보여 주는 read-only runtime 경계 제공
- dispatch write API, 정본 저장, terminal/telemetry/region 조합은 다루지 않음

1차 read contract:
- board row: `dispatch_date`, `shift_slot`, `vehicle_id`, `plate_number`, `planned_driver_*`, `current_driver_*`, `dispatch_status`, `warnings[]`
- summary: `dispatch_date`, `fleet_id`, `planned_volume`, `planned_assignment_count`, `matched_count`, `not_started_count`, `dispatch_unit_changed_count`, `unplanned_current_count`

상태 의미:
- `matched`: 계획 배송원과 현재 배송원이 같음
- `not_started`: 계획 row는 있으나 현재 truth가 없음
- `dispatch_unit_changed`: 계획 row는 있으나 현재 배송원이 다름
- `unplanned_current`: 계획 row 없이 현재 truth만 있음

비소유 도메인:
- 배차 정본 쓰기
- 현재 배정 정본 쓰기
- terminal / telemetry
- 권역 / 목적지
- 승인 / 예외 흐름

`service-dispatch-registry`와의 차이:
- `service-dispatch-registry`는 배차 계획 정본을 소유한다
- `service-dispatch-operations-view`는 계획과 현재를 읽어서 비교만 한다

환경 변수 `VEHICLE_ASSET_BASE_URL`은 이름이 유지되지만, 기존 read-model consumer naming convention에 맞춰 `service-vehicle-registry` 런타임을 가리킨다.

로컬 실행:
- standalone boot: `python manage.py migrate --noinput && python manage.py runserver 0.0.0.0:8000`
- integration-local-stack 진입점: `../../integration-local-stack/docker-compose.account-driver-settlement.yml`
- compose service name: `dispatch-ops-api`
- gateway route: `/api/dispatch-ops/`
- integration wiring은 `integration-local-stack`과 `edge-api-gateway`에 반영돼 있다. 이 repo는 read-only Django runtime을 소유한다.

정본 문서:
- 플랫폼 아키텍처 정본은 `../../docs/` 아래 문서를 따른다.
