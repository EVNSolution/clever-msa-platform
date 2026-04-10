# AGENTS.md

## Must Know

- This directory is the active platform root for CLEVER MSA work.
- Treat `docs/` as the source of truth for architecture, boundaries, mappings, contracts, and rollout decisions.
- Treat `development/` as a set of independent implementation repos exposed from the root as linked child repos. Do not treat this root as a shared runtime codebase.
- Start from [WORKSPACE.md](/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/WORKSPACE.md) and [repo-map.md](/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/repo-map.md) before moving files or changing repo boundaries.

## Repo Selection Rules

- If the task is architecture, migration, mapping, contract, or rollout work, update `docs/` first.
- If the task is local compose, seed orchestration, env templates, or smoke scripts, work in `development/integration-local-stack/`.
- If the task is gateway routing or edge entry behavior, work in `development/edge-api-gateway/`.
- If the task is operator UI or admin UI behavior, work in the matching `front-*` repo only.
- If the task is backend behavior, work in the matching `service-*` repo only.

## Linked Child Repo Rules

- If a freshly cloned root workspace is missing child repo contents, run `git submodule update --init --recursive`.
- After pulling root changes that move child repo pointers, run `git submodule update --init --recursive` again.
- The first recursive submodule init can take noticeable time because it clones many private child repos in sequence.
- Do not reintroduce root-tracked implementation snapshots for active `development/*` repos.
- New `development/*` repos must be registered from the root as linked child repos immediately.

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

## Local Verification Questions

- Before starting local verification, ask the user which mode they want.
- Use these exact branching questions in order:
  1. `백엔드까지 같이 수정/검증할 건가요, 아니면 프론트만 빠르게 볼 건가요?`
  2. `데이터는 로컬 localhost를 볼 건가요, 실제 프록시를 볼 건가요, 아니면 dev/staging 테스트 타깃을 볼 건가요?`
  3. `실제 DB에 영향을 주는 CRUD를 허용하나요?`
- Map the answers like this:
  - Frontend-only + real proxy + CRUD allowed
    - use `front-web-console/.env.local`
    - current real proxy target is `https://hub.evnlogistics.com`
    - run `npm run dev`
    - do not bring up `8080` unless the user explicitly asks for full integration
  - Frontend-only + safer remote target
    - use `front-web-console/.env.local-test`
    - run `npm run dev:local-test`
  - Backend development + local runtime
    - use low-CPU hybrid or full Docker depending on the requested scope
  - Full integration smoke
    - use `development/integration-local-stack` and `8080`

## Legacy Workspace

- `../MSA-Server/` is a legacy/reference workspace, not the active implementation root.
- Use it only for historical context, old notes, or migration cross-checks.
