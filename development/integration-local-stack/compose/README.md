# Compose Simulation

이 디렉토리의 목적은 `계정 / 조직 / 기사 / 정산 / 차량 / 배차 / 단말 / 텔레메트리` 경계를 로컬 Docker Compose 환경에서 실제로 띄워 보는 것이다. 더 이상 boundary skeleton만 있는 상태가 아니라, 현재는 독립 Django 서비스들, telemetry ingress용 Python worker 1개, local MQTT broker 1개, React/Vite 앱 2개까지 포함한 실행형 부트스트랩 구조를 가진다.

현재 compose 파일 위치는 상위 [docker-compose.account-driver-settlement.yml](../docker-compose.account-driver-settlement.yml)이다.
현재 runtime source는 sibling target repo만 참조한다.

## 현재 Compose 대상
- `gateway`
- `front`
- `admin-front`
- `account-auth-api`
- `driver-profile-api`
- `settlement-payroll-api`
- `settlement-registry-api`
- `settlement-ops-api`
- `organization-master-api`
- `vehicle-asset-api`
- `dispatch-registry-api`
- `terminal-registry-api`
- `telemetry-hub-api`
- `telemetry-listener`
- `telemetry-dead-letter-api`
- `mqtt-broker`
- `driver-vehicle-assignment-api`
- `vehicle-ops-api`
- `dispatch-ops-api`
- `driver-ops-api`
- `account-db`
- `driver-db`
- `settlement-db`
- `settlement-registry-db`
- `org-db`
- `vehicle-db`
- `dispatch-registry-db`
- `terminal-db`
- `telemetry-db`
- `telemetry-dead-letter-db`
- `assignment-db`
- `redis`
- `seed-runner`

## 현재 차량 범위
- `vehicle-asset-api`는 Vehicle Asset master-only CRUD를 제공한다.
- canonical field set은 현재 bootstrap에서는 `vehicle_id`, `company_id`, `fleet_id?`, `plate_number`, `vin`, `vehicle_status`다.
- target design에서는 `vehicle_master`와 `vehicle_operator_access`로 분리되며, 단일 `company_id/fleet_id` 테이블로 남지 않는다.
- `driver-vehicle-assignment-api`는 `driver_vehicle_assignment` 정본을 맡는다.
- `vehicle-ops-api`는 lean `Vehicle Ops` query service다.
- current runtime authoritative contract는 [05-vehicle-ops-read-model.md](../../../docs/contracts/05-vehicle-ops-read-model.md)의 current runtime / bootstrap Phase 1 section을 따른다.
- post-refactor target contract는 같은 문서의 post-refactor target section을 따른다.
- `front /vehicles`는 현재 `Vehicle Ops` summary contract를 사용한다.
- current runtime summary contract는 `Vehicle Registry + Driver Vehicle Assignment + Telemetry Hub + Terminal Registry + Organization Registry`를 읽는다.
- current runtime detail은 `current_terminal` block을 포함한다.
- 이번 범위에서 `Vehicle Ops Phase 1`의 compose/gateway/env/front 전환이 모두 완료됐다.
- `admin-front`의 차량 운영은 차량 마스터 관리와 배정 관리로 분리된다.
- `admin-front`의 차량 write 경로는 계속 `Vehicle Asset` 정본 API를 사용한다.

## 현재 원칙
- 서비스별 DB는 분리한다.
- 도메인 간 DB 직접 접근은 금지한다.
- 프런트는 gateway만 바라본다.
- `seed-runner`는 서비스 `management command`만 호출한다.
- projection 전용 저장소는 이번 스코프에서 제외한다.
- 범용 이벤트 브로커/비동기 워커 확장은 제외하지만, telemetry ingress 검증용 `mqtt-broker`와 `telemetry-listener`는 포함한다.
- 로컬 broker는 deterministic smoke를 위해 고정 listener 계정으로만 publish/subscribe를 허용한다.
- `Driver Ops`는 projection DB 대신 bounded fan-out query service로 시작한다.

## 서비스별 현재 범위

### `organization-master-api`
- `Company`, `Fleet`만 제공한다.
- `OrgUnit`은 현재 스코프에서 제거됐다.

### `account-auth-api`
- 로그인, refresh, logout, me, admin 계정 CRUD를 제공한다.
- Redis 기반 refresh token registry를 가진다.
- Redis 기반 login lockout을 가진다.
- `POST /api/auth/change-password/`를 제공한다.
- `POST /api/auth/account-driver-links/`를 admin 전용 helper로 제공한다.

### `driver-profile-api`
- 기사 기본정보 CRUD만 제공한다.
- `account_id(optional)`, `company_id`, `fleet_id`, `name`, `ev_id`, `phone_number`, `address`만 사용한다.
- `check-ev-id` 중복검사 endpoint를 제공한다.

### `settlement-payroll-api`
- `SettlementRun`, `SettlementItem` write owner CRUD를 제공한다.
- local compose에서 settlement Postgres를 직접 사용한다.
- seed-runner는 이 서비스의 `migrate`, `seed_settlements`만 호출한다.
- 실제 payroll calculation engine, policy/config/rate, daily/monthly settlement clone은 구현하지 않는다.
- 관련 참고는 [06-settlement-process-note.md](../../../docs/decisions/06-settlement-process-note.md)에 둔다.

### `settlement-registry-api`
- settlement policy, policy version, policy assignment registry CRUD를 제공한다.
- local compose에서 dedicated `settlement-registry-db` Postgres를 직접 사용한다.
- `company_id`, `fleet_id`는 `organization-master-api` reference key로만 검증한다.
- CRUD endpoint는 전부 admin-only management API이고, `health`만 공개한다.
- gateway 외부 prefix는 `/api/settlement-registry/`다.

### `settlement-ops-api`
- settlement 운영 조회용 read-only fan-out runtime을 제공한다.
- dedicated Postgres container 없이 sqlite-only runtime으로 동작한다.
- upstream write owner `settlement-payroll-api`를 `SETTLEMENT_PAYROLL_BASE_URL`로 읽는다.
- gateway 외부 prefix는 `/api/settlement-ops/`다.

### `driver-ops-api`
- 기사 단건 운영 화면용 summary query만 제공한다.
- 내부적으로 `driver-profile`, `organization-master`, `account-auth`, `settlement-ops`를 조회해서 하나의 summary payload로 합친다.
- settlement read consumer env 이름은 `SETTLEMENT_OPS_BASE_URL`이다.
- 이번 단계에서는 materialized projection 저장소를 두지 않는다.

### `vehicle-asset-api`
- 차량 자산 CRUD만 제공한다.
- 필드는 `company_id`, `fleet_id(optional)`, `plate_number`, `vin`, `vehicle_status`로 제한한다.
- `current_driver_id`, `terminal_id`, `maintenance_flag`, `accident_flag`는 현재 범위에서 제외한다.

### `driver-vehicle-assignment-api`
- 기사-차량 배정/반납 CRUD를 제공한다.
- upstream validation은 `vehicle-asset-api`, `driver-profile-api`를 읽어 수행한다.
- 차량당 활성 배정 1건 제약과 deterministic seed assignment를 가진다.

### `dispatch-registry-api`
- `dispatch_plan`, `vehicle_schedule`, `dispatch_assignment` 1차 계획 truth를 제공한다.
- `service-vehicle-assignment`와 다르게 current runtime assignment truth는 소유하지 않는다.
- upstream validation은 `vehicle-asset-api`, `driver-profile-api`를 읽어 수행한다.
- `operator_company_id`는 FK가 아닌 dispatch-context snapshot 컬럼이다.

### `dispatch-ops-api`
- 배차 운영 상황판용 read-model runtime을 제공한다.
- `dispatch-registry-api`, `driver-vehicle-assignment-api`, `vehicle-asset-api`, `driver-profile-api`를 fan-out read 한다.
- sqlite-only runtime이며 dedicated Postgres container를 두지 않는다.

### `terminal-registry-api`
- 단말 자산과 현재 차량 장착 관계 CRUD를 제공한다.
- `terminal_registry`, `terminal_installation`만 소유한다.
- 위치, diagnostic, MQTT raw payload는 소유하지 않는다.

### `telemetry-hub-api`
- raw ingest API, normalized timeseries, latest location snapshot, latest diagnostics를 제공한다.
- 저장은 time-series 전제를 따르지만, 현재 외부 API는 latest snapshot 우선이다.
- `telemetry-listener`가 MQTT payload를 internal ingest endpoint로 전달하면, 저장과 정규화는 계속 `telemetry-hub-api`가 소유한다.
- `vehicle-ops-api`가 latest telemetry를 읽는다.
- `telemetry-listener`의 direct service-to-service ingest path는 `/ingest/raw/` 이며, gateway path `/api/telemetry/ingest/raw/` 를 쓰지 않는다.

### `telemetry-listener`
- MQTT broker subscribe와 payload forwarding만 담당하는 stateless ingress worker다.
- `mqtt-broker`에서 `telemetry/#`를 구독하고 `telemetry-hub-api`의 internal ingest endpoint로 raw payload를 전달한다.
- DB를 직접 쓰지 않고 telemetry 정본을 소유하지 않는다.
- hub ingest가 `parse_error`, `hub_4xx`, `hub_5xx_retry_exhausted`, `connection_failure_retry_exhausted`, `timeout_retry_exhausted`로 끝나면 `telemetry-dead-letter-api`의 internal ingest endpoint로 dead-letter row를 전달한다.
- smoke publish는 [`../scripts/publish_sample_telemetry.sh`](../scripts/publish_sample_telemetry.sh)와 [`../../service-telemetry-listener/tests/fixtures/sample_payload.json`](../../service-telemetry-listener/tests/fixtures/sample_payload.json)을 함께 사용한다.
- helper는 publish 시점마다 sample payload의 `captured_at`과 diagnostic timestamp를 새로 주입하고, 이를 현재 UTC 기준 하루 뒤로 밀어서 dirty stack에서도 repeatable하게 재실행할 수 있다.
- helper는 local demo MQTT credentials only(`telemetry-listener` / `local-mqtt-password`)로 브로커에 publish한다.

### `telemetry-dead-letter-api`
- failed telemetry payload append-only storage와 admin read를 제공한다.
- internal ingest는 `X-Telemetry-Dead-Letter-Key` 기반 producer auth만 허용한다.
- phase 1 producer key는 `service-telemetry-listener` 전용 env만 채운다.
- replay/status workflow나 telemetry 정본 저장은 소유하지 않는다.

## Gateway 규칙
- `/` -> `front`
- `/admin/` -> `admin-front`
- `/api/auth/` -> `account-auth-api`
- `/api/drivers/` -> `driver-profile-api`
- `/api/settlements/` -> `settlement-payroll-api`
- `/api/settlement-registry/` -> `settlement-registry-api`
- `/api/settlement-ops/` -> `settlement-ops-api`
- `/api/org/` -> `organization-master-api`
- `/api/vehicles/` -> `vehicle-asset-api`
- `/api/dispatch/` -> `dispatch-registry-api`
- `/api/terminals/` -> `terminal-registry-api`
- `/api/telemetry/` -> `telemetry-hub-api`
- `/api/telemetry-dead-letters/health/` -> `telemetry-dead-letter-api /health/`
- `/api/telemetry-dead-letters/` -> `telemetry-dead-letter-api /`
- `/api/telemetry-dead-letters/<uuid>/` -> `telemetry-dead-letter-api /<uuid>/`
- `/api/driver-vehicle-assignments/` -> `driver-vehicle-assignment-api`
- `/api/vehicle-ops/` -> `vehicle-ops-api`
- `/api/dispatch-ops/` -> `dispatch-ops-api`
- `/api/driver-ops/` -> `driver-ops-api`

gateway는 서비스 prefix를 strip해서 upstream으로 전달한다. 예를 들면 `/api/auth/login/ -> /login/`, `/api/org/companies/ -> /companies/`, `/api/driver-vehicle-assignments/assignments/ -> /assignments/`, `/api/vehicle-ops/vehicles/ -> /vehicles/`, `/api/dispatch-ops/board/ -> /board/`, `/api/telemetry/vehicles/{vehicle_id}/latest-location/ -> /vehicles/{vehicle_id}/latest-location/`처럼 동작한다.

dead-letter는 예외적으로 admin-read 경로만 명시 route로 노출한다.
- `/api/telemetry-dead-letters/ingest/` 는 gateway에 노출하지 않는다.
- `/api/telemetry-dead-letters` 와 `/api/telemetry-dead-letters/health` 는 trailing slash가 붙은 검증 경로로 명시 redirect한다.

## Seed Runner 규칙
`seed-runner`는 아래 순서로 동작한다.
1. seed-managed 백엔드 `health` 대기
2. `organization-master` migrate + `seed_organization`
3. `settlement-registry` migrate + `seed_settlement_registry`
4. `driver-profile` migrate + `seed_drivers`
5. `vehicle-asset` migrate + `seed_vehicles`
6. `dispatch-registry` migrate + `seed_dispatch`
7. `terminal-registry` migrate + `seed_terminals`
8. `telemetry-hub` migrate + `seed_telemetry`
9. `driver-vehicle-assignment` migrate + `seed_assignments`
10. `settlement-payroll` migrate + `seed_settlements`
11. `account-auth` migrate + `seed_accounts`

모든 단계는 재실행 가능하도록 idempotent하게 작성돼 있다.

현재 seed 기본값은 아래와 같다.
- admin 계정: `admin@example.com / change-me`
- driver-linked user: `seed-driver@example.com / change-me-driver`
- company: `Seed Company`
- fleet: `Seed Fleet`
- driver: `Seed Driver`
- vehicle: `12가3456`
- dispatch schedule: `2026-03-24 / shift A`
- terminal: `356123456789012`
- telemetry latest location: `37.5665, 126.9780`
- assignment: seeded driver-vehicle relation for the same operator company
