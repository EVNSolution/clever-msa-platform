# Vehicle Ops Phase 1 디자인

## 목적

이 문서는 `Vehicle Ops`를 한 번에 완성된 운영 통합 화면으로 만들지 않고, 현재 bootstrap에 이미 있는 정본 서비스만 사용해 1차 조회 계약을 고정하기 위한 설계 문서다.

이번 단계의 목표는 `front`가 `Vehicle Asset`과 `Organization Master`를 직접 fan-out 호출하지 않고도 차량 목록과 차량 상세의 기본 요약을 일관된 contract로 조회하게 만드는 것이다.

즉 이번 설계는 `Vehicle Ops` 전체를 정의하는 문서가 아니라, 후속 `Terminal Ops`, `Driver Vehicle Assignment`, `Telemetry Hub`가 붙기 전까지의 `thin read model`을 먼저 고정하는 문서다.

## 스코프

이번 설계에 포함하는 범위는 아래와 같다.

1. `Vehicle Ops Phase 1` 읽기 모델 경계 정의
2. `Vehicle Asset + Organization Master` 기반 summary contract 정의
3. 목록/상세 조회 API surface 정의
4. front 소비 규칙 정의
5. 후속 확장 지점과 금지 규칙 정의

## 비스코프

이번 1차에서 일부러 포함하지 않는 것은 아래와 같다.

1. `Terminal Ops`
2. `Driver Vehicle Assignment`
3. `Telemetry Hub`
4. `current_driver_id`, `current_driver_name`
5. `terminal_id`, `device_id`, `terminal_status`
6. `handover_status`
7. `maintenance_flag`, `accident_flag`
8. timeline 저장 구조
9. projection DB

## 선택된 접근

사용자가 승인한 접근은 `Vehicle Ops`를 `Vehicle Asset` 정본을 확장하는 방식이 아니라, 별도 소비자 조회 서비스로 얇게 시작하는 것이다.

이 접근의 의미는 아래와 같다.

- `Vehicle Asset`은 차량 실체 정본으로만 유지한다.
- `Vehicle Ops Phase 1`은 `Vehicle Asset`과 `Organization Master`를 읽어 화면용 summary만 조합한다.
- `front`는 더 이상 차량 화면을 위해 source API를 직접 조합하지 않고 `Vehicle Ops` contract만 사용한다.
- 아직 존재하지 않는 운영 상태는 placeholder 컬럼으로 끌어오지 않는다.

이 설계는 `Driver 360`과 같은 bootstrap 패턴을 차량 축에 반복 적용하는 것이다.

## 이 읽기 모델이 답해야 하는 질문

이번 1차 `Vehicle Ops`는 아래 질문에만 답한다.

1. 이 차량은 어떤 차량인가
2. 어느 회사와 플릿에 속하는가
3. 자산 기준 상태가 무엇인가

이번 1차가 답하지 않는 질문은 아래와 같다.

1. 현재 누가 배정되어 있는가
2. 터미널과 단말 상태는 어떤가
3. 현재 배정/반납 절차가 어디까지 진행됐는가
4. 최근 telemetry 수집과 진단 상태는 어떤가
5. 사고나 정비 이슈가 있는가

## 조회 단위

- 기본 단위: `Vehicle`
- 기본 키: `vehicle_id`
- 보조 키: `plate_number`, `vin`

이번 단계에서는 `terminal_id`, `device_id`를 조회 키로 사용하지 않는다.

## 소스 서비스

| 소스 서비스 | Vehicle Ops Phase 1에 제공하는 것 | 소유권 |
|---|---|---|
| Vehicle Asset | `vehicle_id`, `plate_number`, `vin`, `vehicle_status`, `company_id`, `fleet_id` | 정본 유지 |
| Organization Master | `company_name`, `fleet_name` | 정본 유지 |

이번 단계의 `Vehicle Ops`는 source service를 bounded fan-out으로 읽는 query service로 구현한다.

## Summary Contract

이번 1차 summary는 아래 필드만 가진다.

- `vehicle_id`
- `plate_number`
- `vin`
- `vehicle_status`
- `company`
  - `company_id`
  - `company_name`
- `fleet`
  - `fleet_id`
  - `fleet_name`
- `warnings`

### 필드 의미

#### `vehicle_status`

이 값은 `Vehicle Asset`의 자산 상태를 그대로 사용한다.

- `active`
- `inactive`
- `retired`

이 값을 운영 상태처럼 해석하지 않는다.

#### `company`

`company_id`는 항상 source 식별자를 유지한다.
`company_name`은 `Organization Master`에서 조회한 요약값이다.

#### `fleet`

`fleet_id`는 nullable이다.
차량이 특정 플릿에 아직 배치되지 않았으면 `fleet_id = null`, `fleet_name = null`을 허용한다.

#### `warnings`

아래 같은 경우 summary 전체를 깨지 않고 warning을 남길 수 있다.

- `company_id`는 있으나 회사명을 찾지 못함
- `fleet_id`는 있으나 플릿명을 찾지 못함

즉 외부 참조 요약이 비어 있어도 차량 정본이 존재하면 summary는 유지한다.

## API Surface

이번 1차는 읽기 전용 API만 둔다.

- `GET /api/vehicle-ops/health/`
- `GET /api/vehicle-ops/vehicles/`
- `GET /api/vehicle-ops/vehicles/{vehicle_id}/`

### 권한 원칙

- 인증된 `user`: 조회 가능
- 인증된 `admin`: 조회 가능
- 쓰기 API는 이번 단계에 없다

### 목록 규칙

목록은 차량 summary 배열을 반환한다.

이번 bootstrap 1차에서는 정렬/필터/페이지네이션을 과도하게 확장하지 않는다.
기본 목록과 상세 contract를 먼저 안정화한다.

### 상세 규칙

상세는 동일한 summary contract를 단건으로 반환한다.
운영 상세 타임라인은 이번 단계 범위 밖이다.

## 데이터 흐름

1. `front`가 gateway를 통해 `Vehicle Ops`를 호출한다
2. `Vehicle Ops`가 `Vehicle Asset`에서 차량 목록 또는 차량 상세를 읽는다
3. `Vehicle Ops`가 `Organization Master`에서 회사/플릿 이름 요약을 읽는다
4. `Vehicle Ops`가 summary contract를 조합해 반환한다

핵심 규칙은 아래와 같다.

1. `front`는 `Vehicle Asset`과 `Organization`을 직접 fan-out 호출하지 않는다
2. `Vehicle Ops`는 source service 정본을 수정하지 않는다
3. source service 간 DB 조인은 만들지 않는다

## 에러 처리

### health

`/health/`는 인증 없이 `{"status": "ok"}`를 반환한다.

### detail not found

`Vehicle Asset`에 `vehicle_id`가 없으면 `404`를 반환한다.

### partial organization miss

차량 정본은 존재하지만 `Organization Master`에서 이름 요약을 찾지 못하면 아래처럼 처리한다.

- `company_id`, `fleet_id`는 그대로 유지
- `company_name`, `fleet_name`은 `null` 허용
- `warnings`에 누락 원인을 기록

즉 외부 요약 누락 때문에 차량 summary 전체를 `500`으로 실패시키지 않는다.

## 금지 규칙

이번 1차 `Vehicle Ops`에서는 아래를 금지한다.

1. `Vehicle Asset`에 없는 운영 상태를 summary에 가짜로 채우기
2. `current_driver`, `terminal`, `handover`, `telemetry` 필드를 placeholder로 먼저 넣기
3. `Vehicle Asset`에 운영 편의 컬럼을 추가해 read model 문제를 해결하려고 하기
4. front가 source service를 다시 직접 조합하게 만들기
5. projection DB를 이번 단계 필수 조건으로 만들기

## 화면 규칙

1. `front /vehicles`는 원칙적으로 `Vehicle Ops` 목록 계약을 기본 조회로 사용한다
2. 차량 상세 화면이 필요하면 같은 `Vehicle Ops` 단건 계약을 사용한다
3. `admin-front`의 차량 생성/상태 수정은 계속 `Vehicle Asset` 정본 API를 사용한다
4. 즉 `front`는 소비자 조회, `admin-front`는 정본 관리라는 역할을 유지한다

## 테스트 기준

이번 1차 구현은 아래 검증으로 닫는다.

1. `Vehicle Ops` 서비스 health/list/detail 테스트
2. source client 또는 summary assembler 단위 테스트
3. `front` 차량 화면 테스트
4. `docker compose ... config` 확인
5. gateway 경유 smoke 테스트
6. 필요 시 Playwright로 `/vehicles` 조회 확인

## 후속 확장 지점

아래는 `Vehicle Ops Phase 2` 이후에만 붙인다.

1. `Terminal Ops`
2. `Driver Vehicle Assignment`
3. `Telemetry Hub`
4. timeline projection
5. 사고/정비 요약

그때부터 아래 필드가 추가 후보가 된다.

- `current_driver_id`
- `current_driver_name`
- `terminal_id`
- `device_id`
- `terminal_status`
- `handover_status`
- `latest_telemetry_at`
- `telemetry_health_status`
- `diagnostic_flag`

## 연결 문서

- `goal/04-driver-360-read-model.md`
- `goal/05-vehicle-ops-read-model.md`
- `goal/09-integration-rules.md`
- `docs/superpowers/specs/2026-03-20-vehicle-asset-design.md`
