# 16. Admin Dispatch Board Pages

## 문서 목적

이 문서는 `front-web-console`의 배차 1차 화면 구조를 current truth 기준으로 고정한다.

이번 문서는 아래를 먼저 결정한다.

1. 배차 화면의 상위 컨텍스트
2. 배차 보드 상세가 어떤 운영 흐름을 소유하는가
3. `예상 물량`, `용차 기사`, `날짜별 근무 예외`, `배차표 업로드`를 어디에서 다루는가
4. admin web에서 어느 화면이 write owner처럼 행동하는가

## 적용 범위

- `front-web-console`
- `service-dispatch-registry`
- `service-dispatch-operations-view`
- `service-vehicle-assignment`
- `service-vehicle-registry`
- `service-driver-profile`
- `service-delivery-record`

## 기본 원칙

1. 배차 1차는 `front-web-console`만 대상으로 한다.
2. 배차 상위 컨텍스트는 `company + fleet + dispatch_date`다.
3. 화면의 핵심 row는 `vehicle` 단독이 아니라 날짜 기준 `dispatch_unit`이다.
4. `dispatch_unit board`는 정본 페이지가 아니라 운영 보드다.
5. 정본은 계속 `dispatch_plan`, `vehicle_schedule`, `dispatch_assignment`에 남는다.
6. `용차 기사`와 `날짜별 근무 예외`는 운영 입력으로만 다룬다.
7. phase 1 MVP에서는 `배차 계획`과 `배차표 업로드`를 분리한다.
8. 배차 계획이 없어도 배차표 업로드와 단순 정산 준비를 먼저 시작할 수 있어야 한다.

## 페이지 구조

배차 1차의 admin 페이지는 아래 네 개로 고정한다.

1. `배차 계획 목록`
2. `배차 보드 상세`
3. `예상 물량 입력/수정`
4. `배차표 업로드`

기본 진입은 아래로 고정한다.

- `/dispatch` -> `/dispatch/boards`

## 라우트 기준

1. `/dispatch/boards`
2. `/dispatch/boards/:fleetRef/:dispatchDate`
3. `/dispatch/plans/:dispatchPlanRef/edit`
4. `/dispatch/uploads`

배차 보드 상세 route는 `fleetRef + dispatchDate` 문맥을 직접 쓴다.

`/dispatch/uploads`는 `company + fleet + dispatch_date`만으로 업로드를 시작하는 phase 1 MVP route다.

## 1. 배차 계획 목록

### 화면 역할

`/dispatch/boards`는 아래 역할만 가진다.

1. `company`, `fleet`, `dispatch_date` 기준 목록을 보여준다.
2. 각 row는 하나의 `dispatch_plan` 문맥을 대표한다.
3. row click으로 `배차 보드 상세`에 이동한다.
4. 예상 물량 수정은 `예상 물량 입력/수정` 화면으로만 진입한다.
5. 배차표 업로드 시작은 별도 `/dispatch/uploads` route로 분리한다.

### 목록 컬럼

1차 목록은 아래 정도로 충분하다.

1. `company`
2. `fleet`
3. `dispatch_date`
4. `예상 물량`
5. `dispatch_unit 요약 수`
6. `특근/휴무 예외 수`
7. `용차 기사 투입 수`

## 2. 배차 보드 상세

### 화면 역할

`/dispatch/boards/:fleetRef/:dispatchDate`는 실제 운영 보드다.

이 화면은 아래를 같은 문맥 안에서 다룬다.

1. 날짜 기준 `dispatch_unit` 목록
2. `vehicle`, `driver` 조건 요약
3. 배차 CRUD 액션
4. 배차 계획이 있는 경우의 배차표 업로드 preview/confirm
5. 용차 기사 추가/삭제
6. 날짜별 `휴무`, `특근` 예외 입력
7. 정산 입력용 snapshot bootstrap과 handoff
8. 차량-배송원 관리 화면으로의 이동

### 용차 기사 최소 저장

1. `용차 기사`는 보드 임시 상태가 아니라 `dispatch_plan` 문맥에 저장된 최소 엔티티여야 한다.
2. 보드 상세에서 생성/수정/아카이브한다.
3. `용차 기사`는 물리 삭제하지 않는다.
4. `dispatch_assignment`는 내부 `driver` 대신 `용차 기사`를 참조할 수 있어야 한다.

### row 기준

1. row는 `dispatch_unit` 기준이다.
2. 각 row는 해당 날짜에 유효한 `vehicle + driver` 결합체를 같이 보여준다.
3. 사용자는 차량 정보와 배송원 정보를 한 번에 읽을 수 있어야 한다.

배차 계획이 없는 경우에도 이 화면은 오류 없이 열려야 한다.

- `dispatch_plan` 데이터가 없더라도 상세는 빈 보드 상태와 안내 문구를 보여준다.
- 업로드는 별도 `/dispatch/uploads` route에서 먼저 시작할 수 있다.

### 액션 원칙

이 화면에서 1차에 허용하는 액션은 아래다.

1. `dispatch_plan`, `vehicle_schedule`, `dispatch_assignment` 기준 CRUD
2. 배차 계획 연동 문맥의 upload batch preview/confirm
3. 용차 기사 추가/수정/아카이브
4. 회사별 근무 규칙 생성
5. 특정 날짜의 `휴무`, `특근` 예외 입력/해제
6. delivery-record snapshot bootstrap
7. 관련 차량/배송원/정산 입력 화면으로 deep link 이동

### 쓰기 ownership

1. 이 화면은 운영 보드 owner다.
2. 하지만 정본 자체를 새로 소유하지는 않는다.
3. 즉 배차 보드 액션은 truth write를 직접 소유하는 서비스로 분해되어야 한다.
4. `service-dispatch-operations-view`를 write owner처럼 취급하면 안 된다.

## 3. 예상 물량 입력/수정

### 화면 역할

`/dispatch/plans/:dispatchPlanRef/edit`는 `dispatch_plan`의 `예상 물량` 입력/수정 전용 화면이다.

이 화면의 역할은 아래처럼 고정한다.

1. 원청 예상 물량 입력
2. 전날까지 수정 가능한 값 관리
3. `fleet + dispatch_date` 계획 정본 수정

### 규칙

1. 예상 물량은 `dispatch_plan`의 일부다.
2. 배차 보드 상세에서 인라인으로 길게 펼치지 않는다.
3. 수정은 별도 라우트에서 1열 폼으로 처리한다.
4. 1차에선 `planned_volume` 단일 값으로 유지한다.

## 4. 배차표 업로드

### 화면 역할

`/dispatch/uploads`는 phase 1 MVP에서 배차 계획과 분리된 업로드 시작점이다.

이 화면은 아래를 소유한다.

1. `company`, `fleet`, `dispatch_date` 선택
2. 엑셀 업로드 preview/confirm
3. 확정된 upload batch 목록 확인
4. upload batch 기준 정산 입력 snapshot bootstrap
5. `정산 입력`으로 handoff

### 규칙

1. `dispatch_plan`은 선택값이 아니라 optional future linkage다.
2. 업로드 배치는 `company + fleet + dispatch_date` scope를 직접 가진다.
3. phase 1에서는 업로드만으로 단순 정산 시작이 가능해야 한다.
4. 향후 phase에서는 동일 scope의 `dispatch_plan`과 upload batch를 연결할 수 있어야 한다.

## 용차 기사 규칙

1. `용차 기사`는 `driver` detail 화면의 소유 리소스가 아니다.
2. `배차 보드 상세`에서만 추가/수정/아카이브한다.
3. `driver` 정본, 계정, 앱과 연결하지 않는다.

## 날짜별 근무 예외 규칙

1. `휴무`, `특근`은 날짜 예외다.
2. `driver` 일반 스케줄 정본을 수정하지 않는다.
3. `배차 보드 상세`에서만 입력한다.
4. 영향 범위는 `배차 + 정산`까지만 본다.
5. 일반적으로 쉬는 날은 별도 예외 row 없이 `미표기`로 처리한다.
6. 회사 관리자는 자기 회사의 근무 규칙명을 만들 수 있지만, 각 규칙은 시스템 의미 `출근`, `휴무`, `특근` 중 하나에 매핑되어야 한다.
7. `한 배송원 + 한 날짜`에는 예외를 하나만 둔다.
8. 예외 입력 대상은 해당 날짜에 계획된 내부 배송원만이다.

## 권한 해석

1. `system_admin`, `company_super_admin`는 배차 화면 전체를 운영할 수 있다.
2. `fleet_manager`와 `settlement_manager`는 1차에서 배차 화면 write scope를 가진다.

## 비스코프

이번 문서는 아래를 아직 고정하지 않는다.

1. operator 전용 배차 read 화면
2. 배차 보드 세부 카드/표 셀 디자인
3. 외부 배송인력풀의 독립 정본 설계
4. 배차 후 실적/정산 엔진 세부 규칙

## 연결 문서

- [10-front-ui-rules.md](10-front-ui-rules.md)
- [13-admin-vehicle-and-assignment-pages.md](13-admin-vehicle-and-assignment-pages.md)
- [14-settlement-upload-first-ux-flow.md](14-settlement-upload-first-ux-flow.md)
- [../decisions/specs/2026-04-05-dispatch-admin-board-design.md](../decisions/specs/2026-04-05-dispatch-admin-board-design.md)
