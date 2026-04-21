# Driver App MVP Design

## 목적

이 문서는 CLEVER 배송원 앱의 상위 방향과 현재 active 구현 범위를 고정한다.

이번 정리의 목적은 아래와 같다.

1. `front-driver-app`을 실제 Android/iOS 배송원 앱 child repo로 유지한다.
2. 앱이 웹 대체물이나 web preview 중심 제품이 아니라는 점을 고정한다.
3. 오늘 확정한 천하운수 1차 minimum scope를 현재 active 포함 범위로 올린다.
4. 이전에 논의했던 더 넓은 배송원 앱 기능은 후속 확장 후보로만 남긴다.

## 현재 정본 관계

현재 기준에서 문서 관계는 아래와 같다.

1. 이 문서는 `배송원 앱 상위 방향 + 현재 active scope 요약`이다.
2. 실제 1차 구현 범위의 상세 정본은 [2026-04-21-cheonha-driver-app-minimum-design.md](2026-04-21-cheonha-driver-app-minimum-design.md) 이다.
3. 구현 순서와 현재 상태는 [2026-04-21-cheonha-driver-app-minimum-implementation-plan.md](../plans/2026-04-21-cheonha-driver-app-minimum-implementation-plan.md) 및 [2026-04-21-front-driver-app-native-bootstrap-implementation-plan.md](../plans/2026-04-21-front-driver-app-native-bootstrap-implementation-plan.md) 를 따른다.

즉 이 문서에서 `포함 범위`라고 쓰는 내용은 오늘 만든 minimum design 기준으로 읽는다.

## 현재 결정 사항

1. `development/front-driver-app/`은 공식 linked child repo다.
2. child repo 현재 상태는 `empty shell`이다.
3. 앱 방향은 `실제 Android/iOS 배송원 앱`이다.
4. framework는 아직 확정하지 않았다.
5. framework 결정 전에는 bootstrap을 시작하지 않는다.
6. 현재 active 제품 범위는 `천하운수 1차 최소 범위`다.

## 제품 경계

현재 active 제품은 `천하운수 배송원 최소 self-service 앱`이다.

원칙:

1. 기본 사용자는 `driver_account`다.
2. `system_admin`은 예외적으로 앱 채널 진입만 허용하되, 본문은 비어 있는 단일 화면만 쓴다.
3. `manager_account`는 현재 scope 밖이다.
4. 회사 문맥은 `천하운수`로 고정한다.
5. 회사 선택 UI는 두지 않는다.

## 현재 Active Scope

오늘 기준 active 포함 범위는 아래다.

### 포함 범위

1. 스플래시 / 세션 복구
2. 로그인
3. 회원가입
4. 자동 로그인 체크 규칙
5. 배송원 `업무기록` 화면 1개
6. 배송원 `MY` 화면 1개
7. `system_admin` 단일 빈 화면
8. Android/iOS 앱 bootstrap 준비

### 화면 범위

#### 1. 배송원 모드

- `업무기록`
- `MY`

`업무기록`은 날짜별 `근태 + 배송이력` 카드 리스트만 보여준다.
`MY`는 이름, 이메일, 가입 연락처 전화번호, 계정 연동 상태, 연동 필요 버튼, 비밀번호 변경, 로그아웃만 가진다.

#### 2. 관리자 모드

- 로그아웃 버튼만 있는 단일 빈 화면

별도 운영 메뉴, MY, 점검 패널은 두지 않는다.

### 허용 쓰기

1. 회원가입 제출
2. 로그인 / 로그아웃
3. 비밀번호 변경
4. `연동 필요` 버튼 탭

단, `연동 필요` 버튼은 실제 요청 기능이 아니라 debug log만 남긴다.

### 제외 범위

1. 공지
2. 알림
3. 문의
4. 배차 상세 / 차량 상세
5. 정산
6. 관리자용 운영 기능
7. 멀티회사 진입
8. 링크 기반 회사 bootstrap
9. 전화번호 로그인
10. 로그인 방식 관리 화면

## 인증과 가입 규칙

현재 active 인증 규칙은 minimum design을 따른다.

핵심만 요약하면 아래와 같다.

1. 로그인은 `이메일 + 비밀번호`만 허용한다.
2. 자동 로그인은 체크박스 선택형이다.
3. 회원가입은 `이름`, `이메일`, `contact_phone_number`, `birth_date`, `비밀번호`, `비밀번호 확인`, 필수 동의 2종을 받는다.
4. 전화번호와 생년월일은 text 입력 + mask view 규칙을 사용한다.
5. 회원가입은 천하운수 문맥으로 고정되며 승인 대기 없이 즉시 사용 가능 상태를 목표로 한다.

## 현재 Active API Surface

### 1. Auth

재사용 또는 필요한 API:

- `POST /api/auth/identity-login/`
- `POST /api/auth/identity-refresh/`
- `POST /api/auth/identity-logout/`
- `GET /api/auth/identity-me/`
- `GET /api/auth/identity-profile/`
- `PUT /api/auth/identity-password/`
- `POST /api/auth/identity-signup-requests/`

현재 1차에서 필요한 보강:

1. signup payload에 `contact_phone_number` 수용
2. 천하운수 signup auto-approve
3. `identity-me` 또는 동등 self endpoint에 `driver_link_status` 제공

### 2. Work logs

현재 1차 핵심 read contract:

- `GET /api/driver-ops/me/work-logs/?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD`

owner:

- `service-driver-operations-view`

역할:

1. active `driver_account_link` 해석
2. linked driver 기준 `attendance truth + delivery snapshot` 조합
3. 날짜별 카드 배열 반환
4. `needs_link` 상태일 경우 앱이 blur 안내 화면을 렌더링할 수 있게 상태 제공

### 3. MY

필요 API:

- `GET /api/auth/identity-me/`
- `GET /api/auth/identity-profile/`
- `PUT /api/auth/identity-password/`
- `POST /api/auth/identity-logout/`

## 후속 확장 후보

아래는 예전에 넓게 잡았던 배송원 앱 범위지만, 현재 active 포함 범위는 아니다.

1. 공지
2. 알림
3. 문의
4. 홈 요약 화면
5. 근태 전용 화면
6. 오늘 배차 / 차량 전용 화면
7. 정산 조회

이 항목들은 `오늘의 구현 범위`가 아니라 후속 phase 후보로만 본다.

## Native App 원칙

1. 앱은 실제 Android/iOS surface를 기준으로 설계한다.
2. web preview 성공을 acceptance 기준으로 두지 않는다.
3. framework는 별도 gate에서 결정한다.
4. framework가 정해지기 전까지 Expo나 Flutter 전제를 정본에 다시 넣지 않는다.

## Environment / Delivery 원칙

1. 앱 binary를 회사별로 쪼개는 방식은 지양한다.
2. tenant/company 문맥은 로그인 및 payload contract로 고정하거나 식별한다.
3. 배포는 Android/iOS 제한 베타를 목표로 한다.
4. staging-beta와 prod-beta를 분리한다.

## 현재 리스크

1. framework가 아직 확정되지 않았다.
2. child repo는 아직 empty shell이다.
3. `driver_link_status`와 `work-logs` contract가 앱과 정확히 맞물려야 한다.
4. 자동 로그인의 persistent cookie 정책은 앱 저장소 정책과 함께 검증되어야 한다.

## 완료 기준

이 문서 기준 현재 1차 방향이 맞다고 보려면 아래가 성립해야 한다.

1. active 포함 범위가 `업무기록 + MY + auth + admin blank`로 읽힌다.
2. 공지/알림/문의/배차/정산이 현재 포함 범위로 오해되지 않는다.
3. 앱이 `실제 Android/iOS 배송원 앱`으로 정의된다.
4. framework-neutral bootstrap gate가 유지된다.
5. 상세 구현은 minimum design과 implementation plan으로 자연스럽게 이어진다.

## 연결 문서

- [../../rollout/16-web-first-platform-delivery-order.md](../../rollout/16-web-first-platform-delivery-order.md)
- [../../contracts/15-auth-api-scenario-map.md](../../contracts/15-auth-api-scenario-map.md)
- [../../mappings/current-runtime-inventory.md](../../mappings/current-runtime-inventory.md)
- [2026-04-21-cheonha-driver-app-minimum-design.md](2026-04-21-cheonha-driver-app-minimum-design.md)
- [../plans/2026-04-21-cheonha-driver-app-minimum-implementation-plan.md](../plans/2026-04-21-cheonha-driver-app-minimum-implementation-plan.md)
- [../plans/2026-04-21-front-driver-app-native-bootstrap-implementation-plan.md](../plans/2026-04-21-front-driver-app-native-bootstrap-implementation-plan.md)
