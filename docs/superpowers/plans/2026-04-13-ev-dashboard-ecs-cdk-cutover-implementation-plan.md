# EV Dashboard ECS/CDK Cutover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the `ev-dashboard.com` runtime cutover path from the current EC2/SSM/compose control path to a new `GitHub Actions + OIDC + ECR + CDK + ECS/Fargate` rollout for `front-web-console`, `edge-api-gateway`, and `service-account-access`.

**Architecture:** Keep application code and image builds inside each existing repo, but introduce one dedicated platform-infra repo for the shared ALB, ECS cluster, ECS services, ACM, Route53, and deployment workflow. This keeps runtime ownership separate from app code while avoiding cross-repo CDK coupling inside `front-web-console`, `edge-api-gateway`, or `service-account-access`.

**Tech Stack:** AWS CDK (TypeScript), ECS/Fargate, ALB, ACM, Route53, GitHub Actions, OIDC, Amazon ECR, React/Vite, Nginx, Django/Gunicorn.

---

## File Structure Decision

The implementation should use this file ownership model.

- Root docs:
  - Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/archive/historical/rollout/2026-04-13-ev-dashboard-domain-ecs-cutover-plan.md`
  - Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/rollout/2026-04-13-ecs-cdk-oidc-actions-transition.md`
  - Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/WORKSPACE.md`
  - Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/repo-map.md`
  - Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/lesson.md`
- New infra repo:
  - Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/README.md`
  - Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/package.json`
  - Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/package-lock.json`
  - Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/tsconfig.json`
  - Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/cdk.json`
  - Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/bin/ev-dashboard-platform.ts`
  - Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/lib/ev-dashboard-platform-stack.ts`
  - Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/lib/config.ts`
  - Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/test/ev-dashboard-platform-stack.test.ts`
  - Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/.github/workflows/deploy-ecs.yml`
  - Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/lesson.md`
- App repos:
  - Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/.github/workflows/build-image.yml`
  - Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/README.md`
  - Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/lesson.md`
  - Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/.github/workflows/build-image.yml`
  - Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/edge-api-gateway/.github/workflows/build-image.yml`
  - Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/edge-api-gateway/README.md`
  - Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/edge-api-gateway/lesson.md`
  - Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-account-access/.github/workflows/build-image.yml`
  - Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-account-access/README.md`
  - Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-account-access/lesson.md`

## Task 1: Lock The Migration Boundary In Docs

**Files:**
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/archive/historical/rollout/2026-04-13-ev-dashboard-domain-ecs-cutover-plan.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/rollout/2026-04-13-ecs-cdk-oidc-actions-transition.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/WORKSPACE.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/repo-map.md`

- [ ] **Step 1: Write the failing documentation check**

Create a simple grep-based note for the expected statements:

- the full-system current deploy path stays `EC2 + SSM + compose`
- the migration path is `GitHub Actions + OIDC + ECR + CDK + ECS/Fargate`
- the first migration slice is only `front-web-console`, `edge-api-gateway`, `service-account-access`
- the shared ECS/ALB stack will live in a new dedicated infra repo

- [ ] **Step 2: Update the rollout docs to make the migration scope explicit**

Document these non-negotiable rules:

- do not use `clever-deploy-control` full-system compose deploy as the migration execution path
- do not collapse the front host and API/admin host back into one shared `/admin/*` namespace
- do not retire the current compose path until the new ECS slice passes real smoke checks

- [ ] **Step 3: Update workspace governance for the new infra repo**

Add `development/infra-ev-dashboard-platform` to the workspace docs and repo map as a platform-specific infra repo, not as a shared app-code repo.

- [ ] **Step 4: Verify the docs are internally consistent**

Run: `git diff --check -- docs/archive/historical/rollout/2026-04-13-ev-dashboard-domain-ecs-cutover-plan.md docs/rollout/2026-04-13-ecs-cdk-oidc-actions-transition.md WORKSPACE.md repo-map.md`

Expected: no diff formatting errors

- [ ] **Step 5: Commit**

```bash
git add docs/archive/historical/rollout/2026-04-13-ev-dashboard-domain-ecs-cutover-plan.md docs/rollout/2026-04-13-ecs-cdk-oidc-actions-transition.md WORKSPACE.md repo-map.md
git commit -m "docs: lock ev-dashboard ECS migration boundary"
```

## Task 2: Create The Dedicated ECS/CDK Infra Repo

**Files:**
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/README.md`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/package.json`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/tsconfig.json`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/cdk.json`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/bin/ev-dashboard-platform.ts`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/lib/config.ts`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/lib/ev-dashboard-platform-stack.ts`
- Test: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/test/ev-dashboard-platform-stack.test.ts`

- [ ] **Step 1: Write the failing CDK synth test**

The test should assert that synth includes:

- one ECS cluster
- one internet-facing ALB
- HTTPS listener on `443`
- host-based routing for `ev-dashboard.com` and `api.ev-dashboard.com`
- three ECS services named for front, gateway, and account access

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- --runInBand`

Expected: fail because the CDK app or stack does not exist yet

- [ ] **Step 3: Scaffold the CDK app with explicit config inputs**

Use typed config for:

- AWS region
- hosted zone id
- apex domain
- api subdomain
- image repositories and image tags for all three services
- desired counts, CPU, memory, health-check paths

- [ ] **Step 4: Implement the first stack version**

The stack should create:

- VPC lookup or import, not a brand-new network
- ECS cluster
- one ALB
- one certificate covering `ev-dashboard.com` and `api.ev-dashboard.com`
- one target group per service
- listener rules:
  - `Host=ev-dashboard.com` -> `front-web-console`
  - `Host=api.ev-dashboard.com` -> `edge-api-gateway`
- Route53 alias records

The first stack should keep `service-account-access` behind `edge-api-gateway`, not as a direct ALB route.

- [ ] **Step 5: Re-run the tests and synth**

Run:

- `npm test -- --runInBand`
- `npx cdk synth`

Expected: tests pass and synth succeeds

- [ ] **Step 6: Commit**

```bash
git add README.md package.json package-lock.json tsconfig.json cdk.json bin lib test
git commit -m "feat: scaffold ev-dashboard ECS CDK platform stack"
```

## Task 3: Add Image Build Pipelines For Front And Gateway

**Files:**
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/.github/workflows/build-image.yml`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/edge-api-gateway/.github/workflows/build-image.yml`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/README.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/edge-api-gateway/README.md`

- [ ] **Step 1: Write failing workflow validation checks**

Use simple repo-local expectations:

- `front-web-console` should publish `front-web-console:<sha>`
- `edge-api-gateway` should publish `edge-api-gateway:<sha>`
- both workflows should use `${{ vars.GH_ACTIONS_ECR_BUILD_ROLE_ARN }}`

- [ ] **Step 2: Copy the service-account-access build workflow pattern**

Use the existing build workflow as the template, but change:

- repository name
- role session name
- docker build context
- workflow display name

- [ ] **Step 3: Add repo notes for the new image contract**

Document that:

- image tags are SHA-only
- ECS deploy is handled from the infra repo
- app repos build images but do not own ALB or Route53

- [ ] **Step 4: Verify build config syntax**

Run:

- `git diff --check`
- `gh workflow view "Build front-web-console image" --yaml` after push
- `gh workflow view "Build edge-api-gateway image" --yaml` after push

Expected: YAML parses and the workflows are visible on GitHub after push

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/build-image.yml README.md
git commit -m "feat: add ECR image build workflows for front and gateway"
```

## Task 4: Align service-account-access For ECS Runtime Use

**Files:**
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-account-access/.github/workflows/build-image.yml`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-account-access/README.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-account-access/lesson.md`
- Test: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-account-access/accounts/tests/test_admin_and_schema_urls.py`

- [ ] **Step 1: Write the failing ECS-alignment check**

Add a small check for environment assumptions that the ECS runtime needs:

- admin path stays `/admin/account-access/`
- static path stays `/static/`
- docs endpoints stay service-local
- build workflow produces the same SHA-tagged image contract expected by the infra repo

- [ ] **Step 2: Update README and lesson text for ECS ownership**

Clarify that:

- this repo no longer owns runtime deploy orchestration
- its responsibilities are image build, service behavior, and service-local docs/admin
- infra deploy is handled by the dedicated infra repo

- [ ] **Step 3: Verify the focused Django tests**

Run: `./.venv/bin/python manage.py test accounts.tests.test_admin_and_schema_urls -v 2`

Expected: pass

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/build-image.yml README.md lesson.md accounts/tests/test_admin_and_schema_urls.py
git commit -m "docs: align account access for ECS runtime contract"
```

## Task 5: Create The Infra Deploy Workflow

**Files:**
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/.github/workflows/deploy-ecs.yml`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/README.md`
- Test: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/test/ev-dashboard-platform-stack.test.ts`

- [ ] **Step 1: Write the failing workflow contract note**

The workflow must support:

- `workflow_dispatch`
- environment choice (`dev`, `stage`, `prod`)
- explicit image tags for front, gateway, account-access
- OIDC role assumption for infra deploy

- [ ] **Step 2: Implement the deploy workflow**

The workflow should:

- checkout the infra repo
- install Node dependencies
- assume `${{ secrets.GH_ACTIONS_INFRA_ROLE_ARN }}` or environment-scoped deploy role
- run `npx cdk deploy`
- pass image tags and domain config through CDK context or environment variables

- [ ] **Step 3: Add a dry-run/synth path**

The same workflow should support a synth-only mode before live deploy.

- [ ] **Step 4: Verify locally**

Run:

- `npm ci`
- `npm test -- --runInBand`
- `npx cdk synth`

Expected: all pass

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/deploy-ecs.yml README.md
git commit -m "feat: add ev-dashboard ECS deploy workflow"
```

## Task 6: Execute The First Dev Cutover Rehearsal

**Files:**
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/archive/historical/rollout/2026-04-13-ev-dashboard-domain-ecs-cutover-plan.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/lesson.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/lesson.md`

- [ ] **Step 1: Build all three images from their repos**

Record the exact successful GitHub Actions run URLs and SHA tags.

- [ ] **Step 2: Run infra workflow in synth mode**

Expected: the stack renders correctly for the target environment.

- [ ] **Step 3: Run infra workflow as a real dev deploy**

Expected: ECS services become healthy and ALB rules resolve correctly.

- [ ] **Step 4: Run smoke checks from outside**

Use the dev endpoint equivalents for:

- `/`
- `/openapi.yaml`
- `/swagger/`
- `/redoc/`
- `/admin/account-access/`
- `/admin/account-access/login/`
- `/static/admin/css/base.css`

- [ ] **Step 5: Record the result in lessons immediately**

Capture:

- which image tags were deployed
- which ALB hostnames or Route53 records were used
- which check failed first if anything broke
- whether gateway/admin/static behaved differently under ECS than under compose

- [ ] **Step 6: Commit**

```bash
git add docs/archive/historical/rollout/2026-04-13-ev-dashboard-domain-ecs-cutover-plan.md lesson.md development/infra-ev-dashboard-platform/lesson.md
git commit -m "docs: record ev-dashboard ECS rehearsal lessons"
```

## Task 7: Promote To Production Cutover

**Files:**
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/archive/historical/rollout/2026-04-13-ev-dashboard-domain-ecs-cutover-plan.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/lesson.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/lesson.md`

- [ ] **Step 1: Re-read all lesson files before the production cutover**

Read:

- root `lesson.md`
- `development/front-web-console/lesson.md`
- `development/edge-api-gateway/lesson.md`
- `development/service-account-access/lesson.md`
- `development/infra-ev-dashboard-platform/lesson.md`

- [ ] **Step 2: Freeze the production image tags**

Use the same tags already validated in dev or stage. Do not rebuild during the cutover window.

- [ ] **Step 3: Retire `test-test-sh` before the Route53 alias switch**

At minimum:

- scale service to zero or stop tasks

Preferred:

- delete the disposable test stack entirely

- [ ] **Step 4: Run the real prod deploy**

Expected: Route53 alias points to ALB, ACM serves the certificate, ECS services are healthy.

- [ ] **Step 5: Run final external smoke checks**

Use:

- `https://ev-dashboard.com/`
- `https://api.ev-dashboard.com/openapi.yaml`
- `https://api.ev-dashboard.com/swagger/`
- `https://api.ev-dashboard.com/redoc/`
- `https://api.ev-dashboard.com/admin/account-access/`
- `https://api.ev-dashboard.com/admin/account-access/login/`
- `https://api.ev-dashboard.com/static/admin/css/base.css`

- [ ] **Step 6: Write the production cutover lesson immediately**

Record:

- deploy workflow run URLs
- image tags used
- Route53 change time
- any redirect/static/admin surprises
- rollback threshold for the next deployment

- [ ] **Step 7: Commit**

```bash
git add docs/archive/historical/rollout/2026-04-13-ev-dashboard-domain-ecs-cutover-plan.md lesson.md development/infra-ev-dashboard-platform/lesson.md
git commit -m "docs: record ev-dashboard production ECS cutover"
```

## Verification Checklist

- app repos build SHA-tagged images successfully
- infra repo synth passes locally
- ALB routes front and API hosts correctly
- gateway still exposes docs/admin/static correctly
- Django admin login keeps the prefixed path
- Route53 no longer points directly at a Fargate task public IP
- `test-test-sh` can no longer re-claim the domain

## Notes

- Do not reuse the current full-system `clever-deploy-control` compose deploy as the migration path.
- Do not expand to all 26 runtime targets before this 3-repo slice succeeds.
- Every live deploy in this plan must be followed immediately by a lesson update.
