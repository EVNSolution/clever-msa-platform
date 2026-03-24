# Delivery Record Phase 1 Activation 디자인

## 목적

이 문서는 `service-delivery-record`를 empty shell에서 1차 runtime으로 승격하기 위한 경계와 최소 구현 범위를 고정한다.

이번 설계의 목표는 아래와 같다.

1. `service-delivery-record`를 settlement 4축 안에서 입력 정본 runtime으로 활성화한다.
2. 배송 원천 기록과 정산 계산용 일별 입력 snapshot을 결과 write 영역과 분리한다.
3. `service-settlement-payroll`의 `SettlementRun`, `SettlementItem` 경계를 침범하지 않는 최소 CRUD 범위를 고정한다.
4. compose, gateway, seed, repo 문서가 shell 상태가 아닌 active runtime 상태를 반영하도록 기준을 만든다.

## 스코프

이번 설계에 포함하는 범위는 아래와 같다.

1. `service-delivery-record` 1차 runtime의 역할 정의
2. 입력 엔티티 2종의 ownership과 관계 정의
3. 외부 route, compose service naming, auth 기준 정의
4. local seed와 최소 검증 기준 정의
5. 문서와 인덱스 반영 기준 정의

## 비스코프

이번 설계에서는 아래 항목을 다루지 않는다.

1. `SettlementRun`, `SettlementItem`, `deduction`, `incentive`, `payout_status`
2. payroll 계산 엔진
3. dispatch, telemetry, assignment에서의 자동 fan-in 수집
4. 배차 계획 또는 telemetry 기준의 입력 자동 정합성 계산
5. bulk import
6. payroll direct lookup 연동
7. read-model summary API

## 현재 상태

현재 settlement 4축은 아래 상태다.

1. `service-settlement-registry`는 active runtime이다.
2. `service-settlement-payroll`은 정산 결과 write owner runtime이다.
3. `service-settlement-operations-view`는 read-only runtime이다.
4. `service-delivery-record`만 shell 상태라 계산 입력 정본이 비어 있다.

문서상 경계는 이미 고정돼 있다.

1. `service-delivery-record`는 계산 전 입력 원천 정본이다.
2. 정산 결과와 payout 상태는 이 repo가 절대 소유하지 않는다.
3. 지금 필요한 것은 계산 기능이 아니라 shell 제거와 입력 경계 안정화다.

## 선택된 접근

이번 설계에서는 아래 접근을 선택한다.

1. `service-delivery-record`는 입력 정본 CRUD만 구현한다.
2. 1차 엔티티는 `DeliveryRecord`, `DailyDeliveryInputSnapshot`으로 제한한다.
3. 배송 단건 원천 기록과 정산 계산용 일별 입력 snapshot을 모두 이 repo가 직접 소유한다.
4. `SettlementRun`, `SettlementItem`은 계속 `service-settlement-payroll`이 소유한다.
5. 모든 write와 read API는 admin-authenticated management API로 시작한다.
6. dispatch, telemetry, assignment 자동 fan-in은 이번 라운드에 포함하지 않는다.

이 접근을 선택한 이유는 아래와 같다.

1. 입력 정본과 결과 정본의 경계가 명확해진다.
2. payroll이 계산 결과를 소유하면서도 계산 입력을 외부 정본에서 읽는 구조를 유지할 수 있다.
3. `service-settlement-registry`와 같은 활성화 패턴으로 shell 제거를 진행할 수 있다.
4. 자동 집계와 계산 로직까지 같이 들이지 않아도 후속 연동 경로를 열 수 있다.

## 서비스 경계

### `service-delivery-record`가 직접 소유하는 것

1. 배송 단건 원천 기록
2. 정산 계산용 일별 입력 snapshot
3. 해당 엔티티의 CRUD와 read API
4. 입력 정본 seed

### `service-delivery-record`가 소유하지 않는 것

1. `SettlementRun`
2. `SettlementItem`
3. `deduction`
4. `incentive`
5. `payout_status`
6. settlement result summary
7. 정산 계산 실행
8. dispatch truth write
9. telemetry truth write

## 엔티티 구조

### 1. `DeliveryRecord`

역할:

1. 배송 단건 원천 사실 기록
2. 정산 계산에 들어갈 가장 작은 source truth

최소 필드 방향:

1. `delivery_record_id`
2. `company_id`
3. `fleet_id`
4. `driver_id`
5. `service_date`
6. `source_reference`
7. `delivery_count`
8. `distance_km`
9. `base_amount`
10. `status`
11. `payload`

필드 해석 원칙:

1. `source_reference`는 외부 시스템이나 업로드 단위에서 온 원천 식별자다.
2. `delivery_count`는 1차에서는 단건이라도 명시적으로 가진다.
3. `payload`는 1차에서 원천 세부 필드를 보존하는 JSON 저장소다.
4. 계산 로직은 저장하지 않고 계산 입력값만 저장한다.

### 2. `DailyDeliveryInputSnapshot`

역할:

1. payroll이 읽을 수 있는 일별 계산 입력 snapshot
2. 원천 단건을 그대로 다시 스캔하지 않고도 계산 입력을 재현 가능하게 유지하는 집계 정본

최소 필드 방향:

1. `snapshot_id`
2. `company_id`
3. `fleet_id`
4. `driver_id`
5. `service_date`
6. `delivery_count`
7. `total_distance_km`
8. `total_base_amount`
9. `status`
10. `source_record_count`

snapshot 원칙:

1. 1차에서는 일 단위 snapshot만 다룬다.
2. 같은 `company_id + fleet_id + driver_id + service_date` 조합에 대해 active snapshot은 하나만 허용한다.
3. snapshot은 결과 truth가 아니라 입력 truth다.
4. phase 1에서는 snapshot을 원천 기록에서 자동 생성하지 않고 admin CRUD와 seed로만 관리한다.

## 참조 키와 validation 기준

`service-delivery-record`는 아래 식별자를 reference key로만 사용한다.

1. `company_id`
2. `fleet_id`
3. `driver_id`

원칙:

1. 조직 정본은 `service-organization-registry`가 소유한다.
2. 배송원 기본 프로필 정본은 `service-driver-profile`이 소유한다.
3. `service-delivery-record`는 조직이나 배송원 정본을 복제하거나 소유하지 않는다.
4. phase 1에서는 `company_id`, `fleet_id`, `driver_id`의 존재 여부만 검증한다.
5. driver-to-fleet 배정 정합성 검증은 후속 라운드로 미룬다.

## API / Service Naming

1차 naming은 아래로 고정한다.

1. compose service: `delivery-record-api`
2. gateway prefix: `/api/delivery-record/`

최소 API shape는 아래와 같다.

1. `GET /api/delivery-record/health/`
2. `GET/POST /api/delivery-record/records/`
3. `GET/PATCH /api/delivery-record/records/{delivery_record_id}/`
4. `GET/POST /api/delivery-record/daily-snapshots/`
5. `GET/PATCH /api/delivery-record/daily-snapshots/{snapshot_id}/`

원칙:

1. delete는 1차에서 hard delete보다 status 기반 비활성화를 우선한다.
2. 별도 summary endpoint를 추가하지 않는다.
3. payroll consumer 전용 internal endpoint는 이번 라운드에 포함하지 않는다.

## Auth / Permission 기준

1차 auth 기준은 아래와 같다.

1. `health`만 공개
2. CRUD API는 admin-authenticated management API
3. payroll이나 ops-view를 위한 machine-auth는 이번 라운드에 포함하지 않는다

선택 이유:

1. 현재 목적은 shell 제거와 입력 정본 경계 고정이다.
2. internal consumer auth와 read optimization을 함께 열면 scope가 커진다.

## Seed 기준

1차 seed는 최소 1세트를 제공한다.

포함:

1. 예시 `DeliveryRecord` 1건 이상
2. 같은 조직/플릿/배송원/일자 조합의 `DailyDeliveryInputSnapshot` 1건 이상

원칙:

1. integration-local-stack의 seeded organization, fleet, driver 식별자를 재사용한다.
2. seed는 입력 정본 역할을 보여 주는 최소 예시만 넣는다.
3. 결과 데이터나 payroll 데이터는 넣지 않는다.

## Compose / Gateway / Local Stack 영향

1차 활성화에서 아래 반영을 같이 수행한다.

1. `integration-local-stack` compose에 `delivery-record-api`, `delivery-record-db` 추가
2. gateway에 `/api/delivery-record/` route 추가
3. seed-runner에 migration과 seed wiring 추가
4. env example 추가

이번 라운드에서 포함하지 않는 것:

1. payroll direct read wiring
2. ops-view fan-out wiring
3. dispatch 또는 telemetry source import pipeline

## 문서와 인덱스 영향

phase 1 구현 계획에서는 최소한 아래 문서가 같이 갱신돼야 한다.

1. `WORKSPACE.md`
2. `repo-map.md`
3. `docs/mappings/current-runtime-inventory.md`
4. `docs/mappings/current-to-target-repo-map.md`
5. `docs/mappings/repo-responsibility-matrix.md`
6. `development/service-delivery-record/README.md`
7. compose / gateway / seed 관련 문서

핵심 반영 내용:

1. `service-delivery-record`를 `empty-shell`에서 active runtime으로 승격
2. 입력 정본과 결과 정본의 경계를 문서에서 더 강하게 고정
3. compose service, gateway prefix, seed 존재 여부를 inventory에 반영

## 완료 기준

이번 설계가 구현으로 내려갈 준비가 됐다고 보는 기준은 아래와 같다.

1. `service-delivery-record`의 입력 정본 경계가 문서상 명확하다.
2. `SettlementRun`, `SettlementItem`이 이 repo에 들어오지 않는다는 점이 명확하다.
3. `DeliveryRecord`, `DailyDeliveryInputSnapshot`의 최소 ownership이 고정된다.
4. route와 compose naming이 문서상 고정된다.
5. 구현 계획이 이 설계를 직접 따라갈 수 있다.
