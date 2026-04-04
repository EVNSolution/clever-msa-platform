# Auth Transition Phase 1 Design

## 목적

이 문서는 `service-account-access`의 auth 전환기 current truth를 고정한다.

이번 phase 1의 목표는 최종 전환을 한 번에 끝내는 것이 아니라, 아래를 동시에 만족하는 중간 상태를 만드는 것이다.

1. `identity + product account` 구조를 사람/권한 정본으로 고정한다.
2. 모바일과 신규 API 클라이언트는 `identity-*` API만 사용하게 한다.
3. 현재 웹 콘솔은 즉시 깨지지 않도록 `legacy /auth/*`와 `Account`를 호환층으로 남긴다.
4. 새 self-signup이 다시 legacy `Account`로 새어 들어가지 않게 막는다.

## 현재 상태

현재 코드 기준 사실은 아래와 같다.

1. `identity`, `identity_login_method`, `credential`, `system_admin_account`, `manager_account`, `driver_account`, `identity_signup_request`는 이미 runtime 모델로 올라와 있다.
2. 모바일/API self-service 흐름은 `identity-signup-requests`, `identity-login`, `identity-consent`, `identity-recovery`, `identity-login-methods`로 충분히 닫혀 있다.
3. 두 웹 콘솔은 아직 `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/me`와 legacy `AccountSummary` 모양에 직접 묶여 있다.
4. admin/operator 웹은 아직 `account_id`, `role`, `is_active`, `route_no`를 세션과 다른 서비스 참조키로 그대로 사용한다.
5. `service-driver-profile`, `service-driver-operations-view`도 아직 `account_id`를 legacy account identifier로 본다.

즉 새 정본은 이미 생겼지만, 웹과 일부 read path는 아직 legacy account identity를 외부 참조로 쓰고 있다.

## 선택지 비교

### 1. 웹 프론트를 먼저 전부 `identity-*`로 교체

장점:

- 최종형에 가장 가깝다.
- compatibility 계층을 길게 유지하지 않는다.

단점:

- 현재 웹은 `account_id`를 UI 세션, driver link, read model 참조키로 동시에 쓰고 있다.
- admin/operator 권한 UI도 아직 `admin/user` 2단계에 묶여 있다.
- 이번 phase 범위를 크게 넘긴다.

### 2. `identity/account`를 정본으로 올리고, `legacy Account`를 웹 호환 projection으로 남김

장점:

- 모바일과 신규 API는 새 정본으로 바로 간다.
- 현재 웹은 기존 `/auth/*`와 `AccountSummary`를 유지할 수 있다.
- 전환기 boundary가 분명하다.

단점:

- compatibility 계층과 sync 규칙이 필요하다.
- 일정 기간 legacy `Account`를 runtime에 남겨야 한다.

### 3. legacy auth와 identity auth를 둘 다 계속 독립 운영

장점:

- 당장 구현량은 가장 적다.

단점:

- self-signup, 권한, 회사 소속 정본이 다시 둘로 갈라진다.
- 지금까지 고정한 auth current truth를 무너뜨린다.

## 선택된 접근

phase 1은 2번을 current truth로 채택한다.

한 줄로 줄이면 이렇다.

`identity + system_admin_account / manager_account / driver_account`가 정본이고, `legacy Account + /auth/*`는 웹 호환 projection이다.

## phase 1 경계

### 정본

아래는 phase 1부터 정본으로 본다.

1. `identity`
2. `identity_login_method`
3. `email_credential`, `phone_credential`, `social_credential`, `password_credential`
4. `system_admin_account`
5. `manager_account`
6. `driver_account`
7. `identity_signup_request`
8. `identity_consent_current`, `identity_consent_history`
9. `driver_account_link`

### 호환층

아래는 phase 1에서만 유지하는 transition compatibility surface다.

1. `Account` model
2. `/auth/login`
3. `/auth/refresh`
4. `/auth/logout`
5. `/auth/me`
6. `/auth/change-password`
7. `/auth/accounts/*`
8. `/auth/account-driver-links`

### 즉시 종료하는 legacy 흐름

아래는 phase 1에서 public flow에서 제거한다.

1. `POST /auth/register`

신규 가입은 반드시 `identity-signup-requests`로만 들어가야 한다.

## legacy Account의 새 의미

phase 1부터 `Account`는 사람/권한 정본이 아니다.

새 의미는 아래와 같다.

1. 현재 웹 콘솔이 기대하는 `account_id`, `route_no`, `email`, `role`, `is_active` 모양을 유지하는 compatibility projection
2. driver profile, driver read model이 아직 참조하는 legacy account identifier anchor
3. 최종 제거 전까지의 전환기 web session principal

즉 `Account`는 더 이상 self-signup의 source of truth가 아니다.

## projection 규칙

### projection 단위

1. legacy `Account` projection은 `identity` 기준으로 최대 1개만 유지한다.
2. `manager_account`와 `system_admin_account`가 같은 `identity` 아래 공존해도 projection row는 하나만 쓴다.
3. `driver_account`는 웹 계정이 아니므로 projection 생성 대상이 아니다.

### projection 생성 조건

아래를 모두 만족할 때만 web projection을 활성 상태로 유지한다.

1. `identity.status = active`
2. `identity`에 active `system_admin_account` 또는 active `manager_account`가 있음
3. verified `email login method`가 있음
4. `password_credential`가 있음

### projection role 매핑

현재 웹 콘솔 구조가 아직 `admin / user` 2단계만 알기 때문에 phase 1은 아래처럼 축약한다.

1. `system_admin_account` -> `Account.role = admin`
2. 모든 active `manager_account` -> `Account.role = admin`

이 매핑은 transition 전용이다. 최종 정본 역할은 여전히 `system_admin / company_super_admin / vehicle_manager / settlement_manager`다. `vehicle_manager`, `settlement_manager`를 legacy `user`로 내리면 현재 웹 admin console 접근이 막히므로, phase 1 projection에서는 manager 계열을 모두 `admin`으로 본다.

### projection 식별자

1. 기존 `account_id`, `route_no`는 웹과 타 서비스 참조를 위해 유지한다.
2. phase 1에서는 새 `identity`나 `manager_account`가 생겨도 가능한 한 같은 projection row를 재사용한다.
3. 회사 변경, 역할 변경이 있어도 transition projection identity anchor는 유지한다.

### projection scrub 규칙

아래 상황에서는 projection을 더 이상 로그인 정체성으로 유지하지 않는다.

1. `identity archived`
2. 마지막 로그인 수단 삭제
3. verified email 부재
4. password credential 부재
5. active web-eligible account 부재

이 경우 projection은 아래처럼 처리한다.

1. `is_active = false`
2. 실제 이메일과 비밀번호 해시는 남기지 않는다
3. historical `account_id`, `route_no`는 참조 안정성을 위해 남긴다

## endpoint 사용 규칙

### 모바일 / 신규 API 클라이언트

반드시 아래만 사용한다.

1. `identity-signup-requests/*`
2. `identity-login`
3. `identity-refresh`
4. `identity-logout`
5. `identity-me`
6. `identity-profile`
7. `identity-consent/*`
8. `identity-login-methods/*`
9. `identity-password`
10. `identity-recovery`

### 현재 웹 콘솔

phase 1에서는 아래를 계속 사용한다.

1. `/auth/login`
2. `/auth/refresh`
3. `/auth/logout`
4. `/auth/me`
5. `/auth/change-password`
6. `/auth/accounts/*`
7. `/auth/account-driver-links`

단, 이 surface는 신규 기능 확장 대상이 아니라 호환 유지 대상이다.

## phase 1 구현 원칙

1. public signup은 `identity-signup-requests` 한 경로로만 받는다.
2. 새 `manager_account` 승인/setup이 끝나면 web projection sync를 수행한다.
3. `identity-password`, `identity-login-methods`, `identity archive/recovery`는 projection sync를 같이 수행한다.
4. legacy `/auth/*`는 가능한 한 response contract를 깨지 않는다.
5. 현재 웹 콘솔 타입을 깨는 payload 변화는 phase 1에서 하지 않는다.

## phase 1 완료 기준

아래가 성립하면 phase 1이 완료된 것이다.

1. 신규 가입은 legacy `/auth/register`로 들어가지 않는다.
2. `manager_account` 기반 사용자는 legacy `/auth/*`로 현재 웹 콘솔에 로그인할 수 있다.
3. `identity-password`와 마지막 로그인 수단 삭제가 web projection에도 일관되게 반영된다.
4. `service-account-access` 테스트에서 legacy self-signup 차단과 projection sync가 보장된다.

## phase 2 이후

phase 2의 목표는 compatibility를 줄이는 것이다.

1. 웹 콘솔을 `identity-*` 세션 구조로 직접 전환
2. `AccountSummary` 대신 `identity + active_account`로 프론트 타입 재정의
3. driver/profile/read path에서 legacy `account_id` 의존 제거
4. 최종적으로 `Account` compatibility projection과 legacy `/auth/*` 제거

## 제외 범위

이번 phase 1에서 아래는 하지 않는다.

1. 웹 콘솔 전체 세션 구조 교체
2. `service-driver-profile`, `service-driver-operations-view`의 `account_id` 제거
3. 최종 role-based web UI 재설계
4. invite 도입
