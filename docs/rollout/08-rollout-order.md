# 08. Rollout Order

## 문서 목적

이 문서는 목표 MSA 구조를 실제 분리 순서로 바꾸는 계획 문서다.

논리 서비스가 정리되어도 물리 분리 순서가 잘못되면 조회 결합과 운영 비용이 급격히 커지므로, 분리 순서와 선행 조건을 같이 고정한다.

## 기본 원칙

1. 읽기 모델 없이 물리 분리를 먼저 하지 않는다.
2. 중복 API 정리 없이 서비스 분리를 먼저 하지 않는다.
3. 외부 식별자와 상태 사전 없이 이벤트 설계를 먼저 하지 않는다.

## Scoped Master Plan Note

`Account / Driver / Settlement / Organization Master` 스코프에서는 아래 순서를 **경계 정의 순서**의 기본으로 본다. 이 노트는 아래에 정의된 repo-wide rollout order를 대체하지 않는다.

1. Organization Master 경계 고정
2. Account / Auth 경계 고정
3. Driver Profile HR 경계 고정
4. Settlement Payroll 경계 고정
5. Compose 시뮬레이션으로 경계 확인

## 분리 단계

이 문서의 차량 축 롤아웃 순서는 아래 다섯 단계로 고정한다.

1. `Vehicle Asset` refactor
2. `Driver Vehicle Assignment`
3. `Vehicle Ops` refactor
4. `Terminal Ops`
5. `Telemetry Hub`

### 1. Vehicle Asset refactor

목표

- 차량 정본을 `vehicle_master`와 `vehicle_operator_access`로 분리한다.

완료 조건

- `vehicle_master.vehicle_id`와 `vehicle_operator_access.vehicle_operator_access_id` 규칙 확정
- `vehicle_status`와 `access_status` 사전 확정
- `vehicle-asset` read/write contract를 새로운 정본 구조로 재정의

### 2. Driver Vehicle Assignment

목표

- 기사-차량 배정을 차량 정본에서 분리한다.

완료 조건

- `driver_vehicle_assignment.driver_vehicle_assignment_id` 규칙 확정
- `assignment_status` 사전 확정
- `handover`와 `Driver Vehicle Assignment` 책임 분리

### 3. Vehicle Ops refactor

목표

- `Vehicle Ops` 읽기 계약을 `Vehicle Asset + Driver Vehicle Assignment + Telemetry Hub` 기준으로 고정한다.

완료 조건

- `Vehicle Ops` summary contract 확정
- `front`는 `Vehicle Ops` contract만 사용하고 source fan-out을 하지 않음
- `Telemetry Hub`만 post-refactor target source로 필요하다
- `Terminal Ops`는 later phase source로 남기고, 다음 step 계약의 필수 조건으로 삼지 않는다

### 4. Terminal Ops

목표

- 단말/디바이스 레지스트리를 later phase source로 분리한다.

완료 조건

- `terminal_id`, `device_id` 규칙 확정
- 단말 정본과 차량/배정 정본 책임 분리

### 5. Telemetry Hub

목표

- 위치, 진단, MQTT, raw truck data를 별도 읽기/수집 축으로 고정한다.

완료 조건

- `vehicle_location_snapshot` 또는 동등한 최신 snapshot 계약 확정
- telemetry source와 terminal registry 책임 분리

## 분리 중 금지 사항

1. 서비스 간 DB 직접 조인
2. 같은 상태명을 다른 의미로 재사용
3. 읽기 모델 없이 운영 화면을 서비스 fan-out으로만 구성
4. 레거시 경로를 정리하지 않은 상태에서 신규 경로를 중복 추가

## 연결 문서

- `03-roadmap.md`
- `04-driver-360-read-model.md`
- `05-vehicle-ops-read-model.md`
- `06-id-and-state-dictionary.md`
- `07-legacy-api-mapping.md`
