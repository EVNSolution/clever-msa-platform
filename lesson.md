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
