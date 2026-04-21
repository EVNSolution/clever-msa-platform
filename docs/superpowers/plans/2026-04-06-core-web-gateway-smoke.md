# Core Web Gateway Smoke Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a reusable live-stack smoke check that verifies the single-web gateway routes still expose the core web-console services with the expected public and auth-gated boundaries.

**Architecture:** Keep the smoke logic in `development/integration-local-stack/scripts/` as a standalone Python verifier, following the existing dead-letter route checker pattern. Back it with fast unit tests in `development/integration-local-stack/tests/`, then wire the new artifact into rollout docs as the hardening proof point for the web-first platform.

**Tech Stack:** Python 3 standard library, unittest, existing gateway/nginx route matrix, integration-local-stack docs.

---

### Task 1: Define the route verification matrix

**Files:**
- Create: `docs/superpowers/plans/2026-04-06-core-web-gateway-smoke.md`
- Modify: `development/integration-local-stack/scripts/verify_core_gateway_routes.py`
- Test: `development/integration-local-stack/tests/test_verify_core_gateway_routes.py`

- [ ] **Step 1: Write the failing test for the expected route matrix**
- [ ] **Step 2: Run the unit test to verify it fails for the missing script/module**
- [ ] **Step 3: Implement the route matrix with public, health, and auth-gated expectations**
- [ ] **Step 4: Run the unit test to verify it passes**
- [ ] **Step 5: Commit**

### Task 2: Implement the live fetch runner

**Files:**
- Modify: `development/integration-local-stack/scripts/verify_core_gateway_routes.py`
- Test: `development/integration-local-stack/tests/test_verify_core_gateway_routes.py`

- [ ] **Step 1: Write the failing test for live fetch normalization and mismatch errors**
- [ ] **Step 2: Run the unit test to verify it fails**
- [ ] **Step 3: Implement fetch helpers and route execution**
- [ ] **Step 4: Run the unit test suite to verify it passes**
- [ ] **Step 5: Commit**

### Task 3: Wire the smoke artifact into rollout docs

**Files:**
- Modify: `docs/rollout/16-web-first-platform-delivery-order.md`
- Modify: `development/integration-local-stack/README.md`

- [ ] **Step 1: Update rollout/docs to reference the new gateway smoke verifier**
- [ ] **Step 2: Run `git diff --check` and targeted tests**
- [ ] **Step 3: Commit**
