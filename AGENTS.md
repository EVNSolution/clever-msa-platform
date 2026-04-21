# AGENTS.md

## Must Know

- This directory is the active platform root for CLEVER MSA work.
- Treat `docs/` as the source of truth for architecture, boundaries, mappings, contracts, and rollout decisions.
- `AGENTS.md` and every `README.md` in this workspace are operational guidance only. They are not canonical truth.
- Treat `development/` as a whitelist of independent implementation repos exposed from the root.
- The current root whitelist is `front-web-console`, `edge-api-gateway`, `runtime-prod-release`, `runtime-prod-platform`, and the active `service-*` repos.
- Do not treat this root as a shared runtime codebase.
- Start from [WORKSPACE.md](WORKSPACE.md) and [repo-map.md](repo-map.md) before moving files or changing repo boundaries.

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

## Branch Naming Rules

- New branches created from this root or any linked child repo must use a semantic prefix, not a tool/user prefix.
- Do not use `codex/` as the branch prefix for new work.
- Choose exactly one primary prefix based on the dominant change:
  - `feat/`
    - new user-facing capability, new API surface, new workflow, new runtime slice
  - `fix/`
    - bug fix, regression fix, data correction, broken contract repair
  - `refactoring/`
    - internal structure cleanup without intended behavior change
  - `docs/`
    - documentation-only updates
  - `chore/`
    - maintenance, dependency/config/script cleanup, non-feature operational work
  - `test/`
    - test-only additions or test harness changes
  - `hotfix/`
    - urgent production fix that should read as an emergency patch
- Use a short kebab-case slug after the prefix that describes the actual task.
- Preferred shape is `<prefix>/<scope>-<summary>`.
- Keep the slug business-readable. Do not encode agent names, usernames, timestamps, or local machine context into the branch name.
- If the task spans multiple child repos, keep the same semantic prefix and as similar a slug as practical across the related repos.
- If behavior changes and refactoring happen together, name the branch for the user-visible outcome, not the incidental internal cleanup.

Examples:

- `feat/public-openapi-edge-ownership`
- `fix/edge-readback-command`
- `refactoring/workspace-relative-links`
- `docs/branch-naming-policy`
- `chore/release-evidence-cleanup`
- `test/driver-work-log-coverage`

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

## Local Verification

- Before starting local verification, ask the user what they want to validate and whether live-data impact is acceptable.
- Do not choose a verification setup on the user's behalf when the request is only "open it", "bring it up", or "run local verification". Ask first.
- Keep operational execution detail out of `AGENTS.md`. Follow repo-local scripts and canonical docs when those details are needed.

## Legacy Workspace

- `../MSA-Server/` is a legacy/reference workspace, not the active implementation root.
- Use it only for historical context, old notes, or migration cross-checks.
- legacy bridge domains are reference-only context, not the default current operator target for `front-web-console`.
