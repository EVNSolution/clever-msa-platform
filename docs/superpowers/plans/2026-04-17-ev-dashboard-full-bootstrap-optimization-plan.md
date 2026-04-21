# ev-dashboard Full Bootstrap Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce `RUN_PROFILE=full` deploy time by shrinking the app-host replacement surface without changing current deploy semantics.

**Architecture:** Keep the existing `full`, `incremental-expand`, and `warm-host-partial` contracts intact. Refactor the stack so app-host replacement is driven only by the actual bootstrap-bound runtime payload for enabled services, not by broad metadata such as `runProfile` or disabled-service image churn.

**Tech Stack:** TypeScript, AWS CDK, Jest, GitHub Actions, EC2 host bootstrap.

---

## File Structure

### Replacement-surface logic

- Modify: `development/infra-ev-dashboard-platform/lib/ev-dashboard-platform-stack.ts`
  - Extract the app-host replacement payload and runtime fingerprint inputs.
- Modify: `development/infra-ev-dashboard-platform/lib/serviceCatalog.ts`
  - Only if the extracted helper needs catalog-backed bootstrap metadata lookups.

### Deploy/smoke path guards

- Modify: `development/infra-ev-dashboard-platform/lib/postDeploySmoke.ts`
  - Only if tests show the current smoke loop needs explicit grouping or reporting cleanup after the fingerprint refactor.
- Modify: `development/infra-ev-dashboard-platform/.github/workflows/deploy-ecs.yml`
  - Only if the operator summary needs a clarified note about replacement/no-replacement outcomes.

### Tests

- Modify: `development/infra-ev-dashboard-platform/test/ev-dashboard-platform-stack.test.ts`
- Modify: `development/infra-ev-dashboard-platform/test/ec2-host-bootstrap.test.ts`
- Modify: `development/infra-ev-dashboard-platform/test/deploy-workflow-profiles.test.ts`
- Modify: `development/infra-ev-dashboard-platform/test/postDeploySmoke.test.ts`

### Docs

- Create: `docs/superpowers/specs/2026-04-17-ev-dashboard-full-bootstrap-optimization-design.md`
- Create: `docs/superpowers/plans/2026-04-17-ev-dashboard-full-bootstrap-optimization-plan.md`
- Modify: `development/infra-ev-dashboard-platform/README.md`
- Modify: `development/infra-ev-dashboard-platform/lesson.md`

---

### Task 1: Lock the replacement contract with failing tests

**Files:**
- Modify: `development/infra-ev-dashboard-platform/test/ev-dashboard-platform-stack.test.ts`
- Modify: `development/infra-ev-dashboard-platform/test/ec2-host-bootstrap.test.ts`

- [ ] **Step 1: Add a failing stack test that proves `runProfile` alone must not alter the app-host replacement payload**

Example assertion shape:

```ts
expect(buildAppRuntimeReplacementPayload(configFor('full'))).toEqual(
  buildAppRuntimeReplacementPayload(configFor('incremental-expand'))
);
```

- [ ] **Step 2: Add a failing stack test that proves disabled-service image changes must not alter the replacement payload**

Example:

```ts
const base = buildAppRuntimeReplacementPayload(configWithDisabledTelemetryListener('sha256:a'));
const changed = buildAppRuntimeReplacementPayload(configWithDisabledTelemetryListener('sha256:b'));
expect(changed).toEqual(base);
```

- [ ] **Step 3: Add a failing stack test that proves enabled-service image changes still alter the replacement payload**

- [ ] **Step 4: Add a failing stack test that proves enabled-service runtime spec changes still alter the replacement payload**

Example:

```ts
const base = buildAppRuntimeReplacementPayload(configWithEnabledDispatchRegistryPort(8000));
const changed = buildAppRuntimeReplacementPayload(configWithEnabledDispatchRegistryPort(9000));
expect(changed).not.toEqual(base);
```

- [ ] **Step 5: Add a failing stack test that proves bootstrap package identity changes still alter the replacement payload**

- [ ] **Step 6: Run the targeted tests and verify RED**

Run:

```bash
cd development/infra-ev-dashboard-platform
npm test -- --runInBand --runTestsByPath test/ev-dashboard-platform-stack.test.ts test/ec2-host-bootstrap.test.ts
```

Expected:
- fail because the current fingerprint still includes broad inputs

- [ ] **Step 7: Commit**

```bash
git -C development/infra-ev-dashboard-platform add \
  test/ev-dashboard-platform-stack.test.ts \
  test/ec2-host-bootstrap.test.ts
git -C development/infra-ev-dashboard-platform commit -m "test: lock app host replacement contract"
```

### Task 2: Extract and narrow the app-host replacement payload

**Files:**
- Modify: `development/infra-ev-dashboard-platform/lib/ev-dashboard-platform-stack.ts`
- Modify: `development/infra-ev-dashboard-platform/test/ev-dashboard-platform-stack.test.ts`

- [ ] **Step 1: Extract a dedicated helper for the app-host replacement payload**

The helper should build the exact payload hashed into `appRuntimeFingerprint`.

The payload must be limited to:
- enabled runtime service set
- enabled-service image identity
- enabled-service host-visible runtime spec
- bootstrap package identity

Normalization rules:
- sort services deterministically
- sort environment keys deterministically
- exclude `undefined` fields from the serialized payload
- only include enabled materialized services

- [ ] **Step 2: Remove `runProfile` from the replacement payload**

- [ ] **Step 3: Restrict the image/fingerprint inputs to enabled materialized services**

- [ ] **Step 4: Ensure enabled-service runtime spec changes and bootstrap package identity changes still alter the payload**

Guard:
- do not change gateway/front ordering
- do not change service manifest meaning
- do not alter public smoke semantics

- [ ] **Step 5: Run the targeted tests and verify GREEN**

Run:

```bash
cd development/infra-ev-dashboard-platform
npm test -- --runInBand --runTestsByPath test/ev-dashboard-platform-stack.test.ts test/ec2-host-bootstrap.test.ts
```

- [ ] **Step 6: Commit**

```bash
git -C development/infra-ev-dashboard-platform add \
  lib/ev-dashboard-platform-stack.ts \
  test/ev-dashboard-platform-stack.test.ts \
  test/ec2-host-bootstrap.test.ts
git -C development/infra-ev-dashboard-platform commit -m "refactor: narrow app host replacement surface"
```

### Task 3: Keep deploy-path behavior explicit after the fingerprint refactor

**Files:**
- Modify: `development/infra-ev-dashboard-platform/test/deploy-workflow-profiles.test.ts`
- Modify: `development/infra-ev-dashboard-platform/test/postDeploySmoke.test.ts`
- Modify only if a regression test proves it is necessary:
  - `development/infra-ev-dashboard-platform/lib/postDeploySmoke.ts`
  - `development/infra-ev-dashboard-platform/.github/workflows/deploy-ecs.yml`

- [ ] **Step 1: Add or update tests that prove `full`/`warm-host-partial` semantics remain unchanged**

Focus:
- `full` still runs preflight -> unit tests -> synth -> deploy -> smoke
- `warm-host-partial` still runs preview -> preflight -> wave reconcile -> smoke

- [ ] **Step 2: Add or update smoke tests only if the fingerprint refactor changes operator-facing reporting**

Guard:
- do not reduce the meaning of a green `full`
- do not introduce gateway/front/runtime-contract changes in this patch
- prefer test-only normalization; `postDeploySmoke.ts` and `deploy-ecs.yml` stay untouched unless a failing regression proves a minimal reporting/documentation fix is required

- [ ] **Step 3: Run the deploy-path regression suite**

Run:

```bash
cd development/infra-ev-dashboard-platform
npm test -- --runInBand --runTestsByPath \
  test/deploy-workflow-profiles.test.ts \
  test/postDeploySmoke.test.ts \
  test/preflight.test.ts \
  test/warmHostPartial.test.ts \
  test/ev-dashboard-platform-stack.test.ts \
  test/ec2-host-bootstrap.test.ts
```

- [ ] **Step 4: Commit**

```bash
git -C development/infra-ev-dashboard-platform add \
  test/deploy-workflow-profiles.test.ts \
  test/postDeploySmoke.test.ts \
  test/preflight.test.ts \
  test/warmHostPartial.test.ts \
  test/ev-dashboard-platform-stack.test.ts \
  test/ec2-host-bootstrap.test.ts
git -C development/infra-ev-dashboard-platform commit -m "test: preserve deploy profile semantics after bootstrap optimization"
```

### Task 4: Update docs and record the next plan boundary

**Files:**
- Modify: `development/infra-ev-dashboard-platform/README.md`
- Modify: `development/infra-ev-dashboard-platform/lesson.md`
- Modify: `lesson.md`

- [ ] **Step 1: Record the new replacement-surface rule in README**

Must say:
- current plan is bootstrap-time optimization
- next plan is stack secret/metadata simplification

- [ ] **Step 2: Record the lesson that event count and bootstrap cost are different problems**

- [ ] **Step 3: Run the broad regression suite and build**

Run:

```bash
cd development/infra-ev-dashboard-platform
npm test -- --runInBand
npm run build
```

- [ ] **Step 4: Commit**

```bash
git -C development/infra-ev-dashboard-platform add \
  README.md \
  lesson.md
git -C . add \
  lesson.md \
  docs/superpowers/specs/2026-04-17-ev-dashboard-full-bootstrap-optimization-design.md \
  docs/superpowers/plans/2026-04-17-ev-dashboard-full-bootstrap-optimization-plan.md
git -C development/infra-ev-dashboard-platform commit -m "docs: capture full bootstrap optimization lessons"
git -C . commit -m "docs: add full bootstrap optimization design and plan"
```

### Task 5: Run the real deploy regression before calling the phase done

**Files:**
- Modify: none
- Test: live deploy lanes only

- [ ] **Step 1: Push the child repo branch or mainline changes so GitHub Actions uses the updated preflight and stack code**

- [ ] **Step 2: Run `warm-host-partial` live regression on the current operating lane**

- [ ] **Step 3: Run a no-op `full` rerun and verify app-host replacement does not happen**

- [ ] **Step 4: Run `full` with an enabled image or runtime-spec change and verify app-host replacement does happen**

- [ ] **Step 5: Capture whether app-host replacement happened and record why**

Evidence to keep:
- stack events around `AppHost`
- host instance id before/after
- public smoke result

- [ ] **Step 6: Commit the final lesson/document updates if the live evidence changed the record**

```bash
git -C development/infra-ev-dashboard-platform add README.md lesson.md
git -C . add lesson.md
git -C development/infra-ev-dashboard-platform commit -m "docs: record bootstrap optimization proof"
git -C . commit -m "docs: record bootstrap optimization proof"
```

## Next Plan Boundary

This plan intentionally stops before stack-wide secret and metadata simplification.

The next plan must cover:
- `SecretsManager::Secret` consolidation candidates
- runtime image-map and secret-map diff surface reduction
- stack resource/event surface simplification

Do not combine that next phase with this one.
