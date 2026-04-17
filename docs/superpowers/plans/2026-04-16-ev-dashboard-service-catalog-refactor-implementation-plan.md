# ev-dashboard Service Catalog Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduce a single `serviceCatalog.ts` that becomes the source of truth for service deployment metadata, then switch wave/impact/gateway route consumers to read from it without changing deploy behavior.

**Architecture:** Keep the current workflow and runtime behavior intact, but extract the duplicated service metadata into a catalog module inside `infra-ev-dashboard-platform`. Migrate the smallest pure-consumer modules first (`releaseWavePolicy`, `releaseImpact`, `gatewayRouteProfile`), then use the same catalog to thin `config.ts` and `preflight.ts` in later work.

**Tech Stack:** TypeScript, Jest, AWS CDK repo conventions, Markdown docs.

---

## File Structure

### New metadata source

- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/lib/serviceCatalog.ts`
  - Central service metadata definitions and query helpers.

### First-wave consumers

- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/lib/releaseWavePolicy.ts`
  - Stop owning `SERVICE_WAVE_MAP`.
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/lib/releaseImpact.ts`
  - Stop owning `serviceRouteGroupMap`.
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/lib/gatewayRouteProfile.ts`
  - Stop hardcoding route-group membership from config fields.

### Tests

- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/test/serviceCatalog.test.ts`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/test/releaseImpact.test.ts`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/test/releaseWavePolicy.test.ts`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/test/gateway-route-profile.test.ts`

### Design docs

- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/superpowers/specs/2026-04-16-ev-dashboard-service-catalog-refactor-design.md`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/superpowers/plans/2026-04-16-ev-dashboard-service-catalog-refactor-implementation-plan.md`

---

### Task 1: Write and lock the service catalog contract

**Files:**
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/lib/serviceCatalog.ts`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/test/serviceCatalog.test.ts`

- [x] **Step 1: Write the failing catalog tests**

```ts
import {
  getServiceCatalogEntry,
  listServiceCatalogEntries,
  listCatalogEntriesForRouteGroup,
  listCatalogEntriesForWave
} from '../lib/serviceCatalog';

test('returns metadata for a concrete service', () => {
  expect(getServiceCatalogEntry('service-settlement-registry')).toMatchObject({
    service: 'service-settlement-registry',
    routeGroup: 'settlement',
    wave: 1,
    desiredCountEnvKey: 'SETTLEMENT_REGISTRY_DESIRED_COUNT'
  });
});

test('lists route-group members from one source of truth', () => {
  expect(listCatalogEntriesForRouteGroup('support-surface').map((entry) => entry.service)).toEqual([
    'service-announcement-registry',
    'service-notification-hub',
    'service-region-analytics',
    'service-region-registry',
    'service-support-registry'
  ]);
});
```

- [x] **Step 2: Run the new test file and verify RED**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform
npm test -- --runInBand --runTestsByPath test/serviceCatalog.test.ts
```

Expected:
- fail because `serviceCatalog.ts` does not exist yet

- [x] **Step 3: Implement the minimal catalog**

Requirements:
- define a typed entry per deploy service
- include at least:
  - `service`
  - `routeGroup`
  - `wave`
  - `slice`
  - `imageEnvKey`
  - `desiredCountEnvKey`
  - `cpuEnvKey`
  - `memoryEnvKey`
  - `healthCheckPathEnvKey`
- export helpers:
  - `listServiceCatalogEntries`
  - `getServiceCatalogEntry`
  - `listCatalogEntriesForWave`
  - `listCatalogEntriesForRouteGroup`

- [x] **Step 4: Run the catalog tests and verify GREEN**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform
npm test -- --runInBand --runTestsByPath test/serviceCatalog.test.ts
```

Expected:
- PASS

- [ ] **Step 5: Commit**

```bash
git -C /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform add \
  lib/serviceCatalog.ts \
  test/serviceCatalog.test.ts
git -C /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform commit -m "refactor: add deployment service catalog"
```

### Task 2: Move wave policy to the catalog

**Files:**
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/lib/releaseWavePolicy.ts`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/test/releaseWavePolicy.test.ts`

- [ ] **Step 1: Extend the wave-policy tests to prove catalog ownership**

Add coverage that:
- backend services still map to waves 1 or 2
- `edge-api-gateway` stays wave 3
- `front-web-console` stays wave 4

- [ ] **Step 2: Run the targeted test and verify RED**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform
npm test -- --runInBand --runTestsByPath test/releaseWavePolicy.test.ts
```

- [x] **Step 3: Replace `SERVICE_WAVE_MAP` with catalog lookups**

Requirements:
- keep `WAVE_LABELS`
- remove inline service mapping
- read wave from `serviceCatalog.ts`

- [x] **Step 4: Run the test and verify GREEN**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform
npm test -- --runInBand --runTestsByPath test/releaseWavePolicy.test.ts test/serviceCatalog.test.ts
```

- [ ] **Step 5: Commit**

```bash
git -C /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform add \
  lib/releaseWavePolicy.ts \
  test/releaseWavePolicy.test.ts
git -C /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform commit -m "refactor: source release waves from service catalog"
```

### Task 3: Move release impact route-group mapping to the catalog

**Files:**
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/lib/releaseImpact.ts`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/test/releaseImpact.test.ts`

- [ ] **Step 1: Add a failing test that proves touched route groups come from catalog metadata**

- [ ] **Step 2: Run the targeted test and verify RED**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform
npm test -- --runInBand --runTestsByPath test/releaseImpact.test.ts
```

- [x] **Step 3: Remove `serviceRouteGroupMap` and use catalog lookups**

Requirements:
- keep classification semantics unchanged
- keep `routeGroups` ordering unchanged

- [x] **Step 4: Run the tests and verify GREEN**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform
npm test -- --runInBand --runTestsByPath test/releaseImpact.test.ts test/releaseWavePolicy.test.ts test/serviceCatalog.test.ts
```

- [ ] **Step 5: Commit**

```bash
git -C /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform add \
  lib/releaseImpact.ts \
  test/releaseImpact.test.ts
git -C /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform commit -m "refactor: source release impact from service catalog"
```

### Task 4: Move gateway route-group membership to the catalog

**Files:**
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/lib/gatewayRouteProfile.ts`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/test/gateway-route-profile.test.ts`

- [ ] **Step 1: Write a failing test for route-group membership derived from catalog entries**

- [ ] **Step 2: Run the targeted test and verify RED**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform
npm test -- --runInBand --runTestsByPath test/gateway-route-profile.test.ts
```

- [x] **Step 3: Replace per-group desired-count switch logic with catalog-driven evaluation**

Requirements:
- retain the exported `gatewayRouteGroups`
- determine whether a route group is enabled by consulting the catalog entries for that group and reading the desired-count values from config
- do not change `bootstrap-proof`, `partial`, `full` semantics

- [x] **Step 4: Run the tests and verify GREEN**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform
npm test -- --runInBand --runTestsByPath test/gateway-route-profile.test.ts test/releaseImpact.test.ts test/releaseWavePolicy.test.ts test/serviceCatalog.test.ts
```

- [ ] **Step 5: Commit**

```bash
git -C /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform add \
  lib/gatewayRouteProfile.ts \
  test/gateway-route-profile.test.ts
git -C /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform commit -m "refactor: source gateway route groups from service catalog"
```

### Task 5: Verify, document next slice, and stop

**Files:**
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/superpowers/specs/2026-04-16-ev-dashboard-service-catalog-refactor-design.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/superpowers/plans/2026-04-16-ev-dashboard-service-catalog-refactor-implementation-plan.md`

- [x] **Step 1: Run the focused verification suite**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform
npm test -- --runInBand --runTestsByPath \
  test/serviceCatalog.test.ts \
  test/releaseWavePolicy.test.ts \
  test/releaseImpact.test.ts \
  test/gateway-route-profile.test.ts
npm run build
```

Expected:
- all targeted tests pass
- build exits `0`

- [x] **Step 2: Re-read the design and note the next refactor slice**

Record:
- remaining `config.ts` duplication
- remaining `preflight.ts` duplication
- deferred `stack.ts` migration boundary

- [x] **Step 3: Commit the completed first slice**

```bash
git -C /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform add \
  lib/serviceCatalog.ts \
  lib/releaseWavePolicy.ts \
  lib/releaseImpact.ts \
  lib/gatewayRouteProfile.ts \
  test/serviceCatalog.test.ts \
  test/releaseWavePolicy.test.ts \
  test/releaseImpact.test.ts \
  test/gateway-route-profile.test.ts
git -C /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform commit -m "refactor: centralize deploy service metadata"
```

---

## Phase 2 Extension

Phase 2 starts only after the Phase 1 slice is merged or otherwise accepted as the new metadata baseline. The goal is to move duplicated env-key and slice-group knowledge out of `config.ts` and `preflight.ts` without changing deploy semantics.

This phase keeps two constraints from the design:

- `slice` remains informational metadata until preflight dependency truth is explicitly migrated and re-approved.
- `gatewayRouteGroups` ordering and `bootstrap-proof / partial / full` route-profile semantics must stay unchanged.

### Task 6: Refactor `config.ts` to consume catalog env-key metadata

**Files:**
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/lib/config.ts`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/test/config.test.ts`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/lib/serviceCatalog.ts`

- [x] **Step 1: Write failing tests for catalog-driven config parsing helpers**

Add tests that prove:
- a catalog entry can provide the env keys needed for desired count parsing
- optional services like telemetry listener still keep optional fields optional
- `bootstrap-proof` zeroing behavior is unchanged after catalog consumption begins

- [x] **Step 2: Run the targeted config tests and verify RED**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform
npm test -- --runInBand --runTestsByPath test/config.test.ts
```

- [x] **Step 3: Add catalog helpers for config consumers**

Requirements:
- add helper(s) that expose service entries with config keys suitable for env parsing
- do not move all `PlatformConfigInput` fields into generated types in this step
- keep the public `PlatformConfig` shape stable

- [x] **Step 4: Replace the most repetitive service-env parsing branches in `config.ts`**

Target only the duplicated service metadata reads:
- desired count keys
- image env keys where appropriate
- CPU and memory env keys where appropriate

Do not change:
- runtime mode branching
- EC2 subnet validation
- `bootstrap-proof` zeroing semantics
- `warm-host-partial` gate

- [x] **Step 5: Run the config tests and verify GREEN**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform
npm test -- --runInBand --runTestsByPath test/config.test.ts test/serviceCatalog.test.ts
```

- [x] **Step 6: Commit**

```bash
git -C /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform add \
  lib/config.ts \
  lib/serviceCatalog.ts \
  test/config.test.ts
git -C /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform commit -m "refactor: source config metadata from service catalog"
```

### Task 7: Refactor `preflight.ts` to consume catalog image-key and slice-group metadata

**Files:**
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/lib/preflight.ts`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/test/preflight.test.ts`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/lib/serviceCatalog.ts`

- [x] **Step 1: Write failing tests for catalog-driven preflight metadata**

Add tests that prove:
- image env keys come from the catalog instead of a duplicated `IMAGE_ENV_KEYS` list
- enabled service groups can be formatted from catalog-backed group membership
- route-group and impact checks still fail on the same conditions

- [x] **Step 2: Run the targeted preflight tests and verify RED**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform
npm test -- --runInBand --runTestsByPath test/preflight.test.ts
```

- [x] **Step 3: Replace duplicated image-key lookup with catalog helpers**

Requirements:
- remove or shrink the hardcoded `IMAGE_ENV_KEYS` list
- keep manifest-scoped image validation behavior unchanged
- keep ECR lookup skip flags and runtime-mode guards unchanged

- [x] **Step 4: Replace service-group formatting with catalog-backed grouping**

Requirements:
- keep user-facing labels unchanged for this step
- do not migrate dependency truth to catalog-backed `slice` metadata yet
- keep existing dependency guards as-is until separately approved

- [x] **Step 5: Run the preflight tests and verify GREEN**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform
npm test -- --runInBand --runTestsByPath test/preflight.test.ts test/config.test.ts test/serviceCatalog.test.ts
```

- [x] **Step 6: Commit**

```bash
git -C /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform add \
  lib/preflight.ts \
  lib/serviceCatalog.ts \
  test/preflight.test.ts
git -C /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform commit -m "refactor: source preflight metadata from service catalog"
```

## Phase 2.5 Boundary Preparation

Phase 2.5 is a boundary-preparation slice for the later stack migration. It is not the main `config.ts` / `preflight.ts` migration itself, and it should not start until Phase 2 is accepted.

### Task 8: Prepare the `stack.ts` migration boundary without changing deploy behavior

**Files:**
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/lib/ev-dashboard-platform-stack.ts`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/test/ev-dashboard-platform-stack.test.ts`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/test/edge-gateway-profile.test.ts`

- [x] **Step 1: Write failing tests for stack consumption of catalog metadata**

Add coverage that proves:
- gateway env injection still includes `GATEWAY_PROFILE` and `GATEWAY_ROUTE_GROUPS`
- at least one backend service manifest is assembled from catalog metadata rather than duplicated service-local constants

- [x] **Step 2: Run the targeted stack tests and verify RED**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform
npm test -- --runInBand --runTestsByPath test/ev-dashboard-platform-stack.test.ts test/edge-gateway-profile.test.ts
```

- [x] **Step 3: Introduce stack-facing catalog helpers**

Requirements:
- expose only metadata the stack can safely consume in this step
- do not move full runtime container spec into the catalog yet
- keep `orderAppHostRuntimeServices` integration intact

- [x] **Step 4: Migrate one small repeated metadata slice in `stack.ts`**

Good first target:
- image/env/health metadata for a bounded set of backend services

Do not change:
- stack names
- resource identity
- deploy workflow contract
- host bootstrap logic

- [x] **Step 5: Run stack tests and verify GREEN**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform
npm test -- --runInBand --runTestsByPath \
  test/ev-dashboard-platform-stack.test.ts \
  test/edge-gateway-profile.test.ts \
  test/gateway-route-profile.test.ts \
  test/releaseImpact.test.ts \
  test/releaseWavePolicy.test.ts \
  test/serviceCatalog.test.ts
npm run build
```

- [x] **Step 6: Commit**

```bash
git -C /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform add \
  lib/ev-dashboard-platform-stack.ts \
  lib/serviceCatalog.ts \
  test/ev-dashboard-platform-stack.test.ts \
  test/edge-gateway-profile.test.ts
git -C /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform commit -m "refactor: prepare stack metadata consumption from service catalog"
```

## Phase 3 Stack Migration

Phase 3 begins only after the boundary-preparation slice is accepted. The goal is to expand real catalog consumption inside `ev-dashboard-platform-stack.ts` without changing deploy identity, host bootstrap behavior, or workflow contract.

Expected Phase 3 scope:

- move more duplicated backend service metadata out of `ev-dashboard-platform-stack.ts`
- keep stack/resource names stable
- preserve `orderAppHostRuntimeServices`, gateway env injection, and runtime manifest behavior
- avoid pulling full runtime container spec into the catalog until the metadata-only migration is proven stable
- keep `gatewayRouteGroups` order and `bootstrap-proof / partial / full` semantics unchanged

### Task 9: Expand catalog-backed app-host runtime metadata for backend HTTP services

**Files:**
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/lib/serviceCatalog.ts`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/lib/ev-dashboard-platform-stack.ts`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/test/ev-dashboard-platform-stack.test.ts`

- [x] **Step 1: Write failing stack tests for broader catalog-backed app-host runtime assembly**

Add coverage that proves:
- at least one additional wave-1 backend service and one wave-2 read-model service are assembled via stack helper(s) that consume catalog runtime metadata
- existing gateway env injection assertions still pass unchanged
- `front-web-console` and `edge-api-gateway` remain outside the new backend helper scope in this task

- [x] **Step 2: Run the targeted stack tests and verify RED**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform
npm test -- --runInBand --runTestsByPath test/ev-dashboard-platform-stack.test.ts test/edge-gateway-profile.test.ts
```

- [x] **Step 3: Extend catalog app-host runtime metadata for bounded backend services**

Requirements:
- add `appHostRuntime` metadata only for this bounded backend subset in this task:
  - `service-driver-profile`
  - `service-personnel-document-registry`
  - `service-vehicle-registry`
  - `service-vehicle-assignment`
  - `service-dispatch-operations-view`
  - `service-driver-operations-view`
  - `service-vehicle-operations-view`
- keep telemetry listener, gateway, and front outside this expansion step
- do not move per-service environment payloads or secret maps into the catalog yet

- [x] **Step 4: Expand the stack helper to consume the new metadata without changing runtime behavior**

Requirements:
- keep `orderAppHostRuntimeServices(...)` call intact
- keep service IDs, container names, ports, and enable predicates identical
- migrate only the repeated base fields (`id`, `imageMapKey`, `containerName`, `containerPort`, optional `hostPort`) for the bounded backend set

- [x] **Step 5: Run the focused stack regression suite and verify GREEN**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform
npm test -- --runInBand --runTestsByPath \
  test/ev-dashboard-platform-stack.test.ts \
  test/edge-gateway-profile.test.ts \
  test/serviceCatalog.test.ts \
  test/releaseWavePolicy.test.ts \
  test/releaseImpact.test.ts \
  test/gateway-route-profile.test.ts
npm run build
```

- [x] **Step 6: Commit**

```bash
git -C /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform add \
  lib/serviceCatalog.ts \
  lib/ev-dashboard-platform-stack.ts \
  test/ev-dashboard-platform-stack.test.ts
git -C /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform commit -m "refactor: expand stack catalog runtime metadata"
```

### Task 10: Migrate runtime image-map assembly to catalog-backed lookup

**Files:**
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/lib/serviceCatalog.ts`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/lib/ev-dashboard-platform-stack.ts`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/test/ev-dashboard-platform-stack.test.ts`

- [x] **Step 1: Write failing tests for catalog-backed runtime image-map generation**

Add coverage that proves:
- `buildRuntimeImageMap` no longer depends on a hand-written full service list for the catalog-backed subset
- optional telemetry/terminal images still remain omitted when their image URIs are undefined
- image-map keys emitted for currently proven services stay identical

- [x] **Step 2: Run the targeted stack tests and verify RED**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform
npm test -- --runInBand --runTestsByPath test/ev-dashboard-platform-stack.test.ts
```

- [x] **Step 3: Add catalog helpers for stack-facing image-map consumption**

Requirements:
- expose only image-map lookup metadata needed by `buildRuntimeImageMap`
- keep config field names and optional-image rules unchanged
- do not move non-image stack concerns into these helpers

- [x] **Step 4: Replace the repeated runtime image-map assembly with catalog-backed iteration**

Requirements:
- preserve output key names exactly
- preserve optional terminal/telemetry omission behavior exactly
- avoid changing release manifest, app-host bootstrap, or SSM parameter contract

- [x] **Step 5: Run stack and catalog regressions and verify GREEN**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform
npm test -- --runInBand --runTestsByPath \
  test/ev-dashboard-platform-stack.test.ts \
  test/serviceCatalog.test.ts \
  test/config.test.ts \
  test/preflight.test.ts
npm run build
```

- [x] **Step 6: Commit**

```bash
git -C /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform add \
  lib/serviceCatalog.ts \
  lib/ev-dashboard-platform-stack.ts \
  test/ev-dashboard-platform-stack.test.ts
git -C /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform commit -m "refactor: source stack runtime image map from catalog"
```

### Task 11: Shrink remaining stack-local service metadata without changing deploy identity

**Files:**
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/lib/ev-dashboard-platform-stack.ts`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/lib/serviceCatalog.ts`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/test/ev-dashboard-platform-stack.test.ts`

- [ ] **Step 1: Write failing tests for the final Phase 3 metadata slice**

Add coverage that proves:
- one more repeated metadata slice in `ev-dashboard-platform-stack.ts` moved behind a catalog helper
- stack outputs, runtime manifest secret shape, and gateway profile env payload remain unchanged

- [ ] **Step 2: Run the targeted tests and verify RED**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform
npm test -- --runInBand --runTestsByPath test/ev-dashboard-platform-stack.test.ts test/edge-gateway-profile.test.ts
```

- [ ] **Step 3: Apply the smallest remaining metadata extraction that pays down duplication**

Good candidates:
- repeated browser/internal allowed-host service base fields
- repeated base app-host runtime construction for non-worker backend services

Do not change:
- stack names
- resource logical identity
- bootstrap units
- release workflow contract
- gateway/front/runtime-contract behavior

Execution guard:
- move only one remaining metadata slice per patch in this task; do not combine multiple metadata slices into one patch

- [ ] **Step 4: Run the full Phase 1-3 regression suite and verify GREEN**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform
npm test -- --runInBand --runTestsByPath \
  test/config.test.ts \
  test/preflight.test.ts \
  test/serviceCatalog.test.ts \
  test/releaseWavePolicy.test.ts \
  test/releaseImpact.test.ts \
  test/gateway-route-profile.test.ts \
  test/edge-gateway-profile.test.ts \
  test/ev-dashboard-platform-stack.test.ts
npm run build
```

- [ ] **Step 5: Commit**

```bash
git -C /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform add \
  lib/serviceCatalog.ts \
  lib/ev-dashboard-platform-stack.ts \
  test/ev-dashboard-platform-stack.test.ts
git -C /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform commit -m "refactor: reduce remaining stack service metadata duplication"
```
