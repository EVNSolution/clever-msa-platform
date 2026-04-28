# Cheonha Driver App Settlement Read Backend Request Estimate

## Purpose

이 문서는 `천하운수 배송원 앱 1차` 구현 중 프론트에서 임시 UI 데이터로 처리한 영역 중
`정산 조회 read API`만 별도로 떼어 정리한 견적 문서다.

원칙은 아래와 같다.

1. 없는 API를 프론트에서 임의 해석하지 않는다.
2. 정산 금액 계산은 payroll에 두고, external settlement 조립 책임은 read owner에 둔다.
3. app 세션 편의 route와 settlement domain read owner를 분리한다.

## Scope Summary

이 문서의 범위는 아래 2개 요청만 포함한다.

1. `driver daily settlement read`
2. `driver me settlement calendar facade`

`settlement inquiry`는 이 문서 범위가 아니다.
별도 문서는 [2026-04-21-cheonha-driver-app-settlement-inquiry-backend-request-estimate.md](./2026-04-21-cheonha-driver-app-settlement-inquiry-backend-request-estimate.md)를 따른다.

## Current State

### Already Available

- `service-driver-operations-view`
  - `GET /api/driver-ops/me/work-logs/`
  - 현재 정본 범위는 `박스 수`, `attendance status`, `source record count`까지만 본다.
- `service-settlement-operations-view`
  - `GET /api/settlement-ops/drivers/<driver_id>/latest-settlement/`
  - latest settlement 1건 summary read는 이미 있다.
- `service-delivery-record`
  - `daily_delivery_input_snapshot_id` 정본이 존재한다.

### Not Available Yet

현재 앱 1차 화면을 그대로 서버와 연결하려면 아래 read contract가 아직 없다.

1. month calendar에 맞는 `일자별 settlement read`
2. `정산 타입`, `박스당 단가`, `총 정산액`의 일자별 read contract
3. 세션 기준 `me` route에서 위 contract를 그대로 읽는 facade

## Boundary Decision

### 1. Settlement Read Owner

`정산 조회 read`의 domain owner는 `service-settlement-operations-view`로 보는 것이 맞다.

이유:

1. `service-settlement-operations-view`는 정산 read-only operations-view runtime이다.
2. 현재도 driver scoped `latest-settlement` summary를 이미 제공한다.
3. `service-driver-operations-view`가 settlement 조립 규칙의 owner가 되면 안 된다.

따라서 구조는 아래처럼 고정한다.

- amount truth owner:
  - `service-settlement-payroll`
- source read owner:
  - `service-settlement-operations-view`
- app-facing me facade:
  - `service-driver-operations-view`

### 2. `Me` Facade Owner

세션 기준 `me` route와 `needs_link` 처리는 `service-driver-operations-view`가 맡는 것이 맞다.

이유:

1. 현재도 `GET /api/driver-ops/me/work-logs/`에서 같은 세션 해석 규칙을 이미 갖고 있다.
2. `driver_account_link` 해석은 settlement domain보다 driver app facade에 가깝다.
3. settlement read owner와 session facade를 분리해야 경계가 유지된다.

## Requested Backend Items

### Request 1. Driver Daily Settlement Read

#### Goal

`업무기록` 월간 grid와 `정산 문의 날짜 선택` 화면에서 사용할 일자별 settlement read를 제공한다.

#### Recommended Owner

- amount truth: `service-settlement-payroll`
- external read owner: `service-settlement-operations-view`

#### Recommended Endpoint

- `GET /api/settlement-ops/drivers/<driver_id>/daily-settlements/?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD`

#### Recommended Response Shape

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

#### Notes

1. `unit_price`는 박스 1개당 정산 단가다.
2. 각 일자의 `total_amount`는 `box_count * unit_price`다.
3. `summary.total_amount`는 요청 window 안 각 일자의 `total_amount` 합이다.
4. `settlement_type`는 `regular | special`이면 1차에 충분하다.
5. `box_count`는 중복 노출이 있더라도 settlement payload에 같이 실어 주는 편이 앱 재사용에 유리하다.
6. `daily_delivery_input_snapshot_id`는 후속 inquiry attachment reference key로 계속 재사용 가능해야 한다.
7. 이 endpoint는 `driver_id` 존재 여부를 driver profile 쪽에 다시 확인하지 않는다.

### Request 2. Driver `Me` Settlement Calendar Facade

#### Goal

앱은 `driver_id`를 직접 몰라도 세션 기준 `me` route만 사용하게 한다.

#### Recommended Owner

- `service-driver-operations-view`

#### Recommended Endpoint

- `GET /api/driver-ops/me/settlement-calendar/?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD`

#### Recommended Response Shape

linked 상태:

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

`needs_link` 상태:

```json
{
  "status": "needs_link",
  "results": []
}
```

#### Role

1. active `driver_account_link` 해석
2. `needs_link` 처리
3. upstream `settlement-ops` daily settlement read fan-out
4. app-friendly wrapper 반환

#### Why This Is Separate

이 facade는 app 편의 layer일 뿐이고, settlement 조립 규칙의 owner는 아니다.

## Estimate

기준:

- `1 MD = 개발자 1인 1일`
- 아래 공수는 코드 + 테스트 + 문서 + route/openapi 반영 기준이다.
- QA/운영 일정은 별도 버퍼를 둔다.

| 항목 | 대상 repo | 내용 | 예상 공수 |
| --- | --- | --- | --- |
| Payroll day-level settlement truth | `service-settlement-payroll` | shared derivation service, driver daily upstream source, tests | `2.0 ~ 3.0 MD` |
| Driver daily settlement read | `service-settlement-operations-view` | payroll truth consumption, snapshot enrichment, external endpoint, tests | `2.0 ~ 3.0 MD` |
| Driver `me` settlement calendar facade | `service-driver-operations-view` | active link 해석, `needs_link` 분기, settlement-ops fan-out wrapper, tests | `1.5 ~ 2.0 MD` |
| Docs / gateway / openapi / smoke | root docs + `edge-api-gateway` | contract 문서, endpoint registration, schema refresh, smoke update | `0.5 ~ 1.0 MD` |

**합계:** `6.0 ~ 9.0 MD`

## Recommended Delivery Order

권장 순서는 아래다.

1. `service-settlement-payroll`에 day-level settlement truth 추가
2. `service-settlement-operations-view`에 daily settlements read 추가
3. `service-driver-operations-view`에 `me/settlement-calendar` facade 추가
4. `edge-api-gateway`와 openapi, smoke를 같이 반영

## Non-Goals

이 문서는 아래를 포함하지 않는다.

1. settlement inquiry chat
2. rich attachment upload
3. multiple room
4. operator reply workflow
5. inquiry thread persistence
