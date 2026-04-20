# Cheonha Company Path Cockpit Design

## Purpose

이 문서는 `천하운수` 전용 운영 화면을 현재 `front-web-console` 안에 어떤 방식으로 수용할지에 대한 1차 설계를 고정한다.

이번 문서의 목적은 아래를 먼저 닫는 것이다.

1. `천하운수` 전용 진입을 메인 허브 안의 메뉴가 아니라 회사 path cockpit으로 둘지 결정한다.
2. `ev-dashboard.com/cheonha`의 메인 정보구조를 고정한다.
3. 천하운수 사용자가 익숙한 참고 프런트 구조를 어디까지 재현할지 범위를 고정한다.
4. 현재 `front-web-console`의 세션/권한 구조 위에 tenant/workflow bootstrap을 어떤 층으로 올릴지 정한다.

## Problem Statement

현재 `front-web-console`은 플랫폼 공통 허브 성격이 강하다.

- 로그인 후 공통 사이드바와 공통 도메인 entry를 기준으로 움직인다.
- 현재 settlement 화면은 범용 정산 처리 구조를 중심으로 설계돼 있다.
- 천하운수는 과거 prototype에 익숙한 사용자가 있고, “천하운수 전용 앱”처럼 느껴지는 흐름을 기대한다.

이 상태에서 천하운수 요구를 단순히 기존 허브 메뉴에 한 항목 추가하는 방식으로 처리하면 아래 문제가 생긴다.

1. 사용자는 여전히 공용 허브 안의 일부 화면으로 느낀다.
2. 회원가입과 로그인에서 회사 선택을 반복적으로 묻는 UX가 남는다.
3. prototype과 같은 익숙한 정보구조를 화면 전체가 아니라 일부 페이지에서만 어색하게 흉내 내게 된다.

## Primary Decision

천하운수 1차 전용 운영 화면은 `메인 허브 내부 메뉴`가 아니라 `회사 전용 company path cockpit`으로 구성한다.

- 메인 허브: `ev-dashboard.com`
- 천하운수 cockpit: `ev-dashboard.com/cheonha`

이때 `ev-dashboard.com`은 플랫폼 공통 관리/운영 허브 역할만 남기고, 천하운수 실제 업무 entry는 `/{tenant}` path로 분리한다.

## Rejected Alternatives

### 1. 메인 허브 안에 천하운수 메뉴만 추가

이 안은 채택하지 않는다.

이유:

1. URL과 로그인 경험이 계속 공용 허브처럼 남는다.
2. prototype과 동일한 인상을 주기 어렵다.
3. 앞으로 다른 회사 전용 cockpit을 늘릴 때 정보구조가 더 빨리 엉킨다.

### 2. 회사별 완전 별도 프런트 repo

이 안도 1차에서는 채택하지 않는다.

이유:

1. 인증, 세션, 공통 컴포넌트, 배포 파이프라인이 불필요하게 분리된다.
2. 현재 `front-web-console`의 세션/권한/레이아웃 자산을 재사용하는 편이 더 싸고 안전하다.
3. 지금 필요한 것은 별도 제품 분리가 아니라 tenant/workflow에 따른 shell 분리다.

## Chosen Strategy

### 1. 회사 path별 company cockpit

각 회사는 필요 시 자기 company path cockpit을 가진다.

- `ev-dashboard.com/cheonha`
- 이후 다른 회사가 필요하면 `ev-dashboard.com/foo`

이 구조에서 company path는 단순 브랜딩이 아니라 `tenant entrypoint`다.

### 2. 단일 프런트 repo 유지

1차 구현은 계속 `development/front-web-console/` 하나를 canonical frontend source로 유지한다.

즉:

- repo는 하나로 유지한다.
- shell/route/dashboard/workspace preset만 tenant/workflow에 따라 바뀐다.

### 3. tenant bootstrap 층 추가

현재 세션 구조는 유지하되, 로그인 이후 `workspace bootstrap` 층을 추가한다.

분리 원칙은 아래와 같다.

- `identity-me`
  - 계정/세션 정본
- `workspace bootstrap`
  - tenant/workflow/shell 정본

즉 권한과 정보구조를 분리한다.

- `role / allowed_nav_keys`
  - 무엇을 할 수 있나
- `workflow_profile / workspace_preset`
  - 어떤 순서와 형태로 보이나

## Domain Structure

### 1. `ev-dashboard.com`

메인 허브는 플랫폼 공통 관리 surface로 고정한다.

주 역할:

1. 시스템 관리자용 운영 허브
2. 회사 생성, 역할 정책, 공통 관리
3. 전사 관제 또는 전역 설정

메인 허브는 천하운수 실무 사용자의 기본 업무 entry로 삼지 않는다.

### 2. `ev-dashboard.com/cheonha`

천하운수 사용자의 기본 업무 entry로 고정한다.

원칙:

1. public 화면부터 천하운수 문맥이 고정된다.
2. 회원가입 시 회사명을 다시 묻지 않는다.
3. 로그인 후 천하운수 cockpit shell로 바로 진입한다.

## Cheonha Cockpit Information Architecture

## Current Canonical Contract

- canonical tenant entry is `ev-dashboard.com/{tenant}`
- `*.ev-dashboard.com` host tenant resolution may remain as compatibility fallback, but it is not the primary contract
- system-admin sessions may enter a company tenant path before the cockpit shell renders
- wrong-company manager sessions are still blocked before cockpit render

### 1. Cockpit main route

`cheonha.ev-dashboard.com/`의 메인 라우트는 정산 상세 화면이 아니라 `천하운수 cockpit dashboard`로 고정한다.

메인 대시보드는 아래 4개 카드만 가진다.

1. `정산`
2. `차량`
3. `빈 카드`
4. `빈 카드`

원칙:

1. 메인 대시보드는 단순 entry dashboard다.
2. 1차에서는 `정산` 카드만 실제 workspace로 연결한다.
3. `차량` 카드는 placeholder entry로만 남겨도 된다.
4. 나머지 2개는 추후 기능 추가를 위한 placeholder로 유지한다.

### 2. Why the cockpit main stays minimal

천하운수 참고 프런트의 전체 사이드바 구조를 cockpit 메인에 그대로 복제하지 않는다.

이유:

1. cockpit 메인은 회사 전용 홈 역할이어야 한다.
2. 처음부터 모든 업무를 한 사이드바에 밀어 넣으면 다시 허브처럼 보인다.
3. 이번 단계에서는 `정산` workspace 하나만 prototype parity를 가지는 것이 범위상 맞다.

## Settlement Workspace Decision

### 1. Scope

천하운수 참고 프런트의 익숙한 정보구조는 `정산 카드` 안에서만 재현한다.

즉:

- cockpit 메인
  - 4-card dashboard
- `정산`
  - reference prototype parity workspace

### 2. Why only settlement mirrors the reference

이번 요구의 중심은 “참고 프런트에 익숙한 사용자가 정산 쪽에서 위화감을 느끼지 않게 하는 것”이다.

따라서 prototype parity 범위를 정산 workspace로 한정한다.

이렇게 해야 아래를 피할 수 있다.

1. cockpit 전체가 다시 천하운수 전용 monolith 정보구조로 굳어지는 문제
2. 아직 요구가 닫히지 않은 차량/추가 기능을 섣불리 같은 패턴으로 강제하는 문제

## Settlement Workspace Information Architecture

### 1. Layout pattern

`정산` workspace는 GitHub 같은 상단 탭 strip 구조를 사용한다.

디자인 원칙:

1. visual style은 현재 `front-web-console` 디자인 시스템을 유지한다.
2. 익숙한 정보구조는 탭 순서와 업무 묶음으로 재현한다.
3. prototype의 `홈` 역할은 cockpit 메인이 대신한다.

### 2. Settlement tab order

천하운수 `정산` workspace의 1차 탭 순서는 아래로 고정한다.

1. `배차 데이터`
2. `배송원 관리`
3. `운영 현황`
4. `정산 처리`
5. `팀 관리`

이 순서는 참고 프런트의 익숙한 구조를 최대한 유지하되, `홈`은 cockpit 메인으로 흡수한 결과다.

### 3. Route shape

브라우저 route는 아래 형태를 권장한다.

- `/`
  - 천하운수 cockpit dashboard
- `/settlement`
  - settlement workspace default entry
- `/settlement/dispatch`
- `/settlement/crew`
- `/settlement/operations`
- `/settlement/process`
- `/settlement/team`

원칙:

1. cockpit 메인과 settlement workspace를 URL에서 명확히 구분한다.
2. settlement workspace 내부에서는 탭별 route를 가진다.
3. 기존 global `/settlements/*` route contract는 메인 허브용 범용 화면으로 유지한다.

### 4. Service/API mapping

천하운수 `정산` workspace는 새 backend boundary를 만들지 않는다.
기존 서비스들을 workspace 단위로 재조합한다.

#### `배차 데이터`

역할:

1. 업로드
2. 데이터 확인
3. 단가 참조
4. 신규 배송원 확인
5. 특근/근태 반영
6. 정산 생성 진입

주 연결 대상:

- `service-dispatch-registry`
- `service-delivery-record`
- `service-settlement-registry`
- `service-driver-profile`
- `service-attendance-registry`
- `service-settlement-payroll`

즉 이 탭은 단일 service 화면이 아니라 upload-first settlement handoff workspace다.

#### `배송원 관리`

역할:

1. 배송원 목록
2. 기본 정보 확인
3. 단가/운영 정보 확인

주 연결 대상:

- `service-driver-profile`
- 필요 시 `service-personnel-document-registry` read link

#### `운영 현황`

역할:

1. 날짜별 운영 현황 read
2. dispatch/settlement read summary

주 연결 대상:

- `service-dispatch-operations-view`
- `service-driver-operations-view`
- `service-settlement-operations-view`

#### `정산 처리`

역할:

1. 정산 실행과 결과 확인
2. 정산 비교/검토
3. 결과 write 또는 후속 보정 진입

주 연결 대상:

- `service-settlement-registry`
- `service-settlement-payroll`
- `service-settlement-operations-view`

#### `팀 관리`

역할:

1. 팀/단가/정산 기준 관리
2. 천하운수 운영에 필요한 team-facing 관리 surface 제공

주 연결 대상:

- `service-settlement-registry`
- 필요 시 `service-region-registry` 또는 organization metadata read

주의:

`팀 관리`는 frontend workspace label이지 새로운 backend service boundary 이름이 아니다.

## Bootstrap and Session Contract

### 1. Public entry resolution

company path로 tenant를 고정한다.

예:

- path = `ev-dashboard.com/cheonha`
- resolved tenant = `cheonha`

이 값은 프런트가 URL path 기준으로 직접 해석해도 되고, gateway/backend가 같은 tenant code를 기준으로 해석해도 된다.

### 2. Signup/login rule

천하운수 cockpit에서는 회원가입 시 회사 선택 UI를 노출하지 않는다.

원칙:

1. 회사명 직접 입력 또는 검색 없음
2. tenant는 company path 기준으로 고정
3. 프런트는 로그인/회원가입 요청에 tenant 문맥을 함께 전달하거나, backend가 같은 tenant code로 확정한다

### 3. Post-login sequence

로그인 이후 권장 흐름은 아래다.

1. session 확보
2. `identity-me` 호출
3. `workspace bootstrap` 호출
4. 응답으로 tenant/workflow/shell 확정
5. cockpit 렌더

### 4. Workspace bootstrap response

1차에서 bootstrap 응답은 아래 정보를 제공해야 한다.

1. `company_id`
2. `tenant_code`
3. `workflow_profile`
4. `enabled_features`
5. `home_dashboard_preset`
6. `workspace_presets`

예시 의미:

- `home_dashboard_preset`
  - 메인 4카드 구성
- `workspace_presets.settlement`
  - settlement 탭 순서와 기본 landing

### 5. Separation of concern

현재 `front-web-console`에 이미 있는 세션/권한 구조는 유지한다.

- `identity-me`
  - access token, active account, role scope
- navigation policy
  - 허용 메뉴 집합

여기에 아래 층을 추가한다.

- workspace bootstrap
  - 어떤 shell과 workspace 구성을 쓸지

즉 `allowed_nav_keys`만으로는 cockpit 형태를 설명하지 않는다.

## Relationship With Current Frontend Contracts

이 설계는 현재 문서와 아래 방식으로 공존한다.

### 1. Existing generic console routes stay valid

기존 generic route contract는 메인 허브에서 계속 유효하다.

예:

- `/dispatch/*`
- `/settlements/*`
- `/drivers/*`

### 2. Company cockpit is a tenant-specific shell

천하운수 cockpit은 generic console을 대체하는 것이 아니라, tenant-specific shell을 추가하는 것이다.

즉:

1. 메인 허브 route contract는 계속 남는다.
2. 천하운수 cockpit은 다른 shell preset을 가진다.
3. 같은 backend API를 다른 정보구조로 묶어 보여줄 수 있다.

### 3. Main domain admin-only direction

이번 설계는 장기적으로 `ev-dashboard.com`을 플랫폼 관리 허브로 더 좁히는 방향과도 맞다.

이는 기존 generic console을 폐기한다는 뜻이 아니라, company-specific operations의 기본 entry를 메인 도메인에서 빼낸다는 뜻이다.

## Phase 1 Scope

이번 설계에서 1차로 보는 범위는 아래다.

1. `ev-dashboard.com/cheonha` tenant entry 결정
2. cockpit 메인 4카드 dashboard
3. `정산` 카드 연결
4. settlement workspace 상단 탭 구조
5. tenant/workflow bootstrap contract 초안

## Out of Scope

이번 문서는 아래를 아직 고정하지 않는다.

1. `차량` 카드 하위 상세 정보구조
2. placeholder 2개 카드의 실제 기능명
3. tenant별 브랜딩 세부값과 자산 관리 방식
4. gateway host routing 세부 구현
5. bootstrap endpoint의 최종 API path 이름
6. 천하운수 cockpit의 모바일 IA 상세

## Final Decision Summary

1. 천하운수 전용 운영 entry는 `ev-dashboard.com/cheonha` company path cockpit으로 고정한다.
2. `ev-dashboard.com`은 플랫폼 공통 관리 허브 역할만 남긴다.
3. 천하운수 cockpit 메인은 `정산 / 차량 / 빈 카드 / 빈 카드` 4-card dashboard로 고정한다.
4. 참고 프런트와의 prototype parity는 cockpit 전체가 아니라 `정산` workspace 안에서만 적용한다.
5. `정산` workspace는 `배차 데이터 / 배송원 현황 / 운영 현황 / 정산 처리 / 팀 관리` 상단 탭 구조로 고정한다.
6. 현재 `front-web-console` 단일 repo는 유지하고, tenant/workflow bootstrap으로 shell과 workspace preset을 결정한다.
7. 권한(`allowed_nav_keys`)과 정보구조(`workflow_profile`, `workspace_presets`)는 분리한다.
