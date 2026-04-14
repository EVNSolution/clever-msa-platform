# Notifications API-Only Surface Removal Design

## Purpose

이 문서는 `front-web-console` 에서 `/notifications` 독립 화면을 제거하고, `service-notification-hub` 를 API/runtime capability로만 유지하는 계약을 고정한다.

이번 변경의 목적은 단순한 메뉴 정리가 아니다.

- 현재 단일 웹은 `알림`을 별도 업무 화면처럼 노출하고 있다.
- 하지만 제품 의도는 `알림`을 독립 운영 화면이 아니라 다른 기능이 쓰는 channel/API로 두는 쪽에 가깝다.
- 이 불일치가 계속되면 권한 모델, route map, navigation policy, 테스트가 모두 더미 surface를 기준으로 누적된다.

따라서 이번 설계는 `알림`을 웹 콘솔의 first-class product surface에서 내리고, backend integration capability로 재분류한다.

## Problem Statement

현재 상태는 아래 충돌을 가진다.

1. `front-web-console` 은 `/notifications` 를 shared route로 유지한다.
2. `NotificationsPage` 는 lower manager inbox와 관리자 push send/log UI를 함께 가진다.
3. `manager navigation policy` 와 기본 nav key 집합도 `notifications` 를 실존 화면처럼 포함한다.
4. 반면 제품 의도는 `service-notification-hub` 를 API/runtime 채널로 두고, 독립 웹 surface를 최소화하는 쪽이다.

결과적으로 아래 문제가 생긴다.

- 제품상 필요하지 않은 화면이 navigation과 policy에 남는다.
- 지원/공지와 달리 notification UI는 독립 업무 단위로 설명하기 어렵다.
- route contract 문서와 runtime boundary 문서가 실제 제품 의도보다 앞서간다.
- 지금 제거하지 않으면 이후 role/policy/driver app 문서까지 잘못된 표면적을 기준으로 퍼진다.

## Current State

현재 truth는 아래 위치에 분산되어 있다.

- 웹 route: `development/front-web-console/src/App.tsx`
- 웹 navigation: `development/front-web-console/src/navigation.ts`
- nav/policy key 정의: `development/front-web-console/src/authScopes.ts`
- 화면 구현: `development/front-web-console/src/pages/NotificationsPage.tsx`
- API wrapper: `development/front-web-console/src/api/notifications.ts`
- communication contract: `docs/contracts/17-admin-communication-pages.md`
- screen map: `docs/contracts/18-single-web-console-screen-map.md`
- navigation policy runbook: `docs/runbooks/manager-navigation-policy.md`

현재 문서 계약은 아래처럼 웹 surface를 고정하고 있다.

- `/notifications` shared route 유지
- lower manager inbox read
- 관리자 push send / push log 운영
- manager navigation policy key `notifications`

이 계약이 이번 설계의 변경 대상이다.

## Design Principles

### 1. Product surface와 integration capability를 구분한다

모든 runtime capability가 웹의 독립 화면이 될 필요는 없다.

- `service-notification-hub` 는 channel/runtime owner일 수 있다.
- 하지만 그 사실이 곧 `/notifications` 독립 화면의 필요성을 뜻하지는 않는다.

### 2. 단일 웹의 route는 실제 업무 표면만 가져야 한다

단일 웹은 운영자가 직접 수행하는 stable workflow만 route로 둔다.

- `공지`
- `지원`
- `배차`
- `정산`
- `조직/차량/배송원`

`알림`은 이 기준에서 독립 업무 화면으로 설명력이 약하다.

### 3. 권한 모델과 화면 집합은 일치해야 한다

화면이 존재하지 않으면 nav key와 policy key도 존재하면 안 된다.

- route 제거
- navigation 제거
- policy key 제거

이 세 가지는 함께 닫혀야 한다.

### 4. backend/runtime은 유지하고 UI만 제거한다

이번 설계는 notification runtime 제거가 아니다.

유지 대상:

- `service-notification-hub`
- `/api/notifications/*`
- support reply -> inbox handoff 같은 producer flow
- 향후 앱 또는 다른 consumer가 notification API를 사용하는 가능성

제거 대상:

- `front-web-console` 의 `/notifications` 독립 화면
- 해당 화면을 전제로 한 nav/policy/document contract

## Decision

`front-web-console` 에서 `/notifications` surface를 완전 제거한다.

구체적으로는 아래를 고정한다.

1. `/notifications` route는 삭제한다.
2. 웹 navigation에서 `알림` 메뉴를 삭제한다.
3. `notifications` nav key와 manager navigation policy 항목을 삭제한다.
4. `NotificationsPage` 와 web 전용 notification API wrapper는 제거 후보로 본다.
5. `service-notification-hub` 는 API/runtime repo로 유지한다.

즉 `알림`은 웹 product surface가 아니라 backend capability다.

## Target Contract

### Browser Routes

제거:

- `/notifications`

유지:

- `/announcements`
- `/support`
- 다른 운영/거버넌스 route 전부

이후 notification 정보가 사용자에게 보여야 하는 경우에도 별도 route를 만들지 않는다.

허용 surface 예시:

- 지원 응답 저장 후 top notice
- 공지 게시 후 success notice
- 특정 화면 안의 contextual status message

금지 surface 예시:

- 독립 inbox page
- 독립 push send page
- 독립 push log page

### Navigation / Policy

삭제:

- `notifications` nav item
- `notifications` nav key
- manager navigation policy에서 `notifications` 항목
- default allowed nav 계산에서 `notifications`

정리 후 운영 그룹은 최소 아래만 가진다.

- `announcements`
- `support`

## Frontend Change Scope

정리 대상은 아래다.

### 1. Route and page

- `development/front-web-console/src/App.tsx`
- `development/front-web-console/src/pages/NotificationsPage.tsx`
- `development/front-web-console/src/pages/NotificationsPage.test.tsx`

### 2. Navigation and policy

- `development/front-web-console/src/navigation.ts`
- `development/front-web-console/src/authScopes.ts`
- `development/front-web-console/src/pages/ManagerNavigationPolicyPage.tsx`
- `development/front-web-console/src/pages/ManagerNavigationPolicyPage.test.tsx`
- `development/front-web-console/src/components/Layout.test.tsx`

### 3. Web-only API wrapper

- `development/front-web-console/src/api/notifications.ts`

이 파일은 웹에서 더 이상 참조하지 않으면 제거한다.

### 4. Keep unchanged

유지 대상:

- `TopNotificationBar`
- `topNotificationTemplates`
- `SupportPage` 와 `Announcement*` 의 local feedback
- backend notification runtime

`TopNotificationBar` 는 inbox product가 아니라 local UI feedback이므로 제거 대상이 아니다.

## Documentation Contract Changes

### 1. Communication contract

`docs/contracts/17-admin-communication-pages.md` 는 아래처럼 바꾼다.

- communication 영역을 `공지 + 지원` 중심으로 재정의
- `service-notification-hub` 는 support/announcement 등 producer가 쓰는 backend channel로만 설명
- `/notifications` 단일 화면 고정 문구 제거
- lower manager/self-service notification read 설명 제거

### 2. Screen map

`docs/contracts/18-single-web-console-screen-map.md` 는 아래처럼 바꾼다.

- `/notifications` shared route 행 삭제
- `NotificationsPage` 항목을 active shared route 목록에서 제거
- obsolete/removable 성격을 명확히 기록

### 3. Navigation policy runbook / specs

아래 문서에서 `notifications` key를 제거한다.

- `docs/runbooks/manager-navigation-policy.md`
- `docs/superpowers/specs/2026-04-08-manager-navigation-policy-abac-design.md`
- `docs/superpowers/specs/2026-04-08-manager-navigation-policy-api-authorization-design.md`

필요하면 관련 구현 plan 문서도 업데이트하되, 과거 완료 이력 성격이 강한 문서는 역사 기록으로 남길 수 있다.

## Backend / Runtime Boundary

이번 설계는 backend notification runtime을 없애지 않는다.

유지 계약:

- `service-notification-hub` 는 active runtime
- gateway `/api/notifications/*` route 유지
- push token registry 유지
- general notification aggregate 유지
- push send / push log API 유지

즉 API consumer가 웹에서 사라질 뿐, runtime 소유권은 유지된다.

## Non-Goals

이번 설계의 비범위는 아래다.

1. `service-notification-hub` API 삭제
2. driver app notification feature 삭제 또는 변경
3. support reply -> inbox handoff backend 로직 변경
4. announcement publish flow 변경
5. infra / image / deploy cutover 변경

## Migration Sequence

1. spec과 contract 문서에서 `/notifications` surface 제거 계약을 먼저 고정한다.
2. `front-web-console` 에서 route, nav, nav key, page, tests를 제거한다.
3. manager navigation policy 관련 화면과 테스트에서 `notifications` key를 제거한다.
4. regression test로 `announcements`, `support`, `TopNotificationBar` 가 그대로 동작하는지 확인한다.

## Verification Strategy

최소 검증은 아래를 포함한다.

1. route 수준
- `/notifications` 로 접근 시 더 이상 독립 화면이 열리지 않아야 한다.

2. navigation 수준
- 사이드바 운영 그룹에 `알림` 메뉴가 없어야 한다.

3. policy 수준
- manager navigation policy 목록/폼/테스트에서 `notifications` 가 사라져야 한다.

4. regression 수준
- `support` 와 `announcements` 는 기존대로 접근 가능해야 한다.
- `TopNotificationBar` 기반 local feedback 은 유지되어야 한다.

## Risks

### 1. historical docs drift

과거 설계/plan 문서에는 `/notifications` 가 남을 수 있다.

대응:

- current truth 문서와 current implementation을 우선 수정
- 과거 완료 기록은 history로 남기되, current truth와 혼동되지 않게 한다

### 2. hidden consumer assumptions

일부 테스트나 navigation logic이 `notifications` key 존재를 암묵적으로 기대할 수 있다.

대응:

- route/nav/policy 연동 테스트를 함께 수정
- dead import와 unreachable branch를 정리

## Resulting Product Position

이 변경 이후의 제품 해석은 아래로 고정한다.

- `공지`: 독립 운영 surface
- `지원`: 독립 운영 surface
- `알림`: 독립 surface 아님, backend channel/integration capability

이 분류가 route, navigation, policy, 문서, 테스트에 모두 일치해야 한다.
