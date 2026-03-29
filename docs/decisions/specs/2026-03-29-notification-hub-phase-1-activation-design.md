# Notification Hub Phase 1 Activation 디자인

## 목적

이 문서는 `service-notification-hub`를 마지막 empty shell에서 1차 runtime으로 승격하기 위한 최소 경계와 구현 범위를 고정한다.

이번 설계의 목표는 아래와 같다.

1. `service-notification-hub`를 알림 채널 runtime으로 활성화한다.
2. 공지 / 지원 정본과 알림 전달 채널을 분리한 현재 문서 경계를 실제 runtime 구조로 내린다.
3. `token registry`, `push send`, `push log`, `general inbox`까지를 1차 범위로 고정한다.
4. local stack, gateway, API docs가 새 runtime을 일관되게 반영하도록 기준을 만든다.

## 스코프

이번 설계에 포함하는 범위는 아래와 같다.

1. `service-notification-hub` 1차 runtime의 역할 정의
2. 토큰 / inbox / push log 엔티티 3종의 ownership과 최소 필드 정의
3. 외부 route, compose service naming, auth 기준 정의
4. local seed와 최소 검증 기준 정의
5. API docs 반영 기준 정의

## 비스코프

이번 설계에서는 아래 항목을 다루지 않는다.

1. 실제 FCM 외부 전송 연동
2. 이메일 / SMS / 카카오 채널
3. 공지 게시 정본
4. 문의 / 티켓 / 응답 정본
5. approval truth
6. websocket / realtime fan-out
7. batch retry / scheduler

## 현재 상태

현재 문서 기준 사실은 아래와 같다.

1. `service-notification-hub`는 `empty shell` 상태다.
2. 이 repo의 현재 역할은 `token registry`, `push send`, `push log`, `general inbox notifications`다.
3. `service-announcement-registry`는 공지 게시 정본 runtime으로 이미 활성화됐다.
4. `service-support-registry`는 문의 / 티켓 / 응답 정본 runtime으로 이미 활성화됐다.
5. legacy 기준 `/api/notifications/general/*`, `/api/notifications/fcm/*` namespace가 문서에 남아 있다.

즉 지금 필요한 것은 알림 전달 채널의 최소 runtime 활성화이지, 공지 / 지원 정본을 다시 들여오는 것이 아니다.

## 선택된 접근

이번 설계에서는 아래 접근을 선택한다.

1. `service-notification-hub`는 `PushTokenRegistration`, `GeneralNotification`, `PushDeliveryLog` 3개 aggregate로 시작한다.
2. 외부 route는 legacy namespace와 맞춰 `/api/notifications/`를 사용한다.
3. token 등록과 own inbox read는 authenticated user 누구나 허용한다.
4. general inbox create, push send, push log read는 admin만 허용한다.
5. phase 1의 push send는 외부 provider 호출 대신 `simulated delivery log` 기록으로 시작한다.
6. send 요청에서 `create_inbox=true`면 inbox row를 같이 만든다.

이 접근을 선택한 이유는 아래와 같다.

1. 현재 문서가 요구하는 핵심은 알림 채널 경계의 활성화다.
2. 공지 / 지원 정본과 채널을 다시 합치면 이미 분리한 repo 책임이 흐려진다.
3. legacy `/api/notifications/*` namespace를 유지하면 gateway와 consumer 문서 전환이 덜 흔들린다.
4. 외부 FCM 연동까지 같이 들이면 인증키, 재시도, provider error handling이 같이 들어와 phase 1 범위를 넘는다.

## 서비스 경계

### `service-notification-hub`가 직접 소유하는 것

1. device push token registry
2. general inbox notification row
3. push send request 결과 로그
4. delivery status snapshot

### `service-notification-hub`가 소유하지 않는 것

1. announcement posting truth
2. support ticket truth
3. approval truth
4. settlement truth
5. account truth

## 엔티티 구조

### 1. `PushTokenRegistration`

최소 필드 방향:

1. `push_token_id`
2. `account_id`
3. `channel`
4. `platform`
5. `device_key`
6. `registration_token`
7. `is_active`
8. `app_version`
9. `registered_at`
10. `updated_at`

필드 규칙:

1. `channel`은 phase 1에서 `fcm`만 허용한다.
2. `platform`은 `android`, `ios`, `web`로 시작한다.
3. `account_id + device_key`는 unique다.
4. inactive token은 send target 자동 선택에서 제외한다.

### 2. `GeneralNotification`

최소 필드 방향:

1. `notification_id`
2. `recipient_account_id`
3. `category`
4. `source_type`
5. `source_ref`
6. `title`
7. `body`
8. `status`
9. `created_at`
10. `read_at`
11. `archived_at`

필드 규칙:

1. `status`는 `unread`, `read`, `archived`로 시작한다.
2. `status=read`면 `read_at`이 필요하다.
3. `status=archived`면 `archived_at`이 필요하다.
4. owner patch는 status 변경만 허용한다.

### 3. `PushDeliveryLog`

최소 필드 방향:

1. `delivery_log_id`
2. `target_account_id`
3. `push_token`
4. `channel`
5. `event_type`
6. `title`
7. `body`
8. `delivery_status`
9. `provider_message_id`
10. `failure_reason`
11. `inbox_notification`
12. `requested_by_account_id`
13. `requested_at`
14. `delivered_at`

필드 규칙:

1. `delivery_status`는 `simulated_sent`, `failed`로 시작한다.
2. active token이 없으면 `failed`로 기록한다.
3. `delivery_status=simulated_sent`면 `delivered_at`이 필요하다.
4. `delivery_status=failed`면 `failure_reason`이 필요하다.

## API / Service Naming

1차 naming은 아래로 고정한다.

1. compose service: `notification-hub-api`
2. gateway prefix: `/api/notifications/`

최소 API shape는 아래와 같다.

1. `GET /api/notifications/health/`
2. `GET/POST /api/notifications/fcm/tokens/`
3. `GET/PATCH /api/notifications/fcm/tokens/{push_token_id}/`
4. `GET/POST /api/notifications/general/`
5. `GET/PATCH /api/notifications/general/{notification_id}/`
6. `POST /api/notifications/push-sends/`
7. `GET /api/notifications/push-logs/`

원칙:

1. `GET /api/notifications/fcm/tokens/`는 `platform`, `channel`, `is_active`, `account_id` filter를 허용한다.
2. `GET /api/notifications/general/`는 `status`, `category`, `source_type`, `recipient_account_id` filter를 허용한다.
3. `GET /api/notifications/push-logs/`는 `delivery_status`, `event_type`, `target_account_id` filter를 허용한다.
4. delete는 1차에서 제공하지 않는다.

## Auth / Permission 기준

1차 auth 기준은 아래와 같다.

1. `health`만 공개
2. token register / own token read / token deactivate는 authenticated user 허용
3. own inbox read / own read-state patch는 authenticated user 허용
4. inbox create, push send, push log read는 admin만 허용
5. admin은 전체 token / inbox / log 조회가 가능하다

## Seed 기준

1차 seed는 최소 3세트를 제공한다.

포함:

1. active token 1건 이상
2. inactive token 1건 이상
3. unread inbox 1건 이상
4. archived inbox 1건 이상
5. simulated_sent log 1건 이상

원칙:

1. seed는 채널 경계를 보여 주는 최소 예시만 넣는다.
2. 실제 provider send는 수행하지 않는다.
3. seed account id는 deterministic fixture id를 사용한다.

## API Docs 반영 기준

`service-notification-hub`가 active runtime이 되면 아래 조건을 같이 만족해야 한다.

1. 서비스 자체 OpenAPI export가 가능해야 한다.
2. unified OpenAPI refresh에서 이 서비스가 schema-backed service로 잡혀야 한다.
3. local Swagger preview에서 `/api/notifications/`가 보여야 한다.

## 통합 영향

이번 1차 활성화에서 필요한 통합 반영은 아래와 같다.

1. `development/integration-local-stack/` compose에 `notification-hub-api` 추가
2. compose용 env example 추가
3. `development/edge-api-gateway/`에 `/api/notifications/` route 추가
4. local seed-runner에 notification seed 단계 추가
5. current runtime inventory에서 `service-notification-hub`를 active runtime으로 승격
6. unified OpenAPI refresh 흐름에 notification service 반영

## 문서 반영 원칙

최소한 아래 문서가 같이 갱신돼야 한다.

1. `WORKSPACE.md`
2. `repo-map.md`
3. `docs/mappings/current-to-target-repo-map.md`
4. `docs/mappings/current-runtime-inventory.md`
5. `docs/mappings/repo-responsibility-matrix.md`
6. `docs/rollout/09-remaining-empty-shell-service-priority.md`
7. `development/service-notification-hub/README.md`
8. local stack README

핵심 반영 내용:

1. `service-notification-hub`는 더 이상 empty shell이 아니다.
2. 이 repo는 token registry / push log / general inbox만 소유한다.
3. `service-announcement-registry`와 `service-support-registry`는 계속 정본 repo로 남는다.
4. 이제 empty shell backlog는 없다.

## 검증 기준

최소 검증 범위는 아래와 같다.

1. `service-notification-hub` 단위 테스트 통과
2. compose config 검증 통과
3. local seed-runner에 notification seed가 정상 반영
4. gateway 경유 `/api/notifications/health/` 응답 확인
5. login 후 token create / inbox list / push send / push log list 확인
6. unified OpenAPI refresh와 verify 통과
