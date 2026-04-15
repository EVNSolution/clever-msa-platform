# ev-dashboard Bootstrap Precheck Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Python-based bootstrap precheck flow so EC2 app/data host bootstrap is validated on the instances directly before full `cdk deploy` runs.

**Architecture:** Keep `infra-ev-dashboard-platform` as the canonical runtime owner, but split host bootstrap from full runtime proof. User-data becomes a thin launcher, Python bootstrap modules own the host logic, and a new SSM-driven precheck runner verifies bootstrap correctness on dev/candidate hosts before any deploy. Each batch must update infra/root `lesson.md` with new operator rules.

**Tech Stack:** AWS CDK (TypeScript), Python 3, EC2, SSM, Docker, systemd, GitHub Actions, Markdown docs

---

## File Structure

### Infra repo implementation files

- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/bootstrap/ev_dashboard_runtime/__init__.py`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/bootstrap/ev_dashboard_runtime/common.py`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/bootstrap/ev_dashboard_runtime/app_host.py`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/bootstrap/ev_dashboard_runtime/data_host.py`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/bootstrap/ev_dashboard_runtime/cli.py`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/lib/ec2-bootstrap.ts`
  - thin launcher/user-data only
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/bin/bootstrapPrecheck.ts`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/package.json`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/.github/workflows/deploy-ecs.yml`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/README.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/lesson.md`

### Infra repo tests

- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/test/bootstrap-python-package.test.ts`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/test/ec2-host-bootstrap.test.ts`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/test/bootstrap-precheck.test.ts`

### Root docs

- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/runbooks/ev-dashboard-ecs-preflight-gate.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/runbooks/ev-dashboard-ecs-deploy-operator-loop.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/rollout/2026-04-13-ecs-cdk-oidc-actions-transition.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/lesson.md`

---

### Task 1: Lock the bootstrap-precheck contract in tests and docs

**Files:**
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/superpowers/specs/2026-04-15-ev-dashboard-ec2-ebs-runtime-design.md`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/test/bootstrap-precheck.test.ts`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/package.json`

- [ ] **Step 1: Write failing tests for the precheck command contract**

Add tests that assert:
- a `bootstrap:precheck` script exists
- it rejects missing lane host targets
- it requires both app and data host verification in proof mode

- [ ] **Step 2: Run the targeted tests to confirm failure**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform
npm test -- --runInBand test/bootstrap-precheck.test.ts
```

Expected: FAIL because no precheck command exists yet.

- [ ] **Step 3: Add the minimal command wiring**

Add a placeholder `bootstrap:precheck` script and minimal TypeScript entrypoint contract in `package.json` / `bin/bootstrapPrecheck.ts`.

- [ ] **Step 4: Re-run the targeted tests**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform
npm test -- --runInBand test/bootstrap-precheck.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git -C /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform add package.json bin/bootstrapPrecheck.ts test/bootstrap-precheck.test.ts docs/superpowers/specs/2026-04-15-ev-dashboard-ec2-ebs-runtime-design.md
git -C /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform commit -m "feat: add bootstrap precheck contract"
```

### Task 2: Create the Python bootstrap package

**Files:**
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/bootstrap/ev_dashboard_runtime/__init__.py`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/bootstrap/ev_dashboard_runtime/common.py`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/bootstrap/ev_dashboard_runtime/app_host.py`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/bootstrap/ev_dashboard_runtime/data_host.py`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/bootstrap/ev_dashboard_runtime/cli.py`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/test/bootstrap-python-package.test.ts`

- [ ] **Step 1: Write failing tests for package presence and entrypoints**

Assert that:
- `cli.py` exposes `verify-app`, `verify-data`, `reconcile-app`, `bootstrap-data`
- package files can be staged by infra code

- [ ] **Step 2: Run the targeted tests to confirm failure**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform
npm test -- --runInBand test/bootstrap-python-package.test.ts
```

Expected: FAIL

- [ ] **Step 3: Implement the minimal Python package**

Keep the package focused:
- `common.py`: shell helpers, aws/secret/docker wrappers
- `app_host.py`: env/gateway/container logic
- `data_host.py`: mount/postgres/redis/db bootstrap logic
- `cli.py`: parse args and dispatch

- [ ] **Step 4: Re-run the targeted tests**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform
npm test -- --runInBand test/bootstrap-python-package.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git -C /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform add bootstrap/ev_dashboard_runtime test/bootstrap-python-package.test.ts
git -C /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform commit -m "feat: add python host bootstrap package"
```

### Task 3: Thin the user-data and call the Python package

**Files:**
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/lib/ec2-bootstrap.ts`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/test/ec2-host-bootstrap.test.ts`

- [ ] **Step 1: Write failing tests for thin user-data**

Update tests to assert:
- user-data installs Python and Docker
- user-data stages the Python package
- systemd calls `python3 ... cli.py`
- large inline SQL/bootstrap logic is gone from user-data

- [ ] **Step 2: Run the targeted tests to confirm failure**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform
npm test -- --runInBand test/ec2-host-bootstrap.test.ts
```

Expected: FAIL

- [ ] **Step 3: Replace inline bootstrap logic with thin launcher scripts**

Make user-data:
- install prerequisites
- copy/stage the Python package
- write only thin systemd/service wrappers
- call Python entrypoints

- [ ] **Step 4: Re-run the targeted tests**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform
npm test -- --runInBand test/ec2-host-bootstrap.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git -C /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform add lib/ec2-bootstrap.ts test/ec2-host-bootstrap.test.ts
git -C /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform commit -m "refactor: thin ec2 user data bootstrap"
```

### Task 4: Implement SSM-driven bootstrap precheck

**Files:**
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/bin/bootstrapPrecheck.ts`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/package.json`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/test/bootstrap-precheck.test.ts`

- [ ] **Step 1: Add failing tests for host sync and verify sequencing**

Assert that the precheck runner:
- locates both app/data hosts
- syncs the current package to both hosts
- runs `verify` modes on both
- fails fast on any verify failure

- [ ] **Step 2: Run the targeted tests and confirm failure**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform
npm test -- --runInBand test/bootstrap-precheck.test.ts
```

Expected: FAIL

- [ ] **Step 3: Implement the minimal SSM precheck runner**

It should:
- resolve the lane stack/app/data instances
- copy the package via SSM shell heredoc/file write
- execute `python3 ... cli.py verify-app`
- execute `python3 ... cli.py verify-data`

- [ ] **Step 4: Re-run the targeted tests**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform
npm test -- --runInBand test/bootstrap-precheck.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git -C /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform add bin/bootstrapPrecheck.ts package.json test/bootstrap-precheck.test.ts
git -C /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform commit -m "feat: add ec2 bootstrap precheck runner"
```

### Task 5: Gate the workflow on bootstrap precheck

**Files:**
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/.github/workflows/deploy-ecs.yml`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/README.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/lesson.md`

- [ ] **Step 1: Write failing workflow/docs expectations**

Add tests or assertions that workflow order is:

```text
preflight
-> unit tests
-> synth
-> bootstrap precheck
-> deploy
-> post-deploy smoke
```

- [ ] **Step 2: Run the targeted tests and confirm failure**

Use the existing workflow/readme validation path or create a narrow test if needed.

- [ ] **Step 3: Add the workflow step and operator guidance**

Make bootstrap precheck mandatory in dev/candidate proof flows before deploy.

- [ ] **Step 4: Re-run verification**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform
npm test -- --runInBand
npm run build
git diff --check
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git -C /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform add .github/workflows/deploy-ecs.yml README.md lesson.md
git -C /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform commit -m "feat: gate ec2 deploys on bootstrap precheck"
```

### Task 6: Update canonical lessons and operator runbooks

**Files:**
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/runbooks/ev-dashboard-ecs-preflight-gate.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/runbooks/ev-dashboard-ecs-deploy-operator-loop.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/rollout/2026-04-13-ecs-cdk-oidc-actions-transition.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/lesson.md`

- [ ] **Step 1: Record the new operator rule**

Document that bootstrap changes are never debugged by repeated full deploys; they must pass instance-level precheck first.

- [ ] **Step 2: Record the specific lessons from this failure batch**

Include:
- proof-only gateway requirement
- Nitro `/dev/sdf` device path
- data-host replacement vs EBS attachment conflict
- shell quoting/psql heredoc failure modes
- persistent dev host sandbox for bootstrap work

- [ ] **Step 3: Run root verification**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform
git diff --check
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git -C /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform add docs/runbooks/ev-dashboard-ecs-preflight-gate.md docs/runbooks/ev-dashboard-ecs-deploy-operator-loop.md docs/rollout/2026-04-13-ecs-cdk-oidc-actions-transition.md lesson.md docs/superpowers/specs/2026-04-15-ev-dashboard-bootstrap-precheck-design.md docs/superpowers/plans/2026-04-15-ev-dashboard-bootstrap-precheck-implementation-plan.md
git -C /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform commit -m "docs: add ev-dashboard bootstrap precheck workflow"
```
