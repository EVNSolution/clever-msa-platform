# ev-dashboard EC2 + EBS Runtime Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current `ev-dashboard` canonical ECS/RDS runtime with a `CDK + ECR + EC2 app host + EC2 data host(EBS)` runtime while keeping immutable image deployment and infra-repo ownership intact.

**Architecture:** Keep `infra-ev-dashboard-platform` as the canonical runtime owner, but swap the runtime target from ECS/Fargate + RDS/ElastiCache to two EC2 hosts: one app host that runs image-backed containers and one data host that runs PostgreSQL and Redis on EBS-backed storage. Public ingress stays `ALB + ACM + Route53`, and release artifacts stay immutable ECR SHA tags. Each implementation batch must update repo-local `lesson.md` and root `lesson.md` when a new failure mode or operator rule is discovered.

**Tech Stack:** AWS CDK (TypeScript), EC2, EBS, ALB, ACM, Route53, ECR, SSM, Docker/Compose or equivalent host-level container runtime, Markdown docs

---

## File Structure

### Infra repo implementation files

- Modify: `development/infra-ev-dashboard-platform/lib/config.ts`
  - Replace ECS/RDS-specific config expectations with EC2 app/data host config, image map, and bootstrap inputs.
- Modify: `development/infra-ev-dashboard-platform/lib/ev-dashboard-platform-stack.ts`
  - Remove ECS/Fargate/RDS/ElastiCache resource graph and compose the new EC2-based topology.
- Create: `development/infra-ev-dashboard-platform/lib/ec2-app-host.ts`
  - Focused construct for the application EC2 host, IAM, security group attachment, and bootstrap contract.
- Create: `development/infra-ev-dashboard-platform/lib/ec2-data-host.ts`
  - Focused construct for the data EC2 host, EBS attachment, PostgreSQL/Redis bootstrap contract, and security boundaries.
- Create: `development/infra-ev-dashboard-platform/lib/ec2-bootstrap.ts`
  - Shared user-data/script rendering helpers for app host and data host bootstrap.
- Modify: `development/infra-ev-dashboard-platform/bin/ev-dashboard-platform.ts`
  - Wire any new config values into the stack entrypoint.
- Modify: `development/infra-ev-dashboard-platform/lib/preflight.ts`
  - Fail if required EC2 host inputs, image SHAs, or host bootstrap contracts are missing.
- Modify: `development/infra-ev-dashboard-platform/lib/postDeploySmoke.ts`
  - Keep edge/public smoke, but adjust expectations away from ECS-specific readiness assumptions.
- Modify: `development/infra-ev-dashboard-platform/README.md`
  - Update canonical runtime ownership and required configuration.
- Modify: `development/infra-ev-dashboard-platform/lesson.md`
  - Record infra/runtime migration lessons as they appear.

### Infra repo tests

- Modify: `development/infra-ev-dashboard-platform/test/config.test.ts`
- Modify: `development/infra-ev-dashboard-platform/test/preflight.test.ts`
- Modify: `development/infra-ev-dashboard-platform/test/postDeploySmoke.test.ts`
- Modify or replace: `development/infra-ev-dashboard-platform/test/ev-dashboard-platform-stack.test.ts`
  - Assert EC2 hosts, EBS, ALB wiring, and the absence of ECS/RDS/ElastiCache resources.
- Create: `development/infra-ev-dashboard-platform/test/ec2-host-bootstrap.test.ts`
  - Validate rendered bootstrap/user-data content and required host-level contracts.

### Canonical truth docs

- Modify: `docs/rollout/2026-04-13-ecs-cdk-oidc-actions-transition.md`
- Modify: `docs/mappings/current-runtime-inventory.md`
- Modify: `docs/runbooks/ev-dashboard-ecs-preflight-gate.md`
- Modify: `docs/runbooks/ev-dashboard-ecs-deploy-operator-loop.md`
- Modify: `lesson.md`
  - Update canonical runtime truth and operator rules after the runtime change is actually proven.

### Optional follow-up docs if naming drift becomes confusing

- Create only if needed: `docs/runbooks/ev-dashboard-ec2-runtime-gate.md`
- Create only if needed: `docs/runbooks/ev-dashboard-ec2-deploy-operator-loop.md`

---

### Task 1: Lock new config and test boundaries

**Files:**
- Modify: `development/infra-ev-dashboard-platform/lib/config.ts`
- Test: `development/infra-ev-dashboard-platform/test/config.test.ts`
- Test: `development/infra-ev-dashboard-platform/test/preflight.test.ts`

- [x] **Step 1: Write the failing config tests**

Add tests that express the new required inputs, for example:

```ts
it('requires app and data host subnet/instance config for ec2 runtime mode', () => {
  expect(() =>
    buildPlatformConfigFromEnv({
      ...minimalEnv,
      RUNTIME_MODE: 'ec2',
      APP_HOST_SUBNET_ID: '',
      DATA_HOST_SUBNET_ID: '',
    } as NodeJS.ProcessEnv)
  ).toThrow(/APP_HOST_SUBNET_ID|DATA_HOST_SUBNET_ID/);
});
```

- [x] **Step 2: Run the tests and confirm failure**

Run:

```bash
cd development/infra-ev-dashboard-platform
npm test -- --runInBand --runTestsByPath test/config.test.ts test/preflight.test.ts
```

Expected: failures that prove the EC2 runtime config is not implemented yet.

- [x] **Step 3: Implement the minimal config surface**

Add `RUNTIME_MODE=ec2` and the smallest required host/data inputs to `lib/config.ts`. Keep image URIs immutable and keep app/data host config separate.

- [x] **Step 4: Re-run the targeted tests**

Run:

```bash
cd development/infra-ev-dashboard-platform
npm test -- --runInBand --runTestsByPath test/config.test.ts test/preflight.test.ts
```

Expected: PASS

- [x] **Step 5: Commit**

```bash
git -C development/infra-ev-dashboard-platform add lib/config.ts test/config.test.ts test/preflight.test.ts
git -C development/infra-ev-dashboard-platform commit -m "feat: add ec2 runtime config contract"
```

### Task 2: Build focused EC2 host constructs

**Files:**
- Create: `development/infra-ev-dashboard-platform/lib/ec2-app-host.ts`
- Create: `development/infra-ev-dashboard-platform/lib/ec2-data-host.ts`
- Create: `development/infra-ev-dashboard-platform/lib/ec2-bootstrap.ts`
- Test: `development/infra-ev-dashboard-platform/test/ec2-host-bootstrap.test.ts`

- [x] **Step 1: Write failing bootstrap tests**

Add tests for rendered user-data / bootstrap fragments, for example:

```ts
it('renders app host bootstrap with ECR image map inputs', () => {
  const script = renderAppHostBootstrap({
    region: 'ap-northeast-2',
    imageMapSsmParam: '/ev-dashboard/runtime/images',
  });
  expect(script).toContain('docker');
  expect(script).toContain('/ev-dashboard/runtime/images');
});
```

- [x] **Step 2: Run the bootstrap tests and confirm failure**

Run:

```bash
cd development/infra-ev-dashboard-platform
npm test -- --runInBand --runTestsByPath test/ec2-host-bootstrap.test.ts
```

Expected: FAIL because the helper/construct files do not exist yet.

- [x] **Step 3: Implement focused host helper files**

Create the helper files so that:
- `ec2-app-host.ts` owns the app EC2 instance, IAM/profile attachment, SGs, and bootstrap call
- `ec2-data-host.ts` owns the data EC2 instance, EBS volume, SGs, and bootstrap call
- `ec2-bootstrap.ts` renders the bootstrap/user-data text only

- [x] **Step 4: Re-run the bootstrap tests**

Run:

```bash
cd development/infra-ev-dashboard-platform
npm test -- --runInBand --runTestsByPath test/ec2-host-bootstrap.test.ts
```

Expected: PASS

- [x] **Step 5: Commit**

```bash
git -C development/infra-ev-dashboard-platform add lib/ec2-app-host.ts lib/ec2-data-host.ts lib/ec2-bootstrap.ts test/ec2-host-bootstrap.test.ts
git -C development/infra-ev-dashboard-platform commit -m "feat: add ec2 host constructs"
```

### Task 3: Replace the stack topology and prove it in tests

**Files:**
- Modify: `development/infra-ev-dashboard-platform/lib/ev-dashboard-platform-stack.ts`
- Modify: `development/infra-ev-dashboard-platform/bin/ev-dashboard-platform.ts`
- Test: `development/infra-ev-dashboard-platform/test/ev-dashboard-platform-stack.test.ts`

- [x] **Step 1: Write the failing stack assertions**

Change the stack tests so they assert the target topology instead of the current ECS/RDS one, for example:

```ts
template.resourceCountIs('AWS::EC2::Instance', 2);
template.resourceCountIs('AWS::ECS::Service', 0);
template.resourceCountIs('AWS::RDS::DBInstance', 0);
template.resourceCountIs('AWS::EC2::Volume', 1);
```

- [x] **Step 2: Run the stack tests and confirm failure**

Run:

```bash
cd development/infra-ev-dashboard-platform
npm test -- --runInBand --runTestsByPath test/ev-dashboard-platform-stack.test.ts
```

Expected: FAIL because the current stack still synthesizes ECS/RDS resources.

- [x] **Step 3: Implement the new topology**

Refactor `lib/ev-dashboard-platform-stack.ts` so it:
- keeps ALB/ACM/Route53
- creates app/data EC2 hosts through the new helper constructs
- provisions EBS for the data host
- removes ECS, RDS, ElastiCache, and Service Connect runtime resources from canonical mode

- [x] **Step 4: Run the stack tests again**

Run:

```bash
cd development/infra-ev-dashboard-platform
npm test -- --runInBand --runTestsByPath test/ev-dashboard-platform-stack.test.ts
```

Expected: PASS

- [x] **Step 5: Commit**

```bash
git -C development/infra-ev-dashboard-platform add lib/ev-dashboard-platform-stack.ts bin/ev-dashboard-platform.ts test/ev-dashboard-platform-stack.test.ts
git -C development/infra-ev-dashboard-platform commit -m "feat: replace ev-dashboard runtime topology with ec2 hosts"
```

### Task 4: Rework deploy gates and smoke for EC2 runtime

**Files:**
- Modify: `development/infra-ev-dashboard-platform/lib/preflight.ts`
- Modify: `development/infra-ev-dashboard-platform/lib/postDeploySmoke.ts`
- Modify: `development/infra-ev-dashboard-platform/test/preflight.test.ts`
- Modify: `development/infra-ev-dashboard-platform/test/postDeploySmoke.test.ts`

- [x] **Step 1: Add failing gate/smoke cases**

Add tests for the new rules, for example:
- missing EC2 host bootstrap inputs fails preflight
- post-deploy smoke still expects public `200/302/401` but no ECS-specific assumptions remain

- [x] **Step 2: Run the targeted tests and confirm failure**

Run:

```bash
cd development/infra-ev-dashboard-platform
npm test -- --runInBand --runTestsByPath test/preflight.test.ts test/postDeploySmoke.test.ts
```

Expected: FAIL

- [x] **Step 3: Implement the EC2-aware preflight and smoke rules**

Make the gate validate host/runtime inputs and keep the public edge smoke as the release truth.

- [x] **Step 4: Re-run the targeted tests**

Run:

```bash
cd development/infra-ev-dashboard-platform
npm test -- --runInBand --runTestsByPath test/preflight.test.ts test/postDeploySmoke.test.ts
```

Expected: PASS

- [x] **Step 5: Commit**

```bash
git -C development/infra-ev-dashboard-platform add lib/preflight.ts lib/postDeploySmoke.ts test/preflight.test.ts test/postDeploySmoke.test.ts
git -C development/infra-ev-dashboard-platform commit -m "feat: adapt deploy gates for ec2 runtime"
```

### Task 5: Update docs and lesson after the runtime proof

**Files:**
- Modify: `development/infra-ev-dashboard-platform/README.md`
- Modify: `development/infra-ev-dashboard-platform/lesson.md`
- Modify: `docs/rollout/2026-04-13-ecs-cdk-oidc-actions-transition.md`
- Modify: `docs/mappings/current-runtime-inventory.md`
- Modify: `docs/runbooks/ev-dashboard-ecs-preflight-gate.md`
- Modify: `docs/runbooks/ev-dashboard-ecs-deploy-operator-loop.md`
- Modify: `lesson.md`

- [ ] **Step 1: Write the runtime-proof checklist into the docs**

Update the infra README and canonical truth docs only after the EC2 runtime is actually proven by tests/synth and a successful deploy rehearsal.

- [ ] **Step 2: Add lessons from the first EC2 cutover attempt**

Record:
- host bootstrap mistakes
- EBS/data-host caveats
- image-pull or IAM drift
- post-deploy operator wait signals

- [ ] **Step 3: Run whole-repo verification**

Run:

```bash
cd development/infra-ev-dashboard-platform
npm test -- --runInBand
npx cdk synth
```

Run:

```bash
git diff --check
```

Expected: all tests pass, synth succeeds, no diff-check errors.

- [ ] **Step 4: Commit**

```bash
git -C development/infra-ev-dashboard-platform add README.md lesson.md
git -C . add docs/rollout/2026-04-13-ecs-cdk-oidc-actions-transition.md docs/mappings/current-runtime-inventory.md docs/runbooks/ev-dashboard-ecs-preflight-gate.md docs/runbooks/ev-dashboard-ecs-deploy-operator-loop.md lesson.md
git -C . commit -m "docs: record ev-dashboard ec2 runtime cutover"
```

### Task 6: Deploy rehearsal and production cutover

**Files:**
- Modify as needed: `development/infra-ev-dashboard-platform/README.md`
- Modify as needed: `development/infra-ev-dashboard-platform/lesson.md`
- Modify as needed: `lesson.md`

- [ ] **Step 1: Run the mandatory deploy gate**

Run:

```bash
cd development/infra-ev-dashboard-platform
npm run preflight
npm test -- --runInBand
npx cdk synth
```

Expected: PASS

- [ ] **Step 2: Deploy a rehearsal lane and verify the public contract**

Run the infra deploy with the target image SHAs and confirm:
- front shell `200`
- auth/docs/admin public checks pass
- protected API edges return expected `401`

- [ ] **Step 3: Promote the same SHA set to prod**

Use the same image SHA set for production release. Do not rebuild images between rehearsal and prod.

- [ ] **Step 4: Capture lessons immediately**

Update repo-local and root lessons with operator wait patterns, host bootstrap drift, and backup/restore caveats as soon as the cutover result is known.

- [ ] **Step 5: Commit**

```bash
git -C development/infra-ev-dashboard-platform add lesson.md README.md
git -C . add lesson.md
git -C . commit -m "docs: capture ec2 runtime deployment lessons"
```
