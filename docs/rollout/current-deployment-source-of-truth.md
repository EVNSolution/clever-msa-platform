# Current Deployment Source Of Truth

> Canonical status: This document is the current deployment source of truth for the active CLEVER production runtime.
> Version timestamp: 2026-04-22 12:50:29 KST (+0900)
> Precedence: live system state wins over documents. If live AWS/runtime state and this document disagree, update this document immediately. If older rollout/spec/runbook documents disagree with this document, this document wins.

## Scope

이 문서는 `ev-dashboard` current production deployment와 관련된 source slice ownership, operator entrypoint, current runtime authority를 고정한다.

질문이 아래 중 하나면 이 문서를 먼저 본다.

- 어떤 source slice가 build를 소유하는가
- 어떤 source slice가 production release를 소유하는가
- 어떤 source slice가 runtime inventory를 소유하는가
- public `/openapi.yaml`, `/swagger/`, `/redoc/`는 누가 소유하는가
- 어떤 parameter/secret/runtime artifact가 current truth인가

## Current Source Slice Truth

| Source slice | Current truth |
| --- | --- |
| `runtime-prod-release` | production rollout control plane. release intent, resolved rollout plan, latest successful `main` digest resolution, SSM dispatch, rollback target resolution, runtime image map write-back, post-release proof, release evidence owner |
| `runtime-prod-platform` | production runtime shape owner. canonical workload inventory, workload class, `target_host_group`, `deploy_method`, health contract owner |
| `edge-api-gateway` | public edge image owner. gateway routing, public `/openapi.yaml`, `/swagger/`, `/redoc/`, public docs artifact build, `revision.json` owner |
| `front-web-console` | production web console image owner. source slice는 image artifact를 만들지만 production release는 직접 수행하지 않는다 |
| active `service-*` slices | workload image owner. root monorepo workflow가 slice별 image artifact를 만든다. production deploy entrypoint는 아니다 |
| `front-driver-app` | current app-host production release lane 바깥의 client app source slice. 현재 `evdash-msa` app host runtime inventory source of truth에는 포함되지 않는다 |
| root `clever-msa-platform` | docs, mappings, rollout truth owner and monorepo image build workflow owner |

## Current Production Path

현재 production path는 아래 한 줄로 요약한다.

`root main build-development-images -> ECR image artifact -> runtime-prod-release resolve -> SSM/app host reconcile -> runtime image map write-back -> post-release proof/evidence`

세부 규칙은 아래와 같다.

1. root `main` push는 changed `development/*` Dockerfile-backed slices의 image artifact를 만든다.
2. production에서 어떤 digest를 쓸지 고르는 주체는 `runtime-prod-release`다.
3. workload 집합, host group, deploy method는 `runtime-prod-platform` inventory가 고정한다.
4. release 성공 후에만 `/EvDashboardPlatformStack/runtime/images`가 갱신된다.
5. release evidence는 기록이 아니라 정합성 증명이다.
   `resolved digest == runtime image map digest == actual running digest`

## Current Runtime Authorities

현재 production runtime authority는 아래다.

- canonical workload inventory:
  [mappings/current-runtime-inventory.md](../mappings/current-runtime-inventory.md)
- runtime inventory owner source slice:
  `development/runtime-prod-platform`
- release control plane source slice:
  `development/runtime-prod-release`
- public docs surface owner source slice:
  `development/edge-api-gateway`

현재 operator가 직접 확인해야 하는 AWS/runtime authority는 아래다.

- Secrets Manager:
  `evdash/prod/runtime/entry/service-manifest`
- Secrets Manager:
  `evdash/prod/runtime/entry/service-secret-map`
- SSM Parameter:
  `/EvDashboardPlatformStack/runtime/images`
- app host runtime:
  `EVDash-msa` host group의 running container state

즉 production 질문에 대해 정본 우선순위는 아래다.

1. live AWS/runtime state
2. 이 문서
3. `runtime-prod-platform` inventory와 `runtime-prod-release` evidence
4. current runbooks
5. older specs / historical rollout docs

## Public API Docs Ownership

public API docs는 아래처럼 나눠 읽는다.

- service source slice:
  API contract/source export owner
- `edge-api-gateway`:
  public `/openapi.yaml`, `/swagger/`, `/redoc/` artifact owner
- `runtime-prod-release`:
  deployed edge image와 `api_docs_revision` evidence owner

현재 `api_docs_revision.openapi_sha256`는 실제 서빙 중인 `openapi.yaml` file bytes SHA256과 같아야 한다.

## What Is Retired

아래는 current truth가 아니다.

- root `clever-msa-platform` workflow-based deploy
- `central-deploy.yml`, `central-deploy-dispatch.yml`, `refresh-api-docs.yml`, `provision-ec2-app-host.yml`
- `clever-deploy-control`
- `infra-ev-dashboard-platform`
- old ECS pilot / bridge-lane / central-deploy docs

이 문서와 충돌하는 older 문서는 historical reference로만 읽는다.

## Operator Read Order

배포/운영자가 current truth를 읽을 때는 아래 순서를 쓴다.

1. 이 문서
2. [mappings/current-runtime-inventory.md](../mappings/current-runtime-inventory.md)
3. [runbooks/ev-dashboard-ecs-preflight-gate.md](../runbooks/ev-dashboard-ecs-preflight-gate.md)
4. [runbooks/ev-dashboard-ecs-deploy-operator-loop.md](../runbooks/ev-dashboard-ecs-deploy-operator-loop.md)
5. [runbooks/ev-dashboard-ui-smoke-and-decommission.md](../runbooks/ev-dashboard-ui-smoke-and-decommission.md)

older spec/plan 문서는 위 다섯 문서로 current truth가 안 풀릴 때만 본다.
