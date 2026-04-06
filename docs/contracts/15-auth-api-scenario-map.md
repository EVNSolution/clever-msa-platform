# 15. Auth API Scenario Map

## 문서 목적

이 문서는 CLEVER 현재 runtime의 auth 관련 시나리오와 로직을 API 기준으로 한 번에 읽을 수 있게 고정한다.

이번 문서의 목표는 아래 네 가지다.

1. `/api/auth/*`의 현재 endpoint surface를 정리한다.
2. identity session, refresh cookie, consent recovery 흐름을 한 장의 다이어그램으로 고정한다.
3. signup request 승인/반려/setup 권한 체인을 API action 기준으로 정리한다.
4. 하위 서비스가 JWT claim과 internal key를 어떻게 소비하는지 auth gate 관점으로 정리한다.

## 정본 근거

- `docs/decisions/specs/2026-04-03-identity-account-auth-design.md`
- `docs/decisions/specs/2026-04-04-auth-transition-phase-1-design.md`
- `docs/decisions/specs/2026-04-04-auth-final-cutover-design.md`
- `docs/mappings/current-runtime-inventory.md`
- `development/service-account-access/accounts/urls.py`
- `development/service-account-access/accounts/views.py`
- `development/service-account-access/accounts/services/jwt_service.py`
- `development/service-account-access/accounts/services/signup_request_service.py`
- `development/service-account-access/accounts/tests/test_auth_api.py`
- `development/front-admin-console/src/api/auth.ts`
- `development/front-admin-console/src/api/http.ts`
- `development/edge-api-gateway/nginx.conf`
- 각 서비스 repo의 `authentication.py`, `permissions.py`

## Draw.io 작성 계획

다이어그램은 파일 하나 안에 아래 4개 섹션으로 나눈다.

1. `API Surface`
2. `Identity Session Lifecycle`
3. `Signup / Request Workflow`
4. `Downstream Authorization`

이 구조를 선택한 이유는 다음과 같다.

- auth 입구와 내부 승인은 같은 `/api/auth/` 아래에 있지만 읽는 사람의 질문이 다르다.
- 세션/consent/refresh는 상태 전이가 중요하고, request workflow는 역할별 승인 권한이 중요하다.
- 하위 서비스 auth는 `/api/auth/*`의 endpoint 목록보다 JWT claim 소비 방식이 더 중요하다.

## 실행 결과

- draw.io source: [diagrams/auth-api-scenario-map.drawio.xml](diagrams/auth-api-scenario-map.drawio.xml)
- draw.io MCP에서 같은 XML로 시각화 검증을 수행했다.

## API Surface 요약

| 그룹 | Endpoint | 인증 조건 | 핵심 규칙 |
| --- | --- | --- | --- |
| Public lookup | `GET /api/org/companies/public/` | 없음 | 웹 public signup/recovery entry에서 회사 검색용으로 active company 목록을 조회한다 |
| Public intake | `POST /identity-signup-requests/` | 없음 | email/password signup 또는 social provider access token signup으로 identity, credential/login method, consent, signup request를 한 번에 만든다 |
| Public session | `POST /identity-login/` | 없음 | email/password 또는 social provider access token으로 access token + refresh cookie를 발급한다 |
| Public session | `POST /identity-refresh/` | refresh cookie | registry에 등록된 refresh token만 회전 가능하다 |
| Public session | `POST /identity-logout/` | 없음 | refresh registry에서 제거하고 cookie를 지운다 |
| Public recovery | `POST /identity-recovery/` | 없음 | archived identity를 새 email/password로 self-recover 한다 |
| Session read | `GET /identity-me/` | access token | 현재 세션 shape를 그대로 돌려주되 `access_token`은 빈 문자열이다 |
| Identity self-service | `GET/PATCH /identity-profile/` | full identity session | consent recovery 세션에서는 막힌다 |
| Identity self-service | `GET /identity-consent/` | identity session | consent recovery 세션도 읽을 수 있다 |
| Identity self-service | `POST /identity-consent/withdraw/` | full identity session | 필수 동의 철회 시 recovery session으로 강등된다 |
| Identity self-service | `POST /identity-consent/recover/` | identity session | 두 필수 동의를 다시 받으면 normal session으로 복구된다 |
| Identity self-service | `GET/POST /identity-login-methods/` | full identity session | email/phone/social login method를 관리하고, social은 provider access token으로 연결한다 |
| Identity self-service | `POST /identity-login-methods/:id/delete/` | full identity session | 마지막 login method를 지우면 identity와 account를 archive한다 |
| Identity self-service | `PUT /identity-password/` | full identity session | shared password credential을 갱신한다 |
| Request self-service | `GET/POST /identity-signup-requests/me/` | full identity session | 자기 request 조회와 신규 request 생성을 한다 |
| Request self-service | `POST /identity-signup-requests/:id/cancel/` | full identity session | 자기 pending/awaiting_setup request만 취소 가능하다 |
| Request management | `GET /identity-signup-requests/manage/` | full identity session | system admin/all, company super admin/same company, vehicle-settlement manager/driver request only |
| Request management | `POST /:id/approve/` | full identity session | driver request는 즉시 승인, manager request는 awaiting_setup으로 이동 |
| Request management | `POST /:id/reject/` | full identity session | pending/awaiting_setup만 반려 가능하다 |
| Request management | `POST /:id/complete-setup/` | full identity session | manager request만 최종 account 생성이 가능하다 |
| Account management | `GET /manager-accounts/manage/` | full identity session | system admin/all, company super admin/self+lower, vehicle-settlement manager/self only |
| Account management | `POST /manager-accounts/:id/change-role/` | full identity session | lower manager(`vehicle_manager`/`settlement_manager`) 사이 전환만 같은 account에서 허용한다 |
| Account management | `POST /manager-accounts/:id/archive/` | full identity session | system admin/all, company super admin/self+lower, vehicle-settlement manager/self only |
| Account management | `GET /driver-accounts/manage/` | full identity session | system admin/all, manager/same company active driver account만 조회한다 |
| Admin helper | `GET /driver-account-links/` | system admin 또는 manager account | driver_id, driver_account_id, active_only 필터를 지원한다 |
| Admin helper | `POST /driver-account-links/` | system admin 또는 manager account | driver_account와 driver의 회사 일치, active link 중복 금지를 검사하고 연결을 만든다 |
| Admin helper | `POST /driver-account-links/:id/unlink/` | system admin 또는 manager account | 같은 scope의 active link만 수동 해제한다 |
| Health | `GET /health/` | 없음 | health check 전용 |

추가로 아래 legacy surface는 current truth에서 제거됐다.

- `/register/`
- `/login/`
- `/refresh/`
- `/logout/`
- `/me/`
- `/change-password/`
- `/accounts/*`
- `/account-driver-links/*`

## Session Lifecycle 요약

### 로그인

`POST /identity-login/`은 아래 두 경로 중 하나를 탄다.

1. `email/password`
2. `social provider access token`

email/password 경로는 `IdentityAuthService.authenticate_email_password()`를 호출해서 아래를 검증한다.

1. email credential 존재
2. login method가 archived 아니고 verified 상태
3. identity가 `active`
4. password credential 일치

social 경로는 `SocialProviderService`로 provider subject를 해석한 뒤 `IdentityAuthService.authenticate_social_subject()`로 아래를 검증한다.

1. linked `social_credential` 존재
2. login method가 archived 아니고 verified 상태
3. identity가 `active`

이후 `IdentityConsentService.is_fully_consented()` 결과에 따라 아래 두 세션 중 하나를 만든다.

- `normal`
- `consent_recovery`

응답은 아래 shape를 고정한다.

- `access_token`
- `session_kind`
- `email`
- `identity`
- `active_account`
- `available_account_types`

refresh token은 HttpOnly cookie로 내려가고, `RefreshRegistry`는 `auth:refresh:{jti}`와 `auth:account:{sub}:sessions`를 Redis에 기록한다.

### refresh

`POST /identity-refresh/`는 refresh cookie가 없으면 실패한다.

추가 검증은 아래와 같다.

1. registry에 등록된 refresh token이어야 한다.
2. JWT `type=refresh` 여야 한다.
3. `principal_kind`가 `identity_session` 또는 `identity_consent_recovery_session` 이어야 한다.
4. `identity_id` 기준 active identity를 다시 찾을 수 있어야 한다.

검증이 끝나면 access token과 refresh token을 둘 다 재발급하고 이전 refresh token을 rotate 한다.

### consent recovery

consent recovery 세션은 `principal_kind=identity_consent_recovery_session`으로 발급된다.

이 세션에서 가능한 API는 아래다.

- `GET /identity-me/`
- `GET /identity-consent/`
- `POST /identity-consent/recover/`

아래 API는 `_require_full_identity_session()`에 걸려 막힌다.

- `identity-profile`
- `identity-login-methods`
- `identity-password`
- `identity-signup-requests/*`
- `driver-account-links`
- `identity-consent/withdraw`

필수 동의를 철회하면 `POST /identity-consent/withdraw/`가 refresh token까지 같이 rotate 해서 recovery session으로 떨어뜨린다.

두 필수 동의를 다시 받으면 `POST /identity-consent/recover/`가 normal session으로 다시 rotate 한다.

### 프론트 동작

단일 웹 콘솔은 같은 auth client 패턴을 쓴다.

1. 로그인 시 `/api/auth/identity-login/` 호출
2. access token은 메모리에 유지
3. 일반 API 호출은 `Authorization: Bearer <access_token>` 추가
4. `401`이면 `/api/auth/identity-refresh/`를 cookie 기반으로 호출
5. refresh 성공 시 원 요청 1회 재시도
6. refresh 실패 시 세션을 비우고 다시 로그인

추가로 public entry는 아래처럼 고정한다.

1. 로그인 화면은 `로그인`, `회원가입 요청`, `identity 복구` 세 진입을 한 화면에서 가진다.
2. `회원가입 요청`, `identity 복구`는 비로그인 상태에서도 진입 가능하다.
3. 회원가입 요청 시 회사 선택은 `GET /api/org/companies/public/` 결과를 사용한다.
4. 로그인은 성공했지만 `active_account`가 아직 없는 경우, 웹은 접근 거부 대신 self-service 전용 `승인 대기` 화면으로 보낸다.
5. `consent_recovery` 세션이면 일반 화면이 아니라 동의 복구 화면만 허용한다.

## Signup / Request Workflow 요약

### public intake

`POST /identity-signup-requests/`는 signup method에 따라 아래 두 흐름 중 하나를 탄다.

1. `email/password`
2. `social provider access token`

공통으로 아래를 한 트랜잭션 흐름으로 만든다.

1. `identity`
2. `identity_login_method(email 또는 social)`
3. 해당 credential (`email_credential` 또는 `social_credential`)
4. `password_credential`는 email/password signup일 때만 생성
5. `identity_consent_current`
6. `identity_consent_history`
7. `identity_signup_request` 1개 이상

`requested_account_types`에 manager와 driver를 같이 보내면 request는 2개로 분리된다.

### self-service request 생성 규칙

기존 identity는 `POST /identity-signup-requests/me/`로 request를 추가 생성할 수 있다.

`SignupRequestService.validate_creatable_request()`는 아래를 막는다.

1. 같은 `identity + company_id + request_type`의 pending 중복
2. 같은 회사에 이미 active account가 있는 경우
3. 회사 변경인데 `is_re_request=false`인 경우
4. active account 없이 `is_re_request=true`인 경우

### 관리 권한

`GET /identity-signup-requests/manage/`와 action endpoint의 권한은 아래다.

- `system_admin_account`: 모든 request
- `company_super_admin`: 같은 회사 request, active identity만
- `vehicle_manager`, `settlement_manager`: 같은 회사의 `driver_account_create` request만
- driver 또는 account 미보유 identity: 관리 불가

### 승인 결과

승인 결과는 request type에 따라 다르다.

#### driver request

- `pending -> approved`
- `driver_account(active)` 생성
- `identity_account_link(driver)` 생성

#### manager request

1차 승인:

- `pending -> awaiting_setup`
- reviewer stamp 저장

2차 setup:

- `POST /identity-signup-requests/:id/complete-setup/`
- `manager_account(active)` 생성
- `identity_account_link(manager)` 생성
- `awaiting_setup -> approved`

role 제한은 아래다.

- `system_admin`: 어떤 manager role이든 setup 가능
- `company_super_admin`: `vehicle_manager`, `settlement_manager`만 setup 가능

### 반려와 취소

- `reject`: pending 또는 awaiting_setup만 가능
- `cancel`: 자기 request이며 pending 또는 awaiting_setup일 때만 가능
- 둘 다 최종 상태는 `rejected`

## Active Manager Account Management

### 목록 범위

`GET /manager-accounts/manage/`의 current truth는 아래다.

- `system_admin_account`: 모든 active manager account
- `company_super_admin`: 자기 자신과 같은 회사의 하위 manager account
- `vehicle_manager`, `settlement_manager`: 자기 자신만

같은 회사의 다른 `company_super_admin`는 동등 레벨이므로 서로 관리 대상이 아니다.

### 역할 전환

`POST /manager-accounts/:id/change-role/`은 active manager account의 role 전환만 다룬다.

- `vehicle_manager <-> settlement_manager`는 같은 `manager_account` row에서 처리한다
- `company_super_admin`가 포함되는 상하 레벨 전환은 이 endpoint로 처리하지 않는다
- 상하 레벨 전환은 기존 account를 `archived`하고 새 request/create 흐름으로 연다

### 아카이브

`POST /manager-accounts/:id/archive/`는 물리 삭제가 아니라 lifecycle 종료다.

## Driver Account Link Management

### 목록 범위

`GET /driver-accounts/manage/`의 current truth는 아래다.

- `system_admin_account`: 모든 active driver account
- `manager_account`: 자기 회사의 active driver account
- `driver_account` 또는 account 미보유 identity: 관리 불가

응답에는 현재 연결 상태를 바로 읽을 수 있도록 아래를 같이 준다.

- `driver_account_id`
- `identity`
- `company_id`
- `status`
- `created_at`
- `active_driver_id`

### 연결

`POST /driver-account-links/`는 active `driver_account_link` 정본을 만든다.

검사는 아래 순서로 고정한다.

1. caller가 관리 가능한 `driver_account`여야 한다
2. 해당 `driver_account`에 active link가 없어야 한다
3. 대상 `driver_id`에도 active link가 없어야 한다
4. `driver_profile` 조회 기준 `driver.company_id == driver_account.company_id`여야 한다

생성되면 `driver_account_link` row가 하나 생기고 `linked_at`이 채워진다.

### 해제

`POST /driver-account-links/:id/unlink/`는 active link를 수동 종료한다.

- scope는 `GET /driver-account-links/`와 동일하게 caller의 관리 범위 안에서만 허용한다
- 이미 종료된 link는 다시 종료할 수 없다
- 수동 해제 시 `unlink_reason = admin_unlinked`로 남긴다

- `system_admin_account`: 모든 manager account archive 가능
- `company_super_admin`: 자기 자신 + 하위 manager account archive 가능
- `vehicle_manager`, `settlement_manager`: 자기 자신만 archive 가능

archive 시 아래를 같이 처리한다.

1. `manager_account.status = archived`
2. `archived_at` 기록
3. active `identity_account_link(manager)`의 `unlinked_at` 기록

## Downstream Authorization 요약

### gateway

`edge-api-gateway`는 auth source of truth가 아니다.

역할은 아래 두 개다.

1. `/api/auth/*`와 각 서비스 prefix를 upstream으로 라우팅
2. `Authorization` header와 `Cookie`를 그대로 forward

### access token contract

`service-account-access/accounts/services/jwt_service.py` 기준 현재 access token claim은 아래다.

- `sub`
- `principal_kind`
- `identity_id`
- `active_account_id`
- `active_account_type`
- `company_id`
- `email`
- `role`
- `role_type`
- `iss`, `aud`, `iat`, `exp`, `jti`, `type`

의미는 아래로 본다.

- `sub`: active account가 있으면 active product account id, 없으면 identity id
- `role`: 하위 서비스의 generic gate용 compatibility claim
  - admin 계열은 `admin`
  - driver 계열은 `user`
- `role_type`: manager 세부 역할 또는 `system_admin`, `driver`

### 일반 하위 서비스 패턴

대부분의 서비스는 각 repo의 `authentication.py`에서 아래를 반복한다.

1. `Authorization: Bearer` header 파싱
2. JWT signature / issuer / audience / `type=access` 검증
3. `sub`와 `role`을 principal로 노출

대부분의 `permissions.py`는 아래 둘 중 하나다.

- authenticated read/write
- authenticated read + admin write

즉 auth 자체는 중앙 발급 서비스가 하고, 도메인 서비스는 `role` claim으로 최소 gate만 수행한다.

### read-model / cross-service forwarding

`driver-ops`, `dispatch-ops`, `delivery-record` 같은 조합 서비스는 내부 source client를 호출할 때 원 요청의 `Authorization` header를 그대로 전달한다.

즉 gateway에서 받은 end-user JWT가 read-model fan-out에도 계속 이어진다.

### telemetry 예외

telemetry 축은 일반 end-user JWT 흐름 외에 internal producer key가 있다.

#### telemetry-hub

- 읽기: JWT
- 쓰기 ingest: `admin JWT` 또는 `X-Telemetry-Ingest-Key`

#### telemetry-dead-letter

- 읽기/list/detail: `admin JWT`
- ingest write: `ProducerKeyAuthentication`
  - header: `X-Telemetry-Dead-Letter-Key`

추가로 gateway는 public edge에서 아래를 막는다.

- `/api/telemetry-dead-letters/ingest`

즉 dead-letter ingest는 public browser path가 아니라 internal producer direct path로만 열려 있다.

## 읽기 순서

다이어그램은 아래 순서로 읽으면 된다.

1. `API Surface`에서 endpoint 군을 잡는다.
2. `Identity Session Lifecycle`에서 login, refresh, consent recovery를 본다.
3. `Signup / Request Workflow`에서 승인 권한과 상태 전이를 본다.
4. `Downstream Authorization`에서 JWT claim 소비와 telemetry 예외를 본다.
