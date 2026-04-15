# ev-dashboard Runbook Entry Environment Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a shared `환경 검토` entry runbook to the `ev-dashboard` operator path, add a dedicated cold-start rebuild runbook, and update the runbook index so operators start from environment review before destroy, rebuild, or deploy.

**Architecture:** Keep the current specialized runbooks intact and add one new entry gate plus one new rebuild path. The index becomes the operator-facing source of truth for sequencing, while the new environment review runbook owns retained-asset checks, prerequisite checks, and branching rules.

**Tech Stack:** Markdown docs, existing `docs/runbooks/` structure, repo-local verification with `rg`, `test`, and `git diff`

---

### Task 1: Reframe The Runbook Index

**Files:**
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/runbooks/README.md`
- Spec: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/superpowers/specs/2026-04-15-ev-dashboard-runbook-entry-environment-review-design.md`

- [ ] **Step 1: Confirm the current index does not start with environment review**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform
rg -n "Start Here|temporary pre-prod release gate|deploy preflight gate|deploy operator loop" docs/runbooks/README.md
```

Expected:
- Matches only the current deploy-first order
- No `환경 검토` or `cold start rebuild` entry yet

- [ ] **Step 2: Edit the runbook index to insert the new operator sequence**

Update `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/runbooks/README.md` so both `Start Here` and `Runtime And Deploy` reflect:

1. `환경 검토`
2. `cold start rebuild`
3. `deploy preflight`
4. `deploy operator loop`
5. `UI smoke / decommission`

Keep the rest of the index structure intact.

- [ ] **Step 3: Verify the new filenames are referenced from the index**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform
rg -n "ev-dashboard-runtime-environment-review|ev-dashboard-cold-start-rebuild" docs/runbooks/README.md
```

Expected:
- Both new runbook filenames appear in the index

- [ ] **Step 4: Review the diff for the index-only change**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform
git diff -- docs/runbooks/README.md
```

Expected:
- Diff shows sequence change only
- No unrelated runbook index churn

### Task 2: Add The Shared Environment Review Runbook

**Files:**
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/runbooks/ev-dashboard-runtime-environment-review.md`
- Reference: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/README.md`
- Reference: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/runbooks/ev-dashboard-ecs-preflight-gate.md`
- Reference: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/runbooks/ev-dashboard-ui-smoke-and-decommission.md`

- [ ] **Step 1: Verify the new runbook file does not already exist**

Run:

```bash
test ! -f /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/runbooks/ev-dashboard-runtime-environment-review.md && echo "missing"
```

Expected:
- Prints `missing`

- [ ] **Step 2: Write the environment review runbook**

Create `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/runbooks/ev-dashboard-runtime-environment-review.md` with these sections:

- Purpose and scope
- When to use this runbook
- Retained asset check
- Infra prerequisite check
- GitHub configuration check
- Runtime policy check
- Branching rule
- Next document map

The content must explicitly cover:

- `Route53 hosted zone` retained
- `ECR repository` and SHA image retained
- `VPC/subnet`, `OIDC infra role`, `CDK bootstrap`
- required repo vars/secrets
- choice between `destroy`, `cold rebuild`, `routine deploy`, `post-deploy validation`

- [ ] **Step 3: Add concrete branching links**

Make sure the runbook links directly to:

- shutdown design doc
- cold-start rebuild runbook
- deploy preflight runbook
- UI smoke / decommission runbook

Avoid generic phrases like “go to the appropriate document”; the branch targets must be explicit.

- [ ] **Step 4: Verify the environment review content anchors**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform
rg -n "Retained Asset|Infra Prerequisite|GitHub Configuration|Runtime Policy|Branching Rule|Next Document Map" docs/runbooks/ev-dashboard-runtime-environment-review.md
```

Expected:
- All major section names match

- [ ] **Step 5: Review the new file diff**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform
git diff -- docs/runbooks/ev-dashboard-runtime-environment-review.md
```

Expected:
- The new file is focused on entry-gate checks, not deploy timing or UI smoke details

### Task 3: Add The Cold-Start Rebuild Runbook

**Files:**
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/runbooks/ev-dashboard-cold-start-rebuild.md`
- Reference: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/runbooks/ev-dashboard-runtime-environment-review.md`
- Reference: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/runbooks/ev-dashboard-ecs-preflight-gate.md`
- Reference: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/runbooks/ev-dashboard-ecs-deploy-operator-loop.md`
- Reference: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/runbooks/ev-dashboard-ui-smoke-and-decommission.md`

- [ ] **Step 1: Verify the rebuild runbook file does not already exist**

Run:

```bash
test ! -f /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/runbooks/ev-dashboard-cold-start-rebuild.md && echo "missing"
```

Expected:
- Prints `missing`

- [ ] **Step 2: Write the cold-start rebuild runbook**

Create `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/runbooks/ev-dashboard-cold-start-rebuild.md` with these sections:

- Scope and assumptions
- Preconditions
- Fresh provision assumptions
- Required asset checks
- Execution path
- Post-deploy verification
- Completion criteria

The content must explicitly state:

- no snapshot restore
- new `RDS`, `Redis`, `Secrets`, `ACM`, `alias records`
- `environment review -> preflight -> deploy operator loop -> UI smoke`
- rebuild is from current code and retained ECR images, not from old runtime rollback

- [ ] **Step 3: Link the rebuild path to the existing specialized runbooks**

Ensure the rebuild runbook has explicit links to:

- environment review
- deploy preflight
- deploy operator loop
- UI smoke / decommission

- [ ] **Step 4: Verify the rebuild content anchors**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform
rg -n "Preconditions|Fresh Provision Assumptions|Execution Path|Post-Deploy Verification|Completion Criteria" docs/runbooks/ev-dashboard-cold-start-rebuild.md
```

Expected:
- All required sections are present

- [ ] **Step 5: Review the new file diff**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform
git diff -- docs/runbooks/ev-dashboard-cold-start-rebuild.md
```

Expected:
- The file reads as an operator runbook, not an architecture note

### Task 4: Final Consistency Pass

**Files:**
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/runbooks/README.md`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/runbooks/ev-dashboard-runtime-environment-review.md`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/runbooks/ev-dashboard-cold-start-rebuild.md`
- Spec: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/superpowers/specs/2026-04-15-ev-dashboard-runbook-entry-environment-review-design.md`

- [ ] **Step 1: Verify the three runbook files cross-reference cleanly**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform
rg -n "ev-dashboard-runtime-environment-review|ev-dashboard-cold-start-rebuild|ev-dashboard-ecs-preflight-gate|ev-dashboard-ecs-deploy-operator-loop|ev-dashboard-ui-smoke-and-decommission" docs/runbooks/README.md docs/runbooks/ev-dashboard-runtime-environment-review.md docs/runbooks/ev-dashboard-cold-start-rebuild.md
```

Expected:
- Index and both new runbooks point at the correct next-step documents

- [ ] **Step 2: Review the full docs diff**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform
git diff -- docs/runbooks/README.md docs/runbooks/ev-dashboard-runtime-environment-review.md docs/runbooks/ev-dashboard-cold-start-rebuild.md
```

Expected:
- Only the intended runbook files changed
- The sequence and responsibilities match the approved spec

- [ ] **Step 3: Commit**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform
git add docs/runbooks/README.md docs/runbooks/ev-dashboard-runtime-environment-review.md docs/runbooks/ev-dashboard-cold-start-rebuild.md docs/superpowers/plans/2026-04-15-ev-dashboard-runbook-entry-environment-review-implementation-plan.md
git commit -m "docs: add ev-dashboard environment review runbook flow"
```

Expected:
- A single docs-only commit with the new runbook entry flow
