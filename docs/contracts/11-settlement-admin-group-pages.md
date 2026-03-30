# 11. Settlement Admin Group Pages

## 문서 목적

이 문서는 관리자 콘솔에서 settlement 관련 화면을 어떤 그룹 이름과 페이지 구조로 나눌지 고정한다.

이번 문서는 아래를 먼저 결정한다.

1. 헤더 바 그룹 이름
2. 정산 관련 페이지 묶음
3. 각 페이지가 붙는 write/read service
4. 화면을 서비스 이름이 아니라 업무 흐름으로 나누는 원칙

## 그룹 이름

1. 관리자 콘솔의 상위 그룹 이름은 `정산`으로 고정한다.
2. `운영`은 settlement 그룹 이름으로 사용하지 않는다.

이유:

- `운영`은 너무 넓다.
- settlement policy, delivery input, payroll run, result, read summary를 한 단어로 묶기에는 `정산`이 더 직접적이다.
- 사용자에게 service repo 이름이 아니라 업무 흐름이 먼저 보여야 한다.

## 페이지 구조

정산 그룹의 기본 페이지는 아래 다섯 개로 고정한다.

1. `정산 기준`
2. `정산 입력`
3. `정산 실행`
4. `정산 결과`
5. `정산 조회`

기본 진입은 아래로 고정한다.

- `/settlements` -> `/settlements/overview`

## 라우트 기준

1. `/settlements/criteria`
2. `/settlements/inputs`
3. `/settlements/runs`
4. `/settlements/results`
5. `/settlements/overview`

## 페이지별 소유 서비스

### 1. `정산 기준`

- 붙는 service: `service-settlement-registry`
- 다루는 리소스:
  - `policy`
  - `policy-version`
  - `policy-assignment`

### 2. `정산 입력`

- 붙는 service: `service-delivery-record`
- 다루는 리소스:
  - `delivery-record`
  - `daily-delivery-input-snapshot`

### 3. `정산 실행`

- 붙는 service: `service-settlement-payroll`
- 다루는 리소스:
  - `settlement-run`

### 4. `정산 결과`

- 붙는 service: `service-settlement-payroll`
- 다루는 리소스:
  - `settlement-item`

### 5. `정산 조회`

- 붙는 service: `service-settlement-operations-view`
- 다루는 리소스:
  - `run` read
  - `item` read
  - `driver latest settlement` read

## 화면 분리 원칙

1. settlement 화면은 service repo 이름으로 메뉴를 만들지 않는다.
2. settlement 화면은 `기준 -> 입력 -> 실행 -> 결과 -> 조회` 흐름으로 나눈다.
3. `정산 기준`과 `정산 입력`은 각각 한 service 안의 여러 리소스를 같은 업무 묶음으로 본다.
4. `정산 실행`과 `정산 결과`는 같은 payroll service를 보더라도 페이지를 나눈다.
5. `정산 조회`는 write 화면과 섞지 않는다.

## 헤더 바 원칙

1. 상단 전역 네비게이션에는 `정산`만 둔다.
2. settlement 상세 하위 이동은 settlement 내부 보조 네비게이션에서 처리한다.
3. 상단 전역 네비게이션에 `정산 기준`, `정산 입력`, `정산 실행`, `정산 결과`, `정산 조회`를 모두 펼치지 않는다.

## 연결 규칙

1. policy, version, assignment write는 `/api/settlement-registry/`만 사용한다.
2. delivery input write는 `/api/delivery-record/`만 사용한다.
3. settlement run, settlement item write는 `/api/settlements/`만 사용한다.
4. settlement read summary는 `/api/settlement-ops/`만 사용한다.
5. settlement read 화면은 payroll direct read를 우회하지 않는다.

## 비스코프

이번 문서는 아래를 아직 고정하지 않는다.

1. settlement 각 리소스의 browser detail route 번호 체계
2. settlement 하위 리소스별 detail / edit route 분해 순서
3. payout 이후 후속 workflow
4. 계산 엔진 고도화

## 연결 문서

- `06-id-and-state-dictionary.md`
- `09-integration-rules.md`
- `10-front-ui-rules.md`
- `../rollout/12-settlement-phase-2-api-gates.md`
- `../decisions/specs/2026-03-23-settlement-phase-2-decomposition-design.md`
