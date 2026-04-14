# EV Dashboard Backend Slices Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Execute the remaining `ev-dashboard.com` backend migration as sequential ECS slices with fixed order, fixed ownership, and public smoke evidence for every slice.

**Architecture:** Keep `infra-ev-dashboard-platform` as the shared runtime owner and move remaining backend capabilities one slice at a time behind the existing `edge-api-gateway`. Each slice reuses the proven ALB/ACM/ECS entry path, preserves current gateway short names and prefixes, and closes with external smoke plus lesson updates before the next slice starts.

**Tech Stack:** AWS CDK (TypeScript), ECS/Fargate, ALB, Route53, ACM, GitHub Actions, OIDC, Nginx, Django/Gunicorn, CLEVER service repos, root rollout docs.

## Current Status

- `Task 1` is complete.
- `Task 2` is complete.
- `Task 3` runtime cutover for the organization slice is complete on production ECS.
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

- [ ] Add failing tests and runtime slots for `dispatch-registry-api`, `delivery-record-api`, and `attendance-registry-api`.
- [ ] Deploy the slice with explicit image URIs.
- [ ] Smoke-check:
  - `/api/dispatch/`
  - `/api/delivery-record/`
  - `/api/attendance/`
- [ ] Run UI smoke for:
  - `DispatchUploadsPage`
  - `DispatchPlanFormPage`
  - `DispatchBoardsPage`
- [ ] Record lessons and commit repo-local plus root changes.

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

- [ ] Add runtime slots for `dispatch-ops-api`, `driver-ops-api`, and `vehicle-ops-api`.
- [ ] Deploy and smoke-check:
  - `/api/dispatch-ops/`
  - `/api/driver-ops/`
  - `/api/vehicle-ops/`
- [ ] Run UI smoke for:
  - `DispatchBoardDetailPage`
  - `DriverDetailPage`
  - `VehicleDetailPage`
- [ ] Confirm read-model-only boundaries in docs and lessons.
- [ ] Commit each touched repo and update root pointers.

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

### Task 9: Execute Slice 7 Terminal And Telemetry

**Files:**
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-terminal-registry/README.md`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-terminal-registry/lesson.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-telemetry-hub/README.md`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-telemetry-hub/lesson.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-telemetry-dead-letter/README.md`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-telemetry-dead-letter/lesson.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-telemetry-listener/README.md`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-telemetry-listener/lesson.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/edge-api-gateway/nginx.conf`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/lib/config.ts`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/lib/ev-dashboard-platform-stack.ts`

- [ ] Add terminal and telemetry runtime slots, keeping `service-telemetry-listener` internal-only.
- [ ] Deploy and smoke-check:
  - `/api/terminals/`
  - `/api/telemetry/`
  - `/api/telemetry-dead-letters/health/`
- [ ] Validate listener/runtime health from ECS and CloudWatch, not just public HTTP.
- [ ] Record final telemetry-specific lessons and commit touched repos plus root pointers.

### Task 10: Close The Migration Record

**Files:**
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/lesson.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/rollout/2026-04-13-ecs-cdk-oidc-actions-transition.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/mappings/current-runtime-inventory.md`

- [ ] After slice 7 succeeds, update the root lesson with the final migration rules that actually held true.
- [ ] Update the rollout truth to show which prefixes have fully left the EC2 path.
- [ ] Update `current-runtime-inventory.md` if any gateway naming or route ownership changed.
- [ ] Verify:

```bash
git diff --check
```

- [ ] Commit:

```bash
git add lesson.md docs/rollout/2026-04-13-ecs-cdk-oidc-actions-transition.md docs/mappings/current-runtime-inventory.md
git commit -m "docs: close ev-dashboard backend ecs migration record"
```
