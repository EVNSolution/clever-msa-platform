# Runtime/CDK + GitHub Actions OIDC 전환 기준

이 문서는 CLEVER 플랫폼이 `ev-dashboard` canonical runtime을 어떤 방향으로 운영하는지 고정한다. 초기 증명은 ECS/CDK 경로에서 시작됐지만, 현재 canonical prod runtime은 EC2 app/data host 구조로 이동 중이다.

## 목적

이 문서의 목적은 아래다.

1. `ev-dashboard` canonical prod truth와 legacy bridge lane을 분리해서 기록한다.
2. 새 runtime도 `GitHub Actions + OIDC + CDK` control plane을 우선 경로로 본다.
3. 기존 EC2 중앙 배포 경로를 깨지 않고, 어디까지가 migration scope인지 명확히 한다.

## Canonical Approved Runtime Truth

현재 승인된 canonical surface는 `ev-dashboard` 다.

```text
GitHub main
-> immutable ECR image
-> infra-ev-dashboard-platform
-> CDK deploy
-> EC2 app host + EC2 data host(EBS) + ALB
-> ev-dashboard.com / api.ev-dashboard.com
```

이 기준에서 중요한 점은 아래다.

- 코드 정본은 GitHub `main` 이다.
- release artifact 정본은 immutable ECR SHA tag 이다.
- runtime 정본은 `infra-ev-dashboard-platform` 이 소유하는 CDK stack 이다.
- `ev-dashboard.com`, `api.ev-dashboard.com` 의 prod truth는 `clever-deploy-control` 이 아니라 위 infra repo다.
- host bootstrap 변경은 `run_profile=bootstrap-proof` 같은 핵심 진입면 검증 fast path로 먼저 검증하고, release-grade proof는 `run_profile=full` 같은 전체 서비스 검증으로 닫는다.

## Legacy Bridge-Lane Deploy Truth

현재도 일부 surface나 bridge lane에서 사용되는 경로는 아래다.

```text
service repo push
-> GitHub Actions
-> OIDC role assume
-> ECR build/push or central deploy dispatch
-> SSM
-> EC2 app host
-> docker compose
```

이 bridge lane을 구성하는 축은 아래다.

- 서비스 repo별 image build는 GitHub Actions가 수행한다.
- image build는 repo variable `ECR_BUILD_AWS_ROLE_ARN` 와 shared `AWS_REGION` 기준으로 동작한다.
- 환경 배포는 `clever-deploy-control`이 `GH_ACTIONS_DEV_DEPLOY_ROLE_ARN`, `GH_ACTIONS_STAGE_DEPLOY_ROLE_ARN`, `GH_ACTIONS_PROD_DEPLOY_ROLE_ARN`를 사용해 실행한다.
- runtime deploy target은 bridge lane에서만 EC2 app-host + SSM + compose다.
- root `clever-msa-platform`은 docs truth와 API docs freshness gate를 유지한다.

즉, `clever-deploy-control` 은 여전히 존재하지만, `ev-dashboard` canonical prod truth 자체를 정의하지는 않는다.

## Control Plane Direction

새 runtime 경로도 아래 control plane을 기본값으로 본다.

```text
GitHub repo
-> GitHub Actions
-> OIDC role assume
-> ECR image push
-> CDK deploy
-> canonical runtime target
```

여기서 핵심은 아래다.

- GitHub-hosted control plane을 유지한다.
- AWS OIDC role assumption 모델을 재사용한다.
- build artifact는 ECR image로 고정한다.
- artifact build와 infra deploy는 분리한다.
- runtime target은 canonical surface 기준으로 교체할 수 있다.
- infra deploy는 CDK로 수행한다.

## Primary Decision

앞으로 `ev-dashboard` canonical 배포 문서와 예시는 아래 기준을 따른다.

- pipeline owner: `GitHub Actions`
- auth model: `GitHub OIDC`
- artifact registry: `Amazon ECR`
- infra deploy: `CDK`
- runtime target: `EC2 app host + EC2 data host(EBS)`

단, 아래는 bridge lane이나 non-canonical surface에서 그대로 유지할 수 있다.

- 기존 EC2 중앙 배포 레이어
- 현재 서비스 repo의 GitHub Actions image build
- 현재 환경별 deploy role secret 구조

즉, 이번 결정은 **`ev-dashboard` canonical surface에서는 infra repo가 정본이 되고, 중앙 배포는 필요한 곳에서만 bridge lane으로 남는 결정**이다.

## Locked First Migration Slice

첫 migration slice는 아래 네 repo로 고정한다.

- `front-web-console`
- `edge-api-gateway`
- `service-account-access`
- `infra-ev-dashboard-platform`

의미는 아래와 같다.

- `front-web-console`, `edge-api-gateway`, `service-account-access` 는 application/image owner다.
- `infra-ev-dashboard-platform` 은 `ev-dashboard.com`, `api.ev-dashboard.com` 용 shared ALB, EC2 app/data host, EBS, ACM, Route53, deploy workflow를 소유하는 전용 infra repo다.
- 첫 stack은 hosted zone이 이미 우리 계정에 있으므로 ACM certificate도 stack 안에서 DNS validation으로 발급한다.
- 이 slice가 real smoke check를 통과하기 전까지 다른 CLEVER runtime repo를 ECS migration 범위에 넣지 않는다.

## Historical ECS Evidence

아래 evidence는 현재 runtime truth가 아니라, initial ECS/CDK path가 실제로 증명됐던 historical execution record다.

## First Dev Rehearsal Evidence

2026-04-13 기준, 첫 dev rehearsal은 아래 evidence로 통과했다.

- infra workflow run: `EVNSolution/infra-ev-dashboard-platform` `24340628586`
- stack: `EvDashboardPlatformStack`
- public front URL: `https://next.ev-dashboard.com`
- result:
  - `https://next.ev-dashboard.com` -> `200`
  - JS bundle contains `https://hub.evnlogistics.com/api`
  - front target group health -> `healthy`
- intentional non-goal:
  - `https://api.next.ev-dashboard.com` -> `503`
  - 이유: first rehearsal은 `edge-api-gateway` desired count `0`, `service-account-access` desired count `0` 인 front-only pilot 이었다.

추가로, `hub.evnlogistics.com/api` 는 `Origin: https://next.ev-dashboard.com` 에 대해 `Access-Control-Allow-Origin` 을 반환하는 것이 확인됐다. 즉 이 pilot은 same-host `/api` 없이도 read-mostly front smoke를 수행할 수 있다.

## Auth Slice Dev Evidence

2026-04-14 KST 기준, auth/docs/admin slice도 dev에서 externally verified 되었다.

- infra workflow run:
  - `24348840946` `service-account-access` 전용 Postgres/Redis 포함 auth-slice infra deploy 성공
- follow-up gateway image fixes:
  - `edge-api-gateway` build `24349805208`
  - `edge-api-gateway` build `24350157862`
- public endpoints:
  - `https://api.next.ev-dashboard.com/api/auth/health/` -> `200`
  - `https://api.next.ev-dashboard.com/openapi.yaml` -> `200`
  - `https://api.next.ev-dashboard.com/swagger/` -> `200`
  - `https://api.next.ev-dashboard.com/redoc/` -> `200`
  - `https://api.next.ev-dashboard.com/admin/account-access/` -> `302` to login
  - `https://api.next.ev-dashboard.com/admin/account-access/login/` -> `200`
  - `https://api.next.ev-dashboard.com/static/admin/css/base.css` -> `200`

이 성공의 의미는 제한적이다.

- 성공 범위:
  - `front-web-console`
  - `edge-api-gateway`
  - `service-account-access`
  - dedicated Postgres + Redis
- 아직 비범위:
  - full backend graph migration
  - `organization-master-api`, `driver-profile-api` 등 다른 내부 서비스의 ECS 이전

## Apex Cutover Evidence

2026-04-14 KST 기준, apex/API host cutover도 같은 ECS stack에서 externally verified 되었다.

- infra workflow run:
  - `24351756178`
- config change:
  - `APEX_DOMAIN=ev-dashboard.com`
  - `API_DOMAIN=api.ev-dashboard.com`
- image contract:
  - same stable front/gateway/account-access images reused
- DNS/runtime result:
  - `ev-dashboard.com` -> ALB alias
  - `api.ev-dashboard.com` -> ALB alias
  - legacy `test-test-sh` service scaled to `desired=0`, `running=0`

verified endpoints:

- `https://ev-dashboard.com` -> `200`
- `https://api.ev-dashboard.com/api/auth/health/` -> `200`
- `https://api.ev-dashboard.com/openapi.yaml` -> `200`
- `https://api.ev-dashboard.com/swagger/` -> `200`
- `https://api.ev-dashboard.com/admin/account-access/` -> `302` to login

operational note:

- during propagation, local resolver results lagged behind Route53.
- public `dig` and `curl --resolve` against the ALB IPs were required to validate the cutover honestly.

## Backend Slice Completion Evidence

2026-04-14 KST 기준, `ev-dashboard` external API surface는 planned slices 기준으로 ECS/ALB 경로에서 production proof를 마쳤다.

- Company Governance + People And Assets
  - `/api/org/*`
  - `/api/auth/company-manager-roles/*`
  - `/api/auth/manager-accounts/*`
  - `/api/auth/identity-signup-requests/manage/*`
  - `/api/drivers/*`
  - `/api/personnel-documents/*`
  - `/api/vehicles/*`
  - `/api/driver-vehicle-assignments/*`
- Dispatch Inputs + Read Models
  - `/api/dispatch/*`
  - `/api/delivery-record/*`
  - `/api/attendance/*`
  - `/api/dispatch-ops/*`
  - `/api/driver-ops/*`
  - `/api/vehicle-ops/*`
- Settlement
  - `/api/settlement-registry/*`
  - `/api/settlements/*`
  - `/api/settlement-ops/*`
- Support Surface
  - `/api/regions/*`
  - `/api/region-analytics/*`
  - `/api/announcements/*`
  - `/api/ticket/*`
  - `/api/notifications/*`
- Terminal And Telemetry `7a`
  - `/api/terminals/*`
  - `/api/telemetry/*`
  - `/api/telemetry-dead-letters/*`

deferred scope:

- `service-telemetry-listener`
- reason: real MQTT broker endpoint and credentials are still not locked
- runtime policy: ECS service exists, but `desired=0` until `7b` starts

즉 `api.ev-dashboard.com` 의 external prefix 기준으로는 planned slice graph가 ECS로 넘어갔고, 남은 것은 internal telemetry ingest worker cutover 뿐이다.

## Current Canonical Runtime Direction

현재 canonical prod truth는 ECS/Fargate가 아니라 아래 방향이다.

- `infra-ev-dashboard-platform -> CDK -> EC2 app host + EC2 data host(EBS) -> ev-dashboard.com`
- immutable ECR SHA artifact 전략은 유지
- `clever-deploy-control` 은 bridge lane / legacy reference

ECS 기반 증명 기록은 historical evidence로 남기되, 새 operator/current-truth 판단은 EC2 runtime 작업 기준으로 본다.

## Post-Migration Operational Close-Out

backend slice migration record는 닫혔다. 이제 `ev-dashboard` 에서 남은 운영 작업은 migration plan이 아니라 runbook 기준으로 본다.

- prod 전 temporary lane release gate: [../runbooks/ev-dashboard-preprod-release-gate.md](../runbooks/ev-dashboard-preprod-release-gate.md)
- deploy 전 검수 gate: [../runbooks/ev-dashboard-ecs-preflight-gate.md](../runbooks/ev-dashboard-ecs-preflight-gate.md)
- deploy 중 operator loop: [../runbooks/ev-dashboard-ecs-deploy-operator-loop.md](../runbooks/ev-dashboard-ecs-deploy-operator-loop.md)
- authenticated UI smoke와 decommission close-out: [../runbooks/ev-dashboard-ui-smoke-and-decommission.md](../runbooks/ev-dashboard-ui-smoke-and-decommission.md)
- detailed execution record: [../superpowers/plans/2026-04-14-ev-dashboard-backend-slices-implementation-plan.md](../superpowers/plans/2026-04-14-ev-dashboard-backend-slices-implementation-plan.md)

current release default:

- build immutable image once
- prove same SHA on temporary pre-prod ECS lane
- release same SHA to prod
- keep the low-cost mode default by avoiding snapshot clone DB unless the release includes migrations or side-effect-heavy workflows

current open items:

- `service-telemetry-listener` `7b`
- old EC2/compose path에서 `ev-dashboard` 범위 retire
- optional: local-only smoke credential을 secret-managed 운영 방식으로 승격할지 결정

already closed:

- dedicated manager-role smoke accounts exist in local gitignored operator notes
- authenticated read-only browser smoke passed for the required pages

## Operator Reading Rule

`ev-dashboard` 관련 판단에서는 아래 순서를 우선한다.

1. `infra-ev-dashboard-platform`
2. `ev-dashboard` runbooks
3. 이 전환 기준 문서

`clever-deploy-control` 문서는 bridge lane이나 legacy reference를 확인할 때만 본다.

## Scope Boundary

이 전환 기준이 적용되는 범위:

- 새로 만드는 ECS/Fargate 서비스
- CDK `infra/`를 동반하는 서비스 repo
- EC2 경로와 병행 검증할 pilot stack
- 향후 central deploy control-plane의 ECS 어댑터 확장 검토
- `front-web-console`, `edge-api-gateway`, `service-account-access` + `infra-ev-dashboard-platform` 첫 migration slice

이 문서 범위 밖:

- 현재 `clever-deploy-control`의 EC2/SSM 배포를 즉시 폐기
- 모든 서비스 repo를 한 번에 ECS/CDK로 이동
- 현재 dev/stage/prod host 운영 규칙 폐기
- `clever-deploy-control` full-system compose deploy를 `ev-dashboard.com` ECS cutover 실행 경로로 사용하는 것

## CLEVER-Specific Mapping

CLEVER 현재 구조에 맞춘 매핑은 아래다.

### 1. 코드 소유권

- application source of truth는 계속 각 `development/<repo>`가 가진다.
- `ev-dashboard.com` shared runtime stack은 `development/infra-ev-dashboard-platform` 전용 infra repo가 가진다.
- application repo는 image build와 runtime contract만 소유하고, shared ALB/ACM/Route53/CDK stack은 소유하지 않는다.
- ECS/CDK 경로의 `infra/`는 해당 서비스 repo 내부 또는 그 서비스 전용 infra repo에 둔다.
- root workspace는 rollout truth와 boundary 문서만 유지한다.

### 2. 인증/권한 모델

새 ECS/CDK 경로도 GitHub 쪽 AWS role 참조를 유지한다.

- image build:
  - `vars.ECR_BUILD_AWS_ROLE_ARN`
- ECS/CDK infra deploy:
  - `secrets.GH_ACTIONS_INFRA_ROLE_ARN`
- current EC2 deploy:
  - `secrets.GH_ACTIONS_DEV_DEPLOY_ROLE_ARN`
  - `secrets.GH_ACTIONS_STAGE_DEPLOY_ROLE_ARN`
  - `secrets.GH_ACTIONS_PROD_DEPLOY_ROLE_ARN`

원칙:

- build role과 deploy role은 분리한다.
- current EC2 deploy role과 new ECS/CDK infra role은 분리한다.
- ECS/CDK workflow는 GitHub Environment가 `dev/stage/prod` 여도 `GH_ACTIONS_INFRA_ROLE_ARN` 을 사용한다.
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

1. 첫 migration slice를 `front-web-console`, `edge-api-gateway`, `service-account-access`, `infra-ev-dashboard-platform` 으로 고정한다.
2. `infra-ev-dashboard-platform` repo에 ECS/Fargate + CDK stack을 만든다.
3. app repo 안에 image build workflow를 만들고, ECS/CDK deploy workflow는 infra repo가 수행한다.
4. GitHub OIDC trust와 environment-specific deploy role을 연결한다.
5. ECR image push -> infra repo `cdk deploy` 경로를 만들고, infra workflow는 `GH_ACTIONS_INFRA_ROLE_ARN` 으로 실행한다.
6. dev 환경에서 deploy/rollback/log/alert/public smoke를 먼저 검증한다.
7. 이후에만 stage/prod 또는 central control-plane 연계를 검토한다.

남은 backend slice 의 순서와 근거는 아래 문서를 정본으로 본다.

- [../superpowers/specs/2026-04-14-ev-dashboard-backend-slices-design.md](../superpowers/specs/2026-04-14-ev-dashboard-backend-slices-design.md)
- [../superpowers/plans/2026-04-14-ev-dashboard-backend-slices-implementation-plan.md](../superpowers/plans/2026-04-14-ev-dashboard-backend-slices-implementation-plan.md)

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
- `ev-dashboard.com` cutover 예제는 `clever-deploy-control` full-system compose deploy를 실행 경로로 사용하지 않는다.

### 3. Runtime boundary

- 이 전환은 source/build/deploy control-plane을 유지한 채 runtime target을 바꾸는 것이다.
- 서비스 boundary, docs truth, runtime catalog 책임은 별도 문서에서 계속 관리한다.
- `ev-dashboard.com/admin/*` apex namespace는 `front-web-console` 이 이미 소유하므로, Django admin을 같은 namespace로 다시 합치지 않는다.

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
- `GH_ACTIONS_INFRA_ROLE_ARN` 에 CloudFormation/IAM/ECS/ECR/Route53/ACM/Service Discovery 권한 부족
- CDK bootstrap asset bucket 권한 부족
- `infra/package.json` 의존성 또는 `ts-node`, `@types/node` 누락
- ACM DNS validation 대기 시간을 deploy hang 으로 오판
- RDS engine version 지원을 region별로 확인하지 않고 generic version(`16.4`)를 고정

### 4. ECS task cannot pull image

- task execution role 문제
- ECR repository policy 문제
- image tag mismatch

### 5. Immutable SHA tags make reruns non-idempotent

- ECR repo가 `IMMUTABLE` 이면 같은 SHA 태그 재푸시는 실패한다.
- build retry는 새 commit SHA 또는 existing-image detect 로직이 필요하다.

### 6. Current EC2 path와의 drift

- 같은 repo가 current EC2 deploy와 new ECS deploy를 동시에 가질 때 tag 규칙과 branch 정책이 어긋날 수 있다.
- 병행 기간에는 어떤 branch가 어느 control-plane을 타는지 문서로 고정해야 한다.

### 7. First ECS slice can look healthy while the app still fails

- `front-web-console` 기본 API base는 `/api` 다.
- 따라서 ALB가 `ev-dashboard.com` 의 `/api/*` 를 `edge-api-gateway` 로 보내지 않으면 첫 화면에서도 바로 깨진다.
- `edge-api-gateway` 는 이미 `web-console:5174`, `account-auth-api:8000` 같은 short upstream 이름을 사용하므로, ECS slice도 Service Connect 또는 동등한 service discovery로 그 이름을 보존해야 한다.
- front-only pilot에서는 remote API base만 넣으면 끝나는 게 아니다. 새 origin에 대한 CORS 허용도 실제 endpoint로 확인해야 한다.

### 8. ECS gateway fixes can require two passes

- 첫 fix는 Docker DNS resolver `127.0.0.11` 를 AWS VPC resolver 전제로 교체하는 것이었다.
- 둘째 fix는 core routes를 variable-based `proxy_pass` 에서 direct upstreams 로 바꾸는 것이었다.
- 즉 `service-account-access` 가 healthy 라고 해서 gateway layer가 자동으로 맞는 것은 아니다. public smoke 기준으로 `/api/auth/health/`, `/openapi.yaml`, `/swagger/`, `/admin/account-access/` 를 같이 봐야 한다.

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
