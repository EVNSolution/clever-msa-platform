# ev-dashboard Manifest Wave Partial Deploy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an explicit `release_manifest_path` driven warm-host partial deploy path so `ev-dashboard` can keep a minimal base stack alive and roll changed services in fixed waves without guessing image targets.

**Architecture:** Keep `infra-ev-dashboard-platform` as the deploy entrypoint, but split the current flow into base stack bring-up, service-image publish, and manifest-driven wave deploy. The workflow will read a manifest file from the repo, validate the exact service/image targets, merge only those overrides into the current runtime image map, and reconcile only the changed services in backend-first waves before final public smoke.

**Tech Stack:** TypeScript, Python bootstrap helpers, AWS CDK, GitHub Actions, AWS ECR, SSM Parameter Store, Secrets Manager, Markdown docs.

---

## File Structure

### Infra repo runtime and workflow files

- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/lib/releaseManifest.ts`
  - Parse and validate the explicit release manifest file.
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/lib/releaseWavePolicy.ts`
  - Own the fixed service-to-wave mapping and ordered rollout list.
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/bin/previewReleaseManifest.ts`
  - CLI entrypoint that shows which services/waves a manifest will touch before deploy.
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/lib/config.ts`
  - Add manifest-path aware config and a new incremental warm-host run path without disturbing the current base-stack flow.
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/lib/preflight.ts`
  - Fail fast on manifest, ECR tag, architecture, host-readiness, and wave-dependency problems.
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/lib/postDeploySmoke.ts`
  - Support wave-level minimal smoke plus final public smoke.
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/bootstrap/ev_dashboard_runtime/app_host.py`
  - Replace full-fleet reconcile assumptions with manifest-scoped partial reconcile.
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/bin/reconcileWave.ts`
  - Trigger one wave at a time against the warm app host.
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/.github/workflows/deploy-ecs.yml`
  - Accept `release_manifest_path` and orchestrate preview -> preflight -> deploy -> wave reconcile -> smoke.
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/README.md`
  - Document the new operating model.
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/lesson.md`
  - Record new deploy guard lessons.

### Infra repo tests

- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/test/releaseManifest.test.ts`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/test/releaseWavePolicy.test.ts`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/test/config.test.ts`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/test/preflight.test.ts`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/test/postDeploySmoke.test.ts`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/test/reconcileWave.test.ts`

### Example manifest and operator docs

- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/release-manifests/.gitkeep`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/release-manifests/examples/core-entry-sample.json`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/runbooks/ev-dashboard-ecs-preflight-gate.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/runbooks/ev-dashboard-ecs-deploy-operator-loop.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/lesson.md`

---

### Task 1: Add explicit release manifest parsing and validation

**Files:**
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/lib/releaseManifest.ts`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/bin/previewReleaseManifest.ts`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/test/releaseManifest.test.ts`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/release-manifests/.gitkeep`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/release-manifests/examples/core-entry-sample.json`

- [ ] **Step 1: Write failing tests for manifest parsing.**
  - Cover missing file, invalid JSON, duplicate service keys, unknown service names, and mutable tags.

- [ ] **Step 2: Run the new manifest test file and confirm failure.**

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform
npm test -- --runInBand --runTestsByPath test/releaseManifest.test.ts
```

- [ ] **Step 3: Implement `releaseManifest.ts`.**
  - Read manifest from a repo-relative path.
  - Enforce exact `image_uri` presence per changed service.
  - Reject unknown services and mutable tags.
  - Return a normalized list ordered only by service name at this layer.

- [ ] **Step 4: Implement `previewReleaseManifest.ts`.**
  - Print `release_id`, service count, and the normalized service list.
  - Keep it read-only; no deploy side effects.

- [ ] **Step 5: Add example manifest files and rerun tests.**

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform
npm test -- --runInBand --runTestsByPath test/releaseManifest.test.ts
```

- [ ] **Step 6: Commit.**

```bash
git -C /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform add \
  lib/releaseManifest.ts \
  bin/previewReleaseManifest.ts \
  test/releaseManifest.test.ts \
  release-manifests/.gitkeep \
  release-manifests/examples/core-entry-sample.json
git -C /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform commit -m "feat: add explicit release manifest contract"
```

### Task 2: Add fixed wave policy for backend-first incremental rollout

**Files:**
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/lib/releaseWavePolicy.ts`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/test/releaseWavePolicy.test.ts`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/bin/previewReleaseManifest.ts`

- [ ] **Step 1: Write failing tests for wave ordering.**
  - Cover backend-before-gateway-before-front ordering.
  - Cover mixed manifests where only the touched services are emitted.

- [ ] **Step 2: Run the wave-policy test file and confirm failure.**

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform
npm test -- --runInBand --runTestsByPath test/releaseWavePolicy.test.ts
```

- [ ] **Step 3: Implement `releaseWavePolicy.ts`.**
  - Encode the fixed service-to-wave mapping from the approved design.
  - Expose a helper that converts a changed-service list into ordered waves.

- [ ] **Step 4: Update preview output to show wave grouping.**
  - The preview command should show the exact wave execution order for operator review.

- [ ] **Step 5: Rerun the wave tests.**

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform
npm test -- --runInBand --runTestsByPath test/releaseWavePolicy.test.ts test/releaseManifest.test.ts
```

- [ ] **Step 6: Commit.**

```bash
git -C /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform add \
  lib/releaseWavePolicy.ts \
  test/releaseWavePolicy.test.ts \
  bin/previewReleaseManifest.ts
git -C /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform commit -m "feat: add fixed release wave policy"
```

### Task 3: Extend config and preflight for manifest-driven warm-host deploys

**Files:**
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/lib/config.ts`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/lib/preflight.ts`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/test/config.test.ts`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/test/preflight.test.ts`

- [ ] **Step 1: Add failing config/preflight tests for the new path.**
  - Missing `RELEASE_MANIFEST_PATH`
  - Warm-host deploy without an existing host
  - Manifest with arm64 image on x86 app host
  - Gateway/front manifest entries without required backend readiness

- [ ] **Step 2: Run the targeted tests and confirm failure.**

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform
npm test -- --runInBand --runTestsByPath test/config.test.ts test/preflight.test.ts
```

- [ ] **Step 3: Implement config support.**
  - Add `RELEASE_MANIFEST_PATH`.
  - Add an incremental warm-host deploy mode that is distinct from empty-host full verification.
  - Keep current `full` and `bootstrap-proof` behavior intact for existing proof paths.

- [ ] **Step 4: Implement preflight support.**
  - Validate manifest existence and parseability.
  - Validate ECR tag existence only for manifest services.
  - Validate host readiness and architecture compatibility.
  - Reject hidden full-fleet churn during incremental deploy.

- [ ] **Step 5: Rerun targeted tests.**

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform
npm test -- --runInBand --runTestsByPath test/config.test.ts test/preflight.test.ts test/releaseManifest.test.ts test/releaseWavePolicy.test.ts
```

- [ ] **Step 6: Commit.**

```bash
git -C /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform add \
  lib/config.ts \
  lib/preflight.ts \
  test/config.test.ts \
  test/preflight.test.ts
git -C /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform commit -m "feat: gate manifest-driven warm deploys"
```

### Task 4: Replace full reconcile with wave-scoped partial reconcile on the app host

**Files:**
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/bootstrap/ev_dashboard_runtime/app_host.py`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/bin/reconcileWave.ts`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/test/reconcileWave.test.ts`

- [ ] **Step 1: Write failing tests for wave-scoped reconcile.**
  - Verify that only manifest-listed services are restarted.
  - Verify that untouched services keep their current runtime image map entries.

- [ ] **Step 2: Run the new reconcile tests and confirm failure.**

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform
npm test -- --runInBand --runTestsByPath test/reconcileWave.test.ts
```

- [ ] **Step 3: Refactor `app_host.py`.**
  - Merge manifest overrides into the current runtime image map.
  - Pull/restart only changed services for the current wave.
  - Preserve current containers for untouched services.
  - Keep gateway/front churn out of backend-only waves.

- [ ] **Step 4: Implement `reconcileWave.ts`.**
  - Invoke the host-side reconcile entrypoint per wave.
  - Keep it explicit and idempotent for reruns.

- [ ] **Step 5: Rerun the reconcile tests.**

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform
npm test -- --runInBand --runTestsByPath test/reconcileWave.test.ts
```

- [ ] **Step 6: Commit.**

```bash
git -C /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform add \
  bootstrap/ev_dashboard_runtime/app_host.py \
  bin/reconcileWave.ts \
  test/reconcileWave.test.ts
git -C /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform commit -m "feat: add wave-scoped partial reconcile"
```

### Task 5: Add wave-level smoke and final public smoke

**Files:**
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/lib/postDeploySmoke.ts`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/test/postDeploySmoke.test.ts`

- [ ] **Step 1: Write failing tests for wave-level smoke selection.**
  - Backend-only wave should not require front shell smoke.
  - Gateway wave should include gateway/API smoke.
  - Front wave should include apex shell smoke.

- [ ] **Step 2: Run the smoke tests and confirm failure.**

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform
npm test -- --runInBand --runTestsByPath test/postDeploySmoke.test.ts
```

- [ ] **Step 3: Implement wave-aware smoke helpers.**
  - Support minimal smoke after each wave.
  - Keep final public smoke after the last wave.
  - Avoid using full-route expectations during backend-only waves.

- [ ] **Step 4: Rerun the smoke tests.**

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform
npm test -- --runInBand --runTestsByPath test/postDeploySmoke.test.ts
```

- [ ] **Step 5: Commit.**

```bash
git -C /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform add \
  lib/postDeploySmoke.ts \
  test/postDeploySmoke.test.ts
git -C /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform commit -m "feat: add wave-level smoke gates"
```

### Task 6: Update the deploy workflow to orchestrate preview, preflight, waves, and smoke

**Files:**
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/.github/workflows/deploy-ecs.yml`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/README.md`

- [ ] **Step 1: Add workflow inputs for `release_manifest_path`.**
  - Keep existing environment selection.
  - Keep current proof paths intact.

- [ ] **Step 2: Add preview and manifest preflight steps.**
  - Run preview before deploy.
  - Fail fast before `cdk deploy` if the manifest is invalid.

- [ ] **Step 3: Add wave execution steps.**
  - Deploy stack only when needed.
  - Run wave reconcile one wave at a time.
  - Run wave smoke between waves.
  - Run final public smoke after the last wave.

- [ ] **Step 4: Update operator summary and README.**
  - Explain base-stack bring-up vs warm-host partial deploy vs exceptional full verification.

- [ ] **Step 5: Run the workflow-related test suite and repo build.**

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform
npm test -- --runInBand
npm run build
```

- [ ] **Step 6: Commit.**

```bash
git -C /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform add \
  .github/workflows/deploy-ecs.yml \
  README.md
git -C /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform commit -m "feat: orchestrate manifest wave deploy workflow"
```

### Task 7: Update runbooks and lessons so operators stop treating full proof as the default deploy path

**Files:**
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/runbooks/ev-dashboard-ecs-preflight-gate.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/runbooks/ev-dashboard-ecs-deploy-operator-loop.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/lesson.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/lesson.md`

- [ ] **Step 1: Rewrite operator flow docs.**
  - Base stack bring-up
  - Service-image publish
  - Manifest preview
  - Warm-host wave deploy
  - Exceptional full-service verification

- [ ] **Step 2: Record the failure classes this design is meant to prevent.**
  - blind full-fleet rerun
  - guessed image targets
  - gateway/front churn before backend readiness
  - mutable image tags
  - hidden architecture mismatches

- [ ] **Step 3: Run consistency checks for touched docs and tests.**

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform
git diff --check
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform
npm test -- --runInBand
```

- [ ] **Step 4: Commit.**

```bash
git -C /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform add \
  docs/runbooks/ev-dashboard-ecs-preflight-gate.md \
  docs/runbooks/ev-dashboard-ecs-deploy-operator-loop.md \
  lesson.md
git -C /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform commit -m "docs: codify manifest wave deploy operator path"
git -C /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform add lesson.md
git -C /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform commit -m "docs: record manifest wave deploy lessons"
```
