# ev-dashboard Cold Start Rebuild

이 문서는 `ev-dashboard` runtime 을 `full destroy` 한 뒤, 새 운영 환경을 다시 올릴 때 operator 가 따라야 하는 실행 경로를 정의한다.

## Scope And Assumptions

이 runbook 의 범위는 `destroy` 이후의 `fresh rebuild` 이다.

- snapshot restore 는 하지 않는다.
- 과거 runtime 을 rollback 해서 되살리는 절차가 아니다.
- rebuild 는 현재 코드와 retained ECR image 를 기준으로 한다.
- retained source of truth 는 현재 repository 와 docs 이다.
- Route53 hosted zone 은 유지된다고 가정한다.

이 문서는 다음 자산을 새로 만드는 흐름을 전제로 한다.

- RDS PostgreSQL
- ElastiCache Redis
- runtime Secrets Manager secrets
- ACM certificate
- Route53 alias records

## Preconditions

아래가 모두 확인되어야 rebuild 를 시작한다.

1. [ev-dashboard-runtime-environment-review.md](ev-dashboard-runtime-environment-review.md) 를 먼저 통과했다.
2. [2026-04-15-ev-dashboard-full-runtime-shutdown-design.md](../superpowers/specs/2026-04-15-ev-dashboard-full-runtime-shutdown-design.md) 에서 정의한 retained asset 과 destroy boundary 를 이해했다.
3. retained ECR repository 와 image tag 또는 digest 가 존재한다.
4. current code 기준으로 rebuild 할 branch 또는 SHA 가 확정되어 있다.
5. GitHub OIDC, CDK bootstrap, VPC/subnet 등 infra prerequisite 이 유효하다.
6. 새 runtime 을 올리는 목적이 분명하다. 데이터 복구 목적이 아니다.

## Fresh Provision Assumptions

rebuild 는 아래 가정 위에서 진행한다.

- no snapshot restore
- fresh RDS instance
- fresh Redis node
- fresh runtime Secrets Manager secrets
- fresh ACM certificate
- fresh Route53 alias records
- current code deployment, not old runtime rollback
- retained ECR image 를 사용한 image deploy

데이터가 필요하지 않으므로 restore point, snapshot, backup attach 단계는 생략한다.

## Required Asset Checks

rebuild 전에 아래 자산을 실제로 확인한다.

### 1. Retained Runtime Assets

- Route53 hosted zone 존재
- ECR repository 존재
- deploy 에 쓸 immutable image digest 또는 SHA tag 존재
- root docs 와 rollout docs 가 현재 truth 와 일치

### 2. Infra Prerequisites

- VPC ID 유효
- public subnet 과 private subnet 유효
- GitHub OIDC role 유효
- CDK bootstrap 완료
- deploy 대상 account 와 region 이 맞음

### 3. Runtime Policy

- fresh rebuild 이므로 old runtime 을 살려서 비교하지 않는다.
- 필요한 secret 은 새로 만들고, 기존 runtime secret 을 재사용하지 않는 쪽으로 간다.
- certificate 는 새로 발급한다.
- alias records 는 새 stack 에 다시 연결한다.

## Execution Path

표준 실행 순서는 아래다.

1. [ev-dashboard-runtime-environment-review.md](ev-dashboard-runtime-environment-review.md)
2. [ev-dashboard-ecs-preflight-gate.md](ev-dashboard-ecs-preflight-gate.md)
3. [ev-dashboard-ecs-deploy-operator-loop.md](ev-dashboard-ecs-deploy-operator-loop.md)
4. [ev-dashboard-ui-smoke-and-decommission.md](ev-dashboard-ui-smoke-and-decommission.md)

운영자는 이 순서를 바꾸지 않는다.

- environment review 는 retained asset 과 전제조건을 확인하는 entry gate 다.
- deploy preflight 는 현재 코드와 image, desired count, deploy env 조합을 검수한다.
- deploy operator loop 은 `cdk deploy` 중의 wait signal 과 phase 판단만 담당한다.
- UI smoke / decommission 은 public surface 확인과 old path 정리를 담당한다.

실행 중에는 current code 기준으로만 진행한다. 과거 runtime 을 기준으로 rollback 하거나, 예전 image 로 돌아가는 판단은 하지 않는다.

## Post-Deploy Verification

deploy 가 끝나면 아래를 확인한다.

- `ev-dashboard.com` 이 새 stack 에서 응답한다.
- `api.ev-dashboard.com` 이 새 stack 에서 응답한다.
- public smoke 가 통과한다.
- auth or read-only smoke 가 필요한 경우, current operator policy 에 맞게 수행한다.
- RDS, Redis, Secrets, ACM, alias records 가 새로 provision 된 상태인지 확인한다.
- Route53 hosted zone 과 retained ECR image 는 유지된 상태여야 한다.

이 단계에서 실패가 나면 rollback 대상은 old runtime 이 아니라 현재 deploy 결과다. 재검토는 environment review 부터 다시 한다.

## Completion Criteria

아래가 모두 만족되면 cold start rebuild 를 완료로 본다.

1. environment review -> deploy preflight -> deploy operator loop -> UI smoke/decommission 순서가 실제로 닫혔다.
2. no snapshot restore 원칙이 지켜졌다.
3. fresh RDS, fresh Redis, fresh runtime Secrets, fresh ACM certificate, fresh alias records 가 확인되었다.
4. current code 와 retained ECR image 기반으로 rebuild 했다.
5. `ev-dashboard.com` 과 `api.ev-dashboard.com` 의 public path 가 새 runtime 에서 동작한다.

완료 후에는 rebuild 에서 확인한 전제를 다음 운영 문서에 반영한다. 이후의 일반 deploy 는 다시 [ev-dashboard-ecs-preflight-gate.md](ev-dashboard-ecs-preflight-gate.md) 부터 탄다.
