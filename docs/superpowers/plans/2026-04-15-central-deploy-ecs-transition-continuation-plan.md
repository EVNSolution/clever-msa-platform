# Central Deploy ECS Transition Continuation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the current image-backed EC2 central deploy lane available as a temporary bridge, then move the next canonical public surface from `clever-deploy-control` EC2/SSM delivery to a dedicated `GitHub Actions + OIDC + ECR + CDK + ECS/Fargate` lane without losing release discipline.

**Architecture:** Treat the current `clever-deploy-control -> SSM -> EC2 app-host -> docker compose` path as the temporary bridge for non-ECS services. Reuse the proven `ev-dashboard` pattern for the next public surface: build immutable images once, prove the same SHA on a short-lived pre-prod ECS lane, then release the same SHA to prod. Do not add a mixed-runtime ECS adapter to `clever-deploy-control` until the second surface has succeeded on its own dedicated infra repo.

**Tech Stack:** GitHub Actions, GitHub OIDC, Amazon ECR, AWS CDK (TypeScript), ECS/Fargate, ALB, ACM, Route53, EC2/SSM/docker compose, root rollout docs, `clever-deploy-control`, `integration-local-stack`.

---

## Current Execution Order

This plan is **not** executed top-to-bottom in raw task-number order.

The current operator decision is:

1. execute the **next ECS structure transition first**
2. keep the pending `stage` EC2 release as a **deferred bridge-lane release**
3. return to that deferred `stage` release only after the next public surface has a clear ECS path

For the current work cycle, follow this order:

- `Task 2`
- `Task 3`
- `Task 4`
- `Task 5`
- `Task 1`
- `Task 6`

## Scope Split

This continuation plan intentionally separates two tracks:

1. **Temporary bridge operations**
   - Current image-backed EC2 central deploy for `stage` / `prod`
   - Needed so current releases are not blocked while ECS rollout continues
2. **Next ECS migration**
   - The next canonical public surface after `ev-dashboard`
   - Uses a dedicated `infra-*` repo and the existing preflight / smoke / pre-prod lane rules

The immediate blocker around a missing `stage` app-host is **not** proof that the design is wrong. It is a temporary runtime readiness issue inside the bridge lane.

### Task 1: Close the deferred current stage release on the temporary bridge lane

**Files:**
- Read: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/clever-deploy-control/docs/runbooks/central-deploy-reference.md`
- Read: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/clever-deploy-control/docs/runbooks/ec2-app-host-bootstrap.md`
- Read: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/clever-deploy-control/docs/runbooks/image-deploy-pilot.md`
- Read/Modify if drift is found: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/clever-deploy-control/catalog/services.yaml`
- Read/Modify if workflow inputs drift: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/clever-deploy-control/.github/workflows/provision-ec2-app-host.yml`

- [ ] **Step 1: Reconfirm that the current `stage` release is supposed to stay on the bridge lane**

Check that the target service still resolves to `runtime: ec2` in `catalog/services.yaml`.

Expected:
- `front-web-console` still deploys through `clever-deploy-control`
- the current work is an image-backed EC2 release, not an ECS release

- [ ] **Step 2: Verify the selector failure directly**

Run:

```bash
aws ec2 describe-instances \
  --filters \
    Name=tag:CleverProject,Values=clever-msa \
    Name=tag:CleverEnvironment,Values=stage \
    Name=tag:CleverRole,Values=app-host \
    Name=instance-state-name,Values=running \
  --query 'Reservations[].Instances[].InstanceId' \
  --output json
```

Run:

```bash
aws ssm describe-instance-information \
  --filters \
    Key=tag:CleverProject,Values=clever-msa \
    Key=tag:CleverEnvironment,Values=stage \
    Key=tag:CleverRole,Values=app-host \
  --query 'InstanceInformationList[].InstanceId' \
  --output json
```

Expected:
- empty arrays if the host is genuinely missing

- [ ] **Step 3: Provision or repair the `stage` app-host**

Preferred path:
- run `Provision EC2 App Host` in `clever-deploy-control`
- set `environment=stage`
- provide subnet, security group, instance profile, repo URL, compose repo, and GitHub read-token parameter

Alternative path:
- repair an existing instance so it is `running`
- add or fix tags
- ensure SSM is `Online`

Expected:
- one `stage` app-host satisfies the selector

- [ ] **Step 4: Re-run the real `stage` central deploy**

Run the central deploy workflow with:
- `environment=stage`
- `targets=front-web-console`
- `dry_run=false`

Expected:
- image-backed EC2 rollout completes
- evidence is recorded as a deferred bridge-lane success, not an ECS milestone

- [ ] **Step 5: Record the bridge-lane completion**

Modify the relevant runbook only if the operator steps drifted.

Run:

```bash
git diff --check
```

Expected:
- no formatting errors

### Task 2: Lock the next canonical ECS target and repo boundary in docs

**Files:**
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/superpowers/specs/2026-04-15-hub-ecs-transition-design.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/rollout/2026-04-13-ecs-cdk-oidc-actions-transition.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/mappings/current-runtime-inventory.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/WORKSPACE.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/repo-map.md`

- [ ] **Step 1: Write the next-surface design spec**

The spec must lock:
- the next canonical public surface, expected to be `hub.evnlogistics.com`
- the bridge-vs-target distinction
- the dedicated infra repo boundary for that surface
- the rule that `clever-deploy-control` is not replaced yet

Expected:
- the next ECS migration target is explicit
- no ambiguity remains about whether central deploy has already moved

- [ ] **Step 2: Update the rollout truth document**

Add a section that says:
- `ev-dashboard` path is complete enough to reuse as a pattern
- the next continuation target is the `hub` public surface
- the EC2 bridge remains active until that surface proves out on ECS

Run:

```bash
git diff --check
```

Expected:
- clean docs diff

- [ ] **Step 3: Update workspace naming if a new infra repo is adopted**

If the spec fixes a name such as `infra-hub-platform`, update `WORKSPACE.md` and `repo-map.md` immediately.

Expected:
- root docs stay ahead of repo creation

### Task 3: Scaffold the next dedicated infra repo from the proven pattern

**Files:**
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-hub-platform/`
- Reference: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/README.md`
- Reference: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/.github/workflows/deploy-ecs.yml`
- Reference: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/lib/preflight.ts`
- Reference: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/lib/postDeploySmoke.ts`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/.gitmodules`

- [ ] **Step 1: Create the new infra repo as a linked child repo**

Expected:
- a dedicated infra repo exists for the next public surface
- the root exposes it as a linked child repo immediately

- [ ] **Step 2: Copy only the reusable ECS control pattern**

Reuse:
- preflight gate
- deploy workflow structure
- operator loop references
- post-deploy public smoke

Do not copy:
- `ev-dashboard.com` domain names
- service-specific route assumptions
- old experimental shortcuts

- [ ] **Step 3: Synthesize and test the scaffold before real service wiring**

Run in the new infra repo:

```bash
npm test -- --runInBand
npx cdk synth
```

Expected:
- the scaffold is valid before any real cutover work starts

### Task 4: Move the next public surface in the same slice order used by `ev-dashboard`

**Files:**
- Modify: next public-surface infra repo workflow and stack files
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/edge-api-gateway/`
- Modify only the application repos touched by the chosen slice
- Read: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/runbooks/ev-dashboard-preprod-release-gate.md`
- Read: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/runbooks/ev-dashboard-ecs-preflight-gate.md`
- Read: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/runbooks/ev-dashboard-ecs-deploy-operator-loop.md`

- [ ] **Step 1: Start with the shell/auth slice, not the whole graph**

Initial slice:
- `front-web-console`
- `edge-api-gateway`
- `service-account-access`

Expected:
- the next public surface proves shell + auth/docs/admin first

- [ ] **Step 2: Reuse the temporary pre-prod lane**

Bring up:
- `candidate.<domain>`
- `api.candidate.<domain>`

Use:
- same SHA image for candidate and prod
- low-cost gate by default

Expected:
- no new long-lived environment is introduced

- [ ] **Step 3: Expand later slices only after the shell/auth slice is stable**

Use the same sequencing discipline that worked for `ev-dashboard`:
- governance/assets
- dispatch
- read models
- settlement
- support
- telemetry

Expected:
- the next public surface migrates incrementally instead of all at once

- [ ] **Step 4: Re-run the existing verification stack at each slice**

At minimum:

```bash
npm run preflight
npm test -- --runInBand
npx cdk synth
```

Then run:
- post-deploy public smoke
- scope-aware browser smoke from the runbook

Expected:
- every slice produces machine proof and operator proof

### Task 5: Add mixed-runtime central deploy support only after the second surface succeeds

**Files:**
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/clever-deploy-control/catalog/services.yaml`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/clever-deploy-control/scripts/deploy/exec-runtime-ecs.sh`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/clever-deploy-control/scripts/deploy/exec-runtime.sh`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/clever-deploy-control/.github/workflows/central-deploy.yml`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/clever-deploy-control/docs/runbooks/central-deploy-reference.md`

- [ ] **Step 1: Add an explicit ECS runtime adapter instead of overloading the EC2 path**

The catalog must distinguish:
- `runtime: ec2`
- `runtime: ecs`

Expected:
- central deploy can route by runtime cleanly

- [ ] **Step 2: Keep deploy-only ownership**

The central repo should dispatch to:
- EC2 adapter for bridge services
- ECS adapter for migrated services

Expected:
- service repos remain build-only

- [ ] **Step 3: Prove a mixed-runtime release bundle**

Use a bundle where:
- one target is still EC2
- one target is ECS

Expected:
- the control plane can orchestrate both without hiding which runtime each target uses

### Task 6: Retire the old EC2 path only after the hub surface proves stable

**Files:**
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/mappings/current-runtime-inventory.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/rollout/2026-04-13-ecs-cdk-oidc-actions-transition.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/clever-deploy-control/docs/runbooks/central-deploy-reference.md`

- [ ] **Step 1: Define hub-surface retirement criteria**

Require:
- prod ECS proof
- candidate gate evidence
- browser smoke evidence
- rollback proof
- no hidden dependency on EC2 app-host for that surface

- [ ] **Step 2: Remove the old host path after proof**

Only after the criteria pass:
- delete or disable the old compose service path
- remove obsolete host bootstrap assumptions
- update the docs to say the surface is no longer on the bridge

- [ ] **Step 3: Record the retirement in living inventory**

Run:

```bash
git diff --check
```

Expected:
- docs truth matches runtime truth

## Notes For Execution

- The current missing `stage` app-host is a **bridge-lane readiness issue**, not a reason to rewrite the ECS plan.
- The current work cycle intentionally prioritizes the next ECS structure transition ahead of the pending `stage` bridge release.
- Do not combine **temporary bridge repair** and **ECS migration** into one release train.
- Do not add the `clever-deploy-control` ECS adapter before the next public surface has proven the dedicated infra-repo pattern.
- Reuse the `ev-dashboard` gates and runbooks, but do not assume the next public surface can skip its own shell/auth-first proof.
