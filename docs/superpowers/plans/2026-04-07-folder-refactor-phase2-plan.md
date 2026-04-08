# Folder Refactor Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `front-operator-console`를 active platform flow에서 제거하고, active docs/README/tooling reference를 단일 웹 current truth 기준으로 정리한다.

**Architecture:** 이번 단계는 surviving runtime rename이 아니라 deprecated repo removal 단계다. 먼저 active docs와 rollout current truth를 정리하고, completed implementation plan을 archive로 이동한 뒤, local stack/tooling reference를 정리하고 마지막에 `development/front-operator-console/`를 제거한다. runtime/write smoke와 web smoke는 전부 `front-admin-console` 기준으로 green을 유지해야 한다.

**Tech Stack:** Markdown docs, repo-local README, git move/remove, ripgrep, front-admin-console npm test/build, integration-local-stack bootstrap/smoke helpers, Playwright via existing stack helpers

---

### Task 1: Audit Active References Before Removal

**Files:**
- Review only: `WORKSPACE.md`
- Review only: `repo-map.md`
- Review only: `docs/mappings/current-runtime-inventory.md`
- Review only: `docs/mappings/current-to-target-repo-map.md`
- Review only: `docs/mappings/repo-responsibility-matrix.md`
- Review only: `docs/contracts/18-single-web-console-screen-map.md`
- Review only: `docs/rollout/16-web-first-platform-delivery-order.md`
- Review only: `docs/decisions/specs/2026-04-06-single-web-console-cutover-design.md`
- Review only: `docs/rollout/plans/2026-04-06-single-web-console-cutover-implementation-plan.md`
- Review only: `docs/rollout/plans/2026-04-04-auth-final-cutover-implementation-plan.md`
- Review only: `development/integration-local-stack/README.md`
- Review only: `development/edge-api-gateway/AGENTS.md`
- Test: repo-wide grep audit

- [ ] **Step 1: Write the failing expectation list**

Document the specific phase 2 mismatches:

```text
- front-operator-console still exists on disk and is still named in active docs
- active rollout/contract docs still describe operator-web cleanup as future work
- local README/AGENTS text still refers to front-operator-console as a pending candidate
- completed implementation plans are still sitting in active rollout plan space
```

- [ ] **Step 2: Run the initial grep audit**

Run:

```bash
cd /Users/jiin/.codex/worktrees/c26c/clever-msa-platform
rg -n "front-operator-console" \
  WORKSPACE.md \
  repo-map.md \
  docs/mappings/current-runtime-inventory.md \
  docs/mappings/current-to-target-repo-map.md \
  docs/mappings/repo-responsibility-matrix.md \
  docs/contracts/18-single-web-console-screen-map.md \
  docs/rollout \
  docs/decisions/specs/2026-04-06-single-web-console-cutover-design.md \
  development/integration-local-stack/README.md \
  development/edge-api-gateway/AGENTS.md
```

Expected: multiple active-doc hits still exist and define the phase 2 edit set.

- [ ] **Step 3: Inspect the two completed rollout plans that still mention operator-web work**

Run:

```bash
sed -n '1,220p' docs/rollout/plans/2026-04-06-single-web-console-cutover-implementation-plan.md
sed -n '1,220p' docs/rollout/plans/2026-04-04-auth-final-cutover-implementation-plan.md
```

Expected: both plans still contain completed `front-operator-console` migration/removal work and should no longer live in `docs/rollout/plans/`.

- [ ] **Step 4: Record the exact active files that need edits**

Keep a short implementation note in the task branch notes:

```text
- root/runtime truth docs to edit
- completed rollout plans to move
- local README/AGENTS files to edit
- repo directory to remove only after greps and smoke stay green
```

### Task 2: Clean Root And Mapping Docs

**Files:**
- Modify: `WORKSPACE.md`
- Modify: `repo-map.md`
- Modify: `docs/mappings/current-to-target-repo-map.md`
- Modify: `docs/mappings/repo-responsibility-matrix.md`
- Review only: `docs/mappings/current-runtime-inventory.md`
- Test: grep checks for single-web truth and stale operator-web wording

- [ ] **Step 1: Write the failing expectation list**

Capture what these docs must say after cleanup:

```text
- front-operator-console is no longer a current cleanup candidate inside active docs
- front-admin-console remains the only active web runtime
- current-to-target migration map should no longer read like front-operator-console is a live target
- repo responsibility should describe front-operator-console as removed historical repo or drop it from active matrix
```

- [ ] **Step 2: Edit the root and mapping docs**

Make these concrete changes:

```markdown
- WORKSPACE.md:
  - remove phase-2-future wording once removal is done
  - keep single-web truth and phase-3 rename separation
- repo-map.md:
  - remove or rewrite front-operator-console row/note so it is no longer a current candidate
  - keep phase-2 result visible without implying it still lives on disk
- current-to-target-repo-map.md:
  - keep legacy source map value, but make it clearly historical
- repo-responsibility-matrix.md:
  - remove active-matrix status for front-operator-console or rewrite as historical reference outside the active matrix
```

- [ ] **Step 3: Verify the docs no longer present operator-web as active**

Run:

```bash
rg -n "front-operator-console|deprecated-candidate|separate operator web" \
  WORKSPACE.md \
  repo-map.md \
  docs/mappings/current-to-target-repo-map.md \
  docs/mappings/repo-responsibility-matrix.md
```

Expected: any remaining hit is explicitly historical-only and does not read like an active runtime/candidate.

- [ ] **Step 4: Commit**

```bash
git add WORKSPACE.md repo-map.md docs/mappings/current-to-target-repo-map.md docs/mappings/repo-responsibility-matrix.md
git commit -m "docs: finalize single web repo classification"
```

### Task 3: Clean Active Contracts And Rollout Docs

**Files:**
- Modify: `docs/contracts/18-single-web-console-screen-map.md`
- Modify: `docs/rollout/16-web-first-platform-delivery-order.md`
- Modify: `docs/decisions/specs/2026-04-06-single-web-console-cutover-design.md`
- Move: `docs/rollout/plans/2026-04-06-single-web-console-cutover-implementation-plan.md` -> `docs/archive/historical/rollout/2026-04-06-single-web-console-cutover-implementation-plan.md`
- Move: `docs/rollout/plans/2026-04-04-auth-final-cutover-implementation-plan.md` -> `docs/archive/historical/rollout/2026-04-04-auth-final-cutover-implementation-plan.md`
- Test: grep checks in active rollout/contracts vs archive

- [ ] **Step 1: Write the failing expectation list**

Define the doc-state problems:

```text
- screen map still treats front-operator-console removal as future cutover work
- rollout order still mentions operator-console cleanup as pending
- single-web cutover design still mixes target truth with pre-removal wording
- completed implementation plans still occupy active plan space
```

- [ ] **Step 2: Edit the active contract and current-truth docs**

Make these concrete changes:

```markdown
- screen map:
  - describe operator-only routes as already absorbed or removed
  - remove future-tense removal wording
- rollout order:
  - mark operator-web migration/removal as completed historical work
- single-web cutover design:
  - preserve the cutover rationale
  - make final-state wording match current reality
```

- [ ] **Step 3: Move the completed rollout plans to archive**

Run:

```bash
git mv docs/rollout/plans/2026-04-06-single-web-console-cutover-implementation-plan.md \
       docs/archive/historical/rollout/2026-04-06-single-web-console-cutover-implementation-plan.md
git mv docs/rollout/plans/2026-04-04-auth-final-cutover-implementation-plan.md \
       docs/archive/historical/rollout/2026-04-04-auth-final-cutover-implementation-plan.md
```

Expected: the active rollout plan directory no longer contains those completed operator-web-related implementation plans.

- [ ] **Step 4: Verify active vs archive boundaries**

Run:

```bash
rg -n "front-operator-console" \
  docs/contracts/18-single-web-console-screen-map.md \
  docs/rollout/16-web-first-platform-delivery-order.md \
  docs/decisions/specs/2026-04-06-single-web-console-cutover-design.md \
  docs/rollout/plans \
  docs/archive/historical/rollout
```

Expected:
- active docs mention it only as historical/completed context if at all
- the moved implementation plans now live only under `docs/archive/historical/rollout/`

- [ ] **Step 5: Commit**

```bash
git add docs/contracts/18-single-web-console-screen-map.md \
        docs/rollout/16-web-first-platform-delivery-order.md \
        docs/decisions/specs/2026-04-06-single-web-console-cutover-design.md \
        docs/archive/historical/rollout/2026-04-06-single-web-console-cutover-implementation-plan.md \
        docs/archive/historical/rollout/2026-04-04-auth-final-cutover-implementation-plan.md
git commit -m "docs: archive completed single web cutover plans"
```

### Task 4: Clean Local Entry Docs And Tooling References

**Files:**
- Modify: `development/integration-local-stack/README.md`
- Modify: `development/edge-api-gateway/AGENTS.md`
- Review only: `development/integration-local-stack/scripts/*.py`
- Review only: `.github/`
- Test: grep checks for runtime/tooling references

- [ ] **Step 1: Write the failing expectation list**

Capture the remaining local-entry issues:

```text
- integration README still says front-operator-console remains on disk as a phase 2 candidate
- edge-api-gateway AGENTS still describes front-operator-console as pending removal
- active tooling comments must not imply that operator web still exists as a runtime dependency
```

- [ ] **Step 2: Edit the local entry docs**

Make these concrete changes:

```markdown
- integration-local-stack README:
  - rewrite single-web truth to present front-operator-console as already removed historical cleanup
- edge-api-gateway AGENTS:
  - remove pending-removal wording
  - keep only the surviving single-web current truth
```

- [ ] **Step 3: Verify runtime/tooling references**

Run:

```bash
rg -n "front-operator-console" \
  development/integration-local-stack \
  development/edge-api-gateway \
  .github
```

Expected: no runtime/tooling reference remains outside intentional historical/archive text.

- [ ] **Step 4: Commit**

```bash
git add development/integration-local-stack/README.md development/edge-api-gateway/AGENTS.md
git commit -m "docs: remove operator console from active local references"
```

### Task 5: Remove `front-operator-console` From The Workspace

**Files:**
- Remove: `development/front-operator-console/`
- Test: path existence checks, grep audit, front-admin-console tests/build, ops fixture stack verification

- [ ] **Step 1: Write the failing expectation list**

Capture the removal gate:

```text
- no active doc/tooling reference should require the repo
- front-admin-console must fully cover web runtime behavior
- stack smoke must remain green without the directory present
```

- [ ] **Step 2: Re-run the pre-removal verification**

Run:

```bash
cd /Users/jiin/.codex/worktrees/c26c/clever-msa-platform
python3 development/integration-local-stack/scripts/verify_ops_fixture_stack.py --skip-build
```

Expected: green before removing the repo.

- [ ] **Step 3: Remove the deprecated repo**

Run:

```bash
git rm -r development/front-operator-console
test ! -d development/front-operator-console
```

Expected: the directory is staged for removal and no longer exists in the worktree.

- [ ] **Step 4: Re-run the post-removal verification**

Run:

```bash
cd development/front-admin-console && npm test -- --run
cd development/front-admin-console && npm run build
cd /Users/jiin/.codex/worktrees/c26c/clever-msa-platform && python3 development/integration-local-stack/scripts/verify_ops_fixture_stack.py --skip-build
```

Expected:
- front-admin-console tests pass
- front-admin-console build passes
- ops fixture stack verify stays green

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor: remove deprecated operator console repo"
```

### Task 6: Final Consistency Sweep And Handoff

**Files:**
- Review/Modify as needed: all phase 2 touched files
- Test: repo-wide grep, `git diff --check`, `git status --short`

- [ ] **Step 1: Run the final active-doc grep audit**

Run:

```bash
cd /Users/jiin/.codex/worktrees/c26c/clever-msa-platform
rg -n "front-operator-console" \
  WORKSPACE.md \
  repo-map.md \
  docs/mappings/current-runtime-inventory.md \
  docs/mappings/current-to-target-repo-map.md \
  docs/mappings/repo-responsibility-matrix.md \
  docs/contracts \
  docs/rollout \
  docs/decisions/specs \
  development/integration-local-stack \
  development/edge-api-gateway \
  .github
```

Expected: any remaining hit is either in `docs/archive/` or explicitly historical-only, not part of active runtime guidance.

- [ ] **Step 2: Run stale split-web wording checks**

Run:

```bash
rg -n "admin/operator|separate web|operator web|multi-web" \
  WORKSPACE.md \
  repo-map.md \
  docs/contracts \
  docs/rollout \
  docs/decisions/specs \
  development/integration-local-stack/README.md \
  development/edge-api-gateway/AGENTS.md
```

Expected: no stale wording remains in active guidance outside intentional historical context.

- [ ] **Step 3: Run final git hygiene checks**

Run:

```bash
git diff --check
git status --short
```

Expected: no diff formatting errors and only the intended phase 2 changes remain staged/committed.

- [ ] **Step 4: Commit any final wording-only fixes**

```bash
git add -A
git commit -m "docs: finalize folder refactor phase two cleanup"
```

- [ ] **Step 5: Final manual handoff note**

In the final response, summarize:

```text
- which active docs were cleaned
- which rollout plans were archived
- that development/front-operator-console was removed
- what remains intentionally deferred to phase 3
```
