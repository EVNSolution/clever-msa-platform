# Archive Develop Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove stale archive/develop leftovers from active operator paths, move completed rollout artifacts into `docs/archive/`, and leave the active tree containing only current truth and genuinely active plans.

**Architecture:** Use the existing archive governance rules instead of inventing a new classification system. The work should first audit active plan folders and active README/runbook entrypoints, then move clearly completed rollout artifacts into `docs/archive/historical/rollout/`, and only then clean up any stale develop-era guidance that still leaks into active operator docs.

**Tech Stack:** Markdown docs, archive governance, rollout plan reclassification

---

### Task 1: Audit Active Plan Folders Against Current Truth

**Files:**
- Inspect: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/rollout/plans/`
- Inspect: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/superpowers/plans/`
- Inspect: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/decisions/specs/2026-03-24-docs-archive-governance-and-current-truth-design.md`
- Inspect: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/README.md`
- Inspect: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/rollout/README.md`

- [x] **Step 1: List active rollout plans that are likely already historical**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform
ls -1 docs/rollout/plans
```

Expected: old implementation plans are visible and can be compared with current runtime truth.

- [x] **Step 2: Compare those plans against current runtime inventory and rollout truth**

Use:

```bash
sed -n '1,220p' docs/mappings/current-runtime-inventory.md
sed -n '1,220p' docs/rollout/2026-04-13-ecs-cdk-oidc-actions-transition.md
```

Expected: plans for already-migrated or already-activated slices can be marked as archive candidates.

- [x] **Step 3: Record the initial move batch explicitly**

The first archive batch should be reviewed around these files:

- `docs/rollout/plans/2026-03-24-delivery-record-phase-1-activation-implementation-plan.md`
- `docs/rollout/plans/2026-03-24-personnel-document-registry-phase-1-activation-implementation-plan.md`
- `docs/rollout/plans/2026-03-26-announcement-registry-phase-1-activation-implementation-plan.md`
- `docs/rollout/plans/2026-03-26-region-registry-phase-1-activation-implementation-plan.md`
- `docs/rollout/plans/2026-03-26-support-registry-phase-1-activation-implementation-plan.md`
- `docs/rollout/plans/2026-03-27-region-analytics-phase-1-activation-implementation-plan.md`
- `docs/rollout/plans/2026-03-29-notification-hub-phase-1-activation-implementation-plan.md`
- `docs/rollout/plans/2026-04-06-single-web-console-cutover-implementation-plan.md`
- `docs/archive/historical/rollout/2026-04-13-ev-dashboard-domain-ecs-cutover-plan.md`

These are not deleted. They are candidates to move into `docs/archive/historical/rollout/` if the audit confirms they are execution history rather than active operator truth.

- [x] **Step 4: Separate “keep active” plans from “move historical” plans**

Document that these should stay active until separately closed:

- `docs/rollout/plans/2026-03-23-document-ownership-transition-plan.md`
- any plan with a still-open execution gate or unresolved dependency

### Task 2: Remove Develop-Era Guidance From Active Operator Paths

**Files:**
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/README.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/rollout/README.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/runbooks/README.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/WORKSPACE.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/repo-map.md`

- [x] **Step 1: Search for active docs that still imply archived/develop content is a live operator path**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform
rg -n "archive/|develop" docs WORKSPACE.md repo-map.md --glob '!docs/archive/**'
```

Expected: only rule-setting references remain, not operator directions that send people into stale develop/archive content.

- [x] **Step 2: Rewrite entrypoints so archive is clearly historical**

Active indexes should say:

- `docs/archive/` is document-only historical storage
- completed rollout artifacts belong there
- current operator questions should start from runbooks, inventory, and active rollout notes

- [x] **Step 3: Keep develop-era examples only when they still explain a live pattern**

If a doc mentions `develop` or similar staging language without helping a current operator decision, move or remove that wording.

Current result:

- `docs/README.md`, `docs/rollout/README.md`, `docs/runbooks/README.md`, `WORKSPACE.md`, and `repo-map.md` already state that `docs/archive/` is historical/document-only storage
- audit search only found rule-setting references, not live operator directions into stale develop/archive paths

### Task 3: Execute The First Cleanup Batch Safely

**Files:**
- Move: archive candidates from `docs/rollout/plans/` to `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/archive/historical/rollout/`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/rollout/README.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/README.md`

- [x] **Step 1: Move only the files confirmed as completed execution records**

Use `mv` only after the audit from Task 1 is complete. Do not move active plans just because they are old.

Current first batch completed:

- removed duplicate active copies of:
  - `2026-03-26-announcement-registry-phase-1-activation-implementation-plan.md`
  - `2026-03-26-support-registry-phase-1-activation-implementation-plan.md`
  - `2026-03-27-region-analytics-phase-1-activation-implementation-plan.md`
  - `2026-03-29-notification-hub-phase-1-activation-implementation-plan.md`
- the same files already existed under `docs/archive/historical/rollout/`, so the active copies were stale duplicates rather than unique truth
- second move batch:
  - moved completed activation plans into archive:
    - `2026-03-24-delivery-record-phase-1-activation-implementation-plan.md`
    - `2026-03-24-personnel-document-registry-phase-1-activation-implementation-plan.md`
    - `2026-03-26-region-registry-phase-1-activation-implementation-plan.md`
  - removed duplicate active copies already preserved in archive:
    - `2026-04-04-auth-final-cutover-implementation-plan.md`
    - `2026-04-06-personnel-document-web-first-slice-implementation-plan.md`
    - `2026-04-06-region-web-first-slice-implementation-plan.md`
    - `2026-04-06-single-web-console-cutover-implementation-plan.md`

- [x] **Step 2: Re-point any index or runbook references**

After moving files, fix any links in:

- `docs/README.md`
- `docs/rollout/README.md`
- any active doc that still links to the old path

- [x] **Step 3: Verify no broken links or stale references remain**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform
git diff --check
rg -n "docs/rollout/plans/.*implementation-plan" docs --glob '!docs/archive/**'
```

Expected: active docs no longer point to moved implementation plans as current truth.

### Task 5: Remove Remaining Stale Active Rollout Plans And Runtime Names

**Files:**
- Move: stale active plans from `docs/rollout/plans/` to `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/archive/historical/rollout/`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/rollout/13-account-driver-settlement-compose-simulation.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/rollout/15-ui-first-working-mode.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/rollout/16-web-first-platform-delivery-order.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/rollout/2026-04-07-central-deploy-reference.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/edge-api-gateway/AGENTS.md`

- [x] **Step 1: Move completed or superseded active rollout plans**

Current third batch completed:

- moved completed or superseded active plans into `docs/archive/historical/rollout/`:
  - `2026-04-01-settlement-upload-first-shell-ui-plan.md`
  - `2026-04-04-auth-transition-phase-1-implementation-plan.md`
  - `2026-04-06-dispatch-settlement-handoff-implementation-plan.md`
  - `2026-04-13-ev-dashboard-domain-ecs-cutover-plan.md`
- active `docs/rollout/plans/` now keeps only the still-open deferred plan:
  - `2026-03-23-document-ownership-transition-plan.md`

- [x] **Step 2: Rewrite active operator docs to current web runtime naming**

Current operator docs now use:

- `front-web-console` as the current surviving web runtime
- `front-operator-console` only as legacy historical reference
- `web-console` as the current compose service label in live rollout/operator text

- [x] **Step 3: Verify residual cleanup actually reduced active noise**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform
ls -1 docs/rollout/plans
rg -n "front-admin-console|front-operator-console|admin-front" docs development/edge-api-gateway/AGENTS.md --glob '!docs/archive/**' --glob '!docs/superpowers/**'
git diff --check
```

Expected:

- active rollout plan folder is reduced to genuinely active items
- current operator docs no longer present removed runtime names as live truth
- remaining old names live only in historical/archive or design-history contexts

### Task 4: Record The Cleanup Outcome

**Files:**
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/lesson.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/superpowers/plans/2026-04-15-platform-next-development-and-deploy-scenarios-plan.md`

- [x] **Step 1: Add the lesson**

Record that archive cleanup is a classification pass, not a stealth delete pass.

- [x] **Step 2: Mark the scenarios plan once this cleanup plan exists and the first batch is done**

Update the higher-level plan so the archive/develop lane reflects real progress instead of staying as a vague future item.

- [x] **Step 3: Commit**

```bash
git add docs/README.md docs/rollout/README.md docs/runbooks/README.md WORKSPACE.md repo-map.md lesson.md docs/archive/historical/rollout docs/rollout/plans docs/superpowers/plans/2026-04-15-archive-develop-cleanup-implementation-plan.md docs/superpowers/plans/2026-04-15-platform-next-development-and-deploy-scenarios-plan.md
git commit -m "docs: clean up archive and develop-era operator paths"
```
