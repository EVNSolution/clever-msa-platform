# Region Registry Phase 1 Activation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `service-region-registry`를 empty shell에서 권역 기준 정본 runtime으로 승격하고, `/api/regions/` CRUD, local stack 연결, API docs 반영까지 완료한다.

**Architecture:** 새 runtime은 기존 Django/DRF 서비스 패턴을 그대로 따른다. `service-region-registry`는 `Region` 단일 aggregate만 소유하고, polygon은 PostGIS가 아닌 GeoJSON JSON payload로 저장한다. analytics와 route knowledge는 이번 배치에 포함하지 않고, compose/gateway/API docs만 최소 범위로 연결한다.

**Tech Stack:** Python 3.12, Django, Django REST Framework, drf-spectacular, PostgreSQL, Docker Compose, Nginx, `manage.py test`, local unified OpenAPI scripts

---

## File Structure

이번 구현은 아래 파일 구조를 기준으로 진행한다.

- Create: `development/service-region-registry/Dockerfile`
- Create: `development/service-region-registry/entrypoint.sh`
- Create: `development/service-region-registry/manage.py`
- Create: `development/service-region-registry/requirements.txt`
- Create: `development/service-region-registry/config/__init__.py`
- Create: `development/service-region-registry/config/asgi.py`
- Create: `development/service-region-registry/config/settings.py`
- Create: `development/service-region-registry/config/urls.py`
- Create: `development/service-region-registry/config/wsgi.py`
- Create: `development/service-region-registry/regions/__init__.py`
- Create: `development/service-region-registry/regions/apps.py`
- Create: `development/service-region-registry/regions/authentication.py`
- Create: `development/service-region-registry/regions/exceptions.py`
- Create: `development/service-region-registry/regions/models.py`
- Create: `development/service-region-registry/regions/permissions.py`
- Create: `development/service-region-registry/regions/serializers.py`
- Create: `development/service-region-registry/regions/urls.py`
- Create: `development/service-region-registry/regions/views.py`
- Create: `development/service-region-registry/regions/migrations/__init__.py`
- Create: `development/service-region-registry/regions/migrations/0001_initial.py`
- Create: `development/service-region-registry/regions/management/__init__.py`
- Create: `development/service-region-registry/regions/management/commands/__init__.py`
- Create: `development/service-region-registry/regions/management/commands/seed_regions.py`
- Create: `development/service-region-registry/regions/tests/__init__.py`
- Create: `development/service-region-registry/regions/tests/test_health_api.py`
- Create: `development/service-region-registry/regions/tests/test_models.py`
- Create: `development/service-region-registry/regions/tests/test_region_api.py`
- Create: `development/service-region-registry/regions/tests/test_seed_regions_command.py`
- Modify: `development/service-region-registry/README.md`
- Modify: `development/integration-local-stack/docker-compose.account-driver-settlement.yml`
- Create: `development/integration-local-stack/infra/env/region-registry.env.example`
- Modify: `development/integration-local-stack/infra/docker/seed-runner/run-seed.sh`
- Modify: `development/integration-local-stack/compose/README.md`
- Modify: `development/edge-api-gateway/nginx.conf`
- Modify: `docs/mappings/current-runtime-inventory.md`
- Modify: `docs/mappings/current-to-target-repo-map.md`
- Modify: `docs/mappings/repo-responsibility-matrix.md`
- Modify: `repo-map.md`
- Modify: `WORKSPACE.md`

### Task 1: Bootstrap The Runtime Skeleton

**Files:**
- Create: `development/service-region-registry/Dockerfile`
- Create: `development/service-region-registry/entrypoint.sh`
- Create: `development/service-region-registry/manage.py`
- Create: `development/service-region-registry/requirements.txt`
- Create: `development/service-region-registry/config/__init__.py`
- Create: `development/service-region-registry/config/asgi.py`
- Create: `development/service-region-registry/config/settings.py`
- Create: `development/service-region-registry/config/urls.py`
- Create: `development/service-region-registry/config/wsgi.py`
- Create: `development/service-region-registry/regions/__init__.py`
- Create: `development/service-region-registry/regions/apps.py`
- Create: `development/service-region-registry/regions/authentication.py`
- Create: `development/service-region-registry/regions/exceptions.py`
- Create: `development/service-region-registry/regions/permissions.py`
- Create: `development/service-region-registry/regions/urls.py`
- Create: `development/service-region-registry/regions/views.py`
- Create: `development/service-region-registry/regions/tests/__init__.py`
- Create: `development/service-region-registry/regions/tests/test_health_api.py`

- [ ] **Step 1: Write the failing health API test**

Create `development/service-region-registry/regions/tests/test_health_api.py` with a health endpoint expectation:

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
cd development/service-region-registry
python3.12 -m venv .venv312
./.venv312/bin/pip install Django djangorestframework drf-spectacular
./.venv312/bin/python -m unittest regions.tests.test_health_api
```

Expected:

- fail because settings, URL wiring, and runtime bootstrap do not exist yet

- [ ] **Step 3: Copy the minimal Django/DRF service skeleton from the established service pattern**

Use `development/service-dispatch-registry/` and `development/service-settlement-registry/` as reference patterns and add:

- service bootstrap files (`Dockerfile`, `entrypoint.sh`, `manage.py`, `requirements.txt`)
- `config/` package with Django settings, root URLs, and drf-spectacular setup
- `regions/` package with app config, auth, permissions, exceptions, URLs, and a health view

Implementation requirements:

- root URL path must mount service-internal paths only
- app URL path must expose `health/`
- external `/api/regions/` prefix is the gateway concern only
- CRUD endpoints remain admin-only, but `health/` stays open

- [ ] **Step 4: Run the health test again**

Run:

```bash
cd development/service-region-registry
./.venv312/bin/pip install -r requirements.txt
./.venv312/bin/python manage.py test regions.tests.test_health_api -v 2
```

Expected:

- PASS

- [ ] **Step 5: Commit the bootstrap**

```bash
git add development/service-region-registry
git commit -m "feat: bootstrap region registry runtime"
```

### Task 2: Implement The Region Model And Validation

**Files:**
- Create: `development/service-region-registry/regions/models.py`
- Create: `development/service-region-registry/regions/migrations/__init__.py`
- Create: `development/service-region-registry/regions/migrations/0001_initial.py`
- Create: `development/service-region-registry/regions/tests/test_models.py`

- [ ] **Step 1: Write failing model tests for region rules**

Create `development/service-region-registry/regions/tests/test_models.py` with tests for:

- `Region` create/read basics
- `region_code` uniqueness
- `difficulty_level` choices
- `polygon_geojson` accepts `Polygon`
- `polygon_geojson` accepts `MultiPolygon`
- invalid geometry type is rejected

Include at least one test shaped like:

```python
def test_region_rejects_non_polygon_geojson():
    region = Region(
        region_code="seo-01",
        name="Seoul Test",
        status=Region.Status.ACTIVE,
        difficulty_level=Region.DifficultyLevel.MEDIUM,
        polygon_geojson={"type": "Point", "coordinates": [127.0, 37.5]},
    )

    with pytest.raises(ValidationError):
        region.full_clean()
```

- [ ] **Step 2: Run the model tests to verify they fail**

Run:

```bash
cd development/service-region-registry
./.venv312/bin/python manage.py test regions.tests.test_models -v 2
```

Expected:

- FAIL because models and migration do not exist yet

- [ ] **Step 3: Implement `Region` and its validation**

Add model and initial migration with:

- UUID primary key
- `region_code`, `name`, `status`, `difficulty_level`, `polygon_geojson`, `description`, `display_order`
- DB-level uniqueness for `region_code`
- model-level validation for GeoJSON `Polygon` or `MultiPolygon` only

- [ ] **Step 4: Run the model tests again**

Run:

```bash
cd development/service-region-registry
./.venv312/bin/python manage.py test regions.tests.test_models -v 2
```

Expected:

- PASS

- [ ] **Step 5: Commit the model slice**

```bash
git add development/service-region-registry/regions/models.py \
  development/service-region-registry/regions/migrations \
  development/service-region-registry/regions/tests/test_models.py
git commit -m "feat: add region registry model"
```

### Task 3: Implement Admin CRUD API

**Files:**
- Create: `development/service-region-registry/regions/serializers.py`
- Modify: `development/service-region-registry/regions/views.py`
- Modify: `development/service-region-registry/regions/urls.py`
- Create: `development/service-region-registry/regions/tests/test_region_api.py`
- Modify: `development/service-region-registry/regions/authentication.py`
- Modify: `development/service-region-registry/regions/permissions.py`
- Modify: `development/service-region-registry/config/settings.py`

- [ ] **Step 1: Write failing API tests**

Create `development/service-region-registry/regions/tests/test_region_api.py` covering:

- health is public
- region list/create requires admin auth
- region detail/patch requires admin auth
- authenticated non-admin users are rejected
- list filters work for `status`, `difficulty_level`, `region_code`
- invalid polygon payload is rejected

- [ ] **Step 2: Run the API tests to verify they fail**

Run:

```bash
cd development/service-region-registry
./.venv312/bin/python manage.py test regions.tests.test_region_api -v 2
```

Expected:

- FAIL because serializers, views, and auth wiring are incomplete

- [ ] **Step 3: Implement serializers and CRUD views**

Implement:

- `RegionSerializer`
- list/create/detail/partial-update views
- query param filtering for `status`, `difficulty_level`, `region_code`
- `drf-spectacular` schema annotations if needed

Implementation rules:

- CRUD endpoints are admin-only management endpoints
- health view remains separate and open
- API returns stable validation errors for invalid geometry payloads
- no delete endpoint in phase 1

- [ ] **Step 4: Run the API tests again**

Run:

```bash
cd development/service-region-registry
./.venv312/bin/python manage.py test regions.tests.test_region_api -v 2
./.venv312/bin/python manage.py test regions.tests -v 2
```

Expected:

- PASS

- [ ] **Step 5: Commit the API slice**

```bash
git add development/service-region-registry/regions \
  development/service-region-registry/config/settings.py
git commit -m "feat: add region registry management api"
```

### Task 4: Add Seed And Local Stack Wiring

**Files:**
- Create: `development/service-region-registry/regions/management/__init__.py`
- Create: `development/service-region-registry/regions/management/commands/__init__.py`
- Create: `development/service-region-registry/regions/management/commands/seed_regions.py`
- Create: `development/service-region-registry/regions/tests/test_seed_regions_command.py`
- Modify: `development/integration-local-stack/docker-compose.account-driver-settlement.yml`
- Create: `development/integration-local-stack/infra/env/region-registry.env.example`
- Modify: `development/integration-local-stack/infra/docker/seed-runner/run-seed.sh`
- Modify: `development/integration-local-stack/compose/README.md`
- Modify: `development/edge-api-gateway/nginx.conf`

- [ ] **Step 1: Write the failing seed-command test**

Create `development/service-region-registry/regions/tests/test_seed_regions_command.py` to verify:

- the command creates at least two regions
- the command is idempotent
- seeded data includes both `Polygon` and `MultiPolygon`

- [ ] **Step 2: Run the seed-command test to verify it fails**

Run:

```bash
cd development/service-region-registry
./.venv312/bin/python manage.py test regions.tests.test_seed_regions_command -v 2
```

Expected:

- FAIL because the command does not exist yet

- [ ] **Step 3: Implement the seed command**

Add `seed_regions` that creates:

- one active medium-difficulty polygon region
- one active high-difficulty multipolygon region

Log output should clearly say region registry bootstrap data was seeded.

- [ ] **Step 4: Wire the service into local stack and gateway**

Update:

- `development/integration-local-stack/docker-compose.account-driver-settlement.yml`
- `development/integration-local-stack/infra/env/region-registry.env.example`
- `development/integration-local-stack/infra/docker/seed-runner/run-seed.sh`
- `development/edge-api-gateway/nginx.conf`
- `development/integration-local-stack/compose/README.md`

Wiring requirements:

- add `region-registry-api` service
- add dedicated `region-registry-db` Postgres service
- wire `region-registry-api` to `region-registry-db` with explicit `POSTGRES_HOST` and `depends_on`
- expose it behind `/api/regions/`
- extend `seed-runner` so local bootstrap remains one-command
- include env/example entries following the current stack conventions

- [ ] **Step 5: Run the seed test and full service test suite**

Run:

```bash
cd development/service-region-registry
./.venv312/bin/python manage.py test regions.tests -v 2
```

Expected:

- PASS

- [ ] **Step 6: Commit the seed and wiring slice**

```bash
git add development/service-region-registry/regions/management \
  development/service-region-registry/regions/tests/test_seed_regions_command.py \
  development/integration-local-stack \
  development/edge-api-gateway/nginx.conf
git commit -m "feat: wire region registry into local stack"
```

### Task 5: Update Platform Docs And API Docs Verification

**Files:**
- Modify: `development/service-region-registry/README.md`
- Modify: `docs/mappings/current-runtime-inventory.md`
- Modify: `docs/mappings/current-to-target-repo-map.md`
- Modify: `docs/mappings/repo-responsibility-matrix.md`
- Modify: `repo-map.md`
- Modify: `WORKSPACE.md`

- [ ] **Step 1: Update service-local and platform docs**

Update the documents so they reflect:

- `service-region-registry` is an active runtime
- it owns region polygon/difficulty/master only
- analytics remains separate
- route knowledge remains outside this repo in phase 1

- [ ] **Step 2: Verify service tests still pass**

Run:

```bash
cd development/service-region-registry
./.venv312/bin/python manage.py test regions.tests -v 2
```

Expected:

- PASS

- [ ] **Step 3: Verify compose config**

Run:

```bash
docker compose -f development/integration-local-stack/docker-compose.account-driver-settlement.yml config
```

Expected:

- PASS

- [ ] **Step 4: Refresh local unified API docs**

Run:

```bash
python3 ./development/integration-local-stack/scripts/refresh_api_docs.py --service service-region-registry
```

Expected:

- unified spec refresh succeeds
- `service-region-registry` is included as schema-backed or exported service

- [ ] **Step 5: Preview and smoke-test through the gateway**

Run:

```bash
docker compose -f development/integration-local-stack/docker-compose.account-driver-settlement.yml build region-registry-api gateway
docker compose -f development/integration-local-stack/docker-compose.account-driver-settlement.yml up -d region-registry-api gateway
curl -i -sS http://localhost:8080/api/regions/health/
```

Expected:

- build succeeds
- `GET /api/regions/health/` returns `200`

- [ ] **Step 6: Verify docs and repo state**

Run:

```bash
rg -n "service-region-registry|region-registry-api|/api/regions/" \
  WORKSPACE.md repo-map.md docs/mappings/current-runtime-inventory.md \
  docs/mappings/current-to-target-repo-map.md docs/mappings/repo-responsibility-matrix.md \
  development/service-region-registry/README.md development/integration-local-stack/compose/README.md \
  development/edge-api-gateway/nginx.conf development/integration-local-stack/docker-compose.account-driver-settlement.yml
git status --short
```

Expected:

- updated runtime naming and ownership appear in all required docs
- working tree is clean after the final commit

- [ ] **Step 7: Commit the docs and verification slice**

```bash
git add development/service-region-registry/README.md \
  WORKSPACE.md repo-map.md docs/mappings/current-runtime-inventory.md \
  docs/mappings/current-to-target-repo-map.md docs/mappings/repo-responsibility-matrix.md \
  development/integration-local-stack/compose/README.md
git commit -m "docs: promote region registry to active runtime"
```
