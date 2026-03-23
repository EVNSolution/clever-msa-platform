# Planned Business Domain Skeleton Targets 디자인

## 목적

이 문서는 추가 계획 대상 큰 업무 단위를 실제 target repo 이름과 empty shell 상태로 내리기 위한 설계 문서다.

이번 설계의 목표는 아래와 같다.

1. 큰 업무 단위를 target repo 후보 이름으로 고정한다.
2. 아직 runtime이 없는 영역을 empty shell 수준에서 먼저 문서화한다.
3. 이후 skeleton 생성 시 naming을 다시 흔들지 않도록 기준을 만든다.

## 스코프

이번 설계에 포함하는 범위는 아래와 같다.

1. `배차`, `인사문서`, `권역분석`, `알림`, `공지 / 지원`의 target repo 이름
2. 각 planned target repo의 현재 역할
3. 각 planned target repo의 미래 역할
4. planned target repo 간 기본 관계

## 비스코프

이번 설계에 포함하지 않는 것은 아래와 같다.

1. 실제 skeleton 디렉토리 생성
2. README 작성
3. API / 스키마 설계
4. rollout 순서 상세
5. service-local 문서 승격

## 설계 원칙

1. 기존 naming rule을 최대한 재사용한다.
2. `operations-view`는 읽기 모델에만 사용한다.
3. 정본 성격이 강한 서비스는 `registry`를 우선 사용한다.
4. `공지 / 지원`은 큰 단위는 같이 보되 repo는 분리한다.
5. 이번 단계에서는 모두 `empty-shell`로 두고 runtime 구현은 하지 않는다.

## Planned Target Repo Set

이번에 고정하는 target repo는 아래 여덟 개다.

- `service-dispatch-registry`
- `service-dispatch-operations-view`
- `service-personnel-document-registry`
- `service-region-registry`
- `service-region-analytics`
- `service-notification-hub`
- `service-announcement-registry`
- `service-support-registry`

## 1. Dispatch

### `service-dispatch-registry`

현재 역할:

- 날짜 / 플릿 / 회차 기준의 배차 정본
- 물량 계획
- 기사 배치 계획
- 예외 / 가용성 / 일정성 입력

미래 역할:

- 배차 기준 정본
- 이후 `service-vehicle-assignment`와 연결되는 상위 계획 축

### `service-dispatch-operations-view`

현재 역할:

- 배차 운영 조회
- 날짜 / 플릿 / 회차 기준 계획 상태 요약

미래 역할:

- 배차 상황판
- 계획 대비 실제 배정/실행 차이 조회

## 2. Personnel Documents

### `service-personnel-document-registry`

현재 역할:

- 계약, 증빙, 계좌, 사업자, 소속 문서의 정본
- 파일 중심 aggregate

미래 역할:

- 승인 / 정산 / 조직 / 배차와 연결되는 문서 마스터

## 3. Region Analytics

### `service-region-registry`

현재 역할:

- 권역 polygon
- 권역 난이도
- 권역 기준 마스터

미래 역할:

- 권역 기준 정본
- 권역 분석의 입력 축

### `service-region-analytics`

현재 역할:

- 권역별 배송 통계
- 권역 성과 분석

미래 역할:

- 권역 비교 분석
- 이후 지도 / 추천 기능과의 연결

## 4. Notifications

### `service-notification-hub`

현재 역할:

- 푸시 토큰 관리
- 푸시 발송
- 발송 로그
- 일반 알림함

미래 역할:

- 결재 / 정산 / 공지 / 지원 이벤트의 공통 알림 채널

## 5. Announcements / Support

### `service-announcement-registry`

현재 역할:

- 공지 게시 정본
- 게시 상태와 게시 범위 관리

미래 역할:

- 운영 공지 게시판 정본

### `service-support-registry`

현재 역할:

- 문의 / 티켓 / 응답 / 처리 상태 정본

미래 역할:

- 운영 지원 workflow의 기준 정본
- 이후 필요 시 support read-model의 upstream

## 관계 원칙

1. `service-dispatch-registry`는 `service-vehicle-assignment`를 대체하지 않는다.
2. `service-personnel-document-registry`는 `service-driver-profile`를 다시 비대화하지 않는 방향으로 분리한다.
3. `service-region-registry`와 `service-region-analytics`는 `vehicle-operations-view` 안으로 흡수하지 않는다.
4. `service-notification-hub`는 `service-announcement-registry`, `service-support-registry`와 분리한다.
5. `service-announcement-registry`와 `service-support-registry`는 같은 큰 단위로 보되 정본 repo는 분리한다.

## 문서 상태

이번 문서에서 고정하는 상태는 아래와 같다.

1. 위 여덟 개 repo 이름은 skeleton naming 정본이다.
2. shell 디렉토리와 README는 생성됐고 상태는 `empty-shell`이다.
3. runtime 구현은 아직 하지 않는다.
4. 이후 runtime 착수 전까지 이 문서를 naming 정본으로 사용한다.

## 완료 기준

1. 추가 큰 업무 단위가 target repo 이름까지 내려온다.
2. 여덟 개 planned target repo 이름이 고정된다.
3. 각 repo의 현재 역할과 미래 역할이 최소 수준으로 정리된다.
4. 다음 단계에서 shell 생성 시 naming을 다시 논쟁하지 않아도 된다.
