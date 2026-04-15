# Platform Docs Canonical Truth Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align root documentation so operators can tell at a glance which path is canonical, which path is legacy, and which documents must be updated first when runtime truth changes.

**Architecture:** Keep the existing document structure, but make the read order explicit. `ev-dashboard` canonical runtime truth lives in the infra-driven ECS documents and runbooks; bridge-lane EC2/SSM references remain documented, but only as legacy or exception paths. The work should start from the docs entrypoints, then move into the living rollout note, inventory, and lessons so the same guidance appears at every operator decision point.

**Tech Stack:** Markdown docs, root documentation indexes, rollout notes, runtime inventory, lessons

---

### Task 1: Lock The Canonical-vs-Legacy Vocabulary

**Files:**
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/rollout/2026-04-13-ecs-cdk-oidc-actions-transition.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/mappings/current-runtime-inventory.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/lesson.md`

- [x] **Step 1: Mark the rollout note as the canonical `ev-dashboard` runtime reference**

State explicitly that `infra-ev-dashboard-platform -> CDK/ECS -> ev-dashboard.com` is the approved prod truth.

- [x] **Step 2: Demote `clever-deploy-control` references to legacy bridge-lane status**

Keep the bridge-lane details, but label them as legacy/reference-only for `ev-dashboard`.

- [x] **Step 3: Mirror the same rule into the runtime inventory**

Add one short rule to the inventory notes so operators see the same truth even if they skip the rollout note.

- [x] **Step 4: Record the lesson in the root lesson file**

Add a durable lesson that says a migrated surface must not keep treating the central bridge lane as source of truth.

- [x] **Step 5: Verify the markdown edits**

Run: `git -C /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform diff --check`
Expected: no output

### Task 2: Rebuild The Docs Entry Order

**Files:**
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/README.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/rollout/README.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/runbooks/README.md`

- [x] **Step 1: Update the top-level docs index**

Make the top-level `docs/README.md` point operators to the canonical `ev-dashboard` runbooks and rollout truth before any legacy central deploy references.

- [x] **Step 2: Update the rollout index**

State clearly that `clever-deploy-control` references are bridge-lane material and not the canonical prod definition for `ev-dashboard`.

- [x] **Step 3: Update the runbook index**

Keep the deploy order clear: pre-prod gate, preflight, operator loop, post-deploy smoke/decommission, then inventory.

- [x] **Step 4: Verify the read order is consistent**

Check that `docs/README.md`, `docs/rollout/README.md`, and `docs/runbooks/README.md` do not contradict each other.

- [x] **Step 5: Verify markdown formatting**

Run: `git -C /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform diff --check`
Expected: no output

### Task 3: Publish The Documentation Audit Plan

**Files:**
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/superpowers/plans/2026-04-15-platform-docs-canonical-truth-alignment-implementation-plan.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/README.md`

- [x] **Step 1: Save this implementation plan under `docs/superpowers/plans/`**

The plan must describe the audit scope, the file map, the canonical-vs-legacy rule, and the verification commands.

- [x] **Step 2: Add a pointer from the docs index**

Link this plan from `docs/README.md` so future cleanup work has an obvious starting point.

- [x] **Step 3: Keep the scope honest**

Document that this plan covers root docs alignment only, not child-repo README rewrites or runtime changes.

- [x] **Step 4: Verify the new plan link**

Read `docs/README.md` and confirm the plan link appears in the operator start path.

- [x] **Step 5: Commit after the document set is coherent**

```bash
git -C /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform add \
  docs/README.md \
  docs/rollout/README.md \
  docs/rollout/2026-04-13-ecs-cdk-oidc-actions-transition.md \
  docs/mappings/current-runtime-inventory.md \
  lesson.md \
  docs/superpowers/plans/2026-04-15-platform-docs-canonical-truth-alignment-implementation-plan.md
git -C /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform commit -m "docs: align canonical ev-dashboard runtime truth"
```

### Task 4: Review The Remaining Drift After This Pass

**Files:**
- Inspect: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/WORKSPACE.md`
- Inspect: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/repo-map.md`
- Inspect: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/**`

- [x] **Step 1: Search for leftover bridge-lane wording**

Run:

```bash
rg -n "clever-deploy-control|central deploy|EC2 app-host|bridge lane|legacy" \
  /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs \
  /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/WORKSPACE.md \
  /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/repo-map.md
```

Expected: matches remain only where legacy/reference wording is intentional.

- [x] **Step 2: Record any remaining drift as follow-up items**

If other documents still imply that `clever-deploy-control` defines `ev-dashboard` prod truth, list them in a follow-up plan instead of expanding this change blindly.

- [x] **Step 3: Stop after root truth is coherent**

Do not start child-repo doc rewrites in this pass unless a root document now links to stale or broken content.
