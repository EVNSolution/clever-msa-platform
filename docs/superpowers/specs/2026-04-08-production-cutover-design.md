# CLEVER Production Cutover

## Purpose

이 문서는 현재 dev에서 검증된 `CLEVER` MSA 배포 구조를 production으로 전환하기 위한 상위 cutover 설계를 고정한다.

이번 문서의 목표는 아래다.

1. prod cutover의 전제 조건을 분명히 한다.
2. 무엇이 준비되지 않으면 prod로 가면 안 되는지 stop condition을 고정한다.
3. production rollout을 기술 작업이 아니라 운영 이벤트로 다루는 기준을 정한다.

이 문서는 실행 체크리스트가 아니라 production cutover 상위 설계 문서다.

## Current Baseline

현재 기준으로 이미 확보된 것은 아래다.

- `GitHub Actions + AWS OIDC + EC2 + SSM + compose` dev 배포 검증
- 주요 서비스 및 묶음 배포 dev 검증
- 중앙 배포 control-plane 분리
- preflight remote host check
- 프론트 정본 정렬 방향과 naming cleanup 방향 고정
- ingress 정식화 방향 고정
- deployment contract migration 방향 고정
- 운영 안정화 상위 방향 고정

즉, prod cutover는 완전히 0에서 시작하는 단계가 아니라, 이미 dev에서 증명된 구조를 운영 수준으로 올리는 단계다.

## Primary Decision

production cutover는 “배포 실행”이 아니라 “운영 전환 이벤트”로 다룬다.

의미:

- prod cutover는 단일 기술 커맨드가 아니다.
- ingress, naming, seed, health, smoke, rollback, ownership이 모두 준비된 상태에서만 실행한다.
- prod로 가는 조건과 멈춰야 하는 조건을 먼저 고정한다.

## Production Readiness Gates

prod로 가기 전에 아래 게이트가 전부 닫혀야 한다.

### Gate 1. Domain and Ingress Ready

필수 조건:

- primary public domain 확정
- `ALB + ACM + Route53` 경로 준비
- public IP 직접 노출 제거 계획 완료
- canonical domain 기준 route smoke 가능

이유:

prod는 임시 public IP와 포트 개방 상태로 운영하면 안 된다.

### Gate 2. Frontend Source-of-Truth and Naming Ready

필수 조건:

- canonical frontend name 확정
- temporary deploy alias 상태가 통제됨
- rename 영향 범위가 식별됨
- prod에서 어떤 프론트가 정본인지 혼동이 없어야 함

이유:

prod cutover 직후 이름 혼란이 남아 있으면 운영과 장애 대응 모두 느려진다.

### Gate 3. Deployment Contract Risk Understood

필수 조건:

- 현재 source deploy인지 image deploy인지 운영자가 명확히 이해
- host-side git/token 의존성이 prod에 남아 있는지 여부 명확화
- rollback unit이 무엇인지 명확화

이유:

prod에서는 “어떻게 배포되는지”를 모르면 rollback도 못 한다.

### Gate 4. Operational Hardening Ready

필수 조건:

- 환경별 seed policy 확정
- health 기준 확정
- 최소 smoke set 확정
- rollback decision rule 확정
- 최소 triage 순서 문서화

이유:

prod에서는 배포 성공보다 서비스 정상 여부 판단이 더 중요하다.

### Gate 5. Production Environment Ready

필수 조건:

- prod app host 준비
- prod role/secret/parameter 준비
- prod ingress target 연결 준비
- prod 배포 대상 서비스와 compose/runtime inventory 준비

이유:

dev에서 되던 것을 prod에 그대로 복붙하면 안 된다. prod 자체의 준비 상태를 따로 확인해야 한다.

## Stop Conditions

아래 조건 중 하나라도 해당되면 prod cutover를 진행하면 안 된다.

### 1. Public ingress가 임시 상태다

예:

- public IP 직결만 존재
- TLS 미적용
- ALB 미준비

### 2. Canonical naming이 아직 임시 alias 상태에 과도하게 의존한다

예:

- 배포 repo 이름과 실제 정본 이름이 아직 정리되지 않음
- 운영자 문서와 배포 타깃 이름이 불일치

### 3. Seed 정책이 확정되지 않았다

예:

- prod에서 기본 계정/기본 비밀번호 seed를 어떻게 다룰지 미정
- 재시드 허용 조건이 모호

### 4. Health/smoke 기준이 불명확하다

예:

- 컨테이너 `Up`만 보고 정상으로 간주
- 로그인/핵심 API smoke가 없음

### 5. Rollback 기준이 없다

예:

- 누가 rollback을 결정하는지 모름
- 어떤 실패면 rollback인지 기준 없음

### 6. GitHub read-only token 또는 runtime credential dependency가 관리되지 않는다

예:

- rename 이후 토큰 scope가 불명확
- prod host가 필요한 repo를 읽을 수 있는지 확인 안 됨

## Production Rollout Model

prod 첫 rollout은 아래 원칙으로 진행한다.

### 1. Smallest Useful Scope First

첫 prod rollout은 가능한 한 작은 범위로 한다.

예:

- 핵심 진입점 + 핵심 서비스 소수
- 전체 서비스를 한 번에 여는 방식은 지양

### 2. One Change Surface at a Time

동시에 아래를 여러 개 바꾸지 않는다.

- ingress cutover
- naming cutover
- deploy contract cutover
- major frontend structure change

prod 첫 전환에서는 change surface를 분리해야 한다.

### 3. Observable Before Irreversible

배포 후 즉시 볼 수 있는 지표와 smoke를 확보한 뒤에만 다음 범위로 간다.

## Production Seed Policy

prod seed는 개발 편의 기능이 아니라 운영 승인 절차다.

### Decision

- 기본 admin bootstrap 자동 실행 금지
- 기본 비밀번호 seed 금지
- 필요 시 운영 승인 절차를 통해 수동 실행
- idempotent command라도 prod에서는 실행 권한과 타이밍을 통제

### Why

현재 dev에서 확인한 seed 경로는 유효하지만, prod에서 같은 패턴을 그대로 쓰면 운영 리스크가 크다.

## Production Health and Smoke Minimum

prod cutover 최소 검증은 아래를 포함해야 한다.

### Health

1. ALB target healthy
2. gateway healthy
3. 핵심 서비스 app health healthy
4. 핵심 dependency reachable

### Smoke

1. canonical domain root render
2. login page render
3. 공개 API 핵심 1개
4. 인증 API 핵심 1개
5. 대표 read path 1개

즉, 컨테이너 상태만으로 prod cutover 성공을 선언하지 않는다.

## Production Rollback Model

rollback은 prod에서 더 엄격해야 한다.

### Decision

아래 경우는 즉시 rollback 후보로 본다.

- canonical route outage
- login/auth failure
- core API smoke failure
- 배포 후 핵심 서비스 health 불안정

### Constraint

rollback 매체는 현재 source deploy 또는 이후 image deploy일 수 있지만, decision rule 자체는 공통이어야 한다.

## Production Observability Minimum

prod에서 최소한 아래는 바로 볼 수 있어야 한다.

1. GitHub Actions/배포 실행 이력
2. SSM command 결과
3. gateway 로그
4. 핵심 서비스 로그
5. ALB health/route 상태

운영자가 장애를 처음 볼 때 “어디를 먼저 봐야 하는가”가 문서로 정리돼 있어야 한다.

## Recommended Pre-Cutover Order

prod cutover 전 준비 순서는 아래를 권장한다.

1. domain/ingress 정식화 완료
2. frontend canonical naming 정리
3. runtime/repo naming cleanup 준비
4. operational hardening 기준 확정
5. prod host/secret/parameter 준비
6. prod smoke/rollback rehearsal
7. first production rollout

## Risks

### 1. Dev 성공을 prod readiness로 오인할 수 있다

지금 가장 위험한 오판이다.

dev에서 배포가 성공했다는 사실은 prod readiness의 일부일 뿐이다.

### 2. 임시 구조를 그대로 prod에 들고 갈 수 있다

예:

- public IP 직결
- temporary deploy alias 과다 의존
- GitHub token runtime dependency 미정리

### 3. 첫 prod rollout에서 change surface가 너무 클 수 있다

ingress, naming, contract를 한 번에 바꾸면 원인 분리가 어렵다.

### 4. smoke 기준이 약하면 “성공 선언”이 너무 빠를 수 있다

prod에서는 특히 위험하다.

## Done Criteria

prod cutover readiness가 완료됐다고 보기 위한 기준은 아래다.

1. ingress 정식화 완료
2. canonical naming 기준 명확
3. seed policy 확정
4. health/smoke 기준 확정
5. rollback decision rule 확정
6. prod host/secret/parameter 준비 완료
7. first rollout scope 확정

그리고 실제 cutover 완료 기준은 아래다.

8. canonical domain으로 정상 접근 가능
9. 핵심 smoke 통과
10. rollback 없이 안정 상태 유지

## Follow-up Documents

이 문서 다음으로 필요한 상세 문서는 아래다.

1. production cutover execution plan
2. production smoke and rollback rehearsal plan
3. production ingress implementation plan
