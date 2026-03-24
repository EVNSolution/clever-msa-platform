# Planned Business Domain Skeleton Shell Creation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the eight newly planned business-domain target repos as empty shells with repo-local README files, then promote platform docs from `planned-target` to `empty-shell`.

**Architecture:** This is a documentation-and-structure-only rollout. No runtime code is added. The work creates the `development/service-*` directories with minimal README ownership notes, then updates the platform indexes so the workspace state matches the filesystem.

**Tech Stack:** Markdown, repository structure, platform docs

---

### Task 1: Create Empty Shell Repo Directories

**Files:**
- Create: `development/service-dispatch-registry/README.md`
- Create: `development/service-dispatch-operations-view/README.md`
- Create: `development/service-personnel-document-registry/README.md`
- Create: `development/service-region-registry/README.md`
- Create: `development/service-region-analytics/README.md`
- Create: `development/service-notification-hub/README.md`
- Create: `development/service-announcement-registry/README.md`
- Create: `development/service-support-registry/README.md`

- [ ] **Step 1: Write the shell README files**

Each README should contain:
- repo title equal to directory name
- current role
- future role
- explicit statement that this is an empty shell and runtime is not implemented yet
- pointer to `../../docs/` as architecture source of truth

- [ ] **Step 2: Verify the directories now exist**

Run: `find development -maxdepth 1 -type d | sort`
Expected: all eight new `service-*` directories appear in the output

### Task 2: Promote Platform Indexes From Planned Target To Empty Shell

**Files:**
- Modify: `WORKSPACE.md`
- Modify: `repo-map.md`
- Modify: `docs/mappings/current-to-target-repo-map.md`
- Modify: `docs/mappings/repo-responsibility-matrix.md`

- [ ] **Step 1: Update workspace summary**

Change the wording so the eight new repos are described as created empty shells rather than name-only planned targets.

- [ ] **Step 2: Update repo-map status rows**

Change the eight repo rows from `planned-target` to `empty-shell` and set `Current source` to the new shell paths.

- [ ] **Step 3: Update current-to-target map**

Change the migration mode for the eight repos from `planned-target` to `empty-shell` and note that shell directories and README files now exist.

- [ ] **Step 4: Keep repo responsibility matrix aligned**

Ensure the matrix still describes ownership correctly after shell creation.

### Task 3: Keep Naming And Design Docs Consistent

**Files:**
- Modify: `docs/decisions/specs/2026-03-23-planned-business-domain-skeleton-targets-design.md`

- [ ] **Step 1: Update document status wording**

Keep the eight repo names unchanged, but update the document status section so it states that shell directories exist and runtime remains unimplemented.

### Task 4: Verification

**Files:**
- Verify only

- [ ] **Step 1: Check shell README coverage**

Run: `find development -maxdepth 2 -name README.md | sort`
Expected: each of the eight new shell repos has a `README.md`

- [ ] **Step 2: Check status consistency**

Run: `rg -n "service-dispatch-registry|service-personnel-document-registry|service-region-registry|service-notification-hub|service-support-registry|empty-shell|planned-target" WORKSPACE.md repo-map.md docs/mappings/current-to-target-repo-map.md docs/mappings/repo-responsibility-matrix.md docs/decisions/specs/2026-03-23-planned-business-domain-skeleton-targets-design.md`
Expected: the eight repos appear with `empty-shell`, and no stale `planned-target` wording remains for those eight repos

- [ ] **Step 3: Check for stale authoring markers**

Run: a ripgrep scan for common authoring leftovers in the touched docs and READMEs
Expected: no matches
