# 03. Roadmap

## 문서 목적

이 문서는 현재 목표 문서 이후에 무엇을 어떤 순서로 확정할지 정하는 다음 계획 문서다.

지금 단계에서는 서비스 수를 더 늘리는 것보다, 경계가 흔들리지 않게 만드는 공통 결정 항목을 먼저 고정하는 것이 중요하다.

## 현재 기준

이미 정리된 내용은 아래와 같다.

1. 어떤 서비스로 나눌지
2. 각 서비스가 무엇을 소유하는지
3. 어떤 화면에서 과도 조인이 발생하는지
4. Account/Auth를 후순위 상세 문서로 둘지

다음 단계는 이 구조를 실제 설계 흐름으로 바꾸는 작업이다.

## 다음 계획 원칙

### 1. 상세 도메인보다 읽기 모델을 먼저 고정한다

- MSA에서 가장 먼저 깨지는 것은 조회 경험이다.
- 그래서 Driver 360, Vehicle Ops, Dispatch Control 같은 읽기 모델을 먼저 정의해야 한다.

### 2. 식별자와 상태 사전을 먼저 고정한다

- 서비스가 나뉘면 같은 대상을 서로 다른 이름과 상태로 부르기 시작한다.
- 외부 식별자와 상태 사전을 먼저 정하지 않으면 이후 문서가 계속 흔들린다.

### 3. 현행 API 매핑은 목표 구조 뒤에 붙인다

- 목표 구조가 먼저고, 현재 API 정리는 그 뒤다.
- 현행 API는 reference 문서를 기준으로 목표 서비스에 매핑한다.

## 실행 순서

### Phase 1. Read Model 정의

가장 먼저 아래 읽기 모델 축을 고정한다. 이 중 현재 라운드에서 dedicated 문서로 먼저 승격하는 것은 Driver 360과 Vehicle Ops이고, Dispatch Control은 선행 조건 정의를 `02-target-service-structure-and-join-risk-map.md`와 `08-rollout-order.md`에서 먼저 관리한다. Settlement Review Board와 Approval Inbox는 Finance/Approval 축 상세화 시 다음 라운드 후보로 둔다.

1. Driver 360
2. Vehicle Ops
3. Dispatch Control
4. Settlement Review Board
5. Approval Inbox

이 단계의 산출물

- 화면별 필요한 필드 목록
- 어떤 서비스 요약값을 가져올지
- 실시간 조회 대신 프로젝션으로 둘 항목
- Dispatch Control 선행 정의 위치 (`02-target-service-structure-and-join-risk-map.md`, `08-rollout-order.md`)

### Phase 2. 식별자와 상태 사전

다음으로 아래를 고정한다.

1. Driver 외부 식별자
2. Vehicle 외부 식별자
3. Account 외부 식별자
4. Company와 Fleet 참조 규칙
5. 서비스별 상태명과 상태 전이 기준

이 단계의 산출물

- 공통 식별자 규칙
- 상태 사전
- 서비스 간 참조 규약

### Phase 3. 현행 API 매핑

reference 문서를 기준으로 현재 API를 목표 서비스에 연결한다.

이 단계의 질문

1. 이 API는 어느 목표 서비스로 귀속되는가
2. 유지할 API인가, 분리할 API인가, 통합 또는 이름 정리 대상인가, 추가 확인 대상인가
3. 레거시 이름만 남아 있고 실제 의미는 바뀌어야 하는가

이 단계의 산출물

- 목표 서비스별 레거시 API 목록
- keep, split, merge, rename, pending 분류표

### Phase 4. 물리 분리 순서

논리 서비스를 실제 배포 단위로 자르는 순서를 정한다.

우선 후보

1. Access Platform
2. People Platform
3. Vehicle Platform
4. Operations Platform
5. Finance Platform
6. Support Platform
7. Telemetry Platform

이 단계의 산출물

- 1차 물리 분리 순서
- 서비스 간 동기 호출 허용 범위
- 이벤트 또는 프로젝션이 필요한 경계

### Phase 5. 상세 도메인 문서

위 네 단계를 거친 뒤에 개별 상세 문서를 작성한다. 현재 라운드에서는 Driver 360과 Vehicle Ops를 dedicated 문서로 먼저 올리고, Dispatch Control은 `goal/02`와 `goal/08`에서 prerequisite 정의를 유지한다. Settlement Review Board와 Approval Inbox는 Finance/Approval 축이 확정되면 별도 read model 문서로 승격한다.

우선 작성 후보

1. Driver 360 Read Model
2. Vehicle Ops Read Model
3. ID and State Dictionary
4. Legacy API Mapping
5. Rollout Order
6. Integration Rules
7. Account Auth

## 이 단계 산출 문서

Dispatch Control read model 초안은 현재 `02-target-service-structure-and-join-risk-map.md`와 `08-rollout-order.md`에 포함된 prerequisite 정의로 관리한다.

1. 04-driver-360-read-model.md
2. 05-vehicle-ops-read-model.md
3. 06-id-and-state-dictionary.md
4. 07-legacy-api-mapping.md
5. 08-rollout-order.md
6. 09-integration-rules.md
7. 10-target-account-auth-layer-plan.md
8. 11-account-driver-settlement-boundary-map.md
9. 12-account-driver-settlement-owned-data-matrix.md
10. 13-account-driver-settlement-compose-simulation.md

## 보류할 것

아래는 아직 바로 내려가지 않는다.

1. 세부 DB 스키마
2. 서비스별 테이블 분리 방식
3. 이벤트 브로커 기술 선택
4. 배포 인프라 상세 설계
