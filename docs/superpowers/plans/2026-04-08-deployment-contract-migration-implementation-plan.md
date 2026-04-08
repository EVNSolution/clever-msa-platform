# Deployment Contract Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `host-side git + host-side build` 기반 배포를 `GitHub Actions -> ECR push -> EC2 pull` 기반 image deploy로 전환하고, 첫 번째 pilot 서비스가 GitHub read token 없이 dev에 배포되도록 만든다.

**Architecture:** 이번 전환은 orchestration layer를 갈아엎지 않는다. `clever-deploy-control`의 OIDC, SSM, wave orchestration은 유지하고, 배포 단위만 `source`에서 `image`로 바꾼다. 첫 pilot은 backend 서비스 1개로 닫고, front와 gateway는 pilot 성공 이후 같은 계약으로 확장한다.

**Tech Stack:** GitHub Actions, AWS OIDC, Amazon ECR, EC2, SSM, Docker Compose, Python, shell scripts

---

## Current Pilot Status (2026-04-08)

현재 기준선은 아래로 고정한다.

- pilot service `service-account-access`는 dev에서 `GitHub Actions -> ECR push -> EC2 pull` 경로로 실제 배포 성공
- ECR repository `service-account-access` 생성 완료
- GitHub Actions build role / EC2 host pull 권한 추가 완료
- `service-account-access` repo에는 image build workflow와 production-oriented image entrypoint 반영 완료
- image build role ARN은 repo secret이 아니라 organization secret `GH_ACTIONS_ECR_BUILD_ROLE_ARN` 으로 승격 완료
- 현재 organization secret access는 selected repositories 방식으로 관리하고, `service-account-access`가 첫 연결 repo다
- `integration-local-stack`에는 deploy 전용 compose `docker-compose.deploy.account-driver-settlement.yml` 반영 완료
- `clever-deploy-control`은 `service-account-access` 1개에 대해 `ecr` artifact를 해석하고 EC2 host에서 image pull + compose up 을 수행하도록 반영 완료

즉 현재는 mixed contract 상태다.

- `service-account-access`: image deploy
- 나머지 서비스: source deploy

이 문서의 다음 목적은 pilot 성공을 기준선으로 삼고, 두 번째 backend 서비스 확장 순서를 정하는 것이다.

---

## Scope Lock

이번 계획은 아래만 1차 범위로 잡는다.

- pilot service: `service-account-access`
- control plane repo: `EVNSolution/clever-deploy-control`
- runtime compose repo: `EVNSolution/integration-local-stack`
- host runtime: existing dev app-host on EC2

이번 계획에서 하지 않는 것:

- `front-web-console` production packaging
- `edge-api-gateway` image deploy 전환
- CodeBuild / CodeConnections 전환
- ECS / EKS 전환

## File Structure

### `clever-deploy-control`
- Modify: `catalog/services.yaml`
- Modify: `scripts/deploy/compute-targets.py`
- Modify: `scripts/deploy/runner.sh`
- Modify: `scripts/deploy/exec-runtime.sh`
- Modify: `.github/workflows/central-deploy.yml`
- Create: `docs/runbooks/image-deploy-pilot.md`

### `integration-local-stack`
- Create: `docker-compose.deploy.account-driver-settlement.yml`
- Create: `infra/env/deploy-images.env.example`
- Modify: `compose/README.md`

### `service-account-access`
- Create or Modify: `Dockerfile`
- Create: `.dockerignore`
- Create: `.github/workflows/build-image.yml`
- Create: `docs/image-build-notes.md` (only if needed to explain packaging assumptions)

### Optional runtime verification scripts
- Create: `scripts/deploy/verify-image-contract.sh` in `clever-deploy-control`

---

### Task 1: Lock the pilot image contract in control-plane metadata

**Files:**
- Modify: `../clever-deploy-control/catalog/services.yaml`
- Modify: `../clever-deploy-control/scripts/deploy/compute-targets.py`
- Create: `../clever-deploy-control/docs/runbooks/image-deploy-pilot.md`

- [ ] **Step 1: Add a failing metadata case for image-backed services**

Document a pilot catalog entry for `service-account-access` that uses image fields instead of source fields:

```yaml
artifact: image:ecr
image_repository: service-account-access
image_tag_source: sha
compose_service: account-auth-api
compose_file: /srv/clever/integration-local-stack/docker-compose.deploy.account-driver-settlement.yml
```

- [ ] **Step 2: Verify current planner rejects or ignores the new contract**

Run:
```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/clever-deploy-control
python3 scripts/deploy/compute-targets.py --catalog catalog/services.yaml --targets service-account-access --environment dev
```

Expected: either validation failure for unknown artifact type, or output that still assumes source deploy.

- [ ] **Step 3: Implement minimal planner support for `image:ecr`**

Required behavior:
- planner must preserve `artifact`, `image_repository`, and tag strategy fields
- planner must not require `repo_url` / `remote_repo_dir` for image-backed services
- planner output must remain backward-compatible for existing source-backed services

- [ ] **Step 4: Write the operator runbook for the pilot contract**

Runbook must explain:
- what the pilot service is
- which repo builds the image
- where the image lives in ECR
- which compose file consumes it
- how rollback chooses the prior image tag

- [ ] **Step 5: Commit**

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/clever-deploy-control
git add catalog/services.yaml scripts/deploy/compute-targets.py docs/runbooks/image-deploy-pilot.md
git commit -m "feat: add image deploy pilot metadata contract"
```

### Task 2: Split deploy compose from dev compose in `integration-local-stack`

**Files:**
- Create: `development/integration-local-stack/docker-compose.deploy.account-driver-settlement.yml`
- Create: `development/integration-local-stack/infra/env/deploy-images.env.example`
- Modify: `development/integration-local-stack/compose/README.md`

- [ ] **Step 1: Create a deploy-only compose file for the pilot service**

Start with the current account stack and reduce the pilot service to `image:` form.

Example:

```yaml
services:
  account-auth-api:
    image: ${ACCOUNT_ACCESS_IMAGE}
```

Keep non-pilot dependencies unchanged unless they block config rendering.

- [ ] **Step 2: Verify the compose file fails without image env**

Run:
```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/integration-local-stack
docker compose -f docker-compose.deploy.account-driver-settlement.yml config
```

Expected: config failure because `ACCOUNT_ACCESS_IMAGE` is unset.

- [ ] **Step 3: Add the minimal deploy env example**

Create:
```env
ACCOUNT_ACCESS_IMAGE=902837199612.dkr.ecr.ap-northeast-2.amazonaws.com/service-account-access:dev-placeholder
```

- [ ] **Step 4: Verify compose config renders with explicit env**

Run:
```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/integration-local-stack
ACCOUNT_ACCESS_IMAGE=test-image docker compose -f docker-compose.deploy.account-driver-settlement.yml config
```

Expected: PASS and rendered `image: test-image` for `account-auth-api`.

- [ ] **Step 5: Document the split between local dev compose and deploy compose**

README must explicitly say:
- local compose may continue using `build:`
- deploy compose must use `image:`
- deploy-control only targets deploy compose for image-backed services

- [ ] **Step 6: Commit**

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/integration-local-stack
git add docker-compose.deploy.account-driver-settlement.yml infra/env/deploy-images.env.example compose/README.md
git commit -m "feat: add deploy compose for account image pilot"
```

### Task 3: Package and publish the pilot image from the service repo

**Files:**
- Create or Modify: `development/service-account-access/Dockerfile`
- Create: `development/service-account-access/.dockerignore`
- Create: `development/service-account-access/.github/workflows/build-image.yml`

- [ ] **Step 1: Write the packaging assumptions down before code**

The Docker image must:
- boot the same runtime the current compose service expects
- read the same env contract as existing dev runtime
- expose the same internal port the gateway and compose already use

- [ ] **Step 2: Add a failing container build step locally**

Run:
```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-account-access
docker build -t service-account-access:test .
```

Expected: fail until Dockerfile or packaging dependencies are correct.

- [ ] **Step 3: Implement the minimal Docker packaging**

Requirements:
- production-oriented image, not dev autoreload image
- deterministic entrypoint
- no dependency on sibling repos

- [ ] **Step 4: Add GitHub Actions image build workflow**

Workflow requirements:
- trigger on `main` pushes and manual dispatch
- use OIDC to assume a build/push role
- login to ECR
- build image
- push `sha` tag
- optionally move `dev-latest` only after successful push

- [ ] **Step 5: Verify local build succeeds**

Run:
```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-account-access
docker build -t service-account-access:test .
```

Expected: PASS with a runnable image.

- [ ] **Step 6: Commit**

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-account-access
git add Dockerfile .dockerignore .github/workflows/build-image.yml
git commit -m "feat: add account-access image build pipeline"
```

### Task 4: Teach deploy-control to deploy images instead of source for the pilot

**Files:**
- Modify: `../clever-deploy-control/scripts/deploy/runner.sh`
- Modify: `../clever-deploy-control/scripts/deploy/exec-runtime.sh`
- Modify: `../clever-deploy-control/.github/workflows/central-deploy.yml`
- Optional Create: `../clever-deploy-control/scripts/deploy/verify-image-contract.sh`

- [ ] **Step 1: Make runtime dispatch fail clearly for unsupported image contracts**

Before implementation, add a hard failure path such as:
- `artifact image:ecr is not supported yet`

Run one pilot deploy.
Expected: explicit failure at runtime dispatch, not silent fallback to git clone.

- [ ] **Step 2: Implement minimal `image:ecr` branch in runtime execution**

Required behavior:
- resolve final image ref from repository + tag
- export image env var expected by deploy compose
- login to ECR on host if needed
- run `docker compose -f docker-compose.deploy.account-driver-settlement.yml pull`
- run `docker compose -f docker-compose.deploy.account-driver-settlement.yml up -d`
- skip git clone/pull for the pilot service

- [ ] **Step 3: Verify host no longer requires GitHub read access for the pilot**

Validation method:
- temporarily remove or bypass front/service git dependency only for the pilot code path
- confirm the pilot deploy succeeds while using ECR pull only

- [ ] **Step 4: Add a focused verification script**

Suggested checks:
- image ref resolves
- compose config renders
- host can pull from ECR
- target container restarts with the requested image tag

- [ ] **Step 5: Commit**

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/clever-deploy-control
git add scripts/deploy/runner.sh scripts/deploy/exec-runtime.sh .github/workflows/central-deploy.yml scripts/deploy/verify-image-contract.sh
git commit -m "feat: add image deploy runtime for account pilot"
```

### Task 5: Rollback and deployment record alignment

**Files:**
- Modify: `../clever-deploy-control/scripts/deploy/rollback.sh`
- Modify: `../clever-deploy-control/docs/runbooks/image-deploy-pilot.md`
- Optional Modify: `../clever-deploy-control/catalog/services.yaml`

- [ ] **Step 1: Define the rollback source of truth**

Rollback must move from source revision thinking to image tag thinking.

Candidate record shape:
```json
{
  "service": "service-account-access",
  "environment": "dev",
  "image": "...:sha",
  "deployed_at": "..."
}
```

- [ ] **Step 2: Make rollback fail before implementation if no image record exists**

Run pilot rollback command before adding record support.
Expected: explicit failure about missing deployment record.

- [ ] **Step 3: Implement minimal image-tag rollback**

Required behavior:
- find previous deployed image tag
- export prior image env var
- rerun deploy compose with previous image

- [ ] **Step 4: Verify rollback actually changes the running image**

Run:
```bash
# deploy tag A
# deploy tag B
# rollback
```

Expected: container returns to tag A.

- [ ] **Step 5: Commit**

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/clever-deploy-control
git add scripts/deploy/rollback.sh docs/runbooks/image-deploy-pilot.md catalog/services.yaml
git commit -m "feat: add image tag rollback for account pilot"
```

### Task 6: Expand from pilot to migration policy

**Files:**
- Modify: `docs/superpowers/specs/2026-04-08-operational-hardening-design.md`
- Modify: `docs/superpowers/specs/2026-04-08-production-cutover-design.md`
- Create: `docs/superpowers/plans/2026-04-08-image-deploy-rollout-wave-plan.md`

- [ ] **Step 1: Record pilot learnings before expanding**

Capture:
- what broke
- what stayed source-based
- whether host GitHub token is still needed globally or only for non-pilot services

- [ ] **Step 2: Define rollout order for the rest of the system**

Recommended order:
1. backend stateless services
2. gateway
3. front runtime
4. remaining mixed or complex stacks

- [ ] **Step 3: Write the follow-on rollout plan**

The rollout plan must explicitly separate:
- services ready for image deploy now
- services blocked by packaging work
- services blocked by front/runtime strategy

- [ ] **Step 4: Commit**

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform
git add docs/superpowers/specs/2026-04-08-operational-hardening-design.md docs/superpowers/specs/2026-04-08-production-cutover-design.md docs/superpowers/plans/2026-04-08-image-deploy-rollout-wave-plan.md
git commit -m "docs: record image deploy pilot expansion policy"
```

## Verification Gates

Before this plan is considered complete, the implementation must prove all of the following:

- `service-account-access` can be built into an image in CI
- that image lands in ECR with a deterministic tag
- deploy-control can target the image without using host-side git for that service
- the dev host can pull and run the image successfully
- rollback can move from tag B back to tag A
- the pilot runbook documents the final operator steps

## Human Gates

The human partner must explicitly do or confirm the following when the implementation reaches the relevant step:

- AWS role/secrets needed for ECR push if they differ from existing deploy roles
- ECR repository creation policy and naming approval
- whether `dev-latest` tags are allowed in addition to immutable sha tags
- whether `front-web-console` remains excluded from the pilot slice

## Recommended Commit Order

1. control-plane metadata contract
2. deploy compose split
3. service image packaging
4. image runtime execution
5. rollback alignment
6. rollout policy docs

## Suggested Execution Strategy

Use `subagent-driven-development` and keep the pilot slice narrow. Do not start with front-end runtime packaging. Close one backend service completely first, then expand.
