# Company Path Shell Visual Refinement Design

## Purpose

이 문서는 `Company Path Shell Role-Split Design` 위에, 회사 path shell의 시각 규칙을 더 좁게 고정하기 위한 보강 설계다.

## Current Canonical Contract

- canonical route base is `ev-dashboard.com/{tenant}`
- `*.ev-dashboard.com` host tenant resolution is compatibility fallback only
- visual shell guidance applies to the company path shell, not a dedicated company host product

이번 문서의 목적은 아래 세 가지를 닫는 것이다.

1. 브랜드 카드의 텍스트 계층을 다시 고정한다.
2. 상위 메뉴 트리거를 텍스트 버튼이 아니라 오른쪽 화살표 컴포넌트로 다시 고정한다.
3. `정산` 진입 시 카드, 화살표, 정산 사이드바 크기가 흔들리지 않도록 detached layout 규칙을 고정한다.

## Relationship To Existing Specs

이 문서는 아래 두 문서를 대체하지 않고, 시각 규칙만 더 구체화한다.

- `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/superpowers/specs/2026-04-17-subdomain-web-definition-design.md`
- `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/superpowers/specs/2026-04-18-subdomain-shell-role-split-design.md`

메인/회사 path 경계, shell 역할 분리, canonical route 계약은 그대로 유지한다.

## Problem Statement

현재 회사 path shell은 기능 경계는 맞아도, 시각 구조는 아직 최종 의도와 다르다.

남아 있는 문제는 아래와 같다.

1. 브랜드 카드의 텍스트 계층이 제품 정체성을 충분히 드러내지 못한다.
2. 상위 메뉴 트리거가 `정산` 텍스트 버튼처럼 보여, product-level navigation과 expand affordance가 섞여 보인다.
3. `정산` 진입 시 카드, 화살표, 정산 사이드바가 함께 재계산되며 크기와 폭이 흔들린다.

## Primary Decision

이번 phase는 역할 분리 구조는 유지하고, 시각 규칙만 아래처럼 재정렬한다.

1. 브랜드 카드는 정사각형 영역을 유지한다.
2. 카드 안의 텍스트는 `CLEVER / EV&Solution / 천하운수` 계층으로 재배치한다.
3. 상위 메뉴 트리거는 카드 우측의 오른쪽 화살표 컴포넌트로 바꾼다.
4. `정산` 사이드바는 기존 레이아웃을 미는 방식이 아니라 detached block으로 붙여서, 카드와 화살표의 크기를 고정한다.

## Visual Contract

### 1. Brand Card

브랜드 카드는 정사각형 영역으로 유지한다.

카드 내부 텍스트 계층:

- 상단 좌측: `CLEVER`
- 그 아래 보조 텍스트: `EV&Solution`
- 카드 중앙 큰 본문: `천하운수`

행동 규칙:

- 카드 본체 클릭은 항상 `/`
- 카드 영역 자체는 `정산` 진입 여부와 무관하게 위치와 크기가 바뀌지 않는다

### 2. Top-Level Expand Trigger

상위 메뉴 트리거는 카드 바로 우측에 붙는 독립 컴포넌트다.

형태 규칙:

- 텍스트 `정산` 버튼이 아니다
- 오른쪽 화살표 affordance를 가진다
- 클릭 시 상위 메뉴가 오른쪽으로 펼쳐진다

현재 상위 메뉴 항목:

- `대시보드`
- `정산`

이 메뉴는 이후 상위 surface가 늘어날 수 있으므로, 지금부터도 단순 CTA가 아니라 product-level navigation launcher로 본다.

### 3. Settlement Sidebar

정산 사이드바는 `정산` route에서만 렌더한다.

표시 규칙:

- 항상 펼침
- 카드 영역과 분리된 블록
- `홈 / 배차 데이터 / 배송원 관리 / 운영 현황 / 정산 처리 / 팀 관리` 유지

핵심 레이아웃 규칙:

- 사이드바가 생겨도 카드와 화살표의 크기를 밀지 않는다
- 사이드바는 detached block처럼 아래쪽에 붙는다
- 결과적으로 `대시보드 -> 정산` 전환 시, 카드/화살표/사이드바가 서로의 크기 기준을 다시 계산하지 않는다

## Layout Rules

### 1. Dashboard

`대시보드`에서는 아래만 보인다.

- 브랜드 카드
- 카드 우측 화살표 트리거
- 빈 본문

좌측 workspace sidebar는 존재하지 않는다.

### 2. Settlement

`정산`에서는 아래가 보인다.

- 같은 브랜드 카드
- 같은 화살표 트리거
- 카드 아래 detached settlement sidebar
- 우측 settlement workspace

즉 `정산` 진입은 새 레이아웃을 다시 조립하는 것이 아니라, 고정된 상단 카드/트리거 아래에 settlement block을 추가하는 방식이다.

### 3. Width Contract

브랜드 카드와 detached workspace sidebar는 같은 surface width를 공유해야 한다.

- 브랜드 카드 폭과 detached settlement sidebar 폭은 항상 같다.
- 같은 규칙은 detached vehicle sidebar에도 적용한다.
- 이후 shell refinement에서는 radius, color, active tone은 바뀔 수 있어도 이 width contract는 깨지지 않아야 한다.

### 4. Settlement Dispatch Layout Contract

`정산 > 배차 데이터`는 viewport에 따라 두 가지 레이아웃을 가진다.

- 넓은 viewport에서는 `업로드 범위 | 업로드 파일` 2열을 유지한다.
- 좁은 viewport에서만 `업로드 범위`를 가로 launcher/expander로 접는다.
- 접힘 상태는 세로 카드가 아니라 낮은 가로 bar여야 한다.
- local-sandbox mock은 이 route에서 필요한 `/drivers/` read path를 포함해야 하며, unsupported API 경고를 화면에 노출하지 않는다.

## Implementation Direction

이번 시각 변경은 역할 분리 구조를 유지한 채 구현한다.

유지할 책임:

- `CockpitShell`
  - dashboard vs settlement 조합 책임
- brand-card component
  - 카드 내용/크기/홈 이동
- expand-trigger component
  - 화살표와 상위 메뉴 열기/닫기
- settlement-sidebar component
  - 정산 전용 메뉴 렌더

즉 기존 `역할 분리형` 구조를 유지하면서, 시각 규칙과 layout attachment 방식만 조정한다.

## Testing Implications

아래를 테스트로 잠가야 한다.

1. 브랜드 카드에 `CLEVER`, `EV&Solution`, `천하운수`가 의도한 계층으로 렌더된다.
2. 카드 우측 트리거는 텍스트 `정산` CTA가 아니라 expand trigger로 보인다.
3. `정산` 진입 후에도 카드 크기와 위치가 유지된다.
4. `정산` 진입 후에도 화살표 트리거 크기와 위치가 유지된다.
5. settlement sidebar는 detached block으로 보이며 항상 펼침 상태다.

## Out of Scope

이번 문서는 아래를 다루지 않는다.

- 정산 내부 페이지 콘텐츠 재정의
- 메인 도메인 shell 수정
- backend/API 계약 변경
- 디자인 시스템 전면 개편
