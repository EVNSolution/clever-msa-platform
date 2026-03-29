# 11. Final Phase Feature Backlog

## 문서 목적

이 문서는 현재 active runtime 위에 마지막 단계에서 붙일 기능 확장 backlog를 고정한다.

이번 문서는 아래 원칙을 따른다.

1. 정본 경계를 새로 나누는 구조 개편은 여기 넣지 않는다.
2. phase 1 runtime이 이미 성립한 서비스의 후속 기능만 넣는다.
3. `10-phase-1-runtime-refactor-priority.md`의 정리가 먼저다.

## 범위

이번 문서의 대상은 아래 네 서비스다.

1. `service-notification-hub`
2. `service-announcement-registry`
3. `service-support-registry`
4. `service-region-analytics`

## backlog

1. `service-notification-hub`
2. `service-announcement-registry`
3. `service-support-registry`
4. `service-region-analytics`

## 항목별 내용

### 1. `service-notification-hub`

현재 문서상 final phase 후보는 아래다.

1. 실제 FCM 외부 전송 연동
2. 이메일 / SMS / 카카오 채널
3. websocket / realtime fan-out
4. batch retry / scheduler

이 항목들은 모두 phase 1 설계에서 비스코프로 뒀다.

### 2. `service-announcement-registry`

현재 문서상 final phase 후보는 아래다.

1. 공지 읽음 처리
2. 공지 첨부파일 metadata
3. public announcement feed
4. batch publish scheduler

이 항목들은 phase 1 설계와 README에서 아직 포함하지 않음으로 남아 있다.

### 3. `service-support-registry`

현재 문서상 final phase 후보는 아래다.

1. notification fan-out
2. inbox sync
3. SLA dashboard
4. support read-model
5. attachment binary storage
6. external chatbot integration

이 항목들도 phase 1 설계와 README에서 후속 범위로 남아 있다.

### 4. `service-region-analytics`

현재 문서상 final phase 후보는 아래다.

1. delivery / dispatch service의 실시간 fan-in 집계
2. ranking 전용 read endpoint
3. route recommendation
4. 지도 / 추천 기능 연결
5. operator-facing analytics read API

이 항목들은 phase 1 설계와 README에서 후속 범위로 남아 있다.

## 제외 항목

아래는 이 문서의 범위가 아니다.

1. `settlement phase 2`
2. `Vehicle Ops Phase 2`

이 둘은 기능 추가라기보다 구조 개편 축에 가깝고, 이미 별도 decision 문서가 있다.

## 진행 순서

1. phase 1 runtime refactor 정리
2. 구조 개편 축 여부 재판단
3. final phase feature backlog 우선순위 재조정
4. 서비스별 implementation plan 작성

## 연결 문서

- `10-phase-1-runtime-refactor-priority.md`
- `../decisions/specs/2026-03-29-notification-hub-phase-1-activation-design.md`
- `../decisions/specs/2026-03-26-announcement-registry-phase-1-activation-design.md`
- `../decisions/specs/2026-03-26-support-registry-phase-1-activation-design.md`
- `../decisions/specs/2026-03-27-region-analytics-phase-1-activation-design.md`
- `../decisions/specs/2026-03-23-settlement-phase-2-decomposition-design.md`
- `../decisions/specs/2026-03-20-vehicle-ops-phase-1-design.md`
