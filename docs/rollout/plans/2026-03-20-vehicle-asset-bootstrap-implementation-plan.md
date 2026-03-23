# Vehicle Asset Bootstrap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 로컬 bootstrap에 `Vehicle Asset` 정본 서비스를 추가하고, gateway와 front/admin-front에서 최소 CRUD로 호출할 수 있게 만든다.

**Architecture:** 이번 1차는 `Vehicle Asset`을 `차량 실체 정본`으로만 구현한다. `company_id`, `fleet_id?`, `plate_number`, `vin`, `vehicle_status`만 소유하고 `current_driver_id`, `terminal_id`, `handover`, `telemetry`, `maintenance`, `accident`는 모두 제외한다. `Vehicle Ops`는 후속 read model로 남기고, 이번 구현은 독립 Django/DRF 서비스 + 독립 DB + compose/gateway/front/admin 연결까지만 포함한다.

**Tech Stack:** Django/DRF, React/Vite, Docker Compose, Nginx, Postgres, pytest/Django test runner, existing local auth/JWT pattern

---

### Task 1: Freeze Vehicle Asset Documents

**Files:**
- Modify: `goal/01-target-system-fragmentation-map.md`
- Modify: `goal/05-vehicle-ops-read-model.md`
- Modify: `goal/06-id-and-state-dictionary.md`
- Modify: `reference/05-ev-dashboard-server-domain-extraction-notes.md`
- Modify: `README.md`
- Modify: `compose/README.md`

- [ ] **Step 1: `goal/01`의 Vehicle Asset 설명을 이번 좁힌 정본 기준으로 수정**

아래 의미만 남긴다.

- 차량 실체 정본
- `vehicle_id`, `company_id`, `fleet_id?`, `plate_number`, `vin`, `vehicle_status`
- 정비/사고/단말/기사 배정은 후속 도메인으로 이동

- [ ] **Step 2: `goal/05`를 “Vehicle Ops는 후속 read model” 문맥으로 축소**

다음 내용을 반영한다.

- source service 중 `Vehicle Asset`은 사고/정비 상태를 제공하지 않음
- `maintenance_flag`, `accident_flag`는 future dependency로 내림
- `Vehicle Ops`는 이번 라운드 구현 대상이 아니라 선행 소비자 정의 문서임을 명시

- [ ] **Step 3: `goal/06`의 Vehicle Status를 이번 1차 기준으로 정리**

`Vehicle Asset` 정본 상태는 아래 3개만 남긴다.

- `active`
- `inactive`
- `retired`

`assigned`, `maintenance`, `accident_hold`는 `Vehicle Asset` 정본 상태에서 제거하고 후속 운영성 상태로 내려 보낸다.

- [ ] **Step 4: extraction note에 Vehicle Asset 선행 구현 원칙을 반영**

`reference/05-ev-dashboard-server-domain-extraction-notes.md`에 아래를 명시한다.

- `dashboard.Terminal`을 그대로 가져오지 않음
- `Vehicle Asset`은 실체 정본만 구현
- `Terminal Ops`, `Schedule Match`, `Telemetry`, `Vehicle Ops`는 후속 단계

- [ ] **Step 5: README 계열 문서에 다음 구현 대상이 Vehicle Asset임을 기록**

`README.md`, `compose/README.md`에 아래를 반영한다.

- 현재 정본 서비스 목록에 `Vehicle Asset` 추가 예정
- `Vehicle Ops`는 아직 read model 문서 단계
- 이번 구현은 차량 자산 CRUD만 포함

- [ ] **Step 6: 문서 정합성 확인**

Run: `rg -n "maintenance_flag|accident_flag|assigned|accident_hold|dashboard.Terminal" goal/01-target-system-fragmentation-map.md goal/05-vehicle-ops-read-model.md goal/06-id-and-state-dictionary.md reference/05-ev-dashboard-server-domain-extraction-notes.md README.md compose/README.md`

Expected:
- 남아 있더라도 후속/제외 문맥으로만 존재

- [ ] **Step 7: Ready-to-Commit File List 기록**

- `goal/01-target-system-fragmentation-map.md`
- `goal/05-vehicle-ops-read-model.md`
- `goal/06-id-and-state-dictionary.md`
- `reference/05-ev-dashboard-server-domain-extraction-notes.md`
- `README.md`
- `compose/README.md`

### Task 2: Scaffold the Vehicle Asset Service

**Files:**
- Create: `services/vehicle-asset/Dockerfile`
- Create: `services/vehicle-asset/entrypoint.sh`
- Create: `services/vehicle-asset/manage.py`
- Create: `services/vehicle-asset/requirements.txt`
- Create: `services/vehicle-asset/config/__init__.py`
- Create: `services/vehicle-asset/config/asgi.py`
- Create: `services/vehicle-asset/config/settings.py`
- Create: `services/vehicle-asset/config/urls.py`
- Create: `services/vehicle-asset/config/wsgi.py`
- Create: `services/vehicle-asset/vehicles/__init__.py`
- Create: `services/vehicle-asset/vehicles/apps.py`
- Create: `services/vehicle-asset/vehicles/authentication.py`
- Create: `services/vehicle-asset/vehicles/exceptions.py`
- Create: `services/vehicle-asset/vehicles/models.py`
- Create: `services/vehicle-asset/vehicles/permissions.py`
- Create: `services/vehicle-asset/vehicles/serializers.py`
- Create: `services/vehicle-asset/vehicles/urls.py`
- Create: `services/vehicle-asset/vehicles/views.py`
- Test: `services/vehicle-asset/vehicles/tests/test_vehicle_api.py`

- [ ] **Step 1: health + CRUD skeleton 테스트를 먼저 쓴다**

`test_vehicle_api.py`에 최소 케이스를 만든다.

- `GET /health/` returns `{"status": "ok"}`
- unauthenticated list returns `401`
- admin can create vehicle
- user can list/read but cannot create/update/delete

- [ ] **Step 2: 테스트가 실제로 실패하는지 확인**

Run: `docker compose -f docker-compose.account-driver-settlement.yml run --rm vehicle-asset-api python manage.py test vehicles.tests.test_vehicle_api -v 2`

Expected:
- service not found 또는 tests fail

- [ ] **Step 3: 기존 서비스 패턴을 따라 Django/DRF skeleton 생성**

현재 `driver-profile`, `organization-master`와 같은 구조로 아래를 맞춘다.

- JWT auth
- 공통 error envelope
- health endpoint
- list/create/detail routes

- [ ] **Step 4: health endpoint부터 통과시킨다**

`/health/`는 인증 없이 `{"status": "ok"}`를 반환하게 만든다.

- [ ] **Step 5: CRUD route를 연결한다**

최종 route는 아래로 고정한다.

- `GET /`
- `POST /`
- `GET /<vehicle_id>/`
- `PATCH /<vehicle_id>/`
- `DELETE /<vehicle_id>/`

- [ ] **Step 6: service-local 테스트 실행**

Run: `docker compose -f docker-compose.account-driver-settlement.yml run --rm vehicle-asset-api python manage.py test vehicles.tests.test_vehicle_api -v 2`

Expected:
- health + CRUD skeleton tests pass

- [ ] **Step 7: Ready-to-Commit File List 기록**

- `services/vehicle-asset/Dockerfile`
- `services/vehicle-asset/entrypoint.sh`
- `services/vehicle-asset/manage.py`
- `services/vehicle-asset/requirements.txt`
- `services/vehicle-asset/config/__init__.py`
- `services/vehicle-asset/config/asgi.py`
- `services/vehicle-asset/config/settings.py`
- `services/vehicle-asset/config/urls.py`
- `services/vehicle-asset/config/wsgi.py`
- `services/vehicle-asset/vehicles/__init__.py`
- `services/vehicle-asset/vehicles/apps.py`
- `services/vehicle-asset/vehicles/authentication.py`
- `services/vehicle-asset/vehicles/exceptions.py`
- `services/vehicle-asset/vehicles/models.py`
- `services/vehicle-asset/vehicles/permissions.py`
- `services/vehicle-asset/vehicles/serializers.py`
- `services/vehicle-asset/vehicles/urls.py`
- `services/vehicle-asset/vehicles/views.py`
- `services/vehicle-asset/vehicles/tests/test_vehicle_api.py`

### Task 3: Implement the Vehicle Asset Model and Seed Command

**Files:**
- Modify: `services/vehicle-asset/vehicles/models.py`
- Modify: `services/vehicle-asset/vehicles/serializers.py`
- Modify: `services/vehicle-asset/vehicles/views.py`
- Create: `services/vehicle-asset/vehicles/migrations/0001_initial.py`
- Create: `services/vehicle-asset/vehicles/management/__init__.py`
- Create: `services/vehicle-asset/vehicles/management/commands/__init__.py`
- Create: `services/vehicle-asset/vehicles/management/commands/seed_vehicles.py`
- Test: `services/vehicle-asset/vehicles/tests/test_seed_vehicles_command.py`
- Modify: `services/vehicle-asset/vehicles/tests/test_vehicle_api.py`

- [ ] **Step 1: 모델 계약 테스트를 먼저 추가**

`test_vehicle_api.py`에 아래를 추가한다.

- `company_id` required
- `fleet_id` optional
- `plate_number` unique
- `vin` unique
- `vehicle_status` only accepts `active`, `inactive`, `retired`

- [ ] **Step 2: seed command 테스트를 먼저 쓴다**

`test_seed_vehicles_command.py`에 아래 케이스를 만든다.

- deterministic seed vehicle 1건 생성
- rerun 시 중복 생성 없이 update_or_create

- [ ] **Step 3: 최소 모델을 구현한다**

필드는 아래로 고정한다.

- `vehicle_id`
- `company_id`
- `fleet_id`
- `plate_number`
- `vin`
- `vehicle_status`

절대 넣지 않는다.

- `current_driver_id`
- `terminal_id`
- `maintenance_flag`
- `accident_flag`

- [ ] **Step 4: serializer와 validation을 구현한다**

다음을 강제한다.

- `company_id` required
- `fleet_id` nullable
- `plate_number` unique validation
- `vin` unique validation
- `vehicle_status` enum validation

- [ ] **Step 5: deterministic seed vehicle command를 구현한다**

예시 seed 규칙:

- `vehicle_id = 50000000-0000-0000-0000-000000000001`
- `company_id = 30000000-0000-0000-0000-000000000001`
- `fleet_id = 40000000-0000-0000-0000-000000000001`
- `plate_number = 12가3456`
- `vin = VIN-000000000000001`
- `vehicle_status = active`

- [ ] **Step 6: 테스트 실행**

Run: `docker compose -f docker-compose.account-driver-settlement.yml run --rm vehicle-asset-api python manage.py test vehicles.tests.test_seed_vehicles_command vehicles.tests.test_vehicle_api -v 2`

Expected:
- model/API/seed tests pass

- [ ] **Step 7: Ready-to-Commit File List 기록**

- `services/vehicle-asset/vehicles/models.py`
- `services/vehicle-asset/vehicles/serializers.py`
- `services/vehicle-asset/vehicles/views.py`
- `services/vehicle-asset/vehicles/migrations/0001_initial.py`
- `services/vehicle-asset/vehicles/management/__init__.py`
- `services/vehicle-asset/vehicles/management/commands/__init__.py`
- `services/vehicle-asset/vehicles/management/commands/seed_vehicles.py`
- `services/vehicle-asset/vehicles/tests/test_seed_vehicles_command.py`
- `services/vehicle-asset/vehicles/tests/test_vehicle_api.py`

### Task 4: Wire Compose, Gateway, and Seed Runner

**Files:**
- Modify: `docker-compose.account-driver-settlement.yml`
- Modify: `gateway/nginx.conf`
- Create: `infra/env/vehicle-asset.env.example`
- Modify: `infra/docker/seed-runner/run-seed.sh`
- Modify: `docs/superpowers/specs/2026-03-19-local-django-msa-bootstrap-design.md`
- Modify: `docs/superpowers/plans/2026-03-19-local-django-msa-bootstrap-implementation-plan.md`

- [ ] **Step 1: compose에 DB와 API 서비스를 추가한다**

아래를 추가한다.

- `vehicle-db`
- `vehicle-asset-api`

규칙:

- build context: `./services/vehicle-asset`
- env file: `./infra/env/vehicle-asset.env.example`
- expose: `8000`
- DB: `postgres:16-alpine`

- [ ] **Step 2: gateway route를 연결한다**

최종 prefix는 아래로 고정한다.

- `/api/vehicles/`

`/api/auth/`에서 고친 Docker DNS 재해석 패턴과 같은 방식으로 연결한다.

- [ ] **Step 3: env example을 작성한다**

최소 env는 아래를 가진다.

- `API_PORT=8000`
- `POSTGRES_DB=vehicle_asset`
- `POSTGRES_USER=vehicle_asset`
- `POSTGRES_PASSWORD=vehicle_asset`
- `POSTGRES_HOST=vehicle-db`
- `POSTGRES_PORT=5432`
- `JWT_SECRET_KEY=...`
- `JWT_ISSUER=msa-server`
- `JWT_AUDIENCE=msa-server`

- [ ] **Step 4: seed-runner에 vehicle migrate/seed 단계를 추가한다**

`run-seed.sh`에 아래를 추가한다.

- vehicle health wait
- vehicle migrate
- `seed_vehicles`

정산보다 먼저 실행해도 되고 뒤에 실행해도 되지만, 현재 정본 seed 묶음에 포함시킨다.

- [ ] **Step 5: bootstrap spec/plan 문서에 서비스 추가 반영**

기존 bootstrap 기준 문서에 4개가 아니라 5개 정본 서비스가 된 점과 `Vehicle Asset` 범위를 반영한다.

- [ ] **Step 6: 런타임 검증**

Run:

- `docker compose -f docker-compose.account-driver-settlement.yml config`
- `docker compose -f docker-compose.account-driver-settlement.yml up -d --build vehicle-asset-api vehicle-db gateway`
- `docker compose -f docker-compose.account-driver-settlement.yml run --rm seed-runner /usr/local/bin/run-seed.sh`

Expected:

- compose config exit code `0`
- seed-runner 완료
- `GET /api/vehicles/health/` returns `{"status":"ok"}`

- [ ] **Step 7: Ready-to-Commit File List 기록**

- `docker-compose.account-driver-settlement.yml`
- `gateway/nginx.conf`
- `infra/env/vehicle-asset.env.example`
- `infra/docker/seed-runner/run-seed.sh`
- `docs/superpowers/specs/2026-03-19-local-django-msa-bootstrap-design.md`
- `docs/superpowers/plans/2026-03-19-local-django-msa-bootstrap-implementation-plan.md`

### Task 5: Front and Admin Vehicle Screens

**Files:**
- Create: `front/src/api/vehicles.ts`
- Create: `front/src/pages/VehiclesPage.tsx`
- Create: `front/src/pages/VehiclesPage.test.tsx`
- Modify: `front/src/App.tsx`
- Modify: `front/src/components/Layout.tsx`
- Create: `admin-front/src/api/vehicles.ts`
- Create: `admin-front/src/pages/VehiclesPage.tsx`
- Create: `admin-front/src/pages/VehiclesPage.test.tsx`
- Modify: `admin-front/src/App.tsx`
- Modify: `admin-front/src/components/Layout.tsx`

- [ ] **Step 1: front vehicle API와 페이지 테스트를 먼저 쓴다**

`front`에서는 아래만 검증한다.

- 목록 조회
- 상세 조회

`user`는 create/update/delete를 하지 않는다.

- [ ] **Step 2: admin-front vehicle API와 페이지 테스트를 먼저 쓴다**

`admin-front`에서는 아래를 검증한다.

- 목록 조회
- 생성
- 상태 수정

- [ ] **Step 3: front용 read-only Vehicles 화면을 만든다**

화면은 아래만 보여준다.

- plate number
- vin
- company_id
- fleet_id
- vehicle_status

- [ ] **Step 4: admin-front용 CRUD 화면을 만든다**

폼 필드는 아래로 제한한다.

- `company_id`
- `fleet_id`
- `plate_number`
- `vin`
- `vehicle_status`

- [ ] **Step 5: 라우터와 nav를 연결한다**

최종 경로는 아래로 고정한다.

- `front`: `/vehicles`
- `admin-front`: `/vehicles`

- [ ] **Step 6: 프런트 테스트와 빌드 실행**

Run:

- `docker compose -f docker-compose.account-driver-settlement.yml run --rm front npm run test -- --run`
- `docker compose -f docker-compose.account-driver-settlement.yml run --rm admin-front npm run test -- --run`
- `docker compose -f docker-compose.account-driver-settlement.yml run --rm front npm run build`
- `docker compose -f docker-compose.account-driver-settlement.yml run --rm admin-front npm run build`

Expected:

- vehicle page tests pass
- both builds exit `0`

- [ ] **Step 7: Ready-to-Commit File List 기록**

- `front/src/api/vehicles.ts`
- `front/src/pages/VehiclesPage.tsx`
- `front/src/pages/VehiclesPage.test.tsx`
- `front/src/App.tsx`
- `front/src/components/Layout.tsx`
- `admin-front/src/api/vehicles.ts`
- `admin-front/src/pages/VehiclesPage.tsx`
- `admin-front/src/pages/VehiclesPage.test.tsx`
- `admin-front/src/App.tsx`
- `admin-front/src/components/Layout.tsx`

### Task 6: End-to-End Vehicle Asset Verification

**Files:**
- Modify: `README.md`
- Modify: `compose/README.md`

- [ ] **Step 1: vehicle API smoke 시나리오를 정리한다**

최소 smoke는 아래를 포함한다.

- admin login
- vehicle create
- vehicle list/read
- user write forbidden
- `plate_number` duplicate rejected

- [ ] **Step 2: gateway 기준 smoke를 실행한다**

Run 예시:

- `POST /api/auth/login/`
- `POST /api/vehicles/`
- `GET /api/vehicles/`
- `PATCH /api/vehicles/{vehicle_id}/`

Expected:

- admin create `201`
- user create/patch `403`
- duplicate `plate_number` 또는 `vin` `400`

- [ ] **Step 3: seed 데이터와 front/admin 진입을 확인한다**

아래를 확인한다.

- `http://localhost:8080/vehicles`
- `http://localhost:8080/admin/vehicles`

- [ ] **Step 4: README에 현재 상태를 반영한다**

문서에 아래를 추가한다.

- `Vehicle Asset`이 5번째 정본 서비스가 되었음
- 현재 vehicle 범위는 자산 정본만
- `Vehicle Ops`는 후속 read model

- [ ] **Step 5: 최종 검증 명령을 다시 실행한다**

Run:

- `docker compose -f docker-compose.account-driver-settlement.yml config`
- `docker compose -f docker-compose.account-driver-settlement.yml run --rm vehicle-asset-api python manage.py test vehicles.tests -v 2`
- `docker compose -f docker-compose.account-driver-settlement.yml run --rm front npm run build`
- `docker compose -f docker-compose.account-driver-settlement.yml run --rm admin-front npm run build`

Expected:

- config `0`
- vehicle tests pass
- builds pass

- [ ] **Step 6: Ready-to-Commit File List 기록**

- `README.md`
- `compose/README.md`
