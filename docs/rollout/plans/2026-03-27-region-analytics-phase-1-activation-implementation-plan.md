# Region Analytics Phase 1 Activation Implementation Plan

**Goal:** `service-region-analytics`를 empty shell에서 권역 분석 runtime으로 승격하고, `/api/region-analytics/` CRUD, local stack 연결, API docs 반영까지 완료한다.

**Architecture:** 새 runtime은 기존 Django/DRF 서비스 패턴을 그대로 따른다. `service-region-analytics`는 `RegionDailyStatistic`, `RegionPerformanceSummary`만 소유하고, region master writes나 dispatch/delivery 자동 fan-in은 포함하지 않는다. compose/gateway/API docs만 최소 범위로 연결한다.

**Tech Stack:** Python 3.12, Django, Django REST Framework, drf-spectacular, PostgreSQL, Docker Compose, Nginx, `manage.py test`, local unified OpenAPI scripts

## File Structure

- Create: `development/service-region-analytics/Dockerfile`
- Create: `development/service-region-analytics/entrypoint.sh`
- Create: `development/service-region-analytics/manage.py`
- Create: `development/service-region-analytics/requirements.txt`
- Create: `development/service-region-analytics/config/__init__.py`
- Create: `development/service-region-analytics/config/asgi.py`
- Create: `development/service-region-analytics/config/settings.py`
- Create: `development/service-region-analytics/config/urls.py`
- Create: `development/service-region-analytics/config/wsgi.py`
- Create: `development/service-region-analytics/regionanalytics/__init__.py`
- Create: `development/service-region-analytics/regionanalytics/apps.py`
- Create: `development/service-region-analytics/regionanalytics/authentication.py`
- Create: `development/service-region-analytics/regionanalytics/exceptions.py`
- Create: `development/service-region-analytics/regionanalytics/models.py`
- Create: `development/service-region-analytics/regionanalytics/permissions.py`
- Create: `development/service-region-analytics/regionanalytics/serializers.py`
- Create: `development/service-region-analytics/regionanalytics/urls.py`
- Create: `development/service-region-analytics/regionanalytics/views.py`
- Create: `development/service-region-analytics/regionanalytics/migrations/__init__.py`
- Create: `development/service-region-analytics/regionanalytics/management/__init__.py`
- Create: `development/service-region-analytics/regionanalytics/management/commands/__init__.py`
- Create: `development/service-region-analytics/regionanalytics/management/commands/seed_region_analytics.py`
- Create: `development/service-region-analytics/regionanalytics/tests/__init__.py`
- Create: `development/service-region-analytics/regionanalytics/tests/test_health_api.py`
- Create: `development/service-region-analytics/regionanalytics/tests/test_models.py`
- Create: `development/service-region-analytics/regionanalytics/tests/test_region_analytics_api.py`
- Create: `development/service-region-analytics/regionanalytics/tests/test_seed_region_analytics_command.py`
- Modify: `development/service-region-analytics/README.md`
- Modify: `development/integration-local-stack/docker-compose.account-driver-settlement.yml`
- Create: `development/integration-local-stack/infra/env/region-analytics.env.example`
- Modify: `development/integration-local-stack/infra/docker/seed-runner/Dockerfile`
- Modify: `development/integration-local-stack/infra/docker/seed-runner/run-seed.sh`
- Modify: `development/integration-local-stack/compose/README.md`
- Modify: `development/edge-api-gateway/nginx.conf`
- Modify: `development/integration-local-stack/scripts/build_unified_openapi.py`
- Modify: `docs/mappings/current-runtime-inventory.md`
- Modify: `docs/mappings/current-to-target-repo-map.md`
- Modify: `docs/mappings/repo-responsibility-matrix.md`
- Modify: `repo-map.md`
- Modify: `WORKSPACE.md`
- Modify: `docs/rollout/09-remaining-empty-shell-service-priority.md`

## Tasks

### 1. Bootstrap runtime

- health endpoint 열기
- Django/DRF 기본 skeleton 붙이기
- `drf-spectacular` export 가능하게 settings 고정

### 2. Implement analytics snapshot truth

- `RegionDailyStatistic`, `RegionPerformanceSummary` aggregate 추가
- count / date / rate validation 추가
- admin-only CRUD와 filter 구현

### 3. Add deterministic seed

- region-registry seed와 맞는 analytics snapshot 4건 추가
- seed idempotency 테스트 추가

### 4. Integrate local stack

- compose service / db 추가
- gateway `/api/region-analytics/` route 추가
- seed-runner에 migrate + `seed_region_analytics` 추가

### 5. Reflect docs and OpenAPI

- current runtime / repo map / remaining empty-shell docs 반영
- unified OpenAPI schema-enabled service로 추가
- refresh / verify 통과

### 6. Verify end-to-end

- `manage.py test regionanalytics.tests -v 2`
- `docker compose ... config`
- `refresh_api_docs.py --service service-region-analytics`
- compose up 후 gateway 경유 `health`, `login`, `list`
- feature 단위 commit
