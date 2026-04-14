# Console Route Contract Redesign

## Purpose

이 문서는 `front-web-console`의 브라우저 route를 `self-service / admin / company` 경계에 맞게 재정의하는 계약을 고정한다.

이번 작업의 출발점은 단순 active-menu 버그가 아니다.

- `/account` 와 `/accounts` 가 prefix 수준에서 충돌했다.
- 이는 문자열 매칭 실수 이전에 route contract가 약하다는 신호다.
- 현재 route는 사용 주체와 bounded context가 URL에서 충분히 드러나지 않는다.

MSA 전환 플랫폼에서 route도 계약이다. URL은 화면 주소인 동시에 사용 주체, 권한 경계, 화면 소속 문맥을 드러내야 한다.

## Problem Statement

현재 route는 아래 문제가 있다.

1. 사용자 자기 서비스와 관리자 업무가 URL에서 충분히 분리되지 않는다.
- `/account`
- `/accounts`

2. 전역 관리자와 회사 관리자 경계가 일부 화면에서 이름만 다르고 구조가 비슷하다.
- `/admin/navigation-policy`
- `/company/navigation-policy`

3. active-navigation 판단이 route contract보다 prefix matching에 기대게 된다.
- 이는 nav highlight, redirect, permission gate 모두를 취약하게 만든다.

4. `관리` 아래에 있는 관리자 업무는 admin bounded context인데, 일부 경로는 일반 명사 수준으로 남아 있다.

## Design Principles

### 1. Subject first

브라우저 route 첫 segment에서 사용 주체를 드러낸다.

- `self-service`
- `admin`
- `company`

1차에서는 아래처럼 매핑한다.

- 자기 계정/self-service: `/me/*`
- 시스템 관리자 전용: `/admin/*`
- 회사 전체 관리자 문맥: `/company/*`
- 도메인 운영 화면: 기존 리소스 route 유지 가능
  - 예: `/drivers`, `/vehicles`, `/settlements/overview`

즉 route는 두 종류로 나눈다.

1. 주체 경계 route
- `me`
- `admin`
- `company`

2. 도메인 운영 route
- `companies`
- `regions`
- `drivers`
- `vehicles`
- `dispatch`
- `settlements`

### 2. Avoid prefix-collision pairs

서로 다른 의미를 가진 화면이 prefix 관계로 겹치면 안 된다.

금지 예시:
- `/account`
- `/accounts`

이런 구조는 문자열 매칭, breadcrumb, tab highlight, redirect 모두를 취약하게 만든다.

### 3. Resource path must express ownership

같은 `menu policy` 라도 ownership이 다르면 route도 달라야 한다.

- 시스템 관리자 전역 정책: `/admin/menu-policy`
- 회사 관리자 회사 정책: `/company/menu-policy`

### 4. Navigation active state follows route contract, not heuristics

사이드바 active 판단은 prefix 요령이 아니라 contract 기반으로 계산해야 한다.

원칙:
- nav item은 자기 `to` 와 자기 하위 detail/edit route만 active로 인정한다.
- 다른 bounded context route는 유사한 문자열이어도 active로 인정하지 않는다.

## Target Route Contract

### Self-service

| Purpose | Current | Target |
| --- | --- | --- |
| 내 계정 | `/account` | `/me` |

결정:
- `내 계정`은 self-service를 대표하는 고정 진입점이므로 `/me` 로 줄인다.
- 이후 하위 화면이 생기면 `/me/profile`, `/me/security` 처럼 확장한다.

### Admin governance

| Purpose | Current | Target |
| --- | --- | --- |
| 메뉴 정책 | `/admin/navigation-policy` | `/admin/menu-policy` |
| 관리자 역할 | `/admin/manager-roles` | `/admin/manager-roles` |
| 계정 요청 | `/accounts` | `/admin/account-requests` |

결정:
- `계정 요청`은 admin governance 문맥이므로 최상위 일반 명사 route를 쓰지 않는다.
- `관리자 역할`은 이미 경계가 드러나므로 유지 가능하다.
- `navigation-policy` 는 구현 용어에 가깝다. 사용자-facing route는 `/admin/menu-policy` 로 줄인다.

### Company governance

| Purpose | Current | Target |
| --- | --- | --- |
| 회사 메뉴 정책 | `/company/navigation-policy` | `/company/menu-policy` |

결정:
- 회사 전체 관리자 문맥은 `/company/*` 에서 유지한다.
- 시스템 관리자 전역 정책과 구분하기 위해 resource 명칭은 동일하게 `menu-policy` 를 사용한다.
- ownership은 첫 segment로 구분한다.

### Domain operation routes

아래 route는 현재처럼 유지한다.

- `/companies`
- `/regions`
- `/drivers`
- `/personnel-documents`
- `/vehicles`
- `/vehicle-assignments`
- `/dispatch/*`
- `/settlements/*`
- `/announcements`
- `/support`

이유:
- 이들은 주체보다 도메인 리소스가 더 중요한 화면이다.
- 이미 각 service 경계와도 비교적 잘 맞는다.
- `notifications` 는 브라우저 route가 아니라 web console이 사용하는 backend/runtime capability로 취급한다.
- 알림 관련 동작은 기존 communication 또는 inbox 문맥 안에서 처리하고, 독립적인 live browser surface로 두지 않는다.

## Sidebar Information Architecture After Rename

`관리` 아래의 최종 라벨과 route는 아래로 고정한다.

- `메뉴 정책` -> `/admin/menu-policy`
- `관리자 역할` -> `/admin/manager-roles`
- `회사 메뉴 정책` -> `/company/menu-policy`
- `계정 요청` -> `/admin/account-requests`

`내 계정`은 사이드바 하단 고정 링크로 두고 route는 `/me` 로 변경한다.

## Active-State Contract

각 navigation item은 아래 contract를 따른다.

1. exact route는 active
2. 자기 하위 route만 active
3. sibling route는 active 금지
4. 다른 bounded context route는 active 금지

예시:

- `내 계정`
  - active: `/me`, `/me/*`
  - inactive: `/admin/account-requests`

- `계정 요청`
  - active: `/admin/account-requests`, `/admin/account-requests/*`
  - inactive: `/me`

- `메뉴 정책`
  - active: `/admin/menu-policy`, `/admin/menu-policy/*`
  - inactive: `/company/menu-policy`

- `회사 메뉴 정책`
  - active: `/company/menu-policy`, `/company/menu-policy/*`
  - inactive: `/admin/menu-policy`

## Redirect / Compatibility Policy

직접 rename만 하면 기존 북마크와 외부 진입이 깨질 수 있다. 따라서 1차 cutover에서는 alias redirect를 둔다.

### Redirect map

- `/account` -> `/me`
- `/accounts` -> `/admin/account-requests`
- `/admin/navigation-policy` -> `/admin/menu-policy`
- `/company/navigation-policy` -> `/company/menu-policy`

원칙:
- 프론트 라우터는 새 route를 source of truth로 사용한다.
- 옛 route는 `Navigate replace` redirect만 가진다.
- 사이드바와 active-state는 오직 새 route 기준으로 계산한다.

## Backend / Gateway Impact

이번 계약은 우선 `front-web-console` route contract다.

1차에서는 backend API route는 바꾸지 않는다.

- `/api/auth/...`
- `/api/org/...`
- `/api/vehicle/...`
- `/api/dispatch/...`
- `/api/settlement/...`

즉 이번 redesign의 범위는 browser route와 nav contract다.

gateway 영향도 1차에서는 없다.
- gateway는 계속 SPA fallback만 제공하면 된다.

## Migration Sequence

1. `front-web-console` route constant와 navigation item 경로를 새 contract로 교체
2. `App.tsx` 에서 legacy route redirect 추가
3. `Layout` active-state 테스트를 새 route 기준으로 교체
4. nav highlight, permission redirect, direct URL 진입 회귀 확인
5. 이후 docs/contracts screen map을 새 route 기준으로 sync

## Out of Scope

이번 계약에서는 아래를 같이 바꾸지 않는다.

- backend API route rename
- service repo URL schema
- browser detail route 번호 체계
- company role catalog / menu policy data contract

## Final Decision Summary

1. `내 계정`은 `/me` 로 이동한다.
2. `계정 요청`은 `/admin/account-requests` 로 이동한다.
3. 시스템 관리자 전역 정책은 `/admin/menu-policy` 로 이동한다.
4. 회사 메뉴 정책은 `/company/menu-policy` 로 이동한다.
5. `관리자 역할`은 `/admin/manager-roles` 를 유지한다.
6. active-state는 route contract 기반으로 계산하고 prefix heuristic에 기대지 않는다.
7. legacy route는 1차에서 redirect alias만 유지한다.
