# Document Ownership Transition Plan

> **Status:** deferred plan only  
> **Execution gate:** do not start this transition until all planned service skeleton repos exist and the active runtime topology is stable enough to stop changing service boundaries every few days.

## Goal

Keep the current platform-level `docs/` tree as the single source of truth for now, then move to a split documentation model later:

- platform `docs/` owns cross-service truth
- each `service-*` repo owns service-local truth

This plan exists to avoid introducing duplicate sources of truth too early while still preparing a controlled transition later.

## Why This Is Deferred

The current platform is still in boundary-shaping mode.

- `settlement` is still partially decomposed
- some services were only recently activated
- `vehicle`, `terminal`, `telemetry`, `dead-letter`, and read-model contracts are still settling

If detailed service-local boundary documents are introduced now, the same rules will have to be updated in two places:

- platform `docs/`
- service-local docs

That would create drift faster than it improves clarity.

## Current Rule

Until the transition gate is opened:

- `docs/` remains the documentation source of truth
- service repos keep `README.md` for usage, local run, and local test entry only
- service repos do not become the architecture source of truth yet
- platform docs may describe service-local boundaries in detail for now

## Future Target

After the transition:

- platform `docs/` will keep only cross-service truth
- service repos will own their local boundary, API, state, and invariants
- platform docs will summarize and link, not duplicate service-local detail

## Ownership Split Target

### Platform `docs/` should own

- repo map
- cross-service topology
- gateway exposure map
- integration rules
- contract index
- rollout order
- migration and archive policy
- cross-service mapping and legacy cut records

### Service-local docs should own

- owned tables and write scope
- inbound API surface
- outbound dependencies
- local auth and permission model
- local state dictionary
- local invariants
- service-specific env and run/test entrypoints

## Explicit Non-Goals For Now

This plan does not do any of the following yet:

- no new `BOUNDARY.md` files in service repos
- no reduction of current platform docs coverage
- no service-by-service doc migration yet
- no automated doc drift checker yet

## Transition Gate

Start the transition only when all conditions below are true:

1. all planned service skeleton repos exist
2. active runtime repos are no longer being renamed or re-cut weekly
3. `repo-map.md` and `repo-responsibility-matrix.md` are stable for one review cycle
4. current read/write topology is reflected in compose and gateway without active restructuring work
5. the team agrees which active services are ready for local documentation ownership

## Recommended Rollout Order Later

Do not transition every service at once.

Use this order:

1. `service-vehicle-registry`
2. `service-telemetry-hub`
3. `service-vehicle-operations-view`
4. `service-account-access`
5. `service-driver-profile`
6. `service-terminal-registry`
7. `service-vehicle-assignment`
8. remaining active services
9. shell repos only after they become active runtimes

This sequence validates the rule set across three different service types first:

- registry
- telemetry pipeline
- read model

## Migration Shape Later

When a service is promoted to local documentation ownership:

1. add a service-local boundary document
2. move service-local detail out of platform docs
3. leave only a short summary and link in platform docs
4. update `repo-map.md` or `repo-responsibility-matrix.md` only if the service boundary actually changed
5. verify that no detailed rule is still treated as source-of-truth in two places

## Anti-Drift Rules

- one fact must have one source of truth
- platform docs must not restate full service-local API and invariant detail after promotion
- service-local docs must not restate platform topology and cross-service rules in full
- if a service boundary changes, update the service-local doc first after promotion
- if a cross-service connection changes, update platform docs first

## Minimal Service-Local Doc Shape For Later

When the transition starts, the default service-local set should stay small:

- `README.md`
  - run, test, env, entrypoints
- `BOUNDARY.md`
  - owned data, inbound API, outbound calls, auth, invariants

Only add more files such as `API.md` if the service is too large for a single boundary file.

## Deferred Tasks

- [ ] define the standard `BOUNDARY.md` template
- [ ] choose the first three pilot repos for service-local ownership
- [ ] move service-local detail out of platform docs for those pilot repos
- [ ] verify there is no duplicate source of truth after each pilot move
- [ ] expand to the remaining active service repos

## Immediate Practical Meaning

Nothing changes in the current runtime or current document ownership today.

For now:

- keep writing architecture and boundary truth in platform `docs/`
- keep service repo docs lightweight
- reopen this plan only after all planned service skeletons exist
