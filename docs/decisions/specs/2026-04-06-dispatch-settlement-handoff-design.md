# Dispatch to Settlement Handoff Design

## 목적

이 문서는 `배차 보드`에서 만들어진 날짜별 운영 결과를 `정산 입력`으로 넘기는 최소 handoff 경계를 current truth로 고정한다.

이번 결정의 목적은 아래와 같다.

1. `dispatch`와 `delivery-record` 사이의 handoff owner를 명확히 한다.
2. `upload-first` 원칙을 깨지 않으면서도 배차 결과를 정산 입력 초안으로 넘긴다.
3. `정산 실행 준비`와 `dispatch handoff 완료`를 구분할 수 있게 한다.
4. 현재 모델로 다룰 수 없는 `용차 기사` 범위를 명시적으로 분리한다.

## 스코프

이번 문서가 다루는 범위는 아래와 같다.

1. `dispatch -> delivery-record -> settlement` handoff 책임
2. `daily input snapshot`의 status 층
3. 배차 보드에서 handoff로 생성하는 최소 데이터
4. 정산 입력 화면에서 draft snapshot을 다루는 방식
5. 1차 handoff에서 포함/제외하는 참여자 범위

## 비스코프

이번 문서는 아래를 아직 확정하지 않는다.

1. 정산 업로드 시트의 상세 컬럼 구조
2. `용차 기사` 정산 계산 모델
3. settlement run 계산 엔진 고도화
4. payout 이후 지급 확정 절차
5. operator/app 경로

## 선택한 접근

선택한 구조는 `delivery-record owned bootstrap handoff`다.

핵심 원칙은 아래와 같다.

1. `dispatch`는 정산 결과를 직접 쓰지 않는다.
2. `delivery-record`가 `daily input snapshot` 정본 owner로서 handoff write를 수행한다.
3. 배차 보드는 handoff 트리거를 제공하지만, snapshot row의 최종 상태는 `delivery-record`가 소유한다.
4. handoff로 생성되는 snapshot은 곧바로 실행 가능한 `active`가 아니라 `draft`다.
5. `settlement run`은 계속 `active snapshot`만 실행 준비 대상으로 읽는다.

## 대안 비교

### 접근 A. 배차에서 곧바로 active snapshot 생성

장점:

1. 가장 빨리 이어진다.

단점:

1. 배차에서 넘어온 초안이 바로 `실행 가능`처럼 보인다.
2. 현재 `정산 실행` 화면의 readiness 기준과 충돌한다.
3. 실제 정산 입력 검증이 생략된 것처럼 읽힌다.

### 접근 B. 배차에서 draft snapshot bootstrap 생성

장점:

1. `upload-first` 원칙과 충돌하지 않는다.
2. 배차가 만든 초안과 정산 실행 준비를 분리할 수 있다.
3. 정산 입력 화면에서 `draft -> active` 승격을 명확히 표현할 수 있다.

단점:

1. `DailyDeliveryInputSnapshot.status` 층을 확장해야 한다.
2. 정산 입력 UI에 `draft` 문맥을 추가해야 한다.

### 접근 C. 배차에서는 deep-link만 제공하고 실제 handoff는 없음

장점:

1. 구현이 가장 가볍다.

단점:

1. 운영자가 배차 결과를 다시 손으로 복사해야 한다.
2. dispatch와 settlement 사이 경계는 남지만 handoff 자체는 닫히지 않는다.

## 선택 이유

1차 current truth는 `접근 B`로 고정한다.

이 구조가 가장 맞는 이유는 아래와 같다.

1. `delivery-record`가 정산 입력 정본을 계속 소유한다.
2. `dispatch`는 날짜별 운영 결과를 bootstrap 하는 역할까지만 가진다.
3. `settlement run` readiness는 기존처럼 `active snapshot`만 보면 된다.
4. 운영자 입장에서 `배차에서 넘김`과 `정산 입력 검증 완료`가 분리되어 읽힌다.

## ownership 경계

### 1. dispatch

`dispatch`가 소유하는 것은 아래까지다.

1. `dispatch_plan`
2. `vehicle_schedule`
3. `dispatch_assignment`
4. `outsourced_driver`
5. `driver_day_exception`
6. `정산 입력으로 넘기기` 트리거

`dispatch`는 `daily input snapshot` 정본을 직접 저장하지 않는다.

### 2. delivery-record

`delivery-record`가 소유하는 것은 아래다.

1. `delivery_record`
2. `daily_delivery_input_snapshot`
3. dispatch handoff bootstrap write
4. draft snapshot 검증/승격

즉 handoff write owner는 `service-delivery-record`다.

### 3. settlement-payroll

`settlement-payroll`은 아래만 소유한다.

1. `settlement_run`
2. `settlement_item`

`delivery-record`의 draft/active 구분을 readiness 입력으로만 본다.

## snapshot status

`DailyDeliveryInputSnapshot`의 status는 아래처럼 확장한다.

1. `draft`
2. `active`
3. `superseded`

의미는 아래와 같다.

### draft

1. 배차 handoff 또는 수동 초안 상태
2. 아직 정산 실행 준비로 보지 않는다
3. 정산 입력 화면에서 수정/검증 후 `active`로 올린다

### active

1. 현재 문맥에서 유효한 정산 입력
2. `정산 실행` readiness 기준에 포함된다

### superseded

1. 더 이상 현재 입력으로 보지 않는 이력 상태

## handoff 생성 규칙

### 1. 생성 위치

배차 보드 상세에서 `정산 입력으로 넘기기` 액션을 제공한다.

이 액션은 `service-delivery-record`의 dedicated handoff API를 호출한다.

### 2. handoff 입력

최소 입력은 아래다.

1. `company_id`
2. `fleet_id`
3. `dispatch_date`

### 3. handoff source

`delivery-record`는 handoff 수행 시 `dispatch` truth를 읽어 아래 대상을 구한다.

1. 해당 `fleet + dispatch_date`의 assigned `dispatch_assignment`
2. 그 중 `internal driver`가 있는 row

### 4. handoff 결과

각 내부 배송원에 대해 `draft daily input snapshot` 1건을 current row로 만든다.

기본 값은 아래다.

1. `company_id`
2. `fleet_id`
3. `driver_id`
4. `service_date = dispatch_date`
5. `delivery_count = 0`
6. `total_distance_km = 0`
7. `total_base_amount = 0`
8. `source_record_count = 0`
9. `status = draft`

### 5. upsert 원칙

1. 같은 `company + fleet + driver + service_date`에 `draft` 또는 `active` current row가 이미 있으면 중복 생성하지 않는다.
2. 기존 `draft`가 있으면 유지한다.
3. 기존 `active`가 있으면 handoff는 skip 대상으로 본다.

## 정산 입력 화면 원칙

### 1. 입력 요약

정산 입력 화면은 `draft snapshot`과 `active snapshot`을 구분해 보여준다.

### 2. 실행 준비

정산 실행 readiness는 계속 `active snapshot`만 기준으로 계산한다.

즉 `draft snapshot`은 실행 준비 수에 포함되지 않는다.

### 3. 수동 보정

수동 생성은 계속 예외 경로로 유지한다.

다만 기본 운영 흐름은 아래로 읽힌다.

1. 배차에서 handoff
2. 정산 입력에서 draft 검토/보정
3. active 승격
4. 정산 실행

## 용차 기사 범위

이번 handoff 첫 슬라이스는 `내부 배송원`만 포함한다.

이유는 아래와 같다.

1. 현재 `daily input snapshot` 정본은 `driver_id`만 가진다.
2. `용차 기사`는 아직 settlement input/runtime에서 같은 식별자로 다뤄지지 않는다.
3. 이 모델을 한 번에 억지로 넣으면 `dispatch`, `delivery-record`, `settlement-payroll`을 동시에 흔들게 된다.

따라서 current truth는 아래처럼 고정한다.

1. `용차 기사`는 dispatch handoff 대상이 아니다.
2. `용차 기사` 관련 settlement input은 후속 slice에서 별도 식별자 모델을 도입할 때 닫는다.
3. 후속 권장 방향은 [2026-04-06-outsourced-driver-settlement-subject-design.md](./2026-04-06-outsourced-driver-settlement-subject-design.md)를 따른다.
4. 다만 dispatch 쪽 archive unlock 기준은 계속 `daily input snapshot 존재 여부`를 플릿/날짜 단위로 계산한다.

## API 방향

1차 handoff API는 `service-delivery-record`에 둔다.

예시 shape:

- `POST /delivery-record/daily-snapshots/bootstrap-from-dispatch/`

요청 body:

1. `company_id`
2. `fleet_id`
3. `service_date`

응답은 아래를 포함하면 충분하다.

1. `created_count`
2. `skipped_count`
3. `created_snapshot_ids`

## UI 영향

### dispatch board

1. 배차 보드 상세에 `정산 입력으로 넘기기` CTA 추가
2. handoff 이후 `정산 입력` deep-link 제공

### settlement inputs

1. `draft snapshot` 수 표시
2. `active snapshot` 수 표시
3. 실행 준비 영역은 `active`만 카운트
4. snapshot modal/status selector에 `draft` 포함

### settlement runs

1. readiness 계산은 계속 `active snapshot`만 본다
2. `draft snapshot`은 실행 준비 수에 포함하지 않는다

## 연결 문서

- [2026-04-05-dispatch-admin-board-design.md](2026-04-05-dispatch-admin-board-design.md)
- [../../contracts/14-settlement-upload-first-ux-flow.md](../../contracts/14-settlement-upload-first-ux-flow.md)
- [../../contracts/11-settlement-admin-group-pages.md](../../contracts/11-settlement-admin-group-pages.md)
