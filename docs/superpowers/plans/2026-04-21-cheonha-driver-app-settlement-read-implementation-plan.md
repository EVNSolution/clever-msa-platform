# Cheonha Driver App Settlement Read Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the Track A backend surface for driver day-level settlement reads and the driver `me` settlement calendar facade without collapsing settlement read/write boundaries.

**Architecture:** `service-settlement-payroll` remains the only owner of settlement amount derivation. Track A first adds a payroll-owned day-level settlement source surface that uses the same calculation path as run generation. `service-settlement-operations-view` then consumes that payroll truth and enriches it with `daily_delivery_input_snapshot_id` from `service-delivery-record` to publish the external `/api/settlement-ops/drivers/<driver_id>/daily-settlements/` contract. `service-driver-operations-view` stays a session-oriented consumer that resolves the active `driver_account_link`, preserves the existing `needs_link` behavior, and wraps the `settlement-ops` response under `GET /api/driver-ops/me/settlement-calendar/`.

**Tech Stack:** Django, Django REST Framework, drf-spectacular, unittest, existing source-client fan-out pattern, edge public OpenAPI build/parity scripts.

---

## File Map

### Canonical Docs

- Create: `docs/contracts/22-driver-app-settlement-read-contract.md`
- Modify: `docs/contracts/README.md`
- Modify: `docs/contracts/21-design-system-and-surface-rules.md`
- Modify: `docs/superpowers/specs/2026-04-21-cheonha-driver-app-minimum-design.md`
- Modify: `docs/superpowers/plans/2026-04-21-cheonha-driver-app-settlement-read-backend-request-estimate.md`

### `service-settlement-payroll`

- Modify: `development/service-settlement-payroll/settlements/urls.py`
- Modify: `development/service-settlement-payroll/settlements/views.py`
- Modify: `development/service-settlement-payroll/settlements/serializers.py`
- Create: `development/service-settlement-payroll/settlements/services/daily_settlement_source_service.py`
- Modify: `development/service-settlement-payroll/settlements/tests/test_settlement_api.py`
- Create: `development/service-settlement-payroll/settlements/tests/test_daily_settlement_source_service.py`
- Modify: `development/service-settlement-payroll/README.md`

### `service-settlement-operations-view`

- Modify: `development/service-settlement-operations-view/settlements/urls.py`
- Modify: `development/service-settlement-operations-view/settlements/views.py`
- Modify: `development/service-settlement-operations-view/settlements/serializers.py`
- Modify: `development/service-settlement-operations-view/settlements/services/source_clients.py`
- Modify: `development/service-settlement-operations-view/settlements/services/__init__.py`
- Create: `development/service-settlement-operations-view/settlements/services/daily_settlement_service.py`
- Modify: `development/service-settlement-operations-view/settlements/tests/test_source_clients.py`
- Modify: `development/service-settlement-operations-view/settlements/tests/test_settlement_api.py`
- Create: `development/service-settlement-operations-view/settlements/tests/test_daily_settlement_service.py`
- Modify: `development/service-settlement-operations-view/README.md`

### `service-driver-operations-view`

- Modify: `development/service-driver-operations-view/driver360/urls.py`
- Modify: `development/service-driver-operations-view/driver360/views.py`
- Modify: `development/service-driver-operations-view/driver360/serializers.py`
- Modify: `development/service-driver-operations-view/driver360/services/source_clients.py`
- Create: `development/service-driver-operations-view/driver360/services/settlement_calendar_service.py`
- Modify: `development/service-driver-operations-view/driver360/tests/test_source_clients.py`
- Create: `development/service-driver-operations-view/driver360/tests/test_settlement_calendar.py`
- Modify: `development/service-driver-operations-view/README.md`

### `edge-api-gateway`

- Modify: `development/edge-api-gateway/public-api-docs/openapi.yaml`
- Modify: `development/edge-api-gateway/tests/fixtures/pre-cutover-public-openapi.yaml`

## Contract Clarification Gate

Track A must not proceed past Task 1 until the following are explicitly locked in the canonical contract:

1. `service-settlement-payroll` is the only owner of settlement amount calculation.
2. `service-settlement-operations-view` must not re-derive `total_amount` from `delivery-record`, `settlement-registry`, `dispatch-registry`, and `attendance-registry`.
3. `service-settlement-operations-view` may enrich payroll truth with `daily_delivery_input_snapshot_id`, but that field remains `service-delivery-record` truth.
4. `unit_price` is fixed as the payroll-owned per-box settlement price.
5. Each day row `total_amount` is `box_count * unit_price`.
6. `summary.total_amount` is the sum of day-level `total_amount` values in the requested window.
7. `settlement_type` remains a day classification field and does not introduce a second amount formula in Track A.
8. If the payroll day-level source is unavailable, `settlement-ops` returns the existing dependency error shape.
9. If `delivery-record` snapshot enrichment is unavailable, `settlement-ops` also returns the dependency error shape in v1 rather than a partial response without `daily_delivery_input_snapshot_id`.
10. No new upstream env keys are needed in `service-settlement-operations-view`. `service-settlement-payroll` already has the necessary upstream base URLs in `config/settings.py`, and `service-settlement-operations-view` continues to use only `SETTLEMENT_PAYROLL_BASE_URL` and `DELIVERY_RECORD_BASE_URL`.

### Task 1: Lock The Canonical Track A Contract

**Files:**
- Create: `docs/contracts/22-driver-app-settlement-read-contract.md`
- Modify: `docs/contracts/README.md`
- Modify: `docs/contracts/21-design-system-and-surface-rules.md`
- Modify: `docs/superpowers/specs/2026-04-21-cheonha-driver-app-minimum-design.md`
- Modify: `docs/superpowers/plans/2026-04-21-cheonha-driver-app-settlement-read-backend-request-estimate.md`

- [x] **Step 1: Write the canonical settlement read contract with the correct ownership chain**

The new contract doc must explicitly separate:

1. `GET /api/driver-ops/me/work-logs/`
2. payroll-owned upstream daily settlement truth
3. `GET /api/settlement-ops/drivers/<driver_id>/daily-settlements/`
4. `GET /api/driver-ops/me/settlement-calendar/`

The doc must state the ownership chain in plain language:

```text
service-settlement-payroll (amount truth)
  -> service-settlement-operations-view (external read owner + snapshot ref enrichment)
  -> service-driver-operations-view (session-based me facade)
```

- [x] **Step 2: Lock the amount field semantics before any code task**

Do not leave the amount fields partially defined.

Record all of the following in `docs/contracts/22-driver-app-settlement-read-contract.md`:

1. `unit_price` is the payroll-owned per-box settlement price
2. `total_amount` is `box_count * unit_price`
3. `summary.total_amount` is the sum of all day-level `total_amount`
4. `settlement_type` is classification only in Track A v1

If the final contract differs from the current estimate doc example, update `docs/superpowers/plans/2026-04-21-cheonha-driver-app-settlement-read-backend-request-estimate.md` in the same task.

- [x] **Step 3: Lock dependency failure rules in the contract doc**

Write down the exact rules:

1. payroll daily source outage => `503` dependency error
2. delivery snapshot enrichment outage => `503` dependency error
3. `needs_link` exists only at the `driver-ops me` facade layer
4. `driver_id` existence is not revalidated by settlement read services

- [x] **Step 4: Link the contract from the existing driver-app docs**

Update:

- `docs/contracts/README.md`
- `docs/contracts/21-design-system-and-surface-rules.md`
- `docs/superpowers/specs/2026-04-21-cheonha-driver-app-minimum-design.md`

Expected result:

1. `work-logs` remains a non-settlement endpoint
2. the driver app docs now reference the new canonical Track A contract
3. the contract no longer depends on the temporary overlay values for field meaning

- [x] **Step 5: Self-check the boundary language before code**

Before implementing, confirm all of the following are true:

1. `service-settlement-payroll` owns amount truth
2. `service-settlement-operations-view` is a read owner, not a second calculator
3. `service-driver-operations-view` is a `me` facade only
4. no inquiry write/thread ownership leaks into Track A
5. no service repo imports another service repo directly

- [ ] **Step 6: Commit the contract lock**

```bash
git add docs/contracts/22-driver-app-settlement-read-contract.md docs/contracts/README.md docs/contracts/21-design-system-and-surface-rules.md docs/superpowers/specs/2026-04-21-cheonha-driver-app-minimum-design.md docs/superpowers/plans/2026-04-21-cheonha-driver-app-settlement-read-backend-request-estimate.md
git commit -m "docs: lock driver app settlement read contract"
```

### Task 2: Add Payroll-Owned Day-Level Settlement Truth

**Files:**
- Modify: `development/service-settlement-payroll/settlements/urls.py`
- Modify: `development/service-settlement-payroll/settlements/views.py`
- Modify: `development/service-settlement-payroll/settlements/serializers.py`
- Create: `development/service-settlement-payroll/settlements/services/daily_settlement_source_service.py`
- Modify: `development/service-settlement-payroll/settlements/tests/test_settlement_api.py`
- Create: `development/service-settlement-payroll/settlements/tests/test_daily_settlement_source_service.py`
- Modify: `development/service-settlement-payroll/README.md`

- [x] **Step 1: Write failing unit tests for a shared payroll derivation service**

Create `development/service-settlement-payroll/settlements/tests/test_daily_settlement_source_service.py`.

The new service must be the single place that derives day-level settlement rows from the payroll-owned rule path already used by run generation.

Cover at least:

1. regular day amount derivation
2. special day classification with the same amount formula
3. non-worked attendance exclusion
4. empty result window
5. stable sort by `service_date ASC`

Representative test:

```python
def test_build_daily_rows_uses_box_count_times_unit_price_formula(self):
    service = DailySettlementSourceService(source_clients=FakeSourceClients(...))
    payload = service.build_driver_daily_settlements(
        driver_id="10000000-0000-0000-0000-000000000001",
        date_from="2026-04-01",
        date_to="2026-04-30",
        authorization="Bearer token",
    )

    self.assertEqual(payload["summary"]["special_days"], 1)
    self.assertEqual(payload["results"][0]["unit_price"], "4700.00")
    self.assertEqual(payload["results"][0]["total_amount"], "56400.00")
```

- [x] **Step 2: Extract the current run-generation math into the shared service**

Refactor `development/service-settlement-payroll/settlements/views.py` so the current settlement item generation path uses the new service instead of open-coding the derivation logic inside `SettlementRunViewSet._generate_items`.

Required outcome:

1. run creation still creates `SettlementItem` rows from the shared derivation result
2. the new day-level source view uses the same service and formula
3. Track A no longer requires duplicating the calculator in `settlement-ops`

- [x] **Step 3: Write failing API tests for the payroll upstream source**

Extend `development/service-settlement-payroll/settlements/tests/test_settlement_api.py` for a payroll-owned driver daily read path.

Target route:

```python
response = self.client.get(
    "/drivers/10000000-0000-0000-0000-000000000001/daily-settlements/?date_from=2026-04-01&date_to=2026-04-30"
)
```

Cover at least:

1. authenticated success
2. date validation
3. empty window
4. dependency outage
5. response shape matches the Task 1 amount contract

- [x] **Step 4: Implement the payroll upstream source view and schema policy**

Add the payroll route and view in:

- `development/service-settlement-payroll/settlements/urls.py`
- `development/service-settlement-payroll/settlements/views.py`

Important rule:

1. if this payroll source surface is upstream-only and should not appear in the public edge contract, mark it schema-excluded
2. the external driver-app contract still belongs to `settlement-ops`

- [x] **Step 5: Run the focused payroll test suite**

Run:

```bash
cd development/service-settlement-payroll
. .venv/bin/activate
python manage.py test settlements.tests.test_daily_settlement_source_service settlements.tests.test_settlement_api -v 2
```

Expected:

1. run creation remains green
2. the new day-level source path passes
3. no second derivation path exists outside payroll

- [x] **Step 6: Update the payroll README**

Update `development/service-settlement-payroll/README.md` to state:

1. payroll still owns settlement amount truth
2. the new day-level source is for upstream read ownership support
3. the public driver-app contract is still exposed by `service-settlement-operations-view`

- [ ] **Step 7: Commit the payroll slice**

```bash
git add development/service-settlement-payroll
git commit -m "feat: add payroll daily settlement source"
```

### Task 3: Add External Driver Daily Settlement Read To `service-settlement-operations-view`

**Files:**
- Modify: `development/service-settlement-operations-view/settlements/urls.py`
- Modify: `development/service-settlement-operations-view/settlements/views.py`
- Modify: `development/service-settlement-operations-view/settlements/serializers.py`
- Modify: `development/service-settlement-operations-view/settlements/services/source_clients.py`
- Modify: `development/service-settlement-operations-view/settlements/services/__init__.py`
- Create: `development/service-settlement-operations-view/settlements/services/daily_settlement_service.py`
- Modify: `development/service-settlement-operations-view/settlements/tests/test_source_clients.py`
- Modify: `development/service-settlement-operations-view/settlements/tests/test_settlement_api.py`
- Create: `development/service-settlement-operations-view/settlements/tests/test_daily_settlement_service.py`
- Modify: `development/service-settlement-operations-view/README.md`

- [x] **Step 1: Write failing source-client tests for payroll truth and snapshot enrichment**

Extend `development/service-settlement-operations-view/settlements/tests/test_source_clients.py` with URL assertions for:

1. payroll daily settlement source
2. delivery snapshot lookup by `driver_id` and date range

Representative URLs:

```python
"http://settlement-payroll-api:8000/drivers/10000000-0000-0000-0000-000000000001/daily-settlements/?date_from=2026-04-01&date_to=2026-04-30"
"http://delivery-record-api:8000/daily-snapshots/?driver_id=10000000-0000-0000-0000-000000000001"
```

- [x] **Step 2: Write failing merge-service tests for snapshot enrichment**

Create `development/service-settlement-operations-view/settlements/tests/test_daily_settlement_service.py`.

Cover at least:

1. payroll truth passes through unchanged for `summary`
2. each day row is enriched with `daily_delivery_input_snapshot_id`
3. missing snapshot for a returned payroll row becomes a dependency error in v1
4. payroll outage becomes a dependency error in v1

Representative test:

```python
def test_build_daily_settlement_response_merges_snapshot_reference(self):
    service = DailySettlementReadService(source_clients=FakeSourceClients(...))
    payload = service.build_daily_settlements(
        driver_id="10000000-0000-0000-0000-000000000001",
        date_from="2026-04-01",
        date_to="2026-04-30",
        authorization="Bearer token",
    )

    self.assertEqual(payload["results"][0]["daily_delivery_input_snapshot_id"], "20000000-0000-0000-0000-000000000001")
    self.assertEqual(payload["results"][0]["total_amount"], "56400.00")
```

- [x] **Step 3: Write failing API tests for the external `settlement-ops` endpoint**

Extend `development/service-settlement-operations-view/settlements/tests/test_settlement_api.py` for:

1. authenticated success
2. `date_from` / `date_to` validation
3. empty window returns `summary` zeros and `results: []`
4. payroll outage maps to the existing dependency error shape
5. snapshot lookup outage maps to the existing dependency error shape
6. settlement nav permission is still required

- [x] **Step 4: Implement the `settlement-ops` read service without re-deriving amounts**

Create `development/service-settlement-operations-view/settlements/services/daily_settlement_service.py`.

The implementation must:

1. read day-level truth from payroll
2. read `daily-snapshots` from `delivery-record`
3. join snapshot ids by `service_date`
4. not compute `total_amount`, `settlement_type`, or any price field itself

- [x] **Step 5: Add serializer, view, route, and service export wiring**

Wire the external endpoint:

```python
path(
    "drivers/<uuid:driver_id>/daily-settlements/",
    DriverDailySettlementView.as_view(),
    name="driver-daily-settlements",
)
```

The serializer set must reflect the fixed Task 1 amount contract for `unit_price` and `total_amount`.

- [x] **Step 6: Run the focused settlement-ops test suite**

Run:

```bash
cd development/service-settlement-operations-view
. .venv/bin/activate
python manage.py test settlements.tests.test_source_clients settlements.tests.test_daily_settlement_service settlements.tests.test_settlement_api -v 2
```

Expected:

1. new daily-settlement cases pass
2. existing `latest-settlement` and list/detail read cases remain green
3. the service acts as read owner and enricher, not a second calculator

- [x] **Step 7: Update the repo README boundary summary**

Update `development/service-settlement-operations-view/README.md` to mention:

1. the new `/drivers/<driver_id>/daily-settlements/` endpoint
2. payroll daily truth consumption
3. delivery snapshot reference enrichment
4. the repo is still read-only and not a write owner

- [ ] **Step 8: Commit the settlement-ops slice**

```bash
git add development/service-settlement-operations-view
git commit -m "feat: add settlement ops daily settlement read"
```

### Task 4: Add The Driver `Me` Settlement Calendar Facade To `service-driver-operations-view`

**Files:**
- Create: `development/service-driver-operations-view/driver360/services/settlement_calendar_service.py`
- Modify: `development/service-driver-operations-view/driver360/services/source_clients.py`
- Modify: `development/service-driver-operations-view/driver360/serializers.py`
- Modify: `development/service-driver-operations-view/driver360/views.py`
- Modify: `development/service-driver-operations-view/driver360/urls.py`
- Modify: `development/service-driver-operations-view/driver360/tests/test_source_clients.py`
- Create: `development/service-driver-operations-view/driver360/tests/test_settlement_calendar.py`
- Modify: `development/service-driver-operations-view/README.md`

- [x] **Step 1: Write failing source-client tests for the new `settlement-ops` call**

Extend `development/service-driver-operations-view/driver360/tests/test_source_clients.py` with a URL assertion for:

```python
SourceClients().list_daily_settlements(
    driver_id="10000000-0000-0000-0000-000000000001",
    date_from="2026-04-01",
    date_to="2026-04-30",
    authorization="Bearer token",
)
```

Expected URL:

```python
"http://settlement-ops-api:8000/drivers/10000000-0000-0000-0000-000000000001/daily-settlements/?date_from=2026-04-01&date_to=2026-04-30"
```

- [x] **Step 2: Write failing API/service tests for linked and `needs_link` flows**

Create `development/service-driver-operations-view/driver360/tests/test_settlement_calendar.py`.

Cover at least:

1. `needs_link` returns `{"status": "needs_link", "results": []}`
2. linked driver forwards the upstream payload and adds `status: "linked"`
3. non-driver accounts get `403`
4. query params default to the same 30-day inclusive window rule used by `work-logs`

- [x] **Step 3: Implement the source client and facade service**

Add `list_daily_settlements(...)` to `development/service-driver-operations-view/driver360/services/source_clients.py`.

Create `SettlementCalendarService` in the new service file. Keep it narrow:

1. resolve the active `driver_account_link`
2. return `needs_link` early when absent
3. call `settlement-ops` with the resolved `driver_id`
4. prepend `status: "linked"` to the upstream wrapper

Do not move settlement derivation logic into `driver-ops`.

- [x] **Step 4: Add serializer, view, and route wiring**

Route target:

```python
path(
    "me/settlement-calendar/",
    DriverSettlementCalendarMeView.as_view(),
    name="driver-settlement-calendar-me",
)
```

The new view should mirror the role gate and date defaulting pattern already used by `DriverWorkLogMeView`.

- [x] **Step 5: Run the focused driver-ops test suite**

Run:

```bash
cd development/service-driver-operations-view
. .venv/bin/activate
python manage.py test driver360.tests.test_source_clients driver360.tests.test_work_logs driver360.tests.test_settlement_calendar -v 2
```

Expected:

1. `work-logs` behavior stays unchanged
2. the new `me/settlement-calendar` facade passes linked and `needs_link` cases

- [x] **Step 6: Update the repo README**

Update `development/service-driver-operations-view/README.md` so it explicitly lists:

1. `me/work-logs`
2. `me/settlement-calendar`
3. `latest-settlement` and `daily-settlements` consumption as upstream read concerns, not ownership

- [ ] **Step 7: Commit the driver-ops slice**

```bash
git add development/service-driver-operations-view
git commit -m "feat: add driver settlement calendar facade"
```

### Task 5: Refresh Edge Public OpenAPI And Final Verification

**Files:**
- Modify: `development/edge-api-gateway/public-api-docs/openapi.yaml`
- Modify: `development/edge-api-gateway/tests/fixtures/pre-cutover-public-openapi.yaml`

- [x] **Step 1: Export the updated service schemas and rebuild the edge public OpenAPI**

Run:

```bash
cd development/edge-api-gateway
python scripts/build_public_openapi.py
```

Expected:

1. `/api/settlement-ops/drivers/{driver_id}/daily-settlements/` appears
2. `/api/driver-ops/me/settlement-calendar/` appears
3. the payroll upstream-only daily source does not appear if Task 2 marked it schema-excluded

- [x] **Step 2: Refresh the committed parity fixture**

Update the committed edge fixture so it matches the new generated artifact:

```bash
cp public-api-docs/openapi.yaml tests/fixtures/pre-cutover-public-openapi.yaml
```

- [x] **Step 3: Run edge parity tests**

Run:

```bash
cd development/edge-api-gateway
python scripts/check_public_openapi_parity.py
python -m unittest tests.test_public_openapi_build tests.test_public_openapi_parity tests.test_nginx_settlement_routes tests.test_nginx_docs_routes
```

Expected:

1. no parity drift
2. no route regression

- [ ] **Step 4: Do optional manual smoke only after user confirmation**

Per the root `AGENTS.md`, ask the user what they want to validate and whether live-data impact is acceptable before running manual verification against a local stack or any non-test environment.

If the user approves local smoke, use these examples:

```bash
curl -H "Authorization: Bearer <token>" "http://localhost/api/settlement-ops/drivers/<driver_id>/daily-settlements/?date_from=2026-04-01&date_to=2026-04-30"
curl -H "Authorization: Bearer <token>" "http://localhost/api/driver-ops/me/settlement-calendar/?date_from=2026-04-01&date_to=2026-04-30"
```

- [ ] **Step 5: Commit the edge/OpenAPI refresh**

```bash
git add development/edge-api-gateway/public-api-docs/openapi.yaml development/edge-api-gateway/tests/fixtures/pre-cutover-public-openapi.yaml
git commit -m "docs: publish track-a settlement read endpoints"
```

## Completion Criteria

Track A is ready to hand off when all of the following are true:

1. A canonical contract doc exists under `docs/contracts/`.
2. `unit_price` is explicitly defined as the per-box settlement price.
3. `service-settlement-payroll` owns the day-level amount truth.
4. `service-settlement-operations-view` exposes `GET /drivers/<driver_id>/daily-settlements/` without re-deriving amount truth.
5. `service-driver-operations-view` exposes `GET /me/settlement-calendar/`.
6. `work-logs` stays a separate non-settlement contract.
7. Edge public OpenAPI includes only the external Track A endpoints.

## Out Of Scope

This plan does not include:

1. settlement inquiry chat
2. frontend overlay removal in `development/front-driver-app/`
3. new write models outside the payroll-owned daily source path
4. new snapshot truth fields in `service-delivery-record`
