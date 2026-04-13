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

## 현재 로컬 환경 점검 결과

이 설계 시점에 확인한 로컬 개발 환경은 아래와 같다.

### 현재 확인된 상태

하드웨어 / OS:

1. `Apple M2`
2. `RAM 8GB`
3. 시스템 여유 디스크 약 `61GiB`
4. `macOS 26.4.1`

현재 설치 확인:

1. `Xcode 26.4`
2. `VS Code`
3. `Homebrew`
4. `Java 21`
5. `adb`

현재 미설치 또는 미확인:

1. `Flutter SDK`
2. `Dart SDK`
3. `FVM`
4. `CocoaPods`
5. `Android Studio`
6. `Android Emulator`
7. `avdmanager`
8. 사용 가능한 `iOS Simulator` runtime / device

현재 결론:

1. 이 Mac에서는 Flutter 제한 베타 개발이 가능하다.
2. 다만 `RAM 8GB`이므로 Android Emulator와 iOS Simulator를 동시에 무겁게 돌리는 방식은 피한다.
3. 1차 개발 중 UI 테스트는 `시뮬레이터/에뮬레이터 1개 + IDE 1개` 수준으로 운영하는 것이 안전하다.

## 로컬 설치 / 준비 범위

이번 모바일 MVP에는 로컬 설치 준비도 설계 범위에 포함한다.

### 필수 설치

1. `Flutter SDK`
2. `FVM`
3. `CocoaPods`
4. `Android Studio`
5. Android SDK + Emulator 1세트
6. iOS Simulator runtime 1세트

### 선택 설치

1. `Sentry CLI`
2. `Shorebird CLI`
3. `bundler` + iOS 배포 자동화 도구

### 설치 원칙

1. Flutter는 시스템 전역 버전만 믿지 않고 `FVM`으로 repo-local 버전을 고정한다.
2. iOS는 `Xcode`를 기준으로 하고, Flutter iOS 의존성은 `CocoaPods`를 먼저 기준으로 둔다.
3. Android는 `Android Studio` 표준 SDK/AVD 구성을 먼저 완성한 뒤 Flutter와 연결한다.
4. `Shorebird`는 앱 repo bootstrap과 첫 beta release 흐름이 안정화된 뒤 붙인다.

## 로컬 설치 순서

권장 순서는 아래와 같다.

### 1. Flutter / FVM

1. `Flutter SDK` 설치
2. `FVM` 설치
3. 앱 repo에 `.fvmrc`로 Flutter 버전 고정
4. `flutter doctor`로 1차 점검

### 2. iOS 준비

1. `CocoaPods` 설치
2. iOS Simulator runtime 다운로드
3. 최소 1개 iPhone simulator 생성
4. Xcode license / command line tools 상태 점검

### 3. Android 준비

1. `Android Studio` 설치
2. Android SDK 기본 구성 설치
3. ARM64 emulator image 설치
4. 최소 1개 AVD 생성

### 4. 앱 배포 준비

1. Firebase 프로젝트 연결
2. Android signing / iOS signing 확인
3. 제한 베타 배포 계정 연결
4. 필요 시 `Shorebird` 연결

## 예상 추가 디스크 사용량

정확한 수치는 버전과 캐시에 따라 달라지지만, 현재 로컬 준비에는 아래 정도를 본다.

1. `Flutter SDK + FVM + pub cache`: 약 `4~8GB`
2. `CocoaPods + iOS build cache`: 약 `2~4GB`
3. `iOS Simulator runtime 1개`: 약 `8~12GB`
4. `Android Studio`: 약 `1~2GB`
5. `Android SDK + Emulator + AVD 1개`: 약 `10~15GB`

즉 1차 개발 가능한 최소 실전 세팅은 대략 `25~35GB` 추가 사용량으로 본다.
현재 여유 디스크 `61GiB` 기준으로는 설치 가능하다.

## 로컬 성능 운영 원칙

현재 로컬 사양에서는 아래처럼 운영한다.

1. iOS UI 확인은 `Xcode + iOS Simulator`를 우선 사용한다.
2. Android UI 확인은 필요할 때만 `Android Emulator` 1대를 실행한다.
3. 가능하면 Android는 실기기 연결 테스트를 우선 검토한다.
4. `Android Studio + Emulator + Xcode Simulator` 동시 상시 실행은 피한다.

## UI 테스트 환경

현재 로컬에서 준비할 UI 테스트 수단은 아래 네 가지다.

### 1. iOS Simulator

장점:

1. Flutter iOS UI 확인이 가장 빠르다.
2. macOS에서 기본적으로 가장 안정적인 테스트 경로다.

용도:

1. 화면 레이아웃 확인
2. 로그인 / 세션 / 탭 이동 확인
3. 알림함 / 문의 / 계정 수정 같은 기본 흐름 확인

### 2. Android Emulator

장점:

1. Android 렌더링과 알림 권한 흐름을 확인할 수 있다.
2. 제한 베타 전 사전 회귀 점검에 필요하다.

용도:

1. Android 전용 UI 차이 확인
2. 권한 요청 / intent / notification 동작 확인

### 3. 실물 Android 기기

장점:

1. `RAM 8GB` 환경에서 가장 가볍다.
2. 실제 알림, 네트워크, 백그라운드 동작을 더 잘 볼 수 있다.

### 4. 실물 iPhone

장점:

1. TestFlight 전 마지막 검증 경로로 필수에 가깝다.
2. APNs / 실제 푸시 동작은 최종적으로 실기기 확인이 필요하다.

## 로컬 준비 완료 기준

아래가 모두 되면 로컬 Flutter 개발 준비가 완료된 것으로 본다.

1. `flutter doctor` 주요 항목이 통과한다.
2. `flutter devices`에 최소 1개 iOS simulator와 1개 Android target이 보인다.
3. `front-driver-app` 예제 앱이 iOS simulator에서 실행된다.
4. 같은 앱이 Android emulator 또는 실기기에서 실행된다.
5. flavor별 base URL 분기가 로컬에서 동작한다.

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
