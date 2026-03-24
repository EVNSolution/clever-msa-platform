# Local Django MSA Bootstrap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 현재 `MSA-Server` 디렉토리 안에 독립 Django/DRF 서비스 5개, React/Vite 앱 2개, Nginx gateway, Postgres 5개, Redis 1개, seed-runner를 갖춘 로컬 실행형 MSA 부트스트랩 환경을 유지하되, 최종 범위는 `Company/Fleet-only Organization Master`, `기본 Driver Profile`, `legacy logic-free Settlement placeholder`, `thin Vehicle Asset master`로 고정한다.

**Architecture:** 각 백엔드는 완전 독립 Django 프로젝트로 구성하고, `account-auth`만 Redis 기반 refresh token registry를 가진다. `front`와 `admin-front`는 gateway만 바라보며 실제 CRUD를 호출하고, `seed-runner`는 각 서비스의 내부 `management command`를 순서대로 실행해 초기 데이터를 만든다. 현재 유지할 도메인 표면은 `Company/Fleet`, `기본 Driver Profile`, `generic Settlement run/item`, `thin Vehicle Asset master`다. `Vehicle Asset`은 `vehicle_id`, `company_id`, `fleet_id?`, `plate_number`, `vin`, `vehicle_status`만 소유하고 운영성 상태를 품지 않는다. 이 작업공간은 Git 저장소가 아니므로 각 task의 마지막 단계는 commit 대신 `ready-to-commit file list` 기록으로 대체한다.

**Tech Stack:** Django, Django REST Framework, Postgres, Redis, JWT (HS256), React, Vite, TypeScript, Nginx, Docker Compose

---

## File Structure

이번 계획은 아래 파일과 디렉토리를 기준으로 진행한다.

- Create: `services/account-auth/`
- Create: `services/driver-profile/`
- Create: `services/settlement/`
- Create: `services/organization-master/`
- Create: `gateway/nginx.conf`
- Create: `front/`
- Create: `admin-front/`
- Create: `infra/env/account-auth.env.example`
- Create: `infra/env/driver-profile.env.example`
- Create: `infra/env/settlement.env.example`
- Create: `infra/env/organization-master.env.example`
- Create: `infra/env/front.env.example`
- Create: `infra/env/admin-front.env.example`
- Create: `infra/docker/seed-runner/Dockerfile`
- Create: `infra/docker/seed-runner/run-seed.sh`
- Modify: `docker-compose.account-driver-settlement.yml`
- Modify: `compose/README.md`
- Modify: `goal/13-account-driver-settlement-compose-simulation.md`
- Modify: `README.md`

## Global Contracts

모든 task는 아래 계약을 유지해야 한다.

1. 모든 외부 ID와 JWT `sub`는 UUID 문자열이다.
2. 로그아웃은 `refresh token`만 폐기하고 `access token`은 만료까지 허용한다.
3. refresh token은 `HttpOnly cookie`, access token은 response body로 전달한다.
4. JWT는 `HS256 + shared secret`을 사용한다.
5. role은 `admin`, `user` 두 개만 둔다.
6. `seed-runner`는 DB 직접 쓰기 대신 각 서비스 `management command`를 호출한다.
7. `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`는 `.env`로 주입한다.
8. 모든 서비스 에러 응답은 `code`, `message`, `details` JSON 형식과 `400/401/403/404/500` 상태코드 계약을 따른다.
9. `Organization Master`는 `Company`, `Fleet`만 소유한다.
10. `Driver Profile HR`는 `org_unit_id`, `employment_status`, `qualification_status` 없이 기본 프로필만 소유한다.
11. `Settlement Payroll`은 legacy policy/config/daily-monthly 계산 모델을 들이지 않는다.
12. backend에서 `org-unit`이나 기존 driver 필드를 제거하는 변경은 front/admin-front 소비자 정리와 같은 change set으로 다룬다.
13. cross-service seed 참조는 `organization-master`, `driver-profile`, `vehicle-asset`의 seed 결과를 deterministic lookup 또는 공유 식별자 규칙으로 재사용한다.
14. `Vehicle Asset`은 `vehicle_id`, `company_id`, `fleet_id?`, `plate_number`, `vin`, `vehicle_status`만 소유하고 `current_driver_id`, `terminal_id`, `maintenance_flag`, `accident_flag`를 들이지 않는다.

### Task 1: Workspace Skeleton and Compose Baseline

**Files:**
- Create: `services/account-auth/`
- Create: `services/driver-profile/`
- Create: `services/settlement/`
- Create: `services/organization-master/`
- Create: `front/`
- Create: `admin-front/`
- Create: `gateway/nginx.conf`
- Create: `infra/env/account-auth.env.example`
- Create: `infra/env/driver-profile.env.example`
- Create: `infra/env/settlement.env.example`
- Create: `infra/env/organization-master.env.example`
- Create: `infra/env/front.env.example`
- Create: `infra/env/admin-front.env.example`
- Create: `infra/docker/seed-runner/Dockerfile`
- Create: `infra/docker/seed-runner/run-seed.sh`
- Modify: `docker-compose.account-driver-settlement.yml`

- [ ] **Step 1: 프로젝트 디렉토리 생성**

아래 디렉토리를 생성한다.

- `services/account-auth`
- `services/driver-profile`
- `services/settlement`
- `services/organization-master`
- `front`
- `admin-front`
- `gateway`
- `infra/env`
- `infra/docker/seed-runner`

- [ ] **Step 2: env example 파일 작성**

각 서비스별 `.env.example`를 `infra/env/` 아래에 만든다.

최소 공통 변수:

- `DJANGO_SECRET_KEY`
- `DJANGO_DEBUG`
- `DJANGO_ALLOWED_HOSTS`
- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_HOST`
- `POSTGRES_PORT`
- `JWT_SECRET_KEY`
- `JWT_ISSUER`
- `JWT_AUDIENCE`
- `JWT_ALGORITHM`

`account-auth` 전용 변수:

- `REDIS_URL`
- `SEED_ADMIN_EMAIL`
- `SEED_ADMIN_PASSWORD`
- `ACCESS_TOKEN_LIFETIME_MINUTES`
- `REFRESH_TOKEN_LIFETIME_DAYS`

`front`, `admin-front` 전용 변수:

- `VITE_API_BASE_URL=/api`

- [ ] **Step 3: gateway nginx baseline 작성**

`gateway/nginx.conf`에 아래 라우팅 구조를 반영한다.

- `/` -> `front:5173`
- `/admin/` -> `admin-front:5174`
- `/api/auth/` -> `account-auth-api:8000`
- `/api/drivers/` -> `driver-profile-api:8000`
- `/api/settlements/` -> `settlement-api:8000`
- `/api/org/` -> `organization-master-api:8000`

쿠키/authorization 헤더가 upstream으로 전달되게 설정한다.
gateway는 서비스 slice prefix를 strip해서 upstream으로 넘기는 단일 규칙을 사용한다. 즉 `GET /api/auth/login/` -> upstream `GET /login/`, `GET /api/org/companies/` -> upstream `GET /companies/`, `GET /api/drivers/` -> upstream `GET /`, `GET /api/settlements/runs/` -> upstream `GET /runs/`, `GET /api/*/health/` -> upstream `GET /health/`처럼 동작하게 고정한다.

- [ ] **Step 4: compose baseline 재작성**

`docker-compose.account-driver-settlement.yml`을 아래 컨테이너 기준으로 재작성한다.

- `gateway`
- `front`
- `admin-front`
- `account-auth-api`
- `driver-profile-api`
- `settlement-api`
- `organization-master-api`
- `redis`
- `account-db`
- `driver-db`
- `settlement-db`
- `org-db`
- `seed-runner`

서비스 build context는 각 프로젝트 디렉토리를 사용하고, env file은 `infra/env/*.env.example`를 기준으로 연결한다.

- [ ] **Step 5: compose config 검증**

Run: `docker compose -f docker-compose.account-driver-settlement.yml config`

Expected: exit code `0`

- [ ] **Step 6: Ready-to-Commit File List 기록**

- `docker-compose.account-driver-settlement.yml`
- `gateway/nginx.conf`
- `infra/env/account-auth.env.example`
- `infra/env/driver-profile.env.example`
- `infra/env/settlement.env.example`
- `infra/env/organization-master.env.example`
- `infra/env/front.env.example`
- `infra/env/admin-front.env.example`
- `infra/docker/seed-runner/Dockerfile`
- `infra/docker/seed-runner/run-seed.sh`

### Task 2: Bootstrap Account / Auth Service

**Files:**
- Create: `services/account-auth/manage.py`
- Create: `services/account-auth/requirements.txt`
- Create: `services/account-auth/Dockerfile`
- Create: `services/account-auth/entrypoint.sh`
- Create: `services/account-auth/config/__init__.py`
- Create: `services/account-auth/config/settings.py`
- Create: `services/account-auth/config/urls.py`
- Create: `services/account-auth/config/asgi.py`
- Create: `services/account-auth/config/wsgi.py`
- Create: `services/account-auth/accounts/__init__.py`
- Create: `services/account-auth/accounts/apps.py`
- Create: `services/account-auth/accounts/models.py`
- Create: `services/account-auth/accounts/serializers.py`
- Create: `services/account-auth/accounts/views.py`
- Create: `services/account-auth/accounts/urls.py`
- Create: `services/account-auth/accounts/authentication.py`
- Create: `services/account-auth/accounts/exceptions.py`
- Create: `services/account-auth/accounts/permissions.py`
- Create: `services/account-auth/accounts/services/jwt_service.py`
- Create: `services/account-auth/accounts/services/refresh_registry.py`
- Create: `services/account-auth/accounts/management/commands/seed_accounts.py`
- Create: `services/account-auth/accounts/tests/test_auth_api.py`

- [ ] **Step 1: Django project scaffold 생성**

`services/account-auth`에 Django 프로젝트와 `accounts` 앱을 만든다.

- [ ] **Step 2: settings.py 구성**

아래를 설정한다.

- Postgres 연결
- Redis URL
- DRF 기본 설정
- DRF exception handler (`code`, `message`, `details`)
- CORS/CSRF 로컬 개발 설정
- JWT env(`JWT_SECRET_KEY`, `JWT_ISSUER`, `JWT_AUDIENCE`, `JWT_ALGORITHM`)
- refresh cookie 이름, 수명, `Path=/api/auth/`, `SameSite=Lax`, local-dev `Secure=false`

- [ ] **Step 3: Account 모델 작성**

`accounts/models.py`에 최소 필드를 가진 모델을 만든다.

- `account_id` (UUID, public identifier)
- `email` (unique)
- `password_hash`
- `role` (`admin`, `user`)
- `is_active`

- [ ] **Step 4: auth API 구현**

아래 upstream endpoint를 구현한다. gateway에서는 각각 `/api/auth/*`로 노출된다.

- `POST /register/`
- `POST /login/`
- `POST /refresh/`
- `POST /logout/`
- `GET /me/`
- `GET /accounts/`
- `POST /accounts/`
- `GET /accounts/{account_id}/`
- `PATCH /accounts/{account_id}/`
- `GET /health/`

로그인 시:

- access token은 response JSON
- refresh token은 `HttpOnly cookie`
- cookie 속성은 `Path=/api/auth/`, `SameSite=Lax`, local-dev `Secure=false`

로그아웃 시:

- refresh registry 삭제
- access token은 블랙리스트에 넣지 않음

권한 규칙:

- `register`, `login`, `refresh`, `logout`: 인증 흐름 기준
- `me`: authenticated (`user`, `admin`)
- account CRUD: read/write 모두 `admin`

- [ ] **Step 5: Redis refresh registry 구현**

`accounts/services/refresh_registry.py`에 아래 책임을 둔다.

- refresh token 등록
- refresh token rotation
- refresh token 삭제
- active session count 계산
- `last_login_at` 갱신

- [ ] **Step 6: seed command 작성**

`seed_accounts.py`에 `.env`의 `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`를 읽어 기본 admin 계정을 upsert하는 로직을 작성한다. end-to-end 권한 검증용 일반 `user` 계정은 seed에 고정하지 않고 `register` API로 테스트 단계에서 생성한다.

- [ ] **Step 7: auth API 테스트 작성**

`accounts/tests/test_auth_api.py`에 아래 테스트를 넣는다.

- register
- login
- refresh with cookie
- refresh cookie flags 확인
- logout removes refresh registry
- me endpoint
- account list/detail/update admin-only
- non-admin account CRUD 거부
- 401/403 에러가 `code/message/details` 형식 유지
- health endpoint

- [ ] **Step 8: account-auth 테스트 실행**

Run: `docker compose -f docker-compose.account-driver-settlement.yml run --rm account-auth-api python manage.py test accounts.tests -v 2`

Expected: auth/health 테스트 통과

- [ ] **Step 9: Ready-to-Commit File List 기록**

- `services/account-auth/manage.py`
- `services/account-auth/requirements.txt`
- `services/account-auth/Dockerfile`
- `services/account-auth/entrypoint.sh`
- `services/account-auth/config/`
- `services/account-auth/accounts/`

### Task 3: Bootstrap Organization Master Service

**Files:**
- Create: `services/organization-master/manage.py`
- Create: `services/organization-master/requirements.txt`
- Create: `services/organization-master/Dockerfile`
- Create: `services/organization-master/entrypoint.sh`
- Create: `services/organization-master/config/__init__.py`
- Create: `services/organization-master/config/settings.py`
- Create: `services/organization-master/config/urls.py`
- Create: `services/organization-master/config/asgi.py`
- Create: `services/organization-master/config/wsgi.py`
- Create: `services/organization-master/organizations/__init__.py`
- Create: `services/organization-master/organizations/apps.py`
- Create: `services/organization-master/organizations/models.py`
- Create: `services/organization-master/organizations/serializers.py`
- Create: `services/organization-master/organizations/views.py`
- Create: `services/organization-master/organizations/urls.py`
- Create: `services/organization-master/organizations/authentication.py`
- Create: `services/organization-master/organizations/exceptions.py`
- Create: `services/organization-master/organizations/permissions.py`
- Create: `services/organization-master/organizations/management/commands/seed_organization.py`
- Create: `services/organization-master/organizations/tests/test_organization_api.py`

- [ ] **Step 1: Django project scaffold 생성**

`services/organization-master`에 Django 프로젝트와 `organizations` 앱을 만든다.

- [ ] **Step 2: 모델 작성**

`organizations/models.py`에 아래 모델과 필드를 만든다.

- `Company(company_id, name)`
- `Fleet(fleet_id, company_id, name)`

식별자는 모두 UUID 문자열 계약을 따른다.

- [ ] **Step 3: JWT 인증, serializer, viewset, route 작성**

아래 upstream CRUD route를 만든다. gateway에서는 각각 `/api/org/*`로 노출된다.

- `/companies/`
- `/fleets/`
- `/health/`

`organizations/authentication.py`에 `HS256 + shared secret` 검증 로직과 `sub`, `role`, `iss`, `aud`, `exp` 해석을 구현하고 DRF 기본 인증으로 연결한다.
`organizations/exceptions.py` 또는 동등한 위치에 공통 에러 JSON(`code`, `message`, `details`) formatter를 구현하고 settings에 연결한다.

권한 규칙:

- read: authenticated (`user`, `admin`)
- write: `admin`

- [ ] **Step 4: seed command 작성**

`seed_organization.py`에 기본 회사와 플릿을 idempotent하게 생성하는 로직을 추가한다. 후속 seed가 같은 회사를 안정적으로 찾을 수 있도록 natural key 또는 deterministic ID 규칙을 함께 고정한다.

- [ ] **Step 5: API 테스트 작성**

`test_organization_api.py`에 아래 테스트를 추가한다.

- health
- company/fleet CRUD
- `admin` write 허용
- `user` write 거부
- 401/403/404 에러가 `code/message/details` 형식 유지

- [ ] **Step 6: organization-master 테스트 실행**

Run: `docker compose -f docker-compose.account-driver-settlement.yml run --rm organization-master-api python manage.py test organizations.tests -v 2`

Expected: organization API 테스트 통과

- [ ] **Step 7: Ready-to-Commit File List 기록**

- `services/organization-master/manage.py`
- `services/organization-master/requirements.txt`
- `services/organization-master/Dockerfile`
- `services/organization-master/entrypoint.sh`
- `services/organization-master/config/`
- `services/organization-master/organizations/`

### Task 4: Bootstrap Driver Profile HR Service

**Files:**
- Create: `services/driver-profile/manage.py`
- Create: `services/driver-profile/requirements.txt`
- Create: `services/driver-profile/Dockerfile`
- Create: `services/driver-profile/entrypoint.sh`
- Create: `services/driver-profile/config/__init__.py`
- Create: `services/driver-profile/config/settings.py`
- Create: `services/driver-profile/config/urls.py`
- Create: `services/driver-profile/config/asgi.py`
- Create: `services/driver-profile/config/wsgi.py`
- Create: `services/driver-profile/drivers/__init__.py`
- Create: `services/driver-profile/drivers/apps.py`
- Create: `services/driver-profile/drivers/models.py`
- Create: `services/driver-profile/drivers/serializers.py`
- Create: `services/driver-profile/drivers/views.py`
- Create: `services/driver-profile/drivers/urls.py`
- Create: `services/driver-profile/drivers/authentication.py`
- Create: `services/driver-profile/drivers/exceptions.py`
- Create: `services/driver-profile/drivers/permissions.py`
- Create: `services/driver-profile/drivers/management/commands/seed_drivers.py`
- Create: `services/driver-profile/drivers/tests/test_driver_api.py`

- [ ] **Step 1: Django project scaffold 생성**

`services/driver-profile`에 Django 프로젝트와 `drivers` 앱을 만든다.

- [ ] **Step 2: DriverProfile 모델 작성**

`drivers/models.py`에 아래 필드를 가진 모델을 만든다.

- `driver_id`
- `account_id` nullable
- `company_id`
- `fleet_id`
- `name`
- `ev_id`
- `phone_number`
- `address`

모든 참조 필드는 UUID 문자열로 저장한다.

- [ ] **Step 3: JWT 인증, serializer, viewset, route 작성**

아래 upstream route를 구현한다. gateway에서는 각각 `/api/drivers/*`로 노출된다.

- `/`
- `/{driver_id}/`
- `/check-ev-id/`
- `/health/`

`drivers/authentication.py`에 `HS256 + shared secret` 검증 로직과 `sub`, `role`, `iss`, `aud`, `exp` 해석을 구현하고 DRF 기본 인증으로 연결한다.
`drivers/exceptions.py` 또는 동등한 위치에 공통 에러 JSON(`code`, `message`, `details`) formatter를 구현하고 settings에 연결한다.

권한 규칙:

- read/write: authenticated (`user`, `admin`)

- [ ] **Step 4: seed command 작성**

`seed_drivers.py`에 샘플 기사 1~2건을 upsert하는 로직을 추가한다. organization seed가 만든 회사/플릿을 조회해 연결하고, 독립된 `300.../400...` 류 UUID를 하드코딩하지 않는다.

- [ ] **Step 5: API 테스트 작성**

`test_driver_api.py`에 아래 테스트를 넣는다.

- health
- driver CRUD
- EV ID 중복검사
- JWT 인증 필요
- `user`와 `admin` 모두 CRUD 허용
- 401/404 에러가 `code/message/details` 형식 유지

- [ ] **Step 6: driver-profile 테스트 실행**

Run: `docker compose -f docker-compose.account-driver-settlement.yml run --rm driver-profile-api python manage.py test drivers.tests -v 2`

Expected: driver API 테스트 통과

- [ ] **Step 7: Ready-to-Commit File List 기록**

- `services/driver-profile/manage.py`
- `services/driver-profile/requirements.txt`
- `services/driver-profile/Dockerfile`
- `services/driver-profile/entrypoint.sh`
- `services/driver-profile/config/`
- `services/driver-profile/drivers/`

### Task 5: Bootstrap Settlement Payroll Service

**Files:**
- Create: `services/settlement/manage.py`
- Create: `services/settlement/requirements.txt`
- Create: `services/settlement/Dockerfile`
- Create: `services/settlement/entrypoint.sh`
- Create: `services/settlement/config/__init__.py`
- Create: `services/settlement/config/settings.py`
- Create: `services/settlement/config/urls.py`
- Create: `services/settlement/config/asgi.py`
- Create: `services/settlement/config/wsgi.py`
- Create: `services/settlement/settlements/__init__.py`
- Create: `services/settlement/settlements/apps.py`
- Create: `services/settlement/settlements/models.py`
- Create: `services/settlement/settlements/serializers.py`
- Create: `services/settlement/settlements/views.py`
- Create: `services/settlement/settlements/urls.py`
- Create: `services/settlement/settlements/authentication.py`
- Create: `services/settlement/settlements/exceptions.py`
- Create: `services/settlement/settlements/permissions.py`
- Create: `services/settlement/settlements/management/commands/seed_settlements.py`
- Create: `services/settlement/settlements/tests/test_settlement_api.py`

- [ ] **Step 1: Django project scaffold 생성**

`services/settlement`에 Django 프로젝트와 `settlements` 앱을 만든다.

- [ ] **Step 2: 모델 작성**

`settlements/models.py`에 아래 모델과 필드를 만든다.

- `SettlementRun(settlement_run_id, company_id, fleet_id, period_start, period_end, status)`
- `SettlementItem(settlement_item_id, settlement_run_id, driver_id, amount, payout_status)`

ID와 참조 필드는 UUID 문자열 기준으로 유지한다. 단, 이 서비스는 legacy payroll engine을 옮기지 않고 generic run/item scaffold만 제공한다.

- [ ] **Step 3: JWT 인증, serializer, viewset, route 작성**

아래 upstream route를 구현한다. gateway에서는 각각 `/api/settlements/*`로 노출된다.

- `/runs/`
- `/runs/{settlement_run_id}/`
- `/items/`
- `/items/{settlement_item_id}/`
- `/health/`

`settlements/authentication.py`에 `HS256 + shared secret` 검증 로직과 `sub`, `role`, `iss`, `aud`, `exp` 해석을 구현하고 DRF 기본 인증으로 연결한다.
`settlements/exceptions.py` 또는 동등한 위치에 공통 에러 JSON(`code`, `message`, `details`) formatter를 구현하고 settings에 연결한다.

권한 규칙:

- read: authenticated (`user`, `admin`)
- write: `admin`

- [ ] **Step 4: seed command 작성**

`seed_settlements.py`에 샘플 정산 실행과 항목을 upsert하는 로직을 추가한다. seeded company/fleet/driver를 lookup해서 참조를 맞추고, legacy 정책/공식 데이터는 들이지 않는다.

- [ ] **Step 5: API 테스트 작성**

`test_settlement_api.py`에 아래 테스트를 넣는다.

- health
- settlement run CRUD
- settlement item CRUD
- `admin` write 허용
- `user` write 거부
- 401/403/404 에러가 `code/message/details` 형식 유지

- [ ] **Step 6: settlement 테스트 실행**

Run: `docker compose -f docker-compose.account-driver-settlement.yml run --rm settlement-api python manage.py test settlements.tests -v 2`

Expected: settlement API 테스트 통과

- [ ] **Step 7: Ready-to-Commit File List 기록**

- `services/settlement/manage.py`
- `services/settlement/requirements.txt`
- `services/settlement/Dockerfile`
- `services/settlement/entrypoint.sh`
- `services/settlement/config/`
- `services/settlement/settlements/`

### Task 6: Finalize Gateway and Seed Runner

**Files:**
- Modify: `docker-compose.account-driver-settlement.yml`
- Modify: `gateway/nginx.conf`
- Create: `infra/docker/seed-runner/Dockerfile`
- Create: `infra/docker/seed-runner/run-seed.sh`

- [ ] **Step 1: gateway proxy rules 보강**

아래를 반영한다.

- SPA fallback for `front`
- `/admin/` base path support for `admin-front`
- `/api/*` upstream proxy
- auth cookie/authorization header forwarding
- `/api/auth/health/`, `/api/org/health/`, `/api/drivers/health/`, `/api/settlements/health/`가 upstream `/health/`로 rewrite되는 규칙

- [ ] **Step 2: seed-runner image 작성**

`infra/docker/seed-runner/Dockerfile`은 repo root를 컨텍스트로 받아, 각 Django 서비스 디렉토리를 복사하고 네 서비스의 `requirements.txt` 합집합을 설치한 뒤 서비스별 `manage.py` command를 실행할 수 있는 Python 이미지를 만든다.

- [ ] **Step 3: run-seed.sh 작성**

`run-seed.sh`에 아래 순서를 구현한다.

1. 서비스 health 대기
2. `account-auth` migrate
3. `account-auth` seed_accounts
4. `organization-master` migrate
5. `organization-master` seed_organization
6. `driver-profile` migrate
7. `driver-profile` seed_drivers
8. `settlement` migrate
9. `settlement` seed_settlements

모든 단계는 idempotent하게 재실행 가능해야 한다.

- [ ] **Step 4: seed-runner compose 연결**

`docker-compose.account-driver-settlement.yml`에서 `seed-runner`가 위 스크립트를 자동 실행하도록 연결한다.

- [ ] **Step 5: seed-runner smoke 검증**

Run: `docker compose -f docker-compose.account-driver-settlement.yml run --rm seed-runner sh -lc './infra/docker/seed-runner/run-seed.sh'`

Expected: migrate/seed가 순서대로 완료되고 중복 생성 오류가 없다

- [ ] **Step 6: Ready-to-Commit File List 기록**

- `gateway/nginx.conf`
- `docker-compose.account-driver-settlement.yml`
- `infra/docker/seed-runner/Dockerfile`
- `infra/docker/seed-runner/run-seed.sh`

### Task 7: Bootstrap Front App

**Files:**
- Create: `front/package.json`
- Create: `front/tsconfig.json`
- Create: `front/vite.config.ts`
- Create: `front/index.html`
- Create: `front/src/main.tsx`
- Create: `front/src/App.tsx`
- Create: `front/src/api/http.ts`
- Create: `front/src/api/auth.ts`
- Create: `front/src/api/organization.ts`
- Create: `front/src/api/drivers.ts`
- Create: `front/src/api/settlements.ts`
- Create: `front/src/pages/LoginPage.tsx`
- Create: `front/src/pages/DashboardPage.tsx`
- Create: `front/src/pages/DriversPage.tsx`
- Create: `front/src/pages/SettlementsPage.tsx`
- Create: `front/src/components/Layout.tsx`
- Create: `front/Dockerfile`

- [ ] **Step 1: Vite + React + TypeScript scaffold 생성**

`front`에 독립 앱을 만든다.

- [ ] **Step 2: API client 작성**

`front/src/api/http.ts`에 아래를 구현한다.

- gateway base URL 사용
- Bearer token 주입
- refresh 시 `withCredentials`
- 401 발생 시 refresh -> retry -> 실패 시 logout

- [ ] **Step 3: 인증 화면 작성**

`LoginPage.tsx`에서 로그인 후 access token을 메모리에 올리고 dashboard로 이동하게 만든다.

- [ ] **Step 4: CRUD 화면 작성**

아래 화면을 구현한다.

- company/fleet 조회
- driver 기본정보 목록/생성/수정
- settlement run/item 조회
- settlement placeholder 안내 문구

- [ ] **Step 5: front build 검증**

Run: `docker compose -f docker-compose.account-driver-settlement.yml run --rm front npm run build`

Expected: Vite build 성공

- [ ] **Step 6: Ready-to-Commit File List 기록**

- `front/package.json`
- `front/tsconfig.json`
- `front/vite.config.ts`
- `front/index.html`
- `front/src/`
- `front/Dockerfile`

### Task 8: Bootstrap Admin Front App

**Files:**
- Create: `admin-front/package.json`
- Create: `admin-front/tsconfig.json`
- Create: `admin-front/vite.config.ts`
- Create: `admin-front/index.html`
- Create: `admin-front/src/main.tsx`
- Create: `admin-front/src/App.tsx`
- Create: `admin-front/src/api/http.ts`
- Create: `admin-front/src/api/auth.ts`
- Create: `admin-front/src/api/accounts.ts`
- Create: `admin-front/src/api/organization.ts`
- Create: `admin-front/src/api/drivers.ts`
- Create: `admin-front/src/api/settlements.ts`
- Create: `admin-front/src/pages/LoginPage.tsx`
- Create: `admin-front/src/pages/AccountsPage.tsx`
- Create: `admin-front/src/pages/OrganizationPage.tsx`
- Create: `admin-front/src/pages/DriversPage.tsx`
- Create: `admin-front/src/pages/SettlementsPage.tsx`
- Create: `admin-front/src/components/Layout.tsx`
- Create: `admin-front/Dockerfile`

- [ ] **Step 1: Vite + React + TypeScript scaffold 생성**

`admin-front`에 독립 앱을 만든다.

- [ ] **Step 2: API client와 route guard 작성**

`admin-front/src/api/http.ts`와 앱 route에서 아래를 반영한다.

- gateway base URL 사용
- Bearer token 주입
- refresh 시 `withCredentials`
- 401 발생 시 refresh -> retry -> 실패 시 logout
- admin role이 아니면 관리 화면 진입 차단

- [ ] **Step 3: 관리 화면 작성**

아래 페이지를 구현한다.

- 계정 목록/생성/수정
- 회사/플릿 CRUD
- 기사 기본정보 CRUD
- 정산 실행/정산 항목 CRUD

- [ ] **Step 4: admin-front build 검증**

Run: `docker compose -f docker-compose.account-driver-settlement.yml run --rm admin-front npm run build`

Expected: Vite build 성공

- [ ] **Step 5: Ready-to-Commit File List 기록**

- `admin-front/package.json`
- `admin-front/tsconfig.json`
- `admin-front/vite.config.ts`
- `admin-front/index.html`
- `admin-front/src/`
- `admin-front/Dockerfile`

### Task 9: Docs Sync and End-to-End Verification

**Files:**
- Modify: `README.md`
- Modify: `compose/README.md`
- Modify: `goal/13-account-driver-settlement-compose-simulation.md`

- [ ] **Step 1: README 갱신**

루트 `README.md`에 현재 디렉토리가 문서 + 로컬 실행형 MSA workspace라는 점을 반영하고, 새 프로젝트 디렉토리(`services/`, `front/`, `admin-front/`, `gateway/`, `infra/`)를 설명한다.

- [ ] **Step 2: compose 문서 갱신**

`compose/README.md`와 `goal/13-account-driver-settlement-compose-simulation.md`를 실제 실행 구조 기준으로 업데이트한다.

- [ ] **Step 3: 전체 compose 기동 검증**

Run: `docker compose -f docker-compose.account-driver-settlement.yml up --build -d`

Expected: gateway, 4 backend services, 2 frontends, 4 DBs, redis, seed-runner가 정상 기동

- [ ] **Step 4: health endpoint 검증**

Run:

```bash
curl -f http://localhost:8080/api/auth/health/
curl -f http://localhost:8080/api/org/health/
curl -f http://localhost:8080/api/drivers/health/
curl -f http://localhost:8080/api/settlements/health/
```

Expected: 네 서비스 모두 `200`

이 검증은 gateway prefix strip이 적용된 `/api/*/health/ -> /health/` 규칙을 확인하는 단계로 본다.

- [ ] **Step 5: auth flow 검증**

Run:

```bash
curl -i -X POST http://localhost:8080/api/auth/login/ \
  -H 'Content-Type: application/json' \
  -d '{"email":"'$SEED_ADMIN_EMAIL'","password":"'$SEED_ADMIN_PASSWORD'"}'
```

Expected: access token JSON + refresh cookie

- [ ] **Step 6: CRUD smoke 검증**

`organization`, `drivers`, `settlements`에 대해 아래를 확인한다.

- `POST /api/auth/register/`로 일반 `user` 계정 생성
- 일반 `user` 계정으로 로그인해 user token 확보
- read endpoint 정상 응답
- admin token으로 write endpoint 정상 응답
- user token으로 admin-only endpoint `403`

- [ ] **Step 7: 프런트 진입 검증**

브라우저 기준으로 아래를 확인한다.

- `/` -> front login and CRUD flow
- `/admin/` -> admin-front login and management flow

- [ ] **Step 8: Ready-to-Commit File List 기록**

- `README.md`
- `compose/README.md`
- `goal/13-account-driver-settlement-compose-simulation.md`
- `services/`
- `front/`
- `admin-front/`
- `gateway/nginx.conf`
- `infra/`
- `docker-compose.account-driver-settlement.yml`
