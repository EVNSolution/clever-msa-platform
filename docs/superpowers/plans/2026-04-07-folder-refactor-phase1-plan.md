# Folder Refactor Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 실제 repo rename 없이 플랫폼 루트 문서, repo 분류표, integration README를 정리해 active runtime, deprecated candidate, reference/legacy 구분을 current truth로 고정한다.

**Architecture:** 이번 단계는 runtime 구조 변경이 아니라 문서 정리와 분류 체계 고정이다. `WORKSPACE.md`, `repo-map.md`, `development/integration-local-stack/README.md`를 중심으로 single web current truth와 cleanup candidate 기준을 맞추고, phase 2 rename/move를 위한 안전한 출발점을 만든다.

**Tech Stack:** Markdown docs, repo-local README, ripgrep, git diff, Python helper command examples

---

### Task 1: Tighten Root Workspace Guidance

**Files:**
- Modify: `WORKSPACE.md`
- Test: `WORKSPACE.md` rendered content review via `sed`, keyword checks via `rg`

- [ ] **Step 1: Write the failing expectation list in the plan notes**

Document the specific mismatches to fix in `WORKSPACE.md`:

```text
- single web current truth should say surviving runtime is front-admin-console
- front-operator-console should no longer read like an equal active web
- development repo classification needs active / deprecated candidate / reference wording
- phase 1 must explicitly forbid runtime rename/move
```

- [ ] **Step 2: Inspect the current root workspace document**

Run:

```bash
sed -n '1,260p' WORKSPACE.md
```

Expected: you can point to the sections that still describe both front repos as equal members of the active naming set.

- [ ] **Step 3: Edit `WORKSPACE.md` with the minimal wording changes**

Update these areas:

```markdown
- Add a short classification note under `development/` ownership:
  - active runtime repo
  - deprecated candidate
  - reference/legacy
- Adjust single web wording so `front-admin-console` is the surviving runtime
- Mark `front-operator-console` as a deprecated candidate kept for phase-2 cleanup decisions
- Add an explicit phase-1 rule: no repo rename, no compose service rename, no gateway prefix rename
```

- [ ] **Step 4: Verify the root workspace document reads correctly**

Run:

```bash
rg -n "deprecated candidate|single web|front-operator-console|front-admin-console" WORKSPACE.md
```

Expected: the new classification and single-web language appear in the file.

- [ ] **Step 5: Commit**

```bash
git add WORKSPACE.md
git commit -m "docs: clarify workspace refactor boundaries"
```

### Task 2: Reclassify Repos In `repo-map.md`

**Files:**
- Modify: `repo-map.md`
- Test: `repo-map.md` keyword checks and manual scan

- [ ] **Step 1: Write the failing expectation list**

Capture the specific repo-map issues:

```text
- front-operator-console still reads as a normal migrated target, not a cleanup candidate
- repo index lacks a visible distinction between active runtime and deprecated candidate
- repo notes do not explain why deprecated items are still present
```

- [ ] **Step 2: Inspect the current repo map**

Run:

```bash
sed -n '1,320p' repo-map.md
```

Expected: the repo index still presents both front repos with the same migrated-target weight.

- [ ] **Step 3: Update the status legend and repo table**

Make these concrete changes:

```markdown
- Extend the status legend with wording for `deprecated-candidate` and `reference-only`
- Reword `front-admin-console` as the surviving single web runtime
- Reword `front-operator-console` as deprecated candidate kept until phase-2 cleanup
- Add a short note near the table that repo folder rename is out of phase 1 scope
```

- [ ] **Step 4: Add boundary notes for cleanup-sensitive repos**

Add a short note block like:

```markdown
### front repos
- `front-admin-console` is the only active web runtime.
- `front-operator-console` remains on disk only as a cleanup candidate until phase 2 rename/removal work is approved.
```

- [ ] **Step 5: Verify the repo map**

Run:

```bash
rg -n "deprecated-candidate|reference-only|front-admin-console|front-operator-console" repo-map.md
```

Expected: the new classification terms and front-repo notes are present.

- [ ] **Step 6: Commit**

```bash
git add repo-map.md
git commit -m "docs: reclassify platform repos for phase one"
```

### Task 3: Add Cleanup Candidate Note

**Files:**
- Create: `docs/decisions/specs/2026-04-07-folder-refactor-phase1-cleanup-candidates.md`
- Test: `sed`, `rg`, and link/path sanity checks

- [ ] **Step 1: Write the failing expectation list**

Define what this new note must answer:

```text
- which repos/docs are cleanup candidates
- why they are not being removed now
- what conditions unlock phase 2 cleanup
```

- [ ] **Step 2: Create the cleanup candidate note**

Write a focused markdown document with sections:

```markdown
## Purpose
## Candidate Inventory
## Why Each Candidate Still Exists
## What Phase 1 May Clean Up
## What Phase 1 Must Not Delete
## Phase 2 Entry Conditions
```

Include at least these candidate entries:

```markdown
- `development/front-operator-console`
- historical/multi-web wording that should move to archive later
- outdated auxiliary entry descriptions in docs/README if still found during execution
```

- [ ] **Step 3: Link the cleanup note from an existing root doc**

Add a short pointer in one of:

```text
WORKSPACE.md
repo-map.md
```

Choose the location that best fits the repo classification discussion and keep it to one sentence.

- [ ] **Step 4: Verify the new note exists and is linked**

Run:

```bash
rg -n "cleanup candidate|phase 2" docs/decisions/specs/2026-04-07-folder-refactor-phase1-cleanup-candidates.md WORKSPACE.md repo-map.md
```

Expected: the note contains the terms and at least one existing root doc references it.

- [ ] **Step 5: Commit**

```bash
git add docs/decisions/specs/2026-04-07-folder-refactor-phase1-cleanup-candidates.md WORKSPACE.md repo-map.md
git commit -m "docs: add folder cleanup candidate inventory"
```

### Task 4: Simplify `integration-local-stack` README Entry Paths

**Files:**
- Modify: `development/integration-local-stack/README.md`
- Test: README keyword checks, command path review

- [ ] **Step 1: Write the failing expectation list**

Capture the current README problems:

```text
- bootstrap and verify entry points are buried too deep
- single web current truth is not the first thing a reader sees
- fast rerun / fresh reset / rebuild paths are present but too verbose
- active runtime explanation and old context are mixed together
```

- [ ] **Step 2: Inspect the current README**

Run:

```bash
sed -n '1,320p' development/integration-local-stack/README.md
```

Expected: the README is accurate but long and not optimized around the primary local bootstrap flow.

- [ ] **Step 3: Reorder the README around the main operator path**

Refactor the top of the document into this shape:

```markdown
## What This Repo Owns
## Single Web Current Truth
## Quick Start
- fast rerun
- fresh reset
- rebuild path
## Ops-Derived Fixture Bootstrap
## Smoke Commands
## Secondary Telemetry/Dead-Letter Notes
```

Keep the exact commands intact unless they are clearly duplicated.

- [ ] **Step 4: Make the quick-start commands explicit**

Ensure these commands are visible near the top:

```bash
python3 ./development/integration-local-stack/scripts/bootstrap_ops_fixture_stack.py
python3 ./development/integration-local-stack/scripts/bootstrap_ops_fixture_stack.py --fresh
python3 ./development/integration-local-stack/scripts/verify_ops_fixture_stack.py --skip-build
python3 ./development/integration-local-stack/scripts/verify_ops_fixture_stack.py
```

- [ ] **Step 5: Verify the README structure**

Run:

```bash
rg -n "Quick Start|Single Web Current Truth|bootstrap_ops_fixture_stack.py|verify_ops_fixture_stack.py" development/integration-local-stack/README.md
```

Expected: the quick-start and single-web sections are easy to find from grep output alone.

- [ ] **Step 6: Commit**

```bash
git add development/integration-local-stack/README.md
git commit -m "docs: simplify local stack bootstrap guidance"
```

### Task 5: Consistency Sweep And Final Verification

**Files:**
- Modify: `WORKSPACE.md`
- Modify: `repo-map.md`
- Modify: `development/integration-local-stack/README.md`
- Create/Modify: `docs/decisions/specs/2026-04-07-folder-refactor-phase1-cleanup-candidates.md`
- Test: repo-wide `rg`, `git diff --check`

- [ ] **Step 1: Run repo-wide wording checks**

Run:

```bash
rg -n "front-operator-console|single web|deprecated candidate|reference/legacy|cleanup candidate" WORKSPACE.md repo-map.md development/integration-local-stack/README.md docs/decisions/specs/2026-04-07-folder-refactor-phase1-cleanup-candidates.md
```

Expected: wording is internally consistent and not contradictory.

- [ ] **Step 2: Scan for obviously stale top-level wording**

Run:

```bash
rg -n "operator console|admin and operator|multi-web|separate web" WORKSPACE.md repo-map.md development/integration-local-stack/README.md docs/decisions/specs/2026-04-07-folder-refactor-phase1-cleanup-candidates.md
```

Expected: any remaining occurrences are either intentional historical references or removed during this step.

- [ ] **Step 3: Fix any wording conflicts found in the sweep**

Make only the minimal consistency edits required. Do not expand the scope into real rename work.

- [ ] **Step 4: Run final diff validation**

Run:

```bash
git diff --check
git status --short
```

Expected: no diff formatting errors, and only the intended docs/README files remain modified before the last commit.

- [ ] **Step 5: Commit**

```bash
git add WORKSPACE.md repo-map.md development/integration-local-stack/README.md docs/decisions/specs/2026-04-07-folder-refactor-phase1-cleanup-candidates.md
git commit -m "docs: complete folder refactor phase one cleanup"
```

- [ ] **Step 6: Final manual handoff note**

Write a short completion summary in the final response covering:

```text
- what was reclassified
- what remains intentionally unchanged
- what should be considered phase 2
```
