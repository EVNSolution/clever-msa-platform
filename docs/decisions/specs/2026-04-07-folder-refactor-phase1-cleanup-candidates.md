# Folder Refactor Phase 1 Cleanup Candidates

## Purpose

This note records the cleanup-sensitive items that were tracked during phase 1 documentation work and are now retained only as a historical cleanup record.

## Historical Inventory

- `development/front-operator-console`
- historical multi-web wording that was later moved into archive material
- outdated auxiliary entry descriptions in docs or README files that were later cleaned up during execution

## Why Each Item Was Tracked

- `development/front-operator-console`
  - The repo was tracked during phase 1 because legacy runtime and smoke references still needed explicit review before removal.
- historical multi-web wording
  - Some documents preserved earlier wording for traceability and were not rewritten into a false runtime history during phase 1.
- outdated auxiliary entry descriptions
  - README and doc entry paths contained transitional wording that needed a targeted cleanup pass, not an automatic prune.

## What Phase 1 May Clean Up

- Doc-only wording that conflicts with the current single-web runtime truth.
- Obvious duplicate or stale repo classification language.
- One-line pointers that clarify where the cleanup inventory lives.

## What Phase 1 Must Not Delete

- Runtime code, repo folders, or compose services.
- Legacy references that are still needed for migration traceability.
- Any path or runtime rename that would change execution behavior.

## Closure Notes

- `development/front-operator-console` was removed from the workspace in the phase 2 cleanup work and is now historical/archive-only context.
- The historical multi-web wording was either retained for traceability or moved into archive material where appropriate.
- The remaining cleanup-sensitive wording was handled through the active docs and runtime map follow-up.

## Phase 2 Entry Conditions

- The surviving single-web runtime is stable in docs and smoke validation.
- Cleanup candidates are enumerated and approved as removable.
- Rename/removal work is explicitly approved for the affected repo folders.
- Follow-up docs have clear replacement targets and no unresolved cross-references.
