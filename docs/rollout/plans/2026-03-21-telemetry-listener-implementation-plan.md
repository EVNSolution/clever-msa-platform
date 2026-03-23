# Telemetry Listener Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `service-telemetry-listener`를 별도 runtime repo와 컨테이너로 만들고, MQTT broker에서 수신한 메시지를 `service-telemetry-hub`의 ingest API로 안전하게 전달한다.

**Architecture:** 이번 배치는 Django가 아니라 얇은 Python worker로 구현한다. listener는 MQTT subscribe, payload parsing, retry, hub ingest 호출만 맡고 DB를 직접 쓰지 않는다. `service-telemetry-hub`는 여전히 raw/timeseries/snapshot/diagnostic 정본을 소유하며, listener는 내부 shared ingest key로 hub API만 호출한다.

**Tech Stack:** Python worker, `paho-mqtt`, `httpx`, Docker Compose, Mosquitto broker, Django/DRF ingest API, Nginx-free internal service-to-service HTTP

---

### Task 1: Create `service-telemetry-listener` Runtime Repo

**Files:**
- Create: `development/service-telemetry-listener/README.md`
- Create: `development/service-telemetry-listener/requirements.txt`
- Create: `development/service-telemetry-listener/Dockerfile`
- Create: `development/service-telemetry-listener/entrypoint.sh`
- Create: `development/service-telemetry-listener/telemetry_listener/__init__.py`
- Create: `development/service-telemetry-listener/telemetry_listener/main.py`
- Create: `development/service-telemetry-listener/telemetry_listener/config.py`
- Create: `development/service-telemetry-listener/telemetry_listener/logging.py`
- Create: `development/service-telemetry-listener/tests/__init__.py`

- [ ] **Step 1: Scaffold the worker repo layout**

Create a focused worker repo, not a Django service:
- runtime package `telemetry_listener/`
- entrypoint script
- test package

Expected: the repo can boot as an independent stateless worker container.

- [ ] **Step 2: Write repo-local README**

Document:
- current role: MQTT ingress worker
- future role: retry/dead-letter/topic routing expansion
- non-owned concerns: DB writes, timeseries normalization, vehicle/terminal master writes
- dependency on `service-telemetry-hub`

Expected: the repo role is obvious from the entrypoint.

### Task 2: Implement Config, Envelope Parsing, And Source Identity Rules

**Files:**
- Create: `development/service-telemetry-listener/telemetry_listener/config.py`
- Create: `development/service-telemetry-listener/telemetry_listener/parser.py`
- Create: `development/service-telemetry-listener/tests/test_config.py`
- Create: `development/service-telemetry-listener/tests/test_parser.py`

- [ ] **Step 1: Implement environment-based config**

Add config for:
- MQTT host, port, username, password
- topic list
- client id
- hub base URL
- ingest shared key
- retry count and retry backoff

Expected: runtime configuration is explicit and container-friendly.

- [ ] **Step 2: Implement message envelope parser**

Parse:
- topic
- received timestamp
- raw payload JSON/string
- optional `terminal_id`
- optional `vehicle_id`
- optional `message_type`

Expected: parser always produces a hub ingest envelope, even when source identity is partially missing.

- [ ] **Step 3: Encode `raw first` behavior in tests**

Add tests for:
- full identity available
- only `terminal_id` available
- only `vehicle_id` available
- neither available
- malformed-but-storable payload summary path

Expected: identity resolution failure never prevents raw ingest request construction.

### Task 3: Implement Hub Ingest Client And Retry Classification

**Files:**
- Create: `development/service-telemetry-listener/telemetry_listener/hub_client.py`
- Create: `development/service-telemetry-listener/telemetry_listener/exceptions.py`
- Create: `development/service-telemetry-listener/tests/test_hub_client.py`
- Modify: `development/service-telemetry-hub/config/settings.py`
- Modify: `development/service-telemetry-hub/telemetry/views.py`
- Modify: `development/service-telemetry-hub/telemetry/tests/test_api.py`
- Modify: `development/service-telemetry-hub/.env.example`

- [ ] **Step 1: Add internal ingest authentication between listener and hub**

Use a shared internal secret header, for example:
- `X-Telemetry-Ingest-Key`

Expected: listener can call hub ingest without relying on end-user JWTs.

- [ ] **Step 2: Implement hub client**

Add a small HTTP client that:
- posts to `/api/telemetry/ingest/raw/`
- sends the internal ingest key
- returns a structured result for `2xx`, `4xx`, `5xx`, timeout, and connection failure

Expected: retry logic is driven by explicit response classification, not ad hoc exception handling.

- [ ] **Step 3: Add retry classification tests**

Cover:
- `2xx` success
- `4xx` drop
- `5xx` retry
- timeout retry
- connection failure retry

Expected: listener and hub-side auth boundary are both locked down by tests.

### Task 4: Implement MQTT Worker Runtime

**Files:**
- Create: `development/service-telemetry-listener/telemetry_listener/runtime.py`
- Create: `development/service-telemetry-listener/telemetry_listener/mqtt_client.py`
- Create: `development/service-telemetry-listener/tests/test_runtime.py`
- Modify: `development/service-telemetry-listener/telemetry_listener/main.py`

- [ ] **Step 1: Add MQTT subscribe loop**

Implement:
- broker connect
- topic subscribe
- reconnect handling
- message callback

Expected: the worker can stay attached to the broker as a long-running container.

- [ ] **Step 2: Forward messages through parser and hub client**

Per message:
- parse envelope
- call hub ingest
- classify result
- log success/retry/drop

Expected: runtime flow matches the approved listener boundary exactly.

- [ ] **Step 3: Add worker tests with fake MQTT and fake hub client**

Verify:
- subscribe called on startup
- successful message path
- retry-worthy failure path
- drop-on-4xx path

Expected: worker behavior is testable without a real broker in repo-local tests.

### Task 5: Wire Listener And Broker Into Local Integration

**Files:**
- Modify: `development/integration-local-stack/docker-compose.account-driver-settlement.yml`
- Create: `development/integration-local-stack/infra/env/telemetry-listener.env.example`
- Create: `development/integration-local-stack/infra/mqtt/mosquitto.conf`
- Modify: `development/integration-local-stack/README.md`
- Modify: `development/integration-local-stack/compose/README.md`
- Modify: `WORKSPACE.md`
- Modify: `repo-map.md`
- Modify: `docs/mappings/current-to-target-repo-map.md`
- Modify: `docs/mappings/repo-responsibility-matrix.md`

- [ ] **Step 1: Add `mqtt-broker` container**

Use a simple local broker, such as Mosquitto, with local-only development config.

Expected: the integration stack has a deterministic MQTT source for listener verification.

- [ ] **Step 2: Add `service-telemetry-listener` container**

Connect it to:
- `mqtt-broker`
- `service-telemetry-hub`

Expected: listener boots as a sibling runtime repo under `integration-local-stack`.

- [ ] **Step 3: Register the new repo in platform docs**

Set:
- `service-telemetry-listener` as `migrated-target`
- category `service`
- owns MQTT ingress worker only

Expected: platform docs and actual runtime topology stay aligned.

### Task 6: Add Deterministic Local Publish Path For Verification

**Files:**
- Create: `development/service-telemetry-listener/tests/fixtures/sample_payload.json`
- Optionally Create: `development/integration-local-stack/scripts/publish_sample_telemetry.sh`
- Modify: `development/integration-local-stack/README.md`

- [ ] **Step 1: Add one deterministic sample payload**

Use a payload that can produce:
- raw ingest row
- latest location snapshot
- one diagnostic event

Expected: smoke can prove end-to-end ingestion without hand-crafted terminal commands every time.

- [ ] **Step 2: Add a local publish helper**

Publish through the local broker to a known topic using either:
- broker container client
- or a small helper script

Expected: integration smoke has one repeatable publish path.

### Task 7: Close With Fresh Verification Evidence

**Files:**
- Verify only

- [ ] **Step 1: Run repo-local listener tests**

Run targeted tests for:
- config
- parser
- hub client
- runtime

Expected: ingress worker behavior is covered without depending on Docker or the broker.

- [ ] **Step 2: Re-run hub tests for internal ingest auth**

Run targeted hub API tests covering:
- valid internal ingest key
- invalid internal ingest key
- existing ingest behavior still green

Expected: listener introduction does not weaken hub ingest boundaries.

- [ ] **Step 3: Re-run integration compose checks**

Run:
- `docker compose -f development/integration-local-stack/docker-compose.account-driver-settlement.yml config`
- `docker compose -f development/integration-local-stack/docker-compose.account-driver-settlement.yml build telemetry-hub-api telemetry-listener mqtt-broker`

Expected: the new repo and broker resolve cleanly in the integration shell.

- [ ] **Step 4: Re-run stack smoke**

Verify:
- broker and listener boot
- sample publish succeeds
- `/api/telemetry/health/` returns `ok`
- latest location updates through broker-driven ingest
- latest diagnostics updates through broker-driven ingest
- `/api/vehicle-ops/vehicles/{vehicle_id}/` reflects the new telemetry state

Expected: fresh end-to-end evidence proves MQTT -> listener -> hub -> vehicle-ops flow works.

## Out Of Scope For This Batch

- RabbitMQ bridge
- dead-letter queue implementation
- replay pipeline
- listener-side local persistence
- analytics
- long-range timeseries query API
- operator/admin telemetry pages
- terminal/vehicle/assignment master writes

## Completion Criteria

- `service-telemetry-listener` exists as an independent runtime repo
- listener talks to `service-telemetry-hub` through HTTP ingest only
- raw payload forwarding is attempted even when source identity is incomplete
- retry/drop behavior is deterministic and tested
- local integration stack includes a real broker and listener container
- broker-driven messages appear in `service-telemetry-hub` latest APIs and downstream `service-vehicle-operations-view`
