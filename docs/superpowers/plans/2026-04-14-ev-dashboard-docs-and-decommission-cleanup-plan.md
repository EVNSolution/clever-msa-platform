# EV Dashboard Docs And Decommission Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the current `ev-dashboard` ECS migration and decommission close-out documents easy to find and hard to misread.

**Architecture:** Keep the existing design and rollout records intact, but tighten the current entry points. Use one runbooks index, one decommission runbook with an honest status section, and a small set of top-level pointers from `docs/README.md`, `docs/rollout/README.md`, and the current migration plan.

**Tech Stack:** Markdown docs, root lesson file, CLEVER rollout/runbook structure.

---

### Task 1: Lock The Cleanup Scope

**Files:**
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/superpowers/plans/2026-04-14-ev-dashboard-docs-and-decommission-cleanup-plan.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/runbooks/ev-dashboard-ui-smoke-and-decommission.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/rollout/README.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/README.md`

- [ ] Record the exact cleanup target: `runbooks` index, `ev-dashboard` close-out runbook, `rollout` start-here pointers.
- [ ] Explicitly keep archive migration out of scope for this pass.
- [ ] Run `git diff --check -- docs/superpowers/plans/2026-04-14-ev-dashboard-docs-and-decommission-cleanup-plan.md`.

### Task 2: Add A Runbooks Index

**Files:**
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/runbooks/README.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/README.md`

- [ ] Create a compact `docs/runbooks/README.md` that separates:
  - local development runbooks
  - deployment/runtime runbooks
  - policy runbooks
- [ ] Point `docs/README.md` at the runbooks index instead of only one local stack guide.
- [ ] Keep links absolute and use current file paths only.

### Task 3: Tighten The Decommission Runbook

**Files:**
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/runbooks/ev-dashboard-ui-smoke-and-decommission.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/lesson.md`

- [ ] Add a short current-status section that distinguishes:
  - what is already migrated
  - what remains open
  - what is blocked
- [ ] Update the authenticated smoke section so it reflects the new reality:
  - a production operational admin credential now exists
  - a dedicated read-only smoke credential is still preferred
- [ ] Add a clearer closure checklist for decommission.
- [ ] Record one global lesson about keeping the current close-out status in a single runbook, not scattered across lessons and plans.

### Task 4: Clean The Rollout Pointers

**Files:**
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/rollout/README.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/rollout/2026-04-13-ecs-cdk-oidc-actions-transition.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/superpowers/plans/2026-04-14-ev-dashboard-backend-slices-implementation-plan.md`

- [ ] Update `docs/rollout/README.md` so `ev-dashboard` readers see the current sequence:
  - transition truth
  - preflight gate
  - UI smoke and decommission
- [ ] Update the transition note so it clearly says backend slice migration is complete and operational close-out moved to runbooks.
- [ ] Update the backend slice plan so it points to the decommission runbook for post-migration close-out rather than pretending the slice plan is still the active operator guide.

### Task 5: Verify The Cleanup

**Files:**
- Verify only; no new files

- [ ] Run:

```bash
git diff --check -- \
  docs/README.md \
  docs/runbooks/README.md \
  docs/runbooks/ev-dashboard-ui-smoke-and-decommission.md \
  docs/rollout/README.md \
  docs/rollout/2026-04-13-ecs-cdk-oidc-actions-transition.md \
  docs/superpowers/plans/2026-04-14-ev-dashboard-backend-slices-implementation-plan.md \
  lesson.md
```

- [ ] Manually read the three start pages in order:
  - `docs/README.md`
  - `docs/runbooks/README.md`
  - `docs/rollout/README.md`
- [ ] Confirm the same next step appears everywhere:
  - use preflight before deploy
  - use the decommission runbook for post-cutover close-out
