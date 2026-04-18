# Subdomain Vehicle Workspace Design

## Purpose

이 문서는 기존 subdomain shell 정의 위에, `차량` 상위 메뉴와 차량 전용 workspace를 추가하기 위한 보강 설계다.

이번 문서의 목적은 아래를 닫는 것이다.

1. 서브도메인 상위 메뉴를 `대시보드 / 차량 / 정산`으로 확장한다.
2. `차량`이 `정산`과 같은 형식의 전용 workspace를 가진다는 점을 고정한다.
3. `차량` 전용 사이드바의 1차 메뉴와 기본 landing을 고정한다.
4. 기존 차량/배송원/차량 배정 페이지를 새 workspace 안에서 어떻게 재사용할지 고정한다.

## Relationship To Existing Specs

이 문서는 아래 문서들을 대체하지 않고, 상위 메뉴와 workspace surface만 확장한다.

- `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/superpowers/specs/2026-04-17-subdomain-web-definition-design.md`
- `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/superpowers/specs/2026-04-18-subdomain-shell-role-split-design.md`
- `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/superpowers/specs/2026-04-18-subdomain-shell-visual-refinement-design.md`

기존 카드/런처/global header/정산 detached sidebar 계약은 그대로 유지한다.

## Problem Statement

현재 subdomain shell은 `대시보드`와 `정산`만 가진다. 이 구조는 정산 중심 제품 surface로는 충분하지만, 차량 관련 기능을 상위 수준에서 묶어 보여주기엔 부족하다.

남아 있는 문제는 아래와 같다.

1. 기존 `배송원`, `차량`, `차량 배정` 페이지는 존재하지만, subdomain shell 상위 탐색 구조 안에서 하나의 vehicle workspace로 읽히지 않는다.
2. `정산`만 전용 workspace를 가진 상태라, 향후 product-level top menu 확장 규칙이 비대칭적이다.
3. 차량 관련 기능을 상위 메뉴로 올리더라도, 기존 페이지를 버리지 않고 재사용하는 연결 규칙이 먼저 필요하다.

## Approaches Considered

### 1. 기존 `정산` 안에 차량 기능을 넣기

장점:

- shell 변경이 가장 적다.

단점:

- 차량과 정산의 제품 경계가 다시 흐려진다.
- 상위 메뉴를 늘리려는 현재 방향과 맞지 않는다.

채택하지 않는다.

### 2. `차량` 상위 메뉴 + 전용 workspace 추가

장점:

- `정산`과 대칭적인 workspace 규칙을 만든다.
- 기존 차량/배송원 관련 페이지를 상위 surface 안에서 재사용할 수 있다.
- 추후 상위 메뉴 추가에도 일관된 패턴을 유지할 수 있다.

단점:

- 새 vehicle home route와 사이드바 wiring이 필요하다.

이번 문서는 이 안을 채택한다.

### 3. top menu만 추가하고 sidebar는 없이 바로 기존 페이지로 이동

장점:

- 구현은 더 작다.

단점:

- `차량`이 진짜 workspace가 아니라 단순 shortcut처럼 보인다.
- `정산`과 형태가 달라져 shell 규칙이 흔들린다.

채택하지 않는다.

## Primary Decision

subdomain 상위 메뉴는 아래로 확장한다.

- `대시보드`
- `차량`
- `정산`

여기서 `차량`은 `정산`과 같은 형식의 전용 workspace다.

즉 subdomain shell은 이제:

- dashboard landing
- vehicle workspace
- settlement workspace

의 3축 구조로 본다.

## Top-Level Navigation Contract

상위 launcher 메뉴의 canonical order는 아래다.

1. `대시보드`
2. `차량`
3. `정산`

원칙:

- launcher는 기존과 동일하게 브랜드 카드 우측에서 가로로 펼쳐진다.
- launcher는 product-level navigation이다.
- 카드, global header, launcher visual contract는 유지한다.

## Vehicle Workspace Contract

`차량`을 클릭하면 vehicle workspace로 진입한다.

형태는 `정산`과 같은 형식으로 고정한다.

- 상단: 브랜드 카드 + top-level launcher
- 하단: vehicle 전용 detached sidebar
- 우측: vehicle workspace content

즉 `차량`도 `정산`처럼, dashboard에는 없고 workspace route에서만 전용 sidebar가 생긴다.

## Vehicle Sidebar Contract

vehicle 전용 사이드바의 1차 메뉴는 아래로 고정한다.

1. `홈`
2. `배송원`
3. `차량`
4. `차량 배정`

표시 규칙:

- 항상 펼침
- `정산` sidebar와 같은 surface family
- 브랜드 카드 아래 detached block

## Vehicle Landing Contract

`차량`의 기본 landing은 `홈`이다.

1차 vehicle home은 **빈 화면**으로 둔다.

즉 vehicle home은 실제 데이터 대시보드를 지금 구현하지 않는다. 다만 workspace 첫 진입점으로서 route와 shell 자리만 먼저 고정한다.

## Existing Page Reuse Contract

vehicle workspace 안에서 아래 메뉴는 기존 페이지를 그대로 연결한다.

- `배송원`
  - 기존 배송원 페이지 surface 연결
- `차량`
  - 기존 차량 페이지 surface 연결
- `차량 배정`
  - 기존 차량 배정 페이지 surface 연결

즉 이번 phase는 새 CRUD를 만들지 않는다. 기존 page runtime을 새 workspace 정보구조 안으로 재배치하는 작업이다.

## Route Contract

canonical vehicle workspace route는 아래로 고정한다.

- `/vehicles/home`
- `/drivers`
- `/vehicles`
- `/vehicle-assignments`

전환 규칙:

- top-level launcher의 `차량` 클릭
  - `/vehicles/home`로 이동
- `차량 > 홈`
  - 빈 dashboard-like surface
- `차량 > 배송원`
  - 기존 `drivers` page
- `차량 > 차량`
  - 기존 `vehicles` page
- `차량 > 차량 배정`
  - 기존 `vehicle-assignments` page

이 문서는 기존 entity page URL을 바꾸지 않는다. 다만 vehicle workspace landing만 새로 추가한다.

## Shell State Rules

vehicle workspace도 settlement workspace와 같은 shell state 규칙을 따른다.

- 카드와 top-level launcher는 route 전환 시 유지
- vehicle sidebar는 vehicle workspace route에서만 렌더
- dashboard로 돌아가면 vehicle sidebar는 사라짐
- top-level launcher expanded/collapsed state는 local UI state로 유지

## Implementation Direction

이번 변경은 기존 role-split 구조를 유지한 채 구현한다.

유지할 책임:

- `CockpitShell`
  - dashboard / vehicle / settlement shell 조합
- top-level launcher
  - `대시보드 / 차량 / 정산`
- detached sidebar components
  - vehicle sidebar
  - settlement sidebar

즉 기존 shell architecture를 깨지 않고, detached workspace 종류를 하나 더 추가하는 방향이다.

## Testing Implications

아래를 테스트로 잠가야 한다.

1. launcher에 `대시보드 / 차량 / 정산`이 순서대로 노출된다.
2. `차량` 클릭 시 `/vehicles/home`로 이동한다.
3. vehicle workspace에서 detached sidebar가 나타난다.
4. vehicle sidebar 메뉴 `홈 / 배송원 / 차량 / 차량 배정`이 노출된다.
5. `차량 > 홈`은 빈 본문으로 렌더된다.
6. `배송원 / 차량 / 차량 배정`은 기존 page surface를 계속 렌더한다.

## Out of Scope

이번 문서는 아래를 다루지 않는다.

- vehicle home 데이터 대시보드 설계
- 정산 내부 메뉴 변경
- 메인 도메인 IA 변경
- backend/API 계약 변경
