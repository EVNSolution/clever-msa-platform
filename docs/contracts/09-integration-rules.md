# 09. Integration Rules

## 문서 목적

이 문서는 서비스 분리 이후에 서비스 간 호출, 이벤트, 프로젝션을 어떤 규칙으로 연결할지 정하는 공통 문서다.

목표는 서비스 간 DB 조인과 과도한 동기 호출을 막고, 읽기 모델과 요약 스냅샷을 일관된 방식으로 만들게 하는 것이다.

## 호출 원칙

### 1. 쓰기 명령은 정본 서비스로만 보낸다

- 상태를 바꾸는 요청은 그 상태의 정본 서비스만 처리한다.
- 다른 서비스는 직접 수정하지 않고 요청 또는 이벤트로 연결한다.

### 2. 쓰기 경로의 동기 의존은 최소화한다

- 쓰기 요청에서 동기 호출은 최대 한 단계만 허용한다.
- 그 이상 필요하면 이벤트 또는 비동기 후처리로 바꾼다.

### 3. 운영 화면은 프로젝션 우선이다

- Driver 360, Vehicle Ops, Dispatch Control, Settlement Review Board, Approval Inbox는 읽기 모델을 우선 사용한다.
- 화면 fan-out 호출은 디버그성 보조 조회로만 제한한다.

#### Vehicle Ops Bootstrap 예외

- 현재 런타임의 `Vehicle Ops Phase 1`은 `Vehicle Asset + Organization Master`만 읽는 bounded fan-out query service다.
- `front`는 source API를 직접 fan-out하지 않고 현재 `Vehicle Ops` contract만 사용한다.
- 이 current bootstrap contract는 현재 compose/runtime와 일치한다.

#### Vehicle Ops Current Topology

- 현재 런타임의 `Vehicle Ops`는 `Vehicle Registry + Vehicle Assignment + Terminal Registry + Telemetry Hub + Organization Registry`를 읽는다.
- `Telemetry Hub`와 `Terminal Registry`는 현재 contract의 immediate required source다.
- `front`는 source API를 직접 fan-out하지 않고 `Vehicle Ops` contract만 사용한다.
- `Vehicle Ops`는 read-only query service이고, source service 정본을 수정하지 않는다.

#### Driver 360 Bootstrap 예외

- 현재 로컬 bootstrap 1차의 `Driver 360`은 materialized projection이 아니라 bounded fan-out query service로 시작한다.
- 허용 fan-out 대상은 `Identity Access`, `Driver Profile HR`, `Organization Master`, `Settlement Payroll` 4개 정본 서비스로 제한한다.
- front는 source API를 직접 fan-out 호출하지 않고 `Driver 360` contract만 사용한다.
- 이 예외는 bootstrap 단계에만 허용하며, 이후 projection 저장소가 생기면 교체 대상이다.

## 이벤트 원칙

### 1. 이벤트는 상태 변경 사실만 전달한다

- 어떤 서비스가 무엇을 최종 변경했는지 전달한다.
- 이벤트가 다른 서비스의 정본을 덮어쓰게 만들지 않는다.

### 2. 이벤트에는 최소 식별자와 요약만 담는다

- 외부 식별자
- 변경된 핵심 상태
- 발생 시각
- 화면용 최소 요약

### 3. 이벤트 이름은 도메인 의미로 짓는다

예시

- AccountStatusChanged
- DriverProfileUpdated
- DriverFleetChanged
- DriverVehicleMatched
- VehicleStatusChanged
- TerminalHandoverCompleted
- DeliveryStatusChanged
- SettlementCalculated
- ApprovalRequested

## 프로젝션 원칙

### 1. 프로젝션은 조회 전용이다

- Driver 360과 Vehicle Ops는 읽기 전용 모델이다.
- 원본 데이터 수정은 항상 정본 서비스로 돌아간다.

### 2. 프로젝션은 외부 식별자로 조립한다

- driver_id
- vehicle_id
- company_id
- fleet_id
- account_id

### 3. Vehicle Ops contract

- 현재 `Vehicle Ops`는 `Vehicle Registry + Vehicle Assignment + Terminal Registry + Telemetry Hub + Organization Registry`를 읽는 contract다.
- `front`는 source service를 직접 fan-out하지 않는다.
- `current_terminal`과 `telemetry`는 read model summary에 포함되지만, 정본 수정은 각 source service로 돌아간다.

### 4. 스냅샷과 타임라인을 분리할 수 있다

- 현재 상태는 summary projection
- 시간 흐름은 timeline projection

## 요약 스냅샷 규칙

아래 서비스는 원본 전문 대신 요약 스냅샷을 받아야 한다.

### Approval Workflow

- 요청 원본 전체를 복사하지 않는다.
- 요청 제목, 대상 식별자, 핵심 상태, 요청자 정도만 스냅샷으로 가진다.

### Communication Support

- 전체 프로필이나 전체 결재 본문을 복사하지 않는다.
- 발송 대상과 메시지 렌더링에 필요한 최소 값만 가진다.

### Read Models

- 상세 정산 항목 전체나 원시 텔레메트리 전체를 복사하지 않는다.
- 화면에 필요한 최소 필드만 유지한다.

## 금지 규칙

1. 서비스 간 DB 직접 조인
2. 다른 서비스 테이블을 배치로 직접 업데이트
3. 화면 렌더링을 위해 다섯 개 이상 서비스를 실시간 fan-out 호출
4. 내부 PK를 외부 계약 식별자로 사용
5. 같은 상태명을 서로 다른 의미로 재사용

## 권장 흐름

### 계정 상태 변경

1. Identity Access가 상태 변경 처리
2. AccountStatusChanged 발행
3. Driver 360 등 프로젝션 갱신

### 기사 소속 변경

1. Driver Profile HR이 회사 또는 플릿 소속 변경 처리
2. DriverFleetChanged 발행
3. Driver 360, Settlement Projection, Dispatch Projection 갱신

### 차량 매칭 변경

이 흐름은 `Vehicle Ops` post-refactor target topology가 붙은 이후의 규칙이다.

1. Driver Vehicle Assignment가 기사-차량 매칭 처리
2. DriverVehicleMatched 또는 Unmatched 발행
3. Driver 360, Vehicle Ops, Dispatch Control 갱신

## 연결 문서

- `04-driver-360-read-model.md`
- `05-vehicle-ops-read-model.md`
- `06-id-and-state-dictionary.md`
- `08-rollout-order.md`
