# Settlement Scoped Driver Read Contract Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `service-settlement-operations-view`에 driver scoped latest settlement summary endpoint를 추가하고, `service-driver-operations-view`가 settlement collection fan-out 대신 그 contract 하나만 읽도록 전환한다.

**Architecture:** `service-settlement-operations-view`는 read-only fan-out 서비스로 유지하되, 내부에서 payroll `runs/items`를 조합하는 `LatestSettlementSummaryService`를 추가한다. 새 외부 route `GET /api/settlement-ops/drivers/<driver_id>/latest-settlement/`는 wrapper shape를 반환하고, `service-driver-operations-view`는 그 endpoint를 소비해 기존 driver summary contract를 유지한다.

**Tech Stack:** Django/DRF, internal HTTP fan-out, sqlite read-model runtime, upstream payroll API, Docker Compose, Nginx gateway, Markdown

---

### Task 1: Add Latest Settlement Summary Assembly To `service-settlement-operations-view`

**Files:**
- Create: `development/service-settlement-operations-view/settlements/services/latest_settlement_service.py`
- Create: `development/service-settlement-operations-view/settlements/tests/test_latest_settlement_service.py`
- Modify: `development/service-settlement-operations-view/settlements/services/__init__.py`

- [ ] **Step 1: Write the failing service tests for latest-selection semantics**

Create `development/service-settlement-operations-view/settlements/tests/test_latest_settlement_service.py` with a fake source client and these cases:

```python
class LatestSettlementSummaryServiceTests(TestCase):
    def test_build_summary_returns_latest_match_for_driver(self):
        service = LatestSettlementSummaryService(
            source_clients=FakeSourceClients(
                runs=[
                    {
                        "settlement_run_id": "50000000-0000-0000-0000-000000000001",
                        "period_start": "2026-02-01",
                        "period_end": "2026-02-29",
                        "status": "closed",
                    },
                    {
                        "settlement_run_id": "50000000-0000-0000-0000-000000000002",
                        "period_start": "2026-03-01",
                        "period_end": "2026-03-31",
                        "status": "closed",
                    },
                ],
                items=[
                    {
                        "settlement_item_id": "60000000-0000-0000-0000-000000000001",
                        "settlement_run_id": "50000000-0000-0000-0000-000000000001",
                        "driver_id": "10000000-0000-0000-0000-000000000001",
                        "amount": "100000.00",
                        "payout_status": "paid",
                    },
                    {
                        "settlement_item_id": "60000000-0000-0000-0000-000000000002",
                        "settlement_run_id": "50000000-0000-0000-0000-000000000002",
                        "driver_id": "10000000-0000-0000-0000-000000000001",
                        "amount": "125000.50",
                        "payout_status": "pending",
                    },
                ],
            )
        )

        summary = service.build_summary(
            driver_id="10000000-0000-0000-0000-000000000001",
            authorization="Bearer token",
        )

        assert summary["settlement_run_id"] == "50000000-0000-0000-0000-000000000002"
        assert summary["amount"] == "125000.50"

    def test_build_summary_returns_none_when_driver_has_no_settlement(self):
        ...

    def test_build_summary_uses_settlement_run_id_as_tie_breaker(self):
        ...
```

Expected: tests describe `period_end DESC`, then `settlement_run_id DESC`, and `None` for no match.

- [ ] **Step 2: Run the new service tests to verify they fail**

Run:
`cd development/service-settlement-operations-view && python3.12 -m venv .venv312 && ./.venv312/bin/pip install -r requirements.txt && ./.venv312/bin/python manage.py test settlements.tests.test_latest_settlement_service -v 2`

Expected: FAIL because `LatestSettlementSummaryService` does not exist yet.

- [ ] **Step 3: Implement the minimal summary service**

Create `development/service-settlement-operations-view/settlements/services/latest_settlement_service.py` with a focused service:

```python
class LatestSettlementSummaryService:
    def __init__(self, source_clients=None):
        self.source_clients = source_clients or SourceClients()

    def build_summary(self, *, driver_id: str, authorization: str):
        runs = self.source_clients.list_settlement_runs(authorization=authorization)
        items = self.source_clients.list_settlement_items(authorization=authorization)

        run_map = {run["settlement_run_id"]: run for run in runs}
        matches = []
        for item in items:
            if item.get("driver_id") != driver_id:
                continue
            run = run_map.get(item.get("settlement_run_id"))
            if run is None:
                continue
            matches.append(
                {
                    "settlement_run_id": run["settlement_run_id"],
                    "period_start": run["period_start"],
                    "period_end": run["period_end"],
                    "status": run["status"],
                    "payout_status": item["payout_status"],
                    "amount": item["amount"],
                }
            )

        if not matches:
            return None

        return max(matches, key=lambda item: (item["period_end"], item["settlement_run_id"]))
```

Also export it from `development/service-settlement-operations-view/settlements/services/__init__.py`.

Expected: latest summary assembly lives in settlement-ops, not in driver-ops.

- [ ] **Step 4: Re-run the service tests**

Run:
`cd development/service-settlement-operations-view && ./.venv312/bin/python manage.py test settlements.tests.test_latest_settlement_service -v 2`

Expected: PASS.

- [ ] **Step 5: Commit the service-layer change**

```bash
git add development/service-settlement-operations-view/settlements/services/__init__.py \
        development/service-settlement-operations-view/settlements/services/latest_settlement_service.py \
        development/service-settlement-operations-view/settlements/tests/test_latest_settlement_service.py
git commit -m "feat: add settlement latest summary service"
```

### Task 2: Expose The Driver-Scoped Endpoint From `service-settlement-operations-view`

**Files:**
- Modify: `development/service-settlement-operations-view/settlements/serializers.py`
- Modify: `development/service-settlement-operations-view/settlements/urls.py`
- Modify: `development/service-settlement-operations-view/settlements/views.py`
- Modify: `development/service-settlement-operations-view/settlements/tests/test_settlement_api.py`
- Modify: `development/service-settlement-operations-view/README.md`

- [ ] **Step 1: Write failing API tests for the new route**

Extend `development/service-settlement-operations-view/settlements/tests/test_settlement_api.py` with these cases:

```python
@patch("settlements.views.LatestSettlementSummaryService")
def test_user_can_read_latest_settlement_for_driver(self, mock_service):
    self._authenticate(self.user_token)
    driver_id = "10000000-0000-0000-0000-000000000001"
    mock_service.return_value.build_summary.return_value = {
        "settlement_run_id": "50000000-0000-0000-0000-000000000002",
        "period_start": "2026-03-01",
        "period_end": "2026-03-31",
        "status": "closed",
        "payout_status": "pending",
        "amount": "125000.50",
    }

    response = self.client.get(f"/drivers/{driver_id}/latest-settlement/")

    self.assertEqual(response.status_code, 200)
    self.assertEqual(response.data["driver_id"], driver_id)
    self.assertEqual(response.data["latest_settlement"]["amount"], "125000.50")

@patch("settlements.views.LatestSettlementSummaryService")
def test_driver_with_no_settlement_returns_null_summary(self, mock_service):
    ...

@patch("settlements.views.LatestSettlementSummaryService")
def test_latest_settlement_outage_returns_503_shape(self, mock_service):
    ...
```

Expected: route, `200 + null`, and dependency failure behavior are locked before implementation.

- [ ] **Step 2: Run the API test subset to verify it fails**

Run:
`cd development/service-settlement-operations-view && ./.venv312/bin/python manage.py test settlements.tests.test_settlement_api -v 2`

Expected: FAIL with `404` or missing serializer/view imports for the new route.

- [ ] **Step 3: Add wrapper serializers for the scoped response**

Modify `development/service-settlement-operations-view/settlements/serializers.py` to add:

```python
class LatestSettlementSummarySerializer(serializers.Serializer):
    settlement_run_id = serializers.UUIDField()
    period_start = serializers.DateField()
    period_end = serializers.DateField()
    status = serializers.CharField()
    payout_status = serializers.CharField()
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)


class DriverLatestSettlementSerializer(serializers.Serializer):
    driver_id = serializers.UUIDField()
    latest_settlement = LatestSettlementSummarySerializer(allow_null=True)
```

Expected: API response shape is validated inside settlement-ops.

- [ ] **Step 4: Add the view and route**

Modify `development/service-settlement-operations-view/settlements/views.py` and `development/service-settlement-operations-view/settlements/urls.py`.

Add:

```python
class DriverLatestSettlementView(APIView):
    http_method_names = ["get", "head", "options"]
    permission_classes = [AuthenticatedReadOnly]

    def get(self, request, driver_id):
        try:
            latest_settlement = LatestSettlementSummaryService().build_summary(
                driver_id=str(driver_id),
                authorization=request.META.get("HTTP_AUTHORIZATION", ""),
            )
        except SourceServiceError as exc:
            raise UpstreamServiceUnavailable() from exc

        payload = {
            "driver_id": str(driver_id),
            "latest_settlement": latest_settlement,
        }
        return Response(
            _serialize_upstream_payload(DriverLatestSettlementSerializer, payload, many=False),
            status=status.HTTP_200_OK,
        )
```

Add route:

```python
path(
    "drivers/<uuid:driver_id>/latest-settlement/",
    DriverLatestSettlementView.as_view(),
    name="driver-latest-settlement",
)
```

Expected: settlement-ops exposes a domain-named driver-scoped summary endpoint.

- [ ] **Step 5: Update the repo README**

In `development/service-settlement-operations-view/README.md`, add the new scoped read responsibility:

- external read API includes `drivers/<driver_id>/latest-settlement/`
- repo owns read-only latest settlement summary assembly
- repo still does not own write or payroll truth

Expected: repo-local docs match the new contract.

- [ ] **Step 6: Re-run the settlement-ops test suite**

Run:
`cd development/service-settlement-operations-view && ./.venv312/bin/python manage.py test settlements.tests -v 2`

Expected: PASS, including the new route tests and existing `runs/items` coverage.

- [ ] **Step 7: Commit the endpoint change**

```bash
git add development/service-settlement-operations-view/settlements/serializers.py \
        development/service-settlement-operations-view/settlements/urls.py \
        development/service-settlement-operations-view/settlements/views.py \
        development/service-settlement-operations-view/settlements/tests/test_settlement_api.py \
        development/service-settlement-operations-view/README.md
git commit -m "feat: add driver-scoped settlement summary endpoint"
```

### Task 3: Repoint `service-driver-operations-view` To The Scoped Contract

**Files:**
- Create: `development/service-driver-operations-view/driver360/tests/test_source_clients.py`
- Modify: `development/service-driver-operations-view/driver360/services/source_clients.py`
- Modify: `development/service-driver-operations-view/driver360/services/driver_summary_service.py`
- Modify: `development/service-driver-operations-view/driver360/tests/test_driver_summary_service.py`
- Modify: `development/service-driver-operations-view/README.md`

- [ ] **Step 1: Write the failing source-client test for the new endpoint**

Create `development/service-driver-operations-view/driver360/tests/test_source_clients.py` with:

```python
@override_settings(SETTLEMENT_OPS_BASE_URL="http://settlement-ops-api:8000")
@patch("driver360.services.source_clients.urlopen")
def test_get_latest_settlement_builds_driver_scoped_ops_url(mock_urlopen):
    mock_urlopen.return_value = fake_response(
        """
        {
            "driver_id": "10000000-0000-0000-0000-000000000001",
            "latest_settlement": null
        }
        """
    )

    payload = SourceClients().get_latest_settlement(
        driver_id="10000000-0000-0000-0000-000000000001",
        authorization="Bearer token",
    )

    assert payload["driver_id"] == "10000000-0000-0000-0000-000000000001"
    assert mock_urlopen.call_args.args[0].full_url == (
        "http://settlement-ops-api:8000/drivers/"
        "10000000-0000-0000-0000-000000000001/latest-settlement/"
    )
```

Expected: consumer URL construction is locked before source client changes.

- [ ] **Step 2: Add failing summary-service tests for scoped settlement payloads**

Modify `development/service-driver-operations-view/driver360/tests/test_driver_summary_service.py`:

- replace `runs/items` fixtures with `latest_settlement`
- make `FakeSourceClients` expose `get_latest_settlement`
- assert `build_summary()` reads from the scoped response

Example:

```python
self.latest_settlement = {
    "driver_id": "10000000-0000-0000-0000-000000000001",
    "latest_settlement": {
        "settlement_run_id": "50000000-0000-0000-0000-000000000002",
        "period_start": "2026-03-01",
        "period_end": "2026-03-31",
        "status": "closed",
        "payout_status": "pending",
        "amount": "125000.50",
    },
}
```

Expected: the service test fails because production code still expects `runs/items`.

- [ ] **Step 3: Run the driver-ops test subset to verify it fails**

Run:
`cd development/service-driver-operations-view && python3.12 -m venv .venv312 && ./.venv312/bin/pip install -r requirements.txt && ./.venv312/bin/python manage.py test driver360.tests.test_source_clients driver360.tests.test_driver_summary_service -v 2`

Expected: FAIL because `get_latest_settlement()` does not exist yet and summary logic still expects collections.

- [ ] **Step 4: Implement the minimal consumer change**

Modify `development/service-driver-operations-view/driver360/services/source_clients.py`:

```python
def get_latest_settlement(self, *, driver_id: str, authorization: str):
    return self._request_json(
        url=self._build_url(
            settings.SETTLEMENT_OPS_BASE_URL,
            f"/drivers/{driver_id}/latest-settlement/",
        ),
        authorization=authorization,
    )
```

Modify `development/service-driver-operations-view/driver360/services/driver_summary_service.py` so `_get_latest_settlement()` becomes:

```python
def _get_latest_settlement(self, *, driver_id: str, authorization: str, warnings: list[str]):
    try:
        payload = self.source_clients.get_latest_settlement(
            driver_id=driver_id,
            authorization=authorization,
        )
    except SourceServiceError:
        warnings.append("Settlement source unavailable.")
        return None

    return payload.get("latest_settlement")
```

Expected: driver-ops no longer owns settlement collection join logic.

- [ ] **Step 5: Update the repo README**

In `development/service-driver-operations-view/README.md`, tighten the settlement dependency note:

- consumes `settlement-ops` scoped latest-settlement summary
- does not read payroll collections directly

Expected: repo-local docs reflect the narrower read boundary.

- [ ] **Step 6: Re-run the driver-ops test suite**

Run:
`cd development/service-driver-operations-view && ./.venv312/bin/python manage.py test driver360.tests -v 2`

Expected: PASS, with `latest_settlement_*` fields still preserved in the outer driver summary contract.

- [ ] **Step 7: Commit the consumer transition**

```bash
git add development/service-driver-operations-view/driver360/tests/test_source_clients.py \
        development/service-driver-operations-view/driver360/services/source_clients.py \
        development/service-driver-operations-view/driver360/services/driver_summary_service.py \
        development/service-driver-operations-view/driver360/tests/test_driver_summary_service.py \
        development/service-driver-operations-view/README.md
git commit -m "refactor: consume scoped settlement summary in driver ops"
```

### Task 4: Update Contracts And Prove End-To-End Behavior

**Files:**
- Modify: `docs/contracts/04-driver-360-read-model.md`
- Modify: `docs/rollout/13-account-driver-settlement-compose-simulation.md`
- Optional Modify: `docs/decisions/specs/2026-03-23-settlement-phase-2-decomposition-design.md`

- [ ] **Step 1: Update the contract docs**

In `docs/contracts/04-driver-360-read-model.md`, rewrite the settlement source note:

- source becomes `Settlement Operations View`
- latest settlement is provided as scoped summary, not collection fan-out
- Driver 360 still only owns the composed outer summary

In `docs/rollout/13-account-driver-settlement-compose-simulation.md`, add the new smoke target:

- `GET /api/settlement-ops/drivers/<driver_id>/latest-settlement/`

Expected: docs describe the new runtime contract, not the old bootstrap shape.

- [ ] **Step 2: Run focused service tests again from clean HEAD**

Run:
- `cd development/service-settlement-operations-view && ./.venv312/bin/python manage.py test settlements.tests -v 2`
- `cd development/service-driver-operations-view && ./.venv312/bin/python manage.py test driver360.tests -v 2`

Expected: both suites pass from the final integrated code.

- [ ] **Step 3: Rebuild the touched local-stack services**

Run:
`docker compose -f development/integration-local-stack/docker-compose.account-driver-settlement.yml build settlement-ops-api driver-360-api gateway`

Expected: build passes with the new read contract wired through both services.

- [ ] **Step 4: Run the stack and seed bootstrap**

Run:
- `docker compose -f development/integration-local-stack/docker-compose.account-driver-settlement.yml up -d settlement-payroll-api settlement-ops-api driver-360-api gateway`
- `docker compose -f development/integration-local-stack/docker-compose.account-driver-settlement.yml run --rm seed-runner`

Expected: bootstrap completes without introducing new settlement warnings.

- [ ] **Step 5: Run gateway smoke for the new scoped route**

Run:

```bash
curl -fsS http://localhost:8080/api/settlement-ops/drivers/10000000-0000-0000-0000-000000000001/latest-settlement/ \
  -H "Authorization: Bearer <seeded-user-token>"
```

Expected response shape:

```json
{
  "driver_id": "10000000-0000-0000-0000-000000000001",
  "latest_settlement": {
    "settlement_run_id": "60000000-0000-0000-0000-000000000001",
    "period_start": "2026-03-01",
    "period_end": "2026-03-31",
    "status": "draft",
    "payout_status": "pending",
    "amount": "125000.50"
  }
}
```

Also verify a no-history UUID returns:

```json
{
  "driver_id": "<uuid>",
  "latest_settlement": null
}
```

- [ ] **Step 6: Re-run driver summary smoke**

Run:

```bash
curl -fsS http://localhost:8080/api/driver-360/drivers/10000000-0000-0000-0000-000000000001/ \
  -H "Authorization: Bearer <seeded-user-token>"
```

Expected:
- `latest_settlement_run_id` still populated
- `latest_settlement_amount` still populated
- no regression in outer summary contract

- [ ] **Step 7: Commit docs and final verification updates**

```bash
git add docs/contracts/04-driver-360-read-model.md \
        docs/rollout/13-account-driver-settlement-compose-simulation.md
git commit -m "docs: document scoped settlement read contract"
```
