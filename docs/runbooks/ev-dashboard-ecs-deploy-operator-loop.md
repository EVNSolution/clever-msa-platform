# ev-dashboard Runtime Deploy Operator Loop

이 문서는 `ev-dashboard` canonical runtime deploy가 왜 느리게 보이는지와, deploy 중 무엇을 기다리고 무엇을 디버깅해야 하는지를 한 화면에서 보게 하기 위한 runbook이다.

같은 요약은 `Deploy ev-dashboard runtime platform` workflow의 GitHub step summary에도 같이 적어 둔다. operator가 배포 화면 안에서 바로 같은 기준을 볼 수 있어야 한다.

## Why It Feels Slow

지금까지의 deploy는 실제로 세 구간으로 나뉘었다.

1. local gate
2. `cdk deploy`
3. late gateway or ALB settle

문제가 된 건 deploy가 느린 것 자체보다, 이 세 구간을 한 문서에서 설명하지 않아 operator가 lesson, runbook, rollout note를 오가며 상태를 해석해야 했다는 점이다.

## Recent Timing Baseline

최근 production run 기준으로 보면, 현재 stack의 정상 deploy는 아래 범위에 들어왔다.

| Run | Scope | Total Job | Deploy Step |
| --- | --- | --- | --- |
| `24397600922` | front login hotfix | about `13m 25s` | about `10m 46s` |
| `24387589004` | terminal and telemetry `7a` | about `25m 40s` | about `22m 56s` |
| `24384039348` | support slice | about `25m 40s` | about `25m 04s` |
| `24382058568` | settlement slice | about `26m 39s` | about `26m 06s` |

정리하면:

- small image hotfix deploy는 대체로 `10-15m`
- new backend slice deploy는 대체로 `20-30m`

이 범위 안이면 기본적으로 \"느린 편이지만 정상\"으로 보고, 문서를 다시 읽기보다 phase signal을 먼저 본다.

## Mandatory Order

1. root [lesson.md](/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/lesson.md)와 대상 repo `lesson.md`를 읽는다.
2. prod 직전에는 먼저 [ev-dashboard-preprod-release-gate.md](/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/runbooks/ev-dashboard-preprod-release-gate.md) 를 따라 same SHA candidate proof를 마친다.
3. [ev-dashboard-ecs-preflight-gate.md](/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/runbooks/ev-dashboard-ecs-preflight-gate.md) 순서대로 아래를 통과한다.

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform
npm run preflight
npm test -- --runInBand
npx cdk synth
```

4. deploy 목적에 맞는 `run_profile` 을 고른다.
5. 그 다음에만 `Deploy ev-dashboard runtime platform` workflow를 실행한다.
6. workflow는 `cdk deploy` 뒤에 `npm run smoke:postdeploy` 를 자동 실행한다.
7. deploy 중에는 아래 phase table로만 판단한다.
8. automatic public smoke가 통과하면 [ev-dashboard-ui-smoke-and-decommission.md](/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/runbooks/ev-dashboard-ui-smoke-and-decommission.md)로 넘어간다.

## Operator Phase Table

| Phase | Usual Budget | Honest Signal | Operator Action |
| --- | --- | --- | --- |
| `preflight + test + synth` | `2-4m` | local commands all green | 실패하면 deploy 금지 |
| `workflow bootstrap` | `30-90s` | checkout, npm install, AWS credentials, preflight, test, synth complete | 빠른 polling 허용 |
| `CloudFormation start` | `1-2m` | stack becomes `UPDATE_IN_PROGRESS` | 아직 public smoke 보지 않는다 |
| `stateful quiet period` | `5-15m` | data host launch, EBS attach, postgres/redis bootstrap | `60-90s` cadence로 기다린다 |
| `backend bootstrap` | `2-6m` | app host launched, user-data/bootstrap still settling | route bug로 단정하지 않는다 |
| `late gateway settle` | `2-6m` | app host is healthy, but edge process is not yet answering expected statuses | mixed `200/502`는 잠시 허용 |
| `ALB target draining` | up to `5m` | public smoke is already good, but stack is still finishing | 재배포하지 말고 마저 기다린다 |
| `automatic public smoke` | `30-90s` | workflow smoke step returns expected `200/302/401` results | fail fast on broken public edge |
| `complete` | end state | GitHub run `success` + stack `UPDATE_COMPLETE` + automatic public smoke good | lesson and runbook update |

## Decision Table

| Signal | Meaning | Action |
| --- | --- | --- |
| `502` and the app host target is not healthy yet | host launch or bootstrap is not finished yet | wait |
| `502` and the app host target is healthy but edge is still wrong | gateway/bootstrap inside the host is not finished yet | wait, then check host logs only if it stays stuck |
| protected route returns `401` | routing, auth middleware, and backend reachability are alive | treat as healthy proof |
| read-model detail returns `404 not_found` for a fake id | app is alive and answering honestly | treat as healthy proof |
| `/health/` is `200` but real data endpoint is `500` | app contract bug, migration, or runtime bug | debug app, not infra |
| GitHub run says `success` but public smoke still fails | slice is not closed | debug the public path |

## Polling Cadence

- `10-20s` only while the workflow is clearing checkout, install, test, and synth
- `60-90s` during data host launch, EBS attach, and bootstrap
- `60s` while waiting for app host bootstrap and ALB target health
- `60s` while waiting for late gateway rollout or ALB draining

문서가 제대로 동작한다는 뜻은, deploy 중간에 같은 URL과 같은 상태를 초 단위로 계속 새로 찌르지 않아도 된다는 뜻이다. phase가 바뀔 때만 다음 확인으로 넘어간다.

## Minimal Proof Checklist

deploy를 \"끝났다\"고 부를 수 있는 최소 조건은 항상 세 가지다.

1. GitHub workflow run `completed/success`
2. `EvDashboardPlatformStack` `UPDATE_COMPLETE`
3. workflow post-deploy public smoke 성공

셋 중 하나라도 비면 lesson만 읽고 넘어가지 말고, 그 지점에서 멈춰 원인을 적는다.

## Scope Boundary

이 문서는 `ev-dashboard` canonical runtime operator loop만 다룬다.

- prod 전 temporary candidate proof는 [ev-dashboard-preprod-release-gate.md](/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/runbooks/ev-dashboard-preprod-release-gate.md)
- deploy 전 gate는 [ev-dashboard-ecs-preflight-gate.md](/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/runbooks/ev-dashboard-ecs-preflight-gate.md)
- deploy 후 UI smoke와 old path retire는 [ev-dashboard-ui-smoke-and-decommission.md](/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/runbooks/ev-dashboard-ui-smoke-and-decommission.md)

새로운 lesson이 생겨도, deploy 도중의 판단 규칙은 이 문서에 먼저 승격한다.
