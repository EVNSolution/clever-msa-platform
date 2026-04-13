# SKILL: Local Project → AWS Auto-Deploy

Deploy a locally-running project to AWS with automated CI/CD.
Follow each Phase sequentially.

---

## Agent Rules (MUST follow)

- **No Assumption**: Never guess user environment (DB passwords, domains, regions). Always ask.
- **Step-by-Step**: Do NOT process all Phases at once. After each Phase, show Context Memo and ask "Proceed to next Phase?"
- **Context Memory**: Before starting any Phase, re-summarize Phase 1 settings and confirm with user. (e.g., re-check domain availability before Phase 5 Nginx config)
- **Security First**: Never expose real AWS Access Keys, passwords, or ARNs in code. For GitHub Actions -> AWS auth, prefer GitHub OIDC with role references by purpose such as `${{ vars.GH_ACTIONS_ECR_BUILD_ROLE_ARN }}`, `${{ secrets.GH_ACTIONS_INFRA_ROLE_ARN }}`, and `${{ secrets.GH_ACTIONS_<ENV>_DEPLOY_ROLE_ARN }}`. Do not use long-lived AWS access keys. RDS SG must block all inbound by default; only Fargate SG allowed.
- **Validation**: After generating CDK code, self-review against Phase 2 Context Memo specs. Verify region matches, RDS SG is not open to 0.0.0.0/0, and `publiclyAccessible` + SG block are both applied.
- **Idempotency**: Do not comment out or backup original code. Output final complete files. If AWS integration code already exists, modify it instead of duplicating.
- **Migration Safety**: If `DROP TABLE` or `ALTER COLUMN` (type change) is found in SQL, warn user about data loss risk and get confirmation before proceeding.
- **Post-Deploy Entry**: If the project already has `infra/`, `.github/workflows/`, and `Dockerfile` (i.e., initial deployment is complete), skip Phase 1–10 and go directly to Phase 11. Identify the change type from user's request and jump to the relevant section (11-1 through 11-10).

---

## Prerequisites (already completed)

- Common:
  - CDK Bootstrap executed (once per account+region)
- Preferred mode for this guide:
  - GitHub OIDC Provider registered (once per AWS account)
  - IAM roles created by purpose (ECR build, infra provision, deploy per environment)
  - GitHub org/repo config registered
    - org variable `GH_ACTIONS_ECR_BUILD_ROLE_ARN`
    - repo or org secrets `GH_ACTIONS_INFRA_ROLE_ARN`, `GH_ACTIONS_DEV_DEPLOY_ROLE_ARN`, `GH_ACTIONS_STAGE_DEPLOY_ROLE_ARN`, `GH_ACTIONS_PROD_DEPLOY_ROLE_ARN`
- Optional later-phase alternative:
  - AWS CodeConnections connection approved for the target GitHub repository/org
  - CodePipeline service role created
  - CodeBuild service role created
  - CDK deploy / CloudFormation execution roles created

---

## Integration Mode

- **Preferred for new ECS/CDK deployments**: GitHub Actions + GitHub OIDC role assumption + CDK deploy to ECS/Fargate
- **CLEVER current rollout truth**: existing platform-wide deploy automation is GitHub Actions + OIDC + EC2/SSM/compose. Reuse that auth/control model when moving a workload to ECS/CDK
- **Optional later-phase alternative**: AWS CodeConnections (GitHub App for AWS) + CodePipeline/CodeBuild
- Do **not** mix the two patterns in one example. Decide the control plane first, then generate only that path

---

## Phase 1: User Questions

Ask the user:

1. **GitHub repo path** (owner/repo)
2. **Deploy branches** (test branch, prod trigger method)
3. **AWS region** (default: ap-northeast-2)
4. **Domain availability**
   - Yes: domain name + Route53 Hosted Zone ID
   - No: HTTP only (EFS pre-attached for future HTTPS)

### Context Memo Example
```
[Context Memo]
- Repo: EVNSolution/TEST-SH
- Branches: develop (test), master (prod, manual trigger)
- Region: ap-northeast-2
- Domain: test-sh.evnlogistics.com (Hosted Zone: Z076700617WGX6BQVRJS0)
```
→ Confirm with user, then proceed to Phase 2

---

## Phase 2: Code Analysis + AWS Service Proposal

### 2-1. Project Analysis
Read these files first:
- `package.json` / `requirements.txt` / `go.mod` (dependencies)
- `.env.example` / `.env` (environment variables)
- Entrypoint files (port, DB connection)
- Build config (`tsconfig.json`, `vite.config.ts`, etc.)

Report in table format:

| Item | Value |
|---|---|
| Language | TypeScript |
| Framework | Express + React (Vite) |
| Runtime | Node.js 20 |
| Build command | `npm run build` |
| App port | 3001 |
| Current DB | SQLite (better-sqlite3) |
| Session | express-session (in-memory) |
| Env vars | PORT, DATABASE_FILE, SESSION_SECRET |

### 2-2. AWS Service Replacement Proposals
Identify replaceable components and propose to user:

| Current | AWS Service Proposal |
|---|---|
| SQLite / file DB | RDS (PostgreSQL / MySQL) |
| Local file storage | S3 |
| In-memory session | ElastiCache Redis |
| Email sending | SES |
| Cron jobs | EventBridge + Lambda |
| Other | Context-dependent |

### 2-3. Spec Questions + Recommendations per Service
For each selected AWS service, ask specs with recommendations:

- **RDS**: Instance type → Recommend: `t4g.micro` (~$12/mo, sufficient for small apps)
- **Fargate**: CPU/Memory → Recommend: `0.25 vCPU / 512MB` (~$10/mo)
- **ElastiCache**: Node type → Recommend: `cache.t4g.micro` (~$12/mo)

### 2-4. Environment Variable Collection
Collect only user-specified values (API keys, external URLs).
- Do NOT ask for auto-generated values (DB password, session secret).
- Map existing env var key names to Secrets Manager key names in Phase 4.

### Updated Context Memo
```
[Context Memo]
- Repo: EVNSolution/TEST-SH
- Branches: develop (test), master (prod, manual)
- Region: ap-northeast-2
- Domain: test-sh.evnlogistics.com
- Language: TypeScript / Node.js 20
- Framework: Express + React (Vite)
- Build: npm run build
- Port: 3001
- AWS Services:
  - RDS PostgreSQL t4g.micro (replaces SQLite)
  - Fargate 0.25 vCPU / 512MB
  - EFS (cert storage)
- User env vars: (none or list)
- Estimated cost: ~$26/mo
```
→ Confirm with user, then proceed to Phase 3

---

## Phase 3: Resource Conflict Handling

Resource conflicts are handled automatically by CDK/CloudFormation during deployment. No local AWS CLI checks needed.

### How Conflicts Are Detected
- **CloudFormation**: CDK deploy detects existing stack names and either updates or fails with clear error
- **Secrets Manager**: Fails on duplicate name (including secrets in deletion pending state — 7 day retention)
- **Route53**: UPSERT in entrypoint.sh handles existing records automatically
- **ECR**: CDK Bootstrap ECR repo is checked during `cdk deploy`

### When Deployment Fails Due to Conflicts
Agent should ask user for the GitHub Actions error log and diagnose:

1. **Secrets Manager `already exists`** → Secret is in deletion pending state. Wait 7 days or ask user to force-delete via AWS Console
2. **CloudFormation `ROLLBACK_COMPLETE`** → Previous failed stack remains. Delete via AWS Console, then redeploy
3. **CloudFormation `CREATE_IN_PROGRESS` / `UPDATE_IN_PROGRESS`** → Stack operation ongoing. Wait for completion
4. **ECR repo not found** → CDK Bootstrap not executed. Guide user to run `cdk bootstrap`

→ Confirm with user, then proceed to Phase 4

---

## Phase 4: Code Conversion (if needed)

Convert code for user-selected AWS services:

1. DB driver replacement (e.g., `better-sqlite3` → `pg`)
2. Connection code (sync → async)
3. Migration DDL conversion (PostgreSQL syntax)
4. Seed data conversion
5. Repository/Service layer conversion
6. Config: env-var-based connection info
7. Other AWS service integrations

### Code Conversion Rules
- Do NOT comment out or backup original code → output final complete files
- Preserve existing logic; only replace necessary parts (DB connection, etc.)
- If AWS integration code already exists, modify instead of duplicating
- Do NOT delete existing test code

→ Show changed file list, confirm with user, then proceed to Phase 5

---

## Phase 5: Dockerization

**Re-confirm Context Memo**: domain availability, port, runtime version

1. **Dockerfile** (multi-stage build: build stage runs `npm install` + `npm run build`, runtime stage copies build output into Alpine with Nginx + certbot + aws-cli + Node.js)
   - Use `npm install` (NOT `npm ci` — prevents lock file mismatch)
   - Specify `linux/amd64` via `docker buildx` (for ARM Mac compatibility)
   - Include `HEALTHCHECK` instruction: `HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD curl -f http://localhost:<port>/api/health || exit 1`
   - **Alpine `apk add` MUST include `gettext`** — provides `envsubst` command used by entrypoint.sh to substitute `${DOMAIN}` in nginx-ssl.conf.template. Missing this causes `envsubst: command not found` crash when SSL activation is attempted.
2. **.dockerignore**
3. **Nginx config** (`/etc/nginx/http.d/` — Alpine)
   - HTTP: reverse proxy to Node.js app (default, always works)
   - SSL config template: activated by entrypoint.sh after cert issuance (HTTPS + HTTP→HTTPS redirect)
   - Let's Encrypt cert paths
   - No domain: HTTP-only proxy
4. **entrypoint.sh**
   - With domain: Route53 A record update (current public IP) + Let's Encrypt cert issue/renew + auto-renew every 12h
   - Without domain: HTTP-only Nginx
   - **Cert issue order (Race Condition prevention)**: If no cert exists, start Nginx on port 80 only → certbot issue → reload Nginx with SSL config. Nginx WILL FAIL to start if SSL paths are configured without certs.
   - **Cert issue retry**: DNS propagation or Route53 update delay may cause certbot failure. Include retry logic: 30s interval, max 5 attempts.
   - **EFS mount permissions**: After EFS mount, run `chown -R nginx:nginx /etc/letsencrypt` (or the relevant cert path) so the Nginx process (uid 100/101 in Alpine) can read/write certificates.
   - **Startup order (CRITICAL)**: Start Node.js in background → wait for health check (`/api/health`) success → Route53 A record update → certbot → SSL reload. This prevents: (a) crashed tasks from polluting DNS (race condition), (b) certbot running before DNS record exists (NXDOMAIN → rate limit).
   - **HTTP fallback**: Nginx MUST proxy to Node.js on HTTP when SSL cert is not yet available. Do NOT redirect all HTTP to HTTPS unconditionally — certbot failure or rate limit will make the site completely inaccessible.
   - **Let's Encrypt rate limit awareness**: Failed authorizations are limited to 5 per domain per hour. If certbot fails repeatedly (e.g., DNS not ready), the domain gets rate-limited and no cert can be issued for ~1 hour. The only fix is to wait; infrastructure recreation does NOT reset the limit.
   - **Dockerfile runtime stage**: MUST copy ALL config files needed at runtime (e.g., `nginx-ssl.conf.template`). Multi-stage builds only carry over explicitly copied files.
5. **Always include EFS mount + Nginx structure** even without domain (future HTTPS readiness)

→ Confirm with user, then proceed to Phase 6

---

## Phase 6: CDK Infrastructure Code

**Re-confirm Context Memo**: selected AWS services, specs, region, domain

### 6-1. Directory Structure
```
infra/
  bin/app.ts
  lib/app-stack.ts
  cdk.json
  tsconfig.json
  package.json
```

### 6-1a. infra/package.json Required Dependencies
- `devDependencies` MUST include `@types/node`, `ts-node`, and `typescript` explicitly. GitHub Actions Runner uses `npx ts-node` to execute CDK — if `ts-node` is not a local dependency, npx downloads a separate version that does NOT share the project's `@types/node`, causing `Cannot find name 'process'` errors.
- `infra/tsconfig.json` MUST include `"types": ["node"]` in `compilerOptions`.

### 6-1b. .gitignore for CDK Build Output
- MUST add `infra/cdk.out/` and `infra/cdk.context.json` to the project's `.gitignore` BEFORE the first commit. CDK synth generates large build artifacts in `cdk.out/` that should never be committed.

### 6-2. app-stack.ts
- **VPC**: NAT Gateway 0, public + private isolated subnets, `enableDnsHostnames: true`, `enableDnsSupport: true` (RDS endpoint DNS resolution requires both)
- **User-selected AWS services**: RDS, S3, ElastiCache, etc.
- **ECS Fargate**: **MUST be placed in Public Subnet** with `assignPublicIp: true`. Without NAT Gateway, placing in Private Isolated Subnet makes ECR pull impossible (infinite PENDING). Ports 80/443 open.
- **EFS**: Cert storage (always included). Verify mount path permissions are root(0). **EFS Mount Targets MUST be created in the same Public Subnets where Fargate tasks run.**
- **Secrets Manager**: Auto-generated (session secret, DB credentials). Inject into Fargate containers via `ecs.Secret.fromSecretsManager()` as environment variables.
- **CRITICAL — Secret Value Injection**: NEVER use `secretValueFromJson().unsafeUnwrap()` to construct connection strings (e.g., DATABASE_URL) in CDK code. At synth time, `unsafeUnwrap()` resolves to a CloudFormation token (not the actual value), producing an invalid connection string that crashes the app at runtime. Instead:
  - Pass static connection info (host, port, dbname) as plain `environment` variables
  - Pass credentials (username, password) via `ecs.Secret.fromSecretsManager(secret, 'jsonKey')` as individual `secrets`
  - Assemble the full connection string in application code (e.g., `config.ts`) from these individual env vars
- **Security Groups**:
  - Fargate: Only 80, 443 open (all other ports blocked)
  - RDS: Only Fargate SG allowed inbound
- **CloudWatch Logs**: Create Log Group and configure `logDriver: ecs.LogDrivers.awsLogs({ streamPrefix: '<repo-name>' })` on the container definition.
- **IAM**:
  - Task Role: Route53 update + EC2 SG permissions (hole-punching, record updates)
  - Task Execution Role: ECR pull + CloudWatch Logs permissions
  - Do NOT confuse these two roles
- **RDS Access Strategy**: With NAT Gateway 0, for external sync (pg_dump), set RDS `publiclyAccessible: true` but block ALL inbound in SG. Only allow GitHub Runner IP temporarily during deployment. (Private Isolated Subnet has no internet gateway route, so SG hole-punching alone won't work.)
- **RDS Subnet**: When using `publiclyAccessible: true`, place RDS in Public Subnet. Control access via SG.
- **RDS Prod**: `deletionProtection: true`, `removalPolicy: RETAIN`
- **RDS Instance Identifier**: `{test|prod}-{repo-name}-db` format with STAGE prefix

### 6-3. bin/app.ts
- Stack name: `{test|prod}-{repo-name}`
- `STAGE` env var for test/prod branching
- Per-environment domain mapping (user-specified)

### 6-4. Self-Review
Auto-verify after CDK code generation:
- Fargate CPU/Memory matches Context Memo
- Fargate `assignPublicIp: true` is set
- RDS instance type matches
- Region in CDK code matches Context Memo region
- Domain configuration
- RDS SG blocks all inbound by default (NOT open to `0.0.0.0/0`)
- RDS is in Public Subnet with `publiclyAccessible: true` + SG blocks ALL inbound (NAT-less architecture requires this for GitHub Runner pg_dump access; security is enforced via SG, not subnet isolation)
- Node.js memory limit (recommend `NODE_OPTIONS=--max-old-space-size=450` for 0.25 vCPU / 512MB)
- `infra/package.json` devDependencies includes `@types/node`, `ts-node`, `typescript`
- `infra/tsconfig.json` has `"types": ["node"]`
- `.gitignore` includes `infra/cdk.out/` and `infra/cdk.context.json`
- No `unsafeUnwrap()` usage — DB credentials injected via `ecs.Secret.fromSecretsManager(secret, 'jsonKey')`
- Report mismatches to user and fix

### 6-5. Warnings
- RDS `databaseName`: No PostgreSQL reserved words
- Fargate → RDS: SSL required. Use AWS RDS CA certificate bundle (`rds-combined-ca-bundle.pem`) for production. `rejectUnauthorized: false` is acceptable for development convenience only — **warn user about MITM risk if used in production**.
- ECR image tag: MUTABLE
- CDK DockerImageAsset handles build+push; no separate ECR creation needed
- **ECR Lifecycle Policy**: Add lifecycle rule to auto-delete old untagged images (cost savings). Example: `repository.addLifecycleRule({ maxImageCount: 5, rulePriority: 1, tagStatus: ecr.TagStatus.ANY })` — keep only the 5 most recent images.
- Missing `assignPublicIp: true` → Fargate cannot pull ECR images → infinite PENDING

→ Show Self-Review results, confirm with user, then proceed to Phase 7

---

## Phase 7: CI/CD Integration

### 7-0. Preferred Path for New ECS/CDK Projects: GitHub Actions + OIDC

Use this path when the user wants ECS/Fargate + CDK but wants to stay aligned with the current CLEVER GitHub-hosted control plane.

Recommended chain:

```text
GitHub repo
-> GitHub Actions
-> OIDC role assume
-> ECR image push
-> CDK deploy
-> ECS/Fargate
```

Rules:

- Reuse purpose-specific GitHub role references such as `${{ vars.GH_ACTIONS_ECR_BUILD_ROLE_ARN }}` and `${{ secrets.GH_ACTIONS_<ENV>_DEPLOY_ROLE_ARN }}`
- Keep ECR, ECS, CloudWatch, and CDK deploy target in the **same AWS region** as the OIDC-assumed role unless the user explicitly wants cross-region complexity
- Prefer one repo-local ECS/CDK workflow per service first; do not rewrite the whole platform control plane in one step
- Prefer a pilot rollout on one ECS/CDK workload first; do not switch every repo in one step

Typical moving parts:

- GitHub Actions workflow for test/build/image push
- GitHub Actions workflow for `cd infra && npx cdk deploy`
- OIDC trust policy and environment-specific deploy roles
- ECR repository
- ECS/Fargate service and task definition managed by CDK
- Manual approval before prod through GitHub Environment rules

### 7-0a. Later-Phase Alternative: CodeConnections

Use this only when the user explicitly wants AWS-native pipeline ownership.

- AWS CodeConnections (GitHub App for AWS)
- CodePipeline
- CodeBuild
- CDK deploy from AWS side
- This is a later-phase option for CLEVER, not the default

### 7-1. deploy-test.yml (develop push → auto)
```yaml
name: Deploy Test
on:
  push:
    branches: [develop]
permissions:
  id-token: write
  contents: read
jobs:
  deploy:
    runs-on: ubuntu-latest
    timeout-minutes: 60
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.GH_ACTIONS_DEV_DEPLOY_ROLE_ARN }}
          aws-region: <region>
      - name: Sync Prod DB to Test
        run: |
          # Install postgresql-client for pg_dump/pg_restore
          sudo apt-get update && sudo apt-get install -y postgresql-client
          RUNNER_IP=$(curl -s https://checkip.amazonaws.com)

          # Cleanup function — MUST revoke SG rules even on failure
          cleanup() {
            echo "Cleaning up SG rules..."
            [ -n "$PROD_SG" ] && aws ec2 revoke-security-group-ingress \
              --group-id "$PROD_SG" --protocol tcp --port 5432 \
              --cidr "$RUNNER_IP/32" 2>/dev/null || true
            [ -n "$TEST_SG" ] && aws ec2 revoke-security-group-ingress \
              --group-id "$TEST_SG" --protocol tcp --port 5432 \
              --cidr "$RUNNER_IP/32" 2>/dev/null || true
          }
          trap cleanup EXIT

          PROD_DB=$(aws rds describe-db-instances \
            --query "DBInstances[?DBInstanceIdentifier=='prod-<repo>-db'].DBInstanceIdentifier" \
            --output text 2>/dev/null || true)
          if [ -n "$PROD_DB" ] && [ "$PROD_DB" != "None" ]; then
            # Hole-punch Prod RDS SG
            PROD_SG=$(aws rds describe-db-instances \
              --db-instance-identifier "prod-<repo>-db" \
              --query "DBInstances[0].VpcSecurityGroups[0].VpcSecurityGroupId" \
              --output text)
            aws ec2 authorize-security-group-ingress \
              --group-id "$PROD_SG" --protocol tcp --port 5432 \
              --cidr "$RUNNER_IP/32" --tag-specifications 'ResourceType=security-group-rule,Tags=[{Key=temp,Value=github-actions}]'

            # Hole-punch Test RDS SG
            TEST_SG=$(aws rds describe-db-instances \
              --db-instance-identifier "test-<repo>-db" \
              --query "DBInstances[0].VpcSecurityGroups[0].VpcSecurityGroupId" \
              --output text)
            aws ec2 authorize-security-group-ingress \
              --group-id "$TEST_SG" --protocol tcp --port 5432 \
              --cidr "$RUNNER_IP/32" --tag-specifications 'ResourceType=security-group-rule,Tags=[{Key=temp,Value=github-actions}]'

            echo "Syncing Prod data to Test DB"
            PROD_HOST=$(aws rds describe-db-instances --db-instance-identifier "prod-<repo>-db" \
              --query "DBInstances[0].Endpoint.Address" --output text)
            TEST_HOST=$(aws rds describe-db-instances --db-instance-identifier "test-<repo>-db" \
              --query "DBInstances[0].Endpoint.Address" --output text)
            PROD_SECRET=$(aws secretsmanager get-secret-value --secret-id prod-<repo>-db-credentials \
              --query SecretString --output text)
            TEST_SECRET=$(aws secretsmanager get-secret-value --secret-id test-<repo>-db-credentials \
              --query SecretString --output text)
            PROD_PASS=$(echo "$PROD_SECRET" | jq -r '.password')
            TEST_PASS=$(echo "$TEST_SECRET" | jq -r '.password')
            DB_NAME="<database_name>"
            PGPASSWORD="$PROD_PASS" pg_dump -h "$PROD_HOST" -U postgres -d "$DB_NAME" --no-owner --clean --if-exists > /tmp/dump.sql
            PGPASSWORD="$TEST_PASS" psql -h "$TEST_HOST" -U postgres -d "$DB_NAME" < /tmp/dump.sql
          else
            echo "No Prod DB found, skipping sync"
          fi
          # trap EXIT handles cleanup automatically
      - name: Run Migration
        run: |
          # Run migration as ECS RunTask BEFORE service update
          # Dynamically resolve subnet/SG from existing ECS service (no hardcoding)
          CLUSTER=$(aws ecs list-clusters --query "clusterArns[?contains(@,'test-<repo>')]" --output text)
          if [ -n "$CLUSTER" ]; then
            TASK_DEF=$(aws ecs list-task-definitions --family-prefix test-<repo>-migration --sort DESC --max-items 1 --query "taskDefinitionArns[0]" --output text 2>/dev/null || true)
            if [ -n "$TASK_DEF" ] && [ "$TASK_DEF" != "None" ]; then
              SVC_NAME=$(aws ecs list-services --cluster "$CLUSTER" --query "serviceArns[0]" --output text)
              NET_CFG=$(aws ecs describe-services --cluster "$CLUSTER" --services "$SVC_NAME" \
                --query "services[0].networkConfiguration.awsvpcConfiguration" --output json)
              SUBNETS=$(echo "$NET_CFG" | jq -r '.subnets | join(",")')
              SGS=$(echo "$NET_CFG" | jq -r '.securityGroups | join(",")')
              aws ecs run-task --cluster "$CLUSTER" --task-definition "$TASK_DEF" --launch-type FARGATE \
                --network-configuration "awsvpcConfiguration={subnets=[$SUBNETS],securityGroups=[$SGS],assignPublicIp=ENABLED}"
              echo "Migration task started"
            fi
          fi
      - name: Deploy
        run: |
          cd infra
          npm ci
          STAGE=test npx cdk deploy test-<repo> --require-approval never
```

### 7-2. deploy-prod.yml (manual trigger)
```yaml
name: Deploy Prod
on:
  workflow_dispatch:
permissions:
  id-token: write
  contents: read
jobs:
  deploy:
    runs-on: ubuntu-latest
    timeout-minutes: 60
    environment: prod
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.GH_ACTIONS_PROD_DEPLOY_ROLE_ARN }}
          aws-region: <region>
      - name: Snapshot Prod DB (rollback)
        run: |
          PROD_DB=$(aws rds describe-db-instances \
            --query "DBInstances[?DBInstanceIdentifier=='prod-<repo>-db'].DBInstanceIdentifier" \
            --output text 2>/dev/null || true)
          if [ -n "$PROD_DB" ] && [ "$PROD_DB" != "None" ]; then
            SNAPSHOT_ID="prod-rollback-$(date +%Y%m%d%H%M%S)"
            aws rds create-db-snapshot \
              --db-instance-identifier "$PROD_DB" \
              --db-snapshot-identifier "$SNAPSHOT_ID"
            aws rds wait db-snapshot-available \
              --db-snapshot-identifier "$SNAPSHOT_ID"
            echo "Rollback snapshot: $SNAPSHOT_ID"
          fi
      - name: Save Current Task Definition (rollback)
        run: |
          CLUSTER=$(aws ecs list-clusters --query "clusterArns[?contains(@,'prod-<repo>')]" --output text 2>/dev/null || true)
          if [ -n "$CLUSTER" ]; then
            SVC_ARN=$(aws ecs list-services --cluster "$CLUSTER" --query "serviceArns[0]" --output text 2>/dev/null || true)
            if [ -n "$SVC_ARN" ] && [ "$SVC_ARN" != "None" ]; then
              CURRENT_TD=$(aws ecs describe-services --cluster "$CLUSTER" --services "$SVC_ARN" \
                --query "services[0].taskDefinition" --output text)
              echo "ROLLBACK_TD=$CURRENT_TD" >> $GITHUB_ENV
              echo "ROLLBACK_CLUSTER=$CLUSTER" >> $GITHUB_ENV
              echo "ROLLBACK_SVC=$SVC_ARN" >> $GITHUB_ENV
            fi
          fi
      - name: Run Migration
        run: |
          # Dynamically resolve subnet/SG from existing ECS service (no hardcoding)
          CLUSTER=$(aws ecs list-clusters --query "clusterArns[?contains(@,'prod-<repo>')]" --output text)
          if [ -n "$CLUSTER" ]; then
            TASK_DEF=$(aws ecs list-task-definitions --family-prefix prod-<repo>-migration --sort DESC --max-items 1 --query "taskDefinitionArns[0]" --output text 2>/dev/null || true)
            if [ -n "$TASK_DEF" ] && [ "$TASK_DEF" != "None" ]; then
              SVC_NAME=$(aws ecs list-services --cluster "$CLUSTER" --query "serviceArns[0]" --output text)
              NET_CFG=$(aws ecs describe-services --cluster "$CLUSTER" --services "$SVC_NAME" \
                --query "services[0].networkConfiguration.awsvpcConfiguration" --output json)
              SUBNETS=$(echo "$NET_CFG" | jq -r '.subnets | join(",")')
              SGS=$(echo "$NET_CFG" | jq -r '.securityGroups | join(",")')
              aws ecs run-task --cluster "$CLUSTER" --task-definition "$TASK_DEF" --launch-type FARGATE \
                --network-configuration "awsvpcConfiguration={subnets=[$SUBNETS],securityGroups=[$SGS],assignPublicIp=ENABLED}"
              echo "Migration task started"
            fi
          fi
      - name: Deploy
        run: |
          cd infra
          npm ci
          STAGE=prod npx cdk deploy prod-<repo> --require-approval never
```

### 7-3. Prod Deploy Trigger
GitHub repo → **Actions** tab → **Deploy Prod** → **Run workflow**

### 7-4. Rollback Procedure
If Prod deploy fails or issues are found after deploy:
1. **App rollback**: `aws ecs update-service --cluster $ROLLBACK_CLUSTER --service $ROLLBACK_SVC --task-definition $ROLLBACK_TD --force-new-deployment` (all three env vars saved during deploy; `--force-new-deployment` ensures cached config is not reused)
2. **DB rollback**: Restore RDS from the auto-created snapshot (`prod-rollback-*`)
3. **Alternative**: Re-run GitHub Actions on the previous commit

### 7-5. GitHub Environment Setup (recommended)
- GitHub repo → Settings → Environments → Create `prod`
- Set **Required reviewers** for prod deploy approval
- `environment: prod` in deploy-prod.yml

### 7-6. CI/CD Architecture Diagram (NAT-less ECS Fargate)
```
┌─────────────────────────────────────────────────────────────────┐
│  GitHub Actions Runner (ubuntu-latest)                          │
│                                                                 │
│  ┌──────────┐   ┌──────────┐   ┌──────────────────────────┐    │
│  │ checkout  │──▶│ cdk synth│──▶│ cdk deploy               │    │
│  └──────────┘   └──────────┘   │  (Docker build+push→ECR) │    │
│                                 │  (CloudFormation update)  │    │
│  ┌──────────────────────┐      └──────────────────────────┘    │
│  │ DB Sync (test only)  │                                       │
│  │ ┌─────────────────┐  │      ┌──────────────────────────┐    │
│  │ │ SG hole-punch    │  │      │ ECS RunTask (migration)  │    │
│  │ │ pg_dump → restore│  │      │ (before service update)  │    │
│  │ │ SG revoke (trap) │  │      └──────────────────────────┘    │
│  │ └─────────────────┘  │                                       │
│  └──────────────────────┘                                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                    OIDC (purpose-specific role)
                              ▼
┌─────────────────── AWS (NAT Gateway = 0) ───────────────────────┐
│                                                                  │
│  ┌──────────── Public Subnet ──────────────────────────────┐    │
│  │                                                          │    │
│  │  ┌─────────────────┐    ┌──────────────┐                │    │
│  │  │ ECS Fargate     │    │ RDS Postgres │                │    │
│  │  │ (assignPublicIp)│───▶│ (publiclyAcc │                │    │
│  │  │                 │ SG │  essible=true│                │    │
│  │  │ ┌─────────────┐ │    │  SG: block   │                │    │
│  │  │ │ Nginx :80/443│ │    │  all inbound)│                │    │
│  │  │ │ Node.js :3001│ │    └──────────────┘                │    │
│  │  │ │ EFS mounted  │ │                                    │    │
│  │  │ └─────────────┘ │    ┌──────────────┐                │    │
│  │  └─────────────────┘    │ EFS (certs)  │                │    │
│  │                          │ Mount Target │                │    │
│  │                          └──────────────┘                │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────┐       │
│  │ ECR (images)│  │ Secrets Mgr  │  │ CloudWatch Logs   │       │
│  └─────────────┘  └──────────────┘  └───────────────────┘       │
│                                                                  │
│  ┌─────────────┐                                                 │
│  │ Route53     │──▶ domain → Fargate Public IP                  │
│  └─────────────┘                                                 │
└──────────────────────────────────────────────────────────────────┘
```

→ Confirm with user, then proceed to Phase 8

---

## Phase 8: Branch Strategy

1. Create `develop` branch
2. develop push → Test auto-deploy
3. Test QA complete → Prod manual trigger via GitHub Actions

→ Confirm with user, then proceed to Phase 9

---

## Phase 9: DB Migration Strategy

### Principles
- **Never overwrite** Prod data
- Migrations: **add/modify only**; deletions require manual approval
- Migration scripts must be **idempotent** (`IF NOT EXISTS`, `IF EXISTS`)
- `DROP TABLE`, `ALTER COLUMN` (type change) → warn user about data loss, get confirmation

### Migration File Structure
```
migrations/
  001_initial.sql
  002_add_column_x.sql
  003_rename_table_y.sql
```

### Deploy Flow
```
1. develop push detected
2. Prod DB → Test DB data sync (pg_dump/pg_restore)
   - RDS is in Public Subnet with publiclyAccessible but SG blocks all
   - Method A (recommended): Temp SG hole-punching — allow runner IP → work → revoke
   - Method B: VPC-internal temp Fargate Task for sync (large-scale/security-focused)
3. Test deploy (migration auto-run)
4. Test QA (verify migration on Prod data copy)
5. QA pass → Prod manual trigger
6. Prod RDS snapshot (rollback)
7. Prod migration + app deploy
8. If issues → restore Prod RDS from snapshot
```

### Migration Executor
- Do NOT run migrations at app startup (`sequelize.sync()`, `prisma migrate`, etc.)
- Use **separate One-off Task (ECS RunTask)** for migrations
- **Trigger migration BEFORE Fargate service update** to ensure schema is ready for the new app version
- Multiple Fargate tasks starting simultaneously can cause migration conflicts
- Run migration-only task once via CDK deploy process or GitHub Actions ECS RunTask

### First Deployment
No Prod RDS exists → skip data sync, initialize with seed data.

### Test DB Sync Methods
- **Default: `pg_dump`/`pg_restore`** — No CDK stack impact, completes in minutes
- **Alternative: RDS snapshot restore** — More stable for large DBs but 10-30min, requires deleting existing Test DB and restoring with same Identifier (CDK stack stability risk)
- Agent should propose both methods based on DB size and let user choose

### Safety Measures
- Column/table deletion: NOT in migrations → separate manual operation
- Column type change: Add new column → copy data → keep old column (staged)
- Auto RDS snapshot before Prod deploy → rollback possible
- Migration failure → abort deployment

→ Confirm with user, then proceed to Phase 10

---

## Phase 10: Verification + Deploy Result Loop

### 10-1. Pre-Deploy Checks (local)
| Step | Check | If Failed |
|---|---|---|
| 1 | Build check (`npm run build`) | Check tsconfig paths, missing dependencies |
| 2 | CDK synth (`cd infra && npx cdk synth`) | Check tsconfig, CDK dependency versions, env vars |
| 3 | `.gitignore` includes `infra/cdk.out/`, `infra/cdk.context.json` | Add before first commit |
| 4 | No `unsafeUnwrap()` in CDK code | Replace with individual env/secret injection |

### 10-2. Deploy + Result Confirmation
After pushing to trigger CI/CD, ask user:

> "배포가 완료되면 결과를 알려주세요:
> 1. GitHub Actions 워크플로우 성공/실패
> 2. 도메인 접속 가능 여부 (HTTPS/HTTP)
> 3. 로그인 등 기본 기능 동작 여부"

### 10-3. Troubleshooting Loop
If user reports failure, follow this diagnostic flow:

```
User reports failure
  ├─ GitHub Actions failed?
  │   ├─ Billing/spending limit error → switch repo to Public or increase limit
  │   ├─ `Cannot find name 'process'` → add @types/node + ts-node to infra/package.json
  │   ├─ `unsafeUnwrap()` / invalid DB URL → replace with individual env/secret injection
  │   └─ Other error → ask for error log → fix code/CDK → push again
  ├─ Stack deployed but ECS Circuit Breaker triggered (ROLLBACK_COMPLETE)?
  │   ├─ Delete failed stack via AWS Console/CLI first
  │   ├─ Check CloudWatch logs for task crash reason
  │   ├─ Common: invalid DATABASE_URL from unsafeUnwrap() → fix credential injection
  │   ├─ `envsubst: command not found` → add `gettext` to Dockerfile `apk add`
  │   └─ Fix → push → ask user to confirm again
  ├─ Stack deployed but domain not accessible?
  │   ├─ Check ECS service: running/pending/desired count
  │   ├─ If running: 0 → check CloudWatch logs for latest stopped task
  │   │   ├─ DB connection error → check SSL config, SG, credentials
  │   │   ├─ Missing file error → check Dockerfile COPY statements
  │   │   ├─ certbot error → check Route53 record, rate limit
  │   │   └─ App crash → check application logs for stack trace
  │   ├─ If running: 1 but not accessible → check DNS, Nginx config, SG ports
  │   └─ Fix → push → ask user to confirm again (repeat loop)
  ├─ HTTPS not working but HTTP works?
  │   └─ Check certbot logs: rate limit? DNS not ready? cert path?
  └─ App accessible but functionality broken?
      └─ Check migration ran, seed data, env vars injected
```

**CRITICAL**: After every fix, push the change and ask user to confirm the result. Do NOT assume the fix worked. Repeat this loop until user confirms all items in Post-Deploy Checklist (10-4) pass.

**Loop exit criteria**: User confirms BOTH:
1. GitHub Actions succeeded
2. Domain accessible (HTTPS or HTTP)

Only after both are confirmed, inform user that deployment is complete.

### 10-4. Post-Deploy Checklist
| Step | Check |
|---|---|
| 1 | GitHub Actions workflow succeeded |
| 2 | Domain accessible (HTTPS if cert issued, HTTP as fallback) |

---

## Anti-Pitfall Checklist

- [ ] GitHub Connection installed on **organization account** (not personal)
- [ ] PostgreSQL reserved word check (DB name: no `dispatch`, etc.)
- [ ] `package-lock.json` synced before push
- [ ] ECR image tag **MUTABLE**
- [ ] ECR image architecture: `docker buildx` with `linux/amd64` (ARM Mac compatibility)
- [ ] Fargate **MUST be in Public Subnet** + `assignPublicIp: true` (Private Subnet without NAT = no ECR pull)
- [ ] Fargate → RDS: **SSL required**. Prod: use RDS CA cert bundle (`rds-combined-ca-bundle.pem`). Dev only: `rejectUnauthorized: false` (MITM risk)
- [ ] Node.js `pg` library: `sslmode=require` in connection URL is interpreted as `verify-full`, causing `SELF_SIGNED_CERT_IN_CHAIN` error with RDS. **Strip `sslmode` from URL** and pass `ssl: { rejectUnauthorized: false }` as Pool option instead
- [ ] RDS: `publiclyAccessible: true` + **SG blocks ALL inbound** (only Runner IP allowed temporarily during deploy)
- [ ] RDS SG hole-punching: **MUST revoke temp rule** after sync — use `trap cleanup EXIT` in scripts
- [ ] DB Sync: Hole-punch **BOTH Prod AND Test** RDS SGs for Runner IP
- [ ] RDS Instance Identifier: `{test|prod}-{repo}-db` with STAGE prefix
- [ ] RDS Prod: `deletionProtection: true`
- [ ] Alpine Nginx config path: `/etc/nginx/http.d/` (NOT `conf.d/`)
- [ ] Alpine Dockerfile MUST `apk add gettext` — provides `envsubst` for SSL config template substitution. Without it, entrypoint.sh crashes on domain-enabled deployments
- [ ] Nginx cert Race Condition: No cert → port 80 temp → issue cert → SSL reload
- [ ] EFS mount path permissions: root(0), then `chown -R nginx:nginx` on cert path in entrypoint.sh
- [ ] Node.js memory: `NODE_OPTIONS=--max-old-space-size=450` for 0.25 vCPU / 512MB
- [ ] CloudFormation stack `CREATE_IN_PROGRESS` → cannot update → wait or delete via console
- [ ] `cdk deploy` for changes; **stack deletion is last resort**
- [ ] Secrets Manager duplicate name check
- [ ] `GH_ACTIONS_ECR_BUILD_ROLE_ARN` can be shared as an org variable for image builds
- [ ] `GH_ACTIONS_<ENV>_DEPLOY_ROLE_ARN` secrets must be set per deployment environment (`dev`, `stage`, `prod` as applicable)
- [ ] GitHub Environment `prod` + Required reviewers recommended
- [ ] GitHub Actions `timeout-minutes: 60` (RDS snapshot wait time)
- [ ] The deploy role used for DB sync must include `ec2:AuthorizeSecurityGroupIngress`, `ec2:RevokeSecurityGroupIngress`
- [ ] Migrations: One-off Task (ECS RunTask) **BEFORE Fargate service update**, NOT at app startup
- [ ] certbot cert issue retry logic: 30s interval, max 5 attempts
- [ ] entrypoint.sh startup order: Node.js (background) → health check pass → Route53 update → certbot. Never run Route53 or certbot before app is confirmed healthy
- [ ] Nginx HTTP fallback: when SSL cert is unavailable, proxy HTTP directly to app. Do NOT unconditionally redirect HTTP→HTTPS
- [ ] Let's Encrypt rate limit: 5 failed authorizations per domain per hour. Cannot be reset by infra recreation. Prevent by ensuring DNS record exists before certbot runs
- [ ] Dockerfile multi-stage: explicitly COPY all runtime config files (nginx templates, etc.) — they are NOT inherited from build stage
- [ ] GitHub Runner: Install `postgresql-client` in GitHub Actions for DB sync (pg_dump/pg_restore)
- [ ] Fargate container `HEALTHCHECK` instruction in Dockerfile
- [ ] EFS Mount Targets in same Public Subnets as Fargate tasks
- [ ] CloudWatch Log Group configured with `ecs.LogDrivers.awsLogs()`
- [ ] Secrets Manager → Fargate: inject via `ecs.Secret.fromSecretsManager()`, NOT runtime SDK call
- [ ] **NEVER use `unsafeUnwrap()`** to build connection strings in CDK — tokens are not real values at synth time. Pass host/port/dbname as `environment`, credentials as `secrets`, assemble URL in app code
- [ ] CDK `infra/package.json` devDependencies MUST include `@types/node`, `ts-node`, `typescript` explicitly — missing `@types/node` causes `Cannot find name 'process'` on GitHub Actions Runner
- [ ] CDK `infra/tsconfig.json` MUST include `"types": ["node"]` in compilerOptions
- [ ] `.gitignore` MUST include `infra/cdk.out/` and `infra/cdk.context.json` BEFORE first commit — CDK synth output should never be committed
- [ ] Rollback: Save current Task Definition ARN before deploy for quick rollback
- [ ] Migration RunTask: subnet/SG must be dynamically resolved via `aws ecs describe-services`, NOT hardcoded
- [ ] ECR Lifecycle Policy: Add `addLifecycleRule({ maxImageCount: 5 })` to prevent unbounded image accumulation
- [ ] Route53 A records are NOT managed by CDK (created by entrypoint.sh). **Must manually delete** when stack is removed, otherwise stale DNS records point to dead IPs

---

## Phase 11: Post-Deploy Operations Guide

This Phase covers all scenarios AFTER the initial deployment (Phase 1–10) is complete.
When user requests changes to an already-deployed project, start from the relevant section below.

### 11-1. Code-Only Changes (No DB / No Infra)

Most common scenario: bug fixes, UI changes, business logic updates.

**Procedure:**
1. Make code changes on `develop` branch
2. `git add . && git commit && git push origin develop`
3. GitHub Actions auto-deploys to Test
4. Verify on Test → Prod manual trigger via GitHub Actions

**No CDK, Dockerfile, or migration changes needed.**

### 11-2. DB Schema Changes

Adding columns, tables, or indexes.

**Procedure:**
1. Create new migration file: `migrations/NNN_description.sql`
   - MUST be idempotent (`IF NOT EXISTS`, `IF EXISTS`)
   - NEVER include `DROP TABLE` or column type changes without user confirmation
2. Update `src/server/db/migrate.ts` to include the new DDL (or use a migration runner that reads `migrations/` directory)
3. Update application code (repository/service layers) to use new schema
4. Push to `develop` → Test auto-deploy runs migration → verify
5. Prod manual trigger → auto-snapshot before deploy → migration runs

**Column/table deletion**: Do NOT include in migration files. Perform manually after verifying no code references remain.

**Column type change**: Staged approach — add new column → deploy code that writes to both → backfill data → deploy code that reads from new column → manually drop old column later.

### 11-3. New Environment Variables

**App-level env var (non-secret):**
1. Add to `environment` block in `infra/lib/app-stack.ts`
2. Reference in application code
3. Push → CDK updates the Task Definition automatically

**Secret env var (API keys, credentials):**
1. Create new `secretsmanager.Secret` in `app-stack.ts`
2. Add to container's `secrets` block via `ecs.Secret.fromSecretsManager()`
3. Reference in application code
4. Push → CDK creates the secret + updates Task Definition

**NEVER hardcode secrets in code or CDK environment block.**

### 11-4. New AWS Service Addition

Example: adding S3, ElastiCache, SES, etc.

**Procedure:**
1. Add AWS resource to `infra/lib/app-stack.ts`
2. Add necessary IAM permissions to Task Role
3. Pass connection info as environment/secrets to container
4. Update application code to use the new service
5. Update `package.json` if new SDK dependencies needed
6. Push → CDK creates new resources + updates service

**Caution:**
- New resources may increase monthly cost — inform user
- Some resources (RDS, ElastiCache) take 5–15 min to create
- Security Groups: follow least-privilege (only allow Fargate SG)

### 11-5. Infrastructure Spec Changes

**Fargate CPU/Memory scaling:**
1. Update `cpu` and `memoryLimitMiB` in `app-stack.ts` TaskDefinition
2. Update `NODE_OPTIONS=--max-old-space-size=<value>` accordingly
3. Push → CDK updates Task Definition → new task launches with new specs

| Fargate Spec | Recommended `max-old-space-size` |
|---|---|
| 0.25 vCPU / 512MB | 450 |
| 0.5 vCPU / 1024MB | 900 |
| 1 vCPU / 2048MB | 1800 |

**RDS instance type scaling:**
1. Update `instanceType` in `app-stack.ts`
2. Push → CDK modifies RDS instance (causes brief downtime during modification)
3. **Prod**: Schedule during maintenance window. RDS modification may take 5–20 min.

**RDS storage scaling:**
- `maxAllocatedStorage` enables auto-scaling. Only increase, never decrease.

### 11-6. Domain Addition (HTTP → HTTPS)

When user acquires a domain after initial HTTP-only deployment.

**Procedure:**
1. Add environment variables to container in `app-stack.ts`:
   - `DOMAIN`: the domain name
   - `HOSTED_ZONE_ID`: Route53 Hosted Zone ID
   - `CERTBOT_EMAIL`: email for Let's Encrypt
2. `entrypoint.sh` already handles domain detection — no changes needed if Phase 5 template was followed
3. Push → CDK updates Task Definition → new task starts → entrypoint.sh detects `DOMAIN` → Route53 A record → certbot → SSL
4. Verify HTTPS access

**Caution:**
- First cert issuance may take 1–5 min (DNS propagation)
- Let's Encrypt rate limit: 5 failed attempts per domain per hour
- HTTP fallback remains active until cert is issued

### 11-7. Rollback Procedures

**App-only rollback (code issue, no DB change):**
```bash
# Use the saved Task Definition from deploy workflow
aws ecs update-service \
  --cluster <cluster> \
  --service <service> \
  --task-definition <previous-task-def-arn> \
  --force-new-deployment
```
Or: re-run GitHub Actions on the previous commit.

**App + DB rollback (migration issue):**
1. Restore RDS from the auto-created snapshot (`prod-rollback-*`)
2. Then rollback the app to the previous Task Definition
3. **Order matters**: DB first, then app — otherwise app may crash on incompatible schema

**CDK/Infra rollback:**
- `cdk deploy` is idempotent — revert CDK code and push again
- Do NOT manually modify AWS resources outside CDK — causes drift

### 11-8. Stack Teardown

When decommissioning an environment.

**Procedure:**
1. `STAGE=test npx cdk destroy test-<repo>` (or via AWS Console → CloudFormation → Delete)
2. Manually delete:
   - Route53 A records (created by entrypoint.sh, NOT managed by CDK)
   - Secrets Manager secrets (if deletion protection / retention period)
   - RDS snapshots (if no longer needed)
   - ECR images in CDK Bootstrap repo (shared across stacks)
3. **Prod**: `deletionProtection: true` on RDS — must disable in Console before stack deletion

### 11-9. Monitoring & Debugging

**CloudWatch Logs:**
- Log Group: `/ecs/{stage}-{repo-name}`
- View via: AWS Console → CloudWatch → Log Groups → select log group → latest log stream
- Or CLI: `aws logs tail /ecs/test-<repo> --follow --region ap-northeast-2`

**ECS Task Status:**
```bash
# List running tasks
aws ecs list-tasks --cluster <cluster> --region ap-northeast-2

# Describe task (check lastStatus, stoppedReason)
aws ecs describe-tasks --cluster <cluster> --tasks <task-arn> --region ap-northeast-2

# Get public IP
ENI=$(aws ecs describe-tasks --cluster <cluster> --tasks <task-arn> \
  --query "tasks[0].attachments[0].details[?name=='networkInterfaceId'].value" --output text)
aws ec2 describe-network-interfaces --network-interface-ids $ENI \
  --query "NetworkInterfaces[0].Association.PublicIp" --output text
```

**Common post-deploy issues:**

| Symptom | Likely Cause | Fix |
|---|---|---|
| Task keeps restarting | App crash (check CloudWatch logs) | Fix app code, push |
| Task stuck in PENDING | Missing `assignPublicIp` or SG issue | Check CDK stack config |
| 502 Bad Gateway | Node.js not started yet or crashed | Check entrypoint.sh startup order, CloudWatch logs |
| DB connection refused | SG not allowing Fargate → RDS | Check RDS SG inbound rules |
| New env var not visible | Task Definition not updated | Verify CDK deploy ran, check Task Definition revision |
| Public IP changed | Fargate task restarted | Expected behavior — use domain for stable access |

### 11-10. Quick Reference: What to Change Where

| Change Type | Files to Modify | Triggers |
|---|---|---|
| Bug fix / UI change | `src/` only | Push → auto-deploy |
| New API endpoint | `src/` only | Push → auto-deploy |
| DB schema change | `migrations/NNN.sql` + `src/server/db/migrate.ts` + `src/` | Push → migration + deploy |
| New env var (plain) | `infra/lib/app-stack.ts` (environment) + `src/` | Push → CDK update |
| New env var (secret) | `infra/lib/app-stack.ts` (Secret + secrets) + `src/` | Push → CDK update |
| New AWS service | `infra/lib/app-stack.ts` + `src/` + maybe `package.json` | Push → CDK update |
| Fargate scaling | `infra/lib/app-stack.ts` (cpu/memory) | Push → CDK update |
| RDS scaling | `infra/lib/app-stack.ts` (instanceType) | Push → CDK update (downtime) |
| Add domain | `infra/lib/app-stack.ts` (DOMAIN, HOSTED_ZONE_ID env) | Push → CDK update |
| Dockerfile change | `Dockerfile`, `entrypoint.sh`, `nginx.conf` | Push → CDK rebuilds image |
| Rollback app | None — use previous Task Definition | CLI or re-run Actions |
| Rollback DB | None — restore from RDS snapshot | AWS Console/CLI |
