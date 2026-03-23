# Dispatch Operations View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `service-dispatch-operations-view` empty shell을 실제 Django/DRF read-model runtime repo로 승격하고, 계획 배차와 현재 배정 truth를 비교하는 `board`/`summary` API를 로컬 통합 스택에 편입한다.

**Architecture:** 이번 배치는 `Lean Operations Board`만 구현한다. `service-dispatch-registry`, `service-vehicle-assignment`, `service-vehicle-registry`, `service-driver-profile` 네 source만 fan-out HTTP로 읽고, `matched`, `not_started`, `dispatch_unit_changed`, `unplanned_current` 상태를 계산해 사람 친화적인 row와 summary를 만든다. 이 서비스는 정본을 저장하지 않고 write API도 갖지 않는다.

**Tech Stack:** Django/DRF, fan-out internal HTTP, JWT auth passthrough, Docker Compose, Nginx gateway

---

### Task 1: Promote `service-dispatch-operations-view` From Empty Shell To Runtime Repo

**Files:**
- Create: `development/service-dispatch-operations-view/manage.py`
- Create: `development/service-dispatch-operations-view/config/__init__.py`
- Create: `development/service-dispatch-operations-view/config/settings.py`
- Create: `development/service-dispatch-operations-view/config/urls.py`
- Create: `development/service-dispatch-operations-view/config/asgi.py`
- Create: `development/service-dispatch-operations-view/config/wsgi.py`
- Create: `development/service-dispatch-operations-view/dispatchops/__init__.py`
- Create: `development/service-dispatch-operations-view/dispatchops/apps.py`
- Create: `development/service-dispatch-operations-view/requirements.txt`
- Create: `development/service-dispatch-operations-view/Dockerfile`
- Create: `development/service-dispatch-operations-view/entrypoint.sh`
- Create: `development/service-dispatch-operations-view/.env.example`
- Modify: `development/service-dispatch-operations-view/README.md`

- [ ] **Step 1: Scaffold the Django runtime structure**

Follow the same independent read-model service layout used by `service-vehicle-operations-view`:
- no dedicated Postgres container
- local sqlite database only for Django boot/runtime metadata
- app package name `dispatchops`

Expected: the repo can boot as a standalone Django service.

- [ ] **Step 2: Add repo-local settings for upstream source URLs**

Define settings for:
- `DISPATCH_REGISTRY_BASE_URL`
- `DRIVER_VEHICLE_ASSIGNMENT_BASE_URL`
- `VEHICLE_ASSET_BASE_URL`
- `DRIVER_PROFILE_BASE_URL`
- JWT auth settings reused from other read-model services

Expected: runtime has explicit env-driven upstream addresses and consistent auth behavior.

- [ ] **Step 3: Rewrite the repo README around the approved spec**

Update `README.md` so it explains:
- 1차 scope
- owned read contract
- non-owned domains
- status meanings
- difference from `service-dispatch-registry`
- integration-local-stack startup path

Expected: repo-local docs match the approved design and no longer describe an empty shell only.

### Task 2: Add Upstream Source Clients And Error Surface

**Files:**
- Create: `development/service-dispatch-operations-view/dispatchops/services/__init__.py`
- Create: `development/service-dispatch-operations-view/dispatchops/services/source_clients.py`
- Create: `development/service-dispatch-operations-view/dispatchops/exceptions.py`
- Create: `development/service-dispatch-operations-view/dispatchops/authentication.py`
- Create: `development/service-dispatch-operations-view/dispatchops/permissions.py`
- Create: `development/service-dispatch-operations-view/dispatchops/tests/__init__.py`
- Create: `development/service-dispatch-operations-view/dispatchops/tests/test_source_clients.py`

- [ ] **Step 1: Add generic upstream request helper**

Implement a small client layer matching existing read-model style:
- build URL from base URL + path
- forward incoming `Authorization`
- normalize HTTP errors into `SourceNotFoundError` / `SourceServiceError`
- support list payloads and allow-not-found flows

Expected: all upstream fan-out calls share one consistent error contract.

- [ ] **Step 2: Add dispatch-registry client methods**

Support:
- list plans filtered by `dispatch_date` and `fleet_id`
- list assignments filtered by `dispatch_date`

Expected: the service can fetch planned volume and planned dispatch units for one board request.

- [ ] **Step 3: Add vehicle-assignment, vehicle-registry, and driver-profile client methods**

Support:
- list assigned current assignments
- list vehicle masters
- list drivers

Expected: the service can resolve current truth and human-readable names for the board.

- [ ] **Step 4: Add failing source-client tests first**

Cover:
- URL construction
- list payload handling
- 404 normalization
- upstream invalid JSON / 5xx mapping

Expected: client behavior is locked before the board service is written.

### Task 3: Build The Dispatch Board Aggregation Service

**Files:**
- Create: `development/service-dispatch-operations-view/dispatchops/services/dispatch_board_service.py`
- Create: `development/service-dispatch-operations-view/dispatchops/tests/test_dispatch_board_service.py`

- [ ] **Step 1: Write failing tests for planned row assembly**

Cover:
- board rows are built from `dispatch_assignment`
- empty `vehicle_schedule` without assignment is excluded
- `plate_number`, `planned_driver_name`, `current_driver_name` are resolved from source maps

Expected: the row contract is fixed before implementation.

- [ ] **Step 2: Implement `matched` and `not_started` state rules**

Rules:
- `matched` when planned row exists and current driver equals planned driver
- `not_started` when planned row exists and current truth is absent

Expected: the two basic status paths pass first.

- [ ] **Step 3: Implement `dispatch_unit_changed` and `unplanned_current`**

Rules:
- `dispatch_unit_changed` when planned row exists and current driver differs
- `unplanned_current` synthetic row when current truth exists without a planned row
- synthetic row uses `shift_slot = null`

Expected: the agreed diff model is fully covered.

- [ ] **Step 4: Add warning generation rules**

Warnings:
- `vehicle_lookup_failed`
- `planned_driver_lookup_failed`
- `current_driver_lookup_failed`
- `current_assignment_source_unavailable`

Expected: lookup failure is represented without replacing `dispatch_status`.

- [ ] **Step 5: Add summary aggregation**

Compute:
- `planned_volume`
- `planned_assignment_count`
- `matched_count`
- `not_started_count`
- `dispatch_unit_changed_count`
- `unplanned_current_count`

Expected: one service method can return `board` rows and `summary` counters for the same filter set.

### Task 4: Add API Surface And Serialization

**Files:**
- Create: `development/service-dispatch-operations-view/dispatchops/serializers.py`
- Create: `development/service-dispatch-operations-view/dispatchops/views.py`
- Create: `development/service-dispatch-operations-view/dispatchops/urls.py`
- Create: `development/service-dispatch-operations-view/dispatchops/tests/test_dispatch_ops_api.py`
- Modify: `development/service-dispatch-operations-view/config/urls.py`

- [ ] **Step 1: Add serializer contracts for board and summary**

Board fields:
- `dispatch_date`
- `shift_slot`
- `vehicle_id`
- `plate_number`
- `planned_driver_id`
- `planned_driver_name`
- `current_driver_id`
- `current_driver_name`
- `dispatch_status`
- `warnings`

Summary fields:
- `dispatch_date`
- `fleet_id`
- `planned_volume`
- `planned_assignment_count`
- `matched_count`
- `not_started_count`
- `dispatch_unit_changed_count`
- `unplanned_current_count`

Expected: API response shape is explicit and testable.

- [ ] **Step 2: Add health endpoint**

Expose:
- `GET /api/dispatch-ops/health/`

Expected: gateway and smoke verification have a simple readiness endpoint.

- [ ] **Step 3: Add board endpoint**

Expose:
- `GET /api/dispatch-ops/board/?dispatch_date=YYYY-MM-DD&fleet_id=<uuid>`

Behavior:
- authenticated read only
- require both `dispatch_date` and `fleet_id`
- return ordered board rows for that date/fleet slice

Expected: one endpoint returns the human-readable dispatch board.

- [ ] **Step 4: Add summary endpoint**

Expose:
- `GET /api/dispatch-ops/summary/?dispatch_date=YYYY-MM-DD&fleet_id=<uuid>`

Behavior:
- authenticated read only
- same filter requirements as board
- reuses the same aggregation service rather than duplicating source calls

Expected: board and summary stay logically consistent.

- [ ] **Step 5: Add failing API tests first**

Cover:
- unauthenticated request returns `401`
- malformed auth header returns `401`
- `health` returns `200`
- board returns expected row array
- summary returns expected counters
- missing filters return `400`

Expected: endpoint contract is fixed before view implementation.

### Task 5: Wire `service-dispatch-operations-view` Into Local Integration

**Files:**
- Modify: `development/integration-local-stack/docker-compose.account-driver-settlement.yml`
- Modify: `development/edge-api-gateway/nginx.conf`
- Create: `development/integration-local-stack/infra/env/dispatch-ops.env.example`
- Modify: `development/integration-local-stack/README.md`
- Modify: `development/integration-local-stack/compose/README.md`
- Modify: `WORKSPACE.md`
- Modify: `repo-map.md`
- Modify: `docs/mappings/current-to-target-repo-map.md`
- Modify: `docs/mappings/repo-responsibility-matrix.md`

- [ ] **Step 1: Add runtime container**

Add:
- `dispatch-ops-api`

Dependencies:
- `dispatch-registry-api`
- `driver-vehicle-assignment-api`
- `vehicle-asset-api`
- `driver-profile-api`

Expected: the local stack can build and start the new read-model service.

- [ ] **Step 2: Add gateway routing**

Route:
- `/api/dispatch-ops/`

Expected: callers use the edge gateway instead of direct container URLs.

- [ ] **Step 3: Add env template and docs references**

Document:
- required base URLs
- JWT settings
- runtime role as read-model only

Expected: integration docs and platform indexes reflect the service as an active runtime repo.

### Task 6: Close With Fresh Verification Evidence

**Files:**
- Verify only

- [ ] **Step 1: Run repo-local tests**

Run targeted tests for:
- source clients
- board service
- API endpoints

Expected: all dispatch-ops tests pass with fresh output.

- [ ] **Step 2: Re-run integration compose checks**

Run:
- `docker compose -f development/integration-local-stack/docker-compose.account-driver-settlement.yml config`
- `docker compose -f development/integration-local-stack/docker-compose.account-driver-settlement.yml build dispatch-ops-api gateway`

Expected: stack wiring and container build succeed.

- [ ] **Step 3: Bring up the read-model and re-seed sources**

Run:
- `docker compose -f development/integration-local-stack/docker-compose.account-driver-settlement.yml up -d dispatch-registry-api driver-vehicle-assignment-api vehicle-asset-api driver-profile-api dispatch-ops-api gateway`
- `docker compose -f development/integration-local-stack/docker-compose.account-driver-settlement.yml run --rm seed-runner /usr/local/bin/run-seed.sh`

Expected: upstream source data exists before board/smoke verification.

- [ ] **Step 4: Run gateway smoke checks**

Verify:
- `GET /api/dispatch-ops/health/` returns `200`
- `GET /api/dispatch-ops/board/?dispatch_date=<seeded-date>&fleet_id=<seeded-fleet>` returns at least one row
- `GET /api/dispatch-ops/summary/?dispatch_date=<seeded-date>&fleet_id=<seeded-fleet>` returns non-zero `planned_assignment_count`
- at least one seeded row returns one of the agreed `dispatch_status` values (`matched`, `not_started`, `dispatch_unit_changed`, `unplanned_current`)

Expected: end-to-end board/summary behavior is proven through the edge route, not just unit tests.

- [ ] **Step 5: Perform stale-marker and doc drift checks**

Run a final ripgrep sweep across the touched scope for unfinished implementation markers and commit-instruction leftovers.

Expected: no stale implementation markers remain in the touched scope.
