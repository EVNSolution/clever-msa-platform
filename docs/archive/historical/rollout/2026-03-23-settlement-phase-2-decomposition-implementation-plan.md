# Settlement Phase 2 Decomposition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `service-settlement-payroll`를 새 write owner로 도입하고, `service-settlement-operations-view`를 read-only 서비스로 전환하며, settlement route와 consumer를 hard cut topology로 재배치한다.

**Architecture:** 현재 `service-settlement-operations-view`에 들어 있는 placeholder `SettlementRun` / `SettlementItem` CRUD와 seed ownership을 새 `service-settlement-payroll` runtime으로 이동한다. `service-settlement-operations-view`는 sqlite 기반 read-model runtime으로 재구성해 `service-settlement-payroll`을 fan-out으로 읽고, gateway는 `/api/settlements/`와 `/api/settlement-ops/`를 분리한다.

**Tech Stack:** Django/DRF, Postgres, sqlite, internal HTTP fan-out, Docker Compose, Nginx gateway, seed-runner, Markdown

---

### Task 1: Bootstrap `service-settlement-payroll` As The New Write Owner

**Files:**
- Create: `development/service-settlement-payroll/manage.py`
- Create: `development/service-settlement-payroll/config/__init__.py`
- Create: `development/service-settlement-payroll/config/settings.py`
- Create: `development/service-settlement-payroll/config/urls.py`
- Create: `development/service-settlement-payroll/config/asgi.py`
- Create: `development/service-settlement-payroll/config/wsgi.py`
- Create: `development/service-settlement-payroll/requirements.txt`
- Create: `development/service-settlement-payroll/Dockerfile`
- Create: `development/service-settlement-payroll/entrypoint.sh`
- Create: `development/service-settlement-payroll/.env.example`
- Create: `development/service-settlement-payroll/README.md`
- Create: `development/service-settlement-payroll/settlements/__init__.py`
- Create: `development/service-settlement-payroll/settlements/apps.py`
- Create: `development/service-settlement-payroll/settlements/authentication.py`
- Create: `development/service-settlement-payroll/settlements/exceptions.py`
- Create: `development/service-settlement-payroll/settlements/models.py`
- Create: `development/service-settlement-payroll/settlements/permissions.py`
- Create: `development/service-settlement-payroll/settlements/serializers.py`
- Create: `development/service-settlement-payroll/settlements/urls.py`
- Create: `development/service-settlement-payroll/settlements/views.py`
- Create: `development/service-settlement-payroll/settlements/migrations/0001_initial.py`
- Create: `development/service-settlement-payroll/settlements/migrations/__init__.py`
- Create: `development/service-settlement-payroll/settlements/management/__init__.py`
- Create: `development/service-settlement-payroll/settlements/management/commands/__init__.py`
- Create: `development/service-settlement-payroll/settlements/management/commands/seed_settlements.py`
- Create: `development/service-settlement-payroll/settlements/tests/__init__.py`
- Create: `development/service-settlement-payroll/settlements/tests/test_settlement_api.py`
- Create: `development/service-settlement-payroll/settlements/tests/test_seed_settlements_command.py`

- [ ] **Step 1: Create the repo scaffold by cloning the current placeholder runtime shape**

Start from the current `development/service-settlement-operations-view/` runtime structure.
Keep the internal Django app package name `settlements` in this phase to avoid unnecessary churn.

Expected: the new repo can boot independently with the same placeholder write behavior.

- [ ] **Step 2: Copy the current write-side tests into the new repo first**

Move the existing CRUD and seed command expectations into:
- `development/service-settlement-payroll/settlements/tests/test_settlement_api.py`
- `development/service-settlement-payroll/settlements/tests/test_seed_settlements_command.py`

Expected: the new repo expresses the current write contract before code is copied.

- [ ] **Step 3: Run the payroll repo tests to verify the empty scaffold fails**

Run:
`cd development/service-settlement-payroll && python3.12 -m venv .venv312 && ./.venv312/bin/pip install -r requirements.txt && ./.venv312/bin/python manage.py test settlements.tests`

Expected: failure because the runtime is not fully wired yet.

- [ ] **Step 4: Copy the current write implementation into payroll**

Populate models, serializers, auth, permissions, views, URLs, migrations, and `seed_settlements` from the current placeholder runtime.
Keep Postgres as the source-of-truth database for payroll.

Expected: `SettlementRun`, `SettlementItem`, admin write, authenticated read, and seed command all live in payroll.

- [ ] **Step 5: Rewrite repo-local docs and env example for payroll ownership**

Document that this repo owns:
- settlement run/item writes
- deduction/incentive/payout status later
- internal seed ownership for bootstrap data

Document that it does not own:
- settlement policy registry
- delivery source truth
- read-model operations projection

Expected: repo-local docs match the approved boundary.

- [ ] **Step 6: Re-run payroll repo tests**

Run:
`cd development/service-settlement-payroll && ./.venv312/bin/python manage.py test settlements.tests`

Expected: CRUD and seed tests pass in the new repo.

### Task 2: Convert `service-settlement-operations-view` Into A Read-Only Fan-Out Service

**Files:**
- Modify: `development/service-settlement-operations-view/config/settings.py`
- Modify: `development/service-settlement-operations-view/README.md`
- Modify: `development/service-settlement-operations-view/requirements.txt`
- Modify: `development/service-settlement-operations-view/settlements/permissions.py`
- Modify: `development/service-settlement-operations-view/settlements/serializers.py`
- Modify: `development/service-settlement-operations-view/settlements/urls.py`
- Modify: `development/service-settlement-operations-view/settlements/views.py`
- Create: `development/service-settlement-operations-view/settlements/services/__init__.py`
- Create: `development/service-settlement-operations-view/settlements/services/source_clients.py`
- Create: `development/service-settlement-operations-view/settlements/tests/test_source_clients.py`
- Modify: `development/service-settlement-operations-view/settlements/tests/test_settlement_api.py`
- Delete: `development/service-settlement-operations-view/settlements/models.py`
- Delete: `development/service-settlement-operations-view/settlements/migrations/0001_initial.py`
- Delete: `development/service-settlement-operations-view/settlements/tests/test_seed_settlements_command.py`
- Delete: `development/service-settlement-operations-view/settlements/management/commands/seed_settlements.py`

- [ ] **Step 1: Write failing source-client tests for payroll fan-out**

Add tests that cover:
- URL construction for `/runs/` and `/items/`
- authorization forwarding
- 404 / invalid JSON / upstream 5xx mapping

Expected: read-service source access is locked before refactor.

- [ ] **Step 2: Switch the operations-view settings to read-model defaults**

Change:
- database from Postgres to sqlite
- env var from settlement write naming to `SETTLEMENT_PAYROLL_BASE_URL`
- default permission to authenticated read-only behavior

Expected: the service no longer depends on owned settlement tables.

- [ ] **Step 3: Replace model-backed views with fan-out read views**

Keep `health/`, `runs/`, and `items/` externally available from this repo, but make them read-only.
`POST`, `PATCH`, `DELETE` must no longer exist here.

Expected: `service-settlement-operations-view` becomes a pure read API.

- [ ] **Step 4: Remove local write ownership artifacts**

Delete local settlement models, migration, and seed command from ops-view.
If any serializer still assumes local ORM validation, replace it with plain serializer or upstream-shaped serializer logic.

Expected: the repo no longer has a local write data model.

- [ ] **Step 5: Rewrite the ops-view README**

Document:
- read-only role
- payroll as upstream write owner
- `/api/settlement-ops/` external prefix
- no write ownership

Expected: repo-local docs stop describing placeholder write ownership.

- [ ] **Step 6: Re-run ops-view tests**

Run:
`cd development/service-settlement-operations-view && python3.12 -m venv .venv312 && ./.venv312/bin/pip install -r requirements.txt && ./.venv312/bin/python manage.py test settlements.tests`

Expected: source-client and read-only API tests pass, and removed write tests are replaced by read-only assertions.

### Task 3: Repoint Read Consumers To `settlement-ops`

**Files:**
- Modify: `development/service-driver-operations-view/config/settings.py`
- Modify: `development/service-driver-operations-view/driver360/services/source_clients.py`
- Modify: `development/service-driver-operations-view/README.md`
- Modify: `development/service-driver-operations-view/driver360/tests/test_driver_summary_service.py`
- Modify: `development/integration-local-stack/infra/env/driver-360.env.example`

- [ ] **Step 1: Rename the consumer env variable to read-side naming**

Change:
- `SETTLEMENT_BASE_URL` -> `SETTLEMENT_OPS_BASE_URL`

Expected: consumer naming matches the new owner split.

- [ ] **Step 2: Update source clients to read from `settlement-ops`**

`driver-360` should continue to call `/runs/` and `/items/`, but now against the ops-view base URL.

Expected: no read consumer depends directly on payroll.

- [ ] **Step 3: Re-run driver-360 tests**

Run:
`cd development/service-driver-operations-view && python3.12 -m venv .venv312 && ./.venv312/bin/pip install -r requirements.txt && ./.venv312/bin/python manage.py test driver360.tests`

Expected: driver summary tests still pass with the renamed upstream setting.

### Task 4: Hard-Cut Compose, Gateway, And Seed Wiring

**Files:**
- Modify: `development/integration-local-stack/docker-compose.account-driver-settlement.yml`
- Modify: `development/edge-api-gateway/nginx.conf`
- Create: `development/integration-local-stack/infra/env/settlement-payroll.env.example`
- Create: `development/integration-local-stack/infra/env/settlement-ops.env.example`
- Modify: `development/integration-local-stack/infra/docker/seed-runner/Dockerfile`
- Modify: `development/integration-local-stack/infra/docker/seed-runner/run-seed.sh`
- Modify: `development/integration-local-stack/README.md`
- Modify: `development/integration-local-stack/compose/README.md`

- [ ] **Step 1: Replace the single settlement runtime with two services**

In compose:
- rename existing `settlement-api` to `settlement-ops-api`
- add new `settlement-payroll-api`
- keep Postgres attached to payroll
- remove Postgres dependency from ops-view

Expected: compose topology reflects read/write separation.

- [ ] **Step 2: Split gateway prefixes**

Add / update routes:
- `/api/settlements/` -> `settlement-payroll-api`
- `/api/settlement-ops/` -> `settlement-ops-api`

Expected: read and write are split at the edge.

- [ ] **Step 3: Move seed ownership to payroll**

Update seed-runner so:
- requirements are installed from payroll repo
- runtime source is copied from payroll repo
- `wait_for_health` and `run_manage` target `settlement-payroll-api`

Expected: bootstrap data is seeded through the write owner only.

- [ ] **Step 4: Update integration docs**

Document:
- new service names
- new route split
- read consumer env naming

Expected: local stack docs match runtime wiring.

### Task 5: Update Platform Indexes And Boundary Maps

**Files:**
- Modify: `WORKSPACE.md`
- Modify: `repo-map.md`
- Modify: `docs/mappings/current-to-target-repo-map.md`
- Modify: `docs/mappings/repo-responsibility-matrix.md`
- Modify: `development/service-settlement-registry/README.md`
- Modify: `development/service-delivery-record/README.md`
- Modify: `development/service-settlement-operations-view/README.md`
- Create: `development/service-settlement-payroll/README.md`

- [ ] **Step 1: Add `service-settlement-payroll` to the platform indexes**

Reflect it as a new active runtime repo and write owner.

Expected: the repo exists in all platform indexes and no longer appears as unnamed future work.

- [ ] **Step 2: Rewrite settlement boundary notes from 3-axis to 4-axis**

Document:
- registry = rules
- delivery-record = source input
- payroll = result write owner
- operations-view = read-only

Expected: the old “placeholder CRUD in ops-view” wording disappears.

- [ ] **Step 3: Tighten the shell repo READMEs**

Clarify that:
- `service-settlement-registry` never owns runs/items
- `service-delivery-record` never owns payout/result truth

Expected: naming drift is blocked at the README level too.

### Task 6: Fresh Verification Evidence

**Files:**
- Verify only

- [ ] **Step 1: Run repo-local tests**

Run:
- `cd development/service-settlement-payroll && ./.venv312/bin/python manage.py test settlements.tests`
- `cd development/service-settlement-operations-view && ./.venv312/bin/python manage.py test settlements.tests`
- `cd development/service-driver-operations-view && ./.venv312/bin/python manage.py test driver360.tests`

Expected: payroll, ops-view, and read consumer tests all pass.

- [ ] **Step 2: Re-run compose checks**

Run:
- `docker compose -f development/integration-local-stack/docker-compose.account-driver-settlement.yml config`
- `docker compose -f development/integration-local-stack/docker-compose.account-driver-settlement.yml build settlement-payroll-api settlement-ops-api driver-360-api gateway`

Expected: route split and service build succeed.

- [ ] **Step 3: Bring up the split settlement topology and re-seed**

Run:
- `docker compose -f development/integration-local-stack/docker-compose.account-driver-settlement.yml up -d settlement-payroll-api settlement-ops-api account-auth-api driver-profile-api organization-master-api driver-360-api gateway`
- `docker compose -f development/integration-local-stack/docker-compose.account-driver-settlement.yml run --rm seed-runner /usr/local/bin/run-seed.sh`

Expected: payroll is the seeded write owner and ops-view is reachable.

- [ ] **Step 4: Run gateway smoke checks**

Verify:
- `GET /api/settlements/health/` returns `200`
- admin `POST /api/settlements/runs/` returns `201`
- `GET /api/settlement-ops/health/` returns `200`
- `GET /api/settlement-ops/runs/` returns `200`
- `POST /api/settlement-ops/runs/` no longer succeeds
- `GET /api/driver-360/drivers/<seeded-driver-id>/summary/` still returns latest settlement fields

Expected: write and read routes are separated and the downstream consumer still works.

- [ ] **Step 5: Check for stale settlement naming**

Run a final `rg` sweep across touched docs and integration files for stale phrases such as:
- `settlement-api` when it should be split
- placeholder CRUD in ops-view
- `SETTLEMENT_BASE_URL` in read consumers

Expected: no stale phase-1 wording remains in the touched scope.
