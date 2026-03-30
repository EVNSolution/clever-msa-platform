# 06. ID and State Dictionary

## 문서 목적

이 문서는 서비스 분리 전에 외부 식별자와 상태 이름을 먼저 고정하기 위한 공통 규칙 문서다.

MSA에서는 같은 대상을 여러 서비스가 참조하므로, 이 문서가 흔들리면 이후 설계 문서 전체가 흔들린다.

## 식별자 원칙

1. 외부 식별자는 불변이어야 한다.
2. 서비스 간 참조에는 내부 PK 대신 외부 식별자를 사용한다.
3. API payload, 로그, 이벤트, 프로젝션은 같은 외부 식별자를 사용한다.
4. 재사용 가능한 번호 체계를 만들지 않는다.

## 브라우저 라우트 공개 키 원칙

1. 브라우저 URL path segment에는 `account_id`, `company_id`, `fleet_id` 같은 원본 식별자를 직접 노출하지 않는다.
2. 브라우저 라우트에는 서비스별 `public_ref`를 사용한다.
3. `public_ref`는 브라우저 라우트 전용 공개 키다.
4. `public_ref`는 불변이어야 한다.
5. `public_ref`는 정산, 이벤트, 로그, 서비스 간 참조 식별자로 사용하지 않는다.
6. 서비스 간 참조와 도메인 정본 식별자는 계속 `account_id`, `company_id`, `fleet_id` 같은 외부 식별자를 사용한다.

### 브라우저 라우트 공개 키 범위

| 공개 키 | 소유 서비스 | 용도 |
|---|---|---|
| account.public_ref | Identity Access | 관리자/운영 UI 라우트 |
| company.public_ref | Organization Master | 관리자/운영 UI 라우트 |
| fleet.public_ref | Organization Master | 관리자/운영 UI 라우트 |

## 핵심 외부 식별자

| 식별자 | 소유 서비스 | 의미 |
|---|---|---|
| account_id | Identity Access | 로그인 주체 식별자 |
| company_id | Organization Master | 회사 식별자 |
| fleet_id | Organization Master | 플릿 식별자 |
| org_unit_id | Organization Master | 조직 단위 식별자, repo-wide target identifier, current trimmed bootstrap 미사용 |
| driver_id | Driver Profile HR | 배송원 식별자 |
| vehicle_master.vehicle_id | Vehicle Asset | 차량 마스터 식별자 |
| vehicle_operator_access.vehicle_operator_access_id | Vehicle Asset | 운영사 접근 관계 식별자 |
| driver_vehicle_assignment.driver_vehicle_assignment_id | Driver Vehicle Assignment | 기사-차량 배정 식별자 |
| terminal_id | Terminal Ops | 터미널 식별자 |
| device_id | Terminal Ops | 단말 또는 디바이스 식별자 |
| delivery_order_id | Delivery Execution | 배송 오더 식별자 |
| settlement_run_id | Settlement Payroll | 정산 실행 식별자 |
| settlement_item_id | Settlement Payroll | 정산 결과 항목 식별자 |
| approval_request_id | Approval Workflow | 결재 요청 식별자 |

## Scoped Domain IDs

- `account_id`: 인증 주체 식별자
- `driver_id`: 배송원 업무 주체 식별자
- `company_id`: 회사 정본 식별자
- `fleet_id`: 플릿 정본 식별자
- `org_unit_id`: 조직 단위 식별자, repo-wide target identifier, current trimmed bootstrap 미사용
- `vehicle_master.vehicle_id`: 차량 마스터 정본 식별자
- `vehicle_operator_access.vehicle_operator_access_id`: 운영사 접근 관계 식별자
- `driver_vehicle_assignment.driver_vehicle_assignment_id`: 기사-차량 배정 정본 식별자
- `settlement_run_id`: 정산 실행 단위 식별자
- `settlement_item_id`: 정산 결과 항목 식별자

## Scoped Separation Rules

1. `account_id` != `driver_id`
2. `settlement_item_id`는 사람 식별자로 사용 금지
3. `company_id`, `fleet_id`, `org_unit_id`는 Organization Master만 정본이다. 다만 `org_unit_id`는 current trimmed bootstrap에서는 사용하지 않고 repo-wide target identifier로만 남긴다.

## 참조 규칙

### Driver Profile HR

- driver_id를 소유한다.
- company_id와 fleet_id, org_unit_id는 참조만 가진다.
- account_id는 링크로 연결되며 정본은 Identity Access가 가진다.

### Vehicle Asset

- vehicle_id를 소유한다.
- company_id와 fleet_id는 참조만 가진다.
- terminal_id, device_id, driver assignment는 Vehicle Asset의 정본 범위가 아니다. 이 값들은 후속 운영 도메인에서 다룬다.

### Terminal Ops

- terminal_id와 device_id를 소유한다.
- vehicle_id는 참조만 가진다.

### Driver Vehicle Assignment

- driver_vehicle_assignment_id를 소유한다.
- driver_id, vehicle_id, company_id, fleet_id는 참조만 가진다.

### Settlement Payroll

- settlement_run_id와 settlement_item_id를 소유한다.
- driver_id, company_id, fleet_id, delivery_order_id는 참조만 가진다.

## 상태 원칙

1. 같은 단어라도 의미가 다르면 다른 상태로 본다.
2. Account의 활성과 Driver의 재직은 같은 뜻이 아니다.
3. Vehicle의 사용 가능과 Terminal의 사용 가능도 분리한다.
4. 상태는 도메인별로 작게 유지한다.

## 상태 사전

### Account Status

- pending
- active
- locked
- inactive
- retired

의미

- 로그인과 자격 검증 관점의 상태다.

### Driver Employment Status

- onboarding
- active
- leave
- resigned
- retired

의미

- 배송원 인사와 재직 관점의 상태다.

### Driver Qualification Status

- pending_review
- qualified
- restricted
- expired
- revoked

의미

- 배송원 자격, 면허, 필수 교육 충족 여부 관점의 상태다.
- 재직 상태나 오늘 업무 투입 가능 상태와 같은 뜻으로 쓰지 않는다.

### Driver Operational Status

- available
- assigned
- suspended
- blocked

의미

- 오늘 업무 투입 관점의 상태다.

### Vehicle Status

- active
- inactive
- retired

의미

- `vehicle_master.vehicle_status`의 상태다.
- 배차 가능 여부, 정비, 사고 대기는 별도 운영 도메인 상태로 분리한다.

### Terminal Status

- registered
- active
- inactive
- retired

의미

- 단말 등록과 활성 관점의 상태다.

### Vehicle Operator Access Status

- active
- suspended
- ended

의미

- `vehicle_operator_access.access_status`의 상태다.
- 운영사 접근의 유효성과 종료 관점을 분리한다.

### Driver Vehicle Assignment Status

- assigned
- unassigned

의미

- `driver_vehicle_assignment.assignment_status`의 상태다.
- 배송원-차량 배정 관점의 현재 연결 여부만 표현한다.

### Delivery Status

- planned
- in_progress
- completed
- exception
- cancelled

의미

- 배송 수행 상태다.

### Settlement Status

- draft
- calculated
- reviewed
- approved
- paid
- closed

의미

- 정산 결과 확정과 지급 진행 상태다.

### Approval Status

- requested
- in_review
- approved
- rejected
- cancelled

의미

- 결재 요청의 진행 상태다.

## 바로 정리해야 할 혼동

1. account active 와 driver active 를 같은 값으로 쓰지 않는다.
2. `vehicle_status`와 `assignment_status`를 같은 값으로 쓰지 않는다.
3. retired 는 서비스마다 의미가 다를 수 있으므로 문맥을 항상 붙인다.
4. company 와 fleet 는 마스터 정본이고, driver 와 vehicle 은 소속 참조만 가진다.
5. 브라우저 URL의 `public_ref`와 서비스 정본 식별자 `*_id`를 같은 값으로 취급하지 않는다.

## 연결 문서

- `03-roadmap.md`
- `04-driver-360-read-model.md`
- `05-vehicle-ops-read-model.md`
