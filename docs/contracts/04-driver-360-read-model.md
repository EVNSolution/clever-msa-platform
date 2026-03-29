# 04. Driver 360

## 문서 목적

이 문서는 배송원 상세 운영 화면을 위한 통합 읽기 모델 정의서다.

목표는 여러 정본 서비스를 front가 직접 조합하지 않고도 배송원 한 명의 현재 스냅샷을 한 화면에서 볼 수 있게 만드는 것이다.
이 읽기 모델의 런타임 provider는 `service-driver-operations-view`이며, compose/gateway/runtime naming은 `driver-ops-api`를 따른다.

## 이 읽기 모델이 답해야 하는 질문

1. 이 배송원은 누구인가
2. 현재 로그인 가능한가
3. 현재 어느 회사와 플릿에 속하는가
4. 연결된 계정은 무엇인가
5. 최근 정산 요약은 무엇인가
6. 배송원 정리 현황은 어떤가
7. 근태, 배송이력 규칙 현황은 어떤가
8. 현재 재직 상태와 자격 상태는 무엇인가

## 조회 단위

- 기본 단위: Driver
- 기본 키: driver_id
- 보조 키: company_id, fleet_id, account_id

## 구성 방식

### 1. Summary View

배송원 한 명의 현재 스냅샷을 보여준다.

### 2. Timeline View

이번 bootstrap 1차에서는 구현하지 않는다.

Driver 360은 우선 `summary-only` consumer domain으로 시작하고, timeline은 후속 단계에서 projection 또는 event store 전략이 정해진 뒤 추가한다.

## Summary 필드 초안

### Driver Profile HR

- driver_id
- driver_name
- ev_id
- phone_number
- address
- company_id
- fleet_id
- employment_status
- qualification_status

### Identity Access

- account_id
- account_email
- account_role
- account_is_active

### Organization Master

- company_name
- fleet_name

### Settlement Operations View

- latest_settlement_run_id
- latest_settlement_period_start
- latest_settlement_period_end
- latest_settlement_status
- latest_payout_status
- latest_settlement_amount

### Driver Cleanup / Rule Status

- driver_cleanup_status
- cleanup_blockers
- active_personnel_document_types
- missing_personnel_document_types
- attendance_rule_status
- delivery_history_rule_status

## Future Dependency

아래 항목은 현재 source truth가 아직 없거나, 별도 read-model 계산 규칙이 더 필요한 항목이라 현재 contract에 넣지 않는다.

- operational_status
- today_shift_status
- current_vehicle_id
- current_vehicle_plate_number
- current_vehicle_status
- pending_approval_count
- latest_location_at
- latest_location_status

## 소스 서비스별 책임

| 소스 서비스 | Driver 360에 제공하는 것 | 소유권 |
|---|---|---|
| Driver Profile HR | 기사 기본정보, 소속, 계정 연결 참조 | 정본 유지 |
| Identity Access | 계정 요약, 로그인 가능 여부 | 정본 유지 |
| Organization Master | 회사명, 플릿명 | 정본 유지 |
| Personnel Document Registry | 문서성 정리 현황에 필요한 기사 문서 메타데이터 | 정본 유지 |
| Settlement Operations View | 기사별 scoped latest settlement summary | read-only query 유지 |

Driver 360은 어떤 원본 데이터도 직접 수정하지 않는다.
이번 current runtime에서는 source service들을 bounded fan-out으로 읽는 query service로 구현한다.
runtime container and gateway naming은 `driver-ops-api` / `/api/driver-ops/`를 사용하지만, 화면과 읽기 모델의 이름은 계속 `Driver 360`으로 유지한다.
정산 영역에서는 `Settlement Payroll` collection을 직접 읽지 않고, `Settlement Operations View`의 `GET /drivers/<driver_id>/latest-settlement/` scoped contract만 사용한다.
배송원 정리 현황은 `Driver Profile HR + Identity Access + Organization Master + Personnel Document Registry`를 합쳐 계산한다.
근태와 배송이력은 아직 정본 runtime이 없어 current contract에서 rule status만 노출한다.
`employment_status`, `qualification_status`는 `Driver Profile HR` 정본을 그대로 노출한다.

## 포함하지 않을 것

1. Timeline 저장 구조
2. 전체 정산 세부 항목 원문
3. 차량, 배차, 위치, 출근 원문
4. 원시 텔레메트리
5. 전체 결재 본문

이 항목들은 별도 상세 조회로 내려간다.

## Current Peripheral Status Rules

### Driver Cleanup Status

- `ready`
  - 연결 계정, 회사/플릿 scope, 필수 인사문서가 모두 확인된 상태
- `action_required`
  - 연결 계정 누락, 회사/플릿 scope 누락, 필수 인사문서 누락, 비활성 재직 상태, 비정상 자격 상태 중 하나 이상이 있는 상태
- `unavailable`
  - 인사문서 source를 현재 토큰으로 읽을 수 없거나 upstream이 불안정해 정리 현황을 판단할 수 없는 상태

필수 인사문서 타입은 아래 네 가지다.

- `contract`
- `license_or_certificate`
- `bank_account_proof`
- `business_registration`

### Attendance Rule Status

- current runtime에서는 `pending_source`로 고정한다.
- 이유는 attendance truth가 아직 pending `/api/schedule/*` 분해 범위에 남아 있기 때문이다.

### Delivery History Rule Status

- current runtime에서는 `source_input_only`로 고정한다.
- 이유는 `service-delivery-record`가 settlement input snapshot 정본만 소유하고, full delivery execution history truth는 아직 active runtime이 아니기 때문이다.

## 갱신 규칙

### 즉시 갱신

- 프로필 변경
- 회사 또는 플릿 변경
- 계정 연결 변경

### 배치 또는 준실시간 갱신

- 정산 결과

## 화면 규칙

1. Driver 360 화면은 원칙적으로 이 읽기 모델만 조회한다.
2. front는 `Account / Org / Driver / Settlement` API를 직접 fan-out 호출하지 않는다.
3. Timeline은 이번 단계 범위 밖이다.

## 선행 조건

1. driver_id 외부 식별자 확정
2. company_id, fleet_id 참조 규칙 확정
3. account_id nullable 연결 규칙 확정

## 연결 문서

- `03-roadmap.md`
- `05-vehicle-ops-read-model.md`
- `06-id-and-state-dictionary.md`
