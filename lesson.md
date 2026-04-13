# CLEVER platform lessons

## Patch workflow

- Cross-repo runtime changes should be done one repo at a time.
- For each repo, finish in this order:
  - add or update focused tests
  - make the minimal code/config change
  - verify locally
  - record the lesson in the repo
- If the lesson affects other repos or future rollout work, also copy the distilled rule into this root `lesson.md`.

## ev-dashboard runtime lessons

- `ev-dashboard.com` should stay dedicated to `front-web-console`.
- API ingress, Swagger, and Django admin should be separated from the web console host.
- Preferred public split:
  - `ev-dashboard.com` -> front
  - `api.ev-dashboard.com` -> edge/API/docs/admin

## Admin and docs path rules

- Do not expose Django admin on `ev-dashboard.com/admin/*`.
- CLEVER web console already uses `/admin/*` for front-end governance routes.
- If a Django service needs admin exposure through a shared gateway, let the service own the prefixed admin path directly. Do not hide it behind a gateway rewrite back to `/admin/`.
- Current preferred example:
  - public `/admin/account-access/`
  - service-local `/admin/account-access/`

## Gateway rules

- Shared gateway docs/admin routes must be declared before the catch-all `location /` block.
- Use exact or `^~` matches for docs/admin routes so the front proxy does not swallow them.

## service-account-access rules

- Keep service-local schema endpoints mounted at:
  - `/openapi.yaml`
  - `/swagger/`
  - `/redoc/`
- `django.contrib.admin` requires Django template configuration. Do not strip template settings from the service just because it is API-first.
- If Django admin is public behind gunicorn, ship static files too. Configure a real `STATIC_ROOT`, run `collectstatic`, and make `/static/admin/` reachable through the gateway.

## Verification notes

- Repo-local focused tests are the minimum acceptance gate for each patch.
- Full-suite verification can still be blocked by local infra such as missing DB credentials or missing local daemons; record the blocker explicitly instead of guessing.
