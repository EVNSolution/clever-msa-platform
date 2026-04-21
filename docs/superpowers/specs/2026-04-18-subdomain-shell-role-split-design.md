# Company Path Shell Role-Split Design

## Purpose

이 문서는 기존 company path web definition을 보강해서, 회사 path shell을 **역할 분리형 구조**로 다시 고정하기 위한 설계다.

## Current Canonical Contract

- canonical route base is `ev-dashboard.com/{tenant}`
- `*.ev-dashboard.com` host tenant resolution is compatibility fallback only
- main domain remains system-admin surface
- system-admin may enter a company tenant path before cockpit render
- wrong-company manager is blocked before cockpit render

이번 문서의 목적은 아래를 닫는 것이다.

1. 회사 path `대시보드`에서 좌측 사이드 영역을 제거한다.
2. `천하운수` 브랜드 영역을 홈 카드와 상위 메뉴 확장 트리거로 분리한다.
3. `정산` 진입 시에만 별도 정산 전용 사이드바가 생기는 구조를 고정한다.
4. 카드 영역, 상위 메뉴, 정산 전용 사이드바를 서로 다른 책임으로 분리한다.
5. 기존 parent spec의 company path dashboard 정의 중 이번 shell 개편에서 바뀌는 부분을 명시적으로 덮어쓴다.

## Scope

이번 문서는 아래만 다룬다.

- 회사 path shell 레이아웃
- `대시보드`와 `정산`의 좌측 구조 차이
- 상위 메뉴와 정산 내부 메뉴의 역할 분리
- `front-web-console` 내부 컴포넌트 책임 경계

이번 문서는 아래를 다루지 않는다.

- 메인 도메인 IA 재정의
- 정산 내부 각 페이지의 세부 콘텐츠
- backend/gateway/API 계약 변경
- 시각 디자인 시스템 전면 개편

## Problem Statement

현재 회사 path shell은 `대시보드`와 `정산` 모두에서 같은 좌측 레일을 유지하는 구조에 가깝다. 이 상태는 이번에 의도한 사용자 경험과 맞지 않는다.

남아 있는 문제는 아래와 같다.

1. `대시보드`가 실제로는 단순 진입 화면이어야 하는데, workspace형 사이드 구조를 이미 가진 것처럼 보인다.
2. `천하운수` 브랜드 영역이 홈 이동, 상위 메뉴, 내부 탐색을 모두 같이 품고 있어서 책임이 흐려진다.
3. `정산`에 들어가야만 보여야 하는 내부 메뉴가, shell 전역 메뉴처럼 느껴진다.
4. 이후 상위 확장 탭을 더 붙일 계획인데, 현재 구조는 그 확장에 불리하다.

## Approaches Considered

### 1. 기존 좌측 레일 유지 + 조건 분기 추가

기존 `SubdomainAccordionNav`를 유지하고, `대시보드`일 때와 `정산`일 때 조건으로 UI를 바꾸는 방식이다.

장점:

- 파일 수가 적게 늘어난다.
- 단기 수정량은 가장 작다.

단점:

- 카드 영역, 상위 메뉴, 정산 메뉴 책임이 다시 한 컴포넌트 안에 섞인다.
- 조건 분기가 늘면서 shell이 빠르게 복잡해진다.

이 안은 채택하지 않는다.

### 2. 역할 분리형 shell

브랜드 카드 영역, 상위 메뉴, 정산 전용 사이드바를 서로 다른 역할로 분리하고, `CockpitShell`이 현재 route에 따라 이를 조합하는 방식이다.

장점:

- 이번 요구사항과 가장 정확히 맞는다.
- 카드 영역을 독립적으로 보장할 수 있다.
- 나중에 상위 확장 탭을 늘리기 쉽다.

단점:

- 컴포넌트 수는 조금 늘어난다.

이번 문서는 이 안을 채택한다.

### 3. 회사 path shell 완전 재작성

기존 cockpit shell/navigation을 사실상 버리고, 회사 path 전용 shell을 새로 짜는 방식이다.

장점:

- 자유도는 가장 높다.

단점:

- 현재 범위보다 너무 크다.
- 기존 테스트/route 계약 영향이 커진다.

이 안도 채택하지 않는다.

## Primary Decision

회사 path shell은 **역할 분리형**으로 재구성한다.

즉 아래 세 레이어를 분리한다.

1. 브랜드 카드 영역
2. 상위 확장 메뉴
3. 정산 전용 사이드바

그리고 `CockpitShell`은 현재 surface가 `대시보드`인지 `정산`인지에 따라 이 레이어들을 조합한다.

이 문서는 parent spec의 회사 path dashboard 본문 정의를 일부 대체한다.

- parent spec에서는 dashboard에 summary section들이 존재했다
- 이번 spec에서는 그 summary section들을 제거하고, dashboard를 **빈 본문을 가진 shell landing**으로 다시 고정한다
- 즉 이번 문서가 dashboard body contract에 대해서는 더 최신 정본이다

## Canonical Layout Contract

### 1. Dashboard

`대시보드`는 1차에서 **사이드 영역이 없는 화면**으로 고정한다.

구성:

- 좌상단에 `천하운수` 정사각형 카드만 존재
- 카드 본체 클릭 = `/` 홈 이동
- 카드 우측 버튼 클릭 = 상위 메뉴 확장/접기
- 확장 메뉴는 현재 `대시보드 / 정산`만 노출
- 본문은 비움

즉 `대시보드`는 정보 카드와 요약 위젯을 임시로 남기는 화면이 아니라, 이후 확장을 위한 **빈 진입 surface**다.

이는 parent spec의 기존 dashboard summary section(`최근 6개월 수입/지출`, `금월 배차표 기반 근태`, `금일 배차`)을 이번 phase에서 제거하는 결정이다.

### 2. Settlement

`정산`으로 들어가면, 브랜드 카드 영역은 그대로 유지하면서 그 아래에 **정산 전용 사이드바**가 생긴다.

구성:

- 상단: `천하운수` 정사각형 카드 + 상위 확장 메뉴
- 하단: 정산 전용 사이드바
- 정산 전용 사이드바는 항상 펼침

정산 전용 사이드바 메뉴:

- `홈`
- `배차 데이터`
- `배송원 관리`
- `운영 현황`
- `정산 처리`
- `팀 관리`

즉 좌측은 하나의 긴 레일이 아니라, **카드 영역**과 **정산 메뉴 영역**이 분리된 두 블록이다.

## Navigation Contract

### 1. Product-Level Navigation

상위 확장 메뉴는 product-level navigation이다.

현재 상위 메뉴:

- `대시보드`
- `정산`

역할:

- `대시보드`
  - `/`
- `정산`
  - `/settlement/home`

이 메뉴는 이후 다른 상위 surface가 생기면 확장될 수 있다. 따라서 지금부터 정산 내부 메뉴와 같은 계층으로 다루지 않는다.

상위 메뉴의 확장 상태는 **route-derived가 아니라 local UI state**로 본다.

원칙:

- 첫 렌더 기본값은 접힘
- 사용자가 직접 열면 그 상태를 유지
- `대시보드 <-> 정산` route 전환만으로 자동 초기화하지 않는다
- 사용자가 다시 버튼을 눌러 접기 전까지는 열린 상태를 유지한다

### 2. Workspace-Level Navigation

정산 전용 사이드바는 workspace-level navigation이다.

즉 `정산` 내부 route만 담당하며, top-level product navigation을 대신하지 않는다.

canonical deep-link:

- `/settlement`
- `/settlement/home`
- `/settlement/dispatch`
- `/settlement/crew`
- `/settlement/operations`
- `/settlement/process`
- `/settlement/team`

route rule:

- `/settlement`
  - 즉시 `/settlement/home`으로 redirect

## Route and State Transition Rules

### 1. Dashboard Entry

- `cheonha.ev-dashboard.com/`
  - 대시보드 surface
  - 좌측 사이드바 없음
  - 카드 본체 클릭은 계속 `/`

### 2. Expand Menu

- 카드 우측 버튼 클릭
  - 상위 메뉴 `대시보드 / 정산` 노출
- 이 확장 상태는 상위 내비게이션을 열기 위한 상태이며, 정산 내부 메뉴와는 별개다.

### 3. Enter Settlement

- 상위 메뉴의 `정산` 클릭
  - `/settlement` 또는 `/settlement/home`으로 진입
  - canonical render는 `/settlement/home`
  - 동시에 정산 전용 사이드바 생성

### 4. Return to Dashboard

- 정산 상태에서 상위 메뉴의 `대시보드` 클릭
  - `/`로 이동
  - 정산 전용 사이드바 제거
  - 카드 영역만 남음

## Component Boundary

이 phase의 프론트 구현은 아래 경계를 따른다.

### 1. CockpitShell

책임:

- 현재 route가 `대시보드`인지 `정산`인지 판단
- 브랜드 카드 영역과 정산 전용 사이드바를 조합

하지 않을 일:

- 정산 내부 콘텐츠 자체를 소유하지 않음
- 카드 내부 상세 상태를 다 품지 않음

### 2. Brand Card Area

책임:

- `천하운수` 카드 렌더
- 카드 본체 홈 이동
- 상위 메뉴 확장 버튼
- `대시보드 / 정산` 상위 메뉴 노출

### 3. Settlement Sidebar

책임:

- 정산 상태에서만 렌더
- 항상 펼침
- 정산 내부 deep-link 탐색

### 4. CheonhaDashboardPage

책임:

- 빈 본문만 렌더
- 카드/사이드바/상위 메뉴를 소유하지 않음

주의:

- parent spec의 예전 summary section은 더 이상 이 컴포넌트의 책임이 아니다
- 이번 phase에서 `CheonhaDashboardPage`는 shell landing body만 담당한다

### 5. CheonhaSettlementWorkspace

책임:

- 정산 콘텐츠와 내부 route만 담당
- 좌측 카드 영역과 정산 전용 사이드바는 shell이 바깥에서 붙여줌

## Visual Rules

1차 기준:

- `천하운수` 카드는 정사각형 영역으로 고정
- 카드 영역은 정산 상태에서도 그대로 유지
- 정산 전용 사이드바는 카드 영역 아래에서 분리된 블록처럼 보여야 한다
- 대시보드 본문에는 placeholder text조차 두지 않는다

## Testing Implications

이 구조가 구현되면 아래를 테스트로 잠가야 한다.

1. `대시보드`에서는 좌측 카드만 보이고 정산 전용 사이드바는 없다
2. 카드 본체 클릭은 항상 `/`
3. 카드 우측 버튼은 상위 메뉴만 열고 닫는다
4. 상위 메뉴 확장 상태는 local UI state이며 route 전환만으로 자동 초기화되지 않는다
5. `정산` 진입 시 `/settlement`는 `/settlement/home`으로 redirect되고 정산 전용 사이드바가 생긴다
6. `정산`에서 `대시보드`로 돌아오면 정산 전용 사이드바가 사라진다
7. 정산 전용 사이드바 메뉴는 항상 펼침 상태다

## Out of Scope

이번 설계는 아래를 하지 않는다.

- 정산 내부 메뉴 이름 변경
- `cheonha` 내부 정산 페이지 내용 재정의
- 메인 도메인 shell 재설계
- backend 계약 변경

## Relationship To Existing Spec

이 문서는 아래 문서의 **보강 설계**다.

- `docs/superpowers/specs/2026-04-17-subdomain-web-definition-design.md`

즉 기존 문서의 메인/회사 path 경계, 세션 규칙, `정산` workspace 원칙은 유지하고, 이번 문서는 **회사 path shell layout과 navigation 역할 분리**만 더 구체화한다.
