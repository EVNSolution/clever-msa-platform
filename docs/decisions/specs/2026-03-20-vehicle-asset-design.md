# Vehicle Asset 디자인

## 목적

이 문서는 `Vehicle` 도메인을 `Vehicle Asset` 정본 서비스로 먼저 분리하기 위한 설계 문서다.

이번 단계의 목표는 레거시 `dashboard.Terminal`, `handover`, `schedule.DriverVehicleMatch`, `mqtt`에 퍼져 있는 차량 관련 책임을 그대로 옮기지 않고, 차량 실체의 정본만 별도 서비스로 고정하는 것이다.

즉 이번 설계는 `Vehicle Ops` 운영 화면을 만드는 문서가 아니라, 나중에 `Vehicle Ops`가 의존할 최소 자산 정본을 정의하는 문서다.

## 스코프

이번 설계에 포함하는 범위는 아래와 같다.

1. `Vehicle Asset` 서비스 경계 정의
2. `Vehicle` 단일 정본 모델 정의
3. 최소 필드와 상태 의미 정의
4. 최소 CRUD API surface 정의
5. `Organization Master`와의 참조 규칙 정의
6. 이후 `Vehicle Ops`와의 연결 원칙 정의

## 비스코프

이번 1차에서 일부러 포함하지 않는 것은 아래와 같다.

1. `Terminal Ops`
2. `Handover`
3. `Vehicle-Driver Match`
4. `Telemetry Hub`
5. 사고 이력
6. 정비 이력
7. 차량 비용과 정산 연결
8. 운영 화면용 fan-out 조합
9. `Vehicle Ops` read model

## 선택된 접근

사용자가 승인한 접근은 `Vehicle Asset`을 아주 얇은 자산 정본으로 시작하는 것이다.

이 접근의 의미는 아래와 같다.

- 차량 실체와 식별자, 소속, 자산 상태만 `Vehicle Asset`이 소유한다.
- 기사 배정, terminal 연결, handover, telemetry는 외부 서비스나 읽기 모델이 소유한다.
- 운영 화면에서 보이는 “지금 운행 중”, “handover 중”, “단말 이상” 같은 값은 `Vehicle Asset`의 상태로 끌어오지 않는다.

이 설계는 기존 `goal/05-vehicle-ops-read-model.md`의 넓은 운영 화면 요구와 분리해, 먼저 차량 정본만 고정하려는 결정이다.

## 서비스 경계

`Vehicle Asset`은 아래 질문에만 답한다.

1. 이 차량은 어떤 식별자를 가진 차량인가
2. 어느 회사에 속하는가
3. 어느 플릿에 속하는가
4. 자산 관점에서 현재 운영 풀에 포함된 차량인가

`Vehicle Asset`이 소유하지 않는 질문은 아래와 같다.

1. 현재 누가 배정되어 있는가
2. 어떤 terminal이나 device가 연결되어 있는가
3. handover가 진행 중인가
4. 최근 telemetry 상태가 정상인가
5. 정비/사고 이력이 있는가
6. 정산 대상 차량 비용이 얼마인가

즉 이 서비스는 “차량 자산 등록부”이며, “차량 운영 현황판”이 아니다.

## 소유 데이터

이번 1차의 `Vehicle` 정본 필드는 아래로 고정한다.

- `vehicle_id`
- `company_id`
- `fleet_id`
- `plate_number`
- `vin`
- `vehicle_status`

### 필드 의미

#### `vehicle_id`

- `Vehicle Asset`이 소유하는 외부 계약 식별자
- UUID 문자열
- 생성 후 불변

#### `company_id`

- 필수
- `Organization Master`를 가리키는 외부 식별자
- 서비스 간 FK는 만들지 않고 UUID 참조값으로만 저장

#### `fleet_id`

- 선택
- `Organization Master`를 가리키는 외부 식별자
- 차량이 아직 특정 플릿에 배치되지 않은 상태를 허용

#### `plate_number`

- 필수
- 운영자와 화면이 가장 자주 찾는 차량 식별자
- 유니크 제약을 둔다
- 관리성 변경은 허용하되 일반 상태 변경처럼 취급하지 않는다

#### `vin`

- 필수
- 차량 실체를 안정적으로 식별하는 값
- 유니크 제약을 둔다
- 관리성 변경은 허용하되 일반 상태 변경처럼 취급하지 않는다

#### `vehicle_status`

- 필수
- 자산 관점 상태만 표현한다
- 운영 화면의 배정/운행/handover 상태를 대신하지 않는다

## 상태 사전

이번 1차 `Vehicle Asset`의 상태는 아래 3개만 사용한다.

- `active`
- `inactive`
- `retired`

### 의미

#### `active`

- 자산 기준으로 현재 운영 풀에 포함된 차량

#### `inactive`

- 자산 기준으로 일시적으로 운영 풀에서 제외한 차량

#### `retired`

- 더 이상 운영 대상으로 보지 않는 차량

### 금지 해석

아래 값들은 `vehicle_status`로 표현하지 않는다.

- 현재 배정 중
- 현재 운행 중
- handover 중
- 단말 이상
- telemetry 이상
- 정비 예약 중
- 사고 처리 중

이 값들은 이후 `Terminal Ops`, `Driver Vehicle Assignment`, `Telemetry`, `Vehicle Ops` 읽기 모델에서 별도 의미로 다룬다.

## 참조 규칙

서비스 간 관계는 FK로 만들지 않는다.

`Vehicle Asset`의 참조 규칙은 아래와 같다.

1. `company_id`는 필수 외부 참조
2. `fleet_id`는 선택 외부 참조
3. `current_driver_id`는 저장하지 않는다
4. `terminal_id`는 저장하지 않는다
5. 다른 서비스의 상태 요약 컬럼을 미리 캐시하지 않는다

나중에 연결이 필요하면 아래 방식만 허용한다.

1. 읽기 모델에서 조합
2. 별도 소비자 서비스에서 fan-out 조회
3. 정말 필요할 경우 UUID 참조값 추가

하지만 그 경우에도 서비스 간 FK는 금지한다.

## API Surface

이번 1차는 최소 CRUD API만 둔다.

- `GET /api/vehicles/health/`
- `GET /api/vehicles/`
- `POST /api/vehicles/`
- `GET /api/vehicles/{vehicle_id}/`
- `PATCH /api/vehicles/{vehicle_id}/`
- `DELETE /api/vehicles/{vehicle_id}/`
- `GET /api/vehicles/check-plate-number/?plate_number=...`

### 권한 원칙

- `admin`: 생성/수정/삭제 가능
- `user`: 조회 가능
- 차량 권한 세분화는 이번 단계에서 제외

### 검증 원칙

- `company_id` 필수
- `fleet_id`는 nullable
- `plate_number` 유니크
- `vin` 유니크
- `vehicle_status`는 `active`, `inactive`, `retired`만 허용

## 금지 규칙

아래 값은 이번 1차 `Vehicle Asset`에 넣지 않는다.

- `current_driver_id`
- `terminal_id`
- `device_id`
- `handover_status`
- `telemetry_health_status`
- `maintenance_flag`
- `accident_flag`
- `issue_flag`

또한 아래 행위도 금지한다.

1. 다른 서비스 DB FK 생성
2. 다른 서비스 상태 판단 로직 포함
3. 운영 화면 편의값을 정본 컬럼으로 승격
4. legacy `dashboard.Terminal` 구조를 그대로 복제

## Vehicle Ops와의 관계

`Vehicle Ops`는 이후 단계의 소비자 읽기 모델이다.

역할 분리는 아래처럼 유지한다.

- `Vehicle Asset`: 차량 실체 정본
- `Vehicle Ops`: 차량 운영 화면용 summary/timeline projection
- `Terminal Ops`: terminal registry 정본
- `Driver Vehicle Assignment`: 현재 기사-차량 연결과 배정/반납 workflow 정본
- `Telemetry`: 진단과 수집 상태 정본

즉 `Vehicle Ops`는 여러 정본을 읽어 조합하지만, `Vehicle Asset`은 그 조합 결과를 역으로 품지 않는다.

## 로컬 부트스트랩 구현 범위

이번 설계를 구현으로 내릴 때의 최소 범위는 아래다.

1. 독립 Django/DRF 프로젝트 `services/vehicle-asset`
2. 독립 Postgres DB
3. `Vehicle` 모델 1개
4. 최소 CRUD API
5. `plate_number` 중복검사 API
6. seed vehicle 1~2건
7. gateway 연결
8. `front/admin-front` 최소 목록/상세/등록 호출
9. compose 편입

## 후속 단계

이 설계 다음 순서는 아래가 맞다.

1. `Vehicle Asset` 부트스트랩 구현
2. `goal/05-vehicle-ops-read-model.md`를 이번 정본 경계에 맞게 재정리
3. 이후 `Vehicle Ops` 소비자 도메인 설계
4. 필요 시 `Terminal Ops`, `Driver Vehicle Assignment`, `Telemetry` 정본 설계

## 열린 정합성 메모

현재 기존 문서에는 더 넓은 `Vehicle Status` 초안이 남아 있다.

- `goal/06-id-and-state-dictionary.md`의 `ready / assigned / maintenance / accident_hold / retired`
- `goal/05-vehicle-ops-read-model.md`의 `maintenance_flag / accident_flag`

이번 1차 `Vehicle Asset` 설계에서는 이를 그대로 따르지 않는다.

정본 상태는 `active / inactive / retired`만 사용하고, 운영성 상태와 플래그는 후속 `Vehicle Ops`와 관련 정본 서비스에서 다시 정의한다.
