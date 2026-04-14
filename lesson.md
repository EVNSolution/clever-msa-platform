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

Injecting `VITE_API_BASE_URL=https://.../api` is only half of a front-first pilot. The browser still needs the remote API host to allow the new origin. For `next.ev-dashboard.com`, `https://hub.evnlogistics.com/api` was verified to return `Access-Control-Allow-Origin: https://next.ev-dashboard.com`, so the pilot can load read-only data without same-host `/api`.

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

## Stack Success Is Not The Same As Slice Success

`24372474821` and `EvDashboardPlatformStack UPDATE_COMPLETE` still left `/api/org/*` broken. The fix only closed after the second deploy `24373001123`, where the gateway ordering and upstream style were corrected. Record both the infra result and the public endpoint result before calling a slice done.

## Let Admin Own Its Prefix

The important lesson from this patch is that Django admin should own the public prefix it serves. Hiding a prefixed route behind a gateway rewrite back to `/admin/` breaks redirects, login flow, and follow-up asset requests.

- preferred public path: `/admin/account-access/`
- preferred service-local path: `/admin/account-access/`

## Admin Includes Static

Admin is not only a login URL. It is templates, redirects, CSS, JS, and static asset delivery as one surface. If admin is public behind gunicorn, the service must keep template settings, define `STATIC_ROOT`, run `collectstatic`, and make `/static/admin/` reachable through the gateway.

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
