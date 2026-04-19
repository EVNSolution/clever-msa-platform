# Prod Runtime Release Reset Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a production-only runtime release system centered on a new `runtime-prod-release` repo, while converting app repos to build/test/publish-only for prod and leaving infra shape changes in `infra-ev-dashboard-platform`.

**Architecture:** The work is split into four layers: inventory and release metadata, the new production release control plane, app-repo rollout removal, and evidence/smoke/rollback wiring. Runtime release decisions are workload-based, resolved from infra-owned inventory plus workload metadata, and executed on fixed EC2 runtime hosts through SSM Run Command.

**Tech Stack:** GitHub Actions, GitHub environments, AWS OIDC, AWS SSM Run Command, ECR immutable image digests, EC2 fixed runtime, manifest-based rollout control

---

## File Structure

### New repo / control plane

- Create: `development/runtime-prod-release/`
- Create: `development/runtime-prod-release/README.md`
- Create: `development/runtime-prod-release/.github/workflows/prod-release.yml`
- Create: `development/runtime-prod-release/.github/workflows/prod-smoke.yml`
- Create: `development/runtime-prod-release/.github/workflows/prod-rollback.yml`
- Create: `development/runtime-prod-release/release/inventory/prod-runtime-inventory.json`
- Create: `development/runtime-prod-release/release/schema/release-manifest.schema.json`
- Create: `development/runtime-prod-release/release/schema/workload-metadata.schema.json`
- Create: `development/runtime-prod-release/release/resolve_release.py`
- Create: `development/runtime-prod-release/release/dispatch_ssm.py`
- Create: `development/runtime-prod-release/release/evidence.py`
- Create: `development/runtime-prod-release/release/tests/test_release_resolution.py`
- Create: `development/runtime-prod-release/release/tests/test_inventory_resolution.py`
- Create: `development/runtime-prod-release/release/tests/test_rollback_target_resolution.py`

### Platform docs and repo visibility

- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/WORKSPACE.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/repo-map.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/mappings/current-runtime-inventory.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/superpowers/specs/2026-04-19-prod-runtime-release-reset-design.md`

### Infra inventory contract

- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/README.md`
- Create or modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/release/prod-runtime-inventory.json`
- Create or modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/scripts/export-runtime-inventory.*`
- Test: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/test/*inventory*.test.*`

### App repo rollout removal and workload metadata

- Modify representative repos first:
  - `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/.github/workflows/*`
  - `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/edge-api-gateway/.github/workflows/*`
  - `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-account-access/.github/workflows/*`
- Create per-repo metadata files:
  - `release/workload-metadata.json`
- Modify repo READMEs to state build/test/publish-only prod contract

### Central old path deprecation or bridge

- Modify or archive references in existing deploy docs once cutover is ready
- Keep any bridge workflow minimal and explicit if temporary compatibility is needed

---

### Task 1: Create `runtime-prod-release` Repo Skeleton

**Files:**
- Create: `development/runtime-prod-release/README.md`
- Create: `development/runtime-prod-release/release/schema/release-manifest.schema.json`
- Create: `development/runtime-prod-release/release/schema/workload-metadata.schema.json`
- Create: `development/runtime-prod-release/release/tests/test_release_resolution.py`

- [ ] **Step 1: Write the failing schema and resolution tests**

Create tests that assert:
- release unit is `workload_id`, not repo
- `target_host_group` is resolved from inventory, not passed ad hoc
- `deploy_method` is derived from workload class

- [ ] **Step 2: Run tests to verify they fail**

Run: `pytest development/runtime-prod-release/release/tests/test_release_resolution.py -v`
Expected: FAIL because repo and resolver do not exist yet.

- [ ] **Step 3: Add minimal repo structure and schemas**

Create minimal README and schema files with required fields:
- `workload_id`
- `repo`
- `image_digest`
- `healthcheck`
- `rollback_target`

- [ ] **Step 4: Re-run tests and keep them red for missing resolver logic**

Run: `pytest development/runtime-prod-release/release/tests/test_release_resolution.py -v`
Expected: FAIL at resolver behavior, not at missing files.

- [ ] **Step 5: Commit**

```bash
git add development/runtime-prod-release
git commit -m "feat: scaffold runtime prod release repo"
```

### Task 2: Implement Canonical Runtime Inventory Resolution

**Files:**
- Create: `development/runtime-prod-release/release/inventory/prod-runtime-inventory.json`
- Create: `development/runtime-prod-release/release/resolve_release.py`
- Create: `development/runtime-prod-release/release/tests/test_inventory_resolution.py`
- Modify: `development/infra-ev-dashboard-platform/README.md`
- Create or modify: `development/infra-ev-dashboard-platform/release/prod-runtime-inventory.json`

- [ ] **Step 1: Write failing inventory resolution tests**

Test cases:
- valid `workload_id` resolves to canonical `target_host_group`
- `deploy_method` comes from workload class
- unknown `workload_id` hard fails

- [ ] **Step 2: Run inventory tests to verify failure**

Run: `pytest development/runtime-prod-release/release/tests/test_inventory_resolution.py -v`
Expected: FAIL due to missing inventory resolver.

- [ ] **Step 3: Implement minimal inventory resolver**

Implement resolver that reads infra-owned inventory and returns:
- workload class
- target host group
- deploy method
- healthcheck contract

- [ ] **Step 4: Add infra-side inventory artifact and ownership doc**

Document that `infra-ev-dashboard-platform` owns canonical host group mapping and runtime classes.

- [ ] **Step 5: Re-run tests**

Run:
- `pytest development/runtime-prod-release/release/tests/test_inventory_resolution.py -v`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add development/runtime-prod-release development/infra-ev-dashboard-platform
git commit -m "feat: add canonical prod runtime inventory resolution"
```

### Task 3: Add Workload Metadata and Dynamic Expansion Engine

**Files:**
- Create: `development/runtime-prod-release/release/tests/test_release_resolution.py`
- Modify: `development/runtime-prod-release/release/resolve_release.py`
- Create representative metadata files:
  - `development/front-web-console/release/workload-metadata.json`
  - `development/edge-api-gateway/release/workload-metadata.json`
  - `development/service-account-access/release/workload-metadata.json`
  - `development/service-dispatch-registry/release/workload-metadata.json`
  - `development/service-dispatch-operations-view/release/workload-metadata.json`
  - `development/service-settlement-payroll/release/workload-metadata.json`
  - `development/service-settlement-operations-view/release/workload-metadata.json`

- [ ] **Step 1: Write failing expansion tests**

Cover:
- entry impact expands to `front-web-console + edge-api-gateway + service-account-access`
- read-model impact expands to matching `*-operations-view`
- async/event impact expands to declared dependent workloads

- [ ] **Step 2: Run tests to verify failure**

Run: `pytest development/runtime-prod-release/release/tests/test_release_resolution.py -v`
Expected: FAIL because metadata expansion is not implemented.

- [ ] **Step 3: Implement metadata loading and expansion logic**

Minimal implementation:
- load per-repo workload metadata
- compute final release set
- reject missing dependency declarations

- [ ] **Step 4: Re-run tests**

Run: `pytest development/runtime-prod-release/release/tests/test_release_resolution.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add development/runtime-prod-release development/front-web-console development/edge-api-gateway development/service-account-access development/service-dispatch-registry development/service-dispatch-operations-view development/service-settlement-payroll development/service-settlement-operations-view
git commit -m "feat: add workload metadata expansion rules"
```

### Task 4: Implement Rollback Evidence and Last Successful Release Resolution

**Files:**
- Create: `development/runtime-prod-release/release/evidence.py`
- Create: `development/runtime-prod-release/release/tests/test_rollback_target_resolution.py`
- Modify: `development/runtime-prod-release/release/resolve_release.py`

- [ ] **Step 1: Write failing rollback target tests**

Test cases:
- rollback target is last successful release item for same workload
- evidence requires `image_digest + config revision + smoke pass`
- incomplete evidence is rejected

- [ ] **Step 2: Run tests to verify failure**

Run: `pytest development/runtime-prod-release/release/tests/test_rollback_target_resolution.py -v`
Expected: FAIL due to missing evidence logic.

- [ ] **Step 3: Implement minimal evidence resolver**

Store and resolve:
- release manifest id
- approver
- SSM command id
- applied config revision
- smoke result

- [ ] **Step 4: Re-run tests**

Run: `pytest development/runtime-prod-release/release/tests/test_rollback_target_resolution.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add development/runtime-prod-release
git commit -m "feat: add rollback evidence resolution"
```

### Task 5: Build Production Release Workflow

**Files:**
- Create: `development/runtime-prod-release/.github/workflows/prod-release.yml`
- Create: `development/runtime-prod-release/release/dispatch_ssm.py`
- Create: `development/runtime-prod-release/.github/workflows/prod-smoke.yml`
- Create: `development/runtime-prod-release/.github/workflows/prod-rollback.yml`

- [ ] **Step 1: Write a failing workflow contract test or smoke script**

Check for:
- `environment=prod`
- shared concurrency key
- OIDC AWS auth
- release manifest resolution before SSM dispatch

- [ ] **Step 2: Run the contract test to verify failure**

Run the chosen local validation command for workflow lint or script assertions.

- [ ] **Step 3: Implement the release workflow minimally**

Required flow:
- checkout
- resolve manifest
- resolve inventory and metadata expansion
- approve through `prod` environment
- assume AWS role with OIDC
- dispatch SSM commands
- collect smoke evidence
- write release evidence

- [ ] **Step 4: Add rollback workflow**

Rollback must resolve last successful item and dispatch rollback through SSM.

- [ ] **Step 5: Re-run validation**

Run all local workflow or script validations required by the repo.

- [ ] **Step 6: Commit**

```bash
git add development/runtime-prod-release
git commit -m "feat: add prod runtime release workflows"
```

### Task 6: Remove Prod Rollout Credentials and Entrypoints from App Repos

**Files:**
- Modify representative app repo workflows and docs first
- Then fan out to all active deployable app repos

- [ ] **Step 1: Inventory current prod rollout secrets, workflows, and entrypoints**

Create a checklist of:
- prod deploy secrets
- prod rollout workflows
- docs that still claim app repo deploy ownership

- [ ] **Step 2: Write failing verification script**

The script must fail if any active app repo still has:
- prod rollout workflow
- prod deploy credentials
- prod runtime apply step

- [ ] **Step 3: Remove or disable prod rollout paths in app repos**

Keep only:
- build
- test
- publish immutable image

- [ ] **Step 4: Update READMEs**

Each repo must say:
- app repo is build/test/publish only for prod
- runtime rollout belongs to `runtime-prod-release`

- [ ] **Step 5: Run verification script**

Expected: PASS, no prod rollout entrypoint outside `runtime-prod-release`

- [ ] **Step 6: Commit**

```bash
git add development/*/README.md development/*/.github/workflows
git commit -m "chore: remove prod rollout from app repos"
```

### Task 7: Wire Docs, Workspace Map, and Acceptance Evidence

**Files:**
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/WORKSPACE.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/repo-map.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/mappings/current-runtime-inventory.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/superpowers/specs/2026-04-19-prod-runtime-release-reset-design.md`
- Add docs in `development/runtime-prod-release/README.md`

- [ ] **Step 1: Document the final operating rule**

Capture:
- app repos are build-only
- one prod release entrypoint
- infra shape split
- workload-based manifest release

- [ ] **Step 2: Add acceptance checklist**

Checklist must explicitly verify:
- no prod rollout credentials in app repos
- no non-release prod entrypoints
- SSM/evidence persistence
- no operator SSH required for routine release

- [ ] **Step 3: Run docs consistency review**

Search for stale references to:
- app-repo prod deploy
- central deploy as prod runtime owner
- mutable tag rollout

- [ ] **Step 4: Commit**

```bash
git add /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/WORKSPACE.md /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/repo-map.md /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/mappings/current-runtime-inventory.md /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/superpowers/specs/2026-04-19-prod-runtime-release-reset-design.md development/runtime-prod-release/README.md
git commit -m "docs: record prod runtime release operating model"
```

### Task 8: Final Verification Gate

**Files:**
- Verify all touched files and repos

- [ ] **Step 1: Run runtime-prod-release test suite**

Run:
- `pytest development/runtime-prod-release/release/tests -v`

Expected: PASS

- [ ] **Step 2: Run app repo rollout-entrypoint verification**

Run the verification script from Task 6.
Expected: PASS

- [ ] **Step 3: Run any workflow lint or schema validation**

Expected: PASS

- [ ] **Step 4: Manual contract review**

Confirm by inspection:
- release unit is workload
- host group comes from inventory
- deploy method comes from workload class
- rollback target is last successful release item
- dynamic expansion is metadata-driven

- [ ] **Step 5: Commit any final cleanup**

```bash
git add -A
git commit -m "test: verify prod runtime release reset"
```
