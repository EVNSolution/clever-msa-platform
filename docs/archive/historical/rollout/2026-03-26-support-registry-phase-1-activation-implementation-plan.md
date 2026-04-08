# Support Registry Phase 1 Activation Implementation Plan

**Goal:** `service-support-registry`를 empty shell에서 지원 정본 runtime으로 승격하고, `/api/ticket/` CRUD, local stack 연결, API docs 반영까지 완료한다.

**Architecture:** 새 runtime은 기존 Django/DRF 서비스 패턴을 그대로 따른다. `service-support-registry`는 `SupportTicket`, `SupportTicketResponse`만 소유하고, notification fan-out과 support read-model은 포함하지 않는다. compose/gateway/API docs만 최소 범위로 연결한다.

**Tech Stack:** Python 3.12, Django, Django REST Framework, drf-spectacular, PostgreSQL, Docker Compose, Nginx, `manage.py test`, local unified OpenAPI scripts

## File Structure

- Create: `development/service-support-registry/Dockerfile`
- Create: `development/service-support-registry/entrypoint.sh`
- Create: `development/service-support-registry/manage.py`
- Create: `development/service-support-registry/requirements.txt`
- Create: `development/service-support-registry/config/__init__.py`
- Create: `development/service-support-registry/config/asgi.py`
- Create: `development/service-support-registry/config/settings.py`
- Create: `development/service-support-registry/config/urls.py`
- Create: `development/service-support-registry/config/wsgi.py`
- Create: `development/service-support-registry/supporttickets/__init__.py`
- Create: `development/service-support-registry/supporttickets/apps.py`
- Create: `development/service-support-registry/supporttickets/authentication.py`
- Create: `development/service-support-registry/supporttickets/exceptions.py`
- Create: `development/service-support-registry/supporttickets/models.py`
- Create: `development/service-support-registry/supporttickets/permissions.py`
- Create: `development/service-support-registry/supporttickets/serializers.py`
- Create: `development/service-support-registry/supporttickets/urls.py`
- Create: `development/service-support-registry/supporttickets/views.py`
- Create: `development/service-support-registry/supporttickets/migrations/__init__.py`
- Create: `development/service-support-registry/supporttickets/migrations/0001_initial.py`
- Create: `development/service-support-registry/supporttickets/management/__init__.py`
- Create: `development/service-support-registry/supporttickets/management/commands/__init__.py`
- Create: `development/service-support-registry/supporttickets/management/commands/seed_support.py`
- Create: `development/service-support-registry/supporttickets/tests/__init__.py`
- Create: `development/service-support-registry/supporttickets/tests/test_health_api.py`
- Create: `development/service-support-registry/supporttickets/tests/test_models.py`
- Create: `development/service-support-registry/supporttickets/tests/test_ticket_api.py`
- Create: `development/service-support-registry/supporttickets/tests/test_seed_support_command.py`
- Modify: `development/service-support-registry/README.md`
- Modify: `development/integration-local-stack/docker-compose.account-driver-settlement.yml`
- Create: `development/integration-local-stack/infra/env/support-registry.env.example`
- Modify: `development/integration-local-stack/infra/docker/seed-runner/Dockerfile`
- Modify: `development/integration-local-stack/infra/docker/seed-runner/run-seed.sh`
- Modify: `development/integration-local-stack/compose/README.md`
- Modify: `development/edge-api-gateway/nginx.conf`
- Modify: `docs/mappings/current-runtime-inventory.md`
- Modify: `docs/mappings/current-to-target-repo-map.md`
- Modify: `repo-map.md`
- Modify: `WORKSPACE.md`

## Tasks

### 1. Bootstrap runtime

- health endpoint 열기
- Django/DRF 기본 skeleton 붙이기
- `drf-spectacular` export 가능하게 settings 고정

### 2. Implement support truth

- `SupportTicket`, `SupportTicketResponse` aggregate 추가
- status / priority / response validation 추가
- authenticated create / own read / admin patch 기준 구현

### 3. Add deterministic seed

- ticket 2건, response 1건 고정 seed 추가
- seed idempotency 테스트 추가

### 4. Integrate local stack

- compose service / db 추가
- gateway `/api/ticket/` route 추가
- seed-runner에 migrate + `seed_support` 추가

### 5. Reflect docs and OpenAPI

- current runtime / repo map 반영
- unified OpenAPI schema-enabled service로 추가
- refresh / verify 통과

### 6. Verify end-to-end

- `manage.py test supporttickets.tests -v 2`
- `docker compose ... config`
- `refresh_api_docs.py --service service-support-registry`
- compose up 후 gateway 경유 `health`, `login`, `list`
