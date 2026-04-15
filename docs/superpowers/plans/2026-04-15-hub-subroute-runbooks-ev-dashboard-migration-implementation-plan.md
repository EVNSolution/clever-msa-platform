# Hub Subroute Runbooks To ev-dashboard Canonical Truth Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove current-operator runbook guidance that still treats `hub.evnlogistics.com` subroutes as the default public runtime, and re-anchor those runbooks to `infra-ev-dashboard-platform -> CDK/ECS -> ev-dashboard.com`.

**Architecture:** Keep historical `hub` references only where they are evidence or bridge-lane context, but move live operator guidance, frontend proxy defaults, and docs entry points to `ev-dashboard.com` and `api.ev-dashboard.com`. Update the root operator rules and the frontend README together so future sessions do not reintroduce `hub` as the default current target.

**Tech Stack:** Markdown docs, root operator guidance, frontend README

---

### Task 1: Lock The Migration Scope

**Files:**
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/superpowers/plans/2026-04-15-hub-subroute-runbooks-ev-dashboard-migration-implementation-plan.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/runbooks/README.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/mappings/current-runtime-inventory.md`

- [ ] **Step 1: Confirm which live runbooks still surface `hub` as a current target**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform
rg -n "hub\\.evnlogistics\\.com|hub\\b" docs/runbooks docs/mappings lesson.md AGENTS.md development/front-web-console/README.md --glob '*.md'
```

Expected: current-operator references are limited and can be migrated without touching historical archive docs.

- [ ] **Step 2: Record the operator-facing migration scope**

Write this plan so future work distinguishes:
- runbook/operator truth
- frontend proxy defaults
- historical evidence that may still mention `hub`

- [ ] **Step 3: Tighten the docs index wording**

Update the runbook index and runtime inventory so they explicitly say:
- `ev-dashboard` is the current canonical operator target
- `hub` references outside legacy/historical context are not default operator guidance

- [ ] **Step 4: Verify the docs index changes**

Run:

```bash
git diff --check -- docs/runbooks/README.md docs/mappings/current-runtime-inventory.md
```

Expected: no whitespace or patch-format errors.

### Task 2: Migrate The Current Operator Runbook And Proxy Defaults

**Files:**
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/runbooks/local-dispatch-settlement-stack.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/AGENTS.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/README.md`

- [ ] **Step 1: Update the local dispatch/settlement runbook**

Change the remote real-data proxy default from `https://hub.evnlogistics.com` to `https://ev-dashboard.com`, and add one explicit sentence that `hub.evnlogistics.com` is legacy/bridge reference only.

- [ ] **Step 2: Update root operator guidance**

In `AGENTS.md`, change the frontend real proxy default to `https://ev-dashboard.com` and keep `.env.local-test` as the safer default. Preserve the existing CRUD warning text.

- [ ] **Step 3: Update the frontend README**

Align the frontend README with the same rule:
- default real-data proxy target = `https://ev-dashboard.com`
- `hub.evnlogistics.com` is not the default current operator target

- [ ] **Step 4: Verify the proxy-default changes**

Run:

```bash
git diff --check -- \
  docs/runbooks/local-dispatch-settlement-stack.md \
  AGENTS.md \
  development/front-web-console/README.md
```

Expected: no formatting problems.

### Task 3: Capture The Canonical Truth In Lessons

**Files:**
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/lesson.md`

- [ ] **Step 1: Add a global lesson about legacy hub references**

Record the rule that live operator runbooks must not use `hub.evnlogistics.com` as the default target once a surface has moved to `infra -> CDK/ECS -> ev-dashboard`.

- [ ] **Step 2: Preserve historical evidence without promoting it**

If an older lesson mentions `hub`, rewrite the wording so it is clearly historical bridge evidence, not current default guidance.

- [ ] **Step 3: Run the final consistency search**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform
rg -n "hub\\.evnlogistics\\.com|current real proxy target is `https://hub\\.evnlogistics\\.com`" \
  docs/runbooks AGENTS.md development/front-web-console/README.md lesson.md docs/mappings/current-runtime-inventory.md
```

Expected: any remaining matches are clearly labeled as legacy or historical bridge context, not current operator defaults.

- [ ] **Step 4: Run whole-change verification**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform
git diff --check
```

Expected: clean output.

- [ ] **Step 5: Commit**

```bash
git add \
  docs/superpowers/plans/2026-04-15-hub-subroute-runbooks-ev-dashboard-migration-implementation-plan.md \
  docs/runbooks/README.md \
  docs/runbooks/local-dispatch-settlement-stack.md \
  docs/mappings/current-runtime-inventory.md \
  AGENTS.md \
  development/front-web-console/README.md \
  lesson.md
git commit -m "docs: migrate hub runbook defaults to ev-dashboard"
```
