# AGENTS.md

## Must Know

- This directory is the active platform root for CLEVER MSA work.
- Treat `docs/` as the source of truth for architecture, boundaries, mappings, contracts, and rollout decisions.
- `AGENTS.md` and every `README.md` in this workspace are operational guidance only. They are not canonical truth.
- Treat `development/` as a whitelist of root-tracked implementation source slices.
- The current root whitelist is `front-web-console`, `edge-api-gateway`, `runtime-prod-release`, `runtime-prod-platform`, and the active `service-*` repos.
- Treat this root as the single Git source of truth, but do not treat service slices as a shared runtime codebase.
- Start from [WORKSPACE.md](WORKSPACE.md) and [repo-map.md](repo-map.md) before moving files or changing repo boundaries.

## Repo Selection Rules

- If the task is architecture, migration, mapping, contract, or rollout work, update `docs/` first.
- If the task is local compose, seed orchestration, env templates, or smoke scripts, use the out-of-band integration repo. It is not part of the root `development/` whitelist.
- If the task is gateway routing or edge entry behavior, work in `development/edge-api-gateway/`.
- If the task is operator UI or admin UI behavior, work in the matching `front-*` repo only.
- If the task is backend behavior, work in the matching `service-*` repo only.

## Monorepo Source Slice Rules

- Fresh root clones include active `development/*` source contents directly.
- Do not run `git submodule update --init --recursive` as the normal workspace bootstrap path.
- Do not reintroduce active `development/*` slices as submodules or root gitlinks.
- New root-visible `development/*` source slices must be tracked directly by the root repo immediately.
- Non-whitelisted support or legacy repos must stay out of the root `development/` tree.

## Branch Naming Rules

- New branches created from this root must use a semantic prefix, not a tool/user prefix.
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
- If the task spans multiple source slices, name the branch for the dominant outcome across those slices.
- If behavior changes and refactoring happen together, name the branch for the user-visible outcome, not the incidental internal cleanup.

Examples:

- `feat/public-openapi-edge-ownership`
- `fix/edge-readback-command`
- `refactoring/workspace-relative-links`
- `docs/branch-naming-policy`
- `chore/release-evidence-cleanup`
- `test/driver-work-log-coverage`

## Boundary Rules

- Do not import one service slice directly from another service slice.
- Do not introduce shared base packages across service slices unless an approved design changes that rule.
- Do not place compose, env, seed-runner, or cross-slice glue inside service slices.
- Do not treat read-model services as masters. `*-operations-view` slices are read services, not sources of truth.
- Archive is document-only. Do not move runtime code into `docs/archive/`.

## Current Domain Notes

- `service-vehicle-registry` currently owns `vehicle_master + vehicle_operator_access` together.
- `service-settlement-operations-view` temporarily holds the current placeholder settlement runtime.
- `service-settlement-registry` is an active runtime slice for global settlement config, company/fleet pricing tables, and any remaining settlement policy compatibility surface.
- `service-delivery-record` is an active runtime slice for delivery source records and daily input snapshots only.
- `service-terminal-registry` and `service-telemetry-hub` are active runtime slices and must stay within their approved boundary specs.

## Local Verification

- Before starting local verification, ask the user what they want to validate and whether live-data impact is acceptable.
- Do not choose a verification setup on the user's behalf when the request is only "open it", "bring it up", or "run local verification". Ask first.
- Keep operational execution detail out of `AGENTS.md`. Follow repo-local scripts and canonical docs when those details are needed.

## Legacy Workspace

- `../MSA-Server/` is a legacy/reference workspace, not the active implementation root.
- Use it only for historical context, old notes, or migration cross-checks.
- legacy bridge domains are reference-only context, not the default current operator target for `front-web-console`.
