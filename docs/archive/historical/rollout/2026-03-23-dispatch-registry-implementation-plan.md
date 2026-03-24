# Dispatch Registry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `service-dispatch-registry` empty shell을 실제 Django/DRF runtime repo로 승격하고, `dispatch_plan`, `vehicle_schedule`, `dispatch_assignment` 1차 계획 정본을 로컬 통합 스택에 편입한다.

**Architecture:** 이번 배치는 `service-dispatch-registry`만 구현한다. 소유 범위는 `dispatch_plan + vehicle_schedule + dispatch_assignment`까지만 제한하고, 권역/목적지/leave/휴무/월 근무일수는 후속 입력원으로 남긴다. `operator_company_id`는 FK가 아니라 dispatch-context snapshot 컬럼이며, 생성 시점에만 `service-vehicle-registry`의 활성 운영권과 일치 검증한다.

**Tech Stack:** Django/DRF, Postgres, Docker Compose, Nginx gateway, internal HTTP validation

---

### Task 1: Promote `service-dispatch-registry` From Empty Shell To Runtime Repo

**Files:**
- Create: `development/service-dispatch-registry/manage.py`
- Create: `development/service-dispatch-registry/config/`
- Create: `development/service-dispatch-registry/dispatch/`
- Create: `development/service-dispatch-registry/requirements.txt`
- Create: `development/service-dispatch-registry/Dockerfile`
- Create: `development/service-dispatch-registry/entrypoint.sh`
- Create: `development/service-dispatch-registry/.env.example`
- Modify: `development/service-dispatch-registry/README.md`

- [ ] **Step 1: Scaffold the Django runtime structure**

Create the same independent-service layout used by `service-terminal-registry` and `service-vehicle-assignment`:
- `manage.py`
- `config/settings.py`, `config/urls.py`, `config/asgi.py`, `config/wsgi.py`
- `dispatch/apps.py`
- repo-local test package

Expected: the repo can boot as a standalone Django service.

- [ ] **Step 2: Rewrite the repo README around the dispatch spec**

Update `README.md` so it explains:
- current 1차 scope
- owned tables
- non-owned planning inputs
- difference from `service-vehicle-assignment`
- how this repo is started from `integration-local-stack`

Expected: repo-local docs match the approved spec and no longer describe an empty shell only.

### Task 2: Implement Dispatch Domain Models And Database Invariants

**Files:**
- Create: `development/service-dispatch-registry/dispatch/models.py`
- Create: `development/service-dispatch-registry/dispatch/migrations/`
- Create: `development/service-dispatch-registry/dispatch/tests/test_models.py`

- [ ] **Step 1: Implement `dispatch_plan`**

Model fields:
- `dispatch_plan_id`
- `company_id`
- `fleet_id`
- `dispatch_date`
- `planned_volume`
- `dispatch_status`
- timestamps

DB invariants:
- unique `(fleet_id, dispatch_date)`

Expected: one plan row exists per fleet/date pair.

- [ ] **Step 2: Implement `vehicle_schedule`**

Model fields:
- `vehicle_schedule_id`
- `vehicle_id`
- `fleet_id`
- `dispatch_date`
- `shift_slot`
- `schedule_status`
- `starts_at`
- `ends_at`
- timestamps

DB invariants:
- unique `(vehicle_id, dispatch_date, shift_slot)`

Expected: one vehicle slot exists per vehicle/date/shift combination.

- [ ] **Step 3: Implement `dispatch_assignment`**

Model fields:
- `dispatch_assignment_id`
- `vehicle_schedule`
- `vehicle_id`
- `driver_id`
- `operator_company_id`
- `dispatch_date`
- `shift_slot`
- `assignment_status`
- `assigned_at`
- `unassigned_at`
- timestamps

DB invariants:
- partial unique on `vehicle_schedule_id` where `assignment_status='assigned'`

Expected: one active planned assignment exists per vehicle slot.

- [ ] **Step 4: Add model-level validation**

Validate:
- assignment `vehicle_id` matches linked `vehicle_schedule.vehicle_id`
- assignment `dispatch_date` matches linked `vehicle_schedule.dispatch_date`
- assignment `shift_slot` matches linked `vehicle_schedule.shift_slot`
- `schedule_status != planned` blocks new active assignment
- `unassigned_at` is only set when `assignment_status='unassigned'`
- `starts_at <= ends_at` when both are present

Expected: local model rules prevent invalid dispatch truth from being persisted.

### Task 3: Add Cross-Service Validation Clients

**Files:**
- Create: `development/service-dispatch-registry/dispatch/services/__init__.py`
- Create: `development/service-dispatch-registry/dispatch/services/source_clients.py`
- Create: `development/service-dispatch-registry/dispatch/services/dispatch_rule_service.py`
- Create: `development/service-dispatch-registry/dispatch/tests/test_source_clients.py`
- Create: `development/service-dispatch-registry/dispatch/tests/test_dispatch_rule_service.py`

- [ ] **Step 1: Add vehicle-registry read client**

Client responsibilities:
- fetch vehicle master by `vehicle_id`
- fetch active operator access by `vehicle_id`

Expected: runtime can validate vehicle existence, status, and active operator context without FK.

- [ ] **Step 2: Add driver-profile read client**

Client responsibilities:
- fetch driver profile by `driver_id`

Expected: assignment create/update can reject unknown drivers.

- [ ] **Step 3: Implement dispatch rule service**

Rules to enforce:
- vehicle must exist
- vehicle must be active
- driver must exist
- `operator_company_id` snapshot must equal current active operator access at creation/update time

Expected: `operator_company_id` stays a snapshot column while still being checked against current truth at write time.

### Task 4: Implement API Surface, Serializers, Permissions, And Health

**Files:**
- Create: `development/service-dispatch-registry/dispatch/serializers.py`
- Create: `development/service-dispatch-registry/dispatch/views.py`
- Create: `development/service-dispatch-registry/dispatch/urls.py`
- Create: `development/service-dispatch-registry/dispatch/permissions.py`
- Create: `development/service-dispatch-registry/dispatch/authentication.py`
- Create: `development/service-dispatch-registry/dispatch/exceptions.py`
- Create: `development/service-dispatch-registry/dispatch/tests/test_dispatch_api.py`
- Modify: `development/service-dispatch-registry/config/urls.py`

- [ ] **Step 1: Add plan endpoints**

Expose:
- `GET /api/dispatch/health/`
- `GET /api/dispatch/plans/`
- `POST /api/dispatch/plans/`
- `GET /api/dispatch/plans/{dispatch_plan_id}/`
- `PATCH /api/dispatch/plans/{dispatch_plan_id}/`

Expected: fleet/date volume planning is writable and queryable.

- [ ] **Step 2: Add vehicle schedule endpoints**

Expose:
- `GET /api/dispatch/vehicle-schedules/`
- `POST /api/dispatch/vehicle-schedules/`
- `GET /api/dispatch/vehicle-schedules/{vehicle_schedule_id}/`
- `PATCH /api/dispatch/vehicle-schedules/{vehicle_schedule_id}/`

Expected: vehicle slot planning is manageable per vehicle/date/shift.

- [ ] **Step 3: Add dispatch assignment endpoints**

Expose:
- `GET /api/dispatch/assignments/`
- `POST /api/dispatch/assignments/`
- `GET /api/dispatch/assignments/{dispatch_assignment_id}/`
- `PATCH /api/dispatch/assignments/{dispatch_assignment_id}/`

Expected: planned driver-to-vehicle assignment is manageable without conflating runtime assignment truth.

- [ ] **Step 4: Apply write permissions**

Write policy:
- planning admins/authorized staff can create/update
- general operational users are read-only

Expected: write behavior matches the spec’s planning-owner boundary.

### Task 5: Wire `service-dispatch-registry` Into Local Integration

**Files:**
- Modify: `development/integration-local-stack/docker-compose.account-driver-settlement.yml`
- Modify: `development/edge-api-gateway/nginx.conf`
- Modify: `development/integration-local-stack/README.md`
- Modify: `development/integration-local-stack/compose/README.md`
- Modify: `WORKSPACE.md`
- Modify: `repo-map.md`
- Modify: `docs/mappings/current-to-target-repo-map.md`
- Modify: `docs/mappings/repo-responsibility-matrix.md`
- Create: `development/service-dispatch-registry/dispatch/management/commands/seed_dispatch.py`

- [ ] **Step 1: Add runtime container and DB**

Add:
- `dispatch-registry-api`
- `dispatch-registry-db`

Expected: the local stack can build and start the new dispatch service independently.

- [ ] **Step 2: Add gateway routing**

Route:
- `/api/dispatch/`

Expected: callers only use the edge gateway rather than direct container URLs.

- [ ] **Step 3: Add deterministic seed command**

Seed:
- one `dispatch_plan`
- one or more `vehicle_schedule` rows against an existing seeded vehicle
- one `dispatch_assignment` against an existing seeded driver and active operator snapshot

Expected: fresh stack boot has meaningful sample dispatch data.

### Task 6: Close With Fresh Verification Evidence

**Files:**
- Verify only

- [ ] **Step 1: Run repo-local backend tests**

Run targeted tests for:
- models
- source clients
- dispatch rule service
- dispatch API

Expected: core domain rules and permission checks pass.

- [ ] **Step 2: Re-run integration compose checks**

Run:
- `docker compose -f development/integration-local-stack/docker-compose.account-driver-settlement.yml config`
- `docker compose -f development/integration-local-stack/docker-compose.account-driver-settlement.yml build dispatch-registry-api gateway seed-runner`

Expected: local integration references resolve from the new runtime repo.

- [ ] **Step 3: Re-run stack smoke**

Verify:
- `/api/dispatch/health/`
- dispatch plan create/update
- vehicle schedule create/update
- dispatch assignment create/update
- invalid operator snapshot rejection
- blocked schedule assignment rejection

Expected: fresh HTTP evidence proves the new planning truth service is live and guarded by the intended constraints.

## Out Of Scope For This Batch

- dispatch operations view runtime
- region/destination planning inputs
- leave/day-off/monthly-workdays
- shift schedule runtime
- current assignment synchronization workflow
- admin-front planning UI
- operator-facing dispatch UI

## Completion Criteria

- `service-dispatch-registry` is a real runtime repo, not an empty shell
- `dispatch_plan`, `vehicle_schedule`, and `dispatch_assignment` exist with validated invariants
- `operator_company_id` remains a snapshot column and is checked by runtime validation only
- gateway and integration-local-stack can start the service
- deterministic dispatch seed data exists
- current runtime assignment truth remains outside this repo
