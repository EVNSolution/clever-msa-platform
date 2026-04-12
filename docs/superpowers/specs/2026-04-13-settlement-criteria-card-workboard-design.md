# Settlement Criteria Card Workboard Design

## Scope

이 문서는 `정산 처리 > 정산 기준` 화면 하나만 다시 정의한다.

- 대상 화면: `/settlements/criteria`
- 대상 repo: `development/front-web-console`
- 비대상:
  - `정산 입력 / 정산 실행 / 정산 결과`
  - `service-settlement-registry` API 계약 변경
  - 전역 정산 설정 값 자체의 의미 변경

이번 작업은 이전 `정산 조회` 정리와 분리된 새 UI slice다.

## Problem Statement

현재 `정산 기준` 화면은 기능은 맞지만 운영 화면으로 읽히지 않는다.

핵심 문제는 아래다.

1. 화면이 길다.
- 페이지 상단 설명, 항목 개수 메타, 섹션 설명, field 설명이 누적돼 첫 화면 밀도가 너무 낮다.

2. 우선순위가 안 보인다.
- 전역 설정과 회사·플릿 단가표가 같은 길이의 세로 폼으로 쌓여서, 사용자가 어디부터 손대야 하는지 한눈에 안 잡힌다.

3. 뷰포트 높이를 못 쓴다.
- 전체 페이지가 아래로 길게 늘어져 있고, 실제 수정 대상은 여러 카드로 나뉘어 있지 않아 운영자가 스크롤 피로를 크게 느낀다.

4. 저장 동작이 멀다.
- 현재는 긴 폼 끝까지 내려가야 저장 버튼이 보인다. 수정한 맥락과 저장 액션의 거리가 멀다.

## Design Goal

`정산 기준`은 설명형 폼이 아니라, 한 화면 안에서 핵심 기준을 보고 바로 수정하는 운영 workboard로 바꾼다.

성공 기준은 아래다.

- 페이지 제목만 보고도 화면 목적이 바로 읽힌다.
- 첫 화면 안에 핵심 카드가 최대한 많이 들어온다.
- 페이지 전체가 아니라 카드 내부만 스크롤된다.
- 각 카드에서 수정과 저장이 가까이 붙어 있다.
- 모바일/낮은 height에서도 전체 레이아웃이 무너지지 않는다.

## Primary Decision

`정산 기준` 화면을 `4카드 workboard`로 재구성한다.

카드 순서는 아래로 고정한다.

1. `세율`
2. `보험`
3. `기준금액`
4. `회사·플릿 단가표`

레이아웃 원칙:

- 페이지 상단은 `정산 기준` 제목만 유지한다.
- 긴 부제, 설명 문구, 항목 개수 메타는 제거한다.
- 본문은 카드만 나열한다.
- 데스크톱은 `2 x 2` 그리드다.
- 좁은 width에서는 `1열`로 내린다.
- 카드 높이는 viewport 기준으로 맞추고, 카드 body만 내부 스크롤한다.

## Information Architecture

### 1. Page Header

남기는 것:

- 페이지 제목 `정산 기준`

제거하는 것:

- `정산 설정`
- `전역 정산 설정`
- `회사/플릿 구분 없이 ...`
- `현재 설정 항목: n개`
- 카드 안의 긴 설명 문구

즉, 상단 설명층을 거의 비우고 바로 작업 카드로 들어간다.

### 2. Card Mapping

현재 metadata-driven field 구조는 유지하되, 화면에서는 아래 카드로 재배치한다.

#### 세율 카드

- `income_tax_rate`
- `vat_tax_rate`
- `reported_amount_rate`

#### 보험 카드

- `national_pension_rate`
- `health_insurance_rate`
- `medical_insurance_rate`
- `employment_insurance_rate`
- `industrial_accident_insurance_rate`
- `special_employment_insurance_rate`
- `special_industrial_accident_insurance_rate`

#### 기준금액 카드

- `two_insurance_min_settlement_amount`
- `meal_allowance`

#### 회사·플릿 단가표 카드

- 회사 선택
- 플릿 선택
- `box_sale_unit_price`
- `box_purchase_unit_price`
- `overtime_fee`

## Interaction Decision

### 1. Card-local save

저장은 카드 하단에 둔다.

- `세율 저장`
- `보험 저장`
- `기준금액 저장`
- `단가표 저장`

저장 버튼은 카드 footer에 고정해, 카드 body를 스크롤해도 항상 같은 자리에서 보이게 한다.

### 2. Payload behavior

전역 설정 카드 3개는 같은 `settlement-config`를 보지만, 각 카드에서 자기 필드만 PATCH한다.

이렇게 두는 이유:

- 사용자는 카드 단위로 사고한다.
- 긴 전역 폼 전체 저장보다 수정 범위를 명확히 알 수 있다.
- 기존 PATCH 계약과도 맞는다.

`회사·플릿 단가표` 카드는 기존 저장 흐름을 유지한다.

### 3. Success and error feedback

성공/실패 메시지는 페이지 최상단 전체 배너가 아니라, 카드 내부 상단 또는 카드 footer 바로 위에 붙인다.

이유:

- 어떤 카드 저장의 결과인지 즉시 읽혀야 한다.
- 전역 배너는 여러 카드 작업에서 출처가 모호해진다.

## Layout Rules

### 1. Viewport-fitted page body

`정산 처리` shell 안에서 `정산 기준` 본문은 남은 높이를 모두 쓴다.

- outer content는 `min-height`가 아니라 `available viewport height` 기준으로 잡는다
- page body는 `overflow: hidden`
- 각 카드 body만 `overflow: auto`

이 원칙은 width 반응형보다 height 반응형을 더 우선한다.

### 2. Grid

데스크톱:

- `2 columns`
- 카드 높이는 가능한 한 맞춘다
- row gap과 column gap은 작게 유지한다

태블릿/모바일:

- `1 column`
- 카드 height는 너무 작아지지 않게 최소 높이를 둔다
- 하지만 전체 페이지는 계속 shell 안에서 제어한다

### 3. Card density

카드 안에서는 아래를 지킨다.

- 제목은 한 줄
- 불필요한 부연 설명 제거
- 라벨과 입력 간 간격 축소
- 단위 표시는 input 옆에 compact하게 유지
- baseline 정렬 유지

## Responsive Decision

이번 화면은 width만이 아니라 height에 반응해야 한다.

### Height 기준

height가 낮을 때:

- 카드 헤더 높이를 줄인다
- 카드 body만 스크롤된다
- 저장 footer는 계속 노출된다

즉 사용자는 페이지 전체를 길게 흔들지 않고, 필요한 카드 안에서만 내려가며 수정한다.

### Width 기준

width가 충분할 때는 `2 x 2`

width가 줄면 `1열`

단, 모바일에서도 카드 내부 입력 baseline과 footer alignment는 유지해야 한다.

## Visual Tone

이 화면은 설명형 설정 페이지가 아니라 운영용 control board처럼 보여야 한다.

따라서 아래를 피한다.

- 긴 안내 문장
- 과도한 여백
- full-width 세로 폼
- 큰 hero형 헤더
- 카드 안의 중복 section 제목

대신 아래를 유지한다.

- 짧은 제목
- 높은 정보 밀도
- 안정된 정렬
- 내부 스크롤
- 카드 단위 저장

## Testing Direction

### Unit

`SettlementCriteriaPage.test.tsx`에서 아래를 검증한다.

1. 상단 제목만 남고 기존 설명/메타가 사라졌는지
2. 카드 4개가 렌더되는지
3. 카드별 저장 버튼이 있는지
4. 전역 설정 저장이 카드별 partial payload를 보내는지
5. 회사·플릿 단가표 저장은 기존대로 동작하는지

### Manual

`5174` 실프록시 기준으로 아래를 본다.

1. 첫 화면에서 카드 4개 구조가 한눈에 들어오는지
2. 페이지 전체가 길게 밀리지 않는지
3. 카드 body만 스크롤되는지
4. 저장 버튼이 카드 맥락 안에 붙어 보이는지
5. 작은 height에서도 footer/button이 가려지지 않는지

## Implementation Boundary

이번 slice는 `front-web-console`만 수정한다.

이유:

- 값 의미나 계약 자체는 현재 기준으로 유지된다.
- 문제의 중심은 정보 구조와 레이아웃이다.
- backend contract를 바꾸지 않아도 UI 문제를 1차로 닫을 수 있다.

단, 구현 중에 `카드별 partial PATCH`를 프런트에서 더 안전하게 만들기 위한 작은 helper 추가는 허용한다.

## Completion Signal

아래가 충족되면 이번 slice 완료로 본다.

1. `/settlements/criteria`가 `4카드 workboard`로 바뀐다.
2. 페이지 전체보다 카드 내부 스크롤이 우선된다.
3. 저장 액션이 카드 하단에 고정된다.
4. 기존 장황한 설명/메타가 제거된다.
5. `5174`에서 height 포함 반응형 확인이 끝난다.
