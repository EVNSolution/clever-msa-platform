Source: https://lessons.md

# CLEVER Lessons.md

## Start With One Boundary

Cross-repo runtime patches go wrong when several repos move at once and no one remembers which layer really changed behavior. The safer pattern is small and repeatable: one repo at a time, one focused test, one minimal change, one verification pass, one recorded lesson. If the rule matters beyond a single repo, copy it back to this root file.

## Seed The Repo Before You Wire The Submodule

An empty remote repo does not behave like the existing linked child repos. `git submodule add` against a brand-new empty remote stops at checkout because there is no born branch to attach. The safe order is: create the remote, clone it, add the initial scaffold, commit and push `main`, then register it from the root as a linked child repo.

## Keep The Public Edge Simple

`ev-dashboard.com` should stay the front door for `front-web-console`. API ingress, Swagger, and Django admin belong on the API side, not on the web console namespace that already owns `/admin/*`.

- `ev-dashboard.com` -> `front-web-console`
- `api.ev-dashboard.com` -> edge/API/docs/admin

## Preserve Runtime Names And Ports

When a gateway already hardcodes internal upstream names, the new runtime must preserve them instead of "cleaning them up" in the infra layer. For the `ev-dashboard` ECS slice, that means `front-web-console` still listens on `5174`, `service-account-access` stays reachable as `account-auth-api:8000`, and the public ingress still sends same-host `/api/*` traffic to the gateway.

## ACM Validation Can Be The Long Pole

The first `next.ev-dashboard.com` ECS rehearsal looked stalled because GitHub Actions stayed in `cdk deploy` while almost all resources were already up. The actual blocker was ACM DNS validation, and the stack only resumed after Route53 validation records propagated and the certificate flipped to `ISSUED`. When CloudFormation is still `CREATE_IN_PROGRESS`, check the certificate resource before assuming the deploy is hung.

## Immutable ECR Tags Change Retry Semantics

This AWS account keeps app ECR repos on `IMMUTABLE` tags. That is good for traceability, but it means rerunning the same SHA build is not idempotent: the second push fails with `tag invalid ... already exists`. Retry logic needs a new commit SHA or a workflow that detects an already-pushed image and skips the push step.

## Front-Only ECS Rehearsals Need CORS, Not Just A Base URL

Injecting `VITE_API_BASE_URL=https://.../api` is only half of a front-first pilot. The browser still needs the remote API host to allow the new origin. During the initial bridge-backed rehearsal for `next.ev-dashboard.com`, `https://hub.evnlogistics.com/api` returned `Access-Control-Allow-Origin: https://next.ev-dashboard.com`, which proved the pilot could load read-only data without same-host `/api`. Keep that as historical bridge evidence only, not as current operator target guidance.

## Desired Count Zero Means A Real 503

`api.next.ev-dashboard.com` can exist in Route53 and ALB listener rules before any API task is running. With `edge-api-gateway` desired count set to `0`, the public result is a real `503` from the load balancer. Treat that as an expected front-only pilot state, not as proof that the ALB or certificate is broken.

## Pin Supported Engine Versions

The first auth-slice infra deploy failed before any app code ran because the stack asked RDS for a PostgreSQL engine version that Seoul does not currently offer. In this environment, `16.4` failed and `16.13` succeeded. Treat engine version support as a live AWS constraint, not as a generic Postgres choice.

## Service Connect Names Are Not Docker DNS

`edge-api-gateway` came from a Docker Compose world where `resolver 127.0.0.11` worked. On ECS/Fargate, that resolver is wrong. For this stack, the safe rule is: do not carry Docker DNS assumptions into ECS unchanged.

## Variable Proxy Pass Is Not A Safe Service Connect Pattern

The next failure after the Docker resolver fix was subtler: `nginx` request-time DNS through `proxy_pass http://$variable` still could not resolve the new organization slice on ECS. The direct Service Connect upstream worked for stable core routes, but the variable form kept returning `502` even after the backend task was healthy. For this stack, treat `variable proxy_pass` as incompatible with Service Connect rollout paths unless you have proven the resolver path inside the task.

## Direct Upstreams Beat Variable DNS For Core Routes

The first ECS gateway fix replaced the Docker resolver, but `proxy_pass` through variables still caused `account-auth-api` to resolve the wrong way at request time. For the core `ev-dashboard` routes, the stable pattern is direct upstreams:

- `proxy_pass http://account-auth-api:8000;`
- `proxy_pass http://web-console:5174;`
- `proxy_pass http://organization-master-api:8000;`

Use request-time variable resolution only where the upstream really needs to stay dynamic.

## Gateway Order Matters When A New Slice Adds Direct Upstreams

Changing the gateway image and adding a new backend service in the same deploy is not enough by itself. If the gateway task starts before the new backend service is registered in Service Connect, `nginx` can fail or serve stale `502`s even though CloudFormation later reports success. For new slices behind direct upstreams, make the infra stack update order explicit so the new backend service is created before the gateway rolls.

## Prod Smoke Should Stay Read-Only By Default

For the `Company Governance` slice, it was safe to prove the runtime with read-only checks in production:

- `/api/org/companies/public/`
- `/api/org/companies/`
- `/api/org/fleets/`

That was enough to show the routing, auth, and DB wiring were correct without polluting real production data. Do not use write-path smoke in prod unless the user explicitly wants a data-mutating check.

## Keep Close-Out Status In One Runbook

Once a migration stops being “implementation” work and becomes “operator close-out”, the status should move out of scattered slice notes and into one operator packet. For `ev-dashboard`, the honest current operator guide is the trio:

- `docs/runbooks/ev-dashboard-ecs-preflight-gate.md`
- `docs/runbooks/ev-dashboard-ecs-deploy-operator-loop.md`
- `docs/runbooks/ev-dashboard-ui-smoke-and-decommission.md`

Keep rollout notes as truth and execution record, but keep the live “what do I do before, during, and after deploy?” answer in this runbook set only.

## Do Not Promote The Bridge Lane Into Source Of Truth

Once a surface reaches `infra -> CDK/ECS -> prod`, stop talking about the legacy central deploy bridge lane as if it still defines runtime truth. For `ev-dashboard`, the canonical operator path is the infra repo and its ECS runbooks. `clever-deploy-control` may still exist for other surfaces or exceptions, but that does not make it the source of truth for the migrated surface.

## Do Not Leave Legacy Hub Subroutes In Live Runbooks

When `ev-dashboard.com` becomes the canonical prod surface, live operator runbooks and frontend proxy defaults must move with it. `hub.evnlogistics.com` can stay in historical rollout evidence or explicit bridge notes, but it should not remain in current runbooks as the default real-data target. Leaving that wording behind causes future sessions to route verification through the wrong surface even after the canonical runtime moved.

## Keep Future Work In Three Separate Lanes

After the canonical `ev-dashboard` runtime is stable, the next work should not collapse into one vague “platform cleanup” bucket. Keep three distinct lanes:

- canonical `ev-dashboard` development and release work
- `archive/develop` cleanup and reclassification
- cross-service template standardization for deploy structure, directory layout, and hygiene files

That separation keeps cleanup and templating from hijacking the live release lane, and it prevents release urgency from turning archive/template work into undocumented side patches.

## Archive Cleanup Is A Classification Pass

When cleaning `archive/develop` leftovers, the safe rule is classification before deletion. If a rollout plan is useful only as execution history, move it to `docs/archive/historical/rollout/`. If the same file already exists there, remove only the stale active copy. Do not treat archive cleanup as a hidden repo-pruning pass or a shortcut for deleting old operator evidence.

## Template Rollout Should Standardize The Repo Surface, Not The Domain Code

When standardizing many service repos, the baseline should cover deploy-facing structure and hygiene only:

- `.gitignore`
- README sections
- build workflow baseline
- Dockerfile and entrypoint conventions
- lesson file placement

Do not turn that into a hidden requirement that every repo share the same internal business-code tree. Standardize the repo surface first, then leave justified domain structure alone.

## Deploy Docs Must Fit On One Operator Loop

When deploy guidance is split across `lesson.md`, infra-local lessons, rollout notes, and runbooks, the deploy feels slower than it really is because the operator keeps reinterpreting the same state. The fix is not “more notes”. The fix is one short operator loop with:

- exact command order
- phase-by-phase time budget
- wait signals
- stop versus debug criteria

For `ev-dashboard`, preflight and decommission stay as separate runbooks, but the in-between deploy judgment now belongs in `docs/runbooks/ev-dashboard-ecs-deploy-operator-loop.md`.

## Archive Superseded Plans Even If They Were Never Fully Checked Off

Residual cleanup gets dangerous when stale rollout plans stay in active folders just because their old checklist was never fully marked complete. Active placement should reflect current operator value, not historical intent. If the runtime, repo names, or rollout lane have already moved on, archive the plan as superseded execution history and keep only genuinely open plans in `docs/rollout/plans/`.

## Goal Cleanup Is Often Clarification, Not Movement

`docs/goals/` should stay small, but cleanup there does not always mean archiving files. If a goal doc still expresses a valid north-star, keep it and tighten the reading rule instead: current runtime and deploy truth belong in mappings, runbooks, and living rollout docs, not in goal documents.

## Public Smoke Must Be Part Of The Workflow Gate

If public smoke still depends on a human remembering to run `curl` after a green `cdk deploy`, the deploy is not actually closed. For `ev-dashboard`, the minimum external smoke now belongs inside the same workflow:

- front shell `200`
- auth/docs/admin core paths
- slice-specific `health` and protected `401` probes when those slices are enabled

Manual browser smoke still matters, but only after the workflow has already proven the public edge did not regress.

## Runtime Changes Must Change The Gate Language Too

Do not carry the old runtime's operator vocabulary into a new topology. When `ev-dashboard` started its EC2 app/data host path, the useful preflight and operator hints changed with it:

- config must fail fast on host subnet inputs
- imported EC2 subnets need availability zones
- wait signals must talk about instance launch, user-data/bootstrap, EBS attach, and service startup

Leaving RDS or Service Connect wait hints in place after the runtime changes makes the operator loop slower and more error-prone, even if the code itself is correct.

## Use Workflow Profiles To Avoid Wasteful Full Runs

Once EC2 host bootstrap moved into a Python package, a separate precheck layer became slower than the deploy it was supposed to save. The right fix is to split the workflow by intent:

1. `full` for release-grade proof
2. `bootstrap-proof` for `synth -> deploy -> smoke`
3. `smoke-only` for rerunning edge verification without another stack update

If a debug path is routinely skipped in successful runs, remove it and keep the smallest honest workflow profile instead.

`24446648973` closed the argument in practice. The `bootstrap-proof` profile (`synth -> deploy -> smoke`) finished successfully in under a minute on the dev lane, so future host-bootstrap debugging should start there instead of paying for a full release-grade run.

## Cockpit Proof Needs Organization, Not Just Auth

`cheonha.ev-dashboard.com` exposed a gap in the first EC2 proof lane. A shell/auth-only app host can pass apex auth smoke and still fail every real cockpit path because cockpit boot needs both:

- `service-organization-registry` public tenant resolve
- `service-account-access` workspace bootstrap against `organization-master-api`

For `ev-dashboard`, the first cockpit-ready EC2 proof is therefore `shell/auth/company-governance`, not pure shell/auth. The proof lane has to include organization DB bootstrap, `organization-master-api` on the app host, `/api/org/*` on the proof gateway, and cockpit hosts inside CSRF trusted origins before deploy proof means anything.

## Cockpit 404 Usually Means Seed Or Image Drift First

The first live `cheonha` proof on the dev EC2 lane returned `404` on `GET /api/org/companies/public/resolve/?tenant_code=cheonha`, but the cause was not routing. Two separate preconditions were missing:

- `service-organization-registry`, `service-account-access`, and `front-web-console` images on the app host were still old SHAs even after the code had merged to `main`
- the dev organization database had no `Company` row for `tenant_code=cheonha`

For future cockpit rollouts, verify these in order before debugging DNS or nginx:

- ECR contains the expected service `main` SHA images
- infra deploy env image URI vars point at those SHAs
- app host containers actually reconciled to those SHAs
- only then check cockpit tenant seed data and `public/resolve`

## Stack Success Is Not The Same As Slice Success

`24372474821` and `EvDashboardPlatformStack UPDATE_COMPLETE` still left `/api/org/*` broken. The fix only closed after the second deploy `24373001123`, where the gateway ordering and upstream style were corrected. Record both the infra result and the public endpoint result before calling a slice done.

## Use Deployment Wait Patterns Instead Of Constant Polling

ECS/CDK rollout proof is not one signal. It is a sequence. Watching the wrong signal too early creates noise and leads to unnecessary retries.

Use this order:

1. GitHub Actions job phase
   Wait for `Checkout -> Install dependencies -> Run unit tests -> Synthesize stack` to clear. This usually finishes within about `30-60s` for the current `infra-ev-dashboard-platform` workflow.
2. CloudFormation phase
   Once the workflow enters `Deploy stack`, wait for `EvDashboardPlatformStack` to flip from `UPDATE_COMPLETE` to `UPDATE_IN_PROGRESS`. That is the first honest sign that AWS has started changing runtime resources.
3. Stateful resource phase
   When the slice adds new databases, expect a long quiet period while `AWS::RDS::DBInstance` resources are being created. In this period, public routes often return `502` because the gateway is already on the new config while the new backend services do not exist yet. This is expected. Do not treat early `502` as a routing bug until the new ECS services appear.
4. ECS service registration phase
   After the new DB resources settle, watch `aws ecs list-services` and `aws ecs describe-services` for the new service names to appear with non-zero `desiredCount`. This is the signal that gateway dependencies can actually resolve.
5. Public smoke phase
   Only after the new services exist in ECS should public smoke matter. Then check the slice endpoints as a group, not one by one over and over.
   If the new backend services exist but `edge-api-gateway` is still rolling, a short second `502` window can still happen while Service Connect names settle for the new task and the old task is draining. That is different from the earlier "backend service not created yet" `502`.
6. Completion phase
   The slice is only done when all three agree:
   - GitHub run `completed/success`
   - CloudFormation stack `UPDATE_COMPLETE`
   - public smoke returns the expected `200/302` results

Use a calmer polling cadence:

- `10-20s` only while waiting for the GitHub job to move from `synth` into `deploy`
- `60-90s` while CloudFormation is creating RDS or other stateful resources
- public smoke only when a new phase boundary is reached, not on every short poll

Use the error shape to decide whether to wait or debug:

- `502` while the new ECS services do not exist yet usually means "keep waiting for DB and service creation"
- `502` after the new ECS services are already running usually means "check edge rollout state and edge logs before touching config"
- `401` on a protected endpoint is often the first honest proof that the route, auth middleware, and database wiring are alive

## Let Admin Own Its Prefix

The important lesson from this patch is that Django admin should own the public prefix it serves. Hiding a prefixed route behind a gateway rewrite back to `/admin/` breaks redirects, login flow, and follow-up asset requests.

- preferred public path: `/admin/account-access/`
- preferred service-local path: `/admin/account-access/`

## Admin Includes Static

Admin is not only a login URL. It is templates, redirects, CSS, JS, and static asset delivery as one surface. If admin is public behind gunicorn, the service must keep template settings, define `STATIC_ROOT`, run `collectstatic`, and make `/static/admin/` reachable through the gateway.

## Domain Support Must Reach The Workflow And Smoke Layers

Adding a new public host is not finished when only the app code and stack code know about it. The honest closure rule is:

- frontend resolver accepts the host
- infra config and stack synthesize the host
- deploy workflow exports the host input
- post-deploy smoke probes the host directly

If the workflow still omits the host variable, or smoke still checks only the apex host, the domain change is only partially integrated.

## Verify From Outside

Local targeted tests are the minimum gate, but edge-facing routes still need a public smoke after deploy. For this class of patch, the shortest honest proof is:

- `/openapi.yaml`
- `/swagger/`
- `/redoc/`
- `/admin/account-access/`
- `/admin/account-access/login/`
- `/static/admin/css/base.css`

If a larger suite is blocked by local DB credentials or missing daemons, write down the blocker instead of pretending the whole system was verified.

## Auth Slice Success Is Narrow On Purpose

The first successful `api.next.ev-dashboard.com` deploy proves only the auth/docs/admin slice:

- `/api/auth/health/`
- `/openapi.yaml`
- `/swagger/`
- `/redoc/`
- `/admin/account-access/`

That is enough to validate the first ECS backend slice, but it is not proof that the whole backend graph is already migrated.

## Route53 Can Move Before Your Local Resolver Does

During the apex cutover, Route53 already pointed `ev-dashboard.com` and `api.ev-dashboard.com` at the new ALB while the local machine still failed normal name resolution for a short time. In that window, `dig` against a public resolver and `curl --resolve` against the ALB IPs were the honest way to verify the cutover instead of trusting local DNS cache state.

## Retire The Old Self-Mutating Runtime Immediately

`test-test-sh` owned the old direct-IP runtime and could rewrite the apex record again if it restarted. After the new ALB answered correctly for `ev-dashboard.com`, the safe follow-up was immediate: set the old ECS service to `desired=0` and confirm `running=0`.

## Public GitHub Actions Billing Can Still Block Public Repo Builds

This account hit a GitHub billing limit where public service repos stopped before any job step started. The exact annotation was `The job was not started because recent account payments have failed or your spending limit needs to be increased.` When that happens, do not keep retrying the workflow. Build locally, push to ECR yourself, then continue the infra deploy with explicit image URIs.

## Local Docker Workarounds Must Match ECS Platform

Local Mac builds are not safe by default for ECS in this stack. The first workaround push produced an image that Fargate could not pull because the manifest did not match `linux/amd64`. The safe fallback build is:

- `docker buildx build --platform linux/amd64 --provenance=false --push ...`

If you skip the explicit platform, you can lose time on a fake infra failure that is really just an image architecture mismatch.

## Blank Front API Base URLs Break Login At The Edge

The `front-web-console` hotfix after authenticated smoke exposed a quieter contract bug. The bundle defaulted `VITE_API_BASE_URL` with a nullish fallback, but the production image pipeline could still inject a blank string. That produced edge behavior like:

- login POST to `https://ev-dashboard.com/auth/identity-login/`
- `405 Method Not Allowed`
- anonymous shell looks healthy while authenticated smoke fails immediately

The safe rule is:

- treat blank and whitespace API base values the same as missing values
- normalize them back to same-host `/api`
- prove the behavior with a small unit test before rebuilding the image

## Django Container Defaults Must Not Override The Production Entrypoint

For `service-delivery-record` and `service-attendance-registry`, the Dockerfile still had `CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]`. In ECS that meant `entrypoint.sh` received arguments, skipped its default branch, and never ran `migrate + gunicorn`. The public symptom was subtle:

- `/health/` still returned `200`
- real data endpoints returned `500`
- logs showed unapplied migrations and Django dev server startup

The safe contract for these Django services is: keep `ENTRYPOINT ["./entrypoint.sh"]`, remove the Dockerfile `CMD runserver`, and let local development invoke `manage.py runserver` explicitly outside the production container contract.

## Smoke The Real Endpoint, Not Just The Prefix Root

`/api/dispatch/`, `/api/delivery-record/`, and `/api/attendance/` returning `404` did not mean Slice 3 failed. It meant the gateway rewrite was correct and the service root path simply was not an API route. For this slice, the honest production smoke was:

- `/api/dispatch/health/` -> `200`
- `/api/dispatch/plans/` -> `200 []` with admin JWT
- `/api/delivery-record/health/` -> `200`
- `/api/delivery-record/records/` -> `200 []` with admin JWT
- `/api/attendance/health/` -> `200`
- `/api/attendance/days/` -> `200 []` with admin JWT

Use the prefix root only to distinguish routing failure from application routing success. Do not use it as the final slice gate unless the service really defines `/`.

## Service Dependencies Delay Later Rollouts On Purpose

In Slice 3, `service-delivery-record` did not update immediately after its new task definition was created. That was not a stuck deploy. The stack intentionally waits for `service-attendance-registry` to finish before updating `delivery-record`, because the delivery service depends on `attendance-registry` at runtime. When you see only one service moving first, check the dependency chain before assuming CloudFormation ignored the image change.

## ALB Target Draining Can Outlast Healthy Public Smoke

Slice 4 proved that public smoke can already be correct while GitHub Actions and CloudFormation still look "busy". The key delay was not app startup. It was ALB target draining. This stack keeps the target group `deregistration_delay.timeout_seconds` at `300`, so the old `edge-api-gateway` target can hold the deploy open for several more minutes after the new task is already serving `200/404` responses. When public smoke has recovered but the run is still `in_progress`, check target draining before assuming the rollout is stuck.

## Temporary Bridges Must Degrade When JWT Trust Is Missing

Slice 4 also proved that "old public hub bridge still answers" is not the same as "old public hub trusts the new platform token". The temporary bridge prefixes on `https://hub.evnlogistics.com` returned `401 Invalid token` when `driver-ops` and `vehicle-ops` forwarded the new platform JWT. That means optional enrichments such as settlement, telemetry, and terminal lookups must degrade to warnings or null fields instead of failing the whole response with `500`.

## Read Models Need Honest Empty-State Smoke

For read-model slices, empty production data is not a failure if the endpoint semantics stay honest. Slice 4 closed with:

- `/api/dispatch-ops/board/` -> `200 []`
- `/api/dispatch-ops/summary/` -> `200` zeroed summary
- `/api/driver-ops/drivers/<unknown>/` -> `404 not_found`
- `/api/vehicle-ops/vehicles/` -> `200 []`
- `/api/vehicle-ops/vehicles/<unknown>/` -> `404 not_found`

## Pre-Prod Should Be A Temporary Release Lane

If prod 전에 한 단계가 필요하지만 상시 candidate 환경과 cloned DB 비용은 피하고 싶다면, 기본값은 `temporary pre-prod ECS lane` 이다. 핵심 규칙은:

- image는 한 번만 build
- 짧은 수명 subdomain으로 same SHA candidate proof
- 검증이 끝나면 lane 제거
- 같은 SHA를 prod에 release

이 구조의 목적은 prod 전 단계 추가지, 영구 테스트 환경 운영이 아니다.

## Shared-Data Pre-Prod Is Not Honest For Migration Releases

temporary pre-prod가 prod 데이터 계층을 공유하는 low-cost mode라면, 그 검증은 read-only 또는 좁은 reversible write smoke까지만 honest proof다. Django 서비스가 startup migration을 수행하는 계약을 가진 상태에서 migration-bearing release를 shared-data pre-prod로 먼저 띄우면, prod schema가 먼저 바뀔 수 있다. 이런 release는:

- cloned DB lane으로 올리거나
- pre-prod proof 범위를 read-only로 줄이고
- 별도 승인 하에 prod release를 다뤄야 한다

즉 low-cost pre-prod는 모든 release의 만능 기본값이 아니라 `schema-compatible release`에 맞는 운영 절충안이다.

That is the correct proof for a read-model runtime with no matching prod data. The failure mode to watch for is `500`, not `404`.

## New Service Connect Names Need A Late Gateway Roll

Slice 5 exposed a sharper version of the direct-upstream rule. Adding new settlement backends and updating `edge-api-gateway` in one stack was not enough by itself. The first gateway task came up before the new Service Connect names were actually usable, and nginx kept logging `could not be resolved (3: Host not found)` for:

- `settlement-registry-api`
- `settlement-payroll-api`
- `settlement-ops-api`

The honest wait pattern for a new direct-upstream slice is:

1. backend DB resources finish
2. backend ECS services reach steady state
3. `edge-api-gateway` rolls again after those services exist
4. only then do the new public routes settle

If the new services are already `running=1` and public `502` still remains, tail the gateway logs before changing config. In this stack, the fix was not another route rewrite. It was waiting for the late gateway service rollout that happened after the settlement services were created.

## Protected Settlement Smoke Is Honest Enough Without A Prod Write

The settlement slice did not need a production write-path smoke to prove the runtime. The honest external proof was:

- `/api/settlement-registry/health/` -> `200`
- `/api/settlements/health/` -> `200`
- `/api/settlement-ops/health/` -> `200`
- `/api/settlement-registry/settlement-config/metadata/` -> `401` without token
- `/api/settlements/runs/` -> `401` without token
- `/api/settlement-ops/runs/` -> `401` without token

That response shape proves gateway routing, JWT middleware, and backend reachability without mutating production settlement data.

## Repeated Prod Lessons Must Become A Preflight Gate

If the same rollout surprise happens twice, it is no longer just a lesson. It must become a deploy gate that runs before the next slice. For `ev-dashboard` that means the shared infra repo has to fail fast on:

- missing deploy env
- mutable image tags like `:latest`
- wrong domain for the selected environment
- later slices enabled without their prerequisite slices
- API slices enabled while `edge-api-gateway` is still set to `0`

The operator flow is now fixed:

1. read root and repo-local lesson
2. `npm run preflight`
3. `npm test -- --runInBand`
4. `npx cdk synth`
5. deploy
6. public smoke
7. lesson update

If a step fails, stop there. Do not "see what prod says" first.

## Mixed Gateway Rollouts Can Split A Slice Into 200 And 502

Slice 6 repeated the same gateway timing lesson in a clearer way. While the new support services were already coming up, the public health routes briefly split like this:

- `/api/regions/health/` -> `200`
- `/api/region-analytics/health/` -> `200`
- `/api/announcements/health/` -> `502`
- `/api/ticket/health/` -> `200`
- `/api/notifications/health/` -> `502`

That pattern did not mean only some routes were configured correctly. It meant the old and new `edge-api-gateway` tasks were both in play during the rollout. Once the new gateway task settled, all five health routes flipped to `200`. When a brand-new slice shows mixed `200/502` during gateway replacement, check rollout state before editing routes again.

## Support Slice Can Close On Health 200 Plus Protected 401

The support surface slice did not need a production write-path smoke either. The honest external proof was:

- `/api/regions/health/` -> `200`
- `/api/region-analytics/health/` -> `200`
- `/api/announcements/health/` -> `200`
- `/api/ticket/health/` -> `200`
- `/api/notifications/health/` -> `200`
- `/api/regions/` -> `401`
- `/api/region-analytics/daily-statistics/` -> `401`
- `/api/announcements/` -> `401`
- `/api/ticket/tickets/` -> `401`
- `/api/notifications/general/` -> `401`

That response shape is enough to prove routing, auth middleware, and backend reachability for a support slice without mutating production data.

## Preflight Must Verify That Image Tags Really Exist In ECR

Tag format checks were not enough for later slices. This stack keeps image URIs in repo vars because `workflow_dispatch` cannot carry unlimited properties, and those vars can drift away from the images that actually exist in ECR. Slice 7 only became trustworthy after preflight started querying ECR directly and failed fast on missing tags before `cdk deploy`.

For this migration, a deploy is not ready just because the image URI "looks like a SHA". It is only ready when preflight proves the referenced image tag exists in ECR.

## Terminal And Telemetry Closed As 7a, Not As A Full Listener Cutover

The honest Slice 7 closure is narrower than "all telemetry is done". What production proved on `2026-04-14` was:

- terminal registry public/admin surface on ECS
- telemetry hub health plus protected read paths on ECS
- telemetry dead-letter health plus protected admin list on ECS

What production did **not** prove was a live MQTT ingest cutover. `service-telemetry-listener` stays as `desired=0` until a real broker endpoint and credentials are confirmed. Do not turn the listener on just because the rest of Slice 7 is green.

## Telemetry Smoke Must Use Real Endpoints, Not The Prefix Root

`/api/telemetry/` is not the honest closure gate for this service because the app does not define a list root there. The final production proof for Slice 7a was:

- `/api/terminals/health/` -> `200`
- `/api/terminals/` -> `401`
- `/api/telemetry/health/` -> `200`
- `/api/telemetry/terminals/<uuid>/latest-location/` -> `401`
- `/api/telemetry-dead-letters/health/` -> `200`
- `/api/telemetry-dead-letters/` -> `401`

If telemetry health is `200` but the chosen read path is wrong, you can create noise by chasing a fake routing bug. Smoke the real endpoints that the service actually defines.

## UI Close-Out Needs A Real Smoke Account, Not A Local Fixture Credential

By `2026-04-14`, the live anonymous shell smoke for `https://ev-dashboard.com` was good:

- title `CLEVER 통합 웹 콘솔`
- login form visible
- protected routes like `/companies` and `/dispatch/boards` redirected back to the login shell
- no browser console errors during that shell smoke

That is enough to prove the public front door is alive, but it is **not** enough to close authenticated UI smoke. The repo default fixture credential `seed-admin@example.com / ChangeMe123!` returned `403 Invalid email or password.` against live `api.ev-dashboard.com`. Do not pretend that local fixture credentials are valid production smoke accounts. Authenticated UI close-out now requires a dedicated read-only smoke account or an equivalent secret-managed credential.

## Runtime Cutovers Must Audit GitHub Variable Scope, Not Just Variable Names

The EC2 app/data host cutover exposed a new deploy blocker before any AWS resource change began: the required keys existed conceptually, but not in the GitHub variable scope that the workflow actually reads. Repo-scope network values were present, while the new host-placement keys (`APP_HOST_SUBNET_ID`, `DATA_HOST_SUBNET_ID`) were absent from both `dev` and `prod` environment scopes. That means a runtime switch can fail in preflight even when the CDK stack and code are otherwise ready.

For future service migrations:

- audit repo-scope vars and environment-scope vars separately
- decide which new keys are global and which are lane-specific before changing the workflow
- add the scope expectation to repo-local lesson and README when a runtime contract changes

## Pre-Prod Is Not Real If Stack Identity Is Still Shared

The EC2 cutover work also proved that a `dev` or `candidate` lane is fake if the CDK stack id and fixed resource names still point to the same account/region objects as prod. Different domains and different GitHub env vars are not enough. If the stack name stays `EvDashboardPlatformStack`, a rehearsal run still mutates the prod stack.

For future runtime migrations:

- separate stack identity before claiming there is a candidate lane
- scope fixed resource names like SSM parameters to the lane
- verify the lane by synth output and stack name, not by domain variables alone

## EC2 Host Placement Needs Explicit Subnet-AZ Pairs

The first EC2 dev rehearsal made it past preflight, full tests, and synth, then rolled back in CloudFormation because the host subnets were paired with the wrong availability zones. Shared `PRIVATE_SUBNET_IDS` and `AVAILABILITY_ZONES` lists were not a safe source for host placement inference. For EC2 runtime work, host subnet placement must be carried as explicit pairs:

- `APP_HOST_SUBNET_ID` + `APP_HOST_SUBNET_AVAILABILITY_ZONE`
- `DATA_HOST_SUBNET_ID` + `DATA_HOST_SUBNET_AVAILABILITY_ZONE`

If the lane depends on EC2 instance placement, do not infer AZ from list order.

## EC2 Runtime Proof Must Freeze Scope To What The Host Can Actually Run

The first EC2 app/data host cutover attempt proved a second boundary problem after stack identity and subnet placement were fixed: the host bootstrap still did not have a real runtime contract for the later backend slices. The app host could fetch image metadata, but until it had a reconcile loop and concrete startup rules, it could only honestly run `front-web-console`, `edge-api-gateway`, and `service-account-access`.

For future runtime migrations:

- freeze the candidate proof to the slice the host can really run
- make preflight reject later slices until their host-level contract exists
- add a host reconcile loop whenever image SHAs live outside the host itself

On EC2, an immutable ECR SHA is only a deploy truth if something on the running host actually re-pulls and restarts that container.

## Data-Host Bootstrap Drift Can Masquerade As An App Wiring Failure

The first cockpit-ready EC2 proof showed a sharper version of the same rule. `service-organization-registry` was wired into the app host and gateway correctly, but `/api/org/*` still returned `502` because the existing data host never re-ran its bootstrap after the `organization_master` DB/role contract was added. The container error was `password authentication failed for user "organization_master"`, which looked like an app-side secret mismatch even though the real problem was stale host bootstrap state.

For future EC2 service additions:

- if a new slice changes the data-host database/bootstrap contract, force data-host replacement
- do not treat first-run Postgres auth failures as pure app env bugs until replacement policy is checked
- keep `userDataCausesReplacement` true on the data host so DB/role additions are actually applied

That fix still needs the right storage lifecycle. The next dev proof showed that `userDataCausesReplacement` plus a separate `AWS::EC2::VolumeAttachment` can fail with `AlreadyExists` because CloudFormation tries to move the existing volume before the old attachment is gone. For the current no-migration proof lane, the honest compromise is launch-time EBS block-device mapping on the data host instead of detachable reattachment semantics.

## EC2 Bootstrap Must Treat User-Data As A Thin Launcher

The first real dev stack create for the EC2 runtime rolled back before the host even booted because the data-host user-data exceeded EC2's 16 KB raw user-data limit. The root cause was simple: the Python bootstrap package had been inlined into user-data with heredocs. That is not sustainable for any service family.

For future EC2 conversions:

- use user-data only for package install, asset download, and systemd registration
- stage reusable bootstrap code as a CDK-managed asset, then download it on the host
- keep an explicit user-data size check in tests so growth fails locally instead of in CloudFormation

If a service transition needs to paste real source files into user-data, stop and move that logic into the packaged bootstrap/runtime layer instead.

## Deleted Paths Must Disappear From Generated Output Too

The bootstrap-precheck cleanup left one more class of dummy behind: ignored build output. The source files and active docs were already clean, but `development/infra-ev-dashboard-platform/dist/` still contained compiled `bootstrapPrecheck` JS files because the repo build did not clear `dist/` first. That makes audits noisy and can trick operators into thinking a dead path still exists.

For future cleanup work:

- treat ignored generated output as part of the cleanup surface
- make the repo build delete its output directory before recompiling
- verify the removed symbol/path no longer appears in regenerated output before calling the cleanup done

If a deleted path still exists only in compiled debris, remove the debris and harden the build so it cannot come back unnoticed.

## Repo Deletion Needs Runtime Inventory Truth, Not A Partial List

The workspace docs had a misleading state where `WORKSPACE.md` listed only part of the active `development/*` repos while later sections described newer repos as "planned targets" even though they were already active. That is enough to create a false cleanup candidate.

For future repo cleanup:

- decide repo retention from both `repo-map.md` and `docs/mappings/current-runtime-inventory.md`
- keep `WORKSPACE.md` active naming set fully aligned with the current runtime inventory
- do not delete a linked child repo just because one summary list forgot to include it

If runtime ownership says a repo is active, treat it as live infrastructure until the inventory and repo map both demote it.

When CDK values are needed at runtime on an EC2 host, do not serialize tokenized objects into static assets and assume they will resolve later. The `ev-dashboard` EC2 proof showed that `JSON.stringify(...)` on a manifest containing `instancePrivateIp` simply froze `${Token[...]}` into the file, and the app containers then failed on fake DB hostnames. For future host-runtime work, token-bearing runtime manifests must go through deploy-time-resolved storage such as Secrets Manager or SSM, while static assets should be limited to token-free metadata or code.

Do not let `bootstrap-proof` smoke depend on the entire later slice fleet coming up first. In the EC2 `ev-dashboard` runtime, the app host reconciles services in manifest order. If `edge-api-gateway` starts after attendance/dispatch/settlement/support images, a single slow pull or later-slice failure makes `/api/*` smoke look like a gateway bug when the real issue is startup sequencing. Keep the proof-critical order explicit: `front -> auth -> organization -> gateway -> later slices`.

Proof-only deploy profiles need config-level scope, not just fewer workflow steps. In the `ev-dashboard` EC2 lane, a \"fast\" profile is still noisy and expensive if the effective desired counts keep the full later-slice fleet enabled. For future runtime work, make the proof profile narrow the actual runtime contract that CDK synthesizes and that smoke validates, and reserve `full` for real full-fleet bring-up.
