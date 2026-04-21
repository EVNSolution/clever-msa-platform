# Public OpenAPI Edge Ownership Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move public OpenAPI generation and serving into `edge-api-gateway`, extend `runtime-prod-release` so deployed edge evidence includes the docs snapshot identity, and remove root-owned deploy/docs workflows from `clever-msa-platform`.

**Architecture:** The implementation is split into three waves. First, `edge-api-gateway` gains a static public docs workspace, an aggregation/parity pipeline, and image/runtime wiring for `/openapi.yaml`, `/swagger/`, and `/redoc/`. Second, `runtime-prod-release` captures `api_docs_revision` for edge deployments from the deployed edge runtime and writes that into release evidence. Third, the platform root deletes executable workflows and rewrites active docs so the root remains docs/policy only.

**Tech Stack:** Nginx, Python, GitHub Actions, Docker, AWS SSM Run Command, JSON Schema, Markdown docs

---

## Scope And Canonical Truth

This plan implements the approved ownership model from:

- `docs/superpowers/specs/2026-04-20-public-openapi-edge-ownership-design.md`

Execution workers must also follow:

- `@superpowers:test-driven-development`
- `@superpowers:verification-before-completion`
- `WORKSPACE.md`
- `repo-map.md`

This plan does not reopen ownership design. It only defines the implementation work needed to make that design real.

## Locked Implementation Decisions

### Edge Parity Gate

`edge-api-gateway` parity must compare the current edge-served public contract against the pre-cutover contract with these rules:

- equality requires the same public `path` set
- equality requires the same HTTP `method` set for each public path
- equality requires the same response `status code` set for each operation
- equality requires the same normalized schema digest for:
  - request body schema
  - `application/json` response schema per status code
- ignored fields:
  - `summary`
  - `description`
  - `operationId`
  - `tags`
  - `examples`
  - `servers`
  - field ordering
- fallback allowlist entries may skip schema digest comparison temporarily, but they must still pass path, method, and status-code parity
- cutover only passes when:
  - there are zero missing paths
  - zero extra paths
  - zero method mismatches
  - zero status-code mismatches
  - zero schema mismatches outside the fallback allowlist

The parity script must emit a machine-readable report at `development/edge-api-gateway/public-api-docs/parity-report.json`.

### Pre-Cutover Reference Contract

The parity reference is a tracked fixture in the edge repo:

- `development/edge-api-gateway/tests/fixtures/pre-cutover-public-openapi.yaml`

Capture rule:

- create the fixture once from the last pre-cutover public `/openapi.yaml` response served by the current live edge path
- commit that fixture in the same PR that introduces parity checking
- do not fetch the live contract during CI parity runs
- if the baseline must change before cutover, update the fixture in an explicit reviewable commit before rerunning parity

CI and local parity checks must compare the generated edge artifact to this committed fixture, not to a live network call.

### Fallback Allowlist Canonical Location

The canonical fallback ledger lives in:

- `development/edge-api-gateway/public-api-docs/fallback-allowlist.json`

This file is edge-owned. Service repos do not edit their own fallback status directly; they remove themselves from the allowlist by shipping a valid service export that lets the edge build pass without fallback.

Each allowlist entry must contain:

```json
{
  "service": "service-account-access",
  "path": "/api/auth/token/",
  "method": "post",
  "mode": "route_inventory",
  "reason": "service export missing request schema",
  "owner": "service-account-access",
  "exit_condition": "service export exists and parity passes without fallback"
}
```

Change rule:

- add or change an allowlist entry only in the same PR that changes aggregation behavior or introduces a new temporary gap
- remove an allowlist entry only in the same PR that adds the missing service export or fixes the parity failure

### Release Evidence JSON Shape

`runtime-prod-release` must record `api_docs_revision` only for `edge-api-gateway` release evidence items.

The target payload shape is:

```json
{
  "workload_id": "edge-api-gateway",
  "target_host_group": "evdash-msa",
  "image_digest": "902837199612.dkr.ecr.ap-northeast-2.amazonaws.com/edge-api-gateway@sha256:abc123",
  "manifest_id": "runtime-prod-release-edge-api-gateway-20260420T141500123456Z",
  "approver": "oziing",
  "ssm_command_id": "4e8fae3f-9f6d-4f2f-b8e0-111111111111",
  "applied_config_revision": "edge-api-gateway@be4834f",
  "api_docs_revision": {
    "edge_commit_sha": "be4834f3d0d8e7b6d3df3d5d7e7c111111111111",
    "openapi_sha256": "7c7f2d2f0d0acfe1111111111111111111111111111111111111111111111111",
    "service_export_manifest_sha": "0c5b6fd9d6ef4e11111111111111111111111111111111111111111111111111"
  },
  "smoke_result": "passed",
  "timestamp": "2026-04-20T14:16:23Z"
}
```

The source of truth for `api_docs_revision` is a build-generated edge file:

- `development/edge-api-gateway/public-api-docs/revision.json`

That file must be packaged into the edge image and read back during release evidence collection from the deployed edge runtime.

### Generated Artifact Git Policy

Tracked source files:

- `development/edge-api-gateway/public-api-docs/fallback-allowlist.json`
- `development/edge-api-gateway/public-api-docs/swagger/index.html`
- `development/edge-api-gateway/public-api-docs/redoc/index.html`
- `development/edge-api-gateway/tests/fixtures/pre-cutover-public-openapi.yaml`

Build-generated, non-tracked outputs:

- `development/edge-api-gateway/public-api-docs/openapi.yaml`
- `development/edge-api-gateway/public-api-docs/revision.json`
- `development/edge-api-gateway/public-api-docs/service-export-manifest.json`
- `development/edge-api-gateway/public-api-docs/parity-report.json`

Policy:

- generated docs artifacts are created locally or in CI before `docker build`
- generated docs artifacts are copied into the image from the workspace build output
- generated docs artifacts must be ignored in `development/edge-api-gateway/.gitignore`
- CI must upload the generated docs artifacts as workflow artifacts for inspection
- no PR should require committing regenerated `openapi.yaml`, `revision.json`, `service-export-manifest.json`, or `parity-report.json`

## File Structure

### Edge Ownership Work

- Create:
  - `development/edge-api-gateway/tests/fixtures/pre-cutover-public-openapi.yaml`
  - `development/edge-api-gateway/public-api-docs/openapi.yaml`
  - `development/edge-api-gateway/public-api-docs/revision.json`
  - `development/edge-api-gateway/public-api-docs/service-export-manifest.json`
  - `development/edge-api-gateway/public-api-docs/fallback-allowlist.json`
  - `development/edge-api-gateway/public-api-docs/swagger/index.html`
  - `development/edge-api-gateway/public-api-docs/redoc/index.html`
  - `development/edge-api-gateway/public-api-docs/parity-report.json`
  - `development/edge-api-gateway/scripts/build_public_openapi.py`
  - `development/edge-api-gateway/scripts/check_public_openapi_parity.py`
  - `development/edge-api-gateway/tests/test_public_openapi_build.py`
  - `development/edge-api-gateway/tests/test_public_openapi_parity.py`
- Modify:
  - `development/edge-api-gateway/.github/workflows/build-image.yml`
  - `development/edge-api-gateway/.gitignore`
  - `development/edge-api-gateway/Dockerfile`
  - `development/edge-api-gateway/nginx.conf`
  - `development/edge-api-gateway/tests/test_nginx_docs_routes.py`
  - `development/edge-api-gateway/README.md`

### Release Evidence Work

- Create:
  - `development/runtime-prod-release/release/read_edge_api_docs_revision.py`
  - `development/runtime-prod-release/release/tests/test_edge_api_docs_revision.py`
  - `development/runtime-prod-release/release/tests/test_release_evidence_schema.py`
- Modify:
  - `development/runtime-prod-release/.github/workflows/prod-release.yml`
  - `development/runtime-prod-release/release/evidence.py`
  - `development/runtime-prod-release/release/dispatch_ssm.py`
  - `development/runtime-prod-release/release/schema/release-evidence.schema.json`
  - `development/runtime-prod-release/release/tests/test_release_workflow_contract.py`

### Root Cleanup Work

- Delete:
  - `.github/workflows/central-deploy.yml`
  - `.github/workflows/central-deploy-dispatch.yml`
  - `.github/workflows/refresh-api-docs.yml`
  - `.github/workflows/provision-ec2-app-host.yml`
- Modify:
  - `docs/README.md`
  - `docs/mappings/08-current-msa-api-docs-reading-guide.md`
  - `docs/rollout/README.md`
  - `docs/rollout/2026-04-07-central-deploy-reference.md`
  - `docs/rollout/2026-04-07-central-deploy-cutover-checklist.md`
  - `docs/rollout/2026-04-07-github-repo-setup.md`
  - `docs/runbooks/ev-dashboard-ui-smoke-and-decommission.md`
  - `docs/superpowers/specs/2026-04-09-api-docs-deploy-gate-design.md`

Historical specs and plans may remain as historical records, but any doc that is surfaced from active indexes or active runbooks must stop presenting `clever-deploy-control` or root workflows as current truth.

## A. Edge Ownership Migration

### Task 1: Scaffold The Edge Public Docs Workspace

**Files:**
- Create:
  - `development/edge-api-gateway/tests/fixtures/pre-cutover-public-openapi.yaml`
  - `development/edge-api-gateway/public-api-docs/fallback-allowlist.json`
  - `development/edge-api-gateway/public-api-docs/swagger/index.html`
  - `development/edge-api-gateway/public-api-docs/redoc/index.html`
  - `development/edge-api-gateway/tests/test_public_openapi_build.py`
  - `development/edge-api-gateway/tests/test_public_openapi_parity.py`
- Modify:
  - `development/edge-api-gateway/.gitignore`
  - `development/edge-api-gateway/tests/test_nginx_docs_routes.py`

- [ ] **Step 1: Write the failing docs-route and artifact tests**

Add tests that fail until all of the following are true:
- `/openapi.yaml` is served as a static file
- `/swagger/` and `/redoc/` are served by edge-owned static assets
- `tests/fixtures/pre-cutover-public-openapi.yaml` exists as the committed parity baseline
- `fallback-allowlist.json` must exist
- `revision.json` and `service-export-manifest.json` must exist after build
- `parity-report.json` must be generated by the parity script

- [ ] **Step 2: Run the failing edge test subset**

Run:

```bash
cd development/edge-api-gateway
python -m unittest tests.test_nginx_docs_routes tests.test_public_openapi_build tests.test_public_openapi_parity
```

Expected: FAIL because the current edge config still proxies `/openapi.yaml`, `/swagger/`, and `/redoc/` to `account-auth-api`.

- [ ] **Step 3: Create the public docs workspace skeleton**

Add placeholder files with these responsibilities:
- `tests/fixtures/pre-cutover-public-openapi.yaml`: committed parity baseline captured once before cutover
- `fallback-allowlist.json`: canonical temporary fallback ledger
- `swagger/index.html`: Swagger UI that reads `/openapi.yaml`
- `redoc/index.html`: Redoc UI that reads `/openapi.yaml`
- `.gitignore`: ignores generated docs build outputs so local rebuilds do not create diff noise
- tests that describe the target artifact contract

- [ ] **Step 4: Commit**

```bash
git -C development/edge-api-gateway add public-api-docs tests
git -C development/edge-api-gateway commit -m "test: scaffold edge public docs contract"
```

### Task 2: Build The Aggregator, Manifest, Revision File, And Parity Checker

**Files:**
- Create:
  - `development/edge-api-gateway/scripts/build_public_openapi.py`
  - `development/edge-api-gateway/scripts/check_public_openapi_parity.py`
  - `development/edge-api-gateway/public-api-docs/openapi.yaml`
  - `development/edge-api-gateway/public-api-docs/service-export-manifest.json`
  - `development/edge-api-gateway/public-api-docs/revision.json`
  - `development/edge-api-gateway/public-api-docs/parity-report.json`
- Modify:
  - `development/edge-api-gateway/.gitignore`
  - `development/edge-api-gateway/tests/test_public_openapi_build.py`
  - `development/edge-api-gateway/tests/test_public_openapi_parity.py`
  - `development/edge-api-gateway/README.md`

- [ ] **Step 1: Write failing tests for aggregation rules**

The tests must assert:
- duplicate `path + method` fails
- conflicting component names fail
- private/internal endpoints are excluded
- parity compares against `tests/fixtures/pre-cutover-public-openapi.yaml`
- `service-export-manifest.json` is canonicalized before hashing
- `revision.json` contains exactly:
  - `edge_commit_sha`
  - `openapi_sha256`
  - `service_export_manifest_sha`

- [ ] **Step 2: Implement `build_public_openapi.py`**

The script must:
- read service-owned exports when available
- fall back to route inventory only when an operation is explicitly listed in `fallback-allowlist.json`
- emit:
  - `openapi.yaml`
  - `service-export-manifest.json`
  - `revision.json`
- compute:
  - `openapi_sha256` from canonicalized `openapi.yaml`
  - `service_export_manifest_sha` from canonicalized `service-export-manifest.json`
- populate `edge_commit_sha` from `EDGE_COMMIT_SHA` env var, with local fallback to `git rev-parse HEAD`

- [ ] **Step 3: Implement `check_public_openapi_parity.py`**

The script must:
- compare the new edge artifact to the pre-cutover reference contract
- load the reference contract from `tests/fixtures/pre-cutover-public-openapi.yaml`
- enforce the parity rules in the `Edge Parity Gate` section above
- write `public-api-docs/parity-report.json`
- exit non-zero on any disallowed mismatch

The report shape must include:

```json
{
  "status": "failed",
  "missing_paths": [],
  "extra_paths": [],
  "method_mismatches": [],
  "status_code_mismatches": [],
  "schema_mismatches": [],
  "fallback_entries_used": []
}
```

- [ ] **Step 4: Run the build and parity tests**

Run:

```bash
cd development/edge-api-gateway
python scripts/build_public_openapi.py
python scripts/check_public_openapi_parity.py
python -m unittest tests.test_public_openapi_build tests.test_public_openapi_parity
```

Expected:
- `public-api-docs/openapi.yaml` exists
- `public-api-docs/revision.json` exists
- `public-api-docs/service-export-manifest.json` exists
- `public-api-docs/parity-report.json` exists
- parity fails until all current-route gaps are either fixed or explicitly allowlisted

- [ ] **Step 5: Commit**

```bash
git -C development/edge-api-gateway add scripts public-api-docs README.md tests
git -C development/edge-api-gateway commit -m "feat: add edge public openapi build and parity checks"
```

### Task 3: Serve The Static Artifact From Edge And Gate The Image Build

**Files:**
- Modify:
  - `development/edge-api-gateway/nginx.conf`
  - `development/edge-api-gateway/Dockerfile`
  - `development/edge-api-gateway/.github/workflows/build-image.yml`
  - `development/edge-api-gateway/tests/test_nginx_docs_routes.py`

- [ ] **Step 1: Write the failing image/build workflow expectations**

Add or update tests so they fail until:
- `nginx.conf` serves `/openapi.yaml` from a static file location
- `/swagger/` and `/redoc/` resolve to edge-owned static files
- the image build runs the OpenAPI build and parity scripts before `docker build`
- the image contains `public-api-docs/revision.json`

- [ ] **Step 2: Replace upstream proxy docs routes with static serving**

`nginx.conf` must:
- stop proxying `/openapi.yaml`, `/swagger/`, and `/redoc/` to `account-auth-api`
- serve `public-api-docs/openapi.yaml` directly
- serve `swagger/index.html` and `redoc/index.html` directly
- keep admin/account-access routes proxied to `account-auth-api`

- [ ] **Step 3: Wire the static assets into the image**

`Dockerfile` must:
- copy `public-api-docs/` into a deterministic image path
- keep current entrypoint behavior unchanged for the rest of the edge runtime

`build-image.yml` must:
- export `EDGE_COMMIT_SHA=${GITHUB_SHA}`
- run `python scripts/build_public_openapi.py`
- run `python scripts/check_public_openapi_parity.py`
- run the docs-related tests
- upload `openapi.yaml`, `revision.json`, `service-export-manifest.json`, and `parity-report.json` as workflow artifacts
- only then build and push the image

- [ ] **Step 4: Run local edge verification**

Run:

```bash
cd development/edge-api-gateway
python -m unittest tests.test_nginx_docs_routes tests.test_public_openapi_build tests.test_public_openapi_parity
docker build -t edge-api-gateway:openapi-cutover .
git status --short
```

Expected:
- docs route tests pass
- build succeeds with the generated static docs assets included
- `git status --short` does not show generated docs artifacts as tracked changes

- [ ] **Step 5: Commit**

```bash
git -C development/edge-api-gateway add .github/workflows/build-image.yml Dockerfile nginx.conf tests public-api-docs
git -C development/edge-api-gateway commit -m "feat: serve public openapi from edge image"
```

## B. Release Evidence Extension

### Task 4: Capture `api_docs_revision` From The Deployed Edge Runtime

**Files:**
- Create:
  - `development/runtime-prod-release/release/read_edge_api_docs_revision.py`
  - `development/runtime-prod-release/release/tests/test_edge_api_docs_revision.py`
  - `development/runtime-prod-release/release/tests/test_release_evidence_schema.py`
- Modify:
  - `development/runtime-prod-release/release/evidence.py`
  - `development/runtime-prod-release/release/schema/release-evidence.schema.json`
  - `development/runtime-prod-release/release/tests/test_release_workflow_contract.py`

- [ ] **Step 1: Write failing evidence-schema and edge-revision tests**

The tests must fail until:
- `release-evidence.schema.json` allows `api_docs_revision`
- `api_docs_revision` is required when `workload_id == "edge-api-gateway"`
- non-edge workloads may omit `api_docs_revision`
- `read_edge_api_docs_revision.py` can parse a valid `revision.json` payload from the deployed runtime

- [ ] **Step 2: Implement the revision reader**

`read_edge_api_docs_revision.py` must:
- read the deployed edge runtime over SSM-friendly shell output
- parse a JSON payload shaped like `public-api-docs/revision.json`
- validate that it contains exactly:
  - `edge_commit_sha`
  - `openapi_sha256`
  - `service_export_manifest_sha`

The implementation may read the revision from the running edge container or from an extracted static file path on the host, but it must come from the deployed runtime, not from a local repo checkout.

- [ ] **Step 3: Extend the evidence schema and helper functions**

`release-evidence.schema.json` must describe:
- `api_docs_revision.edge_commit_sha`
- `api_docs_revision.openapi_sha256`
- `api_docs_revision.service_export_manifest_sha`

`evidence.py` must:
- validate the conditional edge requirement
- preserve current successful-release selection behavior
- keep non-edge release evidence backwards-compatible

- [ ] **Step 4: Run the evidence tests**

Run:

```bash
cd development/runtime-prod-release
python -m pytest release/tests/test_edge_api_docs_revision.py release/tests/test_release_evidence_schema.py release/tests/test_release_workflow_contract.py -q
```

Expected:
- schema tests pass
- the workflow contract still resolves then dispatches
- evidence helpers accept edge items with `api_docs_revision`

- [ ] **Step 5: Commit**

```bash
git -C development/runtime-prod-release add release .github/workflows/prod-release.yml
git -C development/runtime-prod-release commit -m "feat: record edge api docs revision in release evidence"
```

### Task 5: Extend The Prod Release Workflow To Persist Edge Docs Evidence

**Files:**
- Modify:
  - `development/runtime-prod-release/.github/workflows/prod-release.yml`
  - `development/runtime-prod-release/release/dispatch_ssm.py`
  - `development/runtime-prod-release/release/evidence.py`

- [ ] **Step 1: Write the failing workflow expectation**

The workflow contract test must fail until `prod-release.yml` does all of the following:
- resolve the release plan
- dispatch the release
- when the released workload set contains `edge-api-gateway`, read back `api_docs_revision`
- write or upload release evidence containing that object

- [ ] **Step 2: Implement the post-dispatch evidence collection**

`prod-release.yml` must:
- keep the current resolve -> dispatch order
- add a post-dispatch evidence step for edge releases
- persist the resulting evidence JSON as a workflow artifact or checked output

`dispatch_ssm.py` must expose enough information to target the deployed edge runtime for the revision readback step without duplicating release-plan parsing logic.

- [ ] **Step 3: Verify workflow and release tests**

Run:

```bash
cd development/runtime-prod-release
python -m pytest release/tests/test_release_workflow_contract.py release/tests/test_edge_api_docs_revision.py release/tests/test_release_evidence_schema.py -q
```

Expected:
- the workflow contract proves that evidence collection is part of the release path
- edge docs revision capture is covered by tests before any real prod rollout

- [ ] **Step 4: Commit**

```bash
git -C development/runtime-prod-release add .github/workflows/prod-release.yml release
git -C development/runtime-prod-release commit -m "feat: persist edge docs revision from deployed runtime"
```

## C. Root Workflow Removal And Verification

### Task 6: Delete Root Workflows And Rewrite Active Docs

**Files:**
- Delete:
  - `.github/workflows/central-deploy.yml`
  - `.github/workflows/central-deploy-dispatch.yml`
  - `.github/workflows/refresh-api-docs.yml`
  - `.github/workflows/provision-ec2-app-host.yml`
- Modify:
  - `docs/README.md`
  - `docs/mappings/08-current-msa-api-docs-reading-guide.md`
  - `docs/rollout/README.md`
  - `docs/rollout/2026-04-07-central-deploy-reference.md`
  - `docs/rollout/2026-04-07-central-deploy-cutover-checklist.md`
  - `docs/rollout/2026-04-07-github-repo-setup.md`
  - `docs/runbooks/ev-dashboard-ui-smoke-and-decommission.md`
  - `docs/superpowers/specs/2026-04-09-api-docs-deploy-gate-design.md`

- [ ] **Step 1: Write the failing root-cleanup expectation**

Run this search before editing:

```bash
rg -n "clever-deploy-control|central-deploy|refresh-api-docs.yml|provision-ec2-app-host|/openapi.yaml|/swagger/" docs/README.md docs/mappings docs/rollout docs/runbooks docs/superpowers/specs
```

Expected: active docs still point to root workflows or `clever-deploy-control` as live operational truth.

- [ ] **Step 2: Delete the executable root workflows**

The root must no longer own:
- deploy orchestration
- provisioning
- public API docs refresh

- [ ] **Step 3: Rewrite active docs to the new truth**

The updated docs must state:
- public docs generation and serving belong to `edge-api-gateway`
- `runtime-prod-release` only deploys the edge image and records evidence
- `clever-msa-platform` is docs/policy only
- historical references to `clever-deploy-control` are not current truth

For `docs/mappings/08-current-msa-api-docs-reading-guide.md`, replace the old root refresh model with:
- edge-owned static artifact generation
- edge-owned `/openapi.yaml`
- edge-owned `/swagger/` and `/redoc/`
- runtime release evidence linkage

- [ ] **Step 4: Run root verification**

Run:

```bash
git diff --check
rg --files .github/workflows
rg -n "clever-deploy-control|central-deploy|refresh-api-docs.yml|provision-ec2-app-host" docs/README.md docs/mappings docs/rollout docs/runbooks docs/superpowers/specs
```

Expected:
- `git diff --check` is clean
- `.github/workflows` is empty or contains only non-executable documentation residue that the user explicitly approved
- active docs no longer present root workflows or `clever-deploy-control` as current truth

- [ ] **Step 5: Commit**

```bash
git add .github/workflows docs
git commit -m "docs: remove root deploy and api docs workflow ownership"
```

## Final Acceptance Gate

Do not call this work complete until all of the following are true:

- `development/edge-api-gateway` builds a deterministic public OpenAPI artifact and static docs UI
- the edge parity report is clean except for explicitly allowlisted fallback entries
- `development/runtime-prod-release` records `api_docs_revision` for edge releases with the exact three-field object defined above
- root `.github/workflows/` no longer owns deploy/provision/docs-refresh execution
- active root docs no longer teach `clever-deploy-control` or root workflows as current truth

## Recommended Execution Order

1. Finish Section A completely in `development/edge-api-gateway`
2. Finish Section B completely in `development/runtime-prod-release`
3. Finish Section C in the root repo only after edge parity and release evidence are already in place
