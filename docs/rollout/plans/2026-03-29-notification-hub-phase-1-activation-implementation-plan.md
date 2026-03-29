# Notification Hub Phase 1 Activation Implementation Plan

**Goal:** `service-notification-hub`를 empty shell에서 알림 채널 runtime으로 승격하고, `/api/notifications/` CRUD, local stack 연결, API docs 반영까지 완료한다.

**Architecture:** 새 runtime은 기존 Django/DRF 서비스 패턴을 그대로 따른다. `service-notification-hub`는 `PushTokenRegistration`, `GeneralNotification`, `PushDeliveryLog`만 소유하고, announcement/support truth와 외부 provider integration은 포함하지 않는다. compose/gateway/API docs만 최소 범위로 연결한다.

**Tech Stack:** Python 3.12, Django, Django REST Framework, drf-spectacular, PostgreSQL, Docker Compose, Nginx, `manage.py test`, local unified OpenAPI scripts

## File Structure

- Create: `development/service-notification-hub/Dockerfile`
- Create: `development/service-notification-hub/entrypoint.sh`
- Create: `development/service-notification-hub/manage.py`
- Create: `development/service-notification-hub/requirements.txt`
- Create: `development/service-notification-hub/config/__init__.py`
- Create: `development/service-notification-hub/config/asgi.py`
- Create: `development/service-notification-hub/config/settings.py`
- Create: `development/service-notification-hub/config/urls.py`
- Create: `development/service-notification-hub/config/wsgi.py`
- Create: `development/service-notification-hub/notifications/__init__.py`
- Create: `development/service-notification-hub/notifications/apps.py`
- Create: `development/service-notification-hub/notifications/authentication.py`
- Create: `development/service-notification-hub/notifications/exceptions.py`
- Create: `development/service-notification-hub/notifications/models.py`
- Create: `development/service-notification-hub/notifications/permissions.py`
- Create: `development/service-notification-hub/notifications/serializers.py`
- Create: `development/service-notification-hub/notifications/urls.py`
- Create: `development/service-notification-hub/notifications/views.py`
- Create: `development/service-notification-hub/notifications/migrations/__init__.py`
- Create: `development/service-notification-hub/notifications/migrations/0001_initial.py`
- Create: `development/service-notification-hub/notifications/management/__init__.py`
- Create: `development/service-notification-hub/notifications/management/commands/__init__.py`
- Create: `development/service-notification-hub/notifications/management/commands/seed_notifications.py`
- Create: `development/service-notification-hub/notifications/tests/__init__.py`
- Create: `development/service-notification-hub/notifications/tests/test_health_api.py`
- Create: `development/service-notification-hub/notifications/tests/test_models.py`
- Create: `development/service-notification-hub/notifications/tests/test_notification_api.py`
- Create: `development/service-notification-hub/notifications/tests/test_seed_notifications_command.py`
- Modify: `development/service-notification-hub/README.md`
- Modify: `development/integration-local-stack/docker-compose.account-driver-settlement.yml`
- Create: `development/integration-local-stack/infra/env/notification-hub.env.example`
- Modify: `development/integration-local-stack/infra/docker/seed-runner/Dockerfile`
- Modify: `development/integration-local-stack/infra/docker/seed-runner/run-seed.sh`
- Modify: `development/integration-local-stack/compose/README.md`
- Modify: `development/edge-api-gateway/nginx.conf`
- Modify: `development/integration-local-stack/scripts/build_unified_openapi.py`
- Modify: `docs/mappings/current-runtime-inventory.md`
- Modify: `docs/mappings/current-to-target-repo-map.md`
- Modify: `docs/mappings/repo-responsibility-matrix.md`
- Modify: `docs/rollout/09-remaining-empty-shell-service-priority.md`
- Modify: `repo-map.md`
- Modify: `WORKSPACE.md`

## Tasks

### 1. Bootstrap runtime

- health endpoint 열기
- Django/DRF 기본 skeleton 붙이기
- `drf-spectacular` export 가능하게 settings 고정

### 2. Implement notification channel truth

- `PushTokenRegistration`, `GeneralNotification`, `PushDeliveryLog` aggregate 추가
- own token / own inbox permission 구현
- admin send / log read / inbox create 기준 구현

### 3. Add deterministic seed

- token 2건, inbox 2건, log 1건 고정 seed 추가
- seed idempotency 테스트 추가

### 4. Integrate local stack

- compose service / db 추가
- gateway `/api/notifications/` route 추가
- seed-runner에 migrate + `seed_notifications` 추가

### 5. Reflect docs and OpenAPI

- current runtime / repo map 반영
- unified OpenAPI schema-enabled service로 추가
- refresh / verify 통과

### 6. Verify end-to-end

- `manage.py test notifications.tests -v 2`
- `docker compose ... config`
- `refresh_api_docs.py --service service-notification-hub`
- compose up 후 gateway 경유 `health`, `login`, `token create`, `inbox list`, `push send`, `push log list`
