# Announcement Registry Phase 1 Activation 디자인

## 목적

이 문서는 `service-announcement-registry`를 empty shell에서 1차 runtime으로 승격하기 위한 최소 경계와 구현 범위를 고정한다.

이번 설계의 목표는 아래와 같다.

1. `service-announcement-registry`를 공지 게시 정본 runtime으로 활성화한다.
2. 공지 정본과 알림 채널을 분리한 현재 문서 경계를 실제 runtime 구조로 내린다.
3. 게시 상태와 게시 범위 관리까지를 1차 범위로 고정한다.
4. local stack, gateway, API docs가 새 runtime을 일관되게 반영하도록 기준을 만든다.

## 스코프

이번 설계에 포함하는 범위는 아래와 같다.

1. `service-announcement-registry` 1차 runtime의 역할 정의
2. 공지 엔티티 1종의 ownership과 최소 필드 정의
3. 외부 route, compose service naming, auth 기준 정의
4. local seed와 최소 검증 기준 정의
5. API docs 반영 기준 정의

## 비스코프

이번 설계에서는 아래 항목을 다루지 않는다.

1. push, inbox, FCM token, 발송 로그
2. 공지 읽음 처리
3. 공지 첨부파일 관리
4. 이메일 템플릿과 발송
5. 문의, 티켓, 응답 workflow
6. public announcement feed
7. batch publish scheduler

## 현재 상태

현재 문서 기준 사실은 아래와 같다.

1. `service-announcement-registry`는 `empty shell` 상태다.
2. 이 repo의 현재 역할은 `공지 게시 정본`, `게시 상태`, `게시 범위 관리`다.
3. `service-notification-hub`는 별도 empty shell이며 전달 채널을 담당한다.
4. `service-support-registry`는 별도 empty shell이며 문의 / 티켓 / 응답 정본을 담당한다.
5. legacy 기준 `/api/announcements/*` namespace가 존재한다.

즉 지금 필요한 것은 공지 정본의 최소 runtime 활성화이지, 알림 채널이나 지원 workflow를 같이 올리는 것이 아니다.

## 선택된 접근

이번 설계에서는 아래 접근을 선택한다.

1. `service-announcement-registry`는 `Announcement` 단일 aggregate CRUD로 시작한다.
2. 공지 상태는 `draft`, `published`, `archived` enum으로 시작한다.
3. 게시 범위는 `all`, `driver`, `operator` enum으로 시작한다.
4. 외부 route는 legacy namespace와 맞춰 `/api/announcements/`를 사용한다.
5. 모든 read와 write API는 admin-authenticated management API로 시작한다.
6. phase 1에서는 notification fan-out, inbox sync, support linkage를 열지 않는다.

이 접근을 선택한 이유는 아래와 같다.

1. 현재 문서가 요구하는 핵심은 `공지 게시 정본` 확보다.
2. 게시 정본과 전달 채널을 분리해야 `service-notification-hub` 역할이 흐려지지 않는다.
3. legacy `/api/announcements/*` namespace를 유지하면 향후 문서와 gateway 전환이 덜 흔들린다.
4. public read나 읽음 처리까지 같이 열면 repo 이름과 current responsibility matrix를 넘어선다.

## 서비스 경계

### `service-announcement-registry`가 직접 소유하는 것

1. 공지 식별자와 slug
2. 공지 제목과 본문
3. 게시 상태
4. 게시 범위
5. 게시 시각과 만료 시각
6. pinned 여부와 display order

### `service-announcement-registry`가 소유하지 않는 것

1. push send
2. FCM token registry
3. inbox notifications
4. notification delivery log
5. inquiry / ticket / response workflow
6. approval truth

## 엔티티 구조

### 1. `Announcement`

역할:

1. 운영 공지 게시 정본
2. 게시 상태와 게시 범위의 기준 식별자 제공

최소 필드 방향:

1. `announcement_id`
2. `slug`
3. `title`
4. `body`
5. `status`
6. `exposure_scope`
7. `published_at`
8. `expires_at`
9. `is_pinned`
10. `display_order`

필드 규칙:

1. `slug`는 unique다.
2. `status`는 `draft`, `published`, `archived`로 시작한다.
3. `exposure_scope`는 `all`, `driver`, `operator`로 시작한다.
4. `status=published`면 `published_at`이 필요하다.
5. `expires_at`이 있으면 `published_at`보다 뒤여야 한다.
6. hard delete는 1차에서 열지 않는다.

이번 1차에서 넣지 않는 것:

1. attachment metadata
2. read receipt
3. audience group targeting
4. localized content
5. publish approval workflow

## API / Service Naming

1차 naming은 아래로 고정한다.

1. compose service: `announcement-registry-api`
2. gateway prefix: `/api/announcements/`

최소 API shape는 아래와 같다.

1. `GET /api/announcements/health/`
2. `GET/POST /api/announcements/`
3. `GET/PATCH /api/announcements/{announcement_id}/`

원칙:

1. `GET /api/announcements/`는 `status`, `exposure_scope`, `slug` filter를 허용한다.
2. delete는 1차에서 제공하지 않는다.
3. public feed endpoint는 추가하지 않는다.

## Auth / Permission 기준

1차 auth 기준은 아래와 같다.

1. `health`만 공개
2. CRUD API는 admin-authenticated management API
3. operator-facing read API, public API, machine-auth는 이번 라운드에 포함하지 않는다

## Seed 기준

1차 seed는 최소 2세트를 제공한다.

포함:

1. published announcement 1건 이상
2. draft announcement 1건 이상
3. 서로 다른 `exposure_scope`

원칙:

1. seed는 공지 정본과 publish/exposure validation을 보여 주는 최소 예시만 넣는다.
2. 발송 로그나 읽음 데이터는 넣지 않는다.

## API Docs 반영 기준

`service-announcement-registry`가 active runtime이 되면 아래 조건을 같이 만족해야 한다.

1. 서비스 자체 OpenAPI export가 가능해야 한다.
2. unified OpenAPI refresh에서 이 서비스가 schema-backed service로 잡혀야 한다.
3. local Swagger preview에서 `/api/announcements/`가 보여야 한다.

## 통합 영향

이번 1차 활성화에서 필요한 통합 반영은 아래와 같다.

1. `development/integration-local-stack/` compose에 `announcement-registry-api` 추가
2. compose용 env example 추가
3. `development/edge-api-gateway/`에 `/api/announcements/` route 추가
4. local seed-runner에 announcement seed 단계 추가
5. current runtime inventory에서 `service-announcement-registry`를 active runtime으로 승격
6. unified OpenAPI refresh 흐름에 announcement service 반영

이번 라운드에서 하지 않는 것:

1. `service-notification-hub` 활성화
2. support workflow merge
3. front UI integration
4. public announcement read API

## 문서 반영 원칙

최소한 아래 문서가 같이 갱신돼야 한다.

1. `WORKSPACE.md`
2. `repo-map.md`
3. `docs/mappings/current-to-target-repo-map.md`
4. `docs/mappings/current-runtime-inventory.md`
5. `docs/mappings/repo-responsibility-matrix.md`
6. `development/service-announcement-registry/README.md`
7. local stack README

핵심 반영 내용:

1. `service-announcement-registry`는 더 이상 empty shell이 아니다.
2. 이 repo는 공지 정본만 소유한다.
3. notification channel은 계속 `service-notification-hub`에 남는다.
4. support workflow는 계속 `service-support-registry`에 남는다.

## 검증 기준

최소 검증 범위는 아래와 같다.

1. `service-announcement-registry` 단위 테스트 통과
2. compose config 검증 통과
3. local seed-runner에 announcement seed가 정상 반영
4. gateway 경유 `/api/announcements/health/` 응답 확인
5. admin token으로 `/api/announcements/` list 확인
6. unified OpenAPI refresh와 verify 통과
