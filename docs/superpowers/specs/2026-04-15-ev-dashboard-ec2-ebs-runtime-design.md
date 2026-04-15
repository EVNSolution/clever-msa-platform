# ev-dashboard EC2 + EBS Runtime Design

## Purpose

이 문서는 `ev-dashboard` canonical prod runtime을 현재의 `CDK + ECS/Fargate + RDS` 중심 구조에서, `CDK + ECR + EC2 app host + EC2 data host(EBS)` 구조로 전환하는 설계를 고정한다.

목표는 아래다.

1. `GitHub main -> immutable ECR SHA` artifact 정본은 유지한다.
2. `infra-ev-dashboard-platform`이 canonical prod truth를 계속 소유한다.
3. 가장 큰 비용 항목인 다수의 RDS 인스턴스와 Fargate task 분산 비용을 줄인다.
4. runtime target만 바꾸고, 배포 artifact와 release discipline은 유지한다.

## Current Problem

현재 canonical prod 구조는 아래다.

```text
GitHub main
-> ECR SHA image
-> infra-ev-dashboard-platform
-> CDK deploy
-> ECS/Fargate
-> ALB
-> ev-dashboard.com / api.ev-dashboard.com
```

이 구조의 장점은 명확하다.

- immutable artifact
- infra as code
- ALB / ACM / Route53 표준화
- service 단위 분리

하지만 비용 구조도 명확하다.

1. backend slice가 켜질 때마다 dedicated PostgreSQL 인스턴스를 생성한다.
2. backend service 대부분이 `256 CPU / 512 MiB` 기본값으로 각자 Fargate task를 가진다.
3. 모든 ECS task가 public subnet + public IP에 기대고 있다.

즉 지금 비용은 “큰 단일 서비스” 문제가 아니라, **많은 managed unit이 동시에 쌓인 구조 비용**이다.

## Locked Requirements

이번 전환에서는 아래를 유지한다.

1. 코드 정본은 GitHub `main`
2. release artifact 정본은 immutable ECR SHA
3. infra 정본은 `infra-ev-dashboard-platform`
4. public ingress는 `ALB + ACM + Route53`
5. front와 backend는 image 단위 release를 유지

이번 전환에서는 아래를 바꾼다.

1. app runtime target: `ECS/Fargate` -> `EC2 app host`
2. data runtime target: `RDS + ElastiCache` -> `EC2 data host + EBS`
3. service별 DB instance -> 단일 Postgres 엔진 내부 분리

## Options Considered

### 1. Keep ECS and only optimize settings

예:

- public IP 제거
- 일부 desired count 축소
- ARM 전환
- RDS Savings Plans

장점:

- 변경 폭이 작다.
- 현재 CDK 구조를 거의 유지한다.

단점:

- 가장 큰 비용 항목인 다수 DB + 다수 Fargate task 구조는 그대로 남는다.
- 운영비를 체감할 정도로 줄이기 어렵다.

### 2. Two-node EC2 split while keeping CDK and ECR

구조:

- `app host EC2` 1대
- `data host EC2` 1대
- `EBS` on data host
- `ALB + ACM + Route53` 유지
- image build / ECR / immutable SHA 유지

장점:

- 비용 절감 폭이 크다.
- artifact discipline과 infra as code를 유지한다.
- app rollout과 data 운영을 분리할 수 있다.

단점:

- managed DB/Fargate의 편의는 줄어든다.
- host 운영과 백업 전략을 직접 가져가야 한다.

### 3. Single-node EC2

구조:

- app + Postgres + Redis를 EC2 1대에 같이 둔다.

장점:

- 가장 싸다.

단점:

- 장애 반경이 너무 크다.
- deploy와 data risk가 강하게 엮인다.
- canonical prod 기본값으로 삼기엔 공격적이다.

## Decision

이번 설계는 **2번, two-node EC2 split**를 채택한다.

한 줄로 정리하면 아래와 같다.

```text
GitHub main
-> immutable ECR SHA images
-> infra-ev-dashboard-platform
-> CDK deploy
-> EC2 app host + EC2 data host(EBS)
-> ALB
-> ev-dashboard.com / api.ev-dashboard.com
```

즉 `CDK`와 `image-per-service` 전략은 유지하고, runtime만 ECS/Fargate와 RDS에서 EC2/EBS로 내린다.

## Target Architecture

### 1. Public Edge

아래는 그대로 유지한다.

- `Route53`
- `ACM`
- `Application Load Balancer`

public entrypoint는 계속 아래 둘이다.

- `ev-dashboard.com`
- `api.ev-dashboard.com`

public IP는 ALB만 가진다.

### 2. App Host

`app host EC2`는 아래 역할을 가진다.

- ECR SHA image pull
- runtime containers 실행
- gateway, front, backend application container hosting
- release 단위 image 교체

여기서 중요한 점은 **app host가 source checkout을 정본으로 쓰지 않는다는 것**이다. 정본은 여전히 ECR SHA다.

### 3. Data Host

`data host EC2`는 아래 역할을 가진다.

- PostgreSQL
- Redis
- EBS-backed persistence
- backup/restore anchor

이 host는 app rollout cadence와 분리한다.

### 4. Service Layout

각 서비스는 계속 image 단위로 유지한다.

- `front-web-console`
- `edge-api-gateway`
- `service-*`

단, 실행 위치는 Fargate task가 아니라 app host 위의 container runtime이다.

## Data Model Strategy

이번 전환에서는 기존 “서비스마다 RDS 인스턴스 1개” 모델을 버린다.

대신 아래 기준으로 간다.

1. 단일 PostgreSQL 엔진
2. service별 database 또는 schema 분리
3. service별 role / credential 분리
4. app 쪽 env는 계속 service별 credential을 사용

즉, logical isolation은 유지하되 physical instance count를 줄인다.

Redis는 별도 단일 runtime으로 두고, canonical data truth로 취급하지 않는다.

## Deploy Flow

배포 흐름은 아래처럼 바뀐다.

```text
service repo
-> build image
-> push immutable SHA to ECR
-> infra-ev-dashboard-platform declares target SHAs
-> CDK deploy
-> app host pulls target images
-> app containers restart
```

유지되는 원칙:

1. build once
2. same SHA promote
3. infra repo가 release target truth를 소유

즉 “이미지별로 올리는 전략”은 계속 유지하고, “이미지를 어디서 실행하느냐”만 바뀐다.

## Runtime Ownership

`infra-ev-dashboard-platform`이 계속 아래를 소유한다.

- ALB
- ACM
- Route53
- EC2 app host
- EC2 data host
- EBS
- IAM
- Security Groups
- host bootstrap / deploy contract

즉 canonical prod truth는 계속 infra repo다.

## Backup And Recovery

managed RDS를 내리기 때문에 backup 전략은 문서로 고정해야 한다.

최소 baseline:

1. EBS snapshot
2. PostgreSQL logical dump or WAL-based recovery strategy
3. Redis는 cache/queue 성격 기준으로 복구 기대 수준을 별도 정의

이번 설계는 backup/restore 세부 runbook을 아직 정의하지 않는다. 다만 canonical prod 전환의 acceptance criteria에는 backup strategy 문서화가 포함된다.

## Security And Network Posture

권장 posture는 아래다.

- public ingress: ALB only
- app host: private-first
- data host: private-only
- app -> data host only on required ports
- direct public access to Postgres/Redis 금지

즉 현재의 “task마다 public IP” 구조는 canonical target이 아니다.

## Migration Assumption

사용자 조건상, 현재는 meaningful production data migration을 전제하지 않는다.

이 설계는 아래를 가정한다.

1. data migration은 blocking issue가 아니다.
2. runtime replacement를 더 우선한다.
3. ECS/RDS 자원을 끄기 전, app/data host에서 same public contract를 증명한다.

## Risks

### 1. Single data host risk

`data host EC2`는 명확한 단일 장애점이다.

대응:

- snapshot discipline
- recovery runbook
- host replacement procedure

### 2. App host blast radius

서비스를 app host에 모으면, host issue가 여러 runtime에 동시에 영향을 준다.

대응:

- container 단위 health/restart
- app/data 분리
- release discipline 유지

### 3. Loss of managed guarantees

RDS/Fargate의 managed convenience가 줄어든다.

대응:

- infra repo에 host contract를 codify
- runbook과 lesson을 강화

## Non-Goals

이번 설계는 아래를 하지 않는다.

1. 모든 서비스를 단일 app process로 합치기
2. image-per-service 전략을 버리기
3. `clever-deploy-control`을 canonical prod truth로 되돌리기
4. business repo boundary를 다시 합치기

## Transition Order

1. `infra-ev-dashboard-platform`에 EC2 app host + data host target architecture 추가
2. image-based app host runtime proof
3. data host에 PostgreSQL + Redis 연결
4. ALB public contract 검증
5. ECS/Fargate / RDS / ElastiCache 리소스 retire
6. lesson / runbook / current runtime inventory 갱신

## Acceptance Criteria

아래가 성립하면 canonical runtime 전환이 완료된 것으로 본다.

1. `ev-dashboard.com`, `api.ev-dashboard.com`은 계속 동일한 public contract를 유지한다.
2. release artifact 정본은 여전히 immutable ECR SHA다.
3. `infra-ev-dashboard-platform`이 runtime truth를 계속 소유한다.
4. app runtime은 ECS/Fargate가 아니라 EC2 app host에서 실행된다.
5. data runtime은 RDS/ElastiCache가 아니라 EC2 data host + EBS에서 실행된다.
6. backup and restore baseline 문서가 존재한다.
