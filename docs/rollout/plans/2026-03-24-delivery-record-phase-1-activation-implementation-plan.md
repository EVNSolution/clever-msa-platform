# Delivery Record Phase 1 Activation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `service-delivery-record`를 empty shell에서 입력 정본 runtime으로 승격하고, `DeliveryRecord` / `DailyDeliveryInputSnapshot` CRUD와 local stack 연결까지 완료한다.

**Architecture:** 새 runtime은 기존 Django/DRF 서비스 패턴을 그대로 따른다. `service-delivery-record`는 배송 단건 원천 기록과 정산 계산용 일별 입력 snapshot만 소유하고, `SettlementRun`, `SettlementItem` 같은 결과 정본은 계속 `service-settlement-payroll`에 둔다. compose와 gateway에 새 runtime을 연결하되 payroll/ops-view direct integration과 자동 fan-in pipeline은 이번 배치에 포함하지 않는다.

**Tech Stack:** Python 3.12, Django, Django REST Framework, PostgreSQL, Docker Compose, Nginx, Django test runner via `manage.py test`

---

## File Structure

이번 구현은 아래 파일 구조를 기준으로 진행한다.

- Create: `development/service-delivery-record/Dockerfile`
- Create: `development/service-delivery-record/entrypoint.sh`
- Create: `development/service-delivery-record/manage.py`
- Create: `development/service-delivery-record/requirements.txt`
- Create: `development/service-delivery-record/config/__init__.py`
- Create: `development/service-delivery-record/config/asgi.py`
- Create: `development/service-delivery-record/config/settings.py`
- Create: `development/service-delivery-record/config/urls.py`
- Create: `development/service-delivery-record/config/wsgi.py`
- Create: `development/service-delivery-record/deliveryrecords/__init__.py`
- Create: `development/service-delivery-record/deliveryrecords/apps.py`
- Create: `development/service-delivery-record/deliveryrecords/authentication.py`
- Create: `development/service-delivery-record/deliveryrecords/exceptions.py`
- Create: `development/service-delivery-record/deliveryrecords/models.py`
- Create: `development/service-delivery-record/deliveryrecords/permissions.py`
- Create: `development/service-delivery-record/deliveryrecords/serializers.py`
- Create: `development/service-delivery-record/deliveryrecords/urls.py`
- Create: `development/service-delivery-record/deliveryrecords/views.py`
- Create: `development/service-delivery-record/deliveryrecords/services/__init__.py`
- Create: `development/service-delivery-record/deliveryrecords/services/source_clients.py`
- Create: `development/service-delivery-record/deliveryrecords/migrations/__init__.py`
- Create: `development/service-delivery-record/deliveryrecords/migrations/0001_initial.py`
- Create: `development/service-delivery-record/deliveryrecords/management/__init__.py`
- Create: `development/service-delivery-record/deliveryrecords/management/commands/__init__.py`
- Create: `development/service-delivery-record/deliveryrecords/management/commands/seed_delivery_records.py`
- Create: `development/service-delivery-record/deliveryrecords/tests/__init__.py`
- Create: `development/service-delivery-record/deliveryrecords/tests/test_health_api.py`
- Create: `development/service-delivery-record/deliveryrecords/tests/test_models.py`
- Create: `development/service-delivery-record/deliveryrecords/tests/test_delivery_record_api.py`
- Create: `development/service-delivery-record/deliveryrecords/tests/test_seed_delivery_records_command.py`
- Create: `development/service-delivery-record/deliveryrecords/tests/test_source_clients.py`
- Modify: `development/service-delivery-record/README.md`
- Modify: `development/integration-local-stack/docker-compose.account-driver-settlement.yml`
- Modify: `development/integration-local-stack/compose/README.md`
- Modify: `development/integration-local-stack/infra/docker/seed-runner/Dockerfile`
- Modify: `development/integration-local-stack/infra/docker/seed-runner/run-seed.sh`
- Create: `development/integration-local-stack/infra/env/delivery-record.env.example`
- Modify: `development/edge-api-gateway/nginx.conf`
- Modify: `docs/mappings/current-runtime-inventory.md`
- Modify: `docs/mappings/current-to-target-repo-map.md`
- Modify: `docs/mappings/repo-responsibility-matrix.md`
- Modify: `repo-map.md`
- Modify: `WORKSPACE.md`

### Task 1: Bootstrap The Runtime Skeleton

**Files:**
- Create: `development/service-delivery-record/Dockerfile`
- Create: `development/service-delivery-record/entrypoint.sh`
- Create: `development/service-delivery-record/manage.py`
- Create: `development/service-delivery-record/requirements.txt`
- Create: `development/service-delivery-record/config/__init__.py`
- Create: `development/service-delivery-record/config/asgi.py`
- Create: `development/service-delivery-record/config/settings.py`
- Create: `development/service-delivery-record/config/urls.py`
- Create: `development/service-delivery-record/config/wsgi.py`
- Create: `development/service-delivery-record/deliveryrecords/__init__.py`
- Create: `development/service-delivery-record/deliveryrecords/apps.py`
- Create: `development/service-delivery-record/deliveryrecords/authentication.py`
- Create: `development/service-delivery-record/deliveryrecords/exceptions.py`
- Create: `development/service-delivery-record/deliveryrecords/permissions.py`
- Create: `development/service-delivery-record/deliveryrecords/urls.py`
- Create: `development/service-delivery-record/deliveryrecords/views.py`
- Create: `development/service-delivery-record/deliveryrecords/services/__init__.py`
- Create: `development/service-delivery-record/deliveryrecords/services/source_clients.py`
- Create: `development/service-delivery-record/deliveryrecords/tests/__init__.py`
- Create: `development/service-delivery-record/deliveryrecords/tests/test_health_api.py`

- [ ] **Step 1: Write the failing health API test**

Create `development/service-delivery-record/deliveryrecords/tests/test_health_api.py` with:

```python
from django.test import SimpleTestCase


class HealthApiTests(SimpleTestCase):
    def test_health_returns_ok(self) -> None:
        response = self.client.get("/health/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok"})
```

- [ ] **Step 2: Run the health test to verify the shell fails**

Run:

```bash
cd development/service-delivery-record
python3.12 -m venv .venv312
./.venv312/bin/pip install Django djangorestframework
./.venv312/bin/python -m unittest deliveryrecords.tests.test_health_api
```

Expected:

- fail because settings, URL wiring, and runtime bootstrap do not exist yet

- [ ] **Step 3: Copy the minimal Django/DRF service skeleton from the established service pattern**

Use `development/service-settlement-registry/` as the primary reference and add:

- service bootstrap files (`Dockerfile`, `entrypoint.sh`, `manage.py`, `requirements.txt`)
- `config/` package with Django settings and root URLs
- `deliveryrecords/` package with app config, auth, permissions, exceptions, URLs, and a health view

Implementation requirements:

- root URL path must mount service-internal paths only
- app URL path must expose `health/`
- future service-internal CRUD paths are `/records/` and `/daily-snapshots/`
- external `/api/delivery-record/` prefix is the gateway concern only
- auth/permission pattern should match the current admin-protected service style, but `health/` stays open

- [ ] **Step 4: Run the health test again**

Run:

```bash
cd development/service-delivery-record
./.venv312/bin/pip install -r requirements.txt
./.venv312/bin/python manage.py test deliveryrecords.tests.test_health_api -v 2
```

Expected:

- PASS

- [ ] **Step 5: Commit the bootstrap**

```bash
git add development/service-delivery-record
git commit -m "feat: bootstrap delivery record runtime"
```

### Task 2: Implement Input Models And Migration

**Files:**
- Create: `development/service-delivery-record/deliveryrecords/models.py`
- Create: `development/service-delivery-record/deliveryrecords/migrations/__init__.py`
- Create: `development/service-delivery-record/deliveryrecords/migrations/0001_initial.py`
- Create: `development/service-delivery-record/deliveryrecords/tests/test_models.py`

- [ ] **Step 1: Write failing model tests for `DeliveryRecord` and `DailyDeliveryInputSnapshot`**

Create `development/service-delivery-record/deliveryrecords/tests/test_models.py` with tests for:

- `DeliveryRecord` create/read basics
- `source_reference` uniqueness within the same `company_id + fleet_id + driver_id + service_date`
- non-negative numeric fields
- `DailyDeliveryInputSnapshot` create/read basics
- active snapshot uniqueness for the same `company_id + fleet_id + driver_id + service_date`

Include at least one test shaped like:

```python
def test_active_snapshot_is_unique_per_scope_and_service_date(self):
    DailyDeliveryInputSnapshot.objects.create(
        company_id=self.company_id,
        fleet_id=self.fleet_id,
        driver_id=self.driver_id,
        service_date=date(2026, 3, 24),
        delivery_count=12,
        total_distance_km=Decimal("25.50"),
        total_base_amount=Decimal("120000.00"),
        source_record_count=12,
        status=DailyDeliveryInputSnapshot.Status.ACTIVE,
    )

    duplicate = DailyDeliveryInputSnapshot(
        company_id=self.company_id,
        fleet_id=self.fleet_id,
        driver_id=self.driver_id,
        service_date=date(2026, 3, 24),
        delivery_count=9,
        total_distance_km=Decimal("20.00"),
        total_base_amount=Decimal("90000.00"),
        source_record_count=9,
        status=DailyDeliveryInputSnapshot.Status.ACTIVE,
    )

    with pytest.raises(ValidationError):
        duplicate.full_clean()
```

- [ ] **Step 2: Run the model tests to verify they fail**

Run:

```bash
cd development/service-delivery-record
./.venv312/bin/python manage.py test deliveryrecords.tests.test_models -v 2
```

Expected:

- FAIL because models and migration do not exist yet

- [ ] **Step 3: Implement the two input models and the initial migration**

Add models and initial migration with:

- UUID primary keys
- `DeliveryRecord` fields:
  - `company_id`, `fleet_id`, `driver_id`
  - `service_date`
  - `source_reference`
  - `delivery_count`
  - `distance_km`
  - `base_amount`
  - `status`
  - `payload`
- `DailyDeliveryInputSnapshot` fields:
  - `company_id`, `fleet_id`, `driver_id`
  - `service_date`
  - `delivery_count`
  - `total_distance_km`
  - `total_base_amount`
  - `source_record_count`
  - `status`
- DB-level uniqueness for:
  - `DeliveryRecord(company_id, fleet_id, driver_id, service_date, source_reference)`
  - `DailyDeliveryInputSnapshot(company_id, fleet_id, driver_id, service_date, status)` only if status vocabulary is constrained so that one active row is representable without ambiguity
- model-level validation for:
  - non-negative counts and amounts
  - active snapshot uniqueness if DB constraint alone is too blunt

Recommended status sets:

- `DeliveryRecord.Status`: `draft`, `confirmed`, `void`
- `DailyDeliveryInputSnapshot.Status`: `active`, `superseded`

- [ ] **Step 4: Run the model tests again**

Run:

```bash
cd development/service-delivery-record
./.venv312/bin/python manage.py test deliveryrecords.tests.test_models -v 2
./.venv312/bin/python manage.py makemigrations --check --dry-run
```

Expected:

- PASS for model coverage
- `No changes detected`

- [ ] **Step 5: Commit the model slice**

```bash
git add development/service-delivery-record/deliveryrecords/models.py \
  development/service-delivery-record/deliveryrecords/migrations \
  development/service-delivery-record/deliveryrecords/tests/test_models.py
git commit -m "feat: add delivery record input models"
```

### Task 3: Implement Source Validation And Admin CRUD API

**Files:**
- Create: `development/service-delivery-record/deliveryrecords/serializers.py`
- Modify: `development/service-delivery-record/deliveryrecords/views.py`
- Modify: `development/service-delivery-record/deliveryrecords/urls.py`
- Create: `development/service-delivery-record/deliveryrecords/tests/test_delivery_record_api.py`
- Create: `development/service-delivery-record/deliveryrecords/tests/test_source_clients.py`
- Modify: `development/service-delivery-record/deliveryrecords/services/source_clients.py`
- Modify: `development/service-delivery-record/deliveryrecords/authentication.py`
- Modify: `development/service-delivery-record/deliveryrecords/permissions.py`
- Modify: `development/service-delivery-record/config/settings.py`

- [ ] **Step 1: Write failing source-client tests**

Create `development/service-delivery-record/deliveryrecords/tests/test_source_clients.py` with tests for:

- company/fleet existence validation against `service-organization-registry`
- fleet-to-company membership validation
- driver existence validation against `service-driver-profile`
- caller bearer token forwarding to both upstream services

Include one test shaped like:

```python
@patch("deliveryrecords.services.source_clients.urlopen")
def test_validate_scope_and_driver_forward_caller_token(self, mocked_urlopen):
    mocked_urlopen.side_effect = [
        self._json_response({"company_id": str(self.company_id)}),
        self._json_response({"fleet_id": str(self.fleet_id), "company_id": str(self.company_id)}),
        self._json_response({"driver_id": str(self.driver_id)}),
    ]

    SourceClients().validate_scope_and_driver(
        company_id=str(self.company_id),
        fleet_id=str(self.fleet_id),
        driver_id=str(self.driver_id),
        authorization="Bearer token-123",
    )

    headers = [call.args[0].headers for call in mocked_urlopen.call_args_list]
    assert all(header["Authorization"] == "Bearer token-123" for header in headers)
```

- [ ] **Step 2: Write failing API tests**

Create `development/service-delivery-record/deliveryrecords/tests/test_delivery_record_api.py` with tests for:

- public `health`
- admin CRUD for `/records/`
- admin CRUD for `/daily-snapshots/`
- non-admin access rejected for CRUD
- create rejected when company/fleet/driver does not exist
- duplicate active snapshot rejected

Include at least one test shaped like:

```python
def test_admin_can_crud_delivery_record(self):
    create_response = self.client.post(
        "/records/",
        {
            "company_id": str(self.company_id),
            "fleet_id": str(self.fleet_id),
            "driver_id": str(self.driver_id),
            "service_date": "2026-03-24",
            "source_reference": "seed-upload-001",
            "delivery_count": 1,
            "distance_km": "12.50",
            "base_amount": "15000.00",
            "status": "confirmed",
            "payload": {"stop_count": 3},
        },
        format="json",
    )

    assert create_response.status_code == 201
```

- [ ] **Step 3: Run the new tests to verify they fail**

Run:

```bash
cd development/service-delivery-record
./.venv312/bin/python manage.py test \
  deliveryrecords.tests.test_source_clients \
  deliveryrecords.tests.test_delivery_record_api -v 2
```

Expected:

- FAIL because source client logic, serializers, and CRUD endpoints do not exist yet

- [ ] **Step 4: Implement source validation helpers**

Implement `deliveryrecords/services/source_clients.py` with:

- organization lookup for `/companies/{company_id}/` and `/fleets/{fleet_id}/`
- driver lookup for `/drivers/{driver_id}/`
- caller token forwarding
- stable validation errors for:
  - unknown company
  - unknown fleet
  - mismatched fleet/company relation
  - unknown driver

Settings requirements:

- add `ORGANIZATION_MASTER_BASE_URL`
- add `DRIVER_PROFILE_BASE_URL`

- [ ] **Step 5: Implement admin CRUD endpoints**

Implement:

- serializers for `DeliveryRecord` and `DailyDeliveryInputSnapshot`
- admin-only CRUD viewsets
- router wiring for `/records/` and `/daily-snapshots/`
- serializer-level validation that calls the source client on create/update

Permission rule:

- `health` stays public
- all CRUD methods remain admin-only, including GET

- [ ] **Step 6: Run API and source-client tests again**

Run:

```bash
cd development/service-delivery-record
./.venv312/bin/python manage.py test \
  deliveryrecords.tests.test_source_clients \
  deliveryrecords.tests.test_delivery_record_api -v 2
./.venv312/bin/python manage.py test deliveryrecords.tests -v 2
./.venv312/bin/python manage.py makemigrations --check --dry-run
```

Expected:

- PASS
- `No changes detected`

- [ ] **Step 7: Commit the API slice**

```bash
git add development/service-delivery-record/deliveryrecords \
  development/service-delivery-record/config/settings.py
git commit -m "feat: add delivery record management api"
```

### Task 4: Add Seed Command And Wire The Local Stack

**Files:**
- Create: `development/service-delivery-record/deliveryrecords/management/__init__.py`
- Create: `development/service-delivery-record/deliveryrecords/management/commands/__init__.py`
- Create: `development/service-delivery-record/deliveryrecords/management/commands/seed_delivery_records.py`
- Create: `development/service-delivery-record/deliveryrecords/tests/test_seed_delivery_records_command.py`
- Modify: `development/integration-local-stack/docker-compose.account-driver-settlement.yml`
- Modify: `development/integration-local-stack/compose/README.md`
- Modify: `development/integration-local-stack/infra/docker/seed-runner/Dockerfile`
- Modify: `development/integration-local-stack/infra/docker/seed-runner/run-seed.sh`
- Create: `development/integration-local-stack/infra/env/delivery-record.env.example`
- Modify: `development/edge-api-gateway/nginx.conf`

- [ ] **Step 1: Write the failing seed command tests**

Create `development/service-delivery-record/deliveryrecords/tests/test_seed_delivery_records_command.py` with tests for:

- seed creates one `DeliveryRecord`
- seed creates one `DailyDeliveryInputSnapshot`
- seed is idempotent

Include at least one test shaped like:

```python
def test_seed_command_creates_record_and_snapshot(self):
    stdout = StringIO()

    call_command("seed_delivery_records", stdout=stdout)

    self.assertEqual(DeliveryRecord.objects.count(), 1)
    self.assertEqual(DailyDeliveryInputSnapshot.objects.count(), 1)
    self.assertIn("Seeded delivery record bootstrap data.", stdout.getvalue())
```

- [ ] **Step 2: Run the seed tests to verify they fail**

Run:

```bash
cd development/service-delivery-record
./.venv312/bin/python manage.py test deliveryrecords.tests.test_seed_delivery_records_command -v 2
```

Expected:

- FAIL because the command does not exist yet

- [ ] **Step 3: Implement the seed command**

Implement `seed_delivery_records.py` with deterministic sample IDs for:

- one delivery record
- one daily snapshot

Seed data requirements:

- reuse seeded `company_id`, `fleet_id`, `driver_id`
- keep values small and human-readable
- do not create payroll rows

- [ ] **Step 4: Wire local stack assets**

Modify:

- `docker-compose.account-driver-settlement.yml`
  - add `delivery-record-api`
  - add `delivery-record-db`
  - wire DB env and service dependency chain
- `infra/docker/seed-runner/Dockerfile`
  - copy and install `service-delivery-record`
- `infra/docker/seed-runner/run-seed.sh`
  - migrate and seed `service-delivery-record`
- `edge-api-gateway/nginx.conf`
  - add `/api/delivery-record/` upstream route
- `infra/env/delivery-record.env.example`
  - add local env template
- `compose/README.md`
  - document the new runtime

- [ ] **Step 5: Run service tests and compose verification**

Run:

```bash
cd development/service-delivery-record
./.venv312/bin/python manage.py test deliveryrecords.tests -v 2

cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform
docker compose -f development/integration-local-stack/docker-compose.account-driver-settlement.yml config
docker compose -f development/integration-local-stack/docker-compose.account-driver-settlement.yml build delivery-record-api seed-runner gateway
```

Expected:

- delivery-record tests PASS
- compose config exits 0
- build exits 0

- [ ] **Step 6: Commit the seed and stack slice**

```bash
git add development/service-delivery-record \
  development/integration-local-stack \
  development/edge-api-gateway/nginx.conf
git commit -m "feat: wire delivery record into local stack"
```

### Task 5: Promote Docs And Run End-To-End Smoke

**Files:**
- Modify: `development/service-delivery-record/README.md`
- Modify: `docs/mappings/current-runtime-inventory.md`
- Modify: `docs/mappings/current-to-target-repo-map.md`
- Modify: `docs/mappings/repo-responsibility-matrix.md`
- Modify: `repo-map.md`
- Modify: `WORKSPACE.md`

- [ ] **Step 1: Update repo-local and platform docs**

Update:

- `development/service-delivery-record/README.md`
  - switch from empty shell wording to active runtime wording
- `docs/mappings/current-runtime-inventory.md`
  - add `delivery-record-api` and `/api/delivery-record/`
- `docs/mappings/current-to-target-repo-map.md`
  - reflect active runtime status
- `docs/mappings/repo-responsibility-matrix.md`
  - keep ownership focused on input truth only
- `repo-map.md`
  - change status from `empty-shell` to `migrated-target`
- `WORKSPACE.md`
  - reflect that delivery record runtime is active

- [ ] **Step 2: Run merged service verification**

Run:

```bash
cd development/service-delivery-record
./.venv312/bin/python manage.py test deliveryrecords.tests -v 2

cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform
docker compose -f development/integration-local-stack/docker-compose.account-driver-settlement.yml up -d delivery-record-api gateway
docker compose -f development/integration-local-stack/docker-compose.account-driver-settlement.yml run --rm seed-runner
```

Expected:

- service tests PASS
- `delivery-record-api` and `gateway` start successfully
- seed-runner completes successfully

- [ ] **Step 3: Run gateway smoke**

Run:

```bash
ADMIN_TOKEN=$(curl -sS -X POST http://localhost:8080/api/auth/login/ \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com","password":"change-me"}' | python3 -c 'import json,sys; print(json.load(sys.stdin)["access"])')

curl -i -sS http://localhost:8080/api/delivery-record/health/
curl -i -sS http://localhost:8080/api/delivery-record/records/ \
  -H "Authorization: Bearer ${ADMIN_TOKEN}"
curl -i -sS http://localhost:8080/api/delivery-record/daily-snapshots/ \
  -H "Authorization: Bearer ${ADMIN_TOKEN}"
```

Expected:

- health returns `200`
- admin list endpoints return `200`
- seeded record and snapshot are visible

- [ ] **Step 4: Commit the documentation promotion**

```bash
git add development/service-delivery-record/README.md \
  docs/mappings/current-runtime-inventory.md \
  docs/mappings/current-to-target-repo-map.md \
  docs/mappings/repo-responsibility-matrix.md \
  repo-map.md \
  WORKSPACE.md
git commit -m "docs: promote delivery record to active runtime"
```

## Final Verification Checklist

- [ ] `development/service-delivery-record` test suite passes
- [ ] `manage.py makemigrations --check --dry-run` reports `No changes detected`
- [ ] compose config passes
- [ ] docker build for `delivery-record-api`, `seed-runner`, `gateway` passes
- [ ] gateway `/api/delivery-record/health/` responds `200`
- [ ] admin list endpoints for records and daily snapshots respond `200`
- [ ] platform docs no longer describe `service-delivery-record` as `empty-shell`
