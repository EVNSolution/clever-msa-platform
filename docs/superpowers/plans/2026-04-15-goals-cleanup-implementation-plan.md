# Goals Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Audit `docs/goals/` so only still-valid north-star documents remain there, and make sure operators do not confuse goal docs with current runtime or rollout truth.

**Architecture:** `docs/goals/` is not an operator folder. It should keep a small number of stable top-level target documents, while all current runtime, deploy, and rollout questions flow to mappings, runbooks, and living rollout docs. Cleanup here is primarily classification and entrypoint tightening, not mass archiving.

**Tech Stack:** Markdown docs, doc entrypoints, archive governance

---

### Task 1: Audit The Current Goal Set

**Files:**
- Inspect: `docs/goals/README.md`
- Inspect: `docs/goals/01-target-system-fragmentation-map.md`
- Inspect: `docs/goals/02-target-api-documentation-and-delivery.md`
- Inspect: `docs/README.md`
- Inspect: `docs/mappings/current-runtime-inventory.md`

- [x] Confirm the folder contains only a small number of top-level goal docs.
- [x] Check whether each goal doc still describes a valid north-star rather than stale operator procedure.
- [x] Keep surviving goal docs in place when they still express valid target direction.

Current result:

- `01-target-system-fragmentation-map.md` stays active as a platform north-star decomposition map.
- `02-target-api-documentation-and-delivery.md` stays active as the API documentation delivery north-star.
- No current `docs/goals/*` file needed archive movement in this pass.

### Task 2: Tighten The Entrypoints

**Files:**
- Modify: `docs/goals/README.md`
- Modify: `docs/goals/01-target-system-fragmentation-map.md`
- Modify: `docs/goals/02-target-api-documentation-and-delivery.md`
- Modify: `docs/README.md`

- [x] State explicitly that `docs/goals/` is north-star only, not current runtime truth.
- [x] Point current runtime and deploy questions to mappings/runbooks instead.
- [x] Add a short reading rule to each surviving goal doc so future readers do not misread it as current operator guidance.

### Task 3: Record The Outcome

**Files:**
- Modify: `docs/superpowers/plans/2026-04-15-platform-next-development-and-deploy-scenarios-plan.md`
- Modify: `lesson.md`

- [x] Record that goal cleanup can end with “keep and clarify” rather than archive movement.
- [x] Mark the goals cleanup lane as established so future cleanup passes do not skip it.

### Task 4: Verify And Commit

- [ ] Run:

```bash
git diff --check
rg -n "north-star|current runtime truth|runbooks" docs/goals docs/README.md
```

- [ ] Commit:

```bash
git add docs/goals/README.md docs/goals/01-target-system-fragmentation-map.md docs/goals/02-target-api-documentation-and-delivery.md docs/README.md docs/superpowers/plans/2026-04-15-goals-cleanup-implementation-plan.md docs/superpowers/plans/2026-04-15-platform-next-development-and-deploy-scenarios-plan.md lesson.md
git commit -m "docs: clarify goals as north-star documents"
```
