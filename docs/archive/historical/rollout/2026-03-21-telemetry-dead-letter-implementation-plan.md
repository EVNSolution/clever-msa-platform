# Telemetry Dead Letter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `service-telemetry-dead-letter`를 별도 runtime repo로 추가하고, telemetry listener 실패 payload를 append-only로 저장하며 admin-only read와 internal-only write를 제공한다.

**Architecture:** 이번 배치는 Django/DRF 기반의 얇은 dead-letter service를 추가한다. `service-telemetry-listener`는 MQTT subscribe와 hub forward 책임을 유지하되 parser contract를 명시적으로 갈라 `ParseFailure`와 `ParsedTelemetryEnvelope`를 구분하고, `parse_error`, `hub_4xx`, `hub_5xx_retry_exhausted`, `connection_failure_retry_exhausted`, `timeout_retry_exhausted`를 정확히 분류해 `service-telemetry-dead-letter`의 internal ingest API만 호출한다. dead-letter는 telemetry 정본이 아니라 실패 증거 저장소로 남기며, service-local route와 gateway route를 분리하고 자동 replay/status workflow는 들이지 않는다.

**Tech Stack:** Django, Django REST Framework, PostgreSQL, JWT auth for admin read, internal key auth for service-to-service write, Docker Compose, existing Nginx gateway

---

### Task 1: Create `service-telemetry-dead-letter` Runtime Repo

**Files:**
- Create: `development/service-telemetry-dead-letter/README.md`
- Create: `development/service-telemetry-dead-letter/requirements.txt`
- Create: `development/service-telemetry-dead-letter/Dockerfile`
- Create: `development/service-telemetry-dead-letter/entrypoint.sh`
- Create: `development/service-telemetry-dead-letter/manage.py`
- Create: `development/service-telemetry-dead-letter/config/__init__.py`
- Create: `development/service-telemetry-dead-letter/config/settings.py`
- Create: `development/service-telemetry-dead-letter/config/urls.py`
- Create: `development/service-telemetry-dead-letter/config/asgi.py`
- Create: `development/service-telemetry-dead-letter/config/wsgi.py`
- Create: `development/service-telemetry-dead-letter/deadletters/__init__.py`
- Create: `development/service-telemetry-dead-letter/deadletters/apps.py`
- Create: `development/service-telemetry-dead-letter/deadletters/models.py`
- Create: `development/service-telemetry-dead-letter/deadletters/serializers.py`
- Create: `development/service-telemetry-dead-letter/deadletters/views.py`
- Create: `development/service-telemetry-dead-letter/deadletters/urls.py`
- Create: `development/service-telemetry-dead-letter/deadletters/permissions.py`
- Create: `development/service-telemetry-dead-letter/deadletters/authentication.py`
- Create: `development/service-telemetry-dead-letter/deadletters/migrations/__init__.py`
- Create: `development/service-telemetry-dead-letter/deadletters/tests/__init__.py`

- [ ] **Step 1: Scaffold the repo structure**

Follow the existing Django service pattern used by `service-telemetry-hub` and `service-terminal-registry`.

Expected: a bootable Django service shell exists at `development/service-telemetry-dead-letter/`.

- [ ] **Step 2: Write the repo-local README**

Document:
- current role: failed telemetry payload append-only store
- future role: replay/status workflow later
- non-owned concerns: telemetry raw/timeseries/snapshot truth, automatic replay
- dependencies: `service-telemetry-listener`, `service-telemetry-hub`

Expected: the repo boundary is obvious without reading implementation code.

### Task 2: Implement Dead-Letter Data Model And Core API

**Files:**
- Modify: `development/service-telemetry-dead-letter/config/settings.py`
- Modify: `development/service-telemetry-dead-letter/deadletters/models.py`
- Modify: `development/service-telemetry-dead-letter/deadletters/serializers.py`
- Modify: `development/service-telemetry-dead-letter/deadletters/views.py`
- Modify: `development/service-telemetry-dead-letter/deadletters/urls.py`
- Modify: `development/service-telemetry-dead-letter/deadletters/permissions.py`
- Modify: `development/service-telemetry-dead-letter/deadletters/authentication.py`
- Create: `development/service-telemetry-dead-letter/deadletters/tests/test_models.py`
- Create: `development/service-telemetry-dead-letter/deadletters/tests/test_api.py`
- Create: `development/service-telemetry-dead-letter/deadletters/migrations/0001_initial.py`

- [ ] **Step 1: Write the failing model tests**

Cover:
- append-only create-only behavior
- required fields: `source_service`, `message_topic`, `payload_json`, `received_at`, `failure_class`, `error_message`, `retry_attempts`, `failure_fingerprint`, `failed_at`
- allowed `failure_class` enum values only

Run: `python manage.py test deadletters.tests.test_models -v 2`
Expected: FAIL because model/constraints do not exist yet

- [ ] **Step 2: Implement the `TelemetryDeadLetter` model**

Fields:
- `telemetry_dead_letter_id`
- `source_service`
- `message_topic`
- `source_terminal_id`
- `source_vehicle_id`
- `message_type`
- `payload_json`
- `received_at`
- `failure_class`
- `error_message`
- `retry_attempts`
- `failure_fingerprint`
- `failed_at`

Rules:
- append-only
- no replay/status fields
- `failed_at desc` ordering

Run: `python manage.py test deadletters.tests.test_models -v 2`
Expected: PASS

- [ ] **Step 3: Write the failing API tests**

Cover:
- service-local `GET /health/` returns `{"status":"ok"}`
- service-local internal ingest `POST /ingest/` with valid producer key returns `201`
- service-local `POST /ingest/` with invalid producer key returns `401`
- service-local admin JWT can list and detail
- service-local non-admin JWT cannot list/detail
- pagination/filter defaults exist

Run: `python manage.py test deadletters.tests.test_api -v 2`
Expected: FAIL because serializer/view/auth logic is incomplete

- [ ] **Step 4: Implement serializers, auth, permissions, and endpoints**

Endpoints:
- service-local `GET /health/`
- service-local `POST /ingest/`
- service-local `GET /`
- service-local `GET /<uuid:telemetry_dead_letter_id>/`
- gateway exposure is deferred to Task 5 and must only cover `/api/telemetry-dead-letters/health/`, `/api/telemetry-dead-letters/`, `/api/telemetry-dead-letters/<uuid>/`

Auth rules:
- `POST /ingest/` accepts `X-Telemetry-Dead-Letter-Key`
- auth layer must resolve the header against a producer-specific key map keyed by `source_service`
- phase 1 populates only the `service-telemetry-listener` producer key, but the code path must allow later `service-telemetry-hub` registration without changing the ingest contract
- `GET` endpoints require admin JWT
- `health` is unauthenticated

Run: `python manage.py test deadletters.tests.test_api -v 2`
Expected: PASS

### Task 3: Add Operational Guardrails For Payload Size And Retention

**Files:**
- Modify: `development/service-telemetry-dead-letter/config/settings.py`
- Modify: `development/service-telemetry-dead-letter/deadletters/serializers.py`
- Create: `development/service-telemetry-dead-letter/deadletters/management/__init__.py`
- Create: `development/service-telemetry-dead-letter/deadletters/management/commands/__init__.py`
- Create: `development/service-telemetry-dead-letter/deadletters/management/commands/prune_dead_letters.py`
- Create: `development/service-telemetry-dead-letter/deadletters/tests/test_retention.py`

- [ ] **Step 1: Write the failing guardrail tests**

Cover:
- payload over `MAX_PAYLOAD_BYTES` is rejected at ingest API
- `prune_dead_letters` deletes records older than `RETENTION_DAYS`

Run: `python manage.py test deadletters.tests.test_retention -v 2`
Expected: FAIL because config/command does not exist yet

- [ ] **Step 2: Implement payload size validation**

Config:
- `TELEMETRY_DEAD_LETTER_MAX_PAYLOAD_BYTES`

Behavior:
- reject oversized `payload_json` at serializer boundary with `400`

Run: `python manage.py test deadletters.tests.test_retention -v 2`
Expected: payload validation case PASS, prune case still FAIL

- [ ] **Step 3: Implement retention command**

Config:
- `TELEMETRY_DEAD_LETTER_RETENTION_DAYS`

Command:
- `python manage.py prune_dead_letters`

Behavior:
- delete rows with `failed_at` older than configured retention window

Run: `python manage.py test deadletters.tests.test_retention -v 2`
Expected: PASS

### Task 4: Add Listener-To-Dead-Letter Fallback Flow

**Files:**
- Modify: `development/service-telemetry-listener/telemetry_listener/config.py`
- Modify: `development/service-telemetry-listener/telemetry_listener/main.py`
- Create: `development/service-telemetry-listener/telemetry_listener/dead_letter_client.py`
- Modify: `development/service-telemetry-listener/telemetry_listener/runtime.py`
- Modify: `development/service-telemetry-listener/telemetry_listener/parser.py`
- Modify: `development/service-telemetry-listener/telemetry_listener/hub_client.py`
- Create: `development/service-telemetry-listener/tests/test_dead_letter_client.py`
- Modify: `development/service-telemetry-listener/tests/test_runtime.py`
- Modify: `development/service-telemetry-listener/tests/test_config.py`
- Modify: `development/service-telemetry-listener/tests/test_parser.py`

- [ ] **Step 1: Write the failing listener dead-letter tests**

Cover:
- parser returns an explicit parse-failure outcome for malformed payloads that cannot produce a hub ingest envelope
- parse failure writes a dead-letter record through client with `failure_class=parse_error`
- `hub 4xx` writes a dead-letter record
- retry exhausted on `5xx` writes a dead-letter record with `failure_class=hub_5xx_retry_exhausted`
- retry exhausted on timeout writes `failure_class=timeout_retry_exhausted`
- retry exhausted on connection/request failure writes `failure_class=connection_failure_retry_exhausted`
- successful ingest does not write dead-letter

Run: `python -m unittest tests.test_dead_letter_client tests.test_runtime tests.test_config`
Expected: FAIL because dead-letter config/client/runtime integration does not exist yet

- [ ] **Step 2: Implement explicit parser outcome and retry-cause tagging**

Parser changes:
- split parser result into `ParsedTelemetryEnvelope` and `ParseFailure`
- keep `raw_payload` and `received_at` on both outcomes
- make malformed JSON / unsupported top-level payload shapes hit `ParseFailure` instead of silently wrapping into a hub-ingestable envelope

Hub client changes:
- add an explicit retry-cause field or enum to `HubIngestResult`
- map `httpx.TimeoutException` -> `timeout`
- map `httpx.ConnectError` and other `httpx.RequestError` -> `connection_failure`
- map HTTP `5xx` -> `hub_5xx`

Run: `python -m unittest tests.test_parser tests.test_runtime tests.test_hub_client`
Expected: PASS for parser/cause-tagging cases, dead-letter client cases still FAIL

- [ ] **Step 3: Implement dead-letter client and config**

Config:
- `TELEMETRY_DEAD_LETTER_BASE_URL`
- `TELEMETRY_DEAD_LETTER_INGEST_PATH`
- `TELEMETRY_DEAD_LETTER_SOURCE_SERVICE`
- producer-specific internal key config for dead-letter auth
- concrete phase-1 env schema:
  - `TELEMETRY_DEAD_LETTER_KEY_SERVICE_TELEMETRY_LISTENER` required
  - `TELEMETRY_DEAD_LETTER_KEY_SERVICE_TELEMETRY_HUB` optional reserved slot
- phase 1 integration must provision only the listener producer key, while service settings/auth code must support adding more producers later without changing the client contract

Client:
- `POST /ingest/`
- send `source_service` in the ingest body
- classify response into success/drop for listener logging only; exact dead-letter `failure_class` mapping remains a runtime concern

Run: `python -m unittest tests.test_dead_letter_client tests.test_config`
Expected: PASS

- [ ] **Step 4: Implement runtime fallback writes**

Behavior:
- on parse failure: store raw payload with `failure_class=parse_error` using the explicit parser failure outcome from Step 2
- on `hub 4xx`: store dead-letter record immediately
- on retry exhaustion: map tagged retry causes to the exact exhausted class required by the spec
- never collapse timeout / connection failure / hub 5xx into one generic retry-exhausted class
- populate `received_at`, `retry_attempts`, `failure_fingerprint`
- keep this task ahead of deterministic smoke because Task 6 depends on stable failure-class instrumentation

Run: `python -m unittest tests.test_runtime`
Expected: PASS

### Task 5: Wire Dead-Letter Service Into Local Integration

**Files:**
- Modify: `development/integration-local-stack/docker-compose.account-driver-settlement.yml`
- Create: `development/integration-local-stack/infra/env/telemetry-dead-letter.env.example`
- Modify: `development/integration-local-stack/README.md`
- Modify: `development/integration-local-stack/compose/README.md`
- Modify: `development/edge-api-gateway/nginx.conf`
- Modify: `WORKSPACE.md`
- Modify: `repo-map.md`
- Modify: `docs/mappings/current-to-target-repo-map.md`
- Modify: `docs/mappings/repo-responsibility-matrix.md`

- [ ] **Step 1: Add dead-letter DB and service containers**

Compose additions:
- `telemetry-dead-letter-db`
- `telemetry-dead-letter-api`

Expected: the new service can boot in the local integration stack.

- [ ] **Step 2: Add listener env wiring**

Integration env must point listener to dead-letter service with:
- internal base URL
- internal ingest path
- listener `source_service`
- listener producer key

Dead-letter service env must accept a producer-key map or service-specific key settings and populate only the listener key in phase 1.
Prefer service-specific env vars over one global shared key so later producer expansion does not change the auth contract.

Expected: listener can write dead-letter rows through service-to-service HTTP only.

- [ ] **Step 3: Add gateway admin-read route**

Expose only admin-read endpoints through gateway.
Do not route internal ingest through gateway.
Explicitly map:
- `GET /api/telemetry-dead-letters/health/` -> service-local `/health/`
- `GET /api/telemetry-dead-letters/` -> service-local `/`
- `GET /api/telemetry-dead-letters/<uuid>/` -> service-local `/<uuid>/`
Explicitly do not expose:
- `POST /api/telemetry-dead-letters/ingest/`
Normalize trailing-slash handling so the verification path does not depend on implicit `301` redirects.

Expected: dead-letter read follows the same edge model as other admin-only APIs.

- [ ] **Step 4: Move platform docs from `planned-target` to active runtime target**

Update:
- `WORKSPACE.md`
- `repo-map.md`
- `current-to-target-repo-map.md`
- `repo-responsibility-matrix.md`

Expected: platform docs match the new runtime topology.

### Task 6: Add Deterministic Failure Smoke Paths

**Files:**
- Create: `development/service-telemetry-listener/tests/fixtures/malformed_payload.txt`
- Create: `development/integration-local-stack/scripts/publish_malformed_telemetry.sh`
- Possibly Create: `development/integration-local-stack/scripts/publish_retriable_telemetry.sh`
- Modify: `development/integration-local-stack/README.md`

- [ ] **Step 1: Add one malformed deterministic payload**

After Task 4 failure-class tagging is stable, use a payload that deterministically hits one known class.
Preferred path:
- listener-side `parse_error`

Optional second fixture:
- hub-side `4xx`

Expected: local smoke can generate at least one dead-letter row without manual payload crafting.

- [ ] **Step 2: Add a local publish helper for dead-letter generation**

Script should:
- publish the malformed payload to broker
- print which failure path it is expected to hit

Expected: dead-letter flow has one repeatable local smoke path.

### Task 7: Close With Fresh Verification Evidence

**Files:**
- Verify only

- [ ] **Step 1: Run dead-letter repo tests**

Run:
- `python manage.py test deadletters.tests.test_models deadletters.tests.test_api deadletters.tests.test_retention -v 2`

Expected: PASS

- [ ] **Step 2: Re-run listener tests**

Run:
- `python -m unittest tests.test_config tests.test_hub_client tests.test_dead_letter_client tests.test_main tests.test_parser tests.test_runtime`

Expected: PASS

- [ ] **Step 3: Re-run integration compose checks**

Run:
- `docker compose -f development/integration-local-stack/docker-compose.account-driver-settlement.yml config`
- `docker compose -f development/integration-local-stack/docker-compose.account-driver-settlement.yml build telemetry-dead-letter-api telemetry-listener telemetry-hub-api mqtt-broker`

Expected: PASS

- [ ] **Step 4: Re-run stack smoke**

Run:
- `docker compose -f development/integration-local-stack/docker-compose.account-driver-settlement.yml up -d --force-recreate telemetry-dead-letter-api telemetry-listener telemetry-hub-api mqtt-broker gateway`
- `docker compose -f development/integration-local-stack/docker-compose.account-driver-settlement.yml run --rm seed-runner /usr/local/bin/run-seed.sh`
- `./development/integration-local-stack/scripts/publish_malformed_telemetry.sh`

Verify:
- dead-letter health is `ok` through gateway and direct service route
- gateway read routes resolve without trailing-slash redirect surprises
- admin login succeeds and admin `GET /api/telemetry-dead-letters/` returns `200`
- non-admin read is denied with `403`
- gateway `POST /api/telemetry-dead-letters/ingest/` is absent or denied because the internal ingest route is not exposed externally
- `GET /api/telemetry-dead-letters/` returns at least one row
- latest dead-letter row has expected `failure_class`
- listener logs show dead-letter write success

Expected: fresh end-to-end evidence proves MQTT -> listener -> dead-letter flow works.

## Out Of Scope For This Batch

- automatic replay API
- replay status workflow
- admin dead-letter UI
- broker-native DLQ orchestration
- body signing / nonce / replay mitigation
- hub-originated dead-letter writes

## Completion Criteria

- `service-telemetry-dead-letter` exists as an independent runtime repo
- listener writes failure payloads to dead-letter service through internal HTTP only
- dead-letter rows are append-only and preserve `received_at`, `retry_attempts`, `failure_fingerprint`
- admin-only read endpoints work through gateway
- retention and payload size guardrails are implemented
- fresh local smoke proves at least one broker-driven failure lands in dead-letter storage
