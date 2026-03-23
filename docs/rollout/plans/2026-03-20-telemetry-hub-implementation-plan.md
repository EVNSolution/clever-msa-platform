# Telemetry Hub Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `service-telemetry-hub` empty shell을 실제 runtime repo로 승격하고, raw ingest + normalized timeseries + latest snapshot/diagnostic API를 로컬 통합 스택과 `service-vehicle-operations-view`에 연결한다.

**Architecture:** 이번 배치는 저장은 time-series 전제로 설계하고, 외부 계약은 latest snapshot 우선으로 제한한다. `service-telemetry-hub`는 차량/단말 정본을 수정하지 않으며, source identity는 `terminal_id`와 `vehicle_id` UUID 참조로만 다룬다. 장기간 조회 API와 분석 API는 열지 않는다.

**Tech Stack:** Django/DRF, time-series friendly Postgres schema, Docker Compose, Nginx gateway, `service-vehicle-operations-view` source integration

---

### Task 1: Promote `service-telemetry-hub` From Empty Shell To Runtime Repo

**Files:**
- Create: `development/service-telemetry-hub/manage.py`
- Create: `development/service-telemetry-hub/config/`
- Create: `development/service-telemetry-hub/telemetry/`
- Create: `development/service-telemetry-hub/requirements.txt`
- Create: `development/service-telemetry-hub/Dockerfile`
- Modify: `development/service-telemetry-hub/README.md`

- [ ] **Step 1: Scaffold the Django runtime structure**

Create the standard runtime layout:
- `manage.py`
- `config/settings.py`, `config/urls.py`, `config/wsgi.py`
- `telemetry/apps.py`
- repo-local test package

Expected: the repo can boot independently as a Django service.

- [ ] **Step 2: Update repo-local README**

Document:
- current owned tables
- latest snapshot contract
- out-of-scope analytics/history API
- relation to `service-terminal-registry` and `service-vehicle-operations-view`

Expected: runtime role and future role are both clear from the repo entrypoint.

### Task 2: Implement Raw Ingest, Timeseries, Snapshot, And Diagnostic Models

**Files:**
- Create: `development/service-telemetry-hub/telemetry/models.py`
- Create: `development/service-telemetry-hub/telemetry/migrations/`
- Create: `development/service-telemetry-hub/telemetry/tests/test_models.py`

- [ ] **Step 1: Implement `telemetry_raw_ingest`**

Fields:
- `telemetry_raw_ingest_id`
- `source_terminal_id`
- `source_vehicle_id`
- `message_topic`
- `message_type`
- `payload_json`
- `received_at`

Expected: raw ingress is append-only and source identity is preserved.

- [ ] **Step 2: Implement `telemetry_timeseries`**

Fields:
- `telemetry_timeseries_id`
- `source_terminal_id`
- `source_vehicle_id`
- `captured_at`
- `lat`
- `lng`
- `speed`
- `battery_soc`
- `key_status`
- `payload_version`

Expected: normalized time-series rows can be inserted without exposing long-range query APIs yet.

- [ ] **Step 3: Implement latest projection tables**

Add:
- `vehicle_location_snapshot`
- `diagnostic_event`

Expected: latest location and diagnostic reads are optimized separately from raw/timeseries storage.

- [ ] **Step 4: Enforce core telemetry invariants**

Add validation for:
- append-only raw/timeseries writes
- newer `captured_at` only updates snapshot
- duplicate `vehicle_id + event_code + captured_at` diagnostic rejection
- no timeseries row when both `vehicle_id` and `terminal_id` are absent

Expected: telemetry semantics are encoded in the domain layer, not only in controllers.

### Task 3: Implement Ingest Pipeline And Latest Query APIs

**Files:**
- Create: `development/service-telemetry-hub/telemetry/serializers.py`
- Create: `development/service-telemetry-hub/telemetry/views.py`
- Create: `development/service-telemetry-hub/telemetry/urls.py`
- Create: `development/service-telemetry-hub/telemetry/services/ingest_service.py`
- Create: `development/service-telemetry-hub/telemetry/tests/test_ingest_service.py`
- Create: `development/service-telemetry-hub/telemetry/tests/test_api.py`
- Modify: `development/service-telemetry-hub/config/urls.py`

- [ ] **Step 1: Add raw ingest endpoint**

Expose:
- `POST /api/telemetry/ingest/raw/`

Expected: one ingress call writes raw payload and triggers normalization/snapshot update in the same service boundary.

- [ ] **Step 2: Add latest location and diagnostic APIs**

Expose:
- `GET /api/telemetry/health/`
- `GET /api/telemetry/vehicles/{vehicle_id}/latest-location/`
- `GET /api/telemetry/vehicles/{vehicle_id}/latest-diagnostics/`
- `GET /api/telemetry/terminals/{terminal_id}/latest-location/`

Expected: callers can read current state without depending on raw/timeseries internals.

- [ ] **Step 3: Apply write permissions**

Policy:
- ingest endpoints are limited to ingestion/manufacturer side
- operator/admin consoles are read-only consumers for latest APIs

Expected: operational readers cannot mutate telemetry state directly.

### Task 4: Wire The Service Into Local Integration

**Files:**
- Modify: `development/integration-local-stack/docker-compose.account-driver-settlement.yml`
- Modify: `development/edge-api-gateway/nginx.conf`
- Modify: `development/integration-local-stack/README.md`
- Modify: `repo-map.md`
- Modify: `WORKSPACE.md`
- Create: `development/service-telemetry-hub/.env.example`
- Create: `development/service-telemetry-hub/telemetry/management/commands/seed_telemetry.py`

- [ ] **Step 1: Add runtime container and DB**

Add:
- `telemetry-hub-api`
- `telemetry-hub-db`

Expected: local stack can start the service independently.

- [ ] **Step 2: Add gateway routing**

Route:
- `/api/telemetry/`

Expected: consumers use the edge gateway only.

- [ ] **Step 3: Add deterministic seed path**

Seed:
- one or two raw ingress payloads
- normalized timeseries rows
- one current latest location snapshot
- one open diagnostic event

Expected: local stack has deterministic telemetry state for smoke and `vehicle-ops` integration.

### Task 5: Connect `service-vehicle-operations-view` To Telemetry Hub

**Files:**
- Modify: `development/service-vehicle-operations-view/vehicleops/services/source_clients.py`
- Modify: `development/service-vehicle-operations-view/vehicleops/services/vehicle_summary_service.py`
- Modify: `development/service-vehicle-operations-view/vehicleops/tests/`
- Modify: `development/front-operator-console/src/pages/VehiclesPage.tsx` if needed

- [ ] **Step 1: Add telemetry source client**

Read:
- latest location by vehicle
- latest diagnostics by vehicle

Expected: `service-vehicle-operations-view` matches the already-approved post-refactor contract.

- [ ] **Step 2: Extend summary assembly**

Expose:
- `telemetry.latest_location`
- `telemetry.latest_diagnostic`

Expected: `Vehicle Ops` no longer needs placeholder or empty telemetry sections once the hub is live.

- [ ] **Step 3: Keep terminal details out**

Do not add:
- IMEI
- ICCID
- firmware version
- installation detail

Expected: `Vehicle Ops` stays aligned with the lean contract and waits for `service-terminal-registry` later.

### Task 6: Close With Fresh Verification Evidence

**Files:**
- Verify only

- [ ] **Step 1: Run repo-local telemetry tests**

Run targeted tests for:
- models
- ingest service
- latest API

Expected: raw/timeseries/snapshot/diagnostic behavior is covered by fresh evidence.

- [ ] **Step 2: Run `service-vehicle-operations-view` targeted tests**

Run the tests covering source clients and summary assembly.

Expected: the view service can consume latest telemetry without contract drift.

- [ ] **Step 3: Re-run integration compose checks**

Run:
- `docker compose -f development/integration-local-stack/docker-compose.account-driver-settlement.yml config`
- `docker compose -f development/integration-local-stack/docker-compose.account-driver-settlement.yml build telemetry-hub-api vehicle-ops-api gateway seed-runner`

Expected: the new runtime repo resolves correctly in the integration shell.

- [ ] **Step 4: Re-run stack smoke**

Verify:
- `/api/telemetry/health/`
- raw ingest success
- latest vehicle location success
- latest diagnostics success
- `Vehicle Ops` response includes telemetry block

Expected: fresh HTTP evidence proves the new telemetry source is live and consumed downstream.

## Out Of Scope For This Batch

- broker/MQTT consumer daemon implementation
- long-range timeseries query API
- aggregate analytics
- anomaly detection
- replay/reprocess pipeline
- terminal registry writes
- vehicle registry writes
- front/admin direct telemetry pages

## Completion Criteria

- `service-telemetry-hub` is a real runtime repo, not an empty shell
- raw ingest, timeseries, latest snapshot, and diagnostics exist with correct invariants
- gateway and integration-local-stack can start the service
- `service-vehicle-operations-view` consumes latest telemetry from the hub
- telemetry remains separate from terminal registry and vehicle registry ownership
