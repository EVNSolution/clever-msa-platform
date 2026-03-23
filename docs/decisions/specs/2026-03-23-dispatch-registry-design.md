# Dispatch Registry 디자인

## 목적

이 문서는 `service-dispatch-registry`의 1차 경계와 소유 데이터를 고정하기 위한 설계 문서다.

이번 설계의 목표는 아래와 같다.

1. 배차를 `현재 배정 truth`가 아니라 `계획 정본`으로 고정한다.
2. 배차 1차 범위를 차량과 배송원에 직접 붙는 계획 축으로 제한한다.
3. 권역, 목적지, leave, 휴무 예외, 월 근무일수 같은 바깥 입력원은 후속 단계로 미룬다.

## 스코프

이번 설계에 포함하는 범위는 아래와 같다.

1. `dispatch_plan`, `vehicle_schedule`, `dispatch_assignment`의 경계
2. 필드 계약
3. 상태값과 제약
4. 쓰기 권한
5. 최소 API surface
6. `service-vehicle-assignment`와의 관계

## 비스코프

이번 설계에 일부러 포함하지 않는 것은 아래와 같다.

1. 권역 / 목적지
2. 휴무 예외
3. `ShiftSchedule`
4. `LeaveRequest`
5. `MonthlyWorkDays`
6. 실제 실행 로그
7. terminal / telemetry 상태
8. dispatch read-model 상세
9. 실제 migration 절차 상세

## 선택된 접근

이번 설계에서 선택한 구조는 `Thin Dispatch Truth`다.

소유 범위는 아래 세 축만 둔다.

- `dispatch_plan`
- `vehicle_schedule`
- `dispatch_assignment`

선택 이유는 아래와 같다.

1. 배차 정본을 차량과 배송원에 직접 붙는 계획 축으로 제한할 수 있다.
2. legacy의 계획성 모델을 그대로 가져오지 않고, 현재 플랫폼 경계에 맞게 다시 자를 수 있다.
3. `service-vehicle-assignment`와 시간 축을 분리할 수 있다.
4. 권역, 휴무, 근무일수 같은 추가 입력원을 후속 단계로 자연스럽게 붙일 수 있다.

## 서비스 경계

### 1. Dispatch Registry

`service-dispatch-registry`는 계획 정본만 소유한다.

소유 데이터:

- `dispatch_plan`
- `vehicle_schedule`
- `dispatch_assignment`

이 서비스가 답하는 질문:

1. 특정 플릿의 특정 날짜 계획 물량은 얼마인가
2. 특정 차량은 특정 날짜와 회차에 계획 슬롯이 열려 있는가
3. 특정 차량 슬롯에 어떤 배송원이 계획상 배정돼 있는가
4. 이 계획 배정이 어떤 운영 문맥에서 잡혔는가

이 서비스가 답하지 않는 질문:

1. 현재 실제 배정은 무엇인가
2. 현재 차량 위치는 어디인가
3. 현재 terminal 상태가 무엇인가
4. 휴무 / leave / 월 근무일수가 무엇인가
5. 권역이나 목적지가 무엇인가

### 2. Vehicle Assignment 와의 관계

`service-dispatch-registry`는 `service-vehicle-assignment`를 대체하지 않는다.

관계는 아래와 같이 고정한다.

- `service-dispatch-registry`
  - 미래 또는 당일 계획 정본
- `service-vehicle-assignment`
  - 현재 시점 배정 정본

즉 같은 "배정"처럼 보이더라도 시간 축과 책임이 다르다.

## 테이블 초안

### 1. dispatch_plan

- `dispatch_plan_id`
- `company_id`
- `fleet_id`
- `dispatch_date`
- `planned_volume`
- `dispatch_status`
- `created_at`
- `updated_at`

설명:

- 특정 `fleet + dispatch_date`의 물량 계획 정본
- `company_id`, `fleet_id`는 외부 UUID 참조다

### 2. vehicle_schedule

- `vehicle_schedule_id`
- `vehicle_id`
- `fleet_id`
- `dispatch_date`
- `shift_slot`
- `schedule_status`
- `starts_at?`
- `ends_at?`
- `created_at`
- `updated_at`

설명:

- 특정 `vehicle + dispatch_date + shift_slot`의 차량 계획 슬롯
- `vehicle_id`, `fleet_id`는 외부 UUID 참조다
- 동일 차량이 같은 날짜에 여러 회차를 돌 수 있으므로 `shift_slot`은 필수다

### 3. dispatch_assignment

- `dispatch_assignment_id`
- `vehicle_schedule_id`
- `vehicle_id`
- `driver_id`
- `operator_company_id`
- `dispatch_date`
- `shift_slot`
- `assignment_status`
- `assigned_at`
- `unassigned_at?`
- `created_at`
- `updated_at`

설명:

- 특정 차량 슬롯에 특정 배송원을 계획상 붙이는 정본
- `vehicle_schedule_id`는 같은 서비스 내부 연결이다
- `vehicle_id`, `driver_id`, `operator_company_id`는 외부 UUID 참조다
- `operator_company_id`는 FK가 아니라 dispatch-context snapshot 컬럼이다

## 상태값

### 1. dispatch_plan.dispatch_status

- `draft`
- `published`
- `closed`

의미:

- `draft`: 작성 중
- `published`: 운영 노출 중이지만 수정 가능
- `closed`: 종료, 일반 변경 제한

### 2. vehicle_schedule.schedule_status

- `planned`
- `blocked`
- `closed`

의미:

- `planned`: 배차 가능한 차량 슬롯
- `blocked`: 계획상 사용 불가
- `closed`: 종료 슬롯

### 3. dispatch_assignment.assignment_status

- `assigned`
- `unassigned`

의미:

- `assigned`: 현재 계획상 배정됨
- `unassigned`: 계획 배정 해제 기록

## 제약

핵심 제약은 아래와 같다.

1. `dispatch_plan`은 `fleet_id + dispatch_date`당 1개
2. `vehicle_schedule`은 `vehicle_id + dispatch_date + shift_slot`당 1개
3. `dispatch_assignment`는 `vehicle_schedule_id`당 활성 `assigned` 1개
4. `dispatch_assignment.vehicle_id`는 연결된 `vehicle_schedule.vehicle_id`와 같아야 한다
5. `dispatch_assignment.dispatch_date`, `shift_slot`도 연결된 `vehicle_schedule`와 같아야 한다
6. `operator_company_id`는 생성 시점에 활성 `vehicle_operator_access`와 일치 검증한다
7. `schedule_status != planned`면 신규 계획 배정을 만들 수 없다

## 쓰기 권한

### 1. dispatch_plan

관리자 / 운영 계획 작성 주체가 수정한다.

- 생성 가능
- 수정 가능
- `closed` 전까지 수정 허용

### 2. vehicle_schedule

관리자 / 운영 계획 작성 주체가 수정한다.

- 차량 슬롯 생성 가능
- 차량 슬롯 차단 가능
- `closed` 전까지 수정 허용

### 3. dispatch_assignment

관리자 / 운영 계획 작성 주체가 수정한다.

- 차량 슬롯에 배송원 계획 배정 가능
- 재배정 가능
- 해제 가능
- `closed` 전까지 수정 허용

### 4. 일반 운영 사용자

일반 운영 사용자는 읽기만 가능하다.

이 서비스의 write는 운영 계획 작성자만 가진다.

## 금지 규칙

1. `service-dispatch-registry`가 `vehicle_master`를 수정하면 안 된다.
2. `service-dispatch-registry`가 `driver_profile`를 수정하면 안 된다.
3. `service-dispatch-registry`가 `vehicle_operator_access` 정본을 수정하면 안 된다.
4. `service-dispatch-registry`가 telemetry / terminal 상태를 저장하면 안 된다.
5. `service-dispatch-registry`가 leave / 휴무 / 월 근무일수를 1차에 먹으면 안 된다.
6. `service-dispatch-registry`가 current runtime assignment truth를 직접 소유하면 안 된다.

## API Surface

1차 최소 API는 아래와 같다.

- `GET /api/dispatch/health/`
- `GET /api/dispatch/plans/`
- `POST /api/dispatch/plans/`
- `GET /api/dispatch/plans/{dispatch_plan_id}/`
- `PATCH /api/dispatch/plans/{dispatch_plan_id}/`
- `GET /api/dispatch/vehicle-schedules/`
- `POST /api/dispatch/vehicle-schedules/`
- `GET /api/dispatch/vehicle-schedules/{vehicle_schedule_id}/`
- `PATCH /api/dispatch/vehicle-schedules/{vehicle_schedule_id}/`
- `GET /api/dispatch/assignments/`
- `POST /api/dispatch/assignments/`
- `GET /api/dispatch/assignments/{dispatch_assignment_id}/`
- `PATCH /api/dispatch/assignments/{dispatch_assignment_id}/`

## 완료 기준

1. 배차 1차 정본이 `dispatch_plan`, `vehicle_schedule`, `dispatch_assignment` 세 축으로 고정된다.
2. `operator_company_id`가 FK 없는 snapshot 컬럼이라는 의미가 고정된다.
3. `service-dispatch-registry`와 `service-vehicle-assignment`의 시간 축 차이가 명확해진다.
4. 권역, 목적지, 휴무, leave, 월 근무일수는 1차 범위 밖으로 남는다.
