# Local Startup Runner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a local full-stack startup runner that boots `integration-local-stack` in deploy-wave-like stages, waits for health, runs seed, then runs smoke checks.

**Architecture:** Keep startup orchestration inside `development/integration-local-stack` and separate it from `seed-runner`. The runner should read one local manifest that groups compose services into ordered stages, expose clear failure points, and reuse existing Python bootstrap helper patterns already used by `bootstrap_ops_fixture_stack.py`.

**Tech Stack:** Python 3, Docker Compose, unittest, YAML/JSON manifest parsing, shell-safe subprocess execution.

---

### Task 1: Define the local startup manifest contract

**Files:**
- Create: `development/integration-local-stack/compose/local-startup-manifest.json`
- Create: `development/integration-local-stack/tests/test_local_startup_runner.py`

- [ ] **Step 1: Write the failing test**

Add tests that define one manifest contract:
- ordered stages
- compose services per stage
- health checks per stage
- optional seed stage
- smoke command stage

- [ ] **Step 2: Run test to verify it fails**

Run: `python3 -m unittest development/integration-local-stack/tests/test_local_startup_runner.py -v`
Expected: FAIL because the manifest loader/runner module does not exist yet.

- [ ] **Step 3: Add the manifest file**

Create a manifest with stages aligned to current local reality:
- `core-auth`
- `identity`
- `dispatch`
- `settlement`
- `edge`
- `seed`
- `smoke`

- [ ] **Step 4: Re-run the targeted test**

Run: `python3 -m unittest development/integration-local-stack/tests/test_local_startup_runner.py -v`
Expected: still FAIL because loader/build logic is not implemented yet.

- [ ] **Step 5: Commit**

```bash
git add development/integration-local-stack/compose/local-startup-manifest.yaml development/integration-local-stack/tests/test_local_startup_runner.py
git commit -m "test: define local startup runner manifest contract"
```

### Task 2: Implement the local startup runner

**Files:**
- Create: `development/integration-local-stack/scripts/run_local_startup.py`
- Test: `development/integration-local-stack/tests/test_local_startup_runner.py`

- [ ] **Step 1: Extend the failing test**

Define expected behavior for:
- building stage steps from manifest
- running `docker compose up -d <services...>` per stage
- running health probes before advancing
- running seed only after edge or after required service stages

- [ ] **Step 2: Run test to verify it fails**

Run: `python3 -m unittest development/integration-local-stack/tests/test_local_startup_runner.py -v`
Expected: FAIL with missing functions or incorrect step construction.

- [ ] **Step 3: Write the minimal implementation**

Implement a Python runner modeled after `bootstrap_ops_fixture_stack.py`:
- parse manifest
- build ordered `Step` objects
- run compose/service startup per stage
- wait on HTTP health checks
- run `seed-runner`
- run smoke curl commands

- [ ] **Step 4: Run test to verify it passes**

Run: `python3 -m unittest development/integration-local-stack/tests/test_local_startup_runner.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add development/integration-local-stack/scripts/run_local_startup.py development/integration-local-stack/tests/test_local_startup_runner.py
git commit -m "feat: add local startup runner"
```

### Task 3: Wire docs and operator entrypoints

**Files:**
- Modify: `development/integration-local-stack/README.md`
- Modify: `docs/runbooks/local-dispatch-settlement-stack.md`
- Test: `development/integration-local-stack/tests/test_local_startup_runner.py`

- [ ] **Step 1: Add docs expectations to tests if needed**

If the runner exposes a default manifest path or CLI flags, add targeted tests for those defaults.

- [ ] **Step 2: Run test to verify it fails if defaults are not implemented correctly**

Run: `python3 -m unittest development/integration-local-stack/tests/test_local_startup_runner.py -v`
Expected: FAIL if docs-facing defaults are not reflected in code.

- [ ] **Step 3: Update docs**

Document:
- when to use the runner
- how it differs from raw `docker compose up -d`
- stage names and health expectations
- how it relates to central deploy wave concepts

- [ ] **Step 4: Run verification**

Run:
- `python3 -m unittest development/integration-local-stack/tests/test_local_startup_runner.py -v`
- `python3 -m unittest development/integration-local-stack/tests/test_bootstrap_ops_fixture_stack.py -v`
- `git diff --check`

Expected:
- all tests PASS
- no diff formatting errors

- [ ] **Step 5: Commit**

```bash
git add development/integration-local-stack/README.md docs/runbooks/local-dispatch-settlement-stack.md
git commit -m "docs: add local startup runner runbook"
```
