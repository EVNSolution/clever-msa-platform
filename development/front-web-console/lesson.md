Source: https://lessons.md

# front-web-console Lessons.md

## Build Here, Route Elsewhere

This repo owns the web app and its image build. It does not own the shared `ev-dashboard.com` ALB, ACM, Route53, or ECS deploy workflow. Keep the runtime entrypoint in the dedicated infra repo.

## Keep The Front Door Narrow

`ev-dashboard.com` should stay the web console host. API ingress, Swagger, and Django admin stay on the API side so the front app does not inherit backend control-surface paths.

## Tag Images By Commit

The deploy contract for this repo is `front-web-console:<sha>`. Avoid `latest` and avoid repo-local deploy logic that hides which image revision is actually running.

## Remote API Rehearsal Needs A Full Base URL

The default production contract is still same-host `/api`. For front-only ECS rehearsals, the image build must accept an explicit `VITE_API_BASE_URL`, and that value needs the full external prefix such as `https://.../api`. Passing only the host will break the bundle because the app concatenates endpoint paths directly onto the configured base URL.

## Remote API Rehearsal Also Needs CORS

Once the bundle is served from a new domain, browser policy matters. `next.ev-dashboard.com` worked against `https://hub.evnlogistics.com/api` because that API already returned `Access-Control-Allow-Origin: https://next.ev-dashboard.com` with credentials enabled. Do not treat a remote API base as valid for browser traffic until that header is verified from the real target.

## Blank Build-Time API Base Values Must Collapse Back To `/api`

The production login regression came from a subtle build contract mismatch. The image pipeline could leave `VITE_API_BASE_URL` present but blank, and the bundle treated that as a real value instead of falling back to same-host `/api`. The public symptom was immediate:

- login POST went to `/auth/identity-login/`
- the edge returned `405`
- anonymous shell smoke still looked fine

Keep the front default strict:

- missing `VITE_API_BASE_URL` -> `/api`
- blank `VITE_API_BASE_URL` -> `/api`
- explicit non-blank override -> keep it as-is

Lock that behavior with a small unit test before rebuilding the image.

## Subdomain Shell Contract

The company subdomain is a dedicated product surface, not a menu branch inside the main domain shell.

- main domain stays on the system-admin surface
- company manager sessions are rejected from the main-domain shell
- system-admin sessions are rejected from the subdomain shell
- subdomain `/` opens the dashboard first
- subdomain login keeps the company header visible
- the subdomain top-level launcher stays ordered as `대시보드 / 차량 / 정산`
- the launcher sits beside the square brand card instead of behaving like a permanent sidebar
- vehicle navigation appears as a detached block with `홈 / 배송원 / 차량 / 차량 배정`
- company cockpit deep links still go through the shared navigation-policy redirect path
- main domain `/vehicles/home` must never fall into `/vehicles/:vehicleRef`
- settlement internal navigation stays ordered as `홈 / 배차 데이터 / 배송원 관리 / 운영 현황 / 정산 처리 / 팀 관리`
- settlement navigation appears as a detached block below the launcher cluster, not as a dashboard sidebar
- the rule shell stays structural only: no persisted editor, no save button, no submit action, and no write API path

## Local Dev Mode Split

`front-web-console` has three distinct local modes:

- `npm run dev`
  - host loop for `localhost:5174`
  - no sandbox route
  - no browser-side `/api` mock layer
- `npm run dev:local-test`
  - safer remote proxy rehearsal
  - reads `.env.local-test`
  - may still proxy `/api` to a remote target
  - no sandbox route
- `npm run dev:local-sandbox`
  - host-based manual test mode for `ev-dashboard.com` and `cheonha.ev-dashboard.com`
  - `/__dev__/session` is enabled
  - `/api` is always mocked in-browser
  - never falls through to a real `/api`

Host entries to keep in sync with that mode:

- `127.0.0.1 ev-dashboard.com`
- `127.0.0.1 cheonha.ev-dashboard.com`

If those host entries are missing, the browser will resolve public DNS and the local sandbox will silently miss the local `5174` server.

`ev-dashboard.com` family hosts are also easy to break with HSTS memory:

- local-sandbox is plain `http://...:5174`
- if a browser upgrades the host to HTTPS, the page will fail even though the Vite server is healthy
- use a fresh browser profile or clear HSTS state for the domain before blaming the app

Safari and stricter site-data policies can reject `localStorage` writes during `세션 주입`. The sandbox flow should degrade to an in-memory session so local manual verification still works without forcing the user into browser settings first.

Reset contract:

- `세션 초기화` clears the stored session payload
- `세션 초기화` clears local sandbox preset bookkeeping
- `세션 초기화` clears mock API memory state
- after reset, the page should behave like a fresh signed-out local-sandbox session

## Subdomain Shell Visual Hierarchy

The refined company shell works only when the launcher and settlement navigation keep their roles separate.

- the launcher cluster owns the brand card and the top-level `대시보드 / 차량 / 정산` launcher only
- settlement navigation is a detached block below that cluster, not a permanent dashboard rail
- vehicle navigation follows the same detached workspace pattern as settlement
- the brand card and detached settlement sidebar should read as the same surface family
- the brand card and detached workspace sidebars must keep the same width as a fixed shell contract
- the company shell now has a global top-right header for alerts and account actions across every subdomain page

## Detached Workspaces Can Grow Incrementally

A single launcher can accumulate more than one detached workspace over time without changing the shell model.

- add new detached workspaces under the same launcher instead of inventing a separate shell
- regroup existing CRUD pages into the new workspace when that preserves the domain boundary
- do not invent new domain surfaces just because the navigation grouping changes

## Settlement Dispatch Keeps Two Different Layout Modes

`정산 > 배차 데이터`는 한 가지 레이아웃만 고집하면 안 된다.

- 넓은 뷰포트에서는 `업로드 범위 | 업로드 파일` 2열 구조를 유지한다.
- 좁은 뷰포트에서만 `업로드 범위`를 가로 launcher/expander로 접는다.
- 접힘 상태는 세로 카드가 아니라 낮은 가로 bar여야 한다.
- local-sandbox에서는 `/drivers/` read mock이 있어야 하고, unsupported API 경고를 화면에 노출하지 않는다.
