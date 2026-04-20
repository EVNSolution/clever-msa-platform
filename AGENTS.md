# AGENTS.md

## Must Know

- This directory is the active platform root for CLEVER MSA work.
- Treat `docs/` as the source of truth for architecture, boundaries, mappings, contracts, and rollout decisions.
- `AGENTS.md` and every `README.md` in this workspace are operational guidance only. They are not canonical truth.
- Treat `development/` as a whitelist of independent implementation repos exposed from the root.
- The current root whitelist is `front-web-console`, `edge-api-gateway`, `runtime-prod-release`, `runtime-prod-platform`, and the active `service-*` repos.
- Do not treat this root as a shared runtime codebase.
- Start from [WORKSPACE.md](/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/WORKSPACE.md) and [repo-map.md](/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/repo-map.md) before moving files or changing repo boundaries.

## Repo Selection Rules

- If the task is architecture, migration, mapping, contract, or rollout work, update `docs/` first.
- If the task is local compose, seed orchestration, env templates, or smoke scripts, use the out-of-band integration repo. It is not part of the root `development/` whitelist.
- If the task is gateway routing or edge entry behavior, work in `development/edge-api-gateway/`.
- If the task is operator UI or admin UI behavior, work in the matching `front-*` repo only.
- If the task is backend behavior, work in the matching `service-*` repo only.

## Linked Child Repo Rules

- If a freshly cloned root workspace is missing child repo contents, run `git submodule update --init --recursive`.
- After pulling root changes that move child repo pointers, run `git submodule update --init --recursive` again.
- The first recursive submodule init can take noticeable time because it clones many private child repos in sequence.
- Do not reintroduce root-tracked implementation snapshots for active `development/*` repos.
- New root-visible `development/*` repos must be registered from the root as linked child repos immediately.
- Non-whitelisted support or legacy repos must stay out of the root `development/` tree.

## Boundary Rules

- Do not import one service repo directly from another service repo.
- Do not introduce shared base packages across service repos unless an approved design changes that rule.
- Do not place compose, env, seed-runner, or cross-repo glue inside service repos.
- Do not treat read-model services as masters. `*-operations-view` repos are read services, not sources of truth.
- Archive is document-only. Do not move runtime code into `docs/archive/`.

## Current Domain Notes

- `service-vehicle-registry` currently owns `vehicle_master + vehicle_operator_access` together.
- `service-settlement-operations-view` temporarily holds the current placeholder settlement runtime.
- `service-settlement-registry` is an active runtime repo for global settlement config, company/fleet pricing tables, and any remaining settlement policy compatibility surface.
- `service-delivery-record` is an active runtime repo for delivery source records and daily input snapshots only.
- `service-terminal-registry` and `service-telemetry-hub` are active runtime repos and must stay within their approved boundary specs.

## Remote Frontend Proxy Warning

- If a user configures `front-web-console` `5174` to proxy to a remote API target, explicitly send this warning:
  - `현재 로컬 프론트 테스트의 CRUD는 실제 DB에 영향을 줍니다. 변경을 원하면, PROXY TARGET을 변경하십시오.`
- Prefer `.env.local-test` for dev/staging remote targets and reserve `.env.local` for intentional real-data checks.
- Current dev/local-test remote target is `https://clever-hub-dev-public-alb-709320164.ap-northeast-2.elb.amazonaws.com`.
- Default frontend testing should use `.env.local-test`; reserve `.env.local` for explicit prod verification only.

## Local Verification Questions

- Before starting local verification, ask the user which mode they want.
- Before starting `5174`, `8080`, low-CPU hybrid, or full Docker, explicitly send the mode-selection questions below and wait for the user's answer.
- Do not choose a mode on the user's behalf when the request is only "open it", "bring it up", or "run local verification". Ask first.
- If you already started the wrong mode, stop, report the current state briefly, and ask which mode to keep.
- Use this mode-selection question by default:
  - `어떤 모드로 열까요: local-sandbox(mock, 무영향), local-test(dev/staging), real-proxy?`
- Ask one more question only when the user selects `local-test(dev/staging)`:
  - `local-test는 실제 dev/staging DB에 영향을 줄 수 있습니다. 쓰기/CRUD도 허용할까요?`
- Map the answers like this:
  - `local-sandbox`
    - use `front-web-console` `npm run dev:local-sandbox`
    - treat it as a mock-only, no-network, manual frontend verification mode
    - require host entries before opening the browser:
      - `127.0.0.1 ev-dashboard.com`
      - `127.0.0.1 cheonha.ev-dashboard.com`
    - if the host entries are missing, explain that the browser will resolve public DNS and the local sandbox will not open correctly
    - if host entries are correct but the page still will not open in a browser, suspect HSTS or forced HTTPS upgrade next
    - `local-sandbox` is plain HTTP on `5174`; use a fresh browser profile or clear HSTS state before debugging the app
  - Frontend-only + real proxy + CRUD allowed
    - use `front-web-console/.env.local`
    - current real proxy target is `https://ev-dashboard.com`
    - run `npm run dev`
    - do not bring up `8080` unless the user explicitly asks for full integration
  - Frontend-only + real proxy + CRUD not allowed
    - do not use `front-web-console/.env.local`
    - switch to `front-web-console/.env.local-test` or ask for another safe target
  - Frontend-only + remote local-test(dev/staging) target
    - use `front-web-console/.env.local-test`
    - current dev target is `https://clever-hub-dev-public-alb-709320164.ap-northeast-2.elb.amazonaws.com`
    - run `npm run dev:local-test`
  - Backend development + local runtime
    - use low-CPU hybrid or full Docker depending on the requested scope
  - Full integration smoke
    - use the out-of-band integration repo and `8080`

## Legacy Workspace

- `../MSA-Server/` is a legacy/reference workspace, not the active implementation root.
- Use it only for historical context, old notes, or migration cross-checks.
- `hub.evnlogistics.com` is legacy bridge context, not the default current operator target for `front-web-console` remote proxy checks.
