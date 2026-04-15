# Auth Final Cutover Design

## 목적

이 문서는 auth 전환기의 마지막 current truth를 고정한다.

이번 phase의 목표는 아래를 동시에 만족하는 것이다.

1. `service-account-access`에서 legacy `Account`와 legacy `/auth/*`를 제거한다.
2. 웹과 모바일 모두 `identity-*` 세션/인증 API만 사용하게 한다.
3. 다른 서비스는 더 이상 legacy `Account` row를 조회하지 않는다.
4. 토큰 계약은 `identity + active product account`를 정본으로 삼고, 필요한 범위의 generic claim만 유지한다.

## phase 1 종료 상태

phase 1 종료 시점의 사실은 아래와 같다.

1. `identity`, `identity_login_method`, `credential`, `system_admin_account`, `manager_account`, `driver_account`, `driver_account_link`는 정본으로 이미 runtime에 올라와 있다.
2. 모바일/API self-service 흐름은 `identity-*` API만으로 충분히 닫혀 있다.
3. 웹 콘솔은 아직 legacy `/auth/*`와 `AccountSummary`에 묶여 있다.
4. `service-driver-profile`, `service-driver-operations-view`는 아직 legacy `account_id`를 참조한다.
5. `service-account-access` 안에는 phase 1 compatibility surface로 `Account` model과 `/auth/*`가 남아 있다.

즉 정본은 이미 새 구조로 바뀌었고, 남은 일은 compatibility surface와 legacy 참조를 전부 제거하는 것이다.

## 선택지 비교

### 1. legacy `Account`를 내부 projection으로 계속 유지

장점:

- 구현량이 가장 적다.

단점:

- 최종형이 아니다.
- 새 정본과 옛 projection을 계속 이중 운영하게 된다.
- 지금 사용자 요청인 "레거시 모두 제거"와 맞지 않는다.

### 2. 토큰 계약만 바꾸고, 웹은 나중에 옮긴다

장점:

- 서비스 코드 영향은 상대적으로 적다.

단점:

- 웹이 계속 legacy `/auth/*`에 묶인다.
- 최종 current truth가 다시 phase 1에 머무른다.

### 3. 같은 브랜치에서 단계적으로 자르되, 최종 산출물에는 compatibility를 남기지 않는다

장점:

- 구현 순서는 안전하게 가져갈 수 있다.
- 최종 결과는 `identity-only auth`로 닫힌다.
- 테스트/검증을 repo별로 나눠 할 수 있다.

단점:

- repo가 여러 개라 구현량이 크다.

## 선택된 접근

이번 phase는 3번을 current truth로 채택한다.

한 줄로 줄이면 이렇다.

`identity + active product account`만 남기고, legacy Account/runtime auth surface는 모두 제거한다.

## 최종 세션 및 토큰 계약

### 세션 응답 정본

웹과 모바일이 공통으로 쓰는 세션 응답 정본은 아래 구조다.

1. `access_token`
2. `session_kind`
3. `identity`
4. `active_account`
5. `available_account_types`

legacy `account` 요약 payload는 최종 current truth에서 제거한다.

### access token claim

최종 access token은 아래를 가진다.

1. `sub`
2. `principal_kind`
3. `identity_id`
4. `active_account_id` (active account가 있을 때)
5. `active_account_type` (active account가 있을 때)
6. `company_id` (company-scoped account일 때)
7. `email`
8. `role`
9. `role_type` (manager account일 때)
10. 표준 JWT claim (`iss`, `aud`, `iat`, `exp`, `jti`, `type`)

### claim 의미

1. `identity_id`는 사람 정본 식별자다.
2. `active_account_id`는 현재 행동 주체인 제품 account 식별자다.
3. `sub`는 아래 규칙으로 둔다.
   - active account가 있으면 `active_account_id`
   - active account가 없는 제한 세션이면 `identity_id`
4. `role`은 다른 서비스의 generic write gate를 위한 compatibility claim이다.
   - `system_admin_account`, `manager_account` -> `admin`
   - `driver_account` -> `user`
5. `role_type`은 최종 정본 역할을 표현한다.
   - `company_super_admin`
   - `vehicle_manager`
   - `settlement_manager`
6. `principal_kind`는 일반 identity 세션인지, 동의 복구 제한 세션인지 구분한다.

이 claim 계약은 legacy `Account`를 유지하기 위한 것이 아니라, 다른 서비스가 product account 기준으로 동작하도록 하는 최종 계약이다.

## endpoint current truth

### 유지하는 endpoint

아래만 남긴다.

1. `/identity-signup-requests/*`
2. `/identity-login`
3. `/identity-refresh`
4. `/identity-logout`
5. `/identity-me`
6. `/identity-profile`
7. `/identity-consent/*`
8. `/identity-login-methods/*`
9. `/identity-password`
10. `/identity-recovery`
11. 새 `driver_account_link` 조회 endpoint

### 제거하는 endpoint

아래는 최종 current truth에서 제거한다.

1. `/register`
2. `/login`
3. `/refresh`
4. `/logout`
5. `/me`
6. `/change-password`
7. `/accounts/*`
8. `/account-driver-links/*`

## 웹 콘솔 current truth

### 공통

1. 웹 런타임은 `front-web-console` 하나만 남긴다.
2. 웹은 `identity-login`, `identity-refresh`, `identity-me`, `identity-logout`만 사용한다.
3. 웹 세션 정본은 legacy `AccountSummary`가 아니라 `identity + active_account`다.
4. 웹은 `system_admin_account` 또는 `manager_account`만 사용한다.
5. `driver_account`는 웹 세션 대상이 아니다.
6. 비로그인 첫 진입은 `로그인 / 회원가입 요청 / identity 복구`를 같은 웹에서 처리한다.
7. 화면 분리는 별도 operator 앱이 아니라 `권한별 UI 노출/액션`으로 처리한다.

### 통합 웹 콘솔

1. legacy account CRUD 화면은 제거한다.
2. `/accounts`는 legacy account 목록이 아니라 auth request 관리 화면으로 대체한다.
3. legacy `/admin/accounts*` 경로는 남기지 않는다.
4. `RequireAdmin`는 legacy `role === admin`이 아니라 아래로 판단한다.
   - `active_account.account_type in {system_admin, manager}`
5. 기존 `front-operator-console`의 read/self-service 화면은 통합 웹으로 이관하고, 별도 active runtime으로 유지하지 않는다.

## driver 참조 current truth

### service-driver-profile

1. `DriverProfile.account_id`는 제거한다.
2. driver 정본은 더 이상 account FK를 저장하지 않는다.
3. 배송원 계정 연결 정본은 `service-account-access.driver_account_link`만 남긴다.

### service-driver-operations-view

1. driver summary는 legacy account detail lookup을 하지 않는다.
2. account service에서 active `driver_account_link`와 linked driver account summary를 읽는다.
3. `driver360` 응답의 account 블록은 legacy account 요약이 아니라 아래 성격으로 바뀐다.
   - `driver_account_id`
   - linked `identity`의 display name
   - linked login email
   - `driver_account` active 여부

## 하위 서비스 auth current truth

1. 하위 서비스는 legacy `Account` row를 조회하지 않는다.
2. 하위 서비스의 generic auth gate는 access token의 `role` claim을 읽는다.
3. 자기 도메인에서 actor 식별이 필요하면 `active_account_id` 또는 `sub`를 사용한다.
4. `sub`의 의미는 legacy account id가 아니라 active product account id다.

즉 `account_id`라는 필드명이 남더라도 그 의미는 최종적으로 "active product account id"이며, legacy `Account` FK가 아니다.

## migration 원칙

1. `service-account-access`에서 legacy `Account`와 관련 serializer/view/test를 먼저 identity-only로 치환한다.
2. 두 웹 콘솔은 같은 phase에서 identity session payload로 전환한다.
3. `service-driver-profile`, `service-driver-operations-view`는 같은 phase에서 legacy `account_id` 참조를 제거한다.
4. phase 완료 후에는 `legacy_account_projection_service`와 projection sync는 남기지 않는다.

## 완료 기준

아래가 모두 성립하면 이번 phase가 완료된 것이다.

1. `service-account-access`에 legacy `Account` model과 legacy `/auth/*`가 없다.
2. 단일 웹 콘솔이 `identity-*` auth API만 사용한다.
3. admin 콘솔에 legacy account CRUD 화면이 없다.
4. `service-driver-profile`에 `DriverProfile.account_id`가 없다.
5. `service-driver-operations-view`가 legacy account lookup을 하지 않는다.
6. 새 access token 계약으로 웹/서비스 테스트가 모두 통과한다.

## 제외 범위

이번 phase에서 아래는 하지 않는다.

1. social login provider 실제 연동
2. invite 도입
3. 감사/디버그 전용 debug context
4. support/notification domain의 actor field 이름 정리

social login provider 실제 연동은 이번 phase에서 구현하지 않는다. 다만 후속 상용 구현 시 legacy/reference source인 `ev-dashboard-server/src/social_auth/`를 `provider adapter` 참고용으로만 사용한다. 회사 귀속, 승인, 계정 생성, 세션/토큰, 제품 workflow는 이 문서와 `Identity Account Auth Design`의 current truth를 그대로 따른다.
