# Support Registry Phase 1 Activation 디자인

## 목적

이 문서는 `service-support-registry`를 empty shell에서 1차 runtime으로 승격하기 위한 최소 경계와 구현 범위를 고정한다.

이번 설계의 목표는 아래와 같다.

1. `service-support-registry`를 문의 / 티켓 / 응답 정본 runtime으로 활성화한다.
2. 지원 정본과 알림 채널을 분리한 현재 문서 경계를 실제 runtime 구조로 내린다.
3. 처리 상태 추적까지를 1차 범위로 고정한다.
4. local stack, gateway, API docs가 새 runtime을 일관되게 반영하도록 기준을 만든다.

## 스코프

이번 설계에 포함하는 범위는 아래와 같다.

1. `service-support-registry` 1차 runtime의 역할 정의
2. 티켓 / 응답 엔티티 2종의 ownership과 최소 필드 정의
3. 외부 route, compose service naming, auth 기준 정의
4. local seed와 최소 검증 기준 정의
5. API docs 반영 기준 정의

## 비스코프

이번 설계에서는 아래 항목을 다루지 않는다.

1. push send, inbox notification
2. 공지 게시
3. 결재 workflow
4. attachment binary storage
5. SLA dashboard
6. support read-model
7. external chatbot integration

## 현재 상태

현재 문서 기준 사실은 아래와 같다.

1. `service-support-registry`는 `empty shell` 상태다.
2. 이 repo의 현재 역할은 `문의 / 티켓 / 응답 / 처리 상태 정본`이다.
3. `service-notification-hub`는 별도 empty shell이며 전달 채널을 담당한다.
4. legacy 기준 `/api/ticket/*` namespace가 존재한다.
5. current consumer reference에는 `/api/ticket/tickets/*`, `/api/ticket/ticket-responses/*`가 적혀 있다.

즉 지금 필요한 것은 지원 정본의 최소 runtime 활성화이지, notification fan-out이나 별도 read-model을 같이 올리는 것이 아니다.

## 선택된 접근

이번 설계에서는 아래 접근을 선택한다.

1. `service-support-registry`는 `SupportTicket`, `SupportTicketResponse` 두 aggregate로 시작한다.
2. 외부 route는 legacy namespace와 맞춰 `/api/ticket/`를 사용한다.
3. ticket 생성은 authenticated user 누구나 허용한다.
4. ticket 처리 상태 patch는 admin만 허용한다.
5. response 생성은 admin 또는 ticket owner만 허용한다.
6. phase 1에서는 notification fan-out, inbox sync, support read-model을 열지 않는다.

이 접근을 선택한 이유는 아래와 같다.

1. 현재 문서가 요구하는 핵심은 `문의 / 티켓 / 응답 / 처리 상태` 정보다.
2. driver / web 소비 흔적이 이미 ticket namespace에 남아 있어 authenticated create가 자연스럽다.
3. 상태 변경 권한은 admin으로 제한해야 최소 workflow 경계가 선다.
4. response를 별도 aggregate로 두면 legacy `/ticket-responses/*`와 current ownership을 같이 만족시킬 수 있다.

## 서비스 경계

### `service-support-registry`가 직접 소유하는 것

1. ticket 식별자
2. requester account 식별자
3. ticket 제목과 본문
4. 처리 상태
5. priority
6. response 본문과 작성자 기록

### `service-support-registry`가 소유하지 않는 것

1. push send
2. inbox notification
3. 공지 게시
4. approval truth
5. attachment binary storage

## 엔티티 구조

### 1. `SupportTicket`

최소 필드 방향:

1. `ticket_id`
2. `requester_account_id`
3. `title`
4. `body`
5. `status`
6. `priority`
7. `created_at`
8. `updated_at`

필드 규칙:

1. `status`는 `open`, `in_progress`, `resolved`, `closed`로 시작한다.
2. `priority`는 `low`, `medium`, `high`로 시작한다.
3. hard delete는 1차에서 열지 않는다.

### 2. `SupportTicketResponse`

최소 필드 방향:

1. `response_id`
2. `ticket`
3. `author_account_id`
4. `author_role`
5. `body`
6. `created_at`
7. `updated_at`

필드 규칙:

1. closed ticket에는 새 response를 추가하지 않는다.
2. response는 ticket 정본의 child aggregate다.

## API / Service Naming

1차 naming은 아래로 고정한다.

1. compose service: `support-registry-api`
2. gateway prefix: `/api/ticket/`

최소 API shape는 아래와 같다.

1. `GET /api/ticket/health/`
2. `GET/POST /api/ticket/tickets/`
3. `GET/PATCH /api/ticket/tickets/{ticket_id}/`
4. `GET/POST /api/ticket/ticket-responses/`

원칙:

1. `GET /api/ticket/tickets/`는 `status`, `priority`, `requester_account_id` filter를 허용한다.
2. `GET /api/ticket/ticket-responses/`는 `ticket_id` filter를 허용한다.
3. delete는 1차에서 제공하지 않는다.

## Auth / Permission 기준

1차 auth 기준은 아래와 같다.

1. `health`만 공개
2. ticket create와 own read는 authenticated user 허용
3. 전체 ticket list와 status patch는 admin만 허용
4. response 생성은 admin 또는 ticket owner 허용

## Seed 기준

1차 seed는 최소 2세트를 제공한다.

포함:

1. open ticket 1건 이상
2. resolved ticket 1건 이상
3. response 1건 이상

원칙:

1. seed는 ticket / response / handling status를 보여 주는 최소 예시만 넣는다.
2. 알림 발송 로그는 넣지 않는다.

## API Docs 반영 기준

`service-support-registry`가 active runtime이 되면 아래 조건을 같이 만족해야 한다.

1. 서비스 자체 OpenAPI export가 가능해야 한다.
2. unified OpenAPI refresh에서 이 서비스가 schema-backed service로 잡혀야 한다.
3. local Swagger preview에서 `/api/ticket/`가 보여야 한다.

## 통합 영향

이번 1차 활성화에서 필요한 통합 반영은 아래와 같다.

1. `development/integration-local-stack/` compose에 `support-registry-api` 추가
2. compose용 env example 추가
3. `development/edge-api-gateway/`에 `/api/ticket/` route 추가
4. local seed-runner에 support seed 단계 추가
5. current runtime inventory에서 `service-support-registry`를 active runtime으로 승격
6. unified OpenAPI refresh 흐름에 support service 반영

## 문서 반영 원칙

최소한 아래 문서가 같이 갱신돼야 한다.

1. `WORKSPACE.md`
2. `repo-map.md`
3. `docs/mappings/current-to-target-repo-map.md`
4. `docs/mappings/current-runtime-inventory.md`
5. `development/service-support-registry/README.md`
6. local stack README

핵심 반영 내용:

1. `service-support-registry`는 더 이상 empty shell이 아니다.
2. 이 repo는 ticket / response / handling status 정본만 소유한다.
3. notification channel은 계속 `service-notification-hub`에 남는다.

## 검증 기준

최소 검증 범위는 아래와 같다.

1. `service-support-registry` 단위 테스트 통과
2. compose config 검증 통과
3. local seed-runner에 support seed가 정상 반영
4. gateway 경유 `/api/ticket/health/` 응답 확인
5. admin token으로 `/api/ticket/tickets/` list 확인
6. unified OpenAPI refresh와 verify 통과
