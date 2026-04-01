# 14. Front UI Rule Audit

## 문서 목적

이 문서는 [../contracts/10-front-ui-rules.md](../contracts/10-front-ui-rules.md) 기준으로 현재 `front-admin-console`, `front-operator-console` 화면이 얼마나 맞춰져 있는지 점검한 결과를 남긴다.

이 문서는 구현 완료 기록이 아니라, 현재 UI 정리 작업의 기준선이다.

## 점검 기준

1. 탭 첫 화면은 목록인가
2. 생성, 상세, 수정이 라우트로 분리됐는가
3. 입력 폼이 1열 기준인가
4. 상세가 읽기 전용 요약과 연결 정보 중심인가
5. 브라우저 URL이 `route_no` 규칙을 따르는가

## 점검 결과 요약

1. `accounts`, `companies`, `fleets`, `drivers`, `settlements`는 현재 계약 기준으로 정리됐다.
2. `vehicles`는 새 vehicle-centered contract 기준으로 다시 정리해야 한다.
3. 남은 핵심 위반 화면은 `vehicles`, `vehicle-assignments`다.
4. `terminals`는 독립 화면을 키우는 방향이 아니라 제거 대상이다.

## Operator Audit

### 1. `login`

- 상태: 적합
- 근거: 로그인 화면은 별도 화면이고, 세션 규칙과 에러 표시 규칙을 따른다.

### 2. `dashboard`

- 상태: 적합
- 근거: 읽기 전용 요약 화면이며, 목록/입력 혼합이 없다.

### 3. `drivers`

- 상태: 적합
- 현재 라우트
  - `/drivers`
  - `/drivers/new`
  - `/drivers/:driverRef`
  - `/drivers/:driverRef/edit`
- 근거
  - 목록, 생성, 상세, 수정이 분리돼 있다.
  - 상세 URL은 `route_no`를 사용한다.

### 4. `vehicles`

- 상태: 적합
- 현재 라우트
  - `/vehicles`
  - `/vehicles/:vehicleRef`
- 근거
  - 목록과 상세가 분리돼 있다.
  - 목록 로우 클릭으로 상세 라우트에 진입한다.
  - 상세 URL이 `route_no`를 따른다.

### 5. `settlements`

- 상태: 적합
- 현재 라우트
  - `/settlements`
- 근거
  - `operator` settlement는 1차 범위에서 shared read summary 화면 한 장으로 고정했다.
  - write 동작이 없다.
  - read contract는 `settlement-ops` 기준으로 분리돼 있다.

## Admin Audit

### 1. `login`

- 상태: 적합
- 근거: 로그인 화면 분리, 세션 유지 규칙 적용, 에러 표시 규칙 적용.

### 2. `accounts`

- 상태: 적합
- 현재 라우트
  - `/accounts`
  - `/accounts/new`
  - `/accounts/:accountRef`
  - `/accounts/:accountRef/edit`
- 근거
  - 목록, 생성, 상세, 수정이 분리돼 있다.
  - 브라우저 URL이 `route_no`를 따른다.

### 3. `companies`

- 상태: 적합
- 현재 라우트
  - `/companies`
  - `/companies/new`
  - `/companies/:companyRef`
  - `/companies/:companyRef/edit`
  - `/companies/:companyRef/fleets/new`
  - `/companies/:companyRef/fleets/:fleetRef`
  - `/companies/:companyRef/fleets/:fleetRef/edit`
- 근거
  - `company > fleet` 관계가 라우트와 화면 구조에 반영돼 있다.
  - `company` 상세만 2열 관계 화면 예외를 사용한다.
  - 브라우저 URL이 `route_no`를 따른다.

### 4. `drivers`

- 상태: 적합
- 현재 라우트
  - `/drivers`
  - `/drivers/new`
  - `/drivers/:driverRef`
  - `/drivers/:driverRef/edit`
- 근거
  - 목록, 생성, 상세, 수정이 분리돼 있다.
  - 브라우저 URL이 `route_no`를 따른다.

### 5. `vehicles`

- 상태: 부분 적합
- 현재 라우트
  - `/vehicles`
  - `/vehicles/new`
  - `/vehicles/:vehicleRef`
  - `/vehicles/:vehicleRef/edit`
  - `/vehicles/:vehicleRef/accesses/new`
- 근거
  - 차량 목록, 상세, 수정 분리는 되어 있다.
  - 브라우저 URL이 `route_no`를 따른다.
  - 하지만 새 current truth는 `vehicle detail`이 terminal/live 정보를 함께 소유해야 한다.
  - 현재는 terminal 관리가 별도 페이지에 남아 있어 vehicle-centered contract를 아직 만족하지 않는다.

### 6. `terminals`

- 상태: 제거 대상
- 현재 라우트
  - `/terminals`
- 판단
  - 새 current truth에서는 browser 독립 terminal page를 target으로 두지 않는다.
  - terminal 정보와 live 상태는 `vehicle detail`로 흡수한다.
  - 웹 수동 설치/해제 흐름도 target UI에서 제외한다.

### 7. `vehicle-assignments`

- 상태: 위반
- 현재 라우트
  - `/vehicle-assignments`
- 위반 점
  - 목록과 생성이 같은 화면에 있다.
  - 상세와 수정 라우트가 없다.

### 8. `settlements`

- 상태: 적합
- 현재 라우트
  - `/settlements/overview`
  - `/settlements/criteria`
  - `/settlements/inputs`
  - `/settlements/runs`
  - `/settlements/results`
- 근거
  - settlement 1차 범위를 `기준 / 입력 / 실행 / 결과 / 조회` 그룹 라우트 분리로 고정했다.
  - admin settlement는 그 계약대로 분리돼 있다.

## 우선 정리 순서

1. `admin vehicles`의 terminal/live 흡수
2. `admin terminals` 제거
3. `admin vehicle-assignments`

## 순서 기준

1. 먼저 같은 도메인에서 admin/operator가 같이 걸린 화면을 정리한다.
2. 그다음 하나의 화면에서 여러 리소스를 같이 쓰는 페이지를 자른다.
3. 정산은 1차 범위 기준 정리 완료로 보고 우선순위에서 뺀다.

## 구현 기준 메모

1. 새 상세 라우트는 모두 `route_no` 기준으로 만든다.
2. 새 생성/수정 화면은 1열 폼으로 만든다.
3. 목록 화면에는 생성 폼을 남기지 않는다.
4. 관계 화면 예외는 `company > fleet`처럼 상하 관계가 명확한 경우에만 쓴다.
