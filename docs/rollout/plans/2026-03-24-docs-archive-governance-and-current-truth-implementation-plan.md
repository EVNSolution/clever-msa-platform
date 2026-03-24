# Docs Archive Governance And Current Truth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `docs/rollout/plans/`를 active plan 전용으로 정리하고, 완료된 rollout artifact를 `docs/archive/historical/rollout/`로 이동하며, current runtime truth를 별도 living doc으로 고정한다.

**Architecture:** 이번 배치는 문서 체계 정리 작업이다. current truth는 `docs/mappings/current-runtime-inventory.md`와 상위 안내 문서가 담당하고, 완료된 implementation plan과 handoff는 active tree에서 제거해 historical archive로 이동한다. `docs/rollout/plans/`는 active/deferred execution plan만 남긴다.

**Tech Stack:** Markdown, git mv, ripgrep, filesystem layout verification

---

## File Structure

이번 계획은 아래 파일 구조를 기준으로 진행한다.

- Create: `docs/rollout/README.md`
- Create: `docs/mappings/current-runtime-inventory.md`
- Create: `docs/archive/historical/rollout/`
- Modify: `docs/README.md`
- Modify: `docs/archive/README.md`
- Modify: `WORKSPACE.md`
- Modify: `repo-map.md`
- Modify: `docs/mappings/2026-03-20-docs-reclassification-map.md`
- Move: `docs/rollout/plans/2026-03-19-account-driver-settlement-implementation-handoff.md`
- Move: `docs/rollout/plans/2026-03-19-account-driver-settlement-msa-master-plan.md`
- Move: `docs/rollout/plans/2026-03-19-driver-360-bootstrap-implementation-plan.md`
- Move: `docs/rollout/plans/2026-03-19-local-django-msa-bootstrap-implementation-plan.md`
- Move: `docs/rollout/plans/2026-03-19-trimmed-bootstrap-refactor-plan.md`
- Move: `docs/rollout/plans/2026-03-20-platform-restructure-and-repo-migration-plan.md`
- Move: `docs/rollout/plans/2026-03-20-settlement-phase-1-decomposition-implementation-plan.md`
- Move: `docs/rollout/plans/2026-03-20-telemetry-hub-implementation-plan.md`
- Move: `docs/rollout/plans/2026-03-20-terminal-registry-implementation-plan.md`
- Move: `docs/rollout/plans/2026-03-20-vehicle-asset-bootstrap-implementation-plan.md`
- Move: `docs/rollout/plans/2026-03-20-vehicle-asset-refactor-and-driver-vehicle-assignment-implementation-plan.md`
- Move: `docs/rollout/plans/2026-03-20-vehicle-ops-phase-1-implementation-plan.md`
- Move: `docs/rollout/plans/2026-03-21-telemetry-dead-letter-implementation-plan.md`
- Move: `docs/rollout/plans/2026-03-21-telemetry-listener-implementation-plan.md`
- Move: `docs/rollout/plans/2026-03-23-dispatch-operations-view-implementation-plan.md`
- Move: `docs/rollout/plans/2026-03-23-dispatch-registry-implementation-plan.md`
- Move: `docs/rollout/plans/2026-03-23-planned-business-domain-skeleton-shell-creation-plan.md`
- Move: `docs/rollout/plans/2026-03-23-settlement-phase-2-decomposition-implementation-plan.md`
- Move: `docs/rollout/plans/2026-03-23-settlement-scoped-driver-read-contract-implementation-plan.md`
- Move: `docs/rollout/plans/2026-03-24-driver-ops-runtime-naming-hard-cut-implementation-plan.md`
- Move: `docs/rollout/plans/2026-03-24-docs-archive-governance-and-current-truth-implementation-plan.md`

### Task 1: Add Living Docs And Governance Entry Points

**Files:**
- Create: `docs/rollout/README.md`
- Create: `docs/mappings/current-runtime-inventory.md`
- Modify: `docs/README.md`
- Modify: `docs/archive/README.md`
- Modify: `WORKSPACE.md`
- Modify: `repo-map.md`

- [ ] **Step 1: Write the rollout README that defines active vs historical**

Create `docs/rollout/README.md` with:

- `docs/rollout/*.md` is living rollout truth
- `docs/rollout/plans/*.md` is active/deferred plan only
- completed plans live in `docs/archive/historical/rollout/`
- readers should not use archived rollout plans as current runtime truth

- [ ] **Step 2: Write the current runtime inventory living doc**

Create `docs/mappings/current-runtime-inventory.md` with a table that covers:

- target repo
- compose service name
- gateway prefix
- current status (`active runtime` or `empty shell`)
- one-line role summary

The table should reflect current active runtime repos from `WORKSPACE.md`, `repo-map.md`, and current compose docs.

- [ ] **Step 3: Update docs and root entry points to point at the new living docs**

Edit the existing overview docs so they explicitly say:

- `docs/rollout/plans/` is active plan only
- completed rollout artifacts move to archive
- current runtime truth should be read from `docs/mappings/current-runtime-inventory.md`

- [ ] **Step 4: Verify the new references exist and use consistent language**

Run:

```bash
rg -n "current-runtime-inventory|active plan only|historical/rollout" \
  docs/README.md docs/archive/README.md docs/rollout/README.md WORKSPACE.md repo-map.md
```

Expected:

- all target entry-point docs mention the same governance language
- the new runtime inventory file is referenced from living docs

- [ ] **Step 5: Commit the living docs and governance updates**

```bash
git add docs/README.md docs/archive/README.md docs/rollout/README.md \
  docs/mappings/current-runtime-inventory.md WORKSPACE.md repo-map.md
git commit -m "docs: clarify living docs and archive rules"
```

### Task 2: Archive Completed Rollout Plans And Reconcile Path Mappings

**Files:**
- Create: `docs/archive/historical/rollout/`
- Modify: `docs/mappings/2026-03-20-docs-reclassification-map.md`
- Move: `docs/rollout/plans/2026-03-19-account-driver-settlement-implementation-handoff.md`
- Move: `docs/rollout/plans/2026-03-19-account-driver-settlement-msa-master-plan.md`
- Move: `docs/rollout/plans/2026-03-19-driver-360-bootstrap-implementation-plan.md`
- Move: `docs/rollout/plans/2026-03-19-local-django-msa-bootstrap-implementation-plan.md`
- Move: `docs/rollout/plans/2026-03-19-trimmed-bootstrap-refactor-plan.md`
- Move: `docs/rollout/plans/2026-03-20-platform-restructure-and-repo-migration-plan.md`
- Move: `docs/rollout/plans/2026-03-20-settlement-phase-1-decomposition-implementation-plan.md`
- Move: `docs/rollout/plans/2026-03-20-telemetry-hub-implementation-plan.md`
- Move: `docs/rollout/plans/2026-03-20-terminal-registry-implementation-plan.md`
- Move: `docs/rollout/plans/2026-03-20-vehicle-asset-bootstrap-implementation-plan.md`
- Move: `docs/rollout/plans/2026-03-20-vehicle-asset-refactor-and-driver-vehicle-assignment-implementation-plan.md`
- Move: `docs/rollout/plans/2026-03-20-vehicle-ops-phase-1-implementation-plan.md`
- Move: `docs/rollout/plans/2026-03-21-telemetry-dead-letter-implementation-plan.md`
- Move: `docs/rollout/plans/2026-03-21-telemetry-listener-implementation-plan.md`
- Move: `docs/rollout/plans/2026-03-23-dispatch-operations-view-implementation-plan.md`
- Move: `docs/rollout/plans/2026-03-23-dispatch-registry-implementation-plan.md`
- Move: `docs/rollout/plans/2026-03-23-planned-business-domain-skeleton-shell-creation-plan.md`
- Move: `docs/rollout/plans/2026-03-23-settlement-phase-2-decomposition-implementation-plan.md`
- Move: `docs/rollout/plans/2026-03-23-settlement-scoped-driver-read-contract-implementation-plan.md`
- Move: `docs/rollout/plans/2026-03-24-driver-ops-runtime-naming-hard-cut-implementation-plan.md`

- [ ] **Step 1: Create the historical rollout archive directory**

Run:

```bash
mkdir -p docs/archive/historical/rollout
```

Expected: the directory exists and is ready to receive moved files.

- [ ] **Step 2: Move the completed rollout files with git-aware renames**

Run:

```bash
git mv docs/rollout/plans/2026-03-19-account-driver-settlement-implementation-handoff.md docs/archive/historical/rollout/
git mv docs/rollout/plans/2026-03-19-account-driver-settlement-msa-master-plan.md docs/archive/historical/rollout/
git mv docs/rollout/plans/2026-03-19-driver-360-bootstrap-implementation-plan.md docs/archive/historical/rollout/
git mv docs/rollout/plans/2026-03-19-local-django-msa-bootstrap-implementation-plan.md docs/archive/historical/rollout/
git mv docs/rollout/plans/2026-03-19-trimmed-bootstrap-refactor-plan.md docs/archive/historical/rollout/
git mv docs/rollout/plans/2026-03-20-platform-restructure-and-repo-migration-plan.md docs/archive/historical/rollout/
git mv docs/rollout/plans/2026-03-20-settlement-phase-1-decomposition-implementation-plan.md docs/archive/historical/rollout/
git mv docs/rollout/plans/2026-03-20-telemetry-hub-implementation-plan.md docs/archive/historical/rollout/
git mv docs/rollout/plans/2026-03-20-terminal-registry-implementation-plan.md docs/archive/historical/rollout/
git mv docs/rollout/plans/2026-03-20-vehicle-asset-bootstrap-implementation-plan.md docs/archive/historical/rollout/
git mv docs/rollout/plans/2026-03-20-vehicle-asset-refactor-and-driver-vehicle-assignment-implementation-plan.md docs/archive/historical/rollout/
git mv docs/rollout/plans/2026-03-20-vehicle-ops-phase-1-implementation-plan.md docs/archive/historical/rollout/
git mv docs/rollout/plans/2026-03-21-telemetry-dead-letter-implementation-plan.md docs/archive/historical/rollout/
git mv docs/rollout/plans/2026-03-21-telemetry-listener-implementation-plan.md docs/archive/historical/rollout/
git mv docs/rollout/plans/2026-03-23-dispatch-operations-view-implementation-plan.md docs/archive/historical/rollout/
git mv docs/rollout/plans/2026-03-23-dispatch-registry-implementation-plan.md docs/archive/historical/rollout/
git mv docs/rollout/plans/2026-03-23-planned-business-domain-skeleton-shell-creation-plan.md docs/archive/historical/rollout/
git mv docs/rollout/plans/2026-03-23-settlement-phase-2-decomposition-implementation-plan.md docs/archive/historical/rollout/
git mv docs/rollout/plans/2026-03-23-settlement-scoped-driver-read-contract-implementation-plan.md docs/archive/historical/rollout/
git mv docs/rollout/plans/2026-03-24-driver-ops-runtime-naming-hard-cut-implementation-plan.md docs/archive/historical/rollout/
```

Expected: the files disappear from `docs/rollout/plans/` and appear under `docs/archive/historical/rollout/`.

- [ ] **Step 3: Update the docs reclassification map to the new historical paths**

Edit `docs/mappings/2026-03-20-docs-reclassification-map.md` so the moved rollout entries point to `docs/archive/historical/rollout/<filename>`.

- [ ] **Step 4: Verify there are no broken active references to the moved files**

Run:

```bash
rg -n "2026-03-19-account-driver-settlement-implementation-handoff|2026-03-19-account-driver-settlement-msa-master-plan|2026-03-19-driver-360-bootstrap-implementation-plan|2026-03-20-platform-restructure-and-repo-migration-plan|2026-03-23-settlement-phase-2-decomposition-implementation-plan|2026-03-24-driver-ops-runtime-naming-hard-cut-implementation-plan" \
  docs -g '!docs/archive/historical/rollout/*'
```

Expected:

- any remaining references are either updated to the archive path or intentionally absent from active docs
- no living docs still point to the old `docs/rollout/plans/` locations for the moved files

- [ ] **Step 5: Commit the archive moves and path-map update**

```bash
git add docs/archive/historical/rollout docs/mappings/2026-03-20-docs-reclassification-map.md
git commit -m "docs: archive completed rollout plans"
```

### Task 3: Finalize The Active Plan Surface

**Files:**
- Move: `docs/rollout/plans/2026-03-24-docs-archive-governance-and-current-truth-implementation-plan.md`

- [ ] **Step 1: Verify which active plan files remain**

Run:

```bash
find docs/rollout/plans -maxdepth 1 -type f | sort
```

Expected:

- only active/deferred plan files remain
- this current implementation plan is the only completed plan still present

- [ ] **Step 2: Move this implementation plan into historical rollout archive**

Run:

```bash
git mv docs/rollout/plans/2026-03-24-docs-archive-governance-and-current-truth-implementation-plan.md \
  docs/archive/historical/rollout/
```

Expected: the active plan directory no longer keeps this completed plan.

- [ ] **Step 3: Verify the final split between active and historical**

Run:

```bash
find docs/rollout/plans -maxdepth 1 -type f | sort
printf '\n---ARCHIVED---\n'
find docs/archive/historical/rollout -maxdepth 1 -type f | sort
```

Expected:

- `docs/rollout/plans/` contains only genuinely active plans
- `docs/archive/historical/rollout/` contains the completed rollout plan set, including this plan

- [ ] **Step 4: Commit the active-plan surface cleanup**

```bash
git add docs/archive/historical/rollout
git commit -m "docs: finalize active rollout plan surface"
```

### Task 4: End-To-End Docs Verification

**Files:**
- Verification only

- [ ] **Step 1: Verify the current runtime inventory is referenced from living docs**

Run:

```bash
rg -n "current-runtime-inventory.md" docs/README.md docs/rollout/README.md WORKSPACE.md repo-map.md
```

Expected: the living entry points reference the runtime inventory.

- [ ] **Step 2: Verify active plan folder no longer contains historical implementation plans**

Run:

```bash
find docs/rollout/plans -maxdepth 1 -type f | sort
```

Expected: only active or deferred plans remain.

- [ ] **Step 3: Verify the historical rollout archive contains the completed plans**

Run:

```bash
find docs/archive/historical/rollout -maxdepth 1 -type f | sort
```

Expected: the moved rollout artifacts are present there.

- [ ] **Step 4: Verify the worktree is clean**

Run:

```bash
git status --short
```

Expected: no unstaged or staged changes remain after the final commit.

- [ ] **Step 5: Do not create an empty commit**

If Task 4 changes no files, stop after verification and report results.
