# Driver App MVP Design

## 목적

이 문서는 CLEVER 플랫폼의 `배송원 전용 모바일 앱` MVP 방향을 다시 고정한다.

이번 정리의 목표는 아래와 같다.

1. `front-driver-app`을 실제 Android/iOS 앱용 child repo로 유지한다.
2. 앱은 웹 대체물이나 web preview 중심 제품이 아니라는 점을 고정한다.
3. 제품 범위, API 재사용 범위, backend 보강 범위를 framework-neutral하게 정리한다.
4. Expo나 Flutter 같은 특정 bootstrap 전제를 문서 정본에서 제거하고, native framework 결정은 별도 gate로 분리한다.

## 현재 결정 사항

현재 시점의 정본은 아래와 같다.

1. `development/front-driver-app/`은 공식 linked child repo다.
2. child repo 현재 상태는 `empty shell`이다.
3. 앱 방향은 `실제 Android/iOS 배송원 앱`이다.
4. framework는 아직 정해지지 않았다.
5. framework 결정 전에는 root 문서와 plan에서 framework-neutral 표현을 사용한다.
6. 현재 즉시 구현 대상인 최소 범위는 [2026-04-21-cheonha-driver-app-minimum-design.md](2026-04-21-cheonha-driver-app-minimum-design.md) 를 따른다.

이 문서는 `더 넓은 MVP 외곽`을 설명하고, 천하운수 1차 최소 범위는 위 minimum design이 우선한다.

## 배경과 현재 문맥

현재 플랫폼의 공식 rollout truth는 여전히 `웹 1차 완성 후 앱 2차`다.

- `docs/rollout/16-web-first-platform-delivery-order.md`
- `docs/contracts/15-auth-api-scenario-map.md`
- `docs/contracts/17-admin-communication-pages.md`
- `docs/contracts/18-single-web-console-screen-map.md`
- `docs/mappings/current-runtime-inventory.md`

다만 배송원 self-service는 웹 콘솔과 다른 사용 맥락을 가지므로, 별도 앱 surface가 필요하다.

이 앱은 아래를 만족해야 한다.

1. 배송원이 자기 정보와 자기 업무를 빠르게 확인할 수 있어야 한다.
2. 관리자 콘솔 축소판이 되어서는 안 된다.
3. backend truth ownership을 흔들지 않아야 한다.
4. 여러 회사/플릿으로 확장되더라도 앱 자체는 동일 제품 축을 유지해야 한다.

## 사용자와 제품 경계

이번 앱의 primary user는 `driver_account`다.

원칙:

1. 제품의 기본 surface는 배송원 기준으로 설계한다.
2. manager surface를 같은 앱에 본격 도입하지 않는다.
3. `system_admin`은 점검용 예외 모드가 필요할 수 있지만, 그것이 제품 본체가 되면 안 된다.

정확한 1차 role/screen 처리 규칙은 minimum design 문서를 따른다.

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
2. 제한 베타에서 실제 업무 검증 밀도가 떨어진다.

### 접근 B. 운영 읽기 MVP

- 로그인
- 내 계정
- 공지
- 알림
- 문의
- 내 근태 조회
- 내 배차/차량 조회

장점:

1. 배송원 self-service와 오늘 업무 확인을 같이 검증할 수 있다.
2. 현재 MSA 경계를 크게 흔들지 않는다.
3. 운영 write truth를 새로 만들지 않아도 된다.

단점:

1. self-scoped read endpoint가 몇 개 필요하다.

### 접근 C. 정산 포함 확장 MVP

- 접근 B 전체
- 내 정산 조회

장점:

1. 배송원 관점 완성도가 높다.

단점:

1. 1차 범위가 커진다.
2. settlement read 흐름과 화면 설계까지 같이 검증해야 한다.

## 선택된 접근

이 문서의 기본 MVP 방향은 `접근 B. 운영 읽기 MVP`다.

선택 이유:

1. `auth`, `announcement`, `notification`, `support` 축을 바로 재사용할 수 있다.
2. `attendance`, `dispatch`는 owner service를 유지한 채 self-scoped read만 추가하면 된다.
3. 실제 현장 검증에는 `오늘 내 업무`가 빠지면 안 된다.
4. 정산은 후속 phase로 미루는 편이 안전하다.

## MVP 범위

### 포함 범위

1. 스플래시 / 세션 복구
2. 로그인
3. 차단 또는 접근 분기 화면
4. 내 홈
5. 내 공지
6. 내 알림함
7. 문의 목록 / 상세 / 작성 / 응답
8. 내 계정
9. 내 근태 조회
10. 내 배차 / 차량 조회
11. Android/iOS 제한 베타 배포

### 허용 쓰기

1. 문의 작성
2. 문의 응답 작성
3. 알림 읽음 처리
4. 프로필 일부 수정
5. 비밀번호 변경
6. 푸시 토큰 등록 / 갱신 / 비활성화

### 제외 범위

1. 관리자 운영 기능
2. 대규모 manager workflow
3. 정산 조회
4. 출근/근태 상태 직접 변경
5. 배차 확인/응답 액션
6. 실시간 위치 / 텔레메트리 업로드
7. 앱 자체가 웹 앱처럼 동작하는 우회 설계

## 기술 방향

### 앱 성격

- 실제 Android/iOS 앱
- web preview success를 제품 acceptance로 보지 않음
- 모바일 기기 UX를 기준으로 화면과 세션을 설계

### framework 원칙

현재는 특정 framework를 정본으로 확정하지 않는다.

Framework selection gate는 아래 기준을 모두 검토해야 한다.

1. 에이전트와 사람이 함께 다루기 쉬운 문서와 툴링이 있는가
2. Android/iOS를 하나의 제품 흐름으로 가볍게 유지할 수 있는가
3. auth/session/storage/push를 과도한 native bridge 비용 없이 다룰 수 있는가
4. closed beta와 store delivery 경로가 무리 없이 닫히는가
5. 실제 앱 기준 UX 검증이 가능한가

framework가 확정되기 전까지 다음 가정은 금지한다.

1. Expo bootstrap 전제
2. Flutter bootstrap 전제
3. web preview를 주요 검증 수단으로 보는 전제

## Repo 방향

- target repo: `development/front-driver-app/`
- repo 상태: official child repo, current `empty shell`
- root 역할: 문서, 계약, map, plan 관리
- child repo 역할: 실제 앱 구현과 framework bootstrap

원칙:

1. root는 app implementation snapshot을 다시 들고 있지 않는다.
2. child repo bootstrap은 framework 결정 이후에만 시작한다.
3. framework 결정 전에는 repo를 빈 shell 상태로 유지한다.

## 앱 아키텍처 원칙

정확한 폴더 구조는 framework 결정 후 고정한다.
다만 아래 원칙은 선행 고정한다.

1. feature 기준으로 나눈다.
2. 인증, 세션, 네트워크, 저장소는 공통 core로 묶는다.
3. 앱이 MSA service 경계를 그대로 복제하지 않는다.
4. API ownership은 backend service에 남기고, 앱은 consumer feature 기준으로 사용한다.
5. tenant/company 문맥은 제품 요구에 맞게 명시적으로 고정하거나 식별한다.

## 세션과 권한 원칙

앱은 `identity-*` auth API를 기준으로 동작한다.

사용 endpoint:

1. `POST /api/auth/identity-login/`
2. `POST /api/auth/identity-refresh/`
3. `POST /api/auth/identity-logout/`
4. `GET /api/auth/identity-me/`
5. `GET/PATCH /api/auth/identity-profile/`
6. `PUT /api/auth/identity-password/`

세션 원칙:

1. `active_account.account_type` 기준으로 앱 접근을 분기한다.
2. access token과 session persistence 정책은 minimum design 문서를 따른다.
3. 앱은 self-scoped 사용자 경험을 우선하며 내부 식별자를 직접 노출하지 않는다.

## 화면과 API 매핑

### 1. 스플래시 / 세션 복구

재사용 API:

- `POST /api/auth/identity-refresh/`
- `GET /api/auth/identity-me/`

역할:

1. 세션 복구
2. active account type 판별
3. 로그인/차단/홈 분기

### 2. 로그인

재사용 API:

- `POST /api/auth/identity-login/`

로그인 수단의 세부 1차 규칙은 minimum design을 따른다.

### 3. 내 홈

필요 정보:

1. 내 기본 프로필
2. 회사 / 플릿
3. 오늘 근태 상태
4. 오늘 배차 / 차량 요약
5. 경고 메시지

권장 endpoint:

- `GET /api/driver-ops/me/home/`

소유 서비스:

- `service-driver-operations-view`

### 4. 내 공지

재사용 API:

1. `GET /api/announcements/`
2. `GET /api/announcements/{announcement_id}/`

정리 필요:

1. 비관리자 읽기 scope에 `driver` exposure 포함 여부 확정

### 5. 내 알림함

재사용 API:

1. `GET /api/notifications/general/`
2. `PATCH /api/notifications/general/{notification_id}/`
3. `GET /api/notifications/fcm/tokens/`
4. `POST /api/notifications/fcm/tokens/`
5. `PATCH /api/notifications/fcm/tokens/{push_token_id}/`

### 6. 문의

재사용 API:

1. `GET /api/ticket/tickets/`
2. `POST /api/ticket/tickets/`
3. `GET /api/ticket/tickets/{ticket_ref}/`
4. `GET /api/ticket/ticket-responses/?ticket_id=...`
5. `POST /api/ticket/ticket-responses/`

### 7. 내 계정

재사용 API:

1. `GET /api/auth/identity-me/`
2. `GET /api/auth/identity-profile/`
3. `PATCH /api/auth/identity-profile/`
4. `PUT /api/auth/identity-password/`

### 8. 내 근태

권장 endpoint:

- `GET /api/attendance/me/days/?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD`

소유 서비스:

- `service-attendance-registry`

### 9. 내 배차 / 차량

권장 endpoint:

- `GET /api/dispatch-ops/me/today/`

소유 서비스:

- `service-dispatch-operations-view`

## Backend 보강 항목

이번 앱 MVP를 위해 필요한 backend 보강은 아래와 같다.

### 1. `service-driver-operations-view`

추가:

- `GET /api/driver-ops/me/home/`

### 2. `service-attendance-registry`

추가:

- `GET /api/attendance/me/days/`

### 3. `service-dispatch-operations-view`

추가:

- `GET /api/dispatch-ops/me/today/`

### 4. `service-announcement-registry`

정리 필요:

1. 비관리자 read scope에 `driver` exposure 포함 여부 확정

## Environment 전략

여러 회사/플릿 실사용 검증이 필요하더라도, 앱 binary를 회사별로 쪼개는 방식은 지양한다.

권장 환경 축:

1. `dev`
2. `staging-beta`
3. `prod-beta`

필수 환경값 예시:

1. `API_BASE_URL`
2. `APP_FLAVOR`
3. `SENTRY_DSN`
4. `PUSH_PROJECT_ID`

## 로컬 환경 기준

현재 확인된 로컬 baseline은 아래와 같다.

1. `Apple M2`
2. `RAM 8GB`
3. `macOS 26.4.1`
4. `Xcode 26.4.1`
5. iOS simulator device 사용 가능
6. Android AVD `pixel_8_api_35` 사용 가능

현재 미확정 항목:

1. 선택된 native framework
2. framework-specific bootstrap command
3. child repo 안의 실제 앱 scaffold
4. iOS/Android launch verification

현재 결론:

1. 이 Mac은 native app bootstrap 준비 단계까지는 문제없다.
2. 다만 `RAM 8GB`이므로 iOS/Android 무거운 툴을 동시에 오래 띄우지 않는다.
3. framework 결정 없이 scaffold부터 시작하지 않는다.

## 로컬 준비 완료 기준

아래가 모두 되면 로컬 native app 준비가 완료된 것으로 본다.

1. framework 결정이 canonical docs에 반영된다.
2. `development/front-driver-app/`에서 실제 앱 scaffold가 생성된다.
3. 같은 repo에서 iOS simulator launch가 성공한다.
4. 같은 repo에서 Android target launch가 성공한다.
5. 세션과 environment 분기 baseline이 로컬에서 확인된다.

## 제한 베타 배포 전략

이번 앱의 배포 목표는 `제한 베타`다.

권장 경로:

1. Android: `Play Console Closed Testing`
2. iOS: `TestFlight`

운영 원칙:

1. 회사별 별도 앱 binary를 만들지 않는다.
2. 동일 앱에서 계정과 tenant/company 문맥을 검증한다.
3. staging-beta와 prod-beta를 분리한다.

## 단계별 구현 순서

### Phase 0. Native bootstrap

1. framework 결정
2. child repo clean bootstrap
3. iOS/Android launch baseline 확인

### Phase 1. 앱 기반선

1. auth/session shell
2. 접근 분기
3. account baseline

### Phase 2. self-service 축

1. 공지
2. 알림
3. 문의
4. 내 계정

### Phase 3. 운영 읽기 축

1. `driver-ops me/home`
2. `attendance me/days`
3. `dispatch-ops me/today`
4. 홈 / 근태 / 오늘 배차 UI

### Phase 4. 제한 베타

1. push 연결
2. Android closed test
3. iOS TestFlight
4. beta 운영 기준 정리

## 주요 리스크

1. framework가 아직 확정되지 않았다.
2. driver self-service용 read query가 아직 없다.
3. announcement exposure scope에 `driver`가 빠져 있을 수 있다.
4. linked driver/account consistency 이슈가 실제 앱 검증에서 먼저 드러날 수 있다.
5. beta signing과 store 운영 설정은 앱 코드보다 운영 단계에서 더 자주 막힌다.

## 완료 기준

아래가 성립하면 MVP 설계가 구현 준비 상태라고 본다.

1. 앱이 `실제 Android/iOS 배송원 앱`으로 정의된다.
2. 웹 대체물 전제가 제거된다.
3. framework-neutral product/API/scope 문서가 고정된다.
4. `front-driver-app`의 empty-shell 상태와 후속 bootstrap gate가 문서에 반영된다.
5. 현재 최소 구현 범위와 넓은 MVP 외곽의 관계가 분리된다.

## 연결 문서

- [../../rollout/16-web-first-platform-delivery-order.md](../../rollout/16-web-first-platform-delivery-order.md)
- [../../contracts/15-auth-api-scenario-map.md](../../contracts/15-auth-api-scenario-map.md)
- [../../contracts/17-admin-communication-pages.md](../../contracts/17-admin-communication-pages.md)
- [../../contracts/18-single-web-console-screen-map.md](../../contracts/18-single-web-console-screen-map.md)
- [../../contracts/04-driver-360-read-model.md](../../contracts/04-driver-360-read-model.md)
- [../../mappings/current-runtime-inventory.md](../../mappings/current-runtime-inventory.md)
- [2026-04-21-cheonha-driver-app-minimum-design.md](2026-04-21-cheonha-driver-app-minimum-design.md)
