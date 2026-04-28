# Cheonha Driver App Backend Request Estimate

## Purpose

이 문서는 `천하운수 배송원 앱 1차`에서 나온 백엔드 요청을
**서비스 경계와 구현 성격에 따라 2개 트랙으로 분리**하기 위한 안내 문서다.

병렬 진행은 가능하다.
다만 아래 두 항목은 같은 owner, 같은 테이블 모델, 같은 repo 축으로 다루면 안 된다.

1. `settlement read API`
2. `settlement inquiry API`

## Why Split

### Track A. Settlement Read

- 기존 active runtime 위에서 확장 가능한 `read` 과제다.
- 주 owner는 `service-settlement-operations-view`로 비교적 명확하다.
- app session 기준 `me` facade는 `service-driver-operations-view`로 자연스럽게 연결된다.

### Track B. Settlement Inquiry

- 신규 persistent `write` model이 필요한 과제다.
- 별도 thread/message/reference 테이블이 필요하다.
- `service-settlement-operations-view`나 `service-driver-operations-view`에 넣으면 경계가 흐려진다.
- 별도 owner decision과 별도 견적이 필요하다.

## Document Split

### Track A

- [2026-04-21-cheonha-driver-app-settlement-read-backend-request-estimate.md](./2026-04-21-cheonha-driver-app-settlement-read-backend-request-estimate.md)

이 문서는 아래만 다룬다.

1. driver daily settlement read
2. driver `me` settlement calendar facade
3. docs / gateway / openapi / smoke 반영

### Track B

- [2026-04-21-cheonha-driver-app-settlement-inquiry-backend-request-estimate.md](./2026-04-21-cheonha-driver-app-settlement-inquiry-backend-request-estimate.md)

이 문서는 아래만 다룬다.

1. settlement inquiry write owner decision
2. 신규 thread/message/reference table 방향
3. driver/operator read-write API 최소 세트
4. 별도 가견적

## Working Rule

병렬 진행을 하더라도 아래 원칙은 유지한다.

1. Track A와 Track B는 별도 문서로 본다.
2. Track A와 Track B는 별도 branch / PR / implementation plan으로 다룬다.
3. Track B의 신규 write owner가 확정되기 전에는 `ops-view` 계열 repo에 inquiry write를 넣지 않는다.

## Recommendation

일정은 병렬로 잡아도 된다.
다만 실행 단위는 아래처럼 분리하는 것이 맞다.

1. Track A는 바로 구현 준비 대상으로 진행
2. Track B는 owner decision과 table 설계를 먼저 고정한 뒤 별도 구현으로 진행
