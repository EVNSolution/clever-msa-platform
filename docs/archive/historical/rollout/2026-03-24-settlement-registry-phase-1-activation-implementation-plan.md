# Settlement Registry Phase 1 Activation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `service-settlement-registry`를 empty shell에서 pure registry CRUD runtime으로 승격하고, policy/version/assignment 관리 API와 local stack 연결까지 완료한다.

**Architecture:** 새 runtime은 기존 Django/DRF 서비스 패턴을 그대로 따른다. `service-settlement-registry`는 `SettlementPolicy`, `SettlementPolicyVersion`, `SettlementPolicyAssignment`만 소유하고, `company_id`, `fleet_id`는 `service-organization-registry` 참조 키로만 다룬다. compose와 gateway에 새 runtime을 연결하되 payroll/ops-view direct integration은 이번 배치에 포함하지 않는다.

**Tech Stack:** Python 3.12, Django, Django REST Framework, PostgreSQL, Docker Compose, Nginx, pytest-style Django test execution via `manage.py test`

---

## File Structure

이번 구현은 아래 파일 구조를 기준으로 진행한다.

- Create: `development/service-settlement-registry/Dockerfile`
- Create: `development/service-settlement-registry/entrypoint.sh`
- Create: `development/service-settlement-registry/manage.py`
- Create: `development/service-settlement-registry/requirements.txt`
- Create: `development/service-settlement-registry/config/__init__.py`
- Create: `development/service-settlement-registry/config/asgi.py`
- Create: `development/service-settlement-registry/config/settings.py`
- Create: `development/service-settlement-registry/config/urls.py`
- Create: `development/service-settlement-registry/config/wsgi.py`
- Create: `development/service-settlement-registry/settlementregistry/__init__.py`
- Create: `development/service-settlement-registry/settlementregistry/apps.py`
- Create: `development/service-settlement-registry/settlementregistry/authentication.py`
- Create: `development/service-settlement-registry/settlementregistry/exceptions.py`
- Create: `development/service-settlement-registry/settlementregistry/models.py`
- Create: `development/service-settlement-registry/settlementregistry/permissions.py`
- Create: `development/service-settlement-registry/settlementregistry/services/__init__.py`
- Create: `development/service-settlement-registry/settlementregistry/services/source_clients.py`
- Create: `development/service-settlement-registry/settlementregistry/serializers.py`
- Create: `development/service-settlement-registry/settlementregistry/urls.py`
- Create: `development/service-settlement-registry/settlementregistry/views.py`
- Create: `development/service-settlement-registry/settlementregistry/migrations/__init__.py`
- Create: `development/service-settlement-registry/settlementregistry/migrations/0001_initial.py`
- Create: `development/service-settlement-registry/settlementregistry/management/__init__.py`
- Create: `development/service-settlement-registry/settlementregistry/management/commands/__init__.py`
- Create: `development/service-settlement-registry/settlementregistry/management/commands/seed_settlement_registry.py`
- Create: `development/service-settlement-registry/settlementregistry/tests/__init__.py`
- Create: `development/service-settlement-registry/settlementregistry/tests/test_health_api.py`
- Create: `development/service-settlement-registry/settlementregistry/tests/test_models.py`
- Create: `development/service-settlement-registry/settlementregistry/tests/test_settlement_registry_api.py`
- Create: `development/service-settlement-registry/settlementregistry/tests/test_seed_settlement_registry_command.py`
- Create: `development/service-settlement-registry/settlementregistry/tests/test_source_clients.py`
- Modify: `development/service-settlement-registry/README.md`
- Modify: `development/integration-local-stack/docker-compose.account-driver-settlement.yml`
- Modify: `development/integration-local-stack/compose/README.md`
- Create: `development/integration-local-stack/infra/env/settlement-registry.env.example`
- Modify: `development/integration-local-stack/infra/docker/seed-runner/run-seed.sh`
- Modify: `development/edge-api-gateway/nginx.conf`
- Modify: `docs/mappings/current-runtime-inventory.md`
- Modify: `docs/mappings/current-to-target-repo-map.md`
- Modify: `docs/mappings/repo-responsibility-matrix.md`
- Modify: `repo-map.md`
- Modify: `WORKSPACE.md`

### Task 1: Bootstrap The Runtime Skeleton

**Files:**
- Create: `development/service-settlement-registry/Dockerfile`
- Create: `development/service-settlement-registry/entrypoint.sh`
- Create: `development/service-settlement-registry/manage.py`
- Create: `development/service-settlement-registry/requirements.txt`
- Create: `development/service-settlement-registry/config/__init__.py`
- Create: `development/service-settlement-registry/config/asgi.py`
- Create: `development/service-settlement-registry/config/settings.py`
- Create: `development/service-settlement-registry/config/urls.py`
- Create: `development/service-settlement-registry/config/wsgi.py`
- Create: `development/service-settlement-registry/settlementregistry/__init__.py`
- Create: `development/service-settlement-registry/settlementregistry/apps.py`
- Create: `development/service-settlement-registry/settlementregistry/authentication.py`
- Create: `development/service-settlement-registry/settlementregistry/exceptions.py`
- Create: `development/service-settlement-registry/settlementregistry/permissions.py`
- Create: `development/service-settlement-registry/settlementregistry/urls.py`
- Create: `development/service-settlement-registry/settlementregistry/views.py`
- Create: `development/service-settlement-registry/settlementregistry/services/__init__.py`
- Create: `development/service-settlement-registry/settlementregistry/services/source_clients.py`
- Create: `development/service-settlement-registry/settlementregistry/tests/__init__.py`
- Create: `development/service-settlement-registry/settlementregistry/tests/test_health_api.py`

- [ ] **Step 1: Write the failing health API test**

Create `development/service-settlement-registry/settlementregistry/tests/test_health_api.py` with a health endpoint expectation:

```python
from django.test import Client


def test_health_returns_ok() -> None:
    response = Client().get("/health/")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
```

- [ ] **Step 2: Run the health test to verify the shell fails**

Run:

```bash
cd development/service-settlement-registry
python3.12 -m venv .venv312
./.venv312/bin/pip install Django djangorestframework
./.venv312/bin/python -m unittest settlementregistry.tests.test_health_api
```

Expected:

- fail because settings, URL wiring, and runtime bootstrap do not exist yet

- [ ] **Step 3: Copy the minimal Django/DRF service skeleton from the established service pattern**

Use `development/service-dispatch-registry/` and `development/service-settlement-payroll/` as reference patterns and add:

- service bootstrap files (`Dockerfile`, `entrypoint.sh`, `manage.py`, `requirements.txt`)
- `config/` package with Django settings and root URLs
- `settlementregistry/` package with app config, auth, permissions, exceptions, URLs, and a health view

Implementation requirements:

- root URL path must mount service-internal paths only
- app URL path must expose `health/`
- service-internal CRUD paths are `/policies/`, `/policy-versions/`, `/policy-assignments/`
- external `/api/settlement-registry/` prefix is the gateway concern only
- auth/permission pattern should match the current admin-protected service style, but `health/` stays open

- [ ] **Step 4: Run the health test again**

Run:

```bash
cd development/service-settlement-registry
./.venv312/bin/pip install -r requirements.txt
./.venv312/bin/python manage.py test settlementregistry.tests.test_health_api -v 2
```

Expected:

- PASS

- [ ] **Step 5: Commit the bootstrap**

```bash
git add development/service-settlement-registry
git commit -m "feat: bootstrap settlement registry runtime"
```

### Task 2: Implement Policy And Version Models

**Files:**
- Create: `development/service-settlement-registry/settlementregistry/models.py`
- Create: `development/service-settlement-registry/settlementregistry/migrations/__init__.py`
- Create: `development/service-settlement-registry/settlementregistry/migrations/0001_initial.py`
- Create: `development/service-settlement-registry/settlementregistry/tests/test_models.py`

- [ ] **Step 1: Write failing model tests for policy and version**

Create `development/service-settlement-registry/settlementregistry/tests/test_models.py` with tests for:

- `SettlementPolicy` create/read basics
- policy/version relation
- version number uniqueness per policy
- `published` status and `published_at` consistency

Include at least one test shaped like:

```python
def test_policy_version_number_is_unique_per_policy():
    policy = SettlementPolicy.objects.create(
        policy_code="fleet-standard",
        name="Fleet Standard",
        status=SettlementPolicy.Status.ACTIVE,
    )
    SettlementPolicyVersion.objects.create(
        policy=policy,
        version_number=1,
        status=SettlementPolicyVersion.Status.DRAFT,
        rule_payload={"base_rate": 1000},
    )

    duplicate = SettlementPolicyVersion(
        policy=policy,
        version_number=1,
        status=SettlementPolicyVersion.Status.DRAFT,
        rule_payload={"base_rate": 1200},
    )

    with pytest.raises(ValidationError):
        duplicate.full_clean()
```

- [ ] **Step 2: Run the model tests to verify they fail**

Run:

```bash
cd development/service-settlement-registry
./.venv312/bin/python manage.py test settlementregistry.tests.test_models -v 2
```

Expected:

- FAIL because models and migration do not exist yet

- [ ] **Step 3: Implement `SettlementPolicy` and `SettlementPolicyVersion`**

Add models and initial migration with:

- UUID primary keys
- `policy_code`, `name`, `status`, `description`
- `policy -> versions` relation
- `version_number`, `rule_payload`, `status`, `published_at`
- DB-level uniqueness for `(policy, version_number)`
- model-level validation for published-version metadata consistency

- [ ] **Step 4: Run the model tests again**

Run:

```bash
cd development/service-settlement-registry
./.venv312/bin/python manage.py test settlementregistry.tests.test_models -v 2
```

Expected:

- PASS for policy/version coverage

- [ ] **Step 5: Commit the policy/version model slice**

```bash
git add development/service-settlement-registry/settlementregistry/models.py \
  development/service-settlement-registry/settlementregistry/migrations \
  development/service-settlement-registry/settlementregistry/tests/test_models.py
git commit -m "feat: add settlement policy registry models"
```

### Task 3: Implement Assignment Invariants

**Files:**
- Modify: `development/service-settlement-registry/settlementregistry/models.py`
- Modify: `development/service-settlement-registry/settlementregistry/migrations/0001_initial.py`
- Modify: `development/service-settlement-registry/settlementregistry/tests/test_models.py`

- [ ] **Step 1: Extend the failing model tests for assignment rules**

Add tests for:

- `company_id` and `fleet_id` required together
- only `published` policy versions can be assigned
- `effective_end_date` may be null
- date interval semantics use half-open range
- overlapping active assignments for the same `company_id + fleet_id` are rejected

Include one explicit overlap test with two active assignments on the same org scope.

- [ ] **Step 2: Run the assignment tests to verify they fail**

Run:

```bash
cd development/service-settlement-registry
./.venv312/bin/python manage.py test settlementregistry.tests.test_models -v 2
```

Expected:

- FAIL on missing assignment model or invariant logic

- [ ] **Step 3: Implement `SettlementPolicyAssignment` and its validation**

Implement:

- foreign key to `SettlementPolicyVersion`
- `company_id`, `fleet_id`
- `effective_start_date`, nullable `effective_end_date`
- `status`
- model validation for published-version-only assignment
- model validation for same-scope overlap rejection
- helper method or manager logic that keeps overlap checking readable

Constraint note:

- organization membership validation against `service-organization-registry` is runtime/API-level behavior, not a local DB foreign key

- [ ] **Step 4: Run the model tests again**

Run:

```bash
cd development/service-settlement-registry
./.venv312/bin/python manage.py test settlementregistry.tests.test_models -v 2
```

Expected:

- PASS for full registry domain invariants

- [ ] **Step 5: Commit the assignment slice**

```bash
git add development/service-settlement-registry/settlementregistry/models.py \
  development/service-settlement-registry/settlementregistry/migrations/0001_initial.py \
  development/service-settlement-registry/settlementregistry/tests/test_models.py
git commit -m "feat: add settlement policy assignment rules"
```

### Task 4: Implement Admin CRUD API

**Files:**
- Create: `development/service-settlement-registry/settlementregistry/serializers.py`
- Modify: `development/service-settlement-registry/settlementregistry/views.py`
- Modify: `development/service-settlement-registry/settlementregistry/urls.py`
- Create: `development/service-settlement-registry/settlementregistry/tests/test_settlement_registry_api.py`
- Create: `development/service-settlement-registry/settlementregistry/tests/test_source_clients.py`
- Modify: `development/service-settlement-registry/settlementregistry/authentication.py`
- Modify: `development/service-settlement-registry/settlementregistry/permissions.py`
- Modify: `development/service-settlement-registry/config/settings.py`
- Create: `development/service-settlement-registry/settlementregistry/services/__init__.py`
- Create: `development/service-settlement-registry/settlementregistry/services/source_clients.py`

- [ ] **Step 1: Write failing API tests**

Create `development/service-settlement-registry/settlementregistry/tests/test_settlement_registry_api.py` covering:

- health is public
- policies CRUD requires admin auth
- policy versions CRUD requires admin auth
- assignments CRUD requires admin auth
- authenticated non-admin users are rejected for `GET`, `POST`, and `PATCH`
- assignment create rejects non-published version
- assignment create rejects overlapping interval
- assignment create rejects unknown or mismatched `company_id` / `fleet_id`

Use the current account-auth login flow only as a token source. This runtime itself must enforce admin-only management permissions on all CRUD endpoints. Include one unauthenticated denial test, one authenticated non-admin denial test, and one admin-authorized success test per endpoint family.

- [ ] **Step 2: Run the API tests to verify they fail**

Run:

```bash
cd development/service-settlement-registry
./.venv312/bin/python manage.py test settlementregistry.tests.test_settlement_registry_api -v 2
```

Expected:

- FAIL because serializers, viewsets, and auth wiring are incomplete

- [ ] **Step 3: Write the failing organization lookup client test**

Create `development/service-settlement-registry/settlementregistry/tests/test_source_clients.py` covering:

- organization lookup client forwards the caller token
- unknown `company_id` / `fleet_id` returns a stable validation failure
- mismatched company-fleet membership returns a stable validation failure

- [ ] **Step 4: Run the source client test to verify it fails**

Run:

```bash
cd development/service-settlement-registry
./.venv312/bin/python manage.py test settlementregistry.tests.test_source_clients -v 2
```

Expected:

- FAIL because the lookup helper does not exist yet

- [ ] **Step 5: Implement serializers, source client, and CRUD views**

Implement:

- `SettlementPolicySerializer`
- `SettlementPolicyVersionSerializer`
- `SettlementPolicyAssignmentSerializer`
- organization lookup helper in `settlementregistry/services/source_clients.py`
- DRF views or viewsets for list/create/detail/partial-update
- health view remains separate and open

Implementation rules:

- CRUD endpoints are admin-only management endpoints
- assignment serializer validates organization reference existence and company-fleet membership via `service-organization-registry` lookup client
- API returns stable validation errors for overlap and unpublished-version cases
- lookup client uses configured organization base URL and forwards the inbound admin token instead of inventing a new machine-auth path

- [ ] **Step 6: Run the source client and API tests again**

Run:

```bash
cd development/service-settlement-registry
./.venv312/bin/python manage.py test settlementregistry.tests.test_source_clients -v 2
./.venv312/bin/python manage.py test settlementregistry.tests.test_settlement_registry_api -v 2
```

Expected:

- PASS

- [ ] **Step 7: Run the full service test suite**

Run:

```bash
cd development/service-settlement-registry
./.venv312/bin/python manage.py test settlementregistry.tests -v 2
```

Expected:

- PASS

- [ ] **Step 8: Commit the API slice**

```bash
git add development/service-settlement-registry/settlementregistry
git commit -m "feat: add settlement registry management api"
```

### Task 5: Add Seed And Local Stack Wiring

**Files:**
- Create: `development/service-settlement-registry/settlementregistry/management/__init__.py`
- Create: `development/service-settlement-registry/settlementregistry/management/commands/__init__.py`
- Create: `development/service-settlement-registry/settlementregistry/management/commands/seed_settlement_registry.py`
- Create: `development/service-settlement-registry/settlementregistry/tests/test_seed_settlement_registry_command.py`
- Modify: `development/integration-local-stack/docker-compose.account-driver-settlement.yml`
- Create: `development/integration-local-stack/infra/env/settlement-registry.env.example`
- Modify: `development/integration-local-stack/infra/docker/seed-runner/run-seed.sh`
- Modify: `development/integration-local-stack/compose/README.md`
- Modify: `development/edge-api-gateway/nginx.conf`

- [ ] **Step 1: Write the failing seed-command test**

Create `development/service-settlement-registry/settlementregistry/tests/test_seed_settlement_registry_command.py` to verify:

- the command creates at least one policy, one published version, and one assignment
- the command is idempotent
- seeded `company_id` and `fleet_id` align with the existing local stack seeded organization IDs

- [ ] **Step 2: Run the seed-command test to verify it fails**

Run:

```bash
cd development/service-settlement-registry
./.venv312/bin/python manage.py test settlementregistry.tests.test_seed_settlement_registry_command -v 2
```

Expected:

- FAIL because the command does not exist yet

- [ ] **Step 3: Implement the seed command**

Add `seed_settlement_registry` that creates:

- one active policy
- one published version with example `rule_payload`
- one open-ended active assignment for the seeded organization scope starting on `2026-03-24`

Log output should clearly say registry bootstrap data was seeded.

- [ ] **Step 4: Wire the service into local stack and gateway**

Update:

- `development/integration-local-stack/docker-compose.account-driver-settlement.yml`
- `development/integration-local-stack/infra/env/settlement-registry.env.example`
- `development/integration-local-stack/infra/docker/seed-runner/run-seed.sh`
- `development/edge-api-gateway/nginx.conf`
- `development/integration-local-stack/compose/README.md`

Wiring requirements:

- add `settlement-registry-api` service
- add dedicated `settlement-registry-db` Postgres service
- wire `settlement-registry-api` to `settlement-registry-db` with explicit `POSTGRES_HOST` and `depends_on`
- expose it behind `/api/settlement-registry/`
- add env for `service-organization-registry` base URL used by assignment validation
- extend `seed-runner` so local bootstrap remains one-command
- include env/example entries following the current stack conventions

- [ ] **Step 5: Run the seed test and full service test suite**

Run:

```bash
cd development/service-settlement-registry
./.venv312/bin/python manage.py test settlementregistry.tests -v 2
```

Expected:

- PASS

- [ ] **Step 6: Commit the seed and wiring slice**

```bash
git add development/service-settlement-registry/settlementregistry/management \
  development/service-settlement-registry/settlementregistry/tests/test_seed_settlement_registry_command.py \
  development/integration-local-stack \
  development/edge-api-gateway/nginx.conf
git commit -m "feat: wire settlement registry into local stack"
```

### Task 6: Update Platform Docs And Run End-To-End Verification

**Files:**
- Modify: `development/service-settlement-registry/README.md`
- Modify: `docs/mappings/current-runtime-inventory.md`
- Modify: `docs/mappings/current-to-target-repo-map.md`
- Modify: `docs/mappings/repo-responsibility-matrix.md`
- Modify: `repo-map.md`
- Modify: `WORKSPACE.md`

- [ ] **Step 1: Update service-local and platform docs**

Update the documents so they reflect:

- `service-settlement-registry` is an active runtime
- it owns policy, version, and assignment registry only
- organization IDs are reference-only keys
- current-to-target map no longer describes it as empty shell / decompose-first waiting state

- [ ] **Step 2: Verify service tests still pass**

Run:

```bash
cd development/service-settlement-registry
./.venv312/bin/python manage.py test settlementregistry.tests -v 2
```

Expected:

- PASS

- [ ] **Step 3: Verify compose config**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/.worktrees/document-ownership-transition-spec
docker compose -f development/integration-local-stack/docker-compose.account-driver-settlement.yml config
```

Expected:

- PASS

- [ ] **Step 4: Build and run the new service in local stack**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/.worktrees/document-ownership-transition-spec
docker compose -f development/integration-local-stack/docker-compose.account-driver-settlement.yml build settlement-registry-api gateway
docker compose -f development/integration-local-stack/docker-compose.account-driver-settlement.yml up -d settlement-registry-api gateway
```

Expected:

- build succeeds
- the new registry container and gateway are healthy

- [ ] **Step 5: Seed and smoke-test through the gateway**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/.worktrees/document-ownership-transition-spec
docker compose -f development/integration-local-stack/docker-compose.account-driver-settlement.yml run --rm seed-runner
```

Then verify:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/.worktrees/document-ownership-transition-spec
ADMIN_TOKEN=$(curl -sS -X POST http://localhost:8080/api/auth/login/ \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com","password":"change-me"}' | python -c 'import json,sys; print(json.load(sys.stdin)["access_token"])')
POLICY_VERSION_ID=$(curl -sS http://localhost:8080/api/settlement-registry/policy-versions/ \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" | python -c 'import json,sys; print(json.load(sys.stdin)[0]["policy_version_id"])')
curl -i -sS http://localhost:8080/api/settlement-registry/health/
curl -i -sS http://localhost:8080/api/settlement-registry/policies/ \
  -H "Authorization: Bearer ${ADMIN_TOKEN}"
curl -i -sS -X POST http://localhost:8080/api/settlement-registry/policy-assignments/ \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -d "{\"policy_version_id\":\"${POLICY_VERSION_ID}\",\"company_id\":\"30000000-0000-0000-0000-000000000001\",\"fleet_id\":\"40000000-0000-0000-0000-000000000001\",\"effective_start_date\":\"2026-03-24\",\"status\":\"active\"}"
```

Expected:

- seed-runner completes successfully and includes settlement-registry migrate/seed steps
- `GET /api/settlement-registry/health/` returns `200`
- admin-authenticated `GET /api/settlement-registry/policies/` returns seeded data
- overlapping assignment create is rejected with a stable validation error

- [ ] **Step 6: Verify docs and repo state**

Run:

```bash
rg -n "service-settlement-registry|settlement-registry-api|/api/settlement-registry/" \
  WORKSPACE.md repo-map.md docs/mappings/current-runtime-inventory.md \
  docs/mappings/current-to-target-repo-map.md docs/mappings/repo-responsibility-matrix.md \
  development/service-settlement-registry/README.md development/integration-local-stack/compose/README.md \
  development/edge-api-gateway/nginx.conf development/integration-local-stack/docker-compose.account-driver-settlement.yml
git status --short
```

Expected:

- updated runtime naming and ownership appear in all required docs
- working tree is clean after the final commit

- [ ] **Step 7: Commit the docs and verification slice**

```bash
git add development/service-settlement-registry/README.md \
  WORKSPACE.md repo-map.md docs/mappings/current-runtime-inventory.md \
  docs/mappings/current-to-target-repo-map.md docs/mappings/repo-responsibility-matrix.md \
  development/integration-local-stack/compose/README.md
git commit -m "docs: promote settlement registry to active runtime"
```
