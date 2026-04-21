# Frontend Runtime Naming Cutover Implementation Plan

> Historical status: 이 구현 계획은 `hub.evnlogistics.com`이 public endpoint로 남아 있던 시점의 cutover snapshot이다. 현재 canonical public surface는 `ev-dashboard.com` / `api.ev-dashboard.com`이며, current truth는 [../../../mappings/current-runtime-inventory.md](../../../mappings/current-runtime-inventory.md) 와 [../../../rollout/2026-04-13-ecs-cdk-oidc-actions-transition.md](../../../rollout/2026-04-13-ecs-cdk-oidc-actions-transition.md)를 따른다.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align the surviving frontend runtime with the canonical `front-web-console` name across repo, local path, deploy-control metadata, and runtime naming without breaking the current dev deployment.

**Architecture:** Execute the rename in two cutover stages. First, align repo/path/deploy metadata while preserving the current `admin-front` runtime alias for a narrow deploy-safe transition. Second, rename the compose service, gateway upstream, env file, and deploy target so runtime naming converges on a single `web-console` naming set. The plan includes an explicit user gate for GitHub read-only token regeneration before the repo rename lands.

**Tech Stack:** Git, GitHub repos, GitHub Actions, AWS SSM Parameter Store, Docker Compose, Nginx, Markdown docs

---

## File Structure

### Platform root

- Modify: `WORKSPACE.md`
  - Update active frontend inventory from `front-admin-console`/`front-operator-console` to the canonical `front-web-console` line.
- Modify: `repo-map.md`
  - Replace active frontend rows so the surviving UI is represented as `front-web-console` and the old names are described as alias/legacy history.
- Modify: `docs/mappings/current-runtime-inventory.md`
  - Update the current runtime inventory naming for the frontend runtime.
- Modify: `docs/superpowers/specs/2026-04-08-clever-msa-master-roadmap-design.md`
  - Replace the temporary `front-admin-console` deployment wording with the new canonical/runtime state.
- Rename directory: `development/front-admin-console` -> `development/front-web-console`
  - Move the surviving frontend source tree into its canonical path.
- Modify: `development/integration-local-stack/docker-compose.account-driver-settlement.yml`
  - Stage A: point the build context to `../front-web-console` while keeping the runtime service alias stable.
  - Stage B: rename the compose service from `admin-front` to `web-console` and update dependencies.
- Modify: `development/integration-local-stack/compose/README.md`
  - Update frontend path, compose service, and naming examples after each cutover stage.
- Rename file: `development/integration-local-stack/infra/env/admin-front.env.example` -> `development/integration-local-stack/infra/env/web-console.env.example`
  - Stage B runtime naming alignment for the frontend env contract.
- Modify: `development/edge-api-gateway/nginx.conf`
  - Stage B: update the frontend upstream from `admin-front:5174` to `web-console:5174`.

### Deploy control repo

- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/clever-deploy-control/catalog/services.yaml`
  - Rename the frontend service key/repo/path metadata from `front-admin-console` to `front-web-console`, then later switch the runtime service name once Stage B lands.
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/clever-deploy-control/docs/inventory/current-runtime-deploy-inventory.md`
  - Keep deploy inventory aligned with the renamed repo/path and final runtime service name.
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/clever-deploy-control/docs/runbooks/central-deploy-reference.md`
  - Update example targets, remote checkout locations, and runtime naming references.

## Task 1: Freeze the cutover inventory and user gate

**Files:**
- Modify: `WORKSPACE.md`
- Modify: `repo-map.md`
- Modify: `docs/mappings/current-runtime-inventory.md`
- Modify: `docs/superpowers/specs/2026-04-08-clever-msa-master-roadmap-design.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/clever-deploy-control/docs/inventory/current-runtime-deploy-inventory.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/clever-deploy-control/docs/runbooks/central-deploy-reference.md`

- [ ] **Step 1: Update active inventory names in the platform root**

Make the active frontend entries describe the current canonical line only:
- `front-web-console` = canonical surviving frontend
- `front-admin-console` = temporary legacy alias history, not active naming
- `front-operator-console` = retired legacy line

Keep historical mentions only where the file is explicitly archival.

- [ ] **Step 2: Update deploy-control inventory and reference docs**

Change the active frontend deployment inventory so it reflects the upcoming rename plan explicitly:
- repo name target: `front-web-console`
- remote checkout target: `/srv/clever/front-web-console`
- current runtime alias note: `admin-front` until Stage B

- [ ] **Step 3: Add the explicit user gate for token regeneration**

In the plan execution notes and deploy-control reference, add a blocker note that rename execution cannot continue until the user:
1. Regenerates the GitHub fine-grained read-only token
2. Includes the renamed `front-web-console` repo in token scope
3. Updates AWS SSM parameter `/clever/deploy/github/read-token`

- [ ] **Step 4: Verify the active naming inventory is internally consistent**

Run:

```bash
rg -n "front-admin-console|front-web-console|front-operator-console|admin-front" \
  WORKSPACE.md \
  repo-map.md \
  docs/mappings/current-runtime-inventory.md \
  docs/superpowers/specs/2026-04-08-clever-msa-master-roadmap-design.md \
  /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/clever-deploy-control/docs/inventory/current-runtime-deploy-inventory.md \
  /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/clever-deploy-control/docs/runbooks/central-deploy-reference.md
```

Expected:
- active inventory files no longer present `front-admin-console` as the canonical frontend name
- `admin-front` appears only as a documented temporary runtime alias note

- [ ] **Step 5: Commit**

```bash
git -C . add \
  WORKSPACE.md \
  repo-map.md \
  docs/mappings/current-runtime-inventory.md \
  docs/superpowers/specs/2026-04-08-clever-msa-master-roadmap-design.md
git -C . commit -m "docs: freeze frontend naming cutover inventory"

git -C /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/clever-deploy-control add \
  docs/inventory/current-runtime-deploy-inventory.md \
  docs/runbooks/central-deploy-reference.md
git -C /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/clever-deploy-control commit -m "docs: record frontend rename cutover gate"
```

## Task 2: Rename the frontend repo/path while preserving the runtime alias

**Files:**
- Rename directory: `development/front-admin-console` -> `development/front-web-console`
- Modify: `development/integration-local-stack/docker-compose.account-driver-settlement.yml`
- Modify: `development/integration-local-stack/compose/README.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/clever-deploy-control/catalog/services.yaml`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/clever-deploy-control/docs/inventory/current-runtime-deploy-inventory.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/clever-deploy-control/docs/runbooks/central-deploy-reference.md`

- [ ] **Step 1: Perform the local path rename in the platform root**

Rename the directory:

```bash
mv \
  development/front-admin-console \
  development/front-web-console
```

Do not change source contents in this step.

- [ ] **Step 2: Point compose to the renamed path without changing the service name yet**

Update:
`development/integration-local-stack/docker-compose.account-driver-settlement.yml`

Change only the frontend build context:

```yaml
admin-front:
  build:
    context: ../front-web-console
```

Do not rename `admin-front` yet.

- [ ] **Step 3: Execute the explicit user gate before repo cutover**

Pause and request the user to:
1. Regenerate the read-only token
2. Update SSM `/clever/deploy/github/read-token`
3. Confirm the renamed GitHub repo is readable from the token scope

Do not continue to repo rename or deployment until the user confirms this is complete.

- [ ] **Step 4: Rename the GitHub repository and push the path change**

Expected GitHub repo transition:
- from: `EVNSolution/front-admin-console`
- to: `EVNSolution/front-web-console`

Push the renamed frontend repo first, before changing any live deploy-control metadata.

- [ ] **Step 5: Update deploy-control metadata to the renamed repo/path while preserving the runtime alias**

In `services.yaml` and deploy inventory/reference docs:
- rename target key and repo/path to `front-web-console`
- keep compose service note as `admin-front` during this stage
- update remote checkout path to `/srv/clever/front-web-console`

This step must happen only after the GitHub repo rename has completed successfully.

- [ ] **Step 6: Verify compose config renders from the renamed path**

Run:

```bash
docker compose -f development/integration-local-stack/docker-compose.account-driver-settlement.yml config >/tmp/clever-frontend-rename-compose.out
```

Expected:
- exit `0`
- rendered config still contains service `admin-front`
- rendered build context resolves from `../front-web-console`

- [ ] **Step 7: Deploy the renamed repo/path with the old runtime alias still intact**

Run:

```bash
gh workflow run "Central MSA Deploy Dispatch" \
  -R EVNSolution/clever-deploy-control \
  -f environment=dev \
  -f targets=front-web-console \
  -f dry_run=false
```

Expected:
- workflow finishes `success`
- `https://hub.evnlogistics.com/` still renders successfully

- [ ] **Step 8: Commit**

```bash
git -C . add \
  development/front-web-console \
  development/integration-local-stack/docker-compose.account-driver-settlement.yml \
  development/integration-local-stack/compose/README.md

git -C . commit -m "refactor: rename frontend path to front-web-console"

git -C /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/clever-deploy-control add \
  catalog/services.yaml \
  docs/inventory/current-runtime-deploy-inventory.md \
  docs/runbooks/central-deploy-reference.md

git -C /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/clever-deploy-control commit -m "refactor: rename frontend deploy target to front-web-console"
```

## Task 3: Rename the runtime service and env contract

**Files:**
- Modify: `development/integration-local-stack/docker-compose.account-driver-settlement.yml`
- Rename file: `development/integration-local-stack/infra/env/admin-front.env.example` -> `development/integration-local-stack/infra/env/web-console.env.example`
- Modify: `development/integration-local-stack/compose/README.md`
- Modify: `development/edge-api-gateway/nginx.conf`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/clever-deploy-control/catalog/services.yaml`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/clever-deploy-control/docs/inventory/current-runtime-deploy-inventory.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/clever-deploy-control/docs/runbooks/central-deploy-reference.md`

- [ ] **Step 1: Rename the compose service from `admin-front` to `web-console`**

Update the compose file so the frontend service is:

```yaml
web-console:
  build:
    context: ../front-web-console
  env_file:
    - ./infra/env/web-console.env.example
```

Also update `gateway.depends_on` accordingly.

- [ ] **Step 2: Rename the env contract file**

Rename:

```bash
mv \
  development/integration-local-stack/infra/env/admin-front.env.example \
  development/integration-local-stack/infra/env/web-console.env.example
```

Update any compose/readme references in the same task.

- [ ] **Step 3: Update the gateway frontend upstream**

Change the root upstream in:
`development/edge-api-gateway/nginx.conf`

From:

```nginx
set $front_upstream admin-front:5174;
```

To:

```nginx
set $front_upstream web-console:5174;
```

- [ ] **Step 4: Update deploy-control to the final runtime naming set**

Make deploy-control references converge on the final naming set:
- target key: `front-web-console`
- repo/path: `front-web-console`
- runtime service: `web-console`
- env reference: `web-console.env.example`

- [ ] **Step 5: Verify Nginx and Compose render cleanly**

Run:

```bash
docker run --rm -v development/edge-api-gateway/nginx.conf:/etc/nginx/nginx.conf:ro nginx:stable nginx -t

docker compose -f development/integration-local-stack/docker-compose.account-driver-settlement.yml config >/tmp/clever-web-console-compose.out
```

Expected:
- Nginx syntax test succeeds
- Compose config exits `0`
- rendered compose contains `web-console`, not `admin-front`

- [ ] **Step 6: Deploy and smoke test the final runtime name**

Run:

```bash
gh workflow run "Central MSA Deploy Dispatch" \
  -R EVNSolution/clever-deploy-control \
  -f environment=dev \
  -f targets=front-web-console,edge-api-gateway \
  -f dry_run=false
```

Then verify:

```bash
DOMAIN_NAME=hub.evnlogistics.com \
/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/clever-deploy-control/scripts/deploy/verify-public-ingress.sh
```

Expected:
- deploy workflow finishes `success`
- public ingress smoke check exits `0`

- [ ] **Step 7: Commit**

```bash
git -C . add \
  development/integration-local-stack/docker-compose.account-driver-settlement.yml \
  development/integration-local-stack/infra/env/web-console.env.example \
  development/integration-local-stack/compose/README.md \
  development/edge-api-gateway/nginx.conf

git -C . commit -m "refactor: rename frontend runtime service to web-console"

git -C /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/clever-deploy-control add \
  catalog/services.yaml \
  docs/inventory/current-runtime-deploy-inventory.md \
  docs/runbooks/central-deploy-reference.md

git -C /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/clever-deploy-control commit -m "refactor: align frontend runtime naming with web-console"
```

## Task 4: Retire the old names and record the cutover

**Files:**
- Modify: `WORKSPACE.md`
- Modify: `repo-map.md`
- Modify: `docs/mappings/current-runtime-inventory.md`
- Modify: `docs/superpowers/specs/2026-04-08-clever-msa-master-roadmap-design.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/clever-deploy-control/docs/inventory/current-runtime-deploy-inventory.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/clever-deploy-control/docs/runbooks/central-deploy-reference.md`

- [ ] **Step 1: Remove active alias language from current docs**

After Stage B succeeds, active docs should stop describing `front-admin-console` as a temporary alias. Keep the old names only in historical/archive documents.

- [ ] **Step 2: Record the cutover evidence**

Update the active docs with the final state:
- repo/runtime canonical name: `front-web-console`
- compose service: `web-console`
- public endpoint: `https://hub.evnlogistics.com/`
- deploy target: `front-web-console`
- GitHub token/SSM gate completed

- [ ] **Step 3: Verify no active file still depends on old names**

Run:

```bash
rg -n "front-admin-console|front-operator-console|admin-front|admin-front\.env\.example" \
  WORKSPACE.md \
  repo-map.md \
  docs/mappings/current-runtime-inventory.md \
  docs/superpowers/specs/2026-04-08-clever-msa-master-roadmap-design.md \
  development/integration-local-stack/docker-compose.account-driver-settlement.yml \
  development/integration-local-stack/compose/README.md \
  development/edge-api-gateway/nginx.conf \
  /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/clever-deploy-control/catalog/services.yaml \
  /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/clever-deploy-control/docs/inventory/current-runtime-deploy-inventory.md \
  /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/clever-deploy-control/docs/runbooks/central-deploy-reference.md
```

Expected:
- no matches in active files
- any remaining old-name references live only in historical/archive documents

- [ ] **Step 4: Commit**

```bash
git -C . add \
  WORKSPACE.md \
  repo-map.md \
  docs/mappings/current-runtime-inventory.md \
  docs/superpowers/specs/2026-04-08-clever-msa-master-roadmap-design.md

git -C . commit -m "docs: retire old frontend alias names"

git -C /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/clever-deploy-control add \
  docs/inventory/current-runtime-deploy-inventory.md \
  docs/runbooks/central-deploy-reference.md

git -C /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/clever-deploy-control commit -m "docs: record frontend naming cutover completion"
```
