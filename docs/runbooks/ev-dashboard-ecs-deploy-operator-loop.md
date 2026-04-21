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

1. root [lesson.md](../../lesson.md)와 대상 repo `lesson.md`를 읽는다.
2. prod 직전에는 먼저 [ev-dashboard-preprod-release-gate.md](ev-dashboard-preprod-release-gate.md) 를 따라 same SHA candidate proof를 마친다.
3. [ev-dashboard-ecs-preflight-gate.md](ev-dashboard-ecs-preflight-gate.md) 순서대로 아래를 통과한다.

```bash
cd development/infra-ev-dashboard-platform
npm run preflight
npm test -- --runInBand
npx cdk synth
```

4. deploy 목적에 맞는 `run_profile` 을 고른다.
   - `bootstrap-proof` = 핵심 진입면 검증
   - `full` = 전체 서비스 검증
   - `warm-host-partial` = warm-host partial update
     - base stack 유지
     - manifest-listed 서비스만 fixed wave 순서로 반영
     - 신규 enable lane은 아님
   - `smoke-only` = 상태 재확인
5. 그 다음에만 `Deploy ev-dashboard runtime platform` workflow를 실행한다.
6. workflow는 `cdk deploy` 뒤에 `npm run smoke:postdeploy` 를 자동 실행한다.
7. deploy 중에는 아래 phase table로만 판단한다.
8. automatic public smoke가 통과하면 [ev-dashboard-ui-smoke-and-decommission.md](ev-dashboard-ui-smoke-and-decommission.md)로 넘어간다.

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

`warm-host-partial` 은 위 표의 `cdk deploy` phase를 지나지 않는다. 대신 아래처럼 읽는다.

| Phase | Usual Budget | Honest Signal | Operator Action |
| --- | --- | --- | --- |
| `preview + preflight` | `1-3m` | manifest classification, image check, host readiness all green | 실패하면 release 금지 |
| `wave reconcile` | `30-120s per wave` | host reconcile started for the listed services only | 다음 wave로 먼저 넘어가지 않는다 |
| `scoped smoke` | `30-90s per wave` | changed-service endpoints return expected `200/401/404` | fail 시 rollback 경로만 본다 |
| `finalize` | `10-30s` | release journal `succeeded`, `last-known-good` 갱신 | 다음 release 허용 |
| `rollback` | `30-120s per wave` | failed wave부터 역순 rollback | rollback 실패 시 repair 절차로 전환 |

## Decision Table

| Signal | Meaning | Action |
| --- | --- | --- |
| `502` and the app host target is not healthy yet | host launch or bootstrap is not finished yet | wait |
| `502` and the app host target is healthy but edge is still wrong | gateway/bootstrap inside the host is not finished yet | wait, then check host logs only if it stays stuck |
| protected route returns `401` | routing, auth middleware, and backend reachability are alive | treat as healthy proof |
| read-model detail returns `404 not_found` for a fake id | app is alive and answering honestly | treat as healthy proof |
| `/health/` is `200` but real data endpoint is `500` | app contract bug, migration, or runtime bug | debug app, not infra |
| GitHub run says `success` but public smoke still fails | slice is not closed | debug the public path |
| `warm-host-partial` preflight says `gateway-required` | route group/upstream impact가 있는데 gateway가 manifest에 빠졌다 | manifest에 `edge-api-gateway` 를 포함하고 다시 preview 한다 |
| `warm-host-partial` preflight says `front-required` | public contract 또는 shell impact가 있는데 front가 manifest에 빠졌다 | manifest에 `front-web-console` 과 필요한 gateway를 포함하고 다시 preview 한다 |
| `repairRequired=true` | host state가 drift 또는 rollback failure 이후 안전하지 않다 | 다음 partial release 금지, host state/journal 확인 후 복구 |
| drift detected before release | current-state와 실제 런타임이 어긋난다 | 자동 덮어쓰기 금지, 복구 후 다시 preview 부터 시작 |
| wave smoke failed and rollback succeeded | current release는 실패했고 이전 known-good로 복귀했다 | root cause 정리 후 새 releaseId로 다시 시도 |
| wave smoke failed and rollback failed | host state가 중간 상태로 남을 수 있다 | repairRequired 처리 후 수동 복구 |

## Polling Cadence

- `10-20s` only while the workflow is clearing checkout, install, test, and synth
- `60-90s` during data host launch, EBS attach, and bootstrap
- `60s` while waiting for app host bootstrap and ALB target health
- `60s` while waiting for late gateway rollout or ALB draining

`warm-host-partial` 에서는 초 단위 polling 대신 wave 경계만 본다.

- preview/preflight 동안만 빠르게 본다
- reconcile 중에는 해당 wave 종료 전까지 중복 재시도하지 않는다
- scoped smoke 결과가 나올 때만 다음 판단으로 넘어간다
- rollback에 들어가면 operator는 rollback 완료 또는 failure marker만 본다

문서가 제대로 동작한다는 뜻은, deploy 중간에 같은 URL과 같은 상태를 초 단위로 계속 새로 찌르지 않아도 된다는 뜻이다. phase가 바뀔 때만 다음 확인으로 넘어간다.

## Minimal Proof Checklist

deploy를 \"끝났다\"고 부를 수 있는 최소 조건은 항상 세 가지다.

1. GitHub workflow run `completed/success`
2. `EvDashboardPlatformStack` `UPDATE_COMPLETE`
3. workflow post-deploy public smoke 성공

셋 중 하나라도 비면 lesson만 읽고 넘어가지 말고, 그 지점에서 멈춰 원인을 적는다.

## Scope Boundary

이 문서는 `ev-dashboard` canonical runtime operator loop만 다룬다.

- prod 전 temporary candidate proof는 [ev-dashboard-preprod-release-gate.md](ev-dashboard-preprod-release-gate.md)
- deploy 전 gate는 [ev-dashboard-ecs-preflight-gate.md](ev-dashboard-ecs-preflight-gate.md)
- deploy 후 UI smoke와 old path retire는 [ev-dashboard-ui-smoke-and-decommission.md](ev-dashboard-ui-smoke-and-decommission.md)

새로운 lesson이 생겨도, deploy 도중의 판단 규칙은 이 문서에 먼저 승격한다.

## Warm-Host Partial Operator Response

`warm-host-partial` 은 broad self-heal이 아니라 conservative operator lane이다.

현재 자동 복구는 제한적이다.

- 컨테이너만 `missing/stopped`
- expected runtime spec, image, port, env hash 는 그대로
- `last-known-good` 와 `current-state` 도 일치

이 경우에만 host가 같은 컨테이너를 다시 띄워 본다. 그 외 drift는 계속 `repairRequired` 로 승격한다.

운영자는 아래 순서만 따른다.

1. preview에서 impact classification을 확인한다.
2. `backend-only / gateway-required / front-required` 중 무엇인지 먼저 고정한다.
3. 필요한 `gateway/front` 가 빠졌다는 fail이면 manifest를 수정하고 새 release로 다시 시작한다.
4. drift 또는 `repairRequired` fail이면 host state를 먼저 정상화한다.
5. wave failure가 나면 rollback 성공 여부를 먼저 확인한다.
6. rollback 성공이면 원인 수정 후 새 releaseId로 다시 시작한다.
7. rollback 실패면 partial lane을 멈추고 host 수동 복구 절차로 전환한다.
