# Platform Restructure And Repo Migration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the current mixed `MSA-Server` workspace into a human-readable `clever-msa-platform` structure with `docs/` as the architecture source of truth and `development/` as a set of independent implementation repos.

**Architecture:** The target platform has one top-level workspace shell, one local docs tree, and many isolated development repos. Migration must separate document truth, local integration assets, and service runtime code without promoting under-decomposed domains such as `settlement` directly into final repos.

**Tech Stack:** Markdown planning docs, Docker Compose, Nginx gateway, React/Vite frontends, Django/DRF services

---

## Target Workspace

```text
CLEVER/
└── clever-msa-platform/
    ├── AGENTS.md
    ├── WORKSPACE.md
    ├── repo-map.md
    ├── docs/
    │   ├── goals/
    │   ├── boundaries/
    │   ├── mappings/
    │   ├── contracts/
    │   ├── decisions/
    │   ├── rollout/
    │   └── archive/
    │       ├── superseded/
    │       ├── historical/
    │       └── rejected/
    └── development/
        ├── integration-local-stack/
        ├── edge-api-gateway/
        ├── front-operator-console/
        ├── front-admin-console/
        ├── service-organization-registry/
        ├── service-account-access/
        ├── service-driver-profile/
        ├── service-vehicle-registry/
        ├── service-vehicle-assignment/
        ├── service-vehicle-operations-view/
        ├── service-driver-operations-view/
        ├── service-terminal-registry/
        ├── service-telemetry-hub/
        ├── service-settlement-registry/
        ├── service-delivery-record/
        └── service-settlement-operations-view/
```

## Current-To-Target Migration Rules

- `goal/` content becomes `docs/goals/`, `docs/boundaries/`, `docs/contracts/`, or `docs/rollout/` depending on document purpose.
- `reference/` content becomes `docs/mappings/` or `docs/decisions/`.
- `docs/superpowers/specs/` becomes `docs/decisions/specs/`.
- `docs/superpowers/plans/` becomes `docs/rollout/plans/`.
- retired documents move into `docs/archive/superseded/`, `docs/archive/historical/`, or `docs/archive/rejected/`.
- `compose/`, `infra/`, and root compose files move into `development/integration-local-stack/`.
- `gateway/`, `front/`, `admin-front/`, and directly-mappable services become independent repos under `development/`.
- `services/settlement/` is not promoted directly. It is a decomposition source for future settlement repos.

## Current-To-Target Repo Map

| Current path | Target path | Target repo type | Migration mode |
| --- | --- | --- | --- |
| `gateway/` | `development/edge-api-gateway/` | edge repo | direct move |
| `front/` | `development/front-operator-console/` | frontend repo | direct move |
| `admin-front/` | `development/front-admin-console/` | frontend repo | direct move |
| `services/organization-master/` | `development/service-organization-registry/` | service repo | direct move |
| `services/account-auth/` | `development/service-account-access/` | service repo | direct move |
| `services/driver-profile/` | `development/service-driver-profile/` | service repo | direct move |
| `services/vehicle-asset/` | `development/service-vehicle-registry/` | service repo | direct move |
| `services/driver-vehicle-assignment/` | `development/service-vehicle-assignment/` | service repo | direct move |
| `services/vehicle-ops/` | `development/service-vehicle-operations-view/` | service repo | direct move |
| `services/driver-360/` | `development/service-driver-operations-view/` | service repo | direct move |
| `compose/` | `development/integration-local-stack/compose/` | integration repo | direct move |
| `infra/` | `development/integration-local-stack/infra/` | integration repo | direct move |
| `docker-compose.account-driver-settlement.yml` | `development/integration-local-stack/` | integration repo | direct move |
| `services/settlement/` | future settlement repos | service repos | decompose first |

## Repo Boundary Rules

- `docs/` is the architecture and mapping source of truth. It is not a runtime repo.
- `docs/archive/` is document-only retirement storage. It is never a source of truth.
- `development/integration-local-stack/` owns local Compose, local `.env.example`, smoke scripts, and seed orchestration only.
- Each `service-*` repo owns only its runtime code, migrations, tests, Dockerfile, and repo-local README.
- Each `front-*` repo owns only its UI, tests, routing, and API clients.
- `edge-api-gateway/` owns only gateway routing and proxy rules.
- Cross-service imports are forbidden.
- Shared code is forbidden by default. If sharing becomes unavoidable, define the contract in `docs/contracts/` first.
- Cross-repo mapping truth lives in `docs/mappings/`, not inside service repos.

### Task 1: Create The New Platform Shell

**Files:**
- Create: `../clever-msa-platform/`
- Create: `../clever-msa-platform/docs/`
- Create: `../clever-msa-platform/development/`
- Create: `../clever-msa-platform/WORKSPACE.md`
- Create: `../clever-msa-platform/repo-map.md`
- Create: `../clever-msa-platform/AGENTS.md`

- [ ] **Step 1: Create the new root folders**

Run:

```bash
mkdir -p ../clever-msa-platform/docs ../clever-msa-platform/development
```

Expected: the new platform root exists without moving any current source yet.

- [ ] **Step 2: Add workspace guide files**

Create:
- `../clever-msa-platform/WORKSPACE.md`
- `../clever-msa-platform/repo-map.md`
- `../clever-msa-platform/AGENTS.md`

Expected: the platform root explains what belongs in `docs/` and `development/`.

- [ ] **Step 3: Verify the shell structure**

Run:

```bash
find ../clever-msa-platform -maxdepth 2 -type d | sort
```

Expected: only the new shell folders appear; no runtime code has moved yet.

- [ ] **Step 4: Ready-to-Commit File List 기록**

Record:

```text
../clever-msa-platform/WORKSPACE.md
../clever-msa-platform/repo-map.md
../clever-msa-platform/AGENTS.md
```

### Task 2: Rebuild The Docs Tree As The Source Of Truth

**Files:**
- Create: `../clever-msa-platform/docs/goals/`
- Create: `../clever-msa-platform/docs/boundaries/`
- Create: `../clever-msa-platform/docs/mappings/`
- Create: `../clever-msa-platform/docs/contracts/`
- Create: `../clever-msa-platform/docs/decisions/`
- Create: `../clever-msa-platform/docs/rollout/`
- Create: `../clever-msa-platform/docs/archive/`
- Modify: current `goal/`, `reference/`, `docs/superpowers/specs/`, `docs/superpowers/plans/` by copying their contents into the new tree

- [ ] **Step 1: Create the target docs folders**

Run:

```bash
mkdir -p \
  ../clever-msa-platform/docs/goals \
  ../clever-msa-platform/docs/boundaries \
  ../clever-msa-platform/docs/mappings \
  ../clever-msa-platform/docs/contracts \
  ../clever-msa-platform/docs/decisions/specs \
  ../clever-msa-platform/docs/rollout/plans \
  ../clever-msa-platform/docs/archive/superseded \
  ../clever-msa-platform/docs/archive/historical \
  ../clever-msa-platform/docs/archive/rejected
```

Expected: the new docs tree exists before file copying begins.

- [ ] **Step 2: Copy current goal/reference/spec/plan files into the new categories**

Use this categorization rule:
- vision and target-state docs -> `docs/goals/`
- bounded context and owned-data docs -> `docs/boundaries/`
- legacy cut maps and current-to-target tables -> `docs/mappings/`
- API, ID, and service contract docs -> `docs/contracts/`
- validated design specs -> `docs/decisions/specs/`
- migration checklists and implementation plans -> `docs/rollout/plans/`
- retired docs -> `docs/archive/superseded/`, `docs/archive/historical/`, or `docs/archive/rejected/`

Expected: document truth is duplicated into the new layout without deleting the old copy yet.

- [ ] **Step 3: Create the master migration map document**

Create:
- `../clever-msa-platform/docs/mappings/current-to-target-repo-map.md`
- `../clever-msa-platform/docs/mappings/repo-responsibility-matrix.md`

Expected: the new docs tree can answer where each current folder will go.

- [ ] **Step 4: Verify docs coverage**

Run:

```bash
find ../clever-msa-platform/docs -type f | sort
```

Expected: every critical current document class has a destination in the new tree.

- [ ] **Step 5: Ready-to-Commit File List 기록**

Record the copied docs and new mapping files.

### Task 3: Extract The Local Integration Repo

**Files:**
- Move: `compose/` -> `../clever-msa-platform/development/integration-local-stack/compose/`
- Move: `infra/` -> `../clever-msa-platform/development/integration-local-stack/infra/`
- Move: `docker-compose.account-driver-settlement.yml` -> `../clever-msa-platform/development/integration-local-stack/`
- Create: `../clever-msa-platform/development/integration-local-stack/README.md`

- [ ] **Step 1: Create the integration repo folder**

Run:

```bash
mkdir -p ../clever-msa-platform/development/integration-local-stack
```

Expected: the integration repo root exists.

- [ ] **Step 2: Move local orchestration assets**

Move:
- `compose/`
- `infra/`
- `docker-compose.account-driver-settlement.yml`

Expected: all cross-repo bootstrap assets now live under `integration-local-stack`.

- [ ] **Step 3: Rewrite relative paths in compose and helper docs**

Update:
- compose build contexts
- env file references
- README instructions

Expected: local integration assets no longer assume they live beside service source folders.

- [ ] **Step 4: Verify compose parses after the move**

Run:

```bash
docker compose -f ../clever-msa-platform/development/integration-local-stack/docker-compose.account-driver-settlement.yml config
```

Expected: exit code `0`.

- [ ] **Step 5: Ready-to-Commit File List 기록**

Record the integration repo paths and updated compose references.

### Task 4: Extract Direct-Move Runtime Repos

**Files:**
- Move: `gateway/` -> `../clever-msa-platform/development/edge-api-gateway/`
- Move: `front/` -> `../clever-msa-platform/development/front-operator-console/`
- Move: `admin-front/` -> `../clever-msa-platform/development/front-admin-console/`
- Move: `services/organization-master/` -> `../clever-msa-platform/development/service-organization-registry/`
- Move: `services/account-auth/` -> `../clever-msa-platform/development/service-account-access/`
- Move: `services/driver-profile/` -> `../clever-msa-platform/development/service-driver-profile/`
- Move: `services/vehicle-asset/` -> `../clever-msa-platform/development/service-vehicle-registry/`
- Move: `services/driver-vehicle-assignment/` -> `../clever-msa-platform/development/service-vehicle-assignment/`
- Move: `services/vehicle-ops/` -> `../clever-msa-platform/development/service-vehicle-operations-view/`
- Move: `services/driver-360/` -> `../clever-msa-platform/development/service-driver-operations-view/`

- [ ] **Step 1: Create empty target repo folders**

Run:

```bash
mkdir -p \
  ../clever-msa-platform/development/edge-api-gateway \
  ../clever-msa-platform/development/front-operator-console \
  ../clever-msa-platform/development/front-admin-console \
  ../clever-msa-platform/development/service-organization-registry \
  ../clever-msa-platform/development/service-account-access \
  ../clever-msa-platform/development/service-driver-profile \
  ../clever-msa-platform/development/service-vehicle-registry \
  ../clever-msa-platform/development/service-vehicle-assignment \
  ../clever-msa-platform/development/service-vehicle-operations-view \
  ../clever-msa-platform/development/service-driver-operations-view
```

Expected: all direct-move targets exist before any source move.

- [ ] **Step 2: Move one repo at a time and fix local paths immediately**

Sequence:
1. `gateway/`
2. `front/`
3. `admin-front/`
4. `services/organization-master/`
5. `services/account-auth/`
6. `services/driver-profile/`
7. `services/vehicle-asset/`
8. `services/driver-vehicle-assignment/`
9. `services/vehicle-ops/`
10. `services/driver-360/`

Expected: each move is followed by path correction in the integration repo before the next move begins.

- [ ] **Step 3: Add repo-local README boundaries**

Each moved repo gets a concise README with:
- what it owns
- what it does not own
- which docs folder contains the architecture truth

Expected: directory names and README together make the boundary obvious.

- [ ] **Step 4: Verify each moved repo still builds or tests from its new location**

Run only repo-targeted checks, for example:

```bash
docker compose -f ../clever-msa-platform/development/integration-local-stack/docker-compose.account-driver-settlement.yml config
```

Plus service-specific or frontend-specific tests as needed.

Expected: each moved repo can still be referenced by the integration stack.

- [ ] **Step 5: Ready-to-Commit File List 기록**

Record the moved repos and their updated integration references.

### Task 5: Decompose Settlement Instead Of Promoting It

**Files:**
- Analyze: `services/settlement/`
- Create: `../clever-msa-platform/development/service-settlement-registry/`
- Create: `../clever-msa-platform/development/service-delivery-record/`
- Create: `../clever-msa-platform/development/service-settlement-operations-view/`
- Create: `../clever-msa-platform/docs/mappings/settlement-decomposition-map.md`

- [ ] **Step 1: Freeze the current settlement folder as a decomposition source**

Do not move `services/settlement/` directly.

Expected: the team treats the current folder as temporary source material only.

- [ ] **Step 2: Write the settlement decomposition map**

Create:
- `../clever-msa-platform/docs/mappings/settlement-decomposition-map.md`

Expected: each current settlement file is classified as registry, delivery record, operations view, or future candidate.

- [ ] **Step 3: Create empty target settlement repo shells**

Run:

```bash
mkdir -p \
  ../clever-msa-platform/development/service-settlement-registry \
  ../clever-msa-platform/development/service-delivery-record \
  ../clever-msa-platform/development/service-settlement-operations-view
```

Expected: future settlement targets are visible even before implementation starts.

- [ ] **Step 4: Verify no direct settlement promotion remains in the migration map**

Check:
- `current-to-target-repo-map.md`
- `repo-map.md`
- rollout checklist

Expected: `services/settlement/` appears only as a decomposition source.

- [ ] **Step 5: Ready-to-Commit File List 기록**

Record the decomposition map and empty settlement repo shells.

### Task 6: Reserve Future Vehicle Runtime Repos

**Files:**
- Create: `../clever-msa-platform/development/service-terminal-registry/README.md`
- Create: `../clever-msa-platform/development/service-telemetry-hub/README.md`

- [ ] **Step 1: Create future repo shells**

Run:

```bash
mkdir -p \
  ../clever-msa-platform/development/service-terminal-registry \
  ../clever-msa-platform/development/service-telemetry-hub
```

Expected: the platform tree already shows the intended future runtime boundaries.

- [ ] **Step 2: Add boundary-only README files**

Document:
- current role
- future role
- out-of-scope ownership

Expected: the repos exist as placeholders without fake implementation.

- [ ] **Step 3: Ready-to-Commit File List 기록**

Record the future shell directories and README files.

### Task 7: Cut Over Mapping And Rollout Docs

**Files:**
- Create: `../clever-msa-platform/docs/rollout/platform-restructure-checklist.md`
- Create: `../clever-msa-platform/docs/rollout/migration-order.md`
- Modify: `../clever-msa-platform/repo-map.md`
- Modify: `../clever-msa-platform/WORKSPACE.md`

- [ ] **Step 1: Promote this plan into the new docs tree**

Copy or adapt this document into:
- `../clever-msa-platform/docs/rollout/platform-restructure-checklist.md`

Expected: the rollout truth moves from the legacy workspace into the new platform docs.

- [ ] **Step 2: Add migration order and repo ownership summary**

Create:
- `migration-order.md`
- repo ownership summary in `repo-map.md`

Expected: a newcomer can answer where code lives and in what order migration proceeds.

- [ ] **Step 3: Verify docs discoverability**

Run:

```bash
find ../clever-msa-platform/docs -maxdepth 2 -type f | sort
```

Expected: rollout and mapping docs are easy to locate by folder name alone.

- [ ] **Step 4: Ready-to-Commit File List 기록**

Record the new rollout docs and workspace index files.

### Task 8: Retire The Old Mixed Workspace Safely

**Files:**
- Modify: current workspace root README or handoff note
- Create: `../clever-msa-platform/docs/decisions/legacy-workspace-retirement-note.md`

- [ ] **Step 1: Mark the old workspace as transitional**

Add one note explaining:
- the new platform root path
- which paths are now read-only
- where the docs truth lives

Expected: nobody keeps editing both workspaces as peers.

- [ ] **Step 2: Verify there is no double source of truth**

Check:
- docs truth exists only in the new platform tree
- integration truth exists only in `integration-local-stack`
- moved repos are not still edited in the old tree

Expected: old and new structures do not compete.

- [ ] **Step 3: Ready-to-Commit File List 기록**

Record the retirement note and the old-workspace handoff message.

## Verification Checklist

- `clever-msa-platform/` exists with `docs/` and `development/`
- `docs/` files are categorized by purpose, not by old folder name
- `docs/archive/` contains document-only retirement buckets and is not treated as active truth
- direct-move repos run from `development/`
- `integration-local-stack` owns all local Compose and cross-repo bootstrap assets
- `settlement` is treated as a decomposition source, not a promoted final repo
- future repo shells for `service-terminal-registry` and `service-telemetry-hub` exist
- the old workspace no longer acts as the primary source of truth

## Risks To Watch

- moving compose before fixing build contexts will break the local stack
- promoting `services/settlement/` directly will harden a bad boundary
- leaving mapping truth inside service READMEs will cause drift
- keeping duplicate docs in old and new trees for too long will create confusion
