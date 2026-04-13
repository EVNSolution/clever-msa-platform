# Driver App MVP Design

## 목적

이 문서는 CLEVER MSA 문서와 현재 API 계획을 기준으로 `배송원 전용 모바일 앱`의 1차 MVP 범위를 고정한다.

이번 설계의 목표는 아래와 같다.

1. Android/iOS 통합 개발 방식과 repo 방향을 고정한다.
2. `driver_account` 전용 앱이라는 제품 경계를 고정한다.
3. 1차 MVP 화면, API 재사용 범위, 필요한 backend 보강 지점을 정리한다.
4. 제한 베타 배포와 이후 `Shorebird` patch 운영까지 이어지는 실무 경로를 고정한다.

## 배경과 현재 문맥

현재 플랫폼의 공식 rollout truth는 `웹 1차 완성 후 앱 2차`다.

- `docs/rollout/16-web-first-platform-delivery-order.md`
- `docs/contracts/15-auth-api-scenario-map.md`
- `docs/contracts/17-admin-communication-pages.md`
- `docs/contracts/18-single-web-console-screen-map.md`
- `docs/mappings/current-runtime-inventory.md`

현재 기준으로 웹 운영 경로는 이미 `front-web-console` 하나로 정리되어 있고, 앱은 후순위였지만 다음 이유로 배송원 앱 MVP를 별도로 시작한다.

1. 배송원 self-service를 웹과 독립된 채널로 검증할 필요가 있다.
2. 여러 회사/플릿을 제한 베타로 실사용 검증하려면 단일 웹만으로는 테스트 동선이 길다.
3. 현재 MSA 경계와 auth 계약이 배송원 앱 1차를 수용할 수준까지는 정리되어 있다.

## 사용자와 제품 경계

이번 앱은 `배송원 전용 앱`으로 고정한다.

### 허용 사용자

- `driver_account`

### 차단 사용자

- `system_admin_account`
- `manager_account`

차단 사용자가 로그인에 성공하더라도 앱 홈으로 진입시키지 않는다.
세션 판정 후 차단 화면으로 보내고 아래 문구만 보여준다.

- `추후 업데이트 될 예정입니다`

즉 이번 1차는 `관리자 보조 앱`이 아니라 `배송원 앱`이다.

## 고려한 접근

### 접근 A. 커뮤니케이션 MVP

- 로그인
- 내 계정
- 공지
- 알림
- 문의

장점:

1. 가장 빠르다.
2. 기존 API 재사용 비율이 높다.

단점:

1. 배송원 운영앱으로서의 가치가 약하다.
2. 제한 베타에서 회사/플릿별 업무 차이를 충분히 검증하기 어렵다.

### 접근 B. 운영 읽기 MVP

- 로그인
- 내 계정
- 공지
- 알림
- 문의
- 내 근태 조회
- 내 배차/차량 조회

쓰기 범위:

- 문의 작성
- 알림 읽음 처리
- 프로필 일부 수정

장점:

1. 배송원 self-service와 오늘 업무 확인이라는 핵심 가치를 같이 검증할 수 있다.
2. 현재 문서와 API 계약을 크게 흔들지 않는다.
3. 운영 write truth를 새로 만들지 않아도 된다.

단점:

1. self-scoped read endpoint가 몇 개 필요하다.

### 접근 C. 정산 포함 확장 MVP

- 접근 B 전체
- 내 정산 조회

장점:

1. 배송원 입장에서 더 완성도 높은 앱처럼 보인다.

단점:

1. 1차 범위가 커진다.
2. settlement read 흐름과 화면 설계까지 같이 검증해야 한다.

## 선택된 접근

이번 설계에서는 `접근 B. 운영 읽기 MVP`를 선택한다.

선택 이유는 아래와 같다.

1. 현재 문서에서 이미 닫힌 `auth`, `announcement`, `notification`, `support` 축을 바로 재사용할 수 있다.
2. `attendance`, `dispatch`는 owner service를 바꾸지 않고 self-scoped read query만 추가하면 된다.
3. 제한 베타에서 여러 회사/플릿을 실제로 검증하려면 오늘 배차와 근태 확인이 빠지면 안 된다.
4. 정산까지 같이 넣으면 1차 일정이 크게 늘어난다.

## 1차 MVP 범위

### 포함 범위

1. 스플래시 / 세션 복구
2. 로그인
3. 차단 화면
4. 내 홈
5. 내 공지
6. 내 알림함
7. 문의 목록 / 상세 / 작성 / 답변 thread
8. 내 계정
9. 내 근태 조회
10. 내 배차 / 차량 조회
11. Android/iOS 제한 베타 배포

### 1차 허용 쓰기

1. 문의 작성
2. 문의 thread 응답 작성
3. 알림 읽음 처리
4. 프로필 일부 수정
5. 비밀번호 변경
6. 푸시 토큰 등록 / 갱신 / 비활성화

### 제외 범위

1. 관리자 기능
2. 회원가입 요청 앱 UX
3. 관리자 승인 workflow
4. 정산 조회
5. 출근/근태 상태 직접 변경
6. 배차 확인/응답 액션
7. 실시간 위치 / 텔레메트리 업로드
8. Kakao SDK 실제 연동
9. 네이티브 전용 기능 대량 도입

## 기술 선택

### 앱 프레임워크

- `Flutter`

### 선택 이유

1. Android/iOS를 단일 코드베이스로 빠르게 닫을 수 있다.
2. 에이전트와 사람이 같은 구조를 읽고 수정하기 쉽다.
3. UI, 상태관리, 네트워킹을 한 언어와 한 프로젝트 구조에서 유지할 수 있다.
4. 이후 `Shorebird` patch 운영과도 자연스럽게 연결된다.

### 권장 라이브러리

- 상태관리: `Riverpod`
- 라우팅: `go_router`
- HTTP: `dio`
- 모델: `freezed`, `json_serializable`
- 보안 저장소: `flutter_secure_storage`
- 비민감 설정: `shared_preferences`
- 푸시: `firebase_messaging`
- 관측성: `Sentry`

## Repo 방향

새 모바일 앱은 새 child repo로 분리한다.

- `development/front-driver-app/`

이 repo는 플랫폼 루트의 linked child repo로 바로 등록한다.
루트는 문서와 repo visibility를 관리하고, 실제 앱 구현은 child repo가 소유한다.

## 앱 아키텍처

이번 앱은 `기능 기준 feature 구조`로 잡는다.

```text
front-driver-app/
├── lib/
│   ├── app/
│   ├── core/
│   │   ├── auth/
│   │   ├── env/
│   │   ├── error/
│   │   ├── networking/
│   │   ├── storage/
│   │   └── design/
│   ├── features/
│   │   ├── splash/
│   │   ├── login/
│   │   ├── blocked/
│   │   ├── home/
│   │   ├── announcements/
│   │   ├── notifications/
│   │   ├── support/
│   │   ├── account/
│   │   ├── attendance/
│   │   └── dispatch/
│   └── shared/
└── ...
```

원칙은 아래와 같다.

1. 화면과 상태는 feature 기준으로 나눈다.
2. 인증, 네트워크, 에러, 보안 저장소는 `core`에 둔다.
3. 앱은 MSA repo 경계를 직접 복제하지 않는다.
4. API ownership은 backend service에 두고, 모바일은 consumer feature 기준으로 조합한다.

## 세션과 권한 원칙

앱은 `identity-*` auth API만 사용한다.

사용 endpoint:

1. `POST /api/auth/identity-login/`
2. `POST /api/auth/identity-refresh/`
3. `POST /api/auth/identity-logout/`
4. `GET /api/auth/identity-me/`
5. `GET/PATCH /api/auth/identity-profile/`
6. `PUT /api/auth/identity-password/`

앱의 세션 판정 규칙은 아래와 같다.

1. `active_account.account_type == driver` 이면 앱 진입 허용
2. `active_account.account_type in {system_admin, manager}` 이면 차단 화면 이동
3. `session_kind == consent_recovery` 이면 복구 전용 흐름만 허용
4. access token은 앱 메모리 + secure storage 기반으로 관리한다
5. refresh는 cookie 기반 current contract를 그대로 따른다

## 화면과 API 매핑

### 1. 스플래시 / 세션 복구

재사용 API:

- `POST /api/auth/identity-refresh/`
- `GET /api/auth/identity-me/`

역할:

1. 세션 복구
2. active account type 판별
3. 차단/로그인/홈 분기

### 2. 로그인

재사용 API:

- `POST /api/auth/identity-login/`

1차에서는 `email/password` 중심으로 닫는다.
social login은 contract만 유지하고 실제 앱 UX는 후속 단계로 미룬다.

### 3. 차단 화면

API 없음.

노출 조건:

- 로그인 성공 후 active account가 `driver`가 아닐 때

### 4. 내 홈

이 화면은 앱의 요약 허브다.

필요 정보:

1. 내 기본 프로필
2. 회사 / 플릿
3. 오늘 근태 상태
4. 오늘 배차 / 차량 요약
5. 경고 메시지

권장 신규 endpoint:

- `GET /api/driver-ops/me/home/`

소유 서비스:

- `service-driver-operations-view`

이 endpoint는 새 BFF가 아니라 기존 read-model 안의 self-scoped query다.

### 5. 내 공지

재사용 API:

1. `GET /api/announcements/`
2. `GET /api/announcements/{announcement_id}/`

현재 구현은 비관리자에게 `published + exposure_scope in {all, operator}`만 노출한다.
배송원 앱 1차에서는 아래 계약 정리가 필요하다.

1. 비관리자 읽기 scope에 `driver`를 포함시키거나
2. driver 전용 read query를 별도로 추가한다

이번 설계에서는 1번을 권장한다.

### 6. 내 알림함

재사용 API:

1. `GET /api/notifications/general/`
2. `PATCH /api/notifications/general/{notification_id}/`
3. `GET /api/notifications/fcm/tokens/`
4. `POST /api/notifications/fcm/tokens/`
5. `PATCH /api/notifications/fcm/tokens/{push_token_id}/`

이 축은 existing API로 1차를 닫을 수 있다.

### 7. 문의

재사용 API:

1. `GET /api/ticket/tickets/`
2. `POST /api/ticket/tickets/`
3. `GET /api/ticket/tickets/{ticket_ref}/`
4. `GET /api/ticket/ticket-responses/?ticket_id=...`
5. `POST /api/ticket/ticket-responses/`

현재 구현상 ticket owner는 자기 티켓과 응답 thread를 읽을 수 있고, 자기 티켓에 답변도 추가할 수 있다.
즉 배송원 self-service 문의는 existing API로 1차를 닫을 수 있다.

### 8. 내 계정

재사용 API:

1. `GET /api/auth/identity-me/`
2. `GET /api/auth/identity-profile/`
3. `PATCH /api/auth/identity-profile/`
4. `PUT /api/auth/identity-password/`

1차에서 `identity-login-methods`, `signup request 관리`, `recovery 재진입`까지 앱 내부 메뉴로 확장하지 않는다.

### 9. 내 근태

현재 `/api/attendance/days/`는 `driver_id` 직접 전달 방식이라 모바일 self-service 용도로는 거칠다.

권장 신규 endpoint:

- `GET /api/attendance/me/days/?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD`

소유 서비스:

- `service-attendance-registry`

원칙:

1. owner service는 바꾸지 않는다.
2. 앱이 내부 `driver_id`를 직접 관리하지 않게 한다.
3. self-scoped read만 추가한다.

### 10. 내 배차 / 차량

현재 `dispatch-ops`는 `fleet_id + dispatch_date` 기반 관리자 board query다.
배송원 앱은 `내 오늘 업무`만 필요하다.

권장 신규 endpoint:

- `GET /api/dispatch-ops/me/today/`

소유 서비스:

- `service-dispatch-operations-view`

원칙:

1. 전체 board를 앱이 직접 조합하지 않는다.
2. self-scoped 오늘 업무 query로 축소한다.
3. 정본 ownership은 여전히 `dispatch-registry`, `vehicle-assignment`, `vehicle-registry`, `driver-profile`에 남긴다.

## Backend 보강 항목

이번 앱 MVP를 위해 필요한 backend 보강은 아래 네 가지다.

### 1. `service-driver-operations-view`

추가:

- `GET /api/driver-ops/me/home/`

역할:

1. 세션의 `driver_account`에서 linked `driver_id` 해석
2. driver summary + today attendance + today dispatch summary 조합

### 2. `service-attendance-registry`

추가:

- `GET /api/attendance/me/days/`

역할:

1. 세션의 linked driver 기준 self attendance list 제공

### 3. `service-dispatch-operations-view`

추가:

- `GET /api/dispatch-ops/me/today/`

역할:

1. 세션의 linked driver 기준 오늘 배차/차량 요약 제공

### 4. `service-announcement-registry`

정리 필요:

1. 비관리자 read scope에 `driver` exposure 포함 여부 확정

## Environment / Flavor 전략

이번 제한 베타는 여러 회사/플릿을 한 앱에서 검증한다.

따라서 회사/플릿을 앱 flavor로 분리하지 않는다.
회사는 로그인 세션과 API 응답으로 결정한다.

권장 flavor:

1. `dev`
2. `staging-beta`
3. `prod-beta`

필수 환경값:

1. `API_BASE_URL`
2. `APP_FLAVOR`
3. `SENTRY_DSN`
4. `FIREBASE_PROJECT_ID`
5. `SHOREBIRD_CHANNEL`

## IDE / 툴링 권장안

주 IDE:

- `VS Code`

필수 툴:

1. `Flutter SDK`
2. `FVM`
3. `Android Studio`
4. `Xcode`
5. `CocoaPods`
6. iOS automation용 `bundler`

## 제한 베타 배포 전략

이번 1차의 배포 목표는 `제한 베타`다.

권장 경로:

1. Android: `Play Console Closed Testing`
2. iOS: `TestFlight External Testing`

운영 원칙:

1. 회사별 별도 앱 binary를 만들지 않는다.
2. 동일 앱에서 여러 배송원 계정으로 회사/플릿 문맥을 검증한다.
3. staging-beta와 prod-beta를 나눠 내부 QA와 제한 외부 베타를 분리한다.

## Shorebird 도입 원칙

`Shorebird`는 이번 방향과 잘 맞는다.

다만 도입 순서는 아래처럼 잡는다.

1. Flutter 앱 골격과 flavor 구조를 먼저 고정한다.
2. Android/iOS beta release를 먼저 만든다.
3. 그 다음 `Shorebird release`를 붙인다.
4. 이후 Dart/UI/API 로직 수정은 patch로 운영한다.

주의:

1. 네이티브 권한 변경
2. `Info.plist`, `AndroidManifest.xml` 변경
3. 네이티브 SDK 추가/업데이트

위 항목은 일반 스토어 배포가 필요하다.

## 단계별 구현 순서

### Phase 1. 앱 기반선

1. `front-driver-app` repo 생성
2. Flutter/FVM/flavor/bootstrap 설정
3. auth/session shell 구축
4. 관리자 차단 화면 구축

### Phase 2. self-service 축

1. 공지
2. 알림
3. 문의
4. 내 계정

### Phase 3. 운영 읽기 축

1. `driver-ops me/home` query
2. `attendance me/days` query
3. `dispatch-ops me/today` query
4. 홈 / 근태 / 오늘 배차 UI

### Phase 4. 제한 베타

1. Firebase push 연동
2. Android closed test
3. iOS TestFlight external
4. Shorebird release 준비

## 주요 리스크

1. driver self-service용 read query가 아직 없다.
2. announcement exposure scope에 `driver`가 현재 비관리자 read 경로에서 빠져 있을 수 있다.
3. 여러 회사/플릿 계정 테스트 시 linked driver/account consistency 이슈가 먼저 드러날 수 있다.
4. iOS push certificate / APNs 설정은 Flutter 앱보다 운영 설정에서 더 자주 막힌다.

## 완료 기준

아래가 성립하면 이번 MVP 설계가 구현 준비 상태라고 본다.

1. 배송원 계정만 로그인 가능한 앱 경계가 고정된다.
2. 관리자 계정 차단 UX가 고정된다.
3. 1차 화면 범위와 허용 쓰기 범위가 고정된다.
4. 기존 API 재사용 범위와 새 self-scoped query 범위가 구분된다.
5. Flutter repo / 환경 / 제한 베타 / Shorebird 운영 순서가 고정된다.

## 연결 문서

- [../../rollout/16-web-first-platform-delivery-order.md](../../rollout/16-web-first-platform-delivery-order.md)
- [../../contracts/15-auth-api-scenario-map.md](../../contracts/15-auth-api-scenario-map.md)
- [../../contracts/17-admin-communication-pages.md](../../contracts/17-admin-communication-pages.md)
- [../../contracts/18-single-web-console-screen-map.md](../../contracts/18-single-web-console-screen-map.md)
- [../../contracts/04-driver-360-read-model.md](../../contracts/04-driver-360-read-model.md)
- [../../mappings/current-runtime-inventory.md](../../mappings/current-runtime-inventory.md)
