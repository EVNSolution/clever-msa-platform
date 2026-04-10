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

## Legacy Workspace

- `../MSA-Server/` is a legacy/reference workspace, not the active implementation root.
- Use it only for historical context, old notes, or migration cross-checks.
