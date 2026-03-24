# Vehicle Asset Refactor And Driver Vehicle Assignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 현재 bootstrap의 단일 `vehicle-asset` 모델을 `vehicle_master + vehicle_operator_access` 구조로 재정의하고, 새 `Driver Vehicle Assignment` 서비스를 추가해 제조사 정본과 운영사 배정 쓰기를 분리한다.

**Architecture:** 이번 refactor는 현재 로컬 bootstrap을 운영 중인 상태에서 `Vehicle Asset`의 소유권 모델을 바꾸고, 운영사의 실제 쓰기 행위를 별도 서비스로 분리하는 작업이다. `Vehicle Asset`은 제조사 정본과 운영사 접근 관계만 소유하고, `Driver Vehicle Assignment`는 운영사가 자기 배송원을 차량에 배정하는 행위만 소유한다. `Vehicle Ops`는 새 구조를 읽는 query service로 갱신하고, `admin-front`는 정본/배정 쓰기 경로를 분리된 API로 호출하게 바꾼다.

**Tech Stack:** Django/DRF, React/Vite, Docker Compose, Nginx, Postgres, JWT auth, seed-runner management commands, Playwright HTTP/browser smoke

---

### Task 1: Freeze Contracts And Runtime Docs

**Files:**
- Modify: `goal/05-vehicle-ops-read-model.md`
- Modify: `goal/06-id-and-state-dictionary.md`
- Modify: `goal/07-legacy-api-mapping.md`
- Modify: `goal/08-rollout-order.md`
- Modify: `goal/09-integration-rules.md`
- Modify: `README.md`
- Modify: `compose/README.md`
- Reference: `docs/superpowers/specs/2026-03-20-vehicle-ownership-and-assignment-design.md`
- Reference: `reference/07-vehicle-terminal-telemetry-assignment-legacy-split.md`

- [ ] **Step 1: `goal/06`에 새 식별자와 상태값을 고정**

아래를 추가하거나 교체한다.

- `vehicle_master.vehicle_id`
- `vehicle_operator_access.vehicle_operator_access_id`
- `driver_vehicle_assignment.driver_vehicle_assignment_id`
- `vehicle_status = active | inactive | retired`
- `access_status = active | suspended | ended`
- `assignment_status = assigned | unassigned`

- [ ] **Step 2: `goal/05`와 `goal/09`를 새 읽기 구조 기준으로 수정**

아래를 명시한다.

- `Vehicle Ops`는 `Vehicle Asset + Driver Vehicle Assignment + Telemetry`를 읽는다
- bootstrap 구현에서는 `Telemetry`와 `Terminal Ops`가 아직 placeholder일 수 있다
- `front`는 source service를 직접 fan-out하지 않고 `Vehicle Ops` contract만 사용한다

- [ ] **Step 3: `goal/07`에 legacy route의 새 target을 반영**

아래 매핑을 분명히 적는다.

- `dashboard/terminal/*` 중 차량 정본 성격 -> `Vehicle Asset`
- `schedule/driver-vehicle-match/*` -> `Driver Vehicle Assignment`
- `dashboard/terminal-user-change-log/*`, `dashboard/handover-records/*` -> `Driver Vehicle Assignment`
- `mqtt/*`, `truck-data`, `diagnostic` 계열 -> `Telemetry`

- [ ] **Step 4: `goal/08` rollout 순서를 새 4축 기준으로 조정**

권장 순서를 아래처럼 적는다.

1. `Vehicle Asset refactor`
2. `Driver Vehicle Assignment`
3. `Vehicle Ops refactor`
4. `Terminal Ops`
5. `Telemetry`

- [ ] **Step 5: README 계열 문서를 현재 런타임 기준으로 갱신**

다음을 반영한다.

- `vehicle-asset`는 더 이상 `company_id/fleet_id` 단일 테이블이 아님
- 새 서비스 `driver-vehicle-assignment`가 추가됨
- `admin-front`에서 차량 정본 관리와 배정 관리가 분리됨
- `Vehicle Ops`는 새 summary contract로 읽는다

- [ ] **Step 6: 문서 정합성 확인**

Run: `rg -n "Vehicle\\.company_id|Vehicle\\.fleet_id|Schedule Match|Workforce Schedule Match|handover.*Terminal Ops" goal/05-vehicle-ops-read-model.md goal/06-id-and-state-dictionary.md goal/07-legacy-api-mapping.md goal/08-rollout-order.md goal/09-integration-rules.md README.md compose/README.md`

Expected:
- 오래된 차량 단일 모델 표현이나 `Schedule Match` 용어가 남아 있지 않거나, 남아 있어도 legacy 설명 문맥뿐이다

- [ ] **Step 7: Ready-to-Commit File List 기록**

- `goal/05-vehicle-ops-read-model.md`
- `goal/06-id-and-state-dictionary.md`
- `goal/07-legacy-api-mapping.md`
- `goal/08-rollout-order.md`
- `goal/09-integration-rules.md`
- `README.md`
- `compose/README.md`

### Task 2: Refactor Vehicle Asset To `vehicle_master + vehicle_operator_access`

**Files:**
- Modify: `services/vehicle-asset/vehicles/models.py`
- Modify: `services/vehicle-asset/vehicles/serializers.py`
- Modify: `services/vehicle-asset/vehicles/views.py`
- Modify: `services/vehicle-asset/vehicles/urls.py`
- Modify: `services/vehicle-asset/vehicles/management/commands/seed_vehicles.py`
- Create: `services/vehicle-asset/vehicles/migrations/0002_vehicle_master_and_operator_access.py`
- Modify: `services/vehicle-asset/vehicles/tests/test_vehicle_api.py`
- Modify: `services/vehicle-asset/vehicles/tests/test_seed_vehicles_command.py`

- [ ] **Step 1: 새 endpoint 계약 테스트를 먼저 작성**

`test_vehicle_api.py`에 아래 케이스를 추가한다.

- `GET /vehicle-masters/` unauthenticated `401`
- `admin` can create `vehicle_master`
- `user` can list/read `vehicle_master` but cannot write
- `GET /vehicle-operator-accesses/` unauthenticated `401`
- `admin` can create and update `vehicle_operator_access`
- `user` cannot write operator access

- [ ] **Step 2: 제약 테스트를 먼저 추가**

같은 파일에 아래 제약을 테스트한다.

- `manufacturer_company_id` required
- `plate_number` unique
- `vin` unique
- `vehicle_status` only accepts `active`, `inactive`, `retired`
- 한 차량에는 `active` operator access가 최대 1건
- `vehicle_operator_access.vehicle_id`는 existing `vehicle_master.vehicle_id`를 참조값으로 가져야 한다

- [ ] **Step 3: refactor 전 실패를 확인**

Run: `docker compose -f docker-compose.account-driver-settlement.yml run --rm vehicle-asset-api python manage.py test vehicles.tests.test_vehicle_api -v 2`

Expected:
- 새 route 또는 새 모델 가정 때문에 FAIL

- [ ] **Step 4: 단일 `Vehicle` 모델을 `VehicleMaster`와 `VehicleOperatorAccess`로 교체**

`models.py`를 아래 구조로 바꾼다.

- `VehicleMaster`
  - `vehicle_id`
  - `manufacturer_company_id`
  - `plate_number`
  - `vin`
  - `manufacturer_vehicle_code`
  - `model_name`
  - `vehicle_status`
- `VehicleOperatorAccess`
  - `vehicle_operator_access_id`
  - `vehicle_id`
  - `operator_company_id`
  - `access_status`
  - `started_at`
  - `ended_at`

bootstrap 로컬 refactor이므로 `0002` 마이그레이션에서 기존 `Vehicle` 테이블을 대체하는 파괴적 구조 변경을 허용한다.

- [ ] **Step 5: serializer/view/url을 새 리소스 기준으로 교체**

최종 route는 아래로 고정한다.

- `GET /vehicle-masters/`
- `POST /vehicle-masters/`
- `GET /vehicle-masters/<uuid:vehicle_id>/`
- `PATCH /vehicle-masters/<uuid:vehicle_id>/`
- `GET /vehicle-operator-accesses/`
- `POST /vehicle-operator-accesses/`
- `GET /vehicle-operator-accesses/<uuid:vehicle_operator_access_id>/`
- `PATCH /vehicle-operator-accesses/<uuid:vehicle_operator_access_id>/`
- `GET /health/`

`vehicle_operator_access` list는 `vehicle_id`, `operator_company_id`, `access_status` filter를 query param으로 받게 만든다.

- [ ] **Step 6: seed command를 새 구조에 맞게 갱신**

`seed_vehicles.py`를 아래 의미로 바꾼다.

- deterministic `vehicle_master` 1건 생성
- 같은 `vehicle_id`에 deterministic `active vehicle_operator_access` 1건 생성
- rerun 시 `update_or_create`로 idempotent 유지

- [ ] **Step 7: vehicle-asset 테스트 실행**

Run: `docker compose -f docker-compose.account-driver-settlement.yml run --rm vehicle-asset-api python manage.py test vehicles.tests.test_vehicle_api vehicles.tests.test_seed_vehicles_command -v 2`

Expected:
- `vehicle_master`/`vehicle_operator_access` API와 seed 테스트가 모두 PASS

- [ ] **Step 8: Ready-to-Commit File List 기록**

- `services/vehicle-asset/vehicles/models.py`
- `services/vehicle-asset/vehicles/serializers.py`
- `services/vehicle-asset/vehicles/views.py`
- `services/vehicle-asset/vehicles/urls.py`
- `services/vehicle-asset/vehicles/management/commands/seed_vehicles.py`
- `services/vehicle-asset/vehicles/migrations/0002_vehicle_master_and_operator_access.py`
- `services/vehicle-asset/vehicles/tests/test_vehicle_api.py`
- `services/vehicle-asset/vehicles/tests/test_seed_vehicles_command.py`

### Task 3: Scaffold The Driver Vehicle Assignment Service

**Files:**
- Create: `services/driver-vehicle-assignment/Dockerfile`
- Create: `services/driver-vehicle-assignment/entrypoint.sh`
- Create: `services/driver-vehicle-assignment/manage.py`
- Create: `services/driver-vehicle-assignment/requirements.txt`
- Create: `services/driver-vehicle-assignment/config/__init__.py`
- Create: `services/driver-vehicle-assignment/config/asgi.py`
- Create: `services/driver-vehicle-assignment/config/settings.py`
- Create: `services/driver-vehicle-assignment/config/urls.py`
- Create: `services/driver-vehicle-assignment/config/wsgi.py`
- Create: `services/driver-vehicle-assignment/assignments/__init__.py`
- Create: `services/driver-vehicle-assignment/assignments/apps.py`
- Create: `services/driver-vehicle-assignment/assignments/authentication.py`
- Create: `services/driver-vehicle-assignment/assignments/exceptions.py`
- Create: `services/driver-vehicle-assignment/assignments/permissions.py`
- Create: `services/driver-vehicle-assignment/assignments/models.py`
- Create: `services/driver-vehicle-assignment/assignments/serializers.py`
- Create: `services/driver-vehicle-assignment/assignments/urls.py`
- Create: `services/driver-vehicle-assignment/assignments/views.py`
- Create: `services/driver-vehicle-assignment/assignments/tests/__init__.py`
- Create: `services/driver-vehicle-assignment/assignments/tests/test_assignment_api.py`

- [ ] **Step 1: service skeleton 기준 테스트를 먼저 작성**

`test_assignment_api.py`에 최소 케이스를 작성한다.

- `GET /health/` returns `{"status": "ok"}`
- unauthenticated list returns `401`
- `admin` can create assignment
- authenticated `user` can list/read but cannot write

bootstrap 현재 role 모델이 `admin/user`뿐이므로, 이번 라운드의 operator write path는 `admin-front`가 대리한다.

- [ ] **Step 2: 실패를 확인**

Run: `docker compose -f docker-compose.account-driver-settlement.yml run --rm driver-vehicle-assignment-api python manage.py test assignments.tests.test_assignment_api -v 2`

Expected:
- service not found 또는 skeleton 미구현으로 FAIL

- [ ] **Step 3: 기존 Django service 패턴으로 서비스 골격 생성**

아래를 맞춘다.

- JWT auth
- 공통 error envelope
- health endpoint
- list/create/detail/update route
- sqlite fallback + postgres env 설정 패턴

- [ ] **Step 4: 최소 모델과 route를 연결**

초기 route는 아래로 고정한다.

- `GET /health/`
- `GET /assignments/`
- `POST /assignments/`
- `GET /assignments/<uuid:driver_vehicle_assignment_id>/`
- `PATCH /assignments/<uuid:driver_vehicle_assignment_id>/`

- [ ] **Step 5: skeleton 테스트 실행**

Run: `docker compose -f docker-compose.account-driver-settlement.yml run --rm driver-vehicle-assignment-api python manage.py test assignments.tests.test_assignment_api -v 2`

Expected:
- health/auth/basic CRUD skeleton tests pass 또는 rule-specific 케이스만 남아 있다

- [ ] **Step 6: Ready-to-Commit File List 기록**

- `services/driver-vehicle-assignment/Dockerfile`
- `services/driver-vehicle-assignment/entrypoint.sh`
- `services/driver-vehicle-assignment/manage.py`
- `services/driver-vehicle-assignment/requirements.txt`
- `services/driver-vehicle-assignment/config/__init__.py`
- `services/driver-vehicle-assignment/config/asgi.py`
- `services/driver-vehicle-assignment/config/settings.py`
- `services/driver-vehicle-assignment/config/urls.py`
- `services/driver-vehicle-assignment/config/wsgi.py`
- `services/driver-vehicle-assignment/assignments/__init__.py`
- `services/driver-vehicle-assignment/assignments/apps.py`
- `services/driver-vehicle-assignment/assignments/authentication.py`
- `services/driver-vehicle-assignment/assignments/exceptions.py`
- `services/driver-vehicle-assignment/assignments/permissions.py`
- `services/driver-vehicle-assignment/assignments/models.py`
- `services/driver-vehicle-assignment/assignments/serializers.py`
- `services/driver-vehicle-assignment/assignments/urls.py`
- `services/driver-vehicle-assignment/assignments/views.py`
- `services/driver-vehicle-assignment/assignments/tests/__init__.py`
- `services/driver-vehicle-assignment/assignments/tests/test_assignment_api.py`

### Task 4: Implement Assignment Rules And Seed Data

**Files:**
- Modify: `services/driver-vehicle-assignment/config/settings.py`
- Modify: `services/driver-vehicle-assignment/assignments/models.py`
- Modify: `services/driver-vehicle-assignment/assignments/serializers.py`
- Modify: `services/driver-vehicle-assignment/assignments/views.py`
- Create: `services/driver-vehicle-assignment/assignments/services/__init__.py`
- Create: `services/driver-vehicle-assignment/assignments/services/source_clients.py`
- Create: `services/driver-vehicle-assignment/assignments/services/assignment_rule_service.py`
- Create: `services/driver-vehicle-assignment/assignments/management/__init__.py`
- Create: `services/driver-vehicle-assignment/assignments/management/commands/__init__.py`
- Create: `services/driver-vehicle-assignment/assignments/management/commands/seed_assignments.py`
- Create: `services/driver-vehicle-assignment/assignments/migrations/0001_initial.py`
- Create: `services/driver-vehicle-assignment/assignments/tests/test_assignment_rule_service.py`
- Create: `services/driver-vehicle-assignment/assignments/tests/test_seed_assignments_command.py`
- Modify: `services/driver-vehicle-assignment/assignments/tests/test_assignment_api.py`

- [ ] **Step 1: rule-level failing tests를 먼저 작성**

`test_assignment_rule_service.py`와 `test_assignment_api.py`에 아래 케이스를 추가한다.

- `driver_id` required
- `vehicle_id` required
- `operator_company_id` required
- `assignment_status` only accepts `assigned`, `unassigned`
- `assigned` 생성 시 vehicle must exist
- `assigned` 생성 시 vehicle status must be `active`
- `assigned` 생성 시 active operator access must exist for the same `operator_company_id`
- `assigned` 생성 시 driver must exist and `driver.company_id == operator_company_id`
- 한 차량에는 `assigned` assignment가 최대 1건

- [ ] **Step 2: source client를 분리**

`source_clients.py`에 아래 호출을 캡슐화한다.

- vehicle-asset:
  - `GET /vehicle-masters/<vehicle_id>/`
  - `GET /vehicle-operator-accesses/?vehicle_id=<id>&access_status=active`
- driver-profile:
  - `GET /<driver_id>/`

모든 upstream 호출은 원요청의 `Authorization` header를 forward한다.

- [ ] **Step 3: rule service를 구현**

`assignment_rule_service.py`에서 아래를 담당한다.

- create/update 전 upstream validation
- vehicle status와 active access 검증
- driver company와 operator company 일치 검증
- `unassigned_at` 자동 보정 규칙
- domain validation error를 API-friendly 예외로 변환

- [ ] **Step 4: seed command 테스트를 먼저 작성**

`test_seed_assignments_command.py`에 아래를 만든다.

- deterministic assignment 1건 생성
- rerun 시 중복 없이 같은 record update
- seeded vehicle/operator/driver 정합성 확인

- [ ] **Step 5: seed command와 API 구현을 마무리**

seed는 아래 의미로 고정한다.

- seeded `vehicle_master`와 active `vehicle_operator_access`를 사용
- seeded driver를 같은 operator company에 묶는다
- deterministic `driver_vehicle_assignment_id`를 사용한다

- [ ] **Step 6: assignment service 테스트 실행**

Run: `docker compose -f docker-compose.account-driver-settlement.yml run --rm driver-vehicle-assignment-api python manage.py test assignments.tests -v 2`

Expected:
- API/rule/seed tests 모두 PASS

- [ ] **Step 7: Ready-to-Commit File List 기록**

- `services/driver-vehicle-assignment/config/settings.py`
- `services/driver-vehicle-assignment/assignments/models.py`
- `services/driver-vehicle-assignment/assignments/serializers.py`
- `services/driver-vehicle-assignment/assignments/views.py`
- `services/driver-vehicle-assignment/assignments/services/__init__.py`
- `services/driver-vehicle-assignment/assignments/services/source_clients.py`
- `services/driver-vehicle-assignment/assignments/services/assignment_rule_service.py`
- `services/driver-vehicle-assignment/assignments/management/__init__.py`
- `services/driver-vehicle-assignment/assignments/management/commands/__init__.py`
- `services/driver-vehicle-assignment/assignments/management/commands/seed_assignments.py`
- `services/driver-vehicle-assignment/assignments/migrations/0001_initial.py`
- `services/driver-vehicle-assignment/assignments/tests/test_assignment_rule_service.py`
- `services/driver-vehicle-assignment/assignments/tests/test_seed_assignments_command.py`
- `services/driver-vehicle-assignment/assignments/tests/test_assignment_api.py`

### Task 5: Wire Compose, Gateway, Env, And Seed Runner

**Files:**
- Modify: `docker-compose.account-driver-settlement.yml`
- Modify: `gateway/nginx.conf`
- Modify: `infra/docker/seed-runner/run-seed.sh`
- Create: `infra/env/driver-vehicle-assignment.env.example`
- Modify: `infra/env/vehicle-ops.env.example`
- Modify: `README.md`
- Modify: `compose/README.md`

- [ ] **Step 1: compose에 assignment service와 DB를 추가**

아래를 추가한다.

- `driver-vehicle-assignment-api`
- `assignment-db`

의존성은 아래로 둔다.

- `driver-vehicle-assignment-api` depends on `assignment-db`, `vehicle-asset-api`, `driver-profile-api`
- `vehicle-ops-api` depends on `driver-vehicle-assignment-api`도 포함

- [ ] **Step 2: gateway route를 추가**

prefix는 아래로 고정한다.

- `/api/driver-vehicle-assignments/`

- [ ] **Step 3: env 예시를 추가**

`infra/env/driver-vehicle-assignment.env.example`에 최소 아래를 기록한다.

- `API_PORT=8000`
- `JWT_SECRET_KEY`
- `JWT_ISSUER`
- `JWT_AUDIENCE`
- `DATABASE_*`
- `VEHICLE_ASSET_BASE_URL`
- `DRIVER_PROFILE_BASE_URL`

`infra/env/vehicle-ops.env.example`에는 `DRIVER_VEHICLE_ASSIGNMENT_BASE_URL`를 추가한다.

- [ ] **Step 4: seed-runner orchestration을 업데이트**

순서를 아래처럼 맞춘다.

1. organization seed
2. driver seed
3. vehicle asset migrate/seed
4. driver-vehicle-assignment migrate/seed
5. settlement/other existing seeds

seed-runner는 여전히 각 서비스 내부 management command만 호출하게 유지한다.

- [ ] **Step 5: compose 설정 검증**

Run: `docker compose -f docker-compose.account-driver-settlement.yml config`

Expected:
- exit code `0`

- [ ] **Step 6: Ready-to-Commit File List 기록**

- `docker-compose.account-driver-settlement.yml`
- `gateway/nginx.conf`
- `infra/docker/seed-runner/run-seed.sh`
- `infra/env/driver-vehicle-assignment.env.example`
- `infra/env/vehicle-ops.env.example`
- `README.md`
- `compose/README.md`

### Task 6: Refactor Vehicle Ops To Read The New Split

**Files:**
- Modify: `services/vehicle-ops/config/settings.py`
- Modify: `services/vehicle-ops/vehicleops/serializers.py`
- Modify: `services/vehicle-ops/vehicleops/views.py`
- Modify: `services/vehicle-ops/vehicleops/services/source_clients.py`
- Modify: `services/vehicle-ops/vehicleops/services/vehicle_summary_service.py`
- Modify: `services/vehicle-ops/vehicleops/tests/test_source_clients.py`
- Modify: `services/vehicle-ops/vehicleops/tests/test_vehicle_summary_service.py`
- Modify: `services/vehicle-ops/vehicleops/tests/test_vehicle_ops_api.py`

- [ ] **Step 1: 새 summary contract 테스트를 먼저 작성**

`test_vehicle_summary_service.py`와 `test_vehicle_ops_api.py`를 아래 구조 기준으로 바꾼다.

```python
{
    "vehicle_id": "...",
    "plate_number": "...",
    "vin": "...",
    "vehicle_status": "active",
    "manufacturer_company": {
        "company_id": "...",
        "company_name": "..."
    },
    "active_operator_company": {
        "company_id": "...",
        "company_name": "..."
    },
    "current_assignment": {
        "driver_vehicle_assignment_id": "...",
        "driver_id": "...",
        "operator_company_id": "...",
        "assignment_status": "assigned"
    },
    "warnings": []
}
```

- [ ] **Step 2: source clients를 새 upstream route로 교체**

`source_clients.py`가 아래를 호출하게 바꾼다.

- vehicle-asset: `GET /vehicle-masters/`, `GET /vehicle-masters/<vehicle_id>/`
- vehicle-asset: `GET /vehicle-operator-accesses/?access_status=active`
- organization-master: `GET /companies/`
- driver-vehicle-assignment: `GET /assignments/?assignment_status=assigned`

- [ ] **Step 3: summary assembler를 새 역할 구조에 맞게 구현**

`vehicle_summary_service.py`는 아래를 조합한다.

- 제조사 이름
- 활성 운영사 이름
- 현재 assignment 요약
- lookup 실패 warning

`fleet`는 이 단계 summary에서 제거한다.

- [ ] **Step 4: vehicle-ops 서비스 테스트 실행**

Run: `docker compose -f docker-compose.account-driver-settlement.yml run --rm vehicle-ops-api python manage.py test vehicleops.tests -v 2`

Expected:
- source client / summary service / API tests PASS

- [ ] **Step 5: Ready-to-Commit File List 기록**

- `services/vehicle-ops/config/settings.py`
- `services/vehicle-ops/vehicleops/serializers.py`
- `services/vehicle-ops/vehicleops/views.py`
- `services/vehicle-ops/vehicleops/services/source_clients.py`
- `services/vehicle-ops/vehicleops/services/vehicle_summary_service.py`
- `services/vehicle-ops/vehicleops/tests/test_source_clients.py`
- `services/vehicle-ops/vehicleops/tests/test_vehicle_summary_service.py`
- `services/vehicle-ops/vehicleops/tests/test_vehicle_ops_api.py`

### Task 7: Update Front And Admin Front To Match The New Runtime

**Files:**
- Modify: `front/src/types.ts`
- Modify: `front/src/api/vehicleOps.ts`
- Modify: `front/src/pages/VehiclesPage.tsx`
- Modify: `front/src/pages/VehiclesPage.test.tsx`
- Modify: `admin-front/src/types.ts`
- Modify: `admin-front/src/api/vehicles.ts`
- Create: `admin-front/src/api/assignments.ts`
- Modify: `admin-front/src/pages/VehiclesPage.tsx`
- Modify: `admin-front/src/pages/VehiclesPage.test.tsx`
- Create: `admin-front/src/pages/VehicleAssignmentsPage.tsx`
- Create: `admin-front/src/pages/VehicleAssignmentsPage.test.tsx`
- Modify: `admin-front/src/App.tsx`
- Modify: `admin-front/src/components/Layout.tsx`

- [ ] **Step 1: front 차량 화면 테스트를 먼저 수정**

`front/src/pages/VehiclesPage.test.tsx`에서 아래 표시를 기대하게 바꾼다.

- `manufacturer_company`
- `active_operator_company`
- `current_assignment.driver_id` 또는 `Unassigned`
- 더 이상 `fleet` 컬럼을 기대하지 않음

- [ ] **Step 2: front types와 page를 새 contract로 갱신**

`front/src/types.ts`와 `front/src/pages/VehiclesPage.tsx`를 아래 기준으로 바꾼다.

- `VehicleOpsSummary`에서 `company/fleet` 제거
- `manufacturer_company`, `active_operator_company`, `current_assignment` 추가
- UI labels도 제조사/운영사/현재 배정 기준으로 변경

- [ ] **Step 3: admin 차량 화면 테스트를 먼저 갱신**

`admin-front/src/pages/VehiclesPage.test.tsx`에서 아래를 기대하게 만든다.

- vehicle master 생성/수정 폼
- operator access 생성/종료 흐름
- 더 이상 단일 `company_id/fleet_id` 차량 폼을 기대하지 않음

- [ ] **Step 4: admin 차량 정본 화면을 refactor**

`admin-front/src/pages/VehiclesPage.tsx`와 `admin-front/src/api/vehicles.ts`를 아래 기준으로 바꾼다.

- `vehicle master` CRUD
- `vehicle operator access` 생성/종료
- 제조사 회사 ID 입력 필드
- operator company ID 입력 필드

- [ ] **Step 5: assignment 전용 admin 화면 테스트와 구현을 추가**

새 페이지를 아래 route로 추가한다.

- `/admin/vehicle-assignments`

화면에서 아래를 최소 지원한다.

- assignment list
- assignment create
- assignment unassign

이때 `admin-front/src/api/assignments.ts`는 `/driver-vehicle-assignments/assignments/`를 호출한다.

- [ ] **Step 6: front/admin UI 테스트와 build 실행**

Run:
- `docker compose -f docker-compose.account-driver-settlement.yml run --rm front npm run test -- --run`
- `docker compose -f docker-compose.account-driver-settlement.yml run --rm admin-front npm run test -- --run`
- `docker compose -f docker-compose.account-driver-settlement.yml run --rm front npm run build`
- `docker compose -f docker-compose.account-driver-settlement.yml run --rm admin-front npm run build`

Expected:
- page tests PASS
- both builds exit `0`

- [ ] **Step 7: Ready-to-Commit File List 기록**

- `front/src/types.ts`
- `front/src/api/vehicleOps.ts`
- `front/src/pages/VehiclesPage.tsx`
- `front/src/pages/VehiclesPage.test.tsx`
- `admin-front/src/types.ts`
- `admin-front/src/api/vehicles.ts`
- `admin-front/src/api/assignments.ts`
- `admin-front/src/pages/VehiclesPage.tsx`
- `admin-front/src/pages/VehiclesPage.test.tsx`
- `admin-front/src/pages/VehicleAssignmentsPage.tsx`
- `admin-front/src/pages/VehicleAssignmentsPage.test.tsx`
- `admin-front/src/App.tsx`
- `admin-front/src/components/Layout.tsx`

### Task 8: Full Runtime Verification

**Files:**
- Verify only

- [ ] **Step 1: 전체 컨테이너 build/up**

Run: `docker compose -f docker-compose.account-driver-settlement.yml up --build -d gateway front admin-front account-auth-api driver-profile-api organization-master-api vehicle-asset-api driver-vehicle-assignment-api vehicle-ops-api`

Expected:
- all services start without crash loop

- [ ] **Step 2: seed-runner 재실행**

Run: `docker compose -f docker-compose.account-driver-settlement.yml run --rm seed-runner /usr/local/bin/run-seed.sh`

Expected:
- `Seed runner completed successfully.`

- [ ] **Step 3: service health smoke**

Run:
- `curl -s http://localhost:8080/api/vehicles/health/`
- `curl -s http://localhost:8080/api/driver-vehicle-assignments/health/`
- `curl -s http://localhost:8080/api/vehicle-ops/health/`

Expected:
- all return `{"status":"ok"}`

- [ ] **Step 4: auth + vehicle asset + assignment API smoke**

Verify at least these cases.

- admin login `200`
- `POST /api/vehicles/vehicle-masters/` admin `201`
- duplicate `plate_number` or `vin` returns `400`
- `POST /api/vehicles/vehicle-operator-accesses/` admin `201`
- second active operator access for same vehicle returns `400`
- `POST /api/driver-vehicle-assignments/assignments/` with valid driver/operator/vehicle returns `201`
- assignment for mismatched operator/driver returns `400`
- assignment on inactive vehicle returns `400`

- [ ] **Step 5: vehicle-ops smoke**

Verify:

- `GET /api/vehicle-ops/vehicles/` returns `manufacturer_company`
- `GET /api/vehicle-ops/vehicles/{id}/` returns `active_operator_company`
- `current_assignment.driver_id` appears for seeded assigned vehicle
- no `fleet` field remains in the response contract

- [ ] **Step 6: browser verification**

Use Playwright to confirm:

- `/admin/vehicles`에서 vehicle master 생성/운영사 접근 설정 가능
- `/admin/vehicle-assignments`에서 배송원 배정 생성 가능
- `/vehicles`에서 제조사/운영사/현재 배정 요약이 보임
- console errors/warnings 없음 또는 기존 허용 info만 존재

- [ ] **Step 7: verification evidence 정리**

기록할 항목:

- 실행한 test/build commands
- compose config 결과
- seed-runner 결과
- smoke/API 결과
- Playwright 화면 흐름 결과

- [ ] **Step 8: Ready-to-Commit File List 기록**

- verification only; no additional files unless a smoke fix was needed
