# 11. Settlement Admin Group Pages

## 문서 목적

이 문서는 통합 웹 콘솔에서 settlement 관련 화면을 어떤 그룹 이름과 페이지 구조로 나눌지 current truth 기준으로 고정한다.

이번 문서는 아래를 먼저 결정한다.

1. 좌측 settlement 그룹 이름
2. `정산 조회`와 `정산 처리`의 분리 방식
3. `정산 처리` 내부 탭과 각 탭의 서비스 소유
4. 배차 upload-first handoff 이후 settlement 화면이 어떤 역할을 가지는지

## 그룹 이름

1. 통합 웹 콘솔의 상위 그룹 이름은 `정산`으로 고정한다.
2. `운영`은 settlement 그룹 이름으로 사용하지 않는다.

## 페이지 구조

정산 그룹의 기본 구조는 아래처럼 두 층으로 고정한다.

1. 좌측 그룹 entry
   - `정산 조회`
   - `정산 처리`
2. `정산 처리` 내부 탭
   - `정산 기준`
   - `정산 입력`
   - `정산 실행`
   - `정산 결과`

기본 진입은 아래로 고정한다.

- `/settlements` -> `/settlements/overview`
- `정산 처리` entry -> `/settlements/criteria`

## 라우트 기준

1. `/settlements/overview`
2. `/settlements/criteria`
3. `/settlements/inputs`
4. `/settlements/runs`
5. `/settlements/results`

## 1차 구현 범위

1. 이번 단계는 settlement UI를 `정산 조회 / 정산 처리`와 process 탭 구조로 분리하는 것까지 본다.
2. `정산 조회 / 정산 처리`가 좌측 그룹에서 분리되고, `정산 처리` 안에서 `기준 / 입력 / 실행 / 결과` 탭이 분리돼 있으면 1차 완료로 본다.
3. `delivery-record`, `daily snapshot`, `run`, `item`의 하위 detail route 세분화는 아직 하지 않는다.
4. settlement 하위 write 리소스의 별도 full-page 생성 화면은 1차 범위에 넣지 않는다.
5. `정산 기준`의 현재 공식 UI 계약은 `전역 정산 설정 + 회사·플릿 단가표`다.

## 페이지별 소유 서비스

### 1. `정산 기준`

- 붙는 service: `service-settlement-registry`
- 다루는 리소스:
  - `settlement-config`
  - `settlement-config/metadata`
  - `pricing-table`

보조 규칙:

- 기존 `policy / version / assignment` API는 호환 surface로 남을 수 있지만, 현재 UI 계약의 정본은 아니다.

### 2. `정산 입력`

- 붙는 service: `service-delivery-record`
- 다루는 리소스:
  - `delivery-record`
  - `daily-delivery-input-snapshot`

기본 UX 경로:

- `배차 업로드 결과 검토`
- `snapshot 검토`
- `예외 보정`
- `실행으로 진행`

보조 규칙:

- 배차표 업로드 preview/confirm 자체는 `배차 보드 상세`가 소유한다.
- `정산 입력`은 upload-first review와 예외 보정의 시작점이다.

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
2. settlement 그룹은 `정산 조회`와 `정산 처리`로 먼저 나눈다.
3. `정산 처리` 안에서만 `기준 -> 입력 -> 실행 -> 결과` 흐름을 유지한다.
4. `정산 기준`과 `정산 입력`은 각각 한 service 안의 여러 리소스를 같은 업무 묶음으로 본다.
5. `정산 실행`과 `정산 결과`는 같은 payroll service를 보더라도 페이지를 나눈다.
6. `정산 조회`는 write 화면과 섞지 않는다.

## 네비게이션 원칙

1. 좌측 메인 네비게이션에는 `정산` 상위 그룹만 둔다.
2. 그룹 아래에는 `정산 조회`, `정산 처리` 두 링크만 둔다.
3. `정산 기준`, `정산 입력`, `정산 실행`, `정산 결과`는 `정산 처리` 화면 안의 탭으로만 노출한다.

## 정산 흐름 UX 원칙

1. `정산 조회`는 정산 그룹의 read-only landing page다.
2. `정산 처리`는 `정산 기준 -> 정산 입력 -> 정산 실행 -> 정산 결과` 순서의 탭 흐름을 가진다.
3. 각 탭은 문맥 바를 통해 현재 회사/플릿 범위를 이어서 보여준다.
4. 실제 운영 흐름의 시작점은 대개 `배차 보드 상세` 또는 `정산 기준 / 정산 입력`이다.

## 연결 규칙

1. 정산 기준 화면은 `/api/settlement-registry/settlement-config/`, `/api/settlement-registry/settlement-config/metadata/`, `/api/settlement-registry/pricing-tables/`만 사용한다.
2. delivery input write/review는 `/api/delivery-record/`만 사용한다.
3. settlement run, settlement item write는 `/api/settlements/`만 사용한다.
4. settlement read summary는 `/api/settlement-ops/`만 사용한다.
5. 배차표 upload batch 확인은 `/api/dispatch/upload-batches/`를 사용한다.

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
- `12-settlement-shared-read-pages.md`
- `14-settlement-upload-first-ux-flow.md`
- `16-admin-dispatch-board-pages.md`
- `../rollout/12-settlement-phase-2-api-gates.md`
- `../decisions/specs/2026-03-23-settlement-phase-2-decomposition-design.md`
