# 2026-04-09 Development Linked Child Repos Migration Plan

## Goal

Completed: the root `clever-msa-platform` workspace has been moved from the earlier mixed `snapshot + linked repo` state to a consistent model where all active independent repos under `development/` are represented as linked child repos.

## Execution Summary

### Phase 0. Governance Freeze

Completed.

- target representation approved in design docs
- `development/front-web-console/` used as the first linked child repo reference pattern
- root stopped introducing new tracked snapshots for child repos during the migration

### Phase 1. Inventory The Current Root Representation

Completed.

Inventory artifact:

- `docs/superpowers/plans/2026-04-09-development-linked-child-repos-inventory.md`

The inventory now records the final end state rather than an in-progress mixed model.

### Phase 2. Standardize The Conversion Procedure

Completed.

Checklist artifact:

- `docs/superpowers/plans/2026-04-09-tracked-snapshot-to-linked-child-repo-conversion-checklist.md`

The same repeatable procedure was used across all migration batches.

### Phase 3. Convert Low-Risk Repos First

Completed.

Batch 1 low-friction repos were converted first to prove the pattern before touching higher-friction repos.

### Phase 4. Convert Core Runtime Repos In Batches

Completed.

All remaining active root-tracked implementation snapshots were retired in later batches.

### Phase 5. Workspace Documentation Cleanup

Completed.

Workspace docs, governance notes, and inventory now describe one model instead of a mixed model.

## Final State

1. all intended `development/*` repos are represented from the root as linked child repos
2. no intentional root-tracked implementation snapshots remain for active child repos
3. GitHub visibility is consistent across the `development/*` set
4. workspace docs describe the linked child repo model as the steady-state default

## Remaining Operational Rule

Future additions under `development/` must:

1. be created as independent child repos first
2. be exposed from the root as linked child repos immediately
3. not be introduced as root-tracked snapshots

## Historical Risk Note

The migration risks were workspace and contributor-flow risks, not runtime deployment risks.

Those risks are now reduced because the representation model is consistent across the full `development/*` set.

## Closeout

This migration plan is complete.

Use the governance design and current inventory as the source of truth for future additions or audits.
