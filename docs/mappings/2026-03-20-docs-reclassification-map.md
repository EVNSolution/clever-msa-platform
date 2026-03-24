# Docs Reclassification Map

**Purpose:** Fix the future `clever-msa-platform/docs/` tree before any source-code move by mapping every current architecture document into a single target folder.

**Rule:** Keep filenames stable in the first migration. Change folders first, then rename files only when the new docs tree is already the source of truth.

---

## Target Docs Tree Roles

- `docs/goals/`
  - target-state, north-star, platform-wide architecture direction
- `docs/boundaries/`
  - bounded contexts, owned data, service shape, fragmentation, join risk
- `docs/mappings/`
  - current-to-target mappings, legacy API maps, source indexes, code movement tables
- `docs/contracts/`
  - IDs, states, read-model contracts, integration rules, API-facing dictionaries
- `docs/decisions/`
  - domain extraction notes, rationale records, validated design specs
- `docs/rollout/`
  - migration order, implementation plans, handoff, execution checklists
- `docs/archive/`
  - retired documents only, split into `superseded/`, `historical/`, and `rejected/`

## File-By-File Reclassification

| Current file | Target file | Target folder role | Reason |
| --- | --- | --- | --- |
| `goal/01-target-system-fragmentation-map.md` | `docs/goals/01-target-system-fragmentation-map.md` | goals | platform-wide target split view |
| `goal/02-target-service-structure-and-join-risk-map.md` | `docs/boundaries/02-target-service-structure-and-join-risk-map.md` | boundaries | target service shape and risky joins |
| `goal/03-roadmap.md` | `docs/rollout/03-roadmap.md` | rollout | staged implementation path |
| `goal/04-driver-360-read-model.md` | `docs/contracts/04-driver-360-read-model.md` | contracts | read-model contract and output shape |
| `goal/05-vehicle-ops-read-model.md` | `docs/contracts/05-vehicle-ops-read-model.md` | contracts | read-model contract and output shape |
| `goal/06-id-and-state-dictionary.md` | `docs/contracts/06-id-and-state-dictionary.md` | contracts | shared identifier and state definitions |
| `goal/07-legacy-api-mapping.md` | `docs/mappings/07-legacy-api-mapping.md` | mappings | legacy endpoint to target-domain map |
| `goal/08-rollout-order.md` | `docs/rollout/08-rollout-order.md` | rollout | execution and rollout sequence |
| `goal/09-integration-rules.md` | `docs/contracts/09-integration-rules.md` | contracts | cross-service contract rules |
| `goal/10-target-account-auth-layer-plan.md` | `docs/decisions/10-target-account-auth-layer-plan.md` | decisions | scoped target-layer decision record |
| `goal/11-account-driver-settlement-boundary-map.md` | `docs/boundaries/11-account-driver-settlement-boundary-map.md` | boundaries | bounded-context split for account/driver/settlement |
| `goal/12-account-driver-settlement-owned-data-matrix.md` | `docs/boundaries/12-account-driver-settlement-owned-data-matrix.md` | boundaries | owned-data truth by service |
| `goal/13-account-driver-settlement-compose-simulation.md` | `docs/rollout/13-account-driver-settlement-compose-simulation.md` | rollout | local integration simulation guide |
| `goal/README.md` | `docs/goals/README.md` | goals | index of target-state docs |
| `reference/01-current-api-inventory-and-overlap.md` | `docs/mappings/01-current-api-inventory-and-overlap.md` | mappings | current API inventory for transition work |
| `reference/02-current-api-consumer-reference.md` | `docs/mappings/02-current-api-consumer-reference.md` | mappings | consumer lookup and impact tracing |
| `reference/03-account-driver-settlement-legacy-cut-map.md` | `docs/mappings/03-account-driver-settlement-legacy-cut-map.md` | mappings | legacy-to-target cut guidance |
| `reference/04-account-driver-settlement-source-index.md` | `docs/mappings/04-account-driver-settlement-source-index.md` | mappings | source-code lookup index |
| `reference/05-ev-dashboard-server-domain-extraction-notes.md` | `docs/decisions/05-ev-dashboard-server-domain-extraction-notes.md` | decisions | domain extraction rationale from legacy server |
| `reference/06-settlement-process-note.md` | `docs/decisions/06-settlement-process-note.md` | decisions | process understanding note, not runtime contract |
| `reference/07-vehicle-terminal-telemetry-assignment-legacy-split.md` | `docs/decisions/07-vehicle-terminal-telemetry-assignment-legacy-split.md` | decisions | legacy decomposition rationale |
| `reference/README.md` | `docs/mappings/README.md` | mappings | index of transition reference docs |
| `docs/superpowers/specs/2026-03-19-account-driver-settlement-msa-design.md` | `docs/decisions/specs/2026-03-19-account-driver-settlement-msa-design.md` | decisions | validated design spec |
| `docs/superpowers/specs/2026-03-19-local-django-msa-bootstrap-design.md` | `docs/decisions/specs/2026-03-19-local-django-msa-bootstrap-design.md` | decisions | validated design spec |
| `docs/superpowers/specs/2026-03-20-vehicle-asset-design.md` | `docs/decisions/specs/2026-03-20-vehicle-asset-design.md` | decisions | validated design spec |
| `docs/superpowers/specs/2026-03-20-vehicle-ops-phase-1-design.md` | `docs/decisions/specs/2026-03-20-vehicle-ops-phase-1-design.md` | decisions | validated design spec |
| `docs/superpowers/specs/2026-03-20-vehicle-ownership-and-assignment-design.md` | `docs/decisions/specs/2026-03-20-vehicle-ownership-and-assignment-design.md` | decisions | validated design spec |
| `docs/superpowers/plans/2026-03-19-account-driver-settlement-implementation-handoff.md` | `docs/archive/historical/rollout/2026-03-19-account-driver-settlement-implementation-handoff.md` | historical rollout archive | implementation handoff |
| `docs/superpowers/plans/2026-03-19-account-driver-settlement-msa-master-plan.md` | `docs/archive/historical/rollout/2026-03-19-account-driver-settlement-msa-master-plan.md` | historical rollout archive | staged execution plan |
| `docs/superpowers/plans/2026-03-19-driver-360-bootstrap-implementation-plan.md` | `docs/archive/historical/rollout/2026-03-19-driver-360-bootstrap-implementation-plan.md` | historical rollout archive | implementation plan |
| `docs/superpowers/plans/2026-03-19-local-django-msa-bootstrap-implementation-plan.md` | `docs/archive/historical/rollout/2026-03-19-local-django-msa-bootstrap-implementation-plan.md` | historical rollout archive | implementation plan |
| `docs/superpowers/plans/2026-03-19-trimmed-bootstrap-refactor-plan.md` | `docs/archive/historical/rollout/2026-03-19-trimmed-bootstrap-refactor-plan.md` | historical rollout archive | refactor rollout plan |
| `docs/superpowers/plans/2026-03-20-platform-restructure-and-repo-migration-plan.md` | `docs/archive/historical/rollout/2026-03-20-platform-restructure-and-repo-migration-plan.md` | historical rollout archive | platform migration checklist |
| `docs/superpowers/plans/2026-03-20-vehicle-asset-bootstrap-implementation-plan.md` | `docs/archive/historical/rollout/2026-03-20-vehicle-asset-bootstrap-implementation-plan.md` | historical rollout archive | implementation plan |
| `docs/superpowers/plans/2026-03-20-vehicle-asset-refactor-and-driver-vehicle-assignment-implementation-plan.md` | `docs/archive/historical/rollout/2026-03-20-vehicle-asset-refactor-and-driver-vehicle-assignment-implementation-plan.md` | historical rollout archive | implementation plan |
| `docs/superpowers/plans/2026-03-20-vehicle-ops-phase-1-implementation-plan.md` | `docs/archive/historical/rollout/2026-03-20-vehicle-ops-phase-1-implementation-plan.md` | historical rollout archive | implementation plan |
| `docs/superpowers/plans/2026-03-20-docs-reclassification-map.md` | `docs/mappings/2026-03-20-docs-reclassification-map.md` | mappings | this file becomes the new docs migration truth |

## Folder Notes

### `docs/goals/`
- Keep this folder small.
- It should describe where the platform is heading, not every service detail.

### `docs/boundaries/`
- This is the best place for service ownership, fragmentation maps, and owned-data matrices.
- Anything that answers “who owns what” belongs here.

### `docs/mappings/`
- This folder is for transitional truth.
- Anything that answers “where did this come from” or “where does this move” belongs here.

### `docs/contracts/`
- This folder is for stable machine-facing or team-facing contracts.
- Read-model output, shared IDs, state dictionaries, and integration rules belong here.

### `docs/decisions/`
- This folder is for reasoning and irreversible architectural choices.
- Specs go under `docs/decisions/specs/`.

### `docs/rollout/`
- This folder is for execution sequence and migration work.
- Plans, checklists, and handoff notes belong here.

### `docs/archive/`
- This folder is for documents that are no longer active truth.
- It is document-only and does not accept runtime assets.
- Use:
  - `docs/archive/superseded/` for replaced docs
  - `docs/archive/historical/` for old but occasionally useful context
  - `docs/archive/rejected/` for discarded approaches

## Ambiguity Rules

- If a document explains **why** a boundary exists, prefer `docs/decisions/`.
- If a document defines **what** a service owns, prefer `docs/boundaries/`.
- If a document shows **how current artifacts move** into target structure, prefer `docs/mappings/`.
- If a document defines **shared names, payloads, IDs, or response shapes**, prefer `docs/contracts/`.
- If a document explains **when and in what order** work should happen, prefer `docs/rollout/`.
- If a document is no longer active truth, move it to `docs/archive/` instead of leaving it beside active docs.

## Migration Execution Rule

- Copy documents into the new `docs/` tree first.
- Move only retired document files into `docs/archive/`. Code and runtime assets never use archive.
- Do not delete the old copies until the platform shell and repo-map are in place.
- Once the new `docs/` tree is used as the source of truth, mark the old `goal/`, `reference/`, and `docs/superpowers/` paths as legacy.
