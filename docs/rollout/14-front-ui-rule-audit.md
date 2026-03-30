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

1. `accounts`, `companies`, `fleets`는 규칙에 맞게 정리됐다.
2. `driver` 브라우저 URL은 `route_no`로 정리됐지만, 화면 구조는 아직 혼합이 남아 있다.
3. `vehicles`, `terminals`, `vehicle-assignments`, `settlements`는 대부분 `목록 + 입력 + 상태 변경`이 한 페이지에 같이 있다.
4. 현재 가장 큰 위반 패턴은 `목록/생성/수정 혼합`이다.

## Operator Audit

### 1. `login`

- 상태: 적합
- 근거: 로그인 화면은 별도 화면이고, 세션 규칙과 에러 표시 규칙을 따른다.

### 2. `dashboard`

- 상태: 적합
- 근거: 읽기 전용 요약 화면이며, 목록/입력 혼합이 없다.

### 3. `drivers`

- 상태: 부분 적합
- 현재 라우트
  - `/drivers`
  - `/drivers/:driverRef`
- 맞는 점
  - 상세 라우트가 분리돼 있다.
  - 상세 URL은 `route_no`를 사용한다.
- 위반 점
  - `/drivers` 화면이 목록과 생성/수정 폼을 같이 가진다.
  - 수정이 별도 라우트가 아니라 목록 화면 안에서 열린다.

### 4. `vehicles`

- 상태: 위반
- 현재 라우트
  - `/vehicles`
- 위반 점
  - 목록과 상세가 같은 화면에 같이 있다.
  - 상세 접근이 라우트 이동이 아니라 화면 내 선택 상태다.
  - 상세 URL이 존재하지 않는다.

### 5. `settlements`

- 상태: 부분 적합
- 현재 라우트
  - `/settlements`
- 맞는 점
  - 읽기 전용이다.
- 위반 점
  - 실행 목록과 항목 상세가 같은 화면에 있다.
  - 선택한 실행 상세가 별도 라우트가 아니다.

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

- 상태: 위반
- 현재 라우트
  - `/drivers`
- 위반 점
  - 목록과 생성/수정 폼이 한 화면에 같이 있다.
  - 상세 라우트가 없다.
  - 수정 라우트가 없다.

### 5. `vehicles`

- 상태: 위반
- 현재 라우트
  - `/vehicles`
- 위반 점
  - 차량 마스터 생성/수정, 운영사 접근 생성/종료, 목록이 한 페이지에 같이 있다.
  - 서로 다른 리소스가 한 화면에서 동시에 쓰기 동작을 가진다.
  - 상세 라우트가 없다.

### 6. `terminals`

- 상태: 위반
- 현재 라우트
  - `/terminals`
- 위반 점
  - 단말기 생성/수정, 설치 생성/해제, 목록이 한 페이지에 같이 있다.
  - `terminal`, `terminal-installation`이 한 화면에서 같이 쓰기 동작을 가진다.
  - 상세 라우트가 없다.

### 7. `vehicle-assignments`

- 상태: 위반
- 현재 라우트
  - `/vehicle-assignments`
- 위반 점
  - 목록과 생성이 같은 화면에 있다.
  - 상세와 수정 라우트가 없다.

### 8. `settlements`

- 상태: 위반
- 현재 라우트
  - `/settlements`
- 위반 점
  - `settlement-run`, `settlement-item` 생성/수정/삭제와 목록이 한 화면에 같이 있다.
  - 실행과 항목이 각각 독립 리소스인데 라우트 분리가 없다.

## 우선 정리 순서

1. `admin drivers`
2. `operator drivers`
3. `admin vehicles`
4. `admin terminals`
5. `admin vehicle-assignments`
6. `admin settlements`
7. `operator vehicles`
8. `operator settlements`

## 순서 기준

1. 먼저 같은 도메인에서 admin/operator가 같이 걸린 화면을 정리한다.
2. 그다음 하나의 화면에서 여러 리소스를 같이 쓰는 페이지를 자른다.
3. 마지막에 읽기 전용이지만 상세 라우트가 없는 operator read 화면을 자른다.

## 구현 기준 메모

1. 새 상세 라우트는 모두 `route_no` 기준으로 만든다.
2. 새 생성/수정 화면은 1열 폼으로 만든다.
3. 목록 화면에는 생성 폼을 남기지 않는다.
4. 관계 화면 예외는 `company > fleet`처럼 상하 관계가 명확한 경우에만 쓴다.
