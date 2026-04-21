# Cheonha Driver App Minimum Design

## Purpose

이 문서는 `천하운수` 1차 배송원 앱을 **최소 개발 범위**로 고정한다.

이번 설계의 목적은 아래와 같다.

1. 1차 앱을 `업무기록 1화면 + MY페이지`로 축소 고정한다.
2. 회원가입, 로그인, 자동 로그인 규칙을 천하운수 문맥 기준으로 닫는다.
3. `배송원`, `system_admin` 계정의 앱 진입 규칙을 고정한다.
4. 최소 범위를 위해 필요한 backend read contract와 auth 예외를 정리한다.

## Current Context

이 설계는 아래 current truth 위에서 읽는다.

- `docs/superpowers/plans/2026-04-21-front-driver-app-native-bootstrap-implementation-plan.md`
- `docs/contracts/15-auth-api-scenario-map.md`
- `docs/decisions/specs/2026-04-03-identity-account-auth-design.md`
- `docs/mappings/current-runtime-inventory.md`
- `docs/mappings/repo-responsibility-matrix.md`

현재 active 앱 방향은 native bootstrap plan과 이 minimum design을 함께 본다.
이 문서는 천하운수 1차 범위를 아래 항목으로 고정한다.

1. 1차 앱 화면 범위
2. 회원가입 입력 항목
3. 로그인 식별자 규칙
4. 관리자 모드 처리 방식

## Current Technical Decision

현재 앱 bootstrap과 운영 기준은 아래처럼 고정한다.

1. framework는 `React Native + Expo`다.
2. 제품 정의는 `실제 Android/iOS 네이티브 앱`이다.
3. 운영 원칙은 `native-only`다.
4. web은 target이 아니다.
5. `Expo Go`는 학습/실험 도구일 뿐, 현재 1차 개발 기준으로 의존하지 않는다.
6. local native run 기준 명령은 `npx expo run:ios`, `npx expo run:android`다.
7. 초기 배포는 local/CI native build를 우선 보고, `EAS`는 필요 시 후속 채택으로 본다.

## Scope

이번 문서는 아래만 다룬다.

1. 천하운수 1차 앱 제품 경계
2. 회원가입 / 로그인 / 자동 로그인
3. 배송원 업무기록 화면
4. 배송원 MY페이지
5. system admin 빈 화면 처리
6. 필요한 최소 backend API

이번 문서는 아래를 다루지 않는다.

1. 공지
2. 알림
3. 문의
4. 배차 상세 / 차량 상세
5. 관리자용 운영 기능
6. 멀티회사 진입
7. 링크 기반 회사 bootstrap
8. 전화번호 로그인

## Primary Decision

천하운수 1차 앱은 `clever-driver` 공용 앱 코어를 전제로 하더라도, 실제 동작 범위는 아래처럼 고정한다.

1. 회사 문맥은 `천하운수`로 고정한다.
2. 화면은 `업무기록`과 `MY`만 둔다.
3. 배송원 사용자는 웹에서 업로드된 일자별 `근태 + 배송이력` 박스를 앱에서 읽기 전용으로 확인한다.
4. system admin은 앱 진입은 허용하되, 전용 화면 본문은 비워 둔다.

즉 이번 1차 앱은 `운영앱`이 아니라 `최소 self-service 기록 확인 앱`이다.

## User Boundary

### Allowed accounts

- `driver_account`
- `system_admin_account`

### Blocked accounts

- `manager_account`

### Entry rules

1. `driver_account`
   - 정상 진입
   - `업무기록`, `MY` 사용 가능
2. `system_admin_account`
   - 앱 진입 허용
   - 관리자 전용 메인 화면 본문은 비움
   - 로그아웃 버튼만 있는 단일 빈 화면만 사용
3. `manager_account`
   - 앱 진입 차단
   - 1차에서는 별도 관리자 앱 대상이 아니다

## Tenant / Company Contract

1. 회사 문맥은 `천하운수`로 고정한다.
2. 회사 선택 UI는 두지 않는다.
3. 회원가입 request와 driver account 생성은 모두 천하운수 company scope로 고정한다.
4. 이후 다회사 확장은 이번 문서 범위 밖이다.

## Minimum Information Architecture

### 1. Driver mode

배송원 모드는 아래 두 화면만 가진다.

1. `업무기록`
2. `MY`

하단 navigation을 둔다면 이 두 항목만 둔다.
상단 타이틀, 필터, 정산 워크스페이스, 공지/문의 메뉴는 두지 않는다.

### 2. System admin mode

system admin은 별도 운영 화면을 두지 않는다.

원칙:

1. 메인 화면 본문은 비워 둔다.
2. 점검 카드, 점검 버튼, 운영 패널도 두지 않는다.
3. 1차에서는 사실상 비어 있는 placeholder surface로만 둔다.
4. 로그아웃은 메인 빈 화면에서만 처리하며, 별도 `MY` 진입 경로는 제공하지 않는다.

## Screen Design

### 1. 업무기록

`업무기록`은 날짜 리스트 화면 하나로 고정한다.

구성:

1. 날짜 내림차순 카드 리스트
2. 카드 1개 = 날짜 1개
3. 카드 안에 `근태`, `배송이력` 두 블록만 표시

각 날짜 카드에서 보여주는 최소 정보:

- `date`
- `attendance.final_status`
- `delivery_history.delivery_count`
- `delivery_history.source_record_count`
- `delivery_history.status`

원칙:

1. 읽기 전용이다.
2. 수정, 승인, 업로드, 예외처리 CTA를 두지 않는다.
3. 상세 drill-down도 1차에서는 두지 않는다.
4. 데이터가 없으면 빈 상태만 보여준다.
5. **연동 누락 UX:** `needs_link` 상태일 경우, 화면 전체에 흐린 배경(Blur)을 적용하고 "배송원 연동이 필요합니다" 안내 문구와 가이드를 중앙에 노출한다.

### 2. MY

`MY`는 배송원 self-service 최소 화면으로 고정한다.

포함 항목:

1. 이름
2. 이메일
3. 가입 연락처 전화번호
4. 계정 연동 상태
5. `연동 필요` 버튼
6. 비밀번호 변경
7. 로그아웃

`연동 필요` 버튼 규칙:

1. active `driver_account_link`가 없을 때만 노출한다.
2. 1차에서는 실제 요청 기능을 만들지 않는다.
3. 누르면 앱 내부 디버깅 로그만 남긴다.
4. backend write API는 호출하지 않는다.

### 3. 관리자 빈 화면

system admin 메인 화면은 아래만 가진다.

1. **단일 빈 본문:** 관리자에게는 별도 메뉴나 MY 페이지 진입 경로를 제공하지 않고, 로그아웃 버튼만 포함된 단일 빈 화면을 노출한다.
2. 앱 shell 수준의 최소 헤더

즉 관리자 전용 본문 콘텐츠는 1차에서 의도적으로 비워 둔다.

## Signup and Login

### 1. Login

로그인은 `이메일 + 비밀번호`만 허용한다.

허용 입력:

1. 이메일
2. 비밀번호
3. 자동 로그인 체크박스

허용하지 않는 것:

1. 전화번호 로그인
2. 소셜 로그인

### 2. Auto login

자동 로그인은 체크박스 선택형으로 고정한다.

규칙:

1. 체크한 경우: 앱 재실행 시에도 세션이 유지되도록 Refresh Token을 Cookie Jar(Persistent Storage)에 저장한다.
2. 체크하지 않은 경우: 앱 종료 시(세션 만료 시) 쿠키를 삭제하여 재실행 시 다시 로그인하도록 한다.
3. 구현은 access token 메모리 유지 + refresh session 저장 여부 분기 기준으로 본다.

### 3. Signup

회원가입은 아래 입력만 가진다.

- `이름`
- `이메일`
- `010-0000-0000`
- `1900-01-01`
- `비밀번호`
- `비밀번호 확인`
- 필수 동의 2종

표현 규칙:

1. 모든 입력은 `label` 없이 placeholder만 보인다.
2. 동의만 checkbox다.
3. 나머지는 모두 text 입력 기반이다.
4. 전화번호와 생년월일도 picker 없이 text 입력으로 받는다.
5. 전화번호는 사용자가 `01000000000`처럼 입력하면 화면에는 `010-0000-0000`으로 보여준다.
6. 생년월일은 사용자가 `19900101`처럼 입력하면 화면에는 `1990-01-01`로 보여준다.
7. 비밀번호와 비밀번호 확인은 placeholder만 쓰되 input type은 `password`를 유지한다.

placeholder 고정값:

- `이름`
- `이메일`
- `010-0000-0000`
- `1900-01-01`
- `비밀번호`
- `비밀번호 확인`

### 4. Signup request behavior

회원가입은 auth 정본을 완전히 버리지 않고 아래처럼 처리한다.

1. `identity` 생성
2. `identity_signup_request(driver_account_create)` 생성
3. 천하운수 driver signup은 즉시 auto-approve
4. `driver_account(active)` 생성
5. 가입 직후 로그인 가능 상태로 본다

즉 사용자 경험은 `승인 대기 없음`이지만, 내부 이력은 `signup request`를 유지한다.

## Signup Data Contract

회원가입 payload는 아래 의미를 가진다.

- `name`
- `birth_date`
- `email`
- `password`
- `contact_phone_number`
- `company_id`
- `request_types=['driver_account_create']`
- 필수 동의 2종

중요 원칙:

1. `contact_phone_number`는 **연락처 정보**다.
2. 1차에서는 로그인 수단이 아니다.
3. **PhoneCredential 자동 생성:** 데이터 유실 방지와 기존 모델 호환을 위해, 회원가입 시 `contact_phone_number`를 기반으로 `PhoneCredential`을 비명시적으로 자동 생성하여 저장한다.
4. 즉 `전화번호 로그인 방식`과 `가입 연락처 전화번호`는 같은 개념으로 취급하지 않지만, 내부적으로는 동일한 저장소를 활용한다.

현재 auth 코드에는 `phone/password signup` 흔적이 남아 있지만, 이 1차 앱 설계에서는 사용하지 않는다.

## Backend Contract

### 1. Auth

재사용 API:

- `POST /api/auth/identity-login/`
- `POST /api/auth/identity-refresh/`
- `POST /api/auth/identity-logout/`
- `GET /api/auth/identity-me/`
- `PUT /api/auth/identity-password/`
- `POST /api/auth/identity-signup-requests/`

필요 변경:

1. public signup payload에 `contact_phone_number` 수용
2. 천하운수 `driver_account_create` auto-approve 유지 또는 명시적 적용
3. `identity-me` 또는 equivalent self endpoint에 `driver_link_status` 추가

### 2. Work logs

권장 신규 endpoint:

- `GET /api/driver-ops/me/work-logs/?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD`

owner:

- `service-driver-operations-view`

역할:

1. 세션의 active `driver_account`에서 active `driver_account_link`를 해석한다.
2. linked driver 기준으로 attendance truth와 delivery snapshot을 조합한다.
3. 날짜별 카드 배열을 내려준다.

이 endpoint를 채택하는 이유는 아래다.

1. 앱이 `attendance`와 `delivery-record`를 직접 조합하지 않아도 된다.
2. 앱은 카드 렌더링만 담당하면 된다.
3. 최소 개발 범위에 맞다.

### 3. My page

`MY`는 아래 API를 사용한다.

- `GET /api/auth/identity-me/`
- `GET /api/auth/identity-profile/`
- `PUT /api/auth/identity-password/`
- `POST /api/auth/identity-logout/`

1차에서는 `identity-login-methods`는 쓰지 않는다.
즉 `로그인 방식 관리`는 scope 밖이다.

## Account Link Status

`MY`에서 보여주는 계정 연동 상태는 아래 둘 중 하나로 충분하다.

- `linked`
- `needs_link`

선택적으로 아래 값도 함께 줄 수 있다.

- `linked_driver_id`

앱 버튼 규칙:

1. `needs_link`이면 `연동 필요` 버튼 노출
2. 탭 시 실제 API 호출 없이 debug log만 기록
3. 예:
   - `driver_link_request_clicked`
   - `identity_id`
   - `active_account_id`
   - `company_id`

## Assumptions

이번 설계는 아래를 가정한다.

1. system admin도 앱 채널 진입은 허용한다.
2. system admin은 로그아웃 버튼만 있는 단일 빈 메인 화면만 사용한다.
3. 천하운수 `driver_account_create`는 server setting 기준 auto-approve 대상으로 유지한다.
4. 가입 연락처 전화번호는 로그인 수단으로 사용하지 않지만, 내부 저장은 `PhoneCredential` 자동 생성으로 처리한다.

## Explicit Non-Goals

1. 전화번호 로그인
2. 로그인 방식 추가/삭제 화면
3. 공지
4. 알림
5. 문의
6. 배차 상세
7. 정산
8. system admin 운영 기능
9. 멀티회사 확장
10. 실제 계정 연동 요청 기능

## Completion Signal

이 문서 기준 1차가 완료되었다고 보려면 아래가 성립해야 한다.

1. 배송원이 이메일/비밀번호로 로그인할 수 있다.
2. 자동 로그인 체크 여부에 따라 세션 복구가 달라진다.
3. 회원가입 폼이 지정된 placeholder와 text-mask 규칙을 따른다.
4. 가입 시 연락처 전화번호를 받되 로그인 방식으로 만들지 않는다.
5. 배송원 앱 메인 기능이 날짜별 `근태 + 배송이력` 카드 리스트로 동작한다.
6. `MY`에서 계정 연동 상태, 비밀번호 변경, 로그아웃을 처리한다.
7. `연동 필요` 버튼은 실제 기능 없이 debug log만 남긴다.
8. system admin 메인 화면 본문은 비어 있다.
