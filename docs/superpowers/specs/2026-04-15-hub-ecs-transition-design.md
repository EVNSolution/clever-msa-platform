# CLEVER Hub ECS Transition Design

## Purpose

이 문서는 현재 canonical public surface인 `hub.evnlogistics.com`을 다음 ECS/CDK 전환 대상으로 고정한다.

이번 문서의 목적은 아래다.

1. `ev-dashboard` 다음 canonical ECS target surface를 명시한다.
2. `hub` surface 전용 infra repo boundary를 고정한다.
3. 현재 `clever-deploy-control` bridge lane과 앞으로의 ECS lane을 혼동하지 않게 한다.

## Current Truth

현재 `hub.evnlogistics.com` 관련 truth는 아래다.

- canonical public working domain은 `hub.evnlogistics.com`이다.
- current ingress structure는 `Route53 -> ALB -> edge-api-gateway -> EC2 app-host compose runtime` 이다.
- deploy control-plane은 여전히 `clever-deploy-control` 이다.
- image-backed rollout은 일부 진행됐지만, runtime target은 아직 EC2/SSM/compose bridge lane이다.

즉, `hub` surface는 아직 `ev-dashboard`처럼 ECS/ALB 전용 runtime으로 넘어가지 않았다.

## Primary Decision

`ev-dashboard` 다음 canonical ECS transition surface는 `hub.evnlogistics.com` 으로 고정한다.

이 전환은 아래 구조를 목표로 한다.

```text
GitHub repo
-> GitHub Actions
-> OIDC role assume
-> ECR image push
-> dedicated infra repo CDK deploy
-> ECS/Fargate
-> ALB
-> hub.evnlogistics.com
```

핵심은 아래다.

1. 코드 정본은 계속 GitHub `main` 이다.
2. image 정본은 ECR SHA tag 다.
3. `clever-deploy-control` 은 즉시 폐기하지 않는다.
4. `hub` surface는 dedicated infra repo를 통해 ECS/CDK로 옮긴다.

## Dedicated Infra Repo Decision

다음 전환의 dedicated infra repo 이름은 `infra-clever-hub-platform` 으로 고정한다.

이 repo의 역할은 아래다.

- `hub.evnlogistics.com`
- `candidate.hub.evnlogistics.com`
- 필요 시 `api.hub.evnlogistics.com`
- 필요 시 `api.candidate.hub.evnlogistics.com`
- shared ALB
- ACM
- Route53 alias
- ECS services
- CDK deploy workflow

이 repo는 app code repo가 아니다.

현재 상태:

- linked child repo 생성 완료
- reusable scaffold 와 local validation 완료
- real AWS deploy evidence 는 아직 없음

## App-Code Ownership

`hub` surface 전환에서도 app repo ownership은 그대로 유지한다.

- `front-web-console`
  - operator UI, image owner
- `edge-api-gateway`
  - edge route owner, image owner
- `service-account-access`
  - shell/auth/docs/admin first slice의 auth source owner
- 이후 필요 service repo
  - slice 기준으로 순차 추가

즉, `infra-clever-hub-platform` 은 shared runtime owner일 뿐이고, application repo를 대체하지 않는다.

## Migration Order

`hub` surface도 `ev-dashboard` 와 같은 순서를 따른다.

### 1. Shell/Auth First

먼저 아래만 옮긴다.

- `front-web-console`
- `edge-api-gateway`
- `service-account-access`
- `infra-clever-hub-platform`

이 단계의 목적은 아래다.

- front shell proof
- auth/docs/admin proof
- post-deploy public smoke proof
- candidate lane proof

### 2. Domain Slices Later

그 다음에만 아래를 추가한다.

- governance / assets
- dispatch
- read models
- settlement
- support
- telemetry

즉 `hub` surface도 한 번에 full graph 를 옮기지 않는다.

## Relationship To Central Deploy

이번 결정이 의미하는 것은 아래다.

- `hub` surface는 다음 ECS migration target 이다.
- dedicated infra repo 기반으로 `ev-dashboard` pattern을 재사용한다.

이번 결정이 아직 의미하지 않는 것은 아래다.

- `clever-deploy-control` 전체를 infra repo로 옮긴다
- 중앙 배포 전체가 곧바로 ECS adapter를 갖는다
- current bridge lane을 지금 즉시 제거한다

즉, 현재 단계에서 `clever-deploy-control` 의 역할은 그대로다.

- current bridge lane deploy owner
- mixed-runtime adapter 후보
- ECS 전환이 두 번째 canonical surface까지 증명되기 전의 temporary bridge controller

## Pre-Prod Rule For Hub

`hub` surface도 current pre-prod gate rule을 그대로 쓴다.

- same SHA image build once
- `candidate.hub.evnlogistics.com` 에 proof
- same SHA image를 prod 로 release

기본 mode는 low-cost mode 다.

- snapshot clone DB는 기본값이 아니다
- read-heavy proof와 좁은 reversible write만 허용한다
- migration-heavy release는 별도 승인 없이는 이 gate만으로 충분하다고 보지 않는다

## Deferred Bridge Release

현재 보류된 `front-web-console` `stage` image-backed EC2 release는 여전히 valid 하다.

다만 current operator choice 는 아래다.

1. `hub` ECS structure transition 을 먼저 고정한다.
2. 그 다음 보류된 `stage` bridge release 를 재개한다.

즉 `stage` app-host 부족은 설계 결함이 아니라 deferred bridge-lane 운영 이슈다.

## Non-Goals

이번 문서의 범위 밖은 아래다.

- `hub` surface 전체 구현 완료
- `infra-clever-hub-platform` 의 actual cutover 완료
- central deploy ECS adapter 구현
- old EC2 bridge retirement 실행

이 문서는 다음 ECS target 과 ownership, sequence, naming 만 고정한다.

## Acceptance

이 문서가 승인되면 아래를 현재 truth 로 본다.

1. `hub.evnlogistics.com` 이 next canonical ECS transition surface 다.
2. next dedicated infra repo 이름은 `infra-clever-hub-platform` 이다.
3. current bridge lane 은 유지되지만 우선순위는 structure transition 뒤다.
4. central deploy full replacement 는 아직 scope 밖이다.
