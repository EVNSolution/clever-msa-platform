# CLEVER Hub Ingress Implementation Plan

> Historical status: 이 구현 계획은 `hub.evnlogistics.com` cutover를 목표로 작성된 당시 실행 계획이다. 현재 canonical public surface는 `ev-dashboard.com` / `api.ev-dashboard.com`이며, current truth는 [../../../mappings/current-runtime-inventory.md](../../../mappings/current-runtime-inventory.md) 와 [../../../rollout/2026-04-13-ecs-cdk-oidc-actions-transition.md](../../../rollout/2026-04-13-ecs-cdk-oidc-actions-transition.md)를 따른다.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the temporary dev public-IP access path with a formal `hub.evnlogistics.com -> ALB -> edge-api-gateway` ingress path, while preserving the existing dev deployment flow.

**Architecture:** Keep the current runtime topology and central deploy control-plane intact. Add a dedicated ingress provisioning path in `clever-deploy-control`, teach the gateway to expose a stable health endpoint and canonical forwarded-header behavior, then cut traffic over to the ALB-backed domain and remove the temporary `8080` exposure.

**Tech Stack:** GitHub Actions, AWS OIDC, AWS CLI, ALB, ACM, Route53, EC2, SSM, Nginx, Docker Compose

---

## File Structure

### Platform docs repo

- Modify: `development/edge-api-gateway/nginx.conf`
  - Add a gateway-owned health endpoint and finalize canonical forwarded-header behavior for ALB traffic.
- Modify: `development/integration-local-stack/docker-compose.account-driver-settlement.yml`
  - Add a container-level healthcheck for the gateway service so local/dev behavior matches ALB expectations.
- Modify: `development/integration-local-stack/compose/README.md`
  - Document the new gateway health path, public ingress assumptions, and post-cutover runtime expectations.

### Deploy control repo

- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/clever-deploy-control/scripts/deploy/provision-public-ingress.sh`
  - Idempotent AWS CLI orchestration for ACM, ALB, target group, listeners, SG rules, and Route53 aliasing.
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/clever-deploy-control/.github/workflows/provision-public-ingress.yml`
  - Manual workflow to run the ingress provisioning script under OIDC.
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/clever-deploy-control/scripts/deploy/verify-public-ingress.sh`
  - Post-cutover smoke verifier for root page, login route, and representative API route.
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/clever-deploy-control/docs/runbooks/public-ingress-runbook.md`
  - Operator-facing procedure for provisioning, validation, rollback, and temporary `8080` retirement.
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/clever-deploy-control/docs/runbooks/deploy-runbook.md`
  - Add the ingress runbook entry-point and reference the canonical public endpoint.
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/clever-deploy-control/docs/runbooks/2026-04-07-prod-cutover-checklist.md`
  - Replace temporary ingress assumptions with the new formal ingress gates once the workflow exists.

## Task 1: Make the gateway ALB-ready

**Files:**
- Modify: `development/edge-api-gateway/nginx.conf`
- Modify: `development/integration-local-stack/docker-compose.account-driver-settlement.yml`
- Modify: `development/integration-local-stack/compose/README.md`

- [ ] **Step 1: Define the gateway health contract in config**

Add a dedicated lightweight endpoint to the gateway config:

```nginx
location = /healthz {
    access_log off;
    add_header Content-Type text/plain;
    return 200 "ok\n";
}
```

Also preserve forwarded headers for ALB traffic:

```nginx
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Real-IP $remote_addr;
```

- [ ] **Step 2: Add a compose healthcheck for the gateway**

Add a gateway service healthcheck in:
`development/integration-local-stack/docker-compose.account-driver-settlement.yml`

Example:

```yaml
healthcheck:
  test: ["CMD", "wget", "-qO-", "http://127.0.0.1:8080/healthz"]
  interval: 10s
  timeout: 3s
  retries: 5
```

- [ ] **Step 3: Document the new canonical health path**

Update:
`development/integration-local-stack/compose/README.md`

Document:
- gateway health path: `/healthz`
- intended ALB target path
- canonical public root and API examples

- [ ] **Step 4: Verify the Nginx config syntax**

Run:

```bash
docker run --rm -v development/edge-api-gateway/nginx.conf:/etc/nginx/nginx.conf:ro nginx:stable nginx -t
```

Expected:
- `syntax is ok`
- `test is successful`

- [ ] **Step 5: Verify the compose file syntax**

Run:

```bash
docker compose -f development/integration-local-stack/docker-compose.account-driver-settlement.yml config >/tmp/clever-compose.out
```

Expected:
- command exits `0`
- rendered config includes gateway healthcheck

- [ ] **Step 6: Commit**

```bash
git -C . add \
  development/edge-api-gateway/nginx.conf \
  development/integration-local-stack/docker-compose.account-driver-settlement.yml \
  development/integration-local-stack/compose/README.md
git -C . commit -m "feat: add gateway ingress health contract"
```

## Task 2: Add an idempotent ingress provisioning workflow

**Files:**
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/clever-deploy-control/scripts/deploy/provision-public-ingress.sh`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/clever-deploy-control/.github/workflows/provision-public-ingress.yml`

- [ ] **Step 1: Write the shell script skeleton with strict mode and inputs**

Create:
`/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/clever-deploy-control/scripts/deploy/provision-public-ingress.sh`

Script contract should require:
- `AWS_REGION`
- `ENVIRONMENT`
- `DOMAIN_NAME`
- `HOSTED_ZONE_ID`
- `VPC_ID`
- `SUBNET_IDS`
- `ALB_SECURITY_GROUP_ID`
- `APP_HOST_SECURITY_GROUP_ID`
- `APP_HOST_TAG_ENV`
- `TARGET_PORT`

Start with:

```bash
#!/usr/bin/env bash
set -euo pipefail
```

- [ ] **Step 2: Add idempotent ACM + ALB + target group + listener logic**

Implement lookup-or-create behavior for:
- ACM certificate request / reuse
- internet-facing ALB
- target group for gateway port `8080`
- `80 -> 443` redirect listener
- `443` forward listener
- target registration for the app-host resolved by tags

Use CLI queries that can be re-run safely.

- [ ] **Step 3: Add SG cutover logic**

In the same script:
- authorize ALB SG inbound `80/443` from internet
- authorize app-host SG inbound `8080` from ALB SG
- prepare a flag-driven cleanup path to revoke temporary `0.0.0.0/0 -> 8080` only after smoke passes

Do not remove the temporary rule before the verification step exists.

- [ ] **Step 4: Add Route53 alias step**

Create or update the host record for `hub.evnlogistics.com` as an ALB alias record.

Keep the script idempotent so repeated runs reconcile instead of duplicating resources.

- [ ] **Step 5: Add a manual workflow wrapper**

Create:
`/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/clever-deploy-control/.github/workflows/provision-public-ingress.yml`

Inputs should include:
- `environment`
- `aws_region`
- `domain_name`
- `hosted_zone_id`
- `vpc_id`
- `subnet_ids`
- `alb_security_group_id`
- `app_host_security_group_id`
- `target_port`
- `retire_temporary_8080`

Use:
- `actions/checkout@v6.0.2`
- `aws-actions/configure-aws-credentials@v6.1.0`

- [ ] **Step 6: Verify the new shell script parses**

Run:

```bash
bash -n /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/clever-deploy-control/scripts/deploy/provision-public-ingress.sh
```

Expected:
- exit `0`

- [ ] **Step 7: Verify the workflow YAML renders cleanly**

Run:

```bash
python - <<'PY'
import yaml, pathlib
path = pathlib.Path('/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/clever-deploy-control/.github/workflows/provision-public-ingress.yml')
yaml.safe_load(path.read_text())
print('yaml-ok')
PY
```

Expected:
- `yaml-ok`

- [ ] **Step 8: Commit**

```bash
git -C /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/clever-deploy-control add \
  .github/workflows/provision-public-ingress.yml \
  scripts/deploy/provision-public-ingress.sh
git -C /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/clever-deploy-control commit -m "feat: add public ingress provisioning workflow"
```

## Task 3: Add verification and operator runbooks

**Files:**
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/clever-deploy-control/scripts/deploy/verify-public-ingress.sh`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/clever-deploy-control/docs/runbooks/public-ingress-runbook.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/clever-deploy-control/docs/runbooks/deploy-runbook.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/clever-deploy-control/docs/runbooks/2026-04-07-prod-cutover-checklist.md`

- [ ] **Step 1: Write the public ingress smoke script**

Create:
`/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/clever-deploy-control/scripts/deploy/verify-public-ingress.sh`

The script should verify:
- `GET /healthz`
- `GET /`
- `GET /api/org/companies/public/`

Expected status:
- all `200`

Example structure:

```bash
#!/usr/bin/env bash
set -euo pipefail
curl -fsS "https://${DOMAIN_NAME}/healthz" >/dev/null
curl -fsS "https://${DOMAIN_NAME}/" >/dev/null
curl -fsS "https://${DOMAIN_NAME}/api/org/companies/public/" >/dev/null
```

- [ ] **Step 2: Write the ingress runbook**

Create:
`/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/clever-deploy-control/docs/runbooks/public-ingress-runbook.md`

Document:
- required AWS inputs
- workflow inputs
- expected created resources
- smoke procedure
- temporary `8080` retirement procedure
- rollback procedure if ALB cutover fails

- [ ] **Step 3: Link the runbook from existing operator docs**

Modify:
- `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/clever-deploy-control/docs/runbooks/deploy-runbook.md`
- `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/clever-deploy-control/docs/runbooks/2026-04-07-prod-cutover-checklist.md`

Replace generic ingress TODOs with explicit references to the new workflow and runbook.

- [ ] **Step 4: Verify both shell scripts parse**

Run:

```bash
bash -n /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/clever-deploy-control/scripts/deploy/provision-public-ingress.sh
bash -n /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/clever-deploy-control/scripts/deploy/verify-public-ingress.sh
```

Expected:
- both commands exit `0`

- [ ] **Step 5: Commit**

```bash
git -C /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/clever-deploy-control add \
  scripts/deploy/verify-public-ingress.sh \
  docs/runbooks/public-ingress-runbook.md \
  docs/runbooks/deploy-runbook.md \
  docs/runbooks/2026-04-07-prod-cutover-checklist.md
git -C /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/clever-deploy-control commit -m "docs: add public ingress verification runbook"
```

## Task 4: Execute the dev ingress cutover

**Files:**
- Use: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/clever-deploy-control/.github/workflows/provision-public-ingress.yml`
- Use: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/clever-deploy-control/scripts/deploy/verify-public-ingress.sh`
- Modify if needed: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/clever-deploy-control/docs/runbooks/public-ingress-runbook.md`

- [ ] **Step 1: Run the gateway deploy after Task 1 lands**

Run:

```bash
gh workflow run "Central MSA Deploy Dispatch" \
  -R EVNSolution/clever-deploy-control \
  -f environment=dev \
  -f targets=edge-api-gateway \
  -f dry_run=false
```

Expected:
- workflow finishes `success`

- [ ] **Step 2: Run the ingress provisioning workflow without retiring temporary `8080`**

Run:

```bash
gh workflow run "Provision Public Ingress" \
  -R EVNSolution/clever-deploy-control \
  -f environment=dev \
  -f aws_region=ap-northeast-2 \
  -f domain_name=hub.evnlogistics.com \
  -f hosted_zone_id=Z076700617WGX6BQVRJS0 \
  -f vpc_id=vpc-015c89247f96e9221 \
  -f subnet_ids=subnet-08a44476ad1e1d81b,subnet-0738efee37ad66209 \
  -f alb_security_group_id=sg-0c99cc1e90d4a00bd \
  -f app_host_security_group_id=sg-0fa02ce5fa2ef7911 \
  -f target_port=8080 \
  -f retire_temporary_8080=false
```

Expected:
- ACM, ALB, target group, listeners, and Route53 alias are provisioned or reconciled

- [ ] **Step 3: Run the public ingress smoke check**

Run:

```bash
DOMAIN_NAME=hub.evnlogistics.com \
/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/clever-deploy-control/scripts/deploy/verify-public-ingress.sh
```

Expected:
- script exits `0`

- [ ] **Step 4: Retire the temporary public `8080` rule**

Re-run the ingress provisioning workflow with:

```text
retire_temporary_8080=true
```

Expected:
- ALB remains healthy
- direct `0.0.0.0/0 -> 8080` exposure is removed

- [ ] **Step 5: Record cutover evidence**

Update:
`/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/clever-deploy-control/docs/runbooks/public-ingress-runbook.md`

Record:
- ALB ARN
- target group ARN
- ACM certificate ARN
- Route53 record name
- GitHub Actions run URL
- smoke-check results

- [ ] **Step 6: Commit**

```bash
git -C /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/clever-deploy-control add docs/runbooks/public-ingress-runbook.md
git -C /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/clever-deploy-control commit -m "docs: record dev ingress cutover evidence"
```

## Task 5: Prepare the handoff for production ingress

**Files:**
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/clever-deploy-control/docs/runbooks/2026-04-07-prod-cutover-checklist.md`
- Modify: `docs/superpowers/specs/2026-04-08-production-cutover-design.md`

- [ ] **Step 1: Replace temporary ingress assumptions in the prod checklist**

Update:
`/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/clever-deploy-control/docs/runbooks/2026-04-07-prod-cutover-checklist.md`

Make the checklist explicitly require:
- ALB
- ACM
- Route53 alias
- no direct public `8080`

- [ ] **Step 2: Link the production cutover design back to the implemented ingress path**

Update:
`docs/superpowers/specs/2026-04-08-production-cutover-design.md`

Add references to:
- the ingress workflow
- the public ingress runbook
- the dev cutover evidence

- [ ] **Step 3: Verify document links and commands**

Run:

```bash
rg -n "Provision Public Ingress|public-ingress-runbook|8080" \
  /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/clever-deploy-control/docs/runbooks \
  docs/superpowers/specs
```

Expected:
- the new ingress workflow and runbook are referenced from both production-oriented documents

- [ ] **Step 4: Commit**

```bash
git -C /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/clever-deploy-control add docs/runbooks/2026-04-07-prod-cutover-checklist.md
git -C /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/clever-deploy-control commit -m "docs: require formal ingress for production cutover"
```

```bash
git -C . add docs/superpowers/specs/2026-04-08-production-cutover-design.md
git -C . commit -m "docs: link production cutover to ingress implementation"
```
