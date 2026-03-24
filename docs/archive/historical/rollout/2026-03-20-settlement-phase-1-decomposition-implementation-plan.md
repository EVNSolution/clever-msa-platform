# Settlement Phase 1 Decomposition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기존 `services/settlement` placeholder를 `service-settlement-operations-view`로 옮기고, `service-settlement-registry`, `service-delivery-record` shell을 생성해 정산 분해 1차 구조를 고정한다.

**Architecture:** 현재 placeholder CRUD는 `service-settlement-operations-view`에 임시 수용한다. `service-settlement-registry`와 `service-delivery-record`는 경계만 고정하는 빈 shell로 시작하고, compose와 seed-runner는 새 `operations-view` repo만 바라보게 맞춘다.

**Tech Stack:** Django/DRF, Docker Compose, seed-runner overlay, platform docs mapping

---

### Task 1: Move Placeholder Runtime Into `service-settlement-operations-view`

**Files:**
- Create: `development/service-settlement-operations-view/README.md`
- Modify: `development/integration-local-stack/docker-compose.account-driver-settlement.yml`
- Modify: `development/integration-local-stack/infra/docker/seed-runner/Dockerfile`
- Modify: `WORKSPACE.md`
- Modify: `repo-map.md`
- Modify: `docs/mappings/current-to-target-repo-map.md`
- Modify: `../MSA-Server/README.md`

- [ ] **Step 1: Move the runtime directory**

Run: `mv MSA-Server/services/settlement clever-msa-platform/development/service-settlement-operations-view`
Expected: source directory disappears from `MSA-Server/services/`

- [ ] **Step 2: Update compose and seed-runner paths**

Change `settlement-api` build context to `../service-settlement-operations-view`.
Change `seed-runner` requirements/source overlay to copy from the moved target repo.

- [ ] **Step 3: Add repo-local README**

Describe current placeholder role, future decomposition target, and what the repo must not own.

- [ ] **Step 4: Update migration docs**

Mark `service-settlement-operations-view` as active target and remove `services/settlement` from `Runtime Still In This Workspace`.

- [ ] **Step 5: Verify path resolution**

Run: `docker compose -f clever-msa-platform/development/integration-local-stack/docker-compose.account-driver-settlement.yml config`
Expected: exit code `0`

- [ ] **Step 6: Verify runtime builds**

Run: `docker compose -f clever-msa-platform/development/integration-local-stack/docker-compose.account-driver-settlement.yml build settlement-api driver-360-api seed-runner`
Expected: all three images build successfully

### Task 2: Create Empty Shell Repos For Future Settlement Split

**Files:**
- Create: `development/service-settlement-registry/README.md`
- Create: `development/service-delivery-record/README.md`
- Modify: `repo-map.md`
- Modify: `WORKSPACE.md`

- [ ] **Step 1: Create shell directories**

Create:
- `development/service-settlement-registry/`
- `development/service-delivery-record/`

- [ ] **Step 2: Add shell READMEs**

Each README should explain:
- current role: empty shell
- future role
- not yet implemented scope

- [ ] **Step 3: Mark status clearly in workspace docs**

Keep both repos visible as future split shells, distinct from migrated runtime repos.

### Task 3: Close The Batch With Fresh Evidence

**Files:**
- Verify only

- [ ] **Step 1: Confirm old workspace residue**

Run: `ls MSA-Server/services`
Expected: old service list no longer includes `settlement`

- [ ] **Step 2: Re-run compose config**

Run: `docker compose -f clever-msa-platform/development/integration-local-stack/docker-compose.account-driver-settlement.yml config`
Expected: exit code `0`

- [ ] **Step 3: Re-run settlement-related builds**

Run: `docker compose -f clever-msa-platform/development/integration-local-stack/docker-compose.account-driver-settlement.yml build settlement-api driver-360-api seed-runner`
Expected: exit code `0`

- [ ] **Step 4: Record resulting state**

Report:
- moved runtime repo path
- created shell repo paths
- remaining old runtime source, if any
