# EV Dashboard Backend Slices Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Execute the remaining `ev-dashboard.com` backend migration as sequential ECS slices with fixed order, fixed ownership, and public smoke evidence for every slice.

**Architecture:** Keep `infra-ev-dashboard-platform` as the shared runtime owner and move remaining backend capabilities one slice at a time behind the existing `edge-api-gateway`. Each slice reuses the proven ALB/ACM/ECS entry path, preserves current gateway short names and prefixes, and closes with external smoke plus lesson updates before the next slice starts.

**Tech Stack:** AWS CDK (TypeScript), ECS/Fargate, ALB, Route53, ACM, GitHub Actions, OIDC, Nginx, Django/Gunicorn, CLEVER service repos, root rollout docs.

## Mandatory Deploy Gate

Every remaining slice starts with the same preflight order. Do not skip directly to deploy.

1. Read root [lesson.md](/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/lesson.md) and the target repo `lesson.md`.
2. Run the infra repo preflight gate:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform
npm run preflight
npm test -- --runInBand
npx cdk synth
```

3. Only after that run the deploy workflow.
4. During deploy, use the wait pattern in [ev-dashboard-ecs-preflight-gate.md](/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/runbooks/ev-dashboard-ecs-preflight-gate.md) instead of constant fast polling.

## Current Status

- `Task 1` is complete.
- `Task 2` is complete.
- `Task 3` runtime cutover for the organization slice is complete on production ECS.
- `Task 4` runtime/API proof for the people-and-assets slice is complete on production ECS.
- `Task 5` runtime/API proof for the dispatch-inputs slice is complete on production ECS.
- `Task 6` runtime/API proof for the dispatch read-model slice is complete on production ECS.
- `Task 7` runtime/API proof for the settlement slice is complete on production ECS.
- `Task 8` runtime/API proof for the support-surface slice is complete on production ECS.
- Verified public and protected read paths:
  - `https://api.ev-dashboard.com/api/org/companies/public/` -> `200`
  - `https://api.ev-dashboard.com/api/org/companies/` -> `200` with admin JWT
  - `https://api.ev-dashboard.com/api/org/fleets/` -> `200` with admin JWT
  - `https://api.ev-dashboard.com/api/auth/health/` -> `200`
  - `https://api.ev-dashboard.com/openapi.yaml` -> `200`
  - `https://api.ev-dashboard.com/swagger/` -> `200`
  - `https://api.ev-dashboard.com/admin/account-access/login/` -> `200`
- Residual for `Task 3`: `manager-accounts` and `identity-signup-requests/manage` still need a real production identity session for honest smoke. They were not write-smoked because that would mutate prod state.

---

### Task 1: Lock The Slice Roadmap In Docs

**Files:**
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/superpowers/specs/2026-04-14-ev-dashboard-backend-slices-design.md`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/superpowers/plans/2026-04-14-ev-dashboard-backend-slices-implementation-plan.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/rollout/2026-04-13-ecs-cdk-oidc-actions-transition.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/rollout/plans/2026-04-13-ev-dashboard-domain-ecs-cutover-plan.md`

- [ ] Write the sequencing design and record the evidence for why `Company Governance` comes next.
- [ ] Add a short pointer in the rollout docs that the remaining backend order is now fixed by the new spec/plan pair.
- [ ] Run `git diff --check -- docs/superpowers/specs/2026-04-14-ev-dashboard-backend-slices-design.md docs/superpowers/plans/2026-04-14-ev-dashboard-backend-slices-implementation-plan.md docs/rollout/2026-04-13-ecs-cdk-oidc-actions-transition.md docs/rollout/plans/2026-04-13-ev-dashboard-domain-ecs-cutover-plan.md`.
- [ ] Commit:

```bash
git add docs/superpowers/specs/2026-04-14-ev-dashboard-backend-slices-design.md \
        docs/superpowers/plans/2026-04-14-ev-dashboard-backend-slices-implementation-plan.md \
        docs/rollout/2026-04-13-ecs-cdk-oidc-actions-transition.md \
        docs/rollout/plans/2026-04-13-ev-dashboard-domain-ecs-cutover-plan.md
git commit -m "docs: define ev-dashboard backend slice roadmap"
```

### Task 2: Prepare The Shared Infra For Additional Backend Services

**Files:**
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/lib/config.ts`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/lib/ev-dashboard-platform-stack.ts`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/test/config.test.ts`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/test/ev-dashboard-platform-stack.test.ts`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/README.md`

- [ ] Write failing tests for generic backend service slots that preserve service-connect DNS names and desired-count gating.
- [ ] Add config inputs for additional service image URIs and desired counts only for the next slice, not for the whole platform at once.
- [ ] Implement the minimal CDK changes to host `service-organization-registry` behind `organization-master-api`.
- [ ] Re-run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform
npm test -- --runInBand
npx cdk synth
```

- [ ] Commit:

```bash
git add lib/config.ts lib/ev-dashboard-platform-stack.ts test/config.test.ts test/ev-dashboard-platform-stack.test.ts README.md
git commit -m "feat: add organization slice runtime slot"
```

### Task 3: Execute Slice 1 Company Governance

**Files:**
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-organization-registry/README.md`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-organization-registry/lesson.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/edge-api-gateway/nginx.conf`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/edge-api-gateway/tests/test_nginx_docs_routes.py`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/lesson.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/lesson.md`

- [ ] Confirm `service-organization-registry` can answer the exact current prefixes: `/api/org/companies/`, `/api/org/fleets/`, `/api/org/companies/public/`.
- [ ] Add or adjust gateway routing so `/api/org/*` uses the same direct-or-stable upstream rules that worked for account access.
- [ ] Build the organization image from its repo workflow and record the image URI.
- [ ] Set the next infra repo variables or workflow inputs for `service-organization-registry`.
- [ ] Deploy the slice with explicit image URIs.
- [ ] Smoke-check:

```bash
curl -sk https://api.ev-dashboard.com/api/org/companies/public/
curl -sk https://api.ev-dashboard.com/api/org/companies/
curl -sk https://api.ev-dashboard.com/api/org/fleets/
```

- [ ] Run UI smoke for:
  - `CompaniesPage`
  - `CompanyDetailPage`
  - `FleetDetailPage`
  - `AccountsPage`
  - `ManagerRolesPage`
- [ ] Record lessons in root and repo-local lesson files.
- [ ] Commit repo-local changes in `service-organization-registry`, `edge-api-gateway`, `infra-ev-dashboard-platform`, then update the root submodule pointer.

### Task 4: Execute Slice 2 People And Assets

**Files:**
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-driver-profile/README.md`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-driver-profile/lesson.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-personnel-document-registry/README.md`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-personnel-document-registry/lesson.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-vehicle-registry/README.md`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-vehicle-registry/lesson.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-vehicle-assignment/README.md`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-vehicle-assignment/lesson.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/edge-api-gateway/nginx.conf`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/lib/config.ts`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/lib/ev-dashboard-platform-stack.ts`

**Execution notes locked before implementation:**
- `service-personnel-document-registry` must receive `DRIVER_PROFILE_BASE_URL=http://driver-profile-api:8000`.
- `service-vehicle-assignment` must receive both `DRIVER_PROFILE_BASE_URL=http://driver-profile-api:8000` and `VEHICLE_ASSET_BASE_URL=http://vehicle-asset-api:8000`.
- Infra rollout order should be `driver-profile + vehicle-registry -> personnel-document-registry + vehicle-assignment -> edge-api-gateway`.
- Gateway routes for this slice should follow the Slice 1 lesson: prefer direct upstreams for the four stable service-connect names instead of variable `proxy_pass` resolution.

- [ ] Add failing infra tests for `driver-profile-api`, `vehicle-asset-api`, `driver-vehicle-assignment-api`, and `personnel-document-registry-api`.
- [ ] Extend infra and gateway for the four service-connect names without touching later slices.
- [ ] Build and deploy the four service images.
- [ ] Smoke-check:
  - `/api/drivers/`
  - `/api/personnel-documents/`
  - `/api/vehicles/`
  - `/api/driver-vehicle-assignments/`
- [ ] Run UI smoke for:
  - `DriversPage`
  - `DriverDetailPage`
  - `VehiclesPage`
  - `VehicleAssignmentsPage`
  - `PersonnelDocumentsPage`
- [ ] Capture lessons and commit each touched repo plus the root submodule updates.

**Execution result:**
- Completed in production with infra deploy run `24374679916`.
- Public route proof after rollout:
  - `/api/drivers/` -> `401` unauthenticated, `200 []` with admin JWT
  - `/api/vehicles/vehicle-masters/` -> `401` unauthenticated, `200 []` with admin JWT
  - `/api/personnel-documents/documents/` -> `401` unauthenticated, `200 []` with admin JWT
  - `/api/driver-vehicle-assignments/assignments/` -> `401` unauthenticated, `200 []` with admin JWT
- Shared auth/docs/admin proof remained healthy during the slice:
  - `/api/auth/health/` -> `200`
  - `/openapi.yaml` -> `200`
  - `/swagger/` -> `200`
  - `/admin/account-access/login/` -> `200`
- The rollout produced two different `502` wait windows that should not be confused:
  - early `502` while new RDS instances were still creating and the new ECS services did not exist yet
  - later short `502` while `edge-api-gateway` was still rolling and Service Connect names were settling for the new task
- Front page smoke also passed locally:
  - `DriversPage`, `DriverDetailPage`, `VehiclesPage`, `VehicleAssignmentsPage`, `PersonnelDocumentsPage`
  - vitest result: `5 files passed, 13 tests passed`

### Task 5: Execute Slice 3 Dispatch Inputs

**Files:**
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-dispatch-registry/README.md`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-dispatch-registry/lesson.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-delivery-record/README.md`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-delivery-record/lesson.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-attendance-registry/README.md`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-attendance-registry/lesson.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/edge-api-gateway/nginx.conf`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/lib/config.ts`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/lib/ev-dashboard-platform-stack.ts`

**Execution notes locked before implementation:**
- `service-attendance-registry` should be treated as the independent seed inside this slice.
- `service-dispatch-registry` must receive:
  - `VEHICLE_REGISTRY_BASE_URL=http://vehicle-asset-api:8000`
  - `DRIVER_PROFILE_BASE_URL=http://driver-profile-api:8000`
  - `DELIVERY_RECORD_BASE_URL=http://delivery-record-api:8000`
  - `ATTENDANCE_REGISTRY_BASE_URL=http://attendance-registry-api:8000`
- `service-delivery-record` must receive:
  - `ORGANIZATION_MASTER_BASE_URL=http://organization-master-api:8000`
  - `DRIVER_PROFILE_BASE_URL=http://driver-profile-api:8000`
  - `DISPATCH_REGISTRY_BASE_URL=http://dispatch-registry-api:8000`
  - `ATTENDANCE_REGISTRY_BASE_URL=http://attendance-registry-api:8000`
- Infra rollout order should be `attendance-registry -> dispatch-registry + delivery-record -> edge-api-gateway`.
- Gateway routes for this slice should follow the Slice 1 and Slice 2 lesson: prefer direct upstreams for `dispatch-registry-api`, `delivery-record-api`, and `attendance-registry-api`.

- [ ] Add failing tests and runtime slots for `dispatch-registry-api`, `delivery-record-api`, and `attendance-registry-api`.
- [ ] Deploy the slice with explicit image URIs.
- [ ] Smoke-check:
  - `/api/dispatch/health/`
  - `/api/dispatch/plans/`
  - `/api/delivery-record/health/`
  - `/api/delivery-record/records/`
  - `/api/attendance/health/`
  - `/api/attendance/days/`
- [ ] Run UI smoke for:
  - `DispatchUploadsPage`
  - `DispatchPlanFormPage`
  - `DispatchBoardsPage`
- [ ] Record lessons and commit repo-local plus root changes.

**Execution result:**
- Completed in production with infra deploy run `24378352437`.
- Public route proof after rollout:
  - `/api/dispatch/health/` -> `200`
  - `/api/dispatch/plans/` -> `200 []` with admin JWT
  - `/api/delivery-record/health/` -> `200`
  - `/api/delivery-record/records/` -> `200 []` with admin JWT
  - `/api/attendance/health/` -> `200`
  - `/api/attendance/days/` -> `200 []` with admin JWT
- The prefix roots `/api/dispatch/`, `/api/delivery-record/`, and `/api/attendance/` were not the final proof endpoints. After routing stabilized they returned `404`, which confirmed the rewrite path was correct but the service root itself was not an API route.
- `service-delivery-record` and `service-attendance-registry` both required a container-contract fix before the slice could close:
  - GitHub Actions billing blocked the public repo image builds, so the replacement images were built locally and pushed to ECR with `docker buildx --platform linux/amd64`.
  - Their Dockerfiles had a `CMD runserver` override that bypassed `entrypoint.sh`, skipped migrations, and surfaced as `500` only on real data endpoints.

### Task 6: Execute Slice 4 Dispatch Read Models

**Files:**
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-dispatch-operations-view/README.md`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-dispatch-operations-view/lesson.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-driver-operations-view/README.md`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-driver-operations-view/lesson.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-vehicle-operations-view/README.md`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-vehicle-operations-view/lesson.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/edge-api-gateway/nginx.conf`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/lib/config.ts`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/lib/ev-dashboard-platform-stack.ts`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/test/config.test.ts`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/test/ev-dashboard-platform-stack.test.ts`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/.github/workflows/deploy-ecs.yml`

- [ ] Write failing tests first for:
  - three new stateless runtime slots
  - direct gateway upstreams for `/api/dispatch-ops/*`, `/api/driver-ops/*`, `/api/vehicle-ops/*`
  - temporary bridge override envs `SETTLEMENT_OPS_BASE_URL`, `TELEMETRY_HUB_BASE_URL`, `TERMINAL_REGISTRY_BASE_URL`
- [ ] Add runtime slots for `dispatch-ops-api`, `driver-ops-api`, and `vehicle-ops-api`.
- [ ] Keep this slice stateless. Do not add new `RDS` or `Redis` resources for these three services.
- [ ] Wire envs as follows:
  - `dispatch-ops` -> internal ECS only
  - `driver-ops` -> internal ECS + `SETTLEMENT_OPS_BASE_URL=https://hub.evnlogistics.com/api/settlement-ops`
  - `vehicle-ops` -> internal ECS + `TELEMETRY_HUB_BASE_URL=https://hub.evnlogistics.com/api/telemetry` + `TERMINAL_REGISTRY_BASE_URL=https://hub.evnlogistics.com/api/terminals`
- [ ] Change gateway routes for this slice to direct upstreams. Do not keep variable `proxy_pass` for the three read-model routes.
- [ ] Build the three images from repo workflows if Actions start normally. If public-repo billing blocks the runs again, use the Slice 3 fallback immediately:
  - local `docker buildx build --platform linux/amd64 --provenance=false --push`
- [ ] Deploy and smoke-check the honest endpoints:
  - `/api/dispatch-ops/health/`
  - `/api/dispatch-ops/board/?dispatch_date=<date>&fleet_id=<fleet_id>`
  - `/api/dispatch-ops/summary/?dispatch_date=<date>&fleet_id=<fleet_id>`
  - `/api/driver-ops/health/`
  - `/api/driver-ops/drivers/<driver_ref>/`
  - `/api/vehicle-ops/health/`
  - `/api/vehicle-ops/vehicles/`
  - `/api/vehicle-ops/vehicles/<vehicle_ref>/`
- [ ] If a protected read endpoint cannot be driven with a real prod session immediately, use `health 200` plus protected-route `401/403` only as route proof, not as final slice proof.
- [ ] Run UI smoke for:
  - `DispatchBoardDetailPage`
  - `DriverDetailPage`
  - `VehicleDetailPage`
- [ ] Confirm read-model-only boundaries and temporary bridge scope in docs and lessons.
- [ ] Commit each touched repo and update root pointers.

**Execution result:**
- Slice 4 closed at the runtime/API level with deploy run `24381237200` after the gateway-specific hotfix run `24380819103`.
- Final public route proof:
  - `/api/dispatch-ops/health/` -> `200`
  - `/api/dispatch-ops/board/?dispatch_date=2026-04-14&fleet_id=00000000-0000-0000-0000-000000000001` -> `200 []`
  - `/api/dispatch-ops/summary/?dispatch_date=2026-04-14&fleet_id=00000000-0000-0000-0000-000000000001` -> `200` zeroed summary
  - `/api/driver-ops/health/` -> `200`
  - `/api/driver-ops/drivers/00000000-0000-0000-0000-000000000001/` -> `404 not_found`
  - `/api/vehicle-ops/health/` -> `200`
  - `/api/vehicle-ops/vehicles/` -> `200 []`
  - `/api/vehicle-ops/vehicles/00000000-0000-0000-0000-000000000001/` -> `404 not_found`
- The production issues were service-level, not infra-level:
  - `service-driver-operations-view` turned upstream not-found into `500` because `SourceNotFoundError` was referenced without an import.
  - `service-vehicle-operations-view` treated temporary bridge failures from telemetry and terminal lookups as fatal, even though the old public hub rejected the new platform JWT with `401 Invalid token`.
- Slice 4 reinforced the deploy wait pattern:
  - public smoke recovered before GitHub Actions and CloudFormation finished
  - the remaining delay came from ALB target draining with `deregistration_delay.timeout_seconds=300`
- UI smoke is still pending. This task is closed only for runtime/API proof.

### Task 7: Execute Slice 5 Settlement

**Files:**
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-settlement-registry/README.md`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-settlement-registry/lesson.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-settlement-payroll/README.md`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-settlement-payroll/lesson.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-settlement-operations-view/README.md`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-settlement-operations-view/lesson.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/edge-api-gateway/nginx.conf`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/lib/config.ts`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/lib/ev-dashboard-platform-stack.ts`

- [ ] Add settlement runtime slots and failing infra tests.
- [ ] Deploy and smoke-check:
  - `/api/settlement-registry/`
  - `/api/settlements/`
  - `/api/settlement-ops/`
- [ ] Run UI smoke for:
  - `SettlementCriteriaPage`
  - `SettlementInputsPage`
  - `SettlementRunsPage`
  - `SettlementResultsPage`
  - `SettlementOverviewPage`
- [ ] Capture lessons about registry/payroll/read-model boundaries.
- [ ] Commit repo-local and root changes.

**Execution result:**
- Slice 5 closed at the runtime/API level with deploy run `24382058568`.
- Final public settlement proof:
  - `/api/settlement-registry/health/` -> `200`
  - `/api/settlements/health/` -> `200`
  - `/api/settlement-ops/health/` -> `200`
  - `/api/settlement-registry/settlement-config/metadata/` -> `401` without token
  - `/api/settlements/runs/` -> `401` without token
  - `/api/settlement-ops/runs/` -> `401` without token
- The key rollout lesson was gateway timing, not backend correctness:
  - `service-settlement-registry`, `service-settlement-payroll`, and `service-settlement-operations-view` all reached steady state before the public routes were stable.
  - `edge-api-gateway` initially returned `502` with `could not be resolved (3: Host not found)` for the new settlement Service Connect names.
  - The routes only settled after the later `EdgeApiGatewayService UPDATE_IN_PROGRESS` phase rolled a new gateway task after the settlement services already existed.
- UI smoke is still pending. This task is closed only for runtime/API proof.

### Task 8: Execute Slice 6 Support Surface

**Files:**
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-region-registry/README.md`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-region-registry/lesson.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-region-analytics/README.md`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-region-analytics/lesson.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-announcement-registry/README.md`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-announcement-registry/lesson.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-support-registry/README.md`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-support-registry/lesson.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-notification-hub/README.md`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-notification-hub/lesson.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/edge-api-gateway/nginx.conf`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/lib/config.ts`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/lib/ev-dashboard-platform-stack.ts`

- [ ] Add runtime slots and deploy the support-surface services.
- [ ] Smoke-check:
  - `/api/regions/`
  - `/api/region-analytics/`
  - `/api/announcements/`
  - `/api/ticket/`
  - `/api/notifications/`
- [ ] Run UI smoke for:
  - `RegionsPage`
  - `AnnouncementsPage`
  - `SupportPage`
  - `NotificationsPage`
- [ ] Record lessons and commit touched repos plus root pointers.

**Execution result:**
- Slice 6 closed at the runtime/API level with deploy run `24384039348`.
- Final public support proof:
  - `/api/regions/health/` -> `200`
  - `/api/region-analytics/health/` -> `200`
  - `/api/announcements/health/` -> `200`
  - `/api/ticket/health/` -> `200`
  - `/api/notifications/health/` -> `200`
  - `/api/regions/` -> `401` without token
  - `/api/region-analytics/daily-statistics/` -> `401` without token
  - `/api/announcements/` -> `401` without token
  - `/api/ticket/tickets/` -> `401` without token
  - `/api/notifications/general/` -> `401` without token
- The notable rollout lesson was another mixed gateway window, not a backend defect:
  - some new support routes returned `200` while others still returned `502`
  - all five support services were already `running=1`
  - the routes only settled after the late `edge-api-gateway` replacement finished
- UI smoke is still pending. This task is closed only for runtime/API proof.

### Task 9: Execute Slice 7 Terminal And Telemetry

**Files:**
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-terminal-registry/lesson.md`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-telemetry-hub/lesson.md`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-telemetry-dead-letter/lesson.md`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-telemetry-listener/lesson.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/edge-api-gateway/nginx.conf`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/lib/config.ts`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/lib/ev-dashboard-platform-stack.ts`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/lib/preflight.ts`

- [x] Add terminal and telemetry runtime slots, keeping `service-telemetry-listener` internal-only.
- [x] Split execution into:
  - `7a` terminal + telemetry hub + dead-letter
  - `7b` telemetry listener only after a real MQTT broker endpoint is confirmed
- [x] Keep `TELEMETRY_LISTENER_DESIRED_COUNT=0` until broker discovery is complete.
- [x] Preflight must reject Slice 7 when `TERMINAL_REGISTRY_BASE_URL` or `TELEMETRY_HUB_BASE_URL` still point at `https://hub.evnlogistics.com/...`.
- [x] Deploy and smoke-check:
  - `/api/terminals/health/`
  - `/api/terminals/`
  - `/api/telemetry/health/`
  - `/api/telemetry-dead-letters/health/`
  - `/api/telemetry-dead-letters/`
- [x] Validate runtime state from ECS and keep listener broker validation deferred until `7b`.
- [x] Record final telemetry-specific lessons and commit touched repos plus root pointers.

Completion evidence:

- infra workflow run `24387589004` -> `completed/success`
- `EvDashboardPlatformStack` -> `UPDATE_COMPLETE`
- external proof:
  - `/api/terminals/health/` -> `200`
  - `/api/terminals/` -> `401`
  - `/api/telemetry/health/` -> `200`
  - `/api/telemetry/terminals/00000000-0000-0000-0000-000000000001/latest-location/` -> `401`
  - `/api/telemetry-dead-letters/health/` -> `200`
  - `/api/telemetry-dead-letters/` -> `401`
- `service-telemetry-listener` service exists in ECS but remains `desired=0` until real broker discovery is complete.

### Task 10: Close The Migration Record

**Files:**
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/lesson.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/rollout/2026-04-13-ecs-cdk-oidc-actions-transition.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/mappings/current-runtime-inventory.md`

- [x] After slice 7 succeeds, update the root lesson with the final migration rules that actually held true.
- [x] Update the rollout truth to show which prefixes have fully left the EC2 path.
- [x] Update `current-runtime-inventory.md` if any gateway naming or route ownership changed.
- [ ] Verify:

```bash
git diff --check
```

- [ ] Commit:

```bash
git add lesson.md docs/rollout/2026-04-13-ecs-cdk-oidc-actions-transition.md docs/mappings/current-runtime-inventory.md
git commit -m "docs: close ev-dashboard backend ecs migration record"
```
