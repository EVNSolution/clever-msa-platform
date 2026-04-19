# Prod Runtime Release Reset Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a production-only runtime release system centered on a new `runtime-prod-release` repo, while converting app repos to build/test/publish-only for prod and leaving infra shape changes in `infra-ev-dashboard-platform`.

**Architecture:** The work is split into four layers: inventory and release metadata, the new production release control plane, app-repo rollout removal, and evidence/smoke/rollback wiring. Runtime release decisions are workload-based, resolved from infra-owned inventory plus workload metadata, and executed on fixed EC2 runtime hosts through SSM Run Command.

**Tech Stack:** GitHub Actions, GitHub environments, AWS OIDC, AWS SSM Run Command, ECR immutable image digests, EC2 fixed runtime, manifest-based rollout control

---

## Delivery Phases

### Phase A: Representative Validation

Use a small representative set first to validate the model without cutting over every active repo.

The representative set is:

- `front-web-console`
- `edge-api-gateway`
- `service-account-access`
- `service-dispatch-registry`
- `service-dispatch-operations-view`
- `service-settlement-payroll`
- `service-settlement-operations-view`

This phase validates:

- inventory resolution
- workload metadata loading
- dynamic expansion
- rollback evidence
- resolve-only workflow
- real production workflow shape without fan-out

### Phase B: Full Fan-Out

Once Phase A passes, fan out metadata and build-only prod contract to all active deployable app repos.

### Phase C: Old Path Removal

Only after Phase B verification passes:

- remove old prod rollout entrypoints
- remove prod rollout credentials and prod OIDC assume paths from app repos
- lock prod ownership to `runtime-prod-release`

## Rollout Policy To Implement

The runtime release workflow must not invent orchestration semantics ad hoc.

The rollout policy is fixed as:

- workload class order:
  - `worker`
  - `consumer`
  - `core-api`
  - `entry`
- within a workload class, use declared `depends_on_workloads` topological order
- after each host group apply, run group-scoped health before proceeding
- if apply fails before current group health passes:
  - stop immediately
  - rollback all workloads already applied in the current group
- if a later group fails after earlier groups passed:
  - stop immediately
  - rollback every workload already applied in the current release in reverse rollout order
- do not mark a release successful until final smoke passes

## GitHub Configuration Minimization Policy

- organization-level GitHub Actions variables: exactly two
- `PROD_AWS_ROLE_ARN`
- `AWS_REGION`
- AWS long-lived credential secrets: forbidden
- app repo prod AWS credentials: forbidden
- production runtime auth path: OIDC only
- SSM target resolution: tag-based or inventory-derived, never ad hoc instance id input
- runtime secrets source: AWS-managed secret store only

Interpretation rules:

- `PROD_AWS_ROLE_ARN` is the production runtime release role ARN and is stored as a variable because it is non-sensitive configuration
- `AWS_REGION` is the shared workflow region and remains explicit because `aws-actions/configure-aws-credentials` requires an `aws-region` input
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and `AWS_SESSION_TOKEN` are forbidden in GitHub organization and repository secrets for this production release path
- `AWS_ACCOUNT_ID` and `ECR_REGISTRY_URI` are runtime-derived values, not standard GitHub variables
- `INSTANCE_ID` is replaced by SSM tag targeting or inventory-derived targeting
- `SUBNET_ID` and `SECURITY_GROUP_ID` remain infra-owned inventory, not release-time GitHub inputs
- application runtime secrets stay in AWS Secrets Manager or SSM Parameter Store
- SSM commands must not embed plaintext secret values directly in command arguments

## File Structure

### New repo / control plane

- Create: `development/runtime-prod-release/`
- Create: `development/runtime-prod-release/README.md`
- Create: `development/runtime-prod-release/.github/workflows/resolve-prod-release.yml`
- Create: `development/runtime-prod-release/.github/workflows/prod-release.yml`
- Create: `development/runtime-prod-release/.github/workflows/prod-smoke.yml`
- Create: `development/runtime-prod-release/.github/workflows/prod-rollback.yml`
- Create: `development/runtime-prod-release/release/schema/release-intent.schema.json`
- Create: `development/runtime-prod-release/release/schema/resolved-release-plan.schema.json`
- Create: `development/runtime-prod-release/release/schema/workload-metadata.schema.json`
- Create: `development/runtime-prod-release/release/schema/release-evidence.schema.json`
- Create: `development/runtime-prod-release/release/resolve_release.py`
- Create: `development/runtime-prod-release/release/dispatch_ssm.py`
- Create: `development/runtime-prod-release/release/evidence.py`
- Create: `development/runtime-prod-release/release/tests/test_release_resolution.py`
- Create: `development/runtime-prod-release/release/tests/test_inventory_resolution.py`
- Create: `development/runtime-prod-release/release/tests/test_rollback_target_resolution.py`
- Create: `development/runtime-prod-release/release/tests/test_resolve_only_workflow.py`

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

Only `infra-ev-dashboard-platform` owns the canonical inventory.

`runtime-prod-release` reads the exported artifact only. It does not create or persist an independent canonical inventory copy.

### App repo rollout removal and workload metadata

- Phase A representative repos:
  - `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/.github/workflows/*`
  - `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/edge-api-gateway/.github/workflows/*`
  - `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-account-access/.github/workflows/*`
  - `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-dispatch-registry/.github/workflows/*`
  - `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-dispatch-operations-view/.github/workflows/*`
  - `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-settlement-payroll/.github/workflows/*`
  - `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-settlement-operations-view/.github/workflows/*`
- Create per-repo metadata files:
  - `release/workload-metadata.json`
- Modify repo READMEs to state build/test/publish-only prod contract

### Evidence semantics

The evidence schema must store at least:

- `workload_id`
- `target_host_group`
- `image_digest`
- `manifest_id`
- `approver`
- `ssm_command_id`
- `applied_config_revision`
- `smoke_result`
- `timestamp`

`applied_config_revision` is fixed as a deterministic hash of the applied runtime config artifact:

- for `compose` workloads:
  - rendered compose file hash + env bundle hash
- for `systemd` workloads:
  - rendered unit file hash + env bundle hash + referenced runtime launcher payload hash

The same field name is retained across workload classes, but the hashing inputs are class-specific and explicit.

### Central old path deprecation or bridge

- Modify or archive references in existing deploy docs once cutover is ready
- Keep any bridge workflow minimal and explicit if temporary compatibility is needed

---

### Task 1: Create `runtime-prod-release` Repo Skeleton

**Files:**
- Create: `development/runtime-prod-release/README.md`
- Create: `development/runtime-prod-release/release/schema/release-intent.schema.json`
- Create: `development/runtime-prod-release/release/schema/resolved-release-plan.schema.json`
- Create: `development/runtime-prod-release/release/schema/workload-metadata.schema.json`
- Create: `development/runtime-prod-release/release/schema/release-evidence.schema.json`
- Create: `development/runtime-prod-release/release/tests/test_release_resolution.py`

- [ ] **Step 1: Write the failing schema and resolution tests**

Create tests that assert:
- release unit is `workload_id`, not repo
- release intent contains only operator input fields
- resolved release plan contains only system-resolved fields
- `target_host_group` is resolved from inventory, not passed ad hoc
- `deploy_method` is derived from workload class, not selected in release input

- [ ] **Step 2: Run tests to verify they fail**

Run: `pytest development/runtime-prod-release/release/tests/test_release_resolution.py -v`
Expected: FAIL because repo and resolver do not exist yet.

- [ ] **Step 3: Add minimal repo structure and schemas**

Create minimal README and schema files with required fields:
- release intent:
  - `workload_id`
  - `repo`
  - `image_digest`
  - `release_reason`
- resolved release plan:
  - `workload_id`
  - `target_host_group`
  - `deploy_method`
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

- [ ] **Verification additions**

Verify:
- `runtime-prod-release` introduces no long-lived AWS credential secret usage
- production role assume path exists only in `runtime-prod-release`
- organization variables target the two-name standard: `PROD_AWS_ROLE_ARN`, `AWS_REGION`

### Task 2: Implement Canonical Runtime Inventory Resolution

**Files:**
- Create: `development/runtime-prod-release/release/resolve_release.py`
- Create: `development/runtime-prod-release/release/tests/test_inventory_resolution.py`
- Modify: `development/infra-ev-dashboard-platform/README.md`
- Create or modify: `development/infra-ev-dashboard-platform/release/prod-runtime-inventory.json`
- Create or modify: `development/infra-ev-dashboard-platform/scripts/export-runtime-inventory.*`

- [ ] **Step 1: Write failing inventory resolution tests**

Test cases:
- valid `workload_id` resolves to canonical `target_host_group`
- `deploy_method` comes from workload class
- unknown `workload_id` hard fails

- [ ] **Step 2: Run inventory tests to verify failure**

Run: `pytest development/runtime-prod-release/release/tests/test_inventory_resolution.py -v`
Expected: FAIL due to missing inventory resolver.

- [ ] **Step 3: Implement minimal inventory resolver**

Implement resolver that reads only the infra-owned exported inventory artifact and returns:
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

- [ ] **Verification additions**

Verify:
- SSM dispatch and release resolution consume tag-based or inventory-derived targets
- no instance id variable becomes a standard release input

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
- emit a resolved release plan artifact that is separate from the release intent input

- [ ] **Step 4: Re-run tests**

Run: `pytest development/runtime-prod-release/release/tests/test_release_resolution.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add development/runtime-prod-release development/front-web-console development/edge-api-gateway development/service-account-access development/service-dispatch-registry development/service-dispatch-operations-view development/service-settlement-payroll development/service-settlement-operations-view
git commit -m "feat: add workload metadata expansion rules"
```

### Task 4: Add Resolve-Only Workflow Before Real SSM Dispatch

**Files:**
- Create: `development/runtime-prod-release/.github/workflows/resolve-prod-release.yml`
- Create: `development/runtime-prod-release/release/tests/test_resolve_only_workflow.py`
- Modify: `development/runtime-prod-release/release/resolve_release.py`

- [ ] **Step 1: Write failing resolve-only workflow tests**

Cover:
- release intent parsing
- dynamic expansion
- inventory resolution
- rollout wave or group ordering
- rendered SSM command preview without execution

- [ ] **Step 2: Run tests to verify failure**

Run: `pytest development/runtime-prod-release/release/tests/test_resolve_only_workflow.py -v`
Expected: FAIL because resolve-only workflow and render path do not exist.

- [ ] **Step 3: Implement resolve-only workflow**

The workflow must:
- never execute SSM
- emit resolved release plan artifact
- emit rollout order
- emit expected SSM command rendering preview

- [ ] **Step 4: Re-run tests**

Run: `pytest development/runtime-prod-release/release/tests/test_resolve_only_workflow.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add development/runtime-prod-release
git commit -m "feat: add resolve-only prod release workflow"
```

### Task 5: Implement Rollback Evidence and Last Successful Release Resolution

**Files:**
- Create: `development/runtime-prod-release/release/evidence.py`
- Create: `development/runtime-prod-release/release/tests/test_rollback_target_resolution.py`
- Create: `development/runtime-prod-release/release/schema/release-evidence.schema.json`
- Modify: `development/runtime-prod-release/release/resolve_release.py`

- [ ] **Step 1: Write failing rollback target tests**

Test cases:
- rollback target is last successful release item for same workload
- evidence requires `image_digest + applied_config_revision + smoke pass`
- incomplete evidence is rejected

- [ ] **Step 2: Run tests to verify failure**

Run: `pytest development/runtime-prod-release/release/tests/test_rollback_target_resolution.py -v`
Expected: FAIL due to missing evidence logic.

- [ ] **Step 3: Implement minimal evidence resolver**

Store and resolve:
- workload id
- target host group
- image digest
- release manifest id
- approver
- SSM command id
- applied config revision
- smoke result
- timestamp

- [ ] **Step 4: Re-run tests**

Run: `pytest development/runtime-prod-release/release/tests/test_rollback_target_resolution.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add development/runtime-prod-release
git commit -m "feat: add rollback evidence resolution"
```

### Task 6: Implement Rollout Ordering and Partial Failure Rules in Production Workflow

**Files:**
- Create: `development/runtime-prod-release/.github/workflows/prod-release.yml`
- Create: `development/runtime-prod-release/release/dispatch_ssm.py`
- Create: `development/runtime-prod-release/.github/workflows/prod-smoke.yml`
- Create: `development/runtime-prod-release/.github/workflows/prod-rollback.yml`

- [ ] **Step 1: Write failing rollout orchestration tests**

Check for:
- `environment=prod`
- shared concurrency key
- OIDC AWS auth
- release intent resolution before SSM dispatch
- rollout order `worker -> consumer -> core-api -> entry`
- stop-on-failure semantics
- reverse-order rollback semantics

- [ ] **Step 2: Run the contract test to verify failure**

Run the chosen local validation command for workflow lint or script assertions.

- [ ] **Step 3: Implement the release workflow minimally**

Required flow:
- checkout
- resolve release intent
- resolve inventory and metadata expansion
- compute resolved release plan
- compute rollout order
- approve through `prod` environment
- assume AWS role with OIDC
- dispatch SSM commands by rollout order
- stop immediately on first failure
- trigger reverse-order rollback of already-applied workloads
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

- [ ] **Verification additions**

Verify:
- GitHub org and repo secrets used by the production release path contain no long-lived AWS credentials
- only `runtime-prod-release` contains the prod role assume path
- SSM dispatch uses inventory or tag resolution, never ad hoc instance id variable input

### Task 7: Phase A Representative Validation

**Files:**
- Validate only the seven representative repos plus `runtime-prod-release` and `infra-ev-dashboard-platform`

- [ ] **Step 1: Run Phase A resolve-only validation**

Expected: representative release intent resolves correctly without real SSM dispatch.

- [ ] **Step 2: Run representative metadata validation**

Expected: all seven representative repos declare workload metadata correctly.

- [ ] **Step 3: Run representative rollback/evidence validation**

Expected: PASS

- [ ] **Step 4: Commit Phase A checkpoint**

```bash
git add -A
git commit -m "test: validate phase a representative prod release flow"
```

### Task 8: Phase B Fan-Out to All Active App Repos

**Files:**
- Modify all active deployable app repos

- [ ] **Step 1: Add workload metadata to every active deployable app repo**

Expected output: every active app repo has `release/workload-metadata.json`.

- [ ] **Step 2: Update README build-only prod contract in every active app repo**

Expected output: every active app repo points prod rollout ownership to `runtime-prod-release`.

- [ ] **Step 3: Run metadata fan-out verification**

Expected: PASS for all active repos.

- [ ] **Step 4: Commit**

```bash
git add development/*/release/workload-metadata.json development/*/README.md
git commit -m "feat: fan out workload metadata to active repos"
```

### Task 9: Phase C Remove Prod Rollout Credentials and Entrypoints from App Repos

**Files:**
- Modify all active app repo workflows and docs

- [ ] **Step 1: Inventory current prod rollout secrets, workflows, and entrypoints**

Create a checklist of:
- prod deploy secrets
- prod rollout workflows
- prod environment usage
- prod OIDC assume paths
- docs that still claim app repo deploy ownership

- [ ] **Step 2: Write failing verification script**

The script must fail if any active app repo still has:
- prod rollout workflow
- prod deploy credentials
- prod runtime apply step
- prod environment definition or use
- prod OIDC assume path
- README deploy ownership drift

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

- [ ] **Verification additions**

Verify:
- active app repos retain no prod environment usage
- active app repos retain no prod OIDC assume path
- active app repos retain no prod deploy secret
- active app repos retain no prod rollout workflow entrypoint

### Task 10: Wire Docs, Workspace Map, and Acceptance Evidence

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

- [ ] **Verification additions**

Verify:
- docs explicitly state the organization variable standard is only `PROD_AWS_ROLE_ARN` and `AWS_REGION`
- docs explicitly forbid long-lived AWS credential secrets in GitHub
- docs explicitly state runtime-prod-release is the only prod role assume path
- docs explicitly state SSM target resolution is tag-based or inventory-derived

### Task 11: Final Verification Gate

**Files:**
- Verify all touched files and repos

- [ ] **Step 1: Run runtime-prod-release test suite**

Run:
- `pytest development/runtime-prod-release/release/tests -v`

Expected: PASS

- [ ] **Step 2: Run app repo rollout-entrypoint verification**

Run the verification script from Task 9.
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
