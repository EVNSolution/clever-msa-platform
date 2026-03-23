# Vehicle Ownership And Assignment 디자인

## 목적

이 문서는 차량 축에서 `제조사`, `운영사`, `배송원 배정`, `터미널`, `위치`의 경계를 다시 고정하기 위한 설계 문서다.

기존 `Vehicle Asset 1차`는 차량을 얇은 자산 정본으로 두는 데는 유효했지만, 차량의 주인이 제조사인지 운영사인지, 운영사가 실제로 쓰는 것이 차량 정보인지 배정인지가 아직 충분히 분리되지 않았다.

이번 설계의 목표는 아래 세 가지다.

1. 차량 정본은 제조사 소유로 고정한다.
2. 운영사는 차량 정본의 주인이 아니라 `배송원 배정`의 주인으로 고정한다.
3. 터미널과 위치는 차량 자산 정본이 아니라 별도 축으로 분리한다.

## 스코프

이번 설계에 포함하는 범위는 아래와 같다.

1. `터미널`의 도메인 의미 정의
2. `제조사`와 `운영사`의 역할 분리
3. 차량 관련 정본/관계/행위 테이블 초안
4. 서비스 경계 재정의
5. 현재 bootstrap에 대한 실행 판단

## 비스코프

이번 설계에 일부러 포함하지 않는 것은 아래와 같다.

1. 실제 API 상세
2. 마이그레이션 절차 상세
3. UI 화면 상세
4. telemetry 수집 파이프라인 상세
5. terminal provisioning 상세
6. MQTT consumer 구현 상세
7. RabbitMQ 또는 기타 브로커 연계 구현 상세

## 핵심 해석

### 1. 터미널의 의미

`터미널`은 차량 실체가 아니라 차량 또는 배송원 운영에 연결되는 현장 단말 장치다.

도메인상 의미는 아래와 같다.

- on-board terminal
- handheld device
- telematics endpoint
- handover 대상 자산

따라서 터미널은 아래 정보를 가진다.

- `terminal_id`
- 하드웨어 식별자
- 단말 상태
- 펌웨어/통신 상태
- 인수인계 상태
- 현재 연결 대상

반대로 아래 정보는 터미널의 책임이 아니다.

- 차량 실체 정본
- 차량번호/VIN
- 제조 스펙
- 차량 위치 스냅샷의 도메인 정본

즉 `터미널`은 `Vehicle Asset`이 아니라 이후 `Terminal Ops`에서 다뤄야 한다.
터미널이 위치 원천을 보내는 입력원이 될 수는 있지만, 위치 데이터의 소유 경계 자체를 가지지는 않는다.

### 2. 제조사와 운영사의 역할

이번 설계는 아래를 고정한다.

- 제조사는 차량 정본의 주인이다.
- 운영사는 차량 정본의 주인이 아니다.
- 운영사는 차량 정보와 차량 위치를 조회만 한다.
- 운영사가 쓰는 것은 자기 배송원을 차량에 배정하는 행위뿐이다.

### 3. 차량번호

`plate_number`는 제조사 정본으로 고정한다.

의미는 아래와 같다.

- 제조사가 차량번호를 발급한다.
- 운영사는 그 값을 전달받아 읽기만 한다.
- 운영사는 `plate_number`를 수정하지 않는다.

## 선택된 접근

이번 설계에서 선택한 구조는 `단일 vehicle 테이블`이나 `vehicle + operation overlay`가 아니라 아래 구조다.

- `vehicle_master`
- `vehicle_operator_access`
- `driver_vehicle_assignment`
- `vehicle_location_snapshot`

이 구조를 고른 이유는 아래와 같다.

1. 차량 정본과 운영 관계를 분리할 수 있다.
2. 운영사가 차량의 주인처럼 보이지 않게 할 수 있다.
3. 배송원 배정을 차량 속성이 아니라 독립 행위로 유지할 수 있다.
4. 터미널과 위치를 자산 정본에 끌어오지 않을 수 있다.

## 서비스 경계

### 1. Vehicle Asset

`Vehicle Asset`은 제조사 정본 서비스다.

소유 범위:

- `vehicle_master`
- `vehicle_operator_access`

이 서비스가 답하는 질문:

1. 이 차량은 어떤 차량인가
2. 제조사는 누구인가
3. 어느 운영사가 이 차량을 운영할 수 있는가
4. 제조사 기준 자산 상태가 무엇인가

이 서비스가 답하지 않는 질문:

1. 현재 어떤 배송원이 배정되어 있는가
2. 현재 차량 위치가 어디인가
3. 어떤 터미널이 연결되어 있는가

`vehicle_operator_access`의 생성/변경/종료 권한은 제조사 측 운영 관리자에게 있다.
즉 이 관계는 운영사가 스스로 만드는 것이 아니라, 제조사 정본 축에서 허용하는 운영 범위를 표현한다.

### 2. Driver Vehicle Assignment

`Driver Vehicle Assignment`는 운영사가 배송원을 차량에 붙이는 행위의 정본 서비스다.

소유 범위:

- `driver_vehicle_assignment`

이 서비스가 답하는 질문:

1. 현재 어느 배송원이 어느 차량에 배정되어 있는가
2. 배정이 언제 시작/종료됐는가
3. 운영사가 자기 권한 범위 안에서 배정했는가

레거시 해석 메모:

- 현재 `ev-dashboard-server`의 `DriverVehicleMatch`는 이 축의 직접 근거다.
- 현재 `HandoverRecord`와 `TerminalUserChangeLog`도 단말 자산 관리라기보다 기사-차량 배정/반납 워크플로에 가깝다.
- 따라서 후속 분리에서는 `handover`를 `Terminal Ops`가 아니라 이 축의 보조 워크플로 엔티티로 재배치하는 방향이 더 자연스럽다.

### 3. Telemetry

`Telemetry`는 차량 위치 스냅샷의 정본 축이다.

소유 범위:

- `vehicle_location_snapshot`

운영사는 이 축을 읽기만 한다.

설계 메모:

- 현재 문서에서 `vehicle_location_snapshot`은 읽기 모델 관점의 위치 스냅샷 정본만 정의한다.
- 터미널 또는 MQTT는 위치 입력의 source가 될 수 있지만, 위치 스냅샷의 도메인 소유 경계는 `Telemetry`에 둔다.
- 위치 원천 데이터는 추후 MQTT 수신값을 기준으로 적재하는 방향을 전제로 둔다.
- 다만 이번 단계에서는 MQTT consumer, broker, RabbitMQ bridge 같은 메시징 구현을 설계/구현 범위에 넣지 않는다.

### 4. Terminal Ops

`Terminal Ops`는 단말/터미널 레지스트리의 정본 축이다.

이번 설계에서는 의미만 고정하고 구현은 후속으로 둔다.

### 5. Vehicle Ops

`Vehicle Ops`는 읽기 모델이다.

읽는 원천:

- `Vehicle Asset`
- `Driver Vehicle Assignment`
- `Telemetry`
- 이후 필요 시 `Terminal Ops`

`Vehicle Ops`는 어떤 데이터도 정본으로 쓰지 않는다.

## 테이블 초안

### 1. company

`company`는 이 문서가 소유하는 로컬 테이블이 아니라, 기존 `Organization Master`의 외부 참조 정본이다.

이 문서에서 사용하는 회사 관련 컬럼은 모두 아래 외부 참조를 따른다.

- `company_id`
- `name`
- `company_type?`

즉 제조사/운영사는 별도 로컬 테이블이 아니라 `Organization Master`의 `company_id`를 역할별로 참조한다.

### 2. vehicle_master

- `vehicle_id`
- `manufacturer_company_id`
- `plate_number`
- `vin`
- `manufacturer_vehicle_code?`
- `model_name`
- `vehicle_status`
- `created_at`
- `updated_at`

설명:

- 제조사 정본
- `plate_number`, `vin` 모두 제조사 쓰기 권한

### 3. vehicle_operator_access

- `vehicle_operator_access_id`
- `vehicle_id`
- `operator_company_id`
- `access_status`
- `started_at`
- `ended_at?`
- `created_at`
- `updated_at`

설명:

- 이 운영사가 이 차량을 운영 가능한가를 표현하는 관계 테이블
- 운영사는 차량의 주인이 아니라 접근 권한 주체다

### 4. driver_vehicle_assignment

- `driver_vehicle_assignment_id`
- `vehicle_id`
- `operator_company_id`
- `driver_id`
- `assignment_status`
- `assigned_at`
- `unassigned_at?`
- `created_at`
- `updated_at`

설명:

- 운영사가 행사하는 실제 쓰기 행위의 정본
- 배정은 차량 속성이 아니라 독립 도메인 행위다

### 5. vehicle_location_snapshot

- `vehicle_id`
- `lat`
- `lng`
- `captured_at`

설명:

- 읽기용 최신 상태 또는 최신 스냅샷 정본
- 운영사는 읽기만
- 이번 단계에서 운영사 읽기 범위는 차량 위치와 최신 수집 시각 수준으로 제한한다

## 상태값

### vehicle_master.vehicle_status

- `active`
- `inactive`
- `retired`

의미:

- `active`: 제조사 기준 운영 가능한 차량
- `inactive`: 일시 비활성
- `retired`: 더 이상 사용하지 않음

### vehicle_operator_access.access_status

- `active`
- `suspended`
- `ended`

의미:

- `active`: 현재 이 운영사가 이 차량을 운영 가능
- `suspended`: 일시 중지
- `ended`: 운영 관계 종료

### driver_vehicle_assignment.assignment_status

- `assigned`
- `unassigned`

의미:

- `assigned`: 현재 배정 중
- `unassigned`: 배정 종료 기록

## 핵심 제약

1. 차량당 활성 운영사는 최대 1개다.
2. 차량당 활성 배송원 배정도 최대 1개다.
3. `driver_vehicle_assignment.operator_company_id`는 현재 활성 운영사와 같아야 한다.
4. `vehicle_status != active`면 신규 배정을 허용하지 않는다.
5. 운영사는 `vehicle_master`를 수정할 수 없다.
6. 운영사는 차량 위치를 수정할 수 없다.

## 권한 분리

### 제조사

수정 가능:

- `vehicle_master`
- 차량번호
- VIN
- 제조 스펙
- 자산 상태

조회 가능:

- 자기 차량 관련 운영 관계
- 위치 스냅샷

### 운영사

수정 가능:

- `driver_vehicle_assignment`

조회만 가능:

- `vehicle_master`
- `vehicle_operator_access`
- `vehicle_location_snapshot`

수정 금지:

- `plate_number`
- `vin`
- 제조 스펙
- 차량 정본 상태
- 위치 스냅샷 원천값

추가로 `vehicle_operator_access`의 lifecycle 권한은 운영사가 아니라 제조사 측 운영 관리자에게 있다.
운영사는 자신에게 부여된 활성 접근 범위 안에서만 `driver_vehicle_assignment`를 생성/종료할 수 있다.

## 금지 규칙

이번 설계에서 아래는 금지한다.

1. 운영사를 `vehicle_master`의 직접 소유 컬럼으로 승격하기
2. `current_driver_id`를 차량 정본 컬럼으로 두기
3. 차량 위치를 배정 도메인에서 수정하기
4. 터미널을 차량 자산 정본에 흡수하기
5. 배송원 배정을 `Vehicle Ops`에서 직접 쓰기

## 현재 bootstrap에 대한 판단

### 결론

현재 구현돼 있는 `Vehicle Asset 1차 bootstrap`은 그대로 두고, 이번 설계는 `다음 phase의 구조 개편 spec`로 취급하는 것이 맞다.

### 이유

1. 현재 bootstrap은 이미 `Vehicle Ops Phase 1`까지 동작하고 있다.
2. 이번 설계는 `Vehicle` 단일 정본 가정을 깨고 `vehicle_master + vehicle_operator_access + driver_vehicle_assignment`로 재구성한다.
3. 이 변경은 `vehicle-asset`, `vehicle-ops`, `front/admin-front`, seed, gateway 문서까지 연쇄적으로 바꾼다.
4. 따라서 기존 구현 위에 즉시 덮어쓰는 것보다 별도 implementation plan으로 내리는 편이 안전하다.

### 지금 바로 바꾸지 않을 것

1. 현재 `vehicle-asset` bootstrap CRUD
2. 현재 `Vehicle Ops Phase 1` runtime
3. 현재 seed/gateway wiring

### 다음 phase에서 바꿀 것

1. `Vehicle Asset`를 `vehicle_master + vehicle_operator_access` 구조로 재정의
2. `Driver Vehicle Assignment` 별도 서비스 설계/구현
3. `Telemetry` 최소 snapshot 설계
4. 그 위에 `Vehicle Ops Phase 2` 확장

## 권장 다음 순서

1. 이 설계를 차량 축 정본 spec로 승인한다.
2. `Vehicle Asset Refactor + Driver Vehicle Assignment` implementation plan을 별도 작성한다.
3. 그 plan에서 현재 bootstrap에서 무엇을 유지/폐기/이관할지 명시한다.

## 연결 문서

- `docs/superpowers/specs/2026-03-20-vehicle-asset-design.md`
- `docs/superpowers/specs/2026-03-20-vehicle-ops-phase-1-design.md`
- `goal/02-target-service-structure-and-join-risk-map.md`
- `reference/05-ev-dashboard-server-domain-extraction-notes.md`
