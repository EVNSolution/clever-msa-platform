# 22. Driver App Settlement Read Contract

## 문서 목적

이 문서는 `천하운수 배송원 앱 1차`의 Track A 정산 조회 계약을 canonical source로 고정한다.

이번 문서는 아래를 먼저 잠근다.

1. 배송원 앱 정산 조회의 service boundary
2. `unit_price`, `box_count`, `total_amount`의 의미
3. `daily-settlements`와 `me/settlement-calendar`의 response shape
4. dependency outage와 `needs_link` 처리 규칙

## 적용 범위

- `GET /api/settlement-ops/drivers/<driver_id>/daily-settlements/`
- `GET /api/driver-ops/me/settlement-calendar/`
- 배송원 앱 `업무기록` 월간 grid
- 배송원 앱 `정산 문의 날짜 선택`

이번 문서는 아래를 포함하지 않는다.

1. 정산 문의 thread write
2. inquiry attachment persistence
3. 정산 계산 write workflow
4. frontend overlay 제거 작업 자체

## Ownership Chain

Track A의 ownership chain은 아래처럼 고정한다.

```text
service-settlement-payroll (amount truth)
  -> service-settlement-operations-view (external read owner + snapshot ref enrichment)
  -> service-driver-operations-view (session-based me facade)
```

규칙:

1. `service-settlement-payroll`만 정산 금액 계산의 owner다.
2. `service-settlement-operations-view`는 payroll truth를 외부 read contract로 publish한다.
3. `service-driver-operations-view`는 session 기준 `me` facade만 제공한다.
4. `daily_delivery_input_snapshot_id` truth는 `service-delivery-record`에 있다.
5. `GET /api/driver-ops/me/work-logs/`는 별도 non-settlement contract로 유지한다.

## Amount Contract

Track A의 정산 계산 의미는 아래처럼 고정한다.

1. `unit_price`는 `박스 1개당 정산 단가`다.
2. `box_count`는 해당 일자의 정산 대상 박스 수다.
3. 각 일자의 `total_amount`는 `box_count * unit_price`다.
4. `summary.total_amount`는 요청 window 안 `results[].total_amount`의 합이다.
5. `settlement_type`는 `regular | special` 분류값이며, Track A v1에서는 별도 가산 수식의 owner가 아니다.

즉 driver app이 읽는 최소 정산 수식은 아래처럼 본다.

```text
daily total_amount = box_count * unit_price
summary.total_amount = sum(daily total_amount)
```

## External Read Contract

### 1. Driver Daily Settlements

Route:

- `GET /api/settlement-ops/drivers/<driver_id>/daily-settlements/?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD`

응답 규칙:

1. `service-settlement-operations-view`가 외부 read owner다.
2. 결과 row는 `service_date ASC`로 정렬한다.
3. 각 row는 payroll amount truth와 delivery snapshot reference를 함께 돌려준다.
4. `driver_id` 존재 여부를 driver profile 쪽에 다시 확인하지 않는다.

Response:

```json
{
  "driver_id": "10000000-0000-0000-0000-000000000001",
  "date_from": "2026-04-01",
  "date_to": "2026-04-30",
  "summary": {
    "regular_days": 19,
    "special_days": 4,
    "total_amount": "152300.00"
  },
  "results": [
    {
      "service_date": "2026-04-17",
      "daily_delivery_input_snapshot_id": "20000000-0000-0000-0000-000000000001",
      "settlement_type": "regular",
      "box_count": 12,
      "unit_price": "4700.00",
      "total_amount": "56400.00"
    }
  ]
}
```

### 2. Driver `Me` Settlement Calendar

Route:

- `GET /api/driver-ops/me/settlement-calendar/?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD`

규칙:

1. `service-driver-operations-view`가 active `driver_account_link`를 해석한다.
2. linked 상태면 upstream `daily-settlements` payload를 감싸서 돌려준다.
3. `needs_link`는 이 facade layer에서만 존재한다.

Linked response:

```json
{
  "status": "linked",
  "driver_id": "10000000-0000-0000-0000-000000000001",
  "date_from": "2026-04-01",
  "date_to": "2026-04-30",
  "summary": {
    "regular_days": 19,
    "special_days": 4,
    "total_amount": "152300.00"
  },
  "results": [
    {
      "service_date": "2026-04-17",
      "daily_delivery_input_snapshot_id": "20000000-0000-0000-0000-000000000001",
      "settlement_type": "regular",
      "box_count": 12,
      "unit_price": "4700.00",
      "total_amount": "56400.00"
    }
  ]
}
```

`needs_link` response:

```json
{
  "status": "needs_link",
  "results": []
}
```

## Failure Rules

1. payroll day-level source outage는 `503` dependency error shape로 처리한다.
2. `delivery-record` snapshot enrichment outage도 `503` dependency error shape로 처리한다.
3. v1에서는 `daily_delivery_input_snapshot_id` 없는 partial success를 허용하지 않는다.
4. `needs_link`는 `driver-ops` facade에서만 반환한다.
5. `settlement-ops`와 `driver-ops`는 `driver_id` existence를 다시 검증하지 않는다.

## Surface Notes

1. `업무기록` 화면의 표시용 금액은 각 일자의 `total_amount`를 사용한다.
2. `정산 문의 날짜 선택` 요약은 `settlement_type`, `box_count`, `unit_price`, `total_amount`를 사용한다.
3. frontend temporary overlay 값은 backend contract를 대체하지 않는다.

## 연결 문서

- `21-design-system-and-surface-rules.md`
- `../superpowers/specs/2026-04-21-cheonha-driver-app-minimum-design.md`
- `../superpowers/plans/2026-04-21-cheonha-driver-app-settlement-read-backend-request-estimate.md`
- `../rollout/12-settlement-phase-2-api-gates.md`
