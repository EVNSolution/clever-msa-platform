# Company Path Settlement Cheonha Visual Adaptation Design

## Purpose

이 문서는 현재 company path shell 위에, `정산` workspace 내부를 `cheonha` 레퍼런스 톤에 맞춰 시각적으로 재정렬하기 위한 보강 설계다.

## Current Canonical Contract

- settlement workspace belongs to the company path shell under `ev-dashboard.com/{tenant}/settlement/*`
- the current detached sidebar order is `홈 / 배차 데이터 / 배송원 현황 / 운영 현황 / 정산 처리 / 팀 관리`
- `*.ev-dashboard.com` host tenant resolution is compatibility fallback only

이번 문서의 목적은 아래를 닫는 것이다.

1. 바깥 shell을 유지한 채, `정산` 내부 전체를 `cheonha` 스타일에 가깝게 재구성한다.
2. `정산` 사이드바를 더 크고 설명이 있는 2줄형 메뉴로 확장한다.
3. `정산 홈`을 배너/프로세스/KPI/최근 정산 구조로 재구성한다.
4. `배차 업로드`를 포함한 정산 내부 6개 메뉴 전체에 같은 시각 언어를 적용한다.
5. 데이터는 가능한 실제 연결값을 사용하고, 없으면 명시적으로 empty state를 드러낸다.

## Relationship To Existing Specs

이 문서는 아래 문서를 대체하지 않고, `정산` 내부 presentation layer만 더 구체화한다.

- `docs/superpowers/specs/2026-04-17-subdomain-web-definition-design.md`
- `docs/superpowers/specs/2026-04-18-subdomain-shell-role-split-design.md`
- `docs/superpowers/specs/2026-04-18-subdomain-shell-visual-refinement-design.md`
- `docs/superpowers/specs/2026-04-18-subdomain-vehicle-workspace-design.md`

즉 아래는 기존 shell spec의 선행 조건으로 유지한다.

- 브랜드 카드
- 우측 글로벌 헤더
- detached workspace 구조

이번 문서는 `정산` 내부 시각 언어만 `cheonha` 레퍼런스에 맞춘다.

## Problem Statement

현재 `정산` workspace는 기능 경계는 맞지만, 시각 구조는 아직 레퍼런스 제품의 밀도와 위계를 따라가지 못한다.

남아 있는 문제는 아래와 같다.

1. `정산` 사이드바가 현재는 compact nav 수준이라, `cheonha` 레퍼런스의 정보밀도와 분리감이 부족하다.
2. `정산 홈`은 설명 카드 중심이라, 실제 운영용 대시보드처럼 읽히지 않는다.
3. `정산 처리`, `운영 현황`, `배송원 관리`, `팀 관리`가 shell-only 또는 기존 page embedding 상태라, 시각 언어가 들쭉날쭉하다.
4. `배차 업로드`는 우리 현재 기능을 유지해야 하지만, 정산 workspace 전체 디자인과는 아직 같은 family로 읽히지 않는다.

## Approaches Considered

### 1. CSS skin only

장점:

- 구현이 가장 작다.

단점:

- `정산 홈` 정보구조와 shell-only page 구조를 함께 맞추기 어렵다.
- 내부 페이지 간 위계가 계속 흔들린다.

채택하지 않는다.

### 2. Settlement-only presentation layer refinement

장점:

- 바깥 shell은 그대로 두고, `정산` 내부에만 `cheonha`식 presentation layer를 만들 수 있다.
- 현재 route/기능 경계를 안 깨뜨린다.
- `배차 업로드` 기능은 유지하고, 주변 패널/spacing/타이포만 같은 언어로 통일할 수 있다.

단점:

- 관련 정산 컴포넌트를 몇 개 더 나눠야 한다.

이번 문서는 이 안을 채택한다.

### 3. 레퍼런스 화면 직접 이식

장점:

- 시각적으로는 가장 비슷해질 수 있다.

단점:

- 현재 React route/page 구조와 충돌이 크다.
- 기능 경계와 테스트 계약을 과하게 흔든다.

채택하지 않는다.

## Primary Decision

이번 phase는 `정산` 내부 전체를 `cheonha` 레퍼런스 톤으로 재정렬한다. 단, 바깥 shell은 그대로 유지한다.

유지:

- 브랜드 카드
- 우측 글로벌 헤더
- detached launcher/workspace 구조

변경:

- `정산` 사이드바 visual density
- `정산 홈` 본문 구조
- `정산 처리`, `운영 현황`, `배송원 관리`, `팀 관리`의 panel language
- `배차 업로드`를 감싸는 정산 workspace frame

## Settlement Sidebar Contract

정산 사이드바는 현재 메뉴명/순서를 유지하되, 더 큰 2줄형 메뉴로 바꾼다.

메뉴 순서:

1. `홈`
2. `배차 데이터`
3. `배송원 관리`
4. `운영 현황`
5. `정산 처리`
6. `팀 관리`

각 메뉴는 아래처럼 2줄 구성을 가진다.

- 1행: 메뉴명
- 2행: 짧은 설명

설명 카피 1차 기준:

- `홈` / `현황 요약`
- `배차 데이터` / `업로드 · 정산`
- `배송원 관리` / `매니저 등록`
- `운영 현황` / `날짜별 현황`
- `정산 처리` / `정산 관리`
- `팀 관리` / `단가 설정`

용어 원칙:

- sidebar label은 `배차 데이터`로 유지한다
- 실제 기능 surface의 canonical 명칭은 `배차 업로드`다
- `배차 데이터`, `배차 업로드`, `배차 데이터 업로드`를 서로 다른 기능처럼 쓰지 않는다
- 이 문서에서는:
  - 메뉴 label = `배차 데이터`
  - 실제 기능명 = `배차 업로드`
  로 고정한다

route binding:

- `홈` -> `/settlement/home`
- `배차 데이터` -> `/settlement/dispatch`
- `배송원 관리` -> `/settlement/crew`
- `운영 현황` -> `/settlement/operations`
- `정산 처리` -> `/settlement/process`
- `팀 관리` -> `/settlement/team`

표시 규칙:

- detached sidebar 구조는 유지
- 현재보다 더 넓고 키가 큰 panel
- `cheonha` 레퍼런스처럼 더 읽기 쉬운 vertical menu density를 갖는다
- 사이드바는 여전히 `정산` route에서만 렌더한다

## Settlement Home Contract

`정산 홈`은 `cheonha` 레퍼런스 구조를 따른다.

구성:

1. 상단 인사말 배너
2. 작은 토글/필터 칩
3. `업무 프로세스` 카드
4. KPI strip 4개
5. 최근 정산 박스

### 1. Greeting Banner

- 어두운 배경의 배너 panel
- 회사명 기준 인사말
- 보조 설명 1줄

### 2. Process Card

`업무 프로세스`는 아래 흐름을 보여준다.

- `배차 업로드`
- `특근 설정`
- `단가 확인`
- `정산 처리`

이 단계 표시는 `cheonha` 레퍼런스의 시각 흐름을 따르되, 실제 route와 의미는 현재 제품에 맞춘다.

프로세스 단계 바인딩:

- `배차 업로드` -> `/settlement/dispatch`
- `특근 설정` -> 현재 `배차 업로드` 문맥 안의 작업 단계
- `단가 확인` -> 현재 `정산 처리` 또는 shell-only 단가 확인 문맥
- `정산 처리` -> `/settlement/process`

상호작용 규칙:

- `배차 업로드`와 `정산 처리`는 클릭 가능한 deep link다
- `특근 설정`과 `단가 확인`은 이번 phase에서 별도 route를 만들지 않고, 현재 workflow 안의 상태 단계로만 보여준다
- 즉 프로세스 카드는 `2개 clickable + 2개 status step`으로 고정한다

### 3. KPI Strip

정산 홈의 KPI 4개는 실제 연결 가능한 데이터로 최대한 채운다.

KPI slot은 아래 4개로 고정한다.

1. `수신합계`
2. `지급합계`
3. `조정비용`
4. `수익`

표시 규칙:

- 4개 slot의 label과 순서는 고정한다
- 각 slot은 현재 연결 가능한 실제 집계값이 있으면 그 값을 사용한다
- 실제 집계값 source priority는:
  - 정산 결과/정산 실행 데이터
  - 현재 정산 입력/요약 데이터
  - 없으면 empty state
- 값이 없으면 숨기지 않고 `0원` 또는 `없음`으로 표기한다
- 이번 phase는 새 계산 로직을 만들지 않고, 이미 존재하는 데이터를 홈 KPI strip에 재배치하는 데만 집중한다

### 4. Recent Settlement

최근 정산 박스는 아래 규칙을 따른다.

- 데이터가 있으면 목록
- 없으면 `정산 내역이 없습니다`

## Operations Page Contract

`운영 현황`은 `근태` 문맥을 가진다.

즉 이번 phase에서 `운영 현황`은 단순 placeholder가 아니라:

- 날짜별 현황
- 배차 기반 운영 현황
- 근태성 지표

를 담는 page surface로 본다.

다만 이번 phase는 KPI 정의를 확정하지 않는다. 따라서:

- `cheonha` 레퍼런스처럼 박스형 요약 layout을 사용
- 현재 연결 가능한 실제 데이터만 채움
- 비는 값은 `없음` 또는 `0`

## Reuse Contract For Existing Pages

### 1. 배차 데이터 / 배차 업로드

`배차 업로드` 기능은 현재 우리 page runtime을 그대로 유지한다.

즉:

- upload flow
- 자동 생성/추정 기능
- 연결된 route

는 유지하고,

- 정산 workspace 안에서 보이는 바깥 frame
- header/panel/spacing/visual language

만 전체 정산 톤에 맞춘다.

### 2. 정산 처리

현재 `SettlementInputsPage` 기반 flow는 유지한다.

다만 이를 감싸는 presentation layer는 `cheonha`식 panel language로 정리한다.

### 3. 배송원 관리 / 팀 관리

이 두 page는 현재 shell-only 상태를 유지하되, 레이아웃과 panel 구조는 다른 정산 페이지와 같은 family로 통일한다.

### 4. 운영 현황

운영 현황도 shell-only/partial 상태더라도, 레퍼런스와 비슷한 summary layout을 먼저 만든다.

## Data Display Rules

이번 phase의 데이터 표시 규칙은 아래다.

1. 새 API를 만들지 않는다.
2. 이미 연결된 데이터와 현재 page가 가진 데이터를 재조합한다.
3. 실제 값이 있으면 실제 값을 우선 사용한다.
4. 값이 없으면 숨기지 않고 명시적으로 적는다.
   - `0원`
   - `없음`
   - `정산 내역이 없습니다`

즉 이번 phase 목표는:

- 디자인과 정보 배치 통일
- 실제 데이터 우선
- 새 도메인 로직 추가는 하지 않음

## Component Boundary

구현은 바깥 shell을 유지한 채, 정산 전용 presentation layer를 따로 두는 방식으로 간다.

핵심 경계:

- `SubdomainSettlementSidebar`
  - 더 큰 2줄형 메뉴
  - 설명 추가
- `CheonhaSettlementWorkspace`
  - 정산 내부 wrapper
  - header/body spacing/panel contract 통일
- `CheonhaSettlementHomePage`
  - 배너
  - 프로세스 카드
  - KPI strip
  - 최근 정산 박스
- `CheonhaSettlementProcessPage`
  - 기존 기능 유지, 바깥 presentation만 재정렬
- `CheonhaRuleShellPanel`
  - shell-only page들을 같은 시각 언어로 통일

## Testing Implications

아래를 테스트로 잠가야 한다.

1. 정산 사이드바가 더 큰 2줄형 항목으로 렌더된다.
2. 정산 메뉴 설명이 의도한 텍스트로 보인다.
3. `정산 홈`이 배너/프로세스/KPI/최근 정산 구조를 가진다.
4. 값이 없을 때 `없음` 또는 `정산 내역이 없습니다`가 보인다.
5. `배차 데이터`는 기존 기능 route를 유지하면서 정산 frame 안에 렌더된다.
6. `정산 처리`, `운영 현황`, `배송원 관리`, `팀 관리`가 같은 panel language를 공유한다.

## Out Of Scope

이번 문서는 아래를 다루지 않는다.

- 바깥 shell 구조 변경
- top-level launcher 변경
- vehicle workspace 변경
- backend/API 계약 변경
- 운영 현황 KPI 정의 확정
