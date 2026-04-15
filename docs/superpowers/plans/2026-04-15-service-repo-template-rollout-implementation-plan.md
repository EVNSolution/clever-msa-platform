# Service Repo Template Rollout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Roll out the service repo template baseline incrementally across the active implementation repos, starting with the highest-frequency repos that most affect current operator and deploy loops.

**Architecture:** Adopt the new template baseline as a platform hygiene layer, not a code-unification project. First audit each target repo against the baseline, then patch README/`.gitignore`/workflow/lesson gaps in small batches, and only afterwards widen the rollout to the rest of the active service repos.

**Tech Stack:** Markdown docs, repo hygiene files, build workflow baseline, linked child repos

---

### Task 1: Build The Audit Matrix

**Files:**
- Inspect: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/superpowers/specs/2026-04-15-service-repo-template-baseline-design.md`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/mappings/service-repo-template-audit-matrix.md`

- [x] **Step 1: Read the baseline spec**

Confirm the mandatory baseline and archetype-specific baseline before touching repo docs.

- [x] **Step 2: Create an audit matrix**

The matrix should at minimum track:

- repo name
- archetype
- `.gitignore`
- `README.md`
- `lesson.md`
- `Dockerfile`
- image build workflow
- missing baseline items

- [x] **Step 3: Seed the first batch**

Start the matrix with:

- `front-web-console`
- `edge-api-gateway`
- `service-account-access`
- `integration-local-stack`

### Task 2: Apply Batch 1 To High-Frequency Repos

**Files:**
- Modify: first-batch child repos as needed
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/mappings/service-repo-template-audit-matrix.md`

- [x] **Step 1: Normalize `front-web-console`**

Check README sections, `.gitignore` hygiene, env example files, workflow naming, and lesson placement against the baseline.

- [x] **Step 2: Normalize `edge-api-gateway`**

Check README boundary wording, `.gitignore`, nginx test visibility, workflow naming, and lesson placement.

- [x] **Step 3: Normalize `service-account-access`**

Check Django runtime baseline files, README structure, `.gitignore`, workflow naming, and lesson placement.

- [x] **Step 4: Normalize `integration-local-stack`**

Check orchestration-repo baseline, README structure, `.gitignore`, and lesson placement without forcing an image-build workflow where it does not belong.

Current progress:

- [x] `lesson.md` baseline added
- [x] README section baseline review
- [x] optional `.gitignore` tightening not needed after audit

- [x] **Step 5: Update the matrix after each repo**

Do not leave the matrix as a blank inventory. Mark which baseline items are compliant and which still need work.

### Task 3: Expand To Remaining Active Service Repos

**Files:**
- Modify: additional child repos in batches
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/mappings/service-repo-template-audit-matrix.md`

- [x] **Step 1: Group remaining repos by archetype**

Suggested grouping:

- Django service repos
- read-model service repos
- gateway-like special cases

Current grouping:

- Batch 2: write/registry Django services
  - `service-organization-registry`
  - `service-driver-profile`
  - `service-personnel-document-registry`
  - `service-attendance-registry`
  - `service-delivery-record`
  - `service-settlement-payroll`
  - `service-settlement-registry`
  - `service-vehicle-registry`
  - `service-vehicle-assignment`
  - `service-dispatch-registry`
  - `service-region-registry`
  - `service-announcement-registry`
  - `service-support-registry`
  - `service-terminal-registry`
- Batch 3: read-model services
  - `service-settlement-operations-view`
  - `service-driver-operations-view`
  - `service-vehicle-operations-view`
  - `service-dispatch-operations-view`
  - `service-region-analytics`
- Batch 4: special runtime services
  - `service-notification-hub`
  - `service-telemetry-hub`
  - `service-telemetry-dead-letter`
  - `service-telemetry-listener`

- [ ] **Step 2: Apply the baseline in repo batches**

Prefer same-archetype batches so the changes stay consistent and reviewable.

- [ ] **Step 3: Leave business-internal layout alone**

If a repo already has a good domain layout, do not rewrite package trees just to make the matrix look neat.

### Task 4: Publish The Standard As Ongoing Platform Policy

**Files:**
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/README.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/lesson.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/superpowers/plans/2026-04-15-platform-next-development-and-deploy-scenarios-plan.md`

- [x] **Step 1: Link the baseline spec and audit matrix from the docs entrypoint**

The docs index should make this standard discoverable.

- [x] **Step 2: Add one root lesson**

Record that template rollout is about deploy surface hygiene, not monorepo-style code homogenization.

- [x] **Step 3: Update the scenarios plan**

Mark the templating lane as having a real baseline and rollout plan, not just a placeholder bullet.

- [x] **Step 4: Commit**

```bash
git add docs/superpowers/specs/2026-04-15-service-repo-template-baseline-design.md docs/superpowers/plans/2026-04-15-service-repo-template-rollout-implementation-plan.md docs/mappings/service-repo-template-audit-matrix.md docs/README.md lesson.md docs/superpowers/plans/2026-04-15-platform-next-development-and-deploy-scenarios-plan.md
git commit -m "docs: define service repo template rollout"
```
