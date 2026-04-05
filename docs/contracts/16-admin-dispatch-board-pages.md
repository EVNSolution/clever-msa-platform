# 16. Admin Dispatch Board Pages

## 문서 목적

이 문서는 `front-admin-console`의 배차 1차 화면 구조를 current truth 기준으로 고정한다.

이번 문서는 아래를 먼저 결정한다.

1. 배차 화면의 상위 컨텍스트
2. `dispatch_unit board`를 어떤 화면 구조로 다루는가
3. `예상 물량`, `용차 기사`, `날짜별 근무 예외`를 어디에서 다루는가
4. admin web에서 어느 화면이 write owner처럼 행동하는가

## 적용 범위

- `front-admin-console`
- `service-dispatch-registry`
- `service-dispatch-operations-view`
- `service-vehicle-assignment`
- `service-vehicle-registry`
- `service-driver-profile`

## 기본 원칙

1. 배차 1차는 `front-admin-console`만 대상으로 한다.
2. 배차 상위 컨텍스트는 `company + fleet + dispatch_date`다.
3. 화면의 핵심 row는 `vehicle` 단독이 아니라 날짜 기준 `dispatch_unit`이다.
4. `dispatch_unit board`는 정본 페이지가 아니라 운영 보드다.
5. 정본은 계속 `dispatch_plan`, `vehicle_schedule`, `dispatch_assignment`에 남는다.
6. `용차 기사`와 `날짜별 근무 예외`는 운영 입력으로만 다룬다.

## 페이지 구조

배차 1차의 admin 페이지는 아래 세 개로 고정한다.

1. `배차 보드 목록`
2. `배차 보드 상세`
3. `예상 물량 입력/수정`

기본 진입은 아래로 고정한다.

- `/dispatch` -> `/dispatch/boards`

## 라우트 기준

1. `/dispatch/boards`
2. `/dispatch/boards/:dispatchPlanRef`
3. `/dispatch/plans/:dispatchPlanRef/edit`

`dispatchPlanRef`는 `fleet + dispatch_date` 문맥을 대표하는 browser route key다.

## 1. 배차 보드 목록

### 화면 역할

`/dispatch/boards`는 아래 역할만 가진다.

1. `company`, `fleet`, `dispatch_date` 기준 목록을 보여준다.
2. 각 row는 하나의 `dispatch_plan` 문맥을 대표한다.
3. row click으로 `배차 보드 상세`에 이동한다.
4. 예상 물량 수정은 `예상 물량 입력/수정` 화면으로만 진입한다.

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

`/dispatch/boards/:dispatchPlanRef`는 실제 운영 보드다.

이 화면은 아래를 같은 문맥 안에서 다룬다.

1. 날짜 기준 `dispatch_unit` 목록
2. `vehicle`, `driver` 조건 요약
3. 배차 CRUD 액션
4. 용차 기사 추가/삭제
5. 날짜별 `휴무`, `특근` 예외 입력
6. 차량-배송원 관리 화면으로의 이동

### 용차 기사 최소 저장

1. `용차 기사`는 보드 임시 상태가 아니라 `dispatch_plan` 문맥에 저장된 최소 엔티티여야 한다.
2. 보드 상세에서 생성/삭제한다.
3. 이미 `dispatch_assignment`가 참조하는 `용차 기사`는 삭제하지 않는다.
4. `dispatch_assignment`는 내부 `driver` 대신 `용차 기사`를 참조할 수 있어야 한다.

### row 기준

1. row는 `dispatch_unit` 기준이다.
2. 각 row는 해당 날짜에 유효한 `vehicle + driver` 결합체를 같이 보여준다.
3. 사용자는 차량 정보와 배송원 정보를 한 번에 읽을 수 있어야 한다.

### 액션 원칙

이 화면에서 1차에 허용하는 액션은 아래다.

1. `dispatch_plan`, `vehicle_schedule`, `dispatch_assignment` 기준 CRUD
2. 용차 기사 추가/삭제
3. 회사별 근무 규칙 생성
4. 특정 날짜의 `휴무`, `특근` 예외 입력/해제
5. 관련 차량/배송원 관리 화면으로 deep link 이동

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

## 용차 기사 규칙

1. `용차 기사`는 `driver` detail 화면의 소유 리소스가 아니다.
2. `배차 보드 상세`에서만 추가/수정/삭제한다.
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
9. 회사 관리자는 사용하지 않는 근무 규칙을 삭제할 수 있다.
10. 날짜 예외 입력의 규칙 선택지는 `휴무`, `특근`에 매핑된 규칙만 노출한다.
11. 회사 관리자는 근무 규칙 이름을 수정할 수 있다.
12. 같은 의미에 매핑된 회사 규칙은 이름이 다르면 여러 개 허용한다.

## 권한 해석

1. `system_admin`, `company_super_admin`는 배차 화면 전체를 운영할 수 있다.
2. `fleet_manager`는 1차에서 `settlement_manager`와 동일 scope로 본다.
3. 따라서 배차 화면의 1차 write 권한은 `settlement_manager`와 동일하게 해석할 수 있다.

## 비스코프

이번 문서는 아래를 아직 고정하지 않는다.

1. operator 전용 배차 read 화면
2. 배차 보드 세부 카드/표 셀 디자인
3. 외부 배송인력풀의 독립 정본 설계
4. 배차 후 실적/정산 엔진 세부 규칙

## 연결 문서

- [10-front-ui-rules.md](10-front-ui-rules.md)
- [13-admin-vehicle-and-assignment-pages.md](13-admin-vehicle-and-assignment-pages.md)
- [../decisions/specs/2026-04-05-dispatch-admin-board-design.md](../decisions/specs/2026-04-05-dispatch-admin-board-design.md)
