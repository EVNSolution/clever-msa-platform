# ev-dashboard Full Runtime Shutdown Design

**Date:** 2026-04-15

**Status:** approved design baseline

## Goal

`ev-dashboard` canonical prod runtime 을 무기한 중단한다.

목표는 AWS billing 을 가능한 낮게 내리되, 나중에 필요하면 현재 코드와 이미지 자산을 기준으로 fresh deploy 로 다시 올릴 수 있는 상태를 남기는 것이다.

이 shutdown 은 운영 지속이 아니라 비용 최소화가 목적이다. 따라서 runtime continuity, live rollback, data preservation 보다 cost elimination 을 우선한다.

## Scope

이 설계는 아래 canonical runtime 에 적용된다.

```text
GitHub main
-> immutable ECR image
-> infra-ev-dashboard-platform
-> CDK deploy
-> ECS/Fargate + ALB
-> ev-dashboard.com / api.ev-dashboard.com
```

정본 기준 문서:

- `development/infra-ev-dashboard-platform/README.md` (out-of-band infra repo reference)
- [../../mappings/current-runtime-inventory.md](../../mappings/current-runtime-inventory.md)
- [../../rollout/2026-04-13-ecs-cdk-oidc-actions-transition.md](../../rollout/2026-04-13-ecs-cdk-oidc-actions-transition.md)
- [../../boundaries/ev-dashboard-aws-runtime-boundary-and-cost-estimate.md](../../boundaries/ev-dashboard-aws-runtime-boundary-and-cost-estimate.md)

## Decision

shutdown 방향은 `full destroy without snapshots` 로 고정한다.

의미는 아래와 같다.

- runtime compute 는 전부 제거한다.
- stateful datastore 도 snapshot 없이 제거한다.
- hosted zone 은 유지한다.
- ECR repository 와 image 는 유지한다.
- 나중에 다시 올릴 때는 기존 data restore 가 아니라 fresh runtime reprovision 을 전제로 한다.

즉, 이 작업은 “temporary scale-to-zero” 가 아니라 “runtime tear-down” 이다.

## Destroy Boundary

아래 리소스는 제거 대상이다.

### 1. Compute And Routing

- ECS cluster
- 모든 ECS/Fargate service
- 모든 running task definition revision reference in active runtime
- Application Load Balancer
- ALB listener
- ALB target group
- ECS Service Connect / Cloud Map namespace and service registrations

### 2. Stateful Runtime Stores

- 모든 runtime RDS PostgreSQL instance
- `service-account-access` 전용 ElastiCache Redis

데이터는 현재 보존 가치가 없다고 결정되었으므로:

- final snapshot 을 만들지 않는다
- automated backup retention 을 위한 별도 보존도 하지 않는다
- restore readiness 는 목표가 아니다

### 3. Runtime Secrets And Edge Bindings

- runtime 에서만 쓰는 Secrets Manager secret
- stack 안에서 발급된 ACM certificate
- `ev-dashboard.com` alias record
- `api.ev-dashboard.com` alias record

도메인은 hosted zone 자체를 제거하지 않으므로, alias record 만 비우거나 stack destroy 와 함께 제거되는 상태를 의도한다.

## Retain Boundary

아래는 남긴다.

### 1. DNS And Registry

- Route53 hosted zone

이 리소스는 월 비용이 작고, 향후 동일 도메인으로 다시 올릴 때 재사용 가치가 크다.

### 2. Build Artifacts And Source Of Truth

- ECR repository
- 현재 image artifact
- GitHub repo
- GitHub Actions workflow
- `infra-ev-dashboard-platform`
- application child repo
- `docs/` 문서 정본

이 경계를 유지하면 복구는 “old runtime rollback” 이 아니라 “fresh deploy from current source and images” 로 수행할 수 있다.

## Non-Goals

이 shutdown 에서 하지 않는 것:

- data snapshot 생성
- old data restore 경로 보존
- domain 의 read-only landing page 유지
- hosted zone 제거
- ECR image cleanup 를 통한 archive 최적화
- legacy EC2 bridge lane 까지 동시에 정리하는 범위 확장

특히 legacy bridge lane retire 는 별도 작업으로 본다. 이번 설계는 `ev-dashboard` canonical runtime billing 최소화가 목적이다.

## Expected Runtime Outcome

작업 완료 후 기대 상태는 아래다.

- `ev-dashboard.com` 은 더 이상 active application endpoint 가 아니다
- `api.ev-dashboard.com` 도 더 이상 active API endpoint 가 아니다
- ECS/Fargate billing 은 `0`
- ALB billing 은 `0`
- RDS/Redis runtime billing 은 `0`
- public IPv4 runtime billing 은 `0`
- 남는 비용은 주로 아래다
  - Route53 hosted zone
  - ECR image storage

## Cost Outcome

현재 추정 baseline 은 약 `809.58 USD / month` 수준이다.

이 설계가 끝나면 제거 대상인 큰 비용 항목은 아래다.

- Fargate compute
- public IPv4
- RDS PostgreSQL
- ElastiCache Redis
- ALB
- Cloud Map resource
- Secrets Manager runtime secret

남는 것은 사실상 아래 두 축만 본다.

- Route53 hosted zone
- ECR storage

즉, 월 비용은 현재 대비 극적으로 낮아져야 한다.

## Rebuild Assumption

재기동은 아래 가정을 사용한다.

1. 기존 데이터는 필요 없다.
2. DB/Redis 는 새로 만든다.
3. secret 은 새로 생성한다.
4. certificate 는 새로 발급한다.
5. alias record 는 새 stack 에 다시 연결한다.
6. app runtime 는 current repo + current image contract 기준으로 fresh deploy 한다.

이 가정이 깨지면, shutdown 전에 snapshot/backup 전략을 다시 넣어야 한다.

## Execution Shape

실행은 크게 두 단계로 나눈다.

### Phase 1. Safety Gate

- destroy 대상과 retain 대상을 문서로 고정
- 현재 billing 큰 항목이 실제로 stack 에 묶여 있는지 재확인
- hosted zone 과 ECR 은 retain 이 맞는지 최종 확인

### Phase 2. Destroy

- infra repo 기준으로 runtime resource 를 제거하는 destroy path 실행
- destroy 후 Route53 hosted zone 과 ECR repository 가 남아 있는지 확인
- `ev-dashboard.com`, `api.ev-dashboard.com` 이 더 이상 active runtime 을 가리키지 않는지 확인

## Risk Notes

### 1. Data Loss

이 설계는 의도적으로 data loss 를 허용한다.

위험이 아니라 결정 자체다. 나중에 데이터가 필요해지면 이 설계는 잘못된 전제가 된다.

### 2. Re-activation Friction

나중에 다시 올릴 때 아래가 새로 필요하다.

- DB bootstrap
- secret regeneration
- certificate re-issuance
- DNS rebind

하지만 사용자는 지금 이 복구 비용보다 현재 billing 절감을 우선한다고 결정했다.

### 3. Drift Between Docs And Actual Stack

리포 기준과 실제 AWS 계정 상태가 어긋나 있을 수 있다.

따라서 implementation 단계에서는:

- CDK ownership 안의 리소스
- 수동으로 남았을 수 있는 리소스

를 구분해서 확인해야 한다.

## Verification

destroy 완료를 주장하려면 최소 아래 증거가 필요하다.

- ECS cluster/service/task 가 더 이상 active runtime 을 가지지 않음
- ALB/listener/target group 가 제거됨
- RDS instance 가 제거됨
- Redis node 가 제거됨
- runtime secret 이 제거됨
- hosted zone 은 유지됨
- ECR repo 는 유지됨
- `ev-dashboard.com`, `api.ev-dashboard.com` 이 active runtime endpoint 로 응답하지 않음

## Recommended Implementation Direction

구현은 `docs/` 먼저, 이후 `infra-ev-dashboard-platform` 실행 계획 순으로 간다.

계획 문서에서는 아래를 분리해야 한다.

- 어떤 리소스를 stack destroy 로 제거할지
- 어떤 리소스를 retain policy 또는 pre-destroy export 로 남길지
- 검증 커맨드와 성공 조건

## Acceptance Criteria

아래가 충족되면 이 작업은 끝난다.

1. `ev-dashboard` canonical runtime billing 의 핵심 고정비가 제거된다.
2. hosted zone 은 남는다.
3. ECR repository 와 image 는 남는다.
4. data snapshot 은 만들지 않는다.
5. 재기동은 fresh deploy 기준으로만 설명된다.
