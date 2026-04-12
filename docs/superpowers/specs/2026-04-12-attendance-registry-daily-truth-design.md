# 2026-04-12 Attendance Registry Daily Truth Design

## 목적

이 문서는 `service-attendance-registry`를 CLEVER MSA의 `일일 근태 truth owner`로 도입하는 current truth를 고정한다.

이번 결정의 목적은 아래와 같다.

1. 근태를 `배차 row 직접 해석`이나 `정산 내부 규칙`으로 흩어 두지 않는다.
2. `정규 휴일`, `미근무`, `예외 확인 필요`를 월정산 계산과 분리된 upstream truth로 만든다.
3. `service-settlement-payroll`이 근태까지 소유하지 않도록 경계를 지킨다.
4. 새 service를 image-backed repo, local stack, API docs, central deploy 흐름에 일관되게 올린다.

## 문제 정의

현재 상태는 아래와 같다.

1. attendance truth runtime은 아직 없다.
2. settlement read contract는 `delivery history 존재`를 임시 attendance signal로만 본다.
3. dispatch upload confirm 이후에는 `matched_driver_id`만 있으면 delivery snapshot과 settlement 흐름으로 넘어갈 수 있다.
4. 그래서 `00` 같은 비근무성 row도 정산 흐름에 섞일 위험이 있다.

핵심 문제는 `근태 없음`을 정산 시점에 뒤늦게 판정하고 있다는 점이다.

이 구조는 아래를 만든다.

1. `dispatch -> delivery-record -> payroll` 경계에서 휴일 제외 기준이 흔들린다.
2. `00`이 payroll hard rule처럼 읽히기 쉽다.
3. 이후 명시 근태와 예상 근태를 붙이려 할 때 owner가 없다.

## 스코프

이번 문서가 다루는 범위는 아래와 같다.

1. `service-attendance-registry`의 ownership
2. phase 1 active source로서 `dispatch-derived attendance`
3. `00` row 해석 규칙
4. `service-delivery-record`와 `service-settlement-payroll`의 attendance consume 방식
5. image build와 central deploy 준비 원칙

## 비스코프

이번 문서는 아래를 아직 확정하지 않는다.

1. front-web-console 명시 근태 CRUD 화면
2. driver app calendar / shift schedule cutover
3. explicit source producer 구현
4. forecast source producer 구현
5. `service-attendance-operations-view`
6. 월정산 계산 엔진의 추가 항목 고도화

즉 phase 1은 `dispatch -> attendance day truth -> settlement exclusion` 경로만 닫는다.

## 대안 비교

### 접근 A. dispatch-registry 안에 근태 truth를 넣는다

장점:

1. 배차 confirm 시점 연결이 가장 짧다.

단점:

1. 배차 정본과 근태 정본이 섞인다.
2. 이후 명시 근태나 forecast 근태를 붙이면 dispatch가 과비대해진다.
3. 정산과 driver app이 같은 truth를 보려면 dispatch에 과도하게 의존하게 된다.

### 접근 B. settlement-payroll 안에 근태 truth를 넣는다

장점:

1. 월정산 exclusion 규칙 구현만 보면 가장 빠르다.

단점:

1. 근태가 정산 전용 데이터처럼 굳어진다.
2. dispatch, driver ops, future attendance UI가 payroll을 upstream으로 보게 된다.
3. settlement 4축 분해 원칙을 거꾸로 무너뜨린다.

### 접근 C. attendance-registry를 별도 정본 서비스로 둔다

장점:

1. 근태를 dispatch와 settlement 사이의 공통 upstream truth로 둘 수 있다.
2. dispatch, explicit, forecast를 source로 추가해도 owner가 흔들리지 않는다.
3. settlement는 consumer로만 남는다.

단점:

1. 새 repo, compose, gateway, docs, deploy-control 연결이 필요하다.
2. phase 1부터 source contract를 명확히 잡아야 한다.

## 선택한 접근

phase 1 current truth는 `접근 C`로 고정한다.

핵심 원칙은 아래와 같다.

1. `service-attendance-registry`는 `기사 x 일자` 단위의 daily truth만 소유한다.
2. phase 1 active source는 `dispatch` 하나만 둔다.
3. explicit / forecast는 future source로만 예약하고 이번 구현에는 넣지 않는다.
4. `service-delivery-record`와 `service-settlement-payroll`은 attendance truth를 읽어 각자 exclude rule을 적용한다.
5. `00`은 payroll rule이 아니라 `dispatch-derived attendance` 해석 규칙이다.

## 서비스 경계

### 1. service-attendance-registry

소유:

1. `AttendanceDay`
2. `AttendanceSignal`
3. dispatch-derived signal 해석
4. `driver_id + attendance_date` 기준 daily truth 조회

소유하지 않음:

1. dispatch plan / vehicle schedule / assignment CRUD
2. delivery raw record
3. daily delivery input snapshot
4. settlement run / settlement item / payout status

이 서비스는 `정산 적격성 정본`을 별도 aggregate로 소유하지 않는다.

phase 1에서는 `final_status`만 정본으로 두고, downstream이 이를 해석한다.

### 2. service-dispatch-registry

소유:

1. `dispatch_plan`
2. `vehicle_schedule`
3. `dispatch_assignment`
4. upload preview / confirm
5. attendance signal 발행 트리거

소유하지 않음:

1. 최종 attendance day truth
2. settlement exclude/include 판정

즉 dispatch는 `signal producer`이고, attendance truth owner가 아니다.

### 3. service-delivery-record

소유:

1. `DeliveryRecord`
2. `DailyDeliveryInputSnapshot`
3. dispatch handoff bootstrap write

규칙:

1. attendance `final_status=worked`인 날만 snapshot 생성 대상으로 본다.
2. `day_off`는 snapshot을 만들지 않는다.
3. `exception`은 hard fail 또는 explicit skip reason으로 남긴다.

### 4. service-settlement-payroll

소유:

1. `SettlementRun`
2. `SettlementItem`
3. 월정산 amount aggregation

규칙:

1. attendance truth를 읽되 owner가 되지 않는다.
2. `final_status=worked`만 계산 대상으로 본다.
3. `day_off`와 `exception`은 계산에 넣지 않는다.
4. 기존 overtime surcharge 규칙은 계속 payroll 내부에서 처리한다.

## 데이터 모델

### AttendanceSignal

phase 1 최소 필드는 아래다.

1. `attendance_signal_id`
2. `driver_id`
3. `attendance_date`
4. `source_kind`
5. `suggested_status`
6. `raw_reason_code`
7. `raw_payload`
8. `source_reference`
9. `created_at`

의미:

1. source가 보낸 원신호를 보존한다.
2. future explicit / forecast source가 붙어도 같은 틀을 유지한다.

### AttendanceDay

phase 1 최소 필드는 아래다.

1. `attendance_day_id`
2. `driver_id`
3. `attendance_date`
4. `final_status`
5. `decided_source_kind`
6. `decided_signal_id`
7. `updated_at`

이 모델은 current truth 한 줄만 가진다.

phase 1에서는 helper field로 `settlement_eligibility`를 따로 저장하지 않는다.

## 상태 규칙

phase 1 `final_status`는 아래 세 값만 쓴다.

1. `worked`
2. `day_off`
3. `exception`

의미는 아래와 같다.

### worked

1. 실제 근무일로 본다.
2. delivery snapshot bootstrap과 payroll 집계 대상이다.

### day_off

1. 정규 휴일 또는 비근무일로 본다.
2. snapshot과 payroll에서 제외한다.

### exception

1. 자동 판단으로 바로 밀어 넣기 위험한 날이다.
2. 운영 확인 전에는 snapshot과 payroll에 넣지 않는다.

## dispatch-derived 해석 규칙

phase 1 active source는 `dispatch` 하나다.

### 1. signal 입력 대상

dispatch confirm 시 아래 대상만 attendance signal로 보낸다.

1. internal driver가 매칭된 row
2. 날짜가 확정된 row

이번 단계에서는 아래는 제외한다.

1. unmatched row
2. outsourced driver row
3. explicit manual correction row

### 2. driver-day upsert 기준

동일 `driver_id + attendance_date`는 한 개 `AttendanceDay`만 유지한다.

같은 batch에서 row가 여러 개여도, 해석 결과는 하루 한 줄로 정리한다.

### 3. `00` 해석 규칙

`small_region_text == "00"`은 배차표상의 `배송없음` 표기다.

즉 `00`은 payroll rule이 아니라 dispatch-derived attendance 해석 입력이다.

phase 1 current truth는 아래로 고정한다.

1. `00`이고 positive workload가 없으면 `day_off`
2. `00`인데 workload가 있으면 `배송없음` 표기와 실제 row payload가 충돌하므로 `exception`
3. non-`00` matched row는 기본적으로 `worked`

이 규칙을 두는 이유는 `00`을 조용히 정산 대상으로 밀어 넣지 않기 위해서다.

### 4. 다중 row 해석 규칙

같은 기사/날짜에 dispatch signal이 여러 개 있으면 아래 우선순위로 최종 상태를 만든다.

1. 하나라도 `exception`이면 최종은 `exception`
2. 모두 `day_off`이면 최종은 `day_off`
3. 하나 이상 `worked`이고 `exception`이 없으면 최종은 `worked`

즉 ambiguous row가 섞이면 안전하게 `exception`으로 올린다.

## API 표면

phase 1 필수 API는 아래만 둔다.

1. `GET /api/attendance/days/`
2. `GET /api/attendance/days/{attendance_day_id}/`
3. `POST /api/attendance/internal/dispatch-signals:sync/`
4. `POST /api/attendance/internal/days:bulk-lookup/`

이번 단계에서는 public write endpoint를 만들지 않는다.

이유는 아래와 같다.

1. explicit source producer를 이번 slice에 넣지 않기 때문이다.
2. source가 아직 dispatch 하나뿐이므로 수동 write surface를 섣불리 넓힐 이유가 없다.

## settlement 연결 규칙

### delivery-record bootstrap

dispatch confirm 이후 handoff 순서는 아래다.

1. dispatch confirm
2. attendance dispatch signal sync
3. attendance daily truth 조회
4. worked 대상만 delivery snapshot bootstrap

이 순서에서 attendance sync가 실패하면 bootstrap으로 넘어가지 않는다.

### payroll run

payroll은 active snapshot만 보는 current 구조를 유지하되, attendance truth를 추가 gate로 읽는다.

규칙:

1. `worked`만 집계 대상
2. `day_off`는 제외
3. `exception`은 제외
4. attendance source unavailable이면 조용한 fallback 없이 실패

즉 payroll이 근태를 소유하지는 않지만, attendance truth를 반드시 소비한다.

## image build와 중앙 배포 준비

새 service는 phase 1부터 image-backed service 기준으로 준비한다.

원칙은 아래와 같다.

1. `service-attendance-registry` repo는 `build-image.yml`을 가진다.
2. `integration-local-stack` local/deploy compose와 env template에 service를 추가한다.
3. unified OpenAPI refresh 대상에 service를 추가한다.
4. `clever-deploy-control` catalog와 runbook에 service를 추가한다.

기본 release bundle은 아래를 같이 본다.

1. `service-attendance-registry`
2. `service-dispatch-registry`
3. `service-delivery-record`
4. `service-settlement-payroll`

### gateway 예외

`edge-api-gateway` route 반영은 현재 상태상 예외 경로로 본다.

이유:

1. 새 attendance route는 필요하다.
2. 하지만 gateway repo는 아직 service repo들과 동일한 image build 패턴으로 정리되지 않았다.

따라서 phase 1에서는 아래처럼 읽는다.

1. attendance service는 image-backed 준비
2. gateway route는 source-deploy exception으로 별도 명시

## future extension

phase 2 이후에만 검토할 것은 아래다.

1. explicit source producer
2. forecast source producer
3. source precedence `explicit > dispatch > forecast`
4. attendance read model
5. driver app / admin attendance UI

즉 이번 설계는 확장성을 닫지 않지만, phase 1 구현은 일부러 좁게 고정한다.

## 완료 기준

이 설계는 아래가 만족되면 current truth로 본다.

1. `service-attendance-registry`가 root docs와 repo map에 정식 target repo로 등록된다.
2. dispatch confirm이 attendance truth를 먼저 만들고, delivery/payroll은 그 truth를 읽는다.
3. `00`이 payroll 하드코드가 아니라 attendance 해석 규칙으로 이동한다.
4. 새 service가 local stack, API docs, image build, central deploy 준비에 모두 연결된다.
5. settlement 4축 분해 원칙이 유지된다.
