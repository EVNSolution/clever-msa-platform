# Folder Refactor Phase 3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** surviving single web runtime의 naming debt를 정리해 `front-web-console / web-console` naming set을 current truth로 고정한다.

**Architecture:** phase 3는 deprecated repo removal 이후 남아 있는 surviving web runtime naming cleanup이다. 먼저 rename inventory와 baseline verification을 고정하고, 그 다음 repo path rename, compose/gateway/tooling literal rename, active docs rename을 순서대로 적용한다. gateway 외부 prefix나 browser route는 유지하고, 내부 upstream host/service/build-context/docs naming만 바꾼다.

**Tech Stack:** git move/rename, Markdown docs, Docker Compose, nginx gateway config, Python smoke helpers, React/Vite frontend repo, ripgrep, explicit `/usr/local/bin/node` npm CLI verification

---

### Task 1: Freeze Rename Inventory And Baseline Verification

**Files:**
- Review only: `development/integration-local-stack/docker-compose.account-driver-settlement.yml`
- Review only: `development/integration-local-stack/scripts/verify_ops_fixture_stack.py`
- Review only: `development/integration-local-stack/tests/test_verify_ops_fixture_stack.py`
- Review only: `development/edge-api-gateway/nginx.conf`
- Review only: `development/front-admin-console/README.md`
- Review only: `development/integration-local-stack/README.md`
- Review only: `development/integration-local-stack/compose/README.md`
- Review only: `WORKSPACE.md`
- Review only: `repo-map.md`
- Review only: `docs/mappings/current-runtime-inventory.md`
- Review only: `docs/mappings/current-to-target-repo-map.md`
- Test: repo-wide grep audit + baseline smoke

- [ ] **Step 1: Run the stale naming inventory grep**

Run:

```bash
cd /Users/jiin/.codex/worktrees/c26c/clever-msa-platform
rg -n "front-admin-console|admin-front|admin-front-e2e|admin-front\\.env\\.example|../front-admin-console|admin-front:5174" \
  development/integration-local-stack \
  development/edge-api-gateway \
  development/front-admin-console \
  WORKSPACE.md \
  repo-map.md \
  docs
```

Expected: active hits in compose, gateway, helper scripts, repo-local README, root docs, and non-archive current-truth docs.

- [ ] **Step 2: Write the exact rename set into branch notes**

Record this implementation note in the worker scratchpad for the task:

```text
- repo path: development/front-admin-console -> development/front-web-console
- compose service: admin-front -> web-console
- e2e service: admin-front-e2e -> web-console-e2e
- env example: admin-front.env.example -> web-console.env.example
- gateway upstream host literal: admin-front:5174 -> web-console:5174
- active docs/current inventory/current working-mode docs must stop using front-admin-console/admin-front as current truth
```

- [ ] **Step 3: Run baseline stack verification before any rename**

Run:

```bash
python3 development/integration-local-stack/scripts/verify_ops_fixture_stack.py --skip-build
```

Expected: green smoke before rename work starts.

- [ ] **Step 4: Commit the audit note only if you created a tracked scratch artifact**

If no tracked file was created, skip this step and proceed.

### Task 2: Rename The Surviving Web Repo Path

**Files:**
- Move: `development/front-admin-console/` -> `development/front-web-console/`
- Modify: `development/front-web-console/README.md`
- Review only: `development/front-web-console/package.json`
- Review only: `development/front-web-console/index.html`
- Test: path existence check + repo-local grep

- [ ] **Step 1: Move the repo directory with git-aware rename**

Run:

```bash
cd /Users/jiin/.codex/worktrees/c26c/clever-msa-platform
git mv development/front-admin-console development/front-web-console
test -d development/front-web-console
test ! -d development/front-admin-console
```

Expected: new path exists and old path is gone from the worktree.

- [ ] **Step 2: Update the surviving web repo README**

Edit:

- `development/front-web-console/README.md`

Required changes:

- title `# front-admin-console` -> `# front-web-console`
- repo-path note should say the path is now `front-web-console`
- keep product-facing truth as `통합 웹 콘솔`
- remove any wording that treats `front-admin-console` as still current

- [ ] **Step 3: Verify package/app naming stays intentionally unchanged**

Inspect and do not rename unless drift is found:

- `development/front-web-console/package.json` should stay `clever-web-console`
- `development/front-web-console/index.html` title should stay `CLEVER 통합 웹 콘솔`

Expected: no stale `admin` naming remains in repo-local surface other than intentionally historical comments, if any.

- [ ] **Step 4: Run repo-local grep after the move**

Run:

```bash
rg -n "front-admin-console|admin-front" development/front-web-console
```

Expected: only intentional historical wording remains, if any. Most hits should be gone.

- [ ] **Step 5: Commit the repo path rename**

```bash
git add development/front-web-console
git commit -m "refactor: rename surviving web repo path"
```

### Task 3: Rename Compose, Gateway, Env, And Helper Literals

**Files:**
- Modify: `development/integration-local-stack/docker-compose.account-driver-settlement.yml`
- Move: `development/integration-local-stack/infra/env/admin-front.env.example` -> `development/integration-local-stack/infra/env/web-console.env.example`
- Modify: `development/integration-local-stack/scripts/verify_ops_fixture_stack.py`
- Modify: `development/integration-local-stack/tests/test_verify_ops_fixture_stack.py`
- Modify: `development/integration-local-stack/README.md`
- Modify: `development/integration-local-stack/compose/README.md`
- Modify: `development/edge-api-gateway/nginx.conf`
- Modify: `development/edge-api-gateway/AGENTS.md`
- Test: focused grep for renamed runtime literals

- [ ] **Step 1: Rename the env example file**

Run:

```bash
git mv development/integration-local-stack/infra/env/admin-front.env.example \
       development/integration-local-stack/infra/env/web-console.env.example
```

Expected: env file moves without content changes yet.

- [ ] **Step 2: Update compose service names and build contexts**

Edit `development/integration-local-stack/docker-compose.account-driver-settlement.yml`.

Required changes:

- service `admin-front` -> `web-console`
- service `admin-front-e2e` -> `web-console-e2e`
- `depends_on` entry under `gateway` updated to `web-console`
- build context `../front-admin-console` -> `../front-web-console`
- env file path `./infra/env/admin-front.env.example` -> `./infra/env/web-console.env.example`

Do not add explicit `image:` keys.

- [ ] **Step 3: Update gateway internal upstream literal**

Edit `development/edge-api-gateway/nginx.conf`.

Required change:

- `set $front_upstream admin-front:5174;` -> `set $front_upstream web-console:5174;`

Do not change external route prefix `/`.

- [ ] **Step 4: Update helper scripts, tests, and local docs**

Edit:

- `development/integration-local-stack/scripts/verify_ops_fixture_stack.py`
- `development/integration-local-stack/tests/test_verify_ops_fixture_stack.py`
- `development/integration-local-stack/README.md`
- `development/integration-local-stack/compose/README.md`
- `development/edge-api-gateway/AGENTS.md`

Required changes:

- replace `admin-front` -> `web-console`
- replace `admin-front-e2e` -> `web-console-e2e`
- replace `front-admin-console` path references -> `front-web-console`
- command examples and helper help text must use the new names
- gateway AGENTS should say the surviving web runtime lives in `../front-web-console/`

- [ ] **Step 5: Run focused literal grep**

Run:

```bash
rg -n "admin-front|admin-front-e2e|admin-front\\.env\\.example|../front-admin-console|admin-front:5174" \
  development/integration-local-stack \
  development/edge-api-gateway
```

Expected: no active tooling/runtime hit remains.

- [ ] **Step 6: Commit the tooling rename**

```bash
git add development/integration-local-stack/docker-compose.account-driver-settlement.yml \
        development/integration-local-stack/infra/env/web-console.env.example \
        development/integration-local-stack/scripts/verify_ops_fixture_stack.py \
        development/integration-local-stack/tests/test_verify_ops_fixture_stack.py \
        development/integration-local-stack/README.md \
        development/integration-local-stack/compose/README.md \
        development/edge-api-gateway/nginx.conf \
        development/edge-api-gateway/AGENTS.md
git commit -m "refactor: rename web console stack surfaces"
```

### Task 4: Rename Active Docs And Current-Truth References

**Files:**
- Modify: `WORKSPACE.md`
- Modify: `repo-map.md`
- Modify: `docs/mappings/current-runtime-inventory.md`
- Modify: `docs/mappings/current-to-target-repo-map.md`
- Modify: `docs/mappings/repo-responsibility-matrix.md`
- Modify: `docs/mappings/04-account-driver-settlement-source-index.md`
- Modify: `docs/rollout/13-account-driver-settlement-compose-simulation.md`
- Modify: `docs/rollout/15-ui-first-working-mode.md`
- Modify: `docs/rollout/16-web-first-platform-delivery-order.md`
- Modify: `docs/contracts/10-front-ui-rules.md`
- Modify: `docs/contracts/12-settlement-shared-read-pages.md`
- Modify: `docs/contracts/13-admin-vehicle-and-assignment-pages.md`
- Modify: `docs/contracts/14-settlement-upload-first-ux-flow.md`
- Modify: `docs/contracts/15-auth-api-scenario-map.md`
- Modify: `docs/contracts/16-admin-dispatch-board-pages.md`
- Modify: `docs/contracts/17-admin-communication-pages.md`
- Modify: `docs/contracts/18-single-web-console-screen-map.md`
- Modify: `docs/contracts/19-admin-region-pages.md`
- Modify: `docs/contracts/20-admin-personnel-document-pages.md`
- Modify: `docs/decisions/specs/2026-04-04-auth-final-cutover-design.md`
- Modify: `docs/decisions/specs/2026-04-05-dispatch-admin-board-design.md`
- Modify: `docs/decisions/specs/2026-04-06-region-web-first-slice-design.md`
- Modify: `docs/decisions/specs/2026-04-06-single-web-console-cutover-design.md`
- Modify: `docs/decisions/specs/2026-04-01-vehicle-centric-terminal-ui-design.md`
- Test: non-archive doc grep audit

- [ ] **Step 1: Update root and mapping current truth first**

Edit:

- `WORKSPACE.md`
- `repo-map.md`
- `docs/mappings/current-runtime-inventory.md`
- `docs/mappings/current-to-target-repo-map.md`
- `docs/mappings/repo-responsibility-matrix.md`
- `docs/mappings/04-account-driver-settlement-source-index.md`

Required changes:

- `front-admin-console` current runtime -> `front-web-console`
- compose service `admin-front` -> `web-console`
- if `admin-front-e2e` is mentioned as a current runtime/testing surface, rename to `web-console-e2e`
- keep historical notes historical; do not rewrite archive

- [ ] **Step 2: Update rollout and contract docs that describe current working mode**

Edit:

- `docs/rollout/13-account-driver-settlement-compose-simulation.md`
- `docs/rollout/15-ui-first-working-mode.md`
- `docs/rollout/16-web-first-platform-delivery-order.md`
- `docs/contracts/10-front-ui-rules.md`
- `docs/contracts/12-settlement-shared-read-pages.md`
- `docs/contracts/13-admin-vehicle-and-assignment-pages.md`
- `docs/contracts/14-settlement-upload-first-ux-flow.md`
- `docs/contracts/15-auth-api-scenario-map.md`
- `docs/contracts/16-admin-dispatch-board-pages.md`
- `docs/contracts/17-admin-communication-pages.md`
- `docs/contracts/18-single-web-console-screen-map.md`
- `docs/contracts/19-admin-region-pages.md`
- `docs/contracts/20-admin-personnel-document-pages.md`

Required changes:

- surviving runtime name -> `front-web-console`
- compose/local entrypoint name -> `web-console`
- keep semantics the same; this is naming cleanup only

- [ ] **Step 3: Update active decision/spec docs that still name the current runtime**

Edit:

- `docs/decisions/specs/2026-04-04-auth-final-cutover-design.md`
- `docs/decisions/specs/2026-04-05-dispatch-admin-board-design.md`
- `docs/decisions/specs/2026-04-06-region-web-first-slice-design.md`
- `docs/decisions/specs/2026-04-06-single-web-console-cutover-design.md`
- `docs/decisions/specs/2026-04-01-vehicle-centric-terminal-ui-design.md`

Required changes:

- current runtime path/name references use `front-web-console`
- current local compose/runtime references use `web-console`
- keep clearly historical mentions if they are not current-truth guidance

- [ ] **Step 4: Run non-archive active-doc grep audit**

Run:

```bash
rg -n "front-admin-console|admin-front|admin-front-e2e" \
  WORKSPACE.md \
  repo-map.md \
  docs \
  development/integration-local-stack/README.md \
  development/integration-local-stack/compose/README.md \
  development/edge-api-gateway/AGENTS.md \
  --glob '!docs/archive/**' \
  --glob '!docs/superpowers/**'
```

Expected: no stale current-truth hit remains. Any remaining hit must be an explicitly labeled historical or legacy-source note.

- [ ] **Step 5: Commit the doc rename**

```bash
git add WORKSPACE.md \
        repo-map.md \
        docs/mappings/current-runtime-inventory.md \
        docs/mappings/current-to-target-repo-map.md \
        docs/mappings/repo-responsibility-matrix.md \
        docs/mappings/04-account-driver-settlement-source-index.md \
        docs/rollout/13-account-driver-settlement-compose-simulation.md \
        docs/rollout/15-ui-first-working-mode.md \
        docs/rollout/16-web-first-platform-delivery-order.md \
        docs/contracts/10-front-ui-rules.md \
        docs/contracts/12-settlement-shared-read-pages.md \
        docs/contracts/13-admin-vehicle-and-assignment-pages.md \
        docs/contracts/14-settlement-upload-first-ux-flow.md \
        docs/contracts/15-auth-api-scenario-map.md \
        docs/contracts/16-admin-dispatch-board-pages.md \
        docs/contracts/17-admin-communication-pages.md \
        docs/contracts/18-single-web-console-screen-map.md \
        docs/contracts/19-admin-region-pages.md \
        docs/contracts/20-admin-personnel-document-pages.md \
        docs/decisions/specs/2026-04-04-auth-final-cutover-design.md \
        docs/decisions/specs/2026-04-05-dispatch-admin-board-design.md \
        docs/decisions/specs/2026-04-06-region-web-first-slice-design.md \
        docs/decisions/specs/2026-04-06-single-web-console-cutover-design.md \
        docs/decisions/specs/2026-04-01-vehicle-centric-terminal-ui-design.md
git commit -m "docs: rename active web console references"
```

### Task 5: Rebuild, Verify, And Sweep Stale Naming

**Files:**
- Modify as needed: any rename fallout discovered by verification
- Test: `development/front-web-console` direct checks, bootstrap, stack verify, final grep

- [ ] **Step 1: Install frontend dependencies at the renamed path if needed**

Run:

```bash
cd /Users/jiin/.codex/worktrees/c26c/clever-msa-platform/development/front-web-console
PATH=/usr/local/bin:/usr/bin:/bin /usr/local/bin/node /usr/local/lib/node_modules/npm/bin/npm-cli.js install
```

Expected: dependency tree is present at the renamed path. This uses the known-good `/usr/local/bin/node` path because the default Homebrew node is broken on this machine.

- [ ] **Step 2: Run direct frontend verification**

Run:

```bash
cd /Users/jiin/.codex/worktrees/c26c/clever-msa-platform/development/front-web-console
PATH=/usr/local/bin:/usr/bin:/bin /usr/local/bin/node /usr/local/lib/node_modules/npm/bin/npm-cli.js test -- --run
PATH=/usr/local/bin:/usr/bin:/bin /usr/local/bin/node /usr/local/lib/node_modules/npm/bin/npm-cli.js run build
```

Expected:

- tests green
- build green

- [ ] **Step 3: Run a fresh rebuilt stack bootstrap**

Run:

```bash
cd /Users/jiin/.codex/worktrees/c26c/clever-msa-platform
python3 development/integration-local-stack/scripts/bootstrap_ops_fixture_stack.py --fresh --build
```

Expected: renamed compose services, gateway upstream, seed, API smoke, and Playwright smoke all succeed from a fresh stack.

- [ ] **Step 4: Run the fast post-bootstrap verification**

Run:

```bash
python3 development/integration-local-stack/scripts/verify_ops_fixture_stack.py --skip-build
```

Expected: fast rerun path remains green after rename.

- [ ] **Step 5: Run final stale naming greps**

Run:

```bash
cd /Users/jiin/.codex/worktrees/c26c/clever-msa-platform
rg -n "front-admin-console|admin-front|admin-front-e2e|admin-front\\.env\\.example|../front-admin-console|admin-front:5174" \
  WORKSPACE.md \
  repo-map.md \
  development/front-web-console \
  development/integration-local-stack \
  development/edge-api-gateway \
  docs/mappings/current-runtime-inventory.md \
  docs/mappings/current-to-target-repo-map.md \
  docs/mappings/repo-responsibility-matrix.md \
  docs/mappings/04-account-driver-settlement-source-index.md \
  docs/rollout/13-account-driver-settlement-compose-simulation.md \
  docs/rollout/15-ui-first-working-mode.md \
  docs/rollout/16-web-first-platform-delivery-order.md \
  docs/contracts/10-front-ui-rules.md \
  docs/contracts/12-settlement-shared-read-pages.md \
  docs/contracts/13-admin-vehicle-and-assignment-pages.md \
  docs/contracts/14-settlement-upload-first-ux-flow.md \
  docs/contracts/15-auth-api-scenario-map.md \
  docs/contracts/16-admin-dispatch-board-pages.md \
  docs/contracts/17-admin-communication-pages.md \
  docs/contracts/18-single-web-console-screen-map.md \
  docs/contracts/19-admin-region-pages.md \
  docs/contracts/20-admin-personnel-document-pages.md \
  docs/decisions/specs/2026-04-04-auth-final-cutover-design.md \
  docs/decisions/specs/2026-04-05-dispatch-admin-board-design.md \
  docs/decisions/specs/2026-04-06-region-web-first-slice-design.md \
  docs/decisions/specs/2026-04-06-single-web-console-cutover-design.md \
  docs/decisions/specs/2026-04-01-vehicle-centric-terminal-ui-design.md
```

Expected: no stale current-truth hit remains inside the phase 3 runtime/tooling/doc scope. Historical mentions outside this scoped file set are not part of this gate.

- [ ] **Step 6: Run final git hygiene checks**

Run:

```bash
git diff --check
git status --short
```

Expected: no formatting issues; only intended changes are present.

- [ ] **Step 7: Commit any final rename fallout fixes**

```bash
git add -A
git commit -m "refactor: finalize web console naming cleanup"
```
