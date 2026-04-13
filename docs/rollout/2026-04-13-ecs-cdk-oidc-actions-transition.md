# ECS/CDK + GitHub Actions OIDC 전환 기준

이 문서는 CLEVER 플랫폼이 **새 ECS/CDK 배포 경로**를 설계할 때 어떤 방향을 기본값으로 볼지 고정한다.

## 목적

이 문서의 목적은 아래다.

1. 현재 CLEVER 배포 truth와 새 ECS/CDK 전환 방향을 분리해서 기록한다.
2. 새 ECS/Fargate 워크로드는 `GitHub Actions + OIDC + CDK`를 우선 경로로 본다.
3. 기존 EC2 중앙 배포 경로를 깨지 않고, 어디까지가 migration scope인지 명확히 한다.

## Current CLEVER Deploy Truth

현재 검증되어 운영 중인 경로는 아래다.

```text
service repo push
-> GitHub Actions
-> OIDC role assume
-> ECR build/push or central deploy dispatch
-> SSM
-> EC2 app host
-> docker compose
```

현재 truth를 구성하는 축은 아래다.

- 서비스 repo별 image build는 GitHub Actions가 수행한다.
- image build는 org variable `GH_ACTIONS_ECR_BUILD_ROLE_ARN` 기준으로 동작한다.
- 환경 배포는 `clever-deploy-control`이 `GH_ACTIONS_DEV_DEPLOY_ROLE_ARN`, `GH_ACTIONS_STAGE_DEPLOY_ROLE_ARN`, `GH_ACTIONS_PROD_DEPLOY_ROLE_ARN`를 사용해 실행한다.
- runtime deploy target은 현재 EC2 app-host + SSM + compose다.
- root `clever-msa-platform`은 docs truth와 API docs freshness gate를 유지한다.

즉, **현재 운영 경로는 GitHub-hosted control plane + AWS OIDC** 이다.

## New Preferred Direction

새 ECS/CDK 경로는 아래를 기본값으로 본다.

```text
GitHub repo
-> GitHub Actions
-> OIDC role assume
-> ECR image push
-> CDK deploy
-> ECS/Fargate
```

여기서 핵심은 아래다.

- GitHub-hosted control plane을 유지한다.
- AWS OIDC role assumption 모델을 재사용한다.
- build artifact는 ECR image로 고정한다.
- runtime target만 EC2/compose에서 ECS/Fargate로 옮긴다.
- infra deploy는 CDK로 수행한다.

## Primary Decision

앞으로 **새 ECS/CDK 배포 문서와 예시**는 아래 기준을 따른다.

- pipeline owner: `GitHub Actions`
- auth model: `GitHub OIDC`
- artifact registry: `Amazon ECR`
- infra deploy: `CDK`
- runtime target: `ECS/Fargate`

단, 아래는 그대로 유지한다.

- 기존 EC2 중앙 배포 레이어
- 현재 서비스 repo의 GitHub Actions image build
- 현재 환경별 deploy role secret 구조

즉, 이번 결정은 **제어면과 인증면은 유지하고 런타임만 ECS/CDK로 확장하는 결정**이다.

## Scope Boundary

이 전환 기준이 적용되는 범위:

- 새로 만드는 ECS/Fargate 서비스
- CDK `infra/`를 동반하는 서비스 repo
- EC2 경로와 병행 검증할 pilot stack
- 향후 central deploy control-plane의 ECS 어댑터 확장 검토

이 문서 범위 밖:

- 현재 `clever-deploy-control`의 EC2/SSM 배포를 즉시 폐기
- 모든 서비스 repo를 한 번에 ECS/CDK로 이동
- 현재 dev/stage/prod host 운영 규칙 폐기

## CLEVER-Specific Mapping

CLEVER 현재 구조에 맞춘 매핑은 아래다.

### 1. 코드 소유권

- application source of truth는 계속 각 `development/<repo>`가 가진다.
- ECS/CDK 경로의 `infra/`는 해당 서비스 repo 내부 또는 그 서비스 전용 infra repo에 둔다.
- root workspace는 rollout truth와 boundary 문서만 유지한다.

### 2. 인증/권한 모델

새 ECS/CDK 경로도 GitHub 쪽 AWS role 참조를 유지한다.

- image build:
  - `vars.GH_ACTIONS_ECR_BUILD_ROLE_ARN`
- infra provision:
  - `secrets.GH_ACTIONS_INFRA_ROLE_ARN`
- environment deploy:
  - `secrets.GH_ACTIONS_DEV_DEPLOY_ROLE_ARN`
  - `secrets.GH_ACTIONS_STAGE_DEPLOY_ROLE_ARN`
  - `secrets.GH_ACTIONS_PROD_DEPLOY_ROLE_ARN`

원칙:

- build role과 deploy role은 분리한다.
- deploy role은 환경별로 분리한다.
- 같은 repo가 current EC2 deploy와 new ECS deploy를 병행하더라도 role naming과 권한 범위는 purpose-based로 유지한다.

### 3. 태그/아티팩트 규칙

기존 CLEVER image 운영 규칙과 충돌하지 않게 아래를 유지한다.

- image tag는 SHA 기반을 기본값으로 둔다.
- `latest`는 운영 기본 태그로 쓰지 않는다.
- rollback 단위는 git SHA가 아니라 image tag / task definition revision 으로 본다.

### 4. 운영 레이어 분리

- current EC2 deploy: `clever-deploy-control`
- new ECS/CDK deploy: repo-local workflow 또는 별도 ECS deploy workflow

첫 단계에서는 둘을 한 control-plane으로 억지 통합하지 않는다.

## Recommended Migration Order

권장 순서는 아래다.

1. pilot 대상 1개를 정한다.
2. 해당 repo에 ECS/Fargate + CDK `infra/`를 만든다.
3. repo 안에 image build workflow와 ECS/CDK deploy workflow를 만든다.
4. GitHub OIDC trust와 environment-specific deploy role을 연결한다.
5. ECR image push -> `cd infra && npx cdk deploy` 경로를 만든다.
6. dev 환경에서 deploy/rollback/log/alert를 먼저 검증한다.
7. 이후에만 stage/prod 또는 central control-plane 연계를 검토한다.

pilot 선택 기준:

- sibling repo build context 의존이 약할 것
- local compose coupling 이 적을 것
- rollback 영향이 작을 것

## Operational Rules

### 1. Region alignment

- ECR, ECS, CloudWatch, CDK deploy target, OIDC-assumed role이 바라보는 리전은 같은 region을 기본값으로 둔다.
- cross-region pipeline은 특별한 요구가 있을 때만 허용한다.

### 2. One path per example

- 하나의 예제 문서/워크플로 안에서 `GitHub Actions + OIDC + ECS`와 `CodeConnections + CodeBuild`를 섞지 않는다.
- current path 문서는 current path만, new ECS path 문서는 new ECS path만 설명한다.

### 3. Runtime boundary

- 이 전환은 source/build/deploy control-plane을 유지한 채 runtime target을 바꾸는 것이다.
- 서비스 boundary, docs truth, runtime catalog 책임은 별도 문서에서 계속 관리한다.

### 4. Cutover condition

아래가 검증되기 전에는 기존 EC2 경로를 제거하지 않는다.

- dev deploy success
- rollback drill success
- CloudWatch log visibility
- manual approval / prod gate policy
- image provenance and tag traceability

## Troubleshooting Focus

새 경로에서 먼저 볼 문제는 아래다.

### 1. OIDC assume-role failure

- trust policy subject mismatch
- repo/environment claim mismatch
- role ARN secret/variable 오설정

### 2. GitHub Actions cannot push image

- ECR 권한 누락
- role-to-assume가 build role이 아니라 deploy role로 잘못 연결됨
- docker login/push 단계 누락

### 3. CDK deploy fails inside GitHub Actions

- `cdk bootstrap` 미실행
- deploy role에 CloudFormation/IAM/ECS/ECR 권한 부족
- `infra/package.json` 의존성 또는 `ts-node`, `@types/node` 누락

### 4. ECS task cannot pull image

- task execution role 문제
- ECR repository policy 문제
- image tag mismatch

### 5. Current EC2 path와의 drift

- 같은 repo가 current EC2 deploy와 new ECS deploy를 동시에 가질 때 tag 규칙과 branch 정책이 어긋날 수 있다.
- 병행 기간에는 어떤 branch가 어느 control-plane을 타는지 문서로 고정해야 한다.

## Later-Phase Alternative

`AWS CodeConnections + CodePipeline/CodeBuild`는 later-phase alternative로 남겨둔다.

이 대안을 검토할 시점:

- GitHub-hosted runner 의존을 줄이고 싶을 때
- build/deploy ownership을 AWS 안으로 더 강하게 옮기고 싶을 때
- 여러 ECS repo를 AWS-native pipeline으로 표준화하려고 할 때

하지만 현재 CLEVER 기준의 primary direction은 아니다.

## Relationship to Existing Docs

- current EC2/OIDC truth는 [2026-04-07-central-deploy-reference.md](2026-04-07-central-deploy-reference.md)를 따른다.
- current GitHub repo setup은 [2026-04-07-github-repo-setup.md](2026-04-07-github-repo-setup.md)를 따른다.
- 새 ECS/CDK + GitHub Actions OIDC 문서는 이 문서를 출발점으로 한다.
- 과거 phase-1에서 `CodeConnections first`를 보류한 설계와도 방향이 맞다.

## Done Criteria For This Direction

이 방향이 실제로 자리 잡았다고 보려면 아래가 필요하다.

1. 최소 1개 CLEVER 서비스 또는 front가 GitHub Actions + OIDC 기반 ECS/CDK deploy로 운영 검증됨
2. 해당 repo는 image build와 ECS deploy를 분리된 role로 수행 가능
3. rollback 절차가 task definition/image tag 기준으로 문서화됨
4. current EC2 path와 new ECS path의 경계가 rollout 문서에서 충돌 없이 설명됨
