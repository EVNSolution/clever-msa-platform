# Dispatch Operations View 디자인

## 목적

이 문서는 `service-dispatch-operations-view`의 1차 경계와 조회 계약을 고정하기 위한 설계 문서다.

이번 설계의 목표는 아래와 같다.

1. `service-dispatch-registry`의 계획 정본과 `service-vehicle-assignment`의 현재 배정 truth를 분리한 채 비교한다.
2. 차량과 배송원을 분리 비교하지 않고, 하나의 `배차 유닛`으로 본다.
3. 사람이 바로 읽을 수 있는 배차 상황판 row와 summary 계약만 정의한다.

## 스코프

이번 설계에 포함하는 범위는 아래와 같다.

1. `service-dispatch-operations-view`가 읽는 source 서비스
2. board row 계약
3. 상태 판정 규칙
4. summary 계약
5. 최소 API surface

## 비스코프

이번 설계에 일부러 포함하지 않는 것은 아래와 같다.

1. dispatch write API
2. dispatch truth 저장
3. terminal / telemetry 상태
4. 권역 / 목적지
5. 물량 상세 breakdown
6. detail 화면 전용 세부 계약
7. 승인 흐름
8. 실제 migration 절차 상세

## 선택된 접근

이번 설계에서 선택한 구조는 `Lean Operations Board`다.

읽는 source는 아래 네 서비스만 둔다.

- `service-dispatch-registry`
- `service-vehicle-assignment`
- `service-vehicle-registry`
- `service-driver-profile`

선택 이유는 아래와 같다.

1. 계획 정본과 현재 truth를 같이 보여 주는 read-model의 존재 이유가 분명하다.
2. 차량 번호와 배송원 이름까지 붙여 사람 친화적인 상황판을 만들 수 있다.
3. `terminal`, `telemetry`, `region`까지 너무 빨리 먹지 않고 1차 범위를 얇게 유지할 수 있다.
4. 차량과 배송원을 하나의 배차 유닛으로 보는 현재 운영 규칙에 맞는다.

## 서비스 경계

### 1. Dispatch Operations View

`service-dispatch-operations-view`는 읽기 전용 배차 상황판이다.

이 서비스가 답하는 질문:

1. 특정 날짜와 회차에 계획된 배차 유닛은 무엇인가
2. 특정 차량의 현재 실제 배정 유닛은 무엇인가
3. 계획 유닛과 현재 유닛이 같은가
4. 사람이 읽을 수 있는 차량 번호와 배송원 이름은 무엇인가

이 서비스가 답하지 않는 질문:

1. terminal이 무엇인가
2. telemetry 상태가 무엇인가
3. 권역과 목적지가 무엇인가
4. 실제 운행 로그가 무엇인가
5. 계획 정본을 어떻게 수정하는가

### 2. 배차 유닛 해석

이 서비스는 차량과 배송원을 따로 비교하지 않는다.

비교 단위는 아래 요소를 함께 가진 `배차 유닛`이다.

- `vehicle`
- `driver`
- `dispatch_date`
- `shift_slot`

운영 규칙은 아래와 같이 고정한다.

1. 차량이 바뀌면 배송원이 바뀐 것으로 본다.
2. 배송원이 바뀌면 차량이 바뀐 것으로 본다.
3. 따라서 mismatch를 차량/배송원으로 쪼개지 않고, 유닛 변경으로만 본다.
4. 현재 truth 비교는 `service-vehicle-assignment`의 한계 때문에 하루 단위 차량 기준으로 본다.

## 조회 source

### 1. service-dispatch-registry

아래 데이터를 읽는다.

- `dispatch_plan`
- `vehicle_schedule`
- `dispatch_assignment`

용도:

- 계획 배차 유닛 생성
- `dispatch_date`, `shift_slot`, planned driver 확보
- summary의 `planned_volume` 확보

### 2. service-vehicle-assignment

아래 데이터를 읽는다.

- 현재 활성 차량 배정 truth

용도:

- 특정 차량의 현재 실제 배송원 확인
- 계획 유닛과 현재 유닛 비교

### 3. service-vehicle-registry

아래 데이터를 읽는다.

- 차량 정본

용도:

- `plate_number` 확보

### 4. service-driver-profile

아래 데이터를 읽는다.

- 배송원 프로필 정본

용도:

- 계획 배송원 이름 확보
- 현재 배송원 이름 확보

## Row 생성 규칙

1. 기준 row는 `dispatch_assignment`다.
2. `vehicle_schedule`만 있고 계획 배정이 없는 빈 슬롯은 1차 board에 포함하지 않는다.
3. 각 planned row에 대해 `vehicle_id` 기준으로 현재 truth를 붙여 비교한다.
4. 계획이 전혀 없는데 현재 truth만 있는 차량은 synthetic row로 생성한다.
5. synthetic row의 `shift_slot`은 `null`이다.

## Board Row 계약

1차 board row는 아래 필드를 가진다.

- `dispatch_date`
- `shift_slot?`
- `vehicle_id`
- `plate_number`
- `planned_driver_id?`
- `planned_driver_name?`
- `current_driver_id?`
- `current_driver_name?`
- `dispatch_status`
- `warnings[]`

설명:

- `plate_number`는 `service-vehicle-registry`에서 읽는다.
- `planned_driver_name`, `current_driver_name`은 `service-driver-profile`에서 읽는다.
- `shift_slot`은 synthetic row일 때만 `null`이다.
- `warnings[]`는 상태를 대체하지 않고 lookup 실패나 source 이상을 보조 정보로만 담는다.

## 상태값

`dispatch_status`는 아래 네 개로 고정한다.

- `matched`
- `not_started`
- `dispatch_unit_changed`
- `unplanned_current`

의미는 아래와 같다.

### 1. matched

- planned row 있음
- current truth 있음
- 현재 배송원이 계획 배송원과 같음

### 2. not_started

- planned row 있음
- current truth 없음

### 3. dispatch_unit_changed

- planned row 있음
- current truth 있음
- 현재 배송원이 계획 배송원과 다름

설명:

- 차량과 배송원은 하나의 유닛이므로 세부 mismatch로 쪼개지 않는다.

### 4. unplanned_current

- planned row 없음
- current truth만 있음

## Warnings

1차 `warnings[]` 후보는 아래와 같다.

- `vehicle_lookup_failed`
- `planned_driver_lookup_failed`
- `current_driver_lookup_failed`
- `current_assignment_source_unavailable`

원칙:

1. warning은 상태를 대체하지 않는다.
2. warning은 source lookup 실패나 일시적 가용성 문제만 나타낸다.
3. business state는 항상 `dispatch_status`가 표현한다.

## Summary 계약

1차 summary는 아래 필드를 가진다.

- `dispatch_date`
- `fleet_id`
- `planned_volume`
- `planned_assignment_count`
- `matched_count`
- `not_started_count`
- `dispatch_unit_changed_count`
- `unplanned_current_count`

설명:

- `planned_volume`은 `dispatch_plan`에서 읽는다.
- 나머지 count는 board row 상태 집계로 계산한다.

## API Surface

1차 API는 아래와 같이 고정한다.

- `GET /api/dispatch-ops/health/`
- `GET /api/dispatch-ops/board/?dispatch_date=YYYY-MM-DD&fleet_id=<uuid>`
- `GET /api/dispatch-ops/summary/?dispatch_date=YYYY-MM-DD&fleet_id=<uuid>`

원칙:

1. detail endpoint는 1차에 만들지 않는다.
2. board와 summary만 제공한다.
3. 이 서비스는 read-model이며 write API를 노출하지 않는다.

## 기존 서비스와의 관계

관계는 아래와 같이 고정한다.

- `service-dispatch-registry`
  - 계획 정본
- `service-vehicle-assignment`
  - 현재 배정 truth
- `service-dispatch-operations-view`
  - 계획과 현재를 비교하는 상황판 read-model

즉 `service-dispatch-operations-view`는 계획을 저장하지도, 현재 배정을 저장하지도 않는다.
오직 두 정본을 읽어서 사람이 읽을 수 있는 배차 상황판을 만든다.
