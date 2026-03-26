# Announcement Registry Phase 1 Activation Implementation Plan

**Goal:** `service-announcement-registry`를 empty shell에서 공지 게시 정본 runtime으로 승격하고, `/api/announcements/` CRUD, local stack 연결, API docs 반영까지 완료한다.

**Architecture:** 새 runtime은 기존 Django/DRF 서비스 패턴을 그대로 따른다. `service-announcement-registry`는 `Announcement` 단일 aggregate만 소유하고, notification fan-out과 support workflow는 포함하지 않는다. compose/gateway/API docs만 최소 범위로 연결한다.

**Tech Stack:** Python 3.12, Django, Django REST Framework, drf-spectacular, PostgreSQL, Docker Compose, Nginx, `manage.py test`, local unified OpenAPI scripts

## File Structure

- Create: `development/service-announcement-registry/Dockerfile`
- Create: `development/service-announcement-registry/entrypoint.sh`
- Create: `development/service-announcement-registry/manage.py`
- Create: `development/service-announcement-registry/requirements.txt`
- Create: `development/service-announcement-registry/config/__init__.py`
- Create: `development/service-announcement-registry/config/asgi.py`
- Create: `development/service-announcement-registry/config/settings.py`
- Create: `development/service-announcement-registry/config/urls.py`
- Create: `development/service-announcement-registry/config/wsgi.py`
- Create: `development/service-announcement-registry/announcements/__init__.py`
- Create: `development/service-announcement-registry/announcements/apps.py`
- Create: `development/service-announcement-registry/announcements/authentication.py`
- Create: `development/service-announcement-registry/announcements/exceptions.py`
- Create: `development/service-announcement-registry/announcements/models.py`
- Create: `development/service-announcement-registry/announcements/permissions.py`
- Create: `development/service-announcement-registry/announcements/serializers.py`
- Create: `development/service-announcement-registry/announcements/urls.py`
- Create: `development/service-announcement-registry/announcements/views.py`
- Create: `development/service-announcement-registry/announcements/migrations/__init__.py`
- Create: `development/service-announcement-registry/announcements/migrations/0001_initial.py`
- Create: `development/service-announcement-registry/announcements/management/__init__.py`
- Create: `development/service-announcement-registry/announcements/management/commands/__init__.py`
- Create: `development/service-announcement-registry/announcements/management/commands/seed_announcements.py`
- Create: `development/service-announcement-registry/announcements/tests/__init__.py`
- Create: `development/service-announcement-registry/announcements/tests/test_health_api.py`
- Create: `development/service-announcement-registry/announcements/tests/test_models.py`
- Create: `development/service-announcement-registry/announcements/tests/test_announcement_api.py`
- Create: `development/service-announcement-registry/announcements/tests/test_seed_announcements_command.py`
- Modify: `development/service-announcement-registry/README.md`
- Modify: `development/integration-local-stack/docker-compose.account-driver-settlement.yml`
- Create: `development/integration-local-stack/infra/env/announcement-registry.env.example`
- Modify: `development/integration-local-stack/infra/docker/seed-runner/Dockerfile`
- Modify: `development/integration-local-stack/infra/docker/seed-runner/run-seed.sh`
- Modify: `development/integration-local-stack/compose/README.md`
- Modify: `development/edge-api-gateway/nginx.conf`
- Modify: `docs/mappings/current-runtime-inventory.md`
- Modify: `docs/mappings/current-to-target-repo-map.md`
- Modify: `docs/mappings/repo-responsibility-matrix.md`
- Modify: `repo-map.md`
- Modify: `WORKSPACE.md`

## Tasks

### 1. Bootstrap runtime

- health endpoint 열기
- Django/DRF 기본 skeleton 붙이기
- `drf-spectacular` export 가능하게 settings 고정

### 2. Implement announcement truth

- `Announcement` aggregate 추가
- publish / exposure validation 추가
- admin-only list/create/detail/patch API 추가

### 3. Add deterministic seed

- published 1건, draft 1건 고정 seed 추가
- seed idempotency 테스트 추가

### 4. Integrate local stack

- compose service / db 추가
- gateway `/api/announcements/` route 추가
- seed-runner에 migrate + `seed_announcements` 추가

### 5. Reflect docs and OpenAPI

- current runtime / repo map / responsibility matrix 반영
- unified OpenAPI schema-enabled service로 추가
- refresh / verify 통과

### 6. Verify end-to-end

- `manage.py test announcements.tests -v 2`
- `docker compose ... config`
- `refresh_api_docs.py --service service-announcement-registry`
- compose up 후 gateway 경유 `health`, `login`, `list`
