# 17. Admin Communication Pages

## 문서 목적

이 문서는 단일 웹 콘솔에서 `공지 / 지원` 화면을 어떻게 고정해서 운영하는지 current truth로 정리한다.

이번 문서는 아래를 먼저 잠근다.

1. 권한 기반 단일 웹이 어떤 communication 화면을 가진다.
2. 각 화면이 어떤 runtime truth를 읽고 쓴다.
3. 공지와 지원이 한 큰 단위로 보이더라도 write owner와 책임은 분리된다는 점을 고정한다.

## 적용 범위

- `front-web-console`
- `service-announcement-registry`
- `service-support-registry`
- `service-notification-hub`

## 기본 원칙

1. `공지`, `지원`은 운영 커뮤니케이션 영역으로 같이 보되, 정본 repo는 계속 분리한다.
2. 공지 게시 정본은 `service-announcement-registry`가 소유한다.
3. 지원 티켓과 응답 정본은 `service-support-registry`가 소유한다.
4. backend-generated notification delivery, push send, push log는 `service-notification-hub`가 소유한다.
5. 프론트 화면은 공지와 지원을 하나의 운영 경험으로 묶어 보여줄 수는 있지만, 정본 경계는 넘지 않는다.

## 단일 웹 페이지

단일 웹은 아래 두 영역을 가진다.

1. `공지`
2. `지원`

### 1. 공지

공지 화면은 아래 라우트로 고정한다.

1. `/announcements`
2. `/announcements/new`
3. `/announcements/:announcementSlug`
4. `/announcements/:announcementSlug/edit`

화면 역할은 아래처럼 고정한다.

1. 목록에서 공지 전체를 조회한다.
2. 생성과 수정은 별도 1열 폼 화면으로 연다.
3. 상세는 읽기 전용 요약과 본문 중심으로 보여준다.
4. 게시 상태, 노출 범위, 게시/종료 시각, 상단 고정, 정렬 순서를 관리한다.

### 2. 지원

지원은 `/support` 단일 화면으로 고정한다.

이 화면은 아래를 같은 문맥 안에서 처리한다.

1. 지원 티켓 목록
2. 선택된 티켓 상세
3. 티켓 상태/우선순위 수정
4. 관리자 응답 등록

관리자 응답 등록 시 동작은 아래처럼 고정한다.

1. 지원 응답 정본은 `service-support-registry`가 저장한다.
2. 응답 저장이 성공하면 `service-notification-hub`가 general inbox notification을 전달해 관련 사용자에게 알림을 전달한다.
3. 이 전달은 웹의 독립 inbox page를 전제로 하지 않으며 push send는 자동화하지 않는다.

목록 row는 최소 아래 정도를 보여주면 충분하다.

1. `route_no`
2. `제목`
3. `상태`
4. `우선순위`

상세 패널은 아래를 보여준다.

1. 요청자 `account_id`
2. 본문
3. 현재 응답 thread
4. 상태/우선순위 입력
5. 새 답변 입력

## Lower Manager Read / Self-Service

같은 route 안에서 lower manager는 published/read/self-service 위주 화면을 본다.

### 1. 공지

lower manager의 공지는 published announcement read 화면이다.

규칙:

1. draft, archived 공지는 보이지 않는다.
2. 노출 범위가 `all`, `operator`인 공지만 본다.
3. lower manager는 공지를 생성/수정하지 않는다.

### 2. 지원

lower manager의 지원은 self-service 티켓 화면이다.

이 화면은 아래를 같은 문맥 안에서 처리한다.

1. 내가 만든 지원 티켓 목록
2. 선택된 티켓 상세
3. 응답 thread 조회
4. 새 지원 요청 생성

lower manager는 자기 티켓만 본다.
티켓 상태/우선순위 수정 같은 관리자 액션은 가지지 않는다.
관리자 답변이 등록되면 관련 사용자에게 general inbox notification이 전달된다.

## 권한 해석

1. 관리자 웹의 공지 write는 `system_admin`, `company_super_admin`를 기본으로 본다.
2. 지원 티켓 처리와 notification delivery는 현재 관리자 권한 계층에서 허용된 범위만 노출한다.
3. lower manager는 원칙적으로 read/self-service 중심이다.
4. lower manager는 공지 게시, 티켓 상태 수정, 수동 push send를 하지 않는다.

## 1차 완료 기준

이 문서 기준 1차가 완료되었다고 보려면 아래가 충족되어야 한다.

1. 관리자 웹에서 공지 CRUD가 닫혀야 한다.
2. 관리자 웹에서 지원 티켓 처리와 응답 등록이 닫혀야 한다.
3. 관리자 웹에서 backend notification delivery의 독립 inbox page가 닫혀야 한다.
4. lower manager가 같은 route에서 published announcement 조회를 할 수 있어야 한다.
5. lower manager가 self-service 지원 요청과 응답 조회를 할 수 있어야 한다.
6. lower manager가 notification delivery를 별도 웹 surface 없이 수신할 수 있어야 한다.

## 연결 문서

- [10-front-ui-rules.md](10-front-ui-rules.md)
- [16-admin-dispatch-board-pages.md](16-admin-dispatch-board-pages.md)
- [../rollout/16-web-first-platform-delivery-order.md](../rollout/16-web-first-platform-delivery-order.md)
- [../decisions/specs/2026-03-26-announcement-registry-phase-1-activation-design.md](../decisions/specs/2026-03-26-announcement-registry-phase-1-activation-design.md)
- [../decisions/specs/2026-03-26-support-registry-phase-1-activation-design.md](../decisions/specs/2026-03-26-support-registry-phase-1-activation-design.md)
- [../decisions/specs/2026-03-29-notification-hub-phase-1-activation-design.md](../decisions/specs/2026-03-29-notification-hub-phase-1-activation-design.md)
