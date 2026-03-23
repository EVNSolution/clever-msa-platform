# Terminal Registry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `service-terminal-registry` empty shell을 실제 Django/DRF runtime repo로 승격하고, `terminal_registry`와 `terminal_installation` 1차 정본을 로컬 통합 스택에 편입한다.

**Architecture:** 이번 배치는 `service-terminal-registry`만 구현한다. 소유 범위는 `terminal_registry`와 `terminal_installation`까지만 제한하고, 위치/MQTT/diagnostic는 `service-telemetry-hub`로 남긴다. `vehicle_id`는 외부 UUID 참조이며 FK는 두지 않는다. 차량 활성 여부 검증은 write-time API validation으로만 수행한다.

**Tech Stack:** Django/DRF, Postgres, Docker Compose, Nginx gateway, admin-front minimal management UI

---

### Task 1: Promote `service-terminal-registry` From Empty Shell To Runtime Repo

**Files:**
- Create: `development/service-terminal-registry/manage.py`
- Create: `development/service-terminal-registry/config/`
- Create: `development/service-terminal-registry/terminals/`
- Create: `development/service-terminal-registry/requirements.txt`
- Create: `development/service-terminal-registry/Dockerfile`
- Modify: `development/service-terminal-registry/README.md`

- [ ] **Step 1: Scaffold the Django runtime structure**

Create the standard runtime layout used by other `service-*` repos:
- `manage.py`
- `config/settings.py`, `config/urls.py`, `config/wsgi.py`
- `terminals/apps.py`
- repo-local test package

Expected: the repo is no longer an empty shell and can boot as an independent Django service.

- [ ] **Step 2: Add repo-local runtime docs**

Update `README.md` to describe:
- current scope
- owned tables
- non-owned telemetry/assignment concerns
- how this repo is started from `integration-local-stack`

Expected: repo-local README matches the new runtime role.

### Task 2: Implement Terminal Registry Domain Models And Invariants

**Files:**
- Create: `development/service-terminal-registry/terminals/models.py`
- Create: `development/service-terminal-registry/terminals/migrations/`
- Create: `development/service-terminal-registry/terminals/services/vehicle_registry_client.py`
- Create: `development/service-terminal-registry/terminals/tests/test_models.py`
- Create: `development/service-terminal-registry/terminals/tests/test_vehicle_registry_client.py`

- [ ] **Step 1: Implement `terminal_registry`**

Model fields:
- `terminal_id`
- `manufacturer_company_id`
- `imei`
- `iccid`
- `firmware_version`
- `protocol_version`
- `app_version`
- `terminal_status`
- timestamps

Expected: `imei`, `iccid` are unique and status choices match spec.

- [ ] **Step 2: Implement `terminal_installation`**

Model fields:
- `terminal_installation_id`
- `terminal_id`
- `vehicle_id`
- `installation_status`
- `installed_at`
- `removed_at`
- timestamps

Expected: the service can express current installation state without cross-service FK.

- [ ] **Step 3: Enforce domain invariants**

Add validation for:
- one active installation per terminal
- one active installation per vehicle
- `removed_at` only for `removed`
- no new installation when terminal is not `active`

Expected: local DB rules block obvious invalid states before API serialization.

- [ ] **Step 4: Add write-time vehicle validation**

Implement a small client/service that checks `service-vehicle-registry` on installation create/update:
- vehicle exists
- vehicle is active

Expected: installation writes do not rely on FK, but still reject inactive or unknown vehicles.

### Task 3: Implement API Surface, Permissions, And Health Endpoints

**Files:**
- Create: `development/service-terminal-registry/terminals/serializers.py`
- Create: `development/service-terminal-registry/terminals/views.py`
- Create: `development/service-terminal-registry/terminals/urls.py`
- Create: `development/service-terminal-registry/terminals/permissions.py`
- Create: `development/service-terminal-registry/terminals/tests/test_api.py`
- Modify: `development/service-terminal-registry/config/urls.py`

- [ ] **Step 1: Add terminal CRUD endpoints**

Expose:
- `GET /api/terminals/health/`
- `GET /api/terminals/`
- `POST /api/terminals/`
- `GET /api/terminals/{terminal_id}/`
- `PATCH /api/terminals/{terminal_id}/`
- `GET /api/terminals/check-imei/?imei=...`

Expected: terminal asset management matches the approved spec.

- [ ] **Step 2: Add installation CRUD endpoints**

Expose:
- `GET /api/terminals/installations/`
- `POST /api/terminals/installations/`
- `GET /api/terminals/installations/{terminal_installation_id}/`
- `PATCH /api/terminals/installations/{terminal_installation_id}/`

Expected: current installation state is manageable through API without history/event scope creep.

- [ ] **Step 3: Apply role-based write permissions**

Write policy:
- manufacturer/admin side can create/update
- operator side is read-only

Expected: runtime permission behavior matches the spec and current auth model.

### Task 4: Wire The Service Into Local Integration

**Files:**
- Modify: `development/integration-local-stack/docker-compose.account-driver-settlement.yml`
- Modify: `development/integration-local-stack/infra/docker/seed-runner/Dockerfile`
- Modify: `development/edge-api-gateway/nginx.conf`
- Create: `development/service-terminal-registry/terminals/management/commands/seed_terminals.py`
- Create: `development/service-terminal-registry/.env.example`
- Modify: `development/integration-local-stack/README.md`
- Modify: `repo-map.md`
- Modify: `WORKSPACE.md`

- [ ] **Step 1: Add runtime container and DB**

Add:
- `terminal-registry-api`
- `terminal-registry-db`

Expected: the local stack can build and start the service independently.

- [ ] **Step 2: Add gateway routing**

Route `service-terminal-registry` through:
- `/api/terminals/`

Expected: callers only use the edge gateway, not direct container URLs.

- [ ] **Step 3: Add deterministic seed command**

Seed:
- one or two sample terminals
- one active installation linked to an existing active vehicle

Expected: local stack can show realistic terminal state immediately after seed-runner.

### Task 5: Add Minimal Admin Management Surface

**Files:**
- Modify: `development/front-admin-console/src/App.tsx`
- Create: `development/front-admin-console/src/api/terminals.ts`
- Create: `development/front-admin-console/src/pages/TerminalsPage.tsx`
- Create: `development/front-admin-console/src/pages/TerminalsPage.test.tsx`

- [ ] **Step 1: Add admin-only terminal management page**

Support:
- terminal list
- terminal create/update
- installation list/create/update

Expected: terminal registry is operable from the admin console without introducing operator-facing UI yet.

- [ ] **Step 2: Keep operator console unchanged**

Do not add terminal screens to `front-operator-console` in this batch.

Expected: terminal exposure stays aligned with current ownership and permission rules.

### Task 6: Close With Fresh Verification Evidence

**Files:**
- Verify only

- [ ] **Step 1: Run repo-local tests**

Run targeted tests for:
- terminal models
- vehicle validation client
- terminal API

Expected: core domain rules and permission checks pass.

- [ ] **Step 2: Run admin-front targeted tests and build**

Run:
- terminal page tests
- `npm run build`

Expected: admin console integration builds cleanly.

- [ ] **Step 3: Re-run integration compose checks**

Run:
- `docker compose -f development/integration-local-stack/docker-compose.account-driver-settlement.yml config`
- `docker compose -f development/integration-local-stack/docker-compose.account-driver-settlement.yml build terminal-registry-api gateway seed-runner admin-front`

Expected: local integration references resolve from the new runtime repo.

- [ ] **Step 4: Re-run stack smoke**

Verify:
- `/api/terminals/health/`
- admin login
- terminal create
- installation create
- invalid double-install rejection
- inactive vehicle install rejection

Expected: fresh HTTP evidence proves the new service is live and guarded by the intended constraints.

## Out Of Scope For This Batch

- terminal installation history
- terminal provisioning workflow
- MQTT ingestion
- location snapshot
- diagnostic/fault storage
- Vehicle Ops consumption of terminal fields
- operator-facing terminal UI

## Completion Criteria

- `service-terminal-registry` is a real runtime repo, not an empty shell
- `terminal_registry` and `terminal_installation` exist with validated invariants
- vehicle activity is checked by runtime validation, not FK
- gateway and integration-local-stack can start the service
- admin-front can manage terminals and current installations
- telemetry concerns remain outside this repo
