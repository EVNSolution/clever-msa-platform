# CLEVER Operational Hardening

## Purpose

이 문서는 현재 `CLEVER` MSA 운영 상태를 “배포는 된다” 수준에서 “운영이 안전하다” 수준으로 끌어올리기 위한 운영 안정화 설계를 고정한다.

이번 문서의 목표는 아래다.

1. 현재 dev에서 이미 검증된 배포 구조 위에 어떤 운영 규칙이 더 필요한지 정리한다.
2. seed, health, smoke, rollback, observability를 하나의 운영 hardening 트랙으로 묶는다.
3. 각 항목을 환경별 정책으로 내려갈 수 있도록 상위 원칙을 고정한다.

이 문서는 실행 체크리스트가 아니라 운영 안정화 상위 설계 문서다.

## Current State

현재 기준으로 이미 확보된 상태는 아래다.

- 중앙 배포 레이어는 dev에서 실제 검증됐다.
- `GitHub Actions + AWS OIDC + EC2 + SSM + compose` 경로가 동작한다.
- preflight remote host check가 있다.
- 일부 서비스와 묶음 배포가 성공했다.
- seed admin 계정이 `account-db`에 실제 저장되고 DB 재기동 후에도 유지되는 것이 확인됐다.

하지만 아직 운영 기준으로는 아래가 부족하다.

- HTTP health와 기능 smoke가 최소 수준이다.
- seed 정책이 환경별로 명시적으로 정리되어 있지 않다.
- rollback 기준은 문서가 있어도 실제 운영 decision rule이 약하다.
- 장애 시 어디를 먼저 볼지와 최소 관측 포인트가 약하다.

즉, 현재 상태는 “배포 성공”은 확보했지만 “운영 규칙”은 아직 약하다.

## Primary Decision

운영 안정화는 아래 다섯 축을 묶어 하나의 hardening 트랙으로 관리한다.

1. seed policy
2. health checks
3. smoke checks
4. rollback rules
5. observability baseline

이 다섯 개는 별도 문제처럼 보이지만, 실제 운영에서는 함께 작동한다.

예를 들어:

- seed 정책이 불분명하면 초기 배포와 rollback이 꼬인다.
- health가 약하면 smoke와 rollback 판단이 흔들린다.
- observability가 약하면 health 실패 원인 분리가 느려진다.

따라서 이 다섯 항목을 한 운영 트랙으로 묶는다.

## Why This Track Matters Now

### 1. 지금부터는 “동작”보다 “반복 운영”이 중요하다

현재 dev에서 배포 성공은 이미 확인했다.

이제 필요한 것은 아래다.

- 같은 실패를 반복하지 않기
- 장애 시 빠르게 원인 지점 찾기
- 배포 성공과 서비스 정상 동작을 구분하기

### 2. prod cutover 전 필수 전제다

prod로 가기 전에 아래는 명확해야 한다.

- 어떤 seed가 허용되는가
- 어떤 health가 살아 있어야 정상인가
- smoke 실패 시 즉시 rollback 하는가
- 운영자가 어디를 먼저 보는가

즉, 이 문서는 prod 이전에 반드시 닫혀야 한다.

## Hardening Scope

이번 트랙의 범위는 아래다.

### A. Seed Policy

- 어떤 환경에서 어떤 seed를 허용하는가
- 초기 admin 계정과 기본 비밀번호 정책
- 재시드 허용 여부
- idempotent command 보장 범위

### B. Health Checks

- 컨테이너가 떠 있는가
- 앱 health endpoint가 응답하는가
- gateway를 통한 end-to-end route가 살아 있는가

### C. Smoke Checks

- 로그인 화면 렌더링
- 핵심 API 응답
- 최소 핵심 업무 플로우 확인

### D. Rollback Rules

- 어떤 실패면 rollback 하는가
- 누가 rollback decision을 내리는가
- 무엇을 기준으로 이전 상태로 되돌리는가

### E. Observability Baseline

- gateway/app/db 로그 확인 경로
- 배포/실패 이력 확인 경로
- 최소한의 triage 순서

## Seed Policy Decision

seed는 “개발 편의 기능”이 아니라 운영 정책으로 다룬다.

### Current Problem

현재는 dev에서 `seed_accounts` 같은 명령이 유효하게 동작하고, 실제 admin 계정도 DB에 저장되는 것이 확인됐다.

하지만 환경별 허용 범위는 아직 문서화되지 않았다.

### Decision

seed 정책은 환경별로 분리한다.

#### dev

- bootstrap seed 허용
- idempotent seed command 허용
- 기본 계정/기본 데이터 seed 허용

#### stage

- 명시적 승인된 seed만 허용
- 자동 seed는 최소화
- 테스트용 계정/데이터는 환경 의도에 맞게 제한

#### prod

- 자동 bootstrap seed 금지 원칙
- 필요한 경우 명시적 운영 절차로만 수행
- 기본 비밀번호/기본 계정 seed는 운영 승인 없이는 허용하지 않음

### Implication

현재 dev에서 확인한 `seed-admin@example.com / imjing12!`는 dev용 검증 상태일 뿐이다.

이 계정 모델을 prod 정책으로 그대로 가져가면 안 된다.

## Health Check Decision

health는 최소 3계층으로 나눈다.

### Layer 1. Runtime Health

- 컨테이너/프로세스가 떠 있는가
- compose 상태가 `Up`인가

이건 가장 낮은 단계다.

### Layer 2. Application Health

- 각 서비스가 HTTP health endpoint를 응답하는가
- DB 연결과 필수 dependency가 살아 있는가

### Layer 3. Route Health

- 실제 사용자 진입 경로를 따라 `/`, `/api/*`가 정상 동작하는가
- gateway를 통과한 경로가 정상인가

### Decision

운영 기준 건강성 판단은 `Layer 1`만으로 하지 않는다.

최소 `Layer 2`와 핵심 경로의 `Layer 3`가 있어야 “정상”으로 본다.

## Smoke Check Decision

smoke는 “서비스가 켜졌는가”가 아니라 “핵심 기능이 최소 동작하는가”를 확인한다.

### Minimum Smoke Set

1. front root page render
2. login page render
3. 핵심 공개 API 1개 응답
4. 인증이 필요한 핵심 API 1개 응답
5. 대표 서비스 1개 이상의 read path 응답

### Example Current Candidates

- `GET /`
- `GET /api/org/companies/public/`
- 로그인 화면 렌더링
- seed admin 기준 인증 smoke

### Decision

smoke는 배포 후 선택 사항이 아니라, 적어도 dev/stage에서는 자동 또는 반자동 절차로 포함한다.

prod에서는 첫 rollout과 주요 변경 시 필수 gate로 본다.

## Rollback Rule Decision

rollback은 “실패했으니 감으로 되돌린다”가 아니라 규칙 기반으로 다룬다.

### Decision Inputs

rollback 판단은 아래를 본다.

1. health failure
2. smoke failure
3. core route outage
4. auth/login failure
5. 데이터 무결성/seed 이상

### Decision Rule

- preflight 실패: 배포 중단, rollback 불필요
- deploy success but smoke failure: rollback 후보
- route outage or auth failure: 우선 rollback 검토
- 데이터 변경이 동반된 배포는 rollback 기준을 별도 명시

### Important Constraint

현재 계약이 source deploy이든 이후 image deploy이든, rollback 기준은 운영 문서에서 동일한 decision frame을 유지해야 한다.

즉 rollback 매체는 바뀌어도 rollback 판단 규칙은 운영 기준으로 고정해야 한다.

## Observability Baseline Decision

이번 단계에서 완전한 observability stack을 도입하는 것이 목표는 아니다.

대신 최소 운영 triage 기준을 고정한다.

### Minimum Required Signals

1. GitHub Actions run result
2. SSM command result
3. gateway 로그
4. target service 로그
5. DB container 상태와 연결 확인

### Minimum Triage Order

장애 발생 시 기본 순서는 아래로 고정한다.

1. Actions run status 확인
2. SSM command success/failure 확인
3. gateway route 상태 확인
4. target service container/app log 확인
5. DB/dependency 상태 확인

### Why This Is Enough For Now

현재 단계에서 중요한 것은 “처음 보는 장애를 어디서부터 자를지”를 정하는 것이다.

대시보드나 중앙 로그 스택은 이후 확장 대상으로 두더라도, 최소 triage 순서는 지금 문서화해야 한다.

## Environment Policy Model

운영 안정화는 환경별 정책으로 내려간다.

### dev

- 빠른 배포/수정/검증 우선
- seed 허용
- smoke 적극 사용
- 임시 진단 허용

### stage

- prod 유사성 우선
- seed 제한
- ingress/health/smoke를 더 엄격하게 적용
- rollback rehearsal 가능

### prod

- 보수성 우선
- seed 강한 제한
- smoke/health 실패 시 즉시 판단
- 공개 경로와 인증 경로를 가장 엄격하게 본다

## Risks

### 1. seed 정책이 미정이면 운영 데이터와 테스트 데이터가 섞일 수 있다

특히 prod/stage에서 가장 위험하다.

### 2. health를 컨테이너 상태로만 보면 기능 고장을 놓친다

현재 구조에서 가장 쉬운 오판이다.

### 3. smoke를 수동 감에 의존하면 사람마다 기준이 달라진다

같은 배포라도 누구는 성공, 누구는 실패라고 판단할 수 있다.

### 4. rollback이 규칙 없이 실행되면 더 큰 혼선을 만든다

특히 naming cleanup, ingress 전환, image deploy 전환 시 더 위험하다.

### 5. observability baseline이 없으면 장애 triage 시간이 길어진다

현재는 구조를 아는 사람만 빠르게 자를 수 있다.

## Done Criteria

이 트랙의 완료 기준은 아래다.

1. 환경별 seed policy 문서화
2. 최소 health layer 정의 완료
3. 최소 smoke set 정의 완료
4. rollback decision rule 문서화
5. 최소 triage/observability baseline 문서화

그리고 이상적으로는 아래까지 포함한다.

6. dev/stage에서 실제 smoke 절차 검증
7. 운영 문서에서 같은 실패 class를 반복하지 않도록 preflight/runbook 업데이트

## Relationship To Other Tracks

### Ingress Formalization

정식 ingress가 붙으면 route health와 smoke 기준이 더 명확해진다.

### Frontend Source-of-Truth Alignment

프론트 canonical이 정리돼야 로그인/루트 경로 smoke 기준도 안정된다.

### Deployment Contract Migration

배포 매체가 source에서 image로 바뀌더라도, seed/health/smoke/rollback 규칙은 계속 필요하다.

### Prod Cutover

이 문서는 prod cutover의 선행조건이다.

## Follow-up Documents

이 문서 다음으로 필요한 상세 문서는 아래다.

1. environment seed policy spec
2. health and smoke execution spec
3. rollback decision and runbook spec
4. observability and triage baseline plan
