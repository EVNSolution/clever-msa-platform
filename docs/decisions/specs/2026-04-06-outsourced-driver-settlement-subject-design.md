# Outsourced Driver Settlement Subject Design

## 목적

이 문서는 `용차 기사`를 `driver` 정본으로 승격하지 않으면서도, `delivery-record`와 `settlement-payroll`에 정산 대상자로 포함시키는 2차 확장 방향을 current truth 수준으로 정리한다.

목적은 아래와 같다.

1. `dispatch`에서 이미 존재하는 `internal driver | outsourced driver` 이분 구조를 정산 입력까지 자연스럽게 잇는다.
2. 용차 기사를 `driver` 정본으로 편입하지 않는다는 기존 원칙을 유지한다.
3. `service-delivery-record`와 `service-settlement-payroll`이 같은 참여자 모델을 쓰게 만든다.

## 현재 경계

현재 서비스 경계는 아래처럼 나뉜다.

1. `dispatch`
   - `DispatchAssignment`는 `driver_id` 또는 `outsourced_driver_id` 중 정확히 하나를 가진다.
2. `delivery-record`
   - `DeliveryRecord`, `DailyDeliveryInputSnapshot`는 아직 `driver_id`만 가진다.
3. `settlement-payroll`
   - `SettlementItem`도 아직 `driver_id`만 가진다.

즉 지금은 `용차 기사`가 `dispatch`에는 존재하지만, `정산 입력`과 `정산 결과`에는 같은 언어로 들어갈 수 없다.

## 비스코프

이번 문서는 아래를 아직 확정하지 않는다.

1. 용차 기사 정산 계산식 상세
2. `박스 수 / 가구 수` 입력 시트 구조
3. 외부 계좌 정보나 지급 채널
4. 앱/웹의 용차 기사 전용 self-service

## 대안 비교

### 접근 A. 용차 기사를 `driver`로 승격

장점:

1. 기존 `driver_id` 기반 모델을 그대로 쓸 수 있다.

단점:

1. 이미 합의한 `용차 기사는 driver 정본이 아니다` 원칙을 깬다.
2. 배송원 정본 관리 비용이 급격히 커진다.

### 접근 B. 정산에서만 별도 임시 텍스트 이름으로 처리

장점:

1. 구현이 가장 가볍다.

단점:

1. 날짜별 정산 대상자 식별이 불안정하다.
2. 같은 용차 기사의 재사용, 이력, 아카이브와 연결되지 않는다.

### 접근 C. `driver_id | outsourced_driver_id` 이분 구조를 정산 입력/결과까지 확장

장점:

1. `dispatch`와 동일한 패턴이라 이해가 쉽다.
2. 용차 기사를 `driver` 정본으로 올리지 않아도 된다.
3. 서비스 간 handoff 모델이 가장 작게 확장된다.

단점:

1. `delivery-record`, `settlement-payroll` 모델/serializer/read path를 함께 바꿔야 한다.

## 선택 이유

2차 추천 방향은 `접근 C`다.

이유는 아래와 같다.

1. 이미 `dispatch` truth가 `internal vs outsourced`를 정확히 표현하고 있다.
2. `delivery-record`와 `settlement-payroll`이 같은 참여자 구조를 쓰면 handoff가 단순해진다.
3. 새로운 상위 인력풀 정본을 지금 당장 만들지 않아도 된다.

## 2차 current truth 권장안

### 1. 참여자 식별 구조

아래 엔티티는 모두 같은 구조를 가져야 한다.

1. `DeliveryRecord`
2. `DailyDeliveryInputSnapshot`
3. `SettlementItem`

권장 구조:

1. `driver_id` nullable
2. `outsourced_driver_id` nullable
3. 정확히 하나만 값이 있어야 한다

즉 `dispatch assignment`와 동일한 one-of 패턴을 정산 축까지 확장한다.

### 2. 이름 스냅샷

정산 화면과 지급 이력을 안정적으로 보여주기 위해, 아래 엔티티에는 `participant_name_snapshot`을 같이 두는 방향을 권장한다.

1. `DailyDeliveryInputSnapshot`
2. `SettlementItem`

이유:

1. 내부 배송원 이름도 나중에 바뀔 수 있다.
2. 용차 기사는 아카이브 이후에도 과거 정산 이력에 남아야 한다.
3. 정산 결과 화면은 외부 서비스 조회 실패와 무관하게 이름을 보여줄 수 있어야 한다.

### 3. handoff 규칙

`dispatch -> delivery-record` handoff는 아래처럼 확장한다.

1. 내부 배송원 배정 row는 `driver_id`
2. 용차 기사 배정 row는 `outsourced_driver_id`
3. 둘 다 `draft daily input snapshot`으로 생성 가능

단, 이것은 `delivery-record`와 `settlement-payroll`이 위 참여자 구조를 지원한 이후에만 활성화한다.

### 4. 정산 실행 readiness

2차에서는 `active snapshot` 기준은 유지하되, 대상자는 아래 둘을 모두 포함한다.

1. 내부 배송원 snapshot
2. 용차 기사 snapshot

즉 readiness 기준은 여전히 `status = active`이지만, 참여자 종류는 확장된다.

### 5. UI 영향

정산 입력/결과 화면은 `배송원` 단일 컬럼이 아니라 `정산 대상자` 컬럼으로 읽히는 편이 더 맞다.

표시 원칙:

1. 내부 배송원: `배송원 · 이름`
2. 용차 기사: `용차 · 이름`

## 단계별 구현 순서

### 1단계

`delivery-record` 확장

1. `DeliveryRecord`
2. `DailyDeliveryInputSnapshot`

에 `outsourced_driver_id`와 one-of 검증을 추가한다.

### 2단계

`dispatch handoff` 확장

1. 내부 배송원뿐 아니라 용차 기사도 `draft snapshot`으로 bootstrap 한다.

### 3단계

`settlement-payroll` 확장

1. `SettlementItem`에 `outsourced_driver_id`와 `participant_name_snapshot`을 추가한다.

### 4단계

UI 용어 정리

1. `배송원` 중심 문구를 `정산 대상자`로 바꾼다.
2. 내부/외부 배지를 같이 보여준다.

## 현재 1차와의 관계

현재 1차 current truth는 그대로 유지한다.

1. 지금은 내부 배송원만 handoff 대상이다.
2. 용차 기사 아카이브 unlock 기준은 이미 `daily input snapshot 존재 여부`로 고정돼 있다.
3. 따라서 이번 문서는 `즉시 구현 범위`가 아니라, 다음 handoff 확장의 기준선이다.
