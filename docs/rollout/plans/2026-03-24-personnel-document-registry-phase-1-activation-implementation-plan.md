# Personnel Document Registry Phase 1 Activation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `service-personnel-document-registry`를 empty shell에서 기사 인사문서 메타데이터 정본 runtime으로 승격하고, `PersonnelDocument` CRUD와 local stack 연결까지 완료한다.

**Architecture:** 새 runtime은 기존 Django/DRF 서비스 패턴을 그대로 따른다. `service-personnel-document-registry`는 기사 인사문서 메타데이터와 lifecycle만 소유하고, 파일 바이너리, approval workflow, 회사 단위 문서 aggregate는 이번 배치에 포함하지 않는다. compose와 gateway에 새 runtime을 연결하되 driver profile 존재 검증만 최소 upstream contract로 추가한다.

**Tech Stack:** Python 3.12, Django, Django REST Framework, PostgreSQL, Docker Compose, Nginx, Django test runner via `manage.py test`

---

## File Structure

이번 구현은 아래 파일 구조를 기준으로 진행한다.

- Create: `development/service-personnel-document-registry/Dockerfile`
- Create: `development/service-personnel-document-registry/entrypoint.sh`
- Create: `development/service-personnel-document-registry/manage.py`
- Create: `development/service-personnel-document-registry/requirements.txt`
- Create: `development/service-personnel-document-registry/config/__init__.py`
- Create: `development/service-personnel-document-registry/config/asgi.py`
- Create: `development/service-personnel-document-registry/config/settings.py`
- Create: `development/service-personnel-document-registry/config/urls.py`
- Create: `development/service-personnel-document-registry/config/wsgi.py`
- Create: `development/service-personnel-document-registry/personneldocuments/__init__.py`
- Create: `development/service-personnel-document-registry/personneldocuments/apps.py`
- Create: `development/service-personnel-document-registry/personneldocuments/authentication.py`
- Create: `development/service-personnel-document-registry/personneldocuments/exceptions.py`
- Create: `development/service-personnel-document-registry/personneldocuments/models.py`
- Create: `development/service-personnel-document-registry/personneldocuments/permissions.py`
- Create: `development/service-personnel-document-registry/personneldocuments/serializers.py`
- Create: `development/service-personnel-document-registry/personneldocuments/urls.py`
- Create: `development/service-personnel-document-registry/personneldocuments/views.py`
- Create: `development/service-personnel-document-registry/personneldocuments/services/__init__.py`
- Create: `development/service-personnel-document-registry/personneldocuments/services/source_clients.py`
- Create: `development/service-personnel-document-registry/personneldocuments/migrations/__init__.py`
- Create: `development/service-personnel-document-registry/personneldocuments/migrations/0001_initial.py`
- Create: `development/service-personnel-document-registry/personneldocuments/management/__init__.py`
- Create: `development/service-personnel-document-registry/personneldocuments/management/commands/__init__.py`
- Create: `development/service-personnel-document-registry/personneldocuments/management/commands/seed_personnel_documents.py`
- Create: `development/service-personnel-document-registry/personneldocuments/tests/__init__.py`
- Create: `development/service-personnel-document-registry/personneldocuments/tests/test_health_api.py`
- Create: `development/service-personnel-document-registry/personneldocuments/tests/test_models.py`
- Create: `development/service-personnel-document-registry/personneldocuments/tests/test_personnel_document_api.py`
- Create: `development/service-personnel-document-registry/personneldocuments/tests/test_seed_personnel_documents_command.py`
- Create: `development/service-personnel-document-registry/personneldocuments/tests/test_source_clients.py`
- Modify: `development/service-personnel-document-registry/README.md`
- Modify: `development/integration-local-stack/docker-compose.account-driver-settlement.yml`
- Modify: `development/integration-local-stack/compose/README.md`
- Modify: `development/integration-local-stack/infra/docker/seed-runner/Dockerfile`
- Modify: `development/integration-local-stack/infra/docker/seed-runner/run-seed.sh`
- Create: `development/integration-local-stack/infra/env/personnel-document-registry.env.example`
- Modify: `development/edge-api-gateway/nginx.conf`
- Modify: `docs/mappings/current-runtime-inventory.md`
- Modify: `docs/mappings/current-to-target-repo-map.md`
- Modify: `docs/mappings/repo-responsibility-matrix.md`
- Modify: `repo-map.md`
- Modify: `WORKSPACE.md`

### Task 1: Bootstrap The Runtime Skeleton

**Files:**
- Create: `development/service-personnel-document-registry/Dockerfile`
- Create: `development/service-personnel-document-registry/entrypoint.sh`
- Create: `development/service-personnel-document-registry/manage.py`
- Create: `development/service-personnel-document-registry/requirements.txt`
- Create: `development/service-personnel-document-registry/config/__init__.py`
- Create: `development/service-personnel-document-registry/config/asgi.py`
- Create: `development/service-personnel-document-registry/config/settings.py`
- Create: `development/service-personnel-document-registry/config/urls.py`
- Create: `development/service-personnel-document-registry/config/wsgi.py`
- Create: `development/service-personnel-document-registry/personneldocuments/__init__.py`
- Create: `development/service-personnel-document-registry/personneldocuments/apps.py`
- Create: `development/service-personnel-document-registry/personneldocuments/authentication.py`
- Create: `development/service-personnel-document-registry/personneldocuments/exceptions.py`
- Create: `development/service-personnel-document-registry/personneldocuments/permissions.py`
- Create: `development/service-personnel-document-registry/personneldocuments/urls.py`
- Create: `development/service-personnel-document-registry/personneldocuments/views.py`
- Create: `development/service-personnel-document-registry/personneldocuments/services/__init__.py`
- Create: `development/service-personnel-document-registry/personneldocuments/services/source_clients.py`
- Create: `development/service-personnel-document-registry/personneldocuments/tests/__init__.py`
- Create: `development/service-personnel-document-registry/personneldocuments/tests/test_health_api.py`

- [ ] **Step 1: Write the failing health API test**

Create `development/service-personnel-document-registry/personneldocuments/tests/test_health_api.py` with:

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
cd development/service-personnel-document-registry
python3.12 -m venv .venv312
./.venv312/bin/pip install Django djangorestframework
./.venv312/bin/python -m unittest personneldocuments.tests.test_health_api
```

Expected:

- fail because settings, URL wiring, and runtime bootstrap do not exist yet

- [ ] **Step 3: Copy the minimal Django/DRF service skeleton from the established service pattern**

Use `development/service-delivery-record/` as the primary reference and add:

- service bootstrap files (`Dockerfile`, `entrypoint.sh`, `manage.py`, `requirements.txt`)
- `config/` package with Django settings and root URLs
- `personneldocuments/` package with app config, auth, permissions, exceptions, URLs, and a health view

Implementation requirements:

- root URL path must mount service-internal paths only
- app URL path must expose `health/`
- future service-internal CRUD path is `/documents/`
- external `/api/personnel-documents/` prefix is the gateway concern only
- auth/permission pattern should match the current admin-protected service style, but `health/` stays open

- [ ] **Step 4: Run the health test again**

Run:

```bash
cd development/service-personnel-document-registry
./.venv312/bin/pip install -r requirements.txt
./.venv312/bin/python manage.py test personneldocuments.tests.test_health_api -v 2
```

Expected:

- PASS

- [ ] **Step 5: Commit the bootstrap**

```bash
git add development/service-personnel-document-registry
git commit -m "feat: bootstrap personnel document runtime"
```

### Task 2: Implement The `PersonnelDocument` Model And Migration

**Files:**
- Create: `development/service-personnel-document-registry/personneldocuments/models.py`
- Create: `development/service-personnel-document-registry/personneldocuments/migrations/__init__.py`
- Create: `development/service-personnel-document-registry/personneldocuments/migrations/0001_initial.py`
- Create: `development/service-personnel-document-registry/personneldocuments/tests/test_models.py`

- [ ] **Step 1: Write failing model tests for `PersonnelDocument`**

Create `development/service-personnel-document-registry/personneldocuments/tests/test_models.py` with tests for:

- create/read basics
- `document_type` choices are limited to `contract`, `license_or_certificate`, `bank_account_proof`, `business_registration`
- `status` choices are limited to `draft`, `active`, `expired`, `revoked`
- `issued_on <= expires_on` validation
- `driver_id + document_type + document_number` uniqueness when `document_number` is present

Include at least one validation test shaped like:

```python
document = PersonnelDocument(
    driver_id=self.driver_id,
    document_type=PersonnelDocument.DocumentType.CONTRACT,
    status=PersonnelDocument.Status.ACTIVE,
    title="2026 운송 계약서",
    issued_on=date(2026, 3, 24),
    expires_on=date(2026, 3, 1),
)

with self.assertRaises(ValidationError):
    document.full_clean()
```

- [ ] **Step 2: Run the model tests to verify they fail**

Run:

```bash
cd development/service-personnel-document-registry
./.venv312/bin/python manage.py test personneldocuments.tests.test_models -v 2
```

Expected:

- FAIL because models and migration do not exist yet

- [ ] **Step 3: Implement `PersonnelDocument` and the initial migration**

Add the model and migration with:

- UUID primary key
- `driver_id`
- `document_type`
- `status`
- `title`
- `document_number`
- `issuer_name`
- `issued_on`
- `expires_on`
- `notes`
- `external_reference`
- `payload`

Validation rules:

- `document_type` restricted to the four phase-1 types
- `status` restricted to the four phase-1 lifecycle states
- `expires_on` cannot be earlier than `issued_on`
- if `document_number` is not null, duplicate `(driver_id, document_type, document_number)` rows are rejected

Implementation notes:

- keep `payload` as JSON so type-specific metadata can be added without extra tables
- do not add file-path, blob, or storage adapter fields in phase 1
- use model-level validation for the date rule and DB-level uniqueness for the reference identity rule

- [ ] **Step 4: Run the model tests again**

Run:

```bash
cd development/service-personnel-document-registry
./.venv312/bin/python manage.py test personneldocuments.tests.test_models -v 2
./.venv312/bin/python manage.py makemigrations --check --dry-run
```

Expected:

- PASS
- `No changes detected`

- [ ] **Step 5: Commit the model layer**

```bash
git add development/service-personnel-document-registry
git commit -m "feat: add personnel document model"
```

### Task 3: Add Admin CRUD And Driver Existence Validation

**Files:**
- Create: `development/service-personnel-document-registry/personneldocuments/serializers.py`
- Create: `development/service-personnel-document-registry/personneldocuments/views.py`
- Create: `development/service-personnel-document-registry/personneldocuments/tests/test_personnel_document_api.py`
- Create: `development/service-personnel-document-registry/personneldocuments/tests/test_source_clients.py`
- Modify: `development/service-personnel-document-registry/personneldocuments/services/source_clients.py`
- Modify: `development/service-personnel-document-registry/personneldocuments/urls.py`

- [ ] **Step 1: Write failing API tests for CRUD and permission boundaries**

Create `development/service-personnel-document-registry/personneldocuments/tests/test_personnel_document_api.py` with cases for:

- `GET /health/` returns `200`
- admin can list and create documents
- non-admin access is rejected for CRUD endpoints
- detail `PUT` and `DELETE` are not allowed
- create and patch reject unknown `driver_id`

Also create `development/service-personnel-document-registry/personneldocuments/tests/test_source_clients.py` with a contract test for:

- `validate_driver_exists()` calls the driver-profile internal route using the caller token
- 404 from upstream maps to domain validation failure

- [ ] **Step 2: Run the targeted tests to verify they fail**

Run:

```bash
cd development/service-personnel-document-registry
./.venv312/bin/python manage.py test \
  personneldocuments.tests.test_personnel_document_api \
  personneldocuments.tests.test_source_clients -v 2
```

Expected:

- FAIL because serializers, routers, and source validation are not implemented yet

- [ ] **Step 3: Implement serializers, viewset, router, and driver validation client**

Implement:

- serializer with model validation surfacing clean errors
- admin-only viewset exposing list/create/retrieve/partial_update
- no `PUT` or `DELETE`
- source client that calls `service-driver-profile`

Internal URL requirement:

- call `http://driver-profile-api:8000/{driver_id}/`
- forward the caller bearer token upstream
- map upstream 404 to a validation error shaped for API consumers

API requirements:

- service-internal route is `/documents/`
- external route becomes `/api/personnel-documents/documents/`
- use status-based deactivation later; do not add delete in phase 1

- [ ] **Step 4: Run the targeted tests again**

Run:

```bash
cd development/service-personnel-document-registry
./.venv312/bin/python manage.py test \
  personneldocuments.tests.test_personnel_document_api \
  personneldocuments.tests.test_source_clients -v 2
```

Expected:

- PASS

- [ ] **Step 5: Commit the CRUD layer**

```bash
git add development/service-personnel-document-registry
git commit -m "feat: add personnel document management api"
```

### Task 4: Add Seed Data And Local Stack Wiring

**Files:**
- Create: `development/service-personnel-document-registry/personneldocuments/management/__init__.py`
- Create: `development/service-personnel-document-registry/personneldocuments/management/commands/__init__.py`
- Create: `development/service-personnel-document-registry/personneldocuments/management/commands/seed_personnel_documents.py`
- Create: `development/service-personnel-document-registry/personneldocuments/tests/test_seed_personnel_documents_command.py`
- Modify: `development/integration-local-stack/docker-compose.account-driver-settlement.yml`
- Modify: `development/integration-local-stack/infra/docker/seed-runner/Dockerfile`
- Modify: `development/integration-local-stack/infra/docker/seed-runner/run-seed.sh`
- Create: `development/integration-local-stack/infra/env/personnel-document-registry.env.example`
- Modify: `development/edge-api-gateway/nginx.conf`
- Modify: `development/integration-local-stack/compose/README.md`

- [ ] **Step 1: Write failing seed tests**

Create `development/service-personnel-document-registry/personneldocuments/tests/test_seed_personnel_documents_command.py` with cases for:

- seed creates at least two documents for the seeded driver
- seed is idempotent
- dirty UUID collision is reconciled by business identity rather than crashing

- [ ] **Step 2: Run the seed tests to verify they fail**

Run:

```bash
cd development/service-personnel-document-registry
./.venv312/bin/python manage.py test personneldocuments.tests.test_seed_personnel_documents_command -v 2
```

Expected:

- FAIL because the command does not exist yet

- [ ] **Step 3: Implement the seed command and local stack wiring**

Implement the seed command with:

- at least one `contract`
- at least one non-contract document such as `bank_account_proof` or `business_registration`
- deterministic IDs
- idempotent upsert behavior

Then wire the runtime into local stack:

- add `personnel-document-registry-db`
- add `personnel-document-registry-api`
- route `/api/personnel-documents/` to the service
- copy the env pattern from nearby services
- add migrate + seed steps to `run-seed.sh`

- [ ] **Step 4: Run the focused verification**

Run:

```bash
cd development/service-personnel-document-registry
./.venv312/bin/python manage.py test personneldocuments.tests.test_seed_personnel_documents_command -v 2

cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform
docker compose -f development/integration-local-stack/docker-compose.account-driver-settlement.yml config
docker compose -f development/integration-local-stack/docker-compose.account-driver-settlement.yml build personnel-document-registry-api seed-runner gateway
docker compose -f development/integration-local-stack/docker-compose.account-driver-settlement.yml up -d personnel-document-registry-api gateway
docker compose -f development/integration-local-stack/docker-compose.account-driver-settlement.yml run --rm seed-runner
```

Expected:

- seed tests PASS
- compose config PASS
- build PASS
- seeded runtime starts without migration errors

- [ ] **Step 5: Commit stack integration**

```bash
git add development/service-personnel-document-registry \
  development/integration-local-stack \
  development/edge-api-gateway
git commit -m "feat: wire personnel document runtime into local stack"
```

### Task 5: Promote The Runtime In Docs And Run Final Verification

**Files:**
- Modify: `development/service-personnel-document-registry/README.md`
- Modify: `docs/mappings/current-runtime-inventory.md`
- Modify: `docs/mappings/current-to-target-repo-map.md`
- Modify: `docs/mappings/repo-responsibility-matrix.md`
- Modify: `repo-map.md`
- Modify: `WORKSPACE.md`
- Modify: `development/integration-local-stack/compose/README.md`

- [ ] **Step 1: Update repo-local and platform docs**

Apply all runtime promotion changes:

- `README.md` explains actual runtime usage rather than old shell wording
- `WORKSPACE.md` and `repo-map.md` promote the repo from `empty-shell` to active runtime
- `current-runtime-inventory.md` adds `personnel-document-registry-api` and `/api/personnel-documents/`
- `current-to-target-repo-map.md` removes the empty-shell status
- `repo-responsibility-matrix.md` narrows ownership to article-internal personnel document metadata truth

- [ ] **Step 2: Run full service verification**

Run:

```bash
cd development/service-personnel-document-registry
./.venv312/bin/python manage.py test personneldocuments.tests -v 2
./.venv312/bin/python manage.py makemigrations --check --dry-run
```

Expected:

- all `personneldocuments.tests` PASS
- `No changes detected`

- [ ] **Step 3: Run final gateway smoke**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform

ADMIN_TOKEN=$(curl -s http://localhost:8080/api/auth/login/ \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"admin1234"}' | jq -r '.access')

curl -i http://localhost:8080/api/personnel-documents/health/

curl -s http://localhost:8080/api/personnel-documents/documents/ \
  -H "Authorization: Bearer ${ADMIN_TOKEN}"

curl -s -X POST http://localhost:8080/api/personnel-documents/documents/ \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -d '{
    "driver_id":"10000000-0000-0000-0000-000000000001",
    "document_type":"contract",
    "status":"active",
    "title":"2026 운송 계약서",
    "document_number":"CONTRACT-2026-001",
    "issued_on":"2026-03-24",
    "expires_on":"2027-03-23"
  }'
```

Expected:

- health returns `200 {"status":"ok"}`
- list returns seeded documents
- create returns `201`

- [ ] **Step 4: Review for stale wording**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform
rg -n "empty shell|shell 디렉토리와 README만|runtime 미구현" \
  development/service-personnel-document-registry \
  WORKSPACE.md \
  repo-map.md \
  docs/mappings/current-runtime-inventory.md \
  docs/mappings/current-to-target-repo-map.md
```

Expected:

- no stale shell wording remains in the touched scope

- [ ] **Step 5: Commit the docs promotion**

```bash
git add development/service-personnel-document-registry \
  WORKSPACE.md \
  repo-map.md \
  docs/mappings \
  development/integration-local-stack/compose/README.md
git commit -m "docs: promote personnel document registry runtime"
```
