# Cheonha Driver App Settlement Inquiry Backend Request Estimate

## Purpose

이 문서는 `천하운수 배송원 앱 1차`에서 필요한 `정산 문의` 기능을
`settlement read`와 분리된 별도 backend 과제로 정리한 가견적 문서다.

이 과제는 단순 read API 추가가 아니다.
별도 persistent write owner, 신규 테이블, operator reply 흐름이 필요한 독립 과제다.

## Why This Is Separate

`settlement inquiry`는 아래 이유로 `settlement read`와 분리해야 한다.

1. read-only `ops-view`가 아니라 persistent `write` model이 필요하다.
2. `thread`, `message`, `attachment reference` 성격의 신규 테이블이 필요하다.
3. driver 앱과 operator 응대 흐름이 함께 들어간다.
4. `service-settlement-operations-view`나 `service-driver-operations-view`에 넣으면 경계가 흐려진다.

병렬 진행은 가능하다.
다만 문서, owner, branch, repo 축은 별도로 유지해야 한다.

## Scope Summary

이 문서의 범위는 아래다.

1. settlement inquiry write owner 후보 정리
2. 최소 table model 정의
3. driver/operator 최소 read-write API 정의
4. 가견적 산정

## Current State

### Already Available

- `service-settlement-operations-view`
  - latest settlement summary read는 이미 있다.
- `service-delivery-record`
  - `daily_delivery_input_snapshot_id` 정본이 있다.
- `service-support-registry`
  - generic `ticket / response / handling status` 정본 서비스다.
- `service-notification-hub`
  - general inbox / push channel 정본 서비스다.

### Not Available Yet

현재 앱 1차 화면을 그대로 연결하려면 아래가 없다.

1. 배송원 단일 누적 inquiry thread
2. message write/read contract
3. settlement attachment reference write/read contract
4. operator reply/read contract

## Boundary Decision

### 1. Not The Right Owners

아래 repo들은 기본 write owner가 아니다.

- `service-settlement-operations-view`
  - read-only runtime이라 부적절
- `service-driver-operations-view`
  - consumer facade라 persistent inquiry write owner로 부적절
- `service-delivery-record`
  - source record truth owner라 문의 thread owner로 부적절
- `service-notification-hub`
  - 채널/inbox owner지 inquiry 정본 owner가 아님

### 2. Candidate Owners

#### Option A. 신규 `service-settlement-inquiry`

권장안이다.

이유:

1. settlement 문의는 generic support와 달리 `daily snapshot reference`와 강하게 결합된다.
2. driver/operator 간 대화와 상태를 settlement 문맥으로 고정할 수 있다.
3. 후속 확장 시 settlement attachment preview, 상태 전이, operator workboard를 독립적으로 키울 수 있다.

#### Option B. `service-support-registry` 확장

가능은 하지만 1차 권장안은 아니다.

이유:

1. generic support ticket와 settlement-specific inquiry가 같은 aggregate에 섞인다.
2. attachment reference와 settlement 문맥 필드가 support 정본을 오염시킬 수 있다.
3. 향후 driver general support와 settlement objection workflow가 다시 갈라질 가능성이 크다.

### 3. Recommendation

현재 기준으로는 아래가 가장 안전하다.

1. 신규 `service-settlement-inquiry`를 write owner로 본다.
2. `service-notification-hub`는 후속 inbox/push handoff만 맡긴다.
3. `service-settlement-operations-view`는 inquiry attachment preview에 필요한 read source 역할만 유지한다.

## Minimum Table Model

### 1. `SettlementInquiryThread`

최소 필드 방향:

1. `thread_id`
2. `driver_id`
3. `driver_account_id`
4. `status`
5. `latest_message_at`
6. `created_at`
7. `updated_at`

필드 규칙:

1. phase 1은 `driver 당 active thread 1개`로 시작한다.
2. `status`는 `open`, `answered`, `closed` 정도면 충분하다.
3. hard delete는 열지 않는다.

### 2. `SettlementInquiryMessage`

최소 필드 방향:

1. `message_id`
2. `thread_id`
3. `author_scope`
4. `author_account_id`
5. `message`
6. `created_at`

필드 규칙:

1. `author_scope`는 `driver | operator`로 시작한다.
2. phase 1은 edit/delete를 열지 않는다.
3. empty message는 허용하지 않는다.

### 3. `SettlementInquiryAttachmentReference`

최소 필드 방향:

1. `attachment_reference_id`
2. `message_id`
3. `daily_delivery_input_snapshot_id`
4. `service_date`
5. `created_at`

필드 규칙:

1. phase 1은 binary file upload를 넣지 않는다.
2. attachment는 `daily_delivery_input_snapshot_id` reference만 저장한다.
3. preview 계산은 read 시점에 settlement source를 fan-out해서 만든다.

## Minimum API Contract

### Driver Side

권장 namespace:

- `GET /api/settlement-inquiries/me/thread/`
- `GET /api/settlement-inquiries/me/messages/`
- `POST /api/settlement-inquiries/me/messages/`

메시지 단독 생성:

```json
{
  "message": "특근인데 일반 정산 됐어요."
}
```

메시지 + settlement attachment 생성:

```json
{
  "message": "박스수 14개인데 1개 빠졌어요.",
  "attachment": {
    "daily_delivery_input_snapshot_id": "20000000-0000-0000-0000-000000000001"
  }
}
```

### Operator Side

최소 범위:

- `GET /api/settlement-inquiries/threads/`
- `GET /api/settlement-inquiries/threads/<thread_id>/messages/`
- `POST /api/settlement-inquiries/threads/<thread_id>/messages/`
- `PATCH /api/settlement-inquiries/threads/<thread_id>/`

phase 1의 status patch는 `open`, `answered`, `closed` 정도만 다루면 충분하다.

## Attachment Preview Rule

phase 1 원칙은 아래와 같다.

1. inquiry 서비스는 attachment truth를 직접 소유하지 않는다.
2. 저장은 `daily_delivery_input_snapshot_id` reference만 한다.
3. 읽을 때 `service-settlement-operations-view` 또는 settlement read source를 fan-out해서 preview를 만든다.
4. 정산 금액 preview를 inquiry DB에 복제 저장하지 않는다.

이 원칙을 두는 이유는 정산 truth와 inquiry persistence를 섞지 않기 위해서다.

## Estimate

기준:

- `1 MD = 개발자 1인 1일`
- 아래 공수는 코드 + 테스트 + 문서 + route/openapi 반영 기준이다.
- owner decision이 바뀌면 일부 공수는 달라질 수 있다.

| 항목 | 대상 repo | 내용 | 예상 공수 |
| --- | --- | --- | --- |
| Inquiry owner decision / boundary docs | root docs | 신규 write owner 확정, 경계/계약 문서 반영 | `0.5 ~ 1.0 MD` |
| Inquiry runtime + tables | owner 미정, 권장 `service-settlement-inquiry` | thread/message/reference 모델, auth, serializer, tests | `4.5 ~ 6.5 MD` |
| Operator reply / status API | owner 미정 | operator reply, list/read, status patch, tests | `2.0 ~ 3.0 MD` |
| Docs / gateway / openapi / smoke | root docs + gateway | endpoint registration, schema refresh, smoke update | `0.5 ~ 1.0 MD` |

**합계:** `7.5 ~ 11.5 MD`

이 숫자는 owner가 아직 최종 확정되지 않았기 때문에 **가견적**이다.

## Recommended Delivery Rule

병렬 진행을 하더라도 아래 원칙으로 쪼개는 것이 맞다.

1. settlement read와 같은 문서/브랜치로 묶지 않는다.
2. 신규 write owner가 확정되기 전에는 `ops-view` repo에 임시 inquiry write를 넣지 않는다.
3. phase 1은 `single thread + message + settlement attachment reference`까지만 닫는다.

## Non-Goals

이 문서는 아래를 포함하지 않는다.

1. rich file upload
2. multiple inquiry room
3. mention
4. read receipt
5. websocket realtime
6. push delivery 자체의 정본 ownership
