# Auth Final Cutover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the legacy `Account` runtime/auth surface and switch the platform to identity-only auth/session contracts.

**Architecture:** Update `service-account-access` first so the final token/session contract is stable, then migrate both web fronts to the identity session payload, then remove legacy `driver.account_id` references and replace them with `driver_account_link` lookups. Preserve only generic JWT claims required by downstream services; remove every dependency on the legacy `Account` model and `/auth/*` endpoints.

**Tech Stack:** Django REST Framework, React + Vite + Vitest, gateway-routed HTTP APIs, drf-spectacular OpenAPI

---

### Task 1: Lock final docs and rollout references

**Files:**
- Create: `docs/decisions/specs/2026-04-04-auth-final-cutover-design.md`
- Create: `docs/rollout/plans/2026-04-04-auth-final-cutover-implementation-plan.md`
- Modify: `docs/rollout/README.md`

- [ ] Write the final-cutover design doc and implementation plan.
- [ ] Update rollout index to point at the new active auth plan.
- [ ] Run `git diff --check`.

### Task 2: Add failing tests for identity-only auth contract

**Files:**
- Modify: `development/service-account-access/accounts/tests/test_auth_api.py`

- [ ] Add failing tests for `identity-login`, `identity-refresh`, and `identity-me` final payload shape.
- [ ] Add failing tests that legacy `/auth/*` endpoints return gone/not found after cutover.
- [ ] Add failing tests that manager/system-admin tokens include `identity_id`, `active_account_id`, `active_account_type`, `role`, `role_type`, `company_id`.
- [ ] Run the targeted failing tests and verify they fail for the missing final contract.

### Task 3: Remove legacy auth/runtime surface from service-account-access

**Files:**
- Modify: `development/service-account-access/accounts/models.py`
- Modify: `development/service-account-access/accounts/views.py`
- Modify: `development/service-account-access/accounts/serializers.py`
- Modify: `development/service-account-access/accounts/urls.py`
- Modify: `development/service-account-access/accounts/authentication.py`
- Modify: `development/service-account-access/accounts/session_principal.py`
- Modify: `development/service-account-access/accounts/services/jwt_service.py`
- Modify: `development/service-account-access/accounts/services/refresh_registry.py`
- Delete: `development/service-account-access/accounts/services/legacy_account_projection_service.py`
- Add migration(s): `development/service-account-access/accounts/migrations/*.py`

- [ ] Implement the final identity token/session payload and refresh handling.
- [ ] Remove legacy `/auth/*`, legacy `Account` CRUD, and projection sync.
- [ ] Add identity-native driver-account-link read endpoint required by driver services.
- [ ] Remove the legacy `Account` model and related code paths.
- [ ] Run targeted service-account-access tests until green.

### Task 4: Migrate front-admin-console to identity session

**Files:**
- Modify: `development/front-admin-console/src/api/auth.ts`
- Modify: `development/front-admin-console/src/api/http.ts`
- Modify: `development/front-admin-console/src/types.ts`
- Modify: `development/front-admin-console/src/sessionPersistence.ts`
- Modify: `development/front-admin-console/src/App.tsx`
- Modify: `development/front-admin-console/src/components/Layout.tsx`
- Modify: `development/front-admin-console/src/components/RequireAdmin.tsx`
- Modify: `development/front-admin-console/src/uiLabels.ts`
- Modify/Delete: `development/front-admin-console/src/pages/AccountsPage.tsx`
- Modify/Delete: `development/front-admin-console/src/pages/AccountDetailPage.tsx`
- Modify/Delete: `development/front-admin-console/src/pages/AccountFormPage.tsx`
- Add/Modify tests under `development/front-admin-console/src/**/*.test.tsx`

- [ ] Write failing tests for identity session persistence and refresh.
- [ ] Replace legacy session payload with identity session payload.
- [ ] Replace `/admin/accounts` with auth request management UI and remove legacy account CRUD routes.
- [ ] Update topbar/account display and admin gating to use `active_account`.
- [ ] Run admin front tests and build until green.

### Task 5: Migrate front-operator-console to identity session

**Files:**
- Modify: `development/front-operator-console/src/api/auth.ts`
- Modify: `development/front-operator-console/src/api/http.ts`
- Modify: `development/front-operator-console/src/types.ts`
- Modify: `development/front-operator-console/src/sessionPersistence.ts`
- Modify: `development/front-operator-console/src/App.tsx`
- Modify: `development/front-operator-console/src/components/Layout.tsx`
- Modify: `development/front-operator-console/src/uiLabels.ts`
- Modify tests under `development/front-operator-console/src/**/*.test.tsx`

- [ ] Write failing tests for identity session persistence and refresh.
- [ ] Switch operator auth calls to `identity-*`.
- [ ] Update operator account display to use `active_account`.
- [ ] Run operator front tests and build until green.

### Task 6: Remove driver legacy account references

**Files:**
- Modify: `development/service-driver-profile/drivers/models.py`
- Modify: `development/service-driver-profile/drivers/serializers.py`
- Modify: `development/service-driver-profile/drivers/tests/*.py`
- Add migration(s): `development/service-driver-profile/drivers/migrations/*.py`
- Modify: `development/service-driver-operations-view/driver360/services/source_clients.py`
- Modify: `development/service-driver-operations-view/driver360/services/driver_summary_service.py`
- Modify tests under `development/service-driver-operations-view/driver360/tests/`

- [ ] Write failing tests for driver profile without `account_id`.
- [ ] Remove `DriverProfile.account_id` and related serializer output.
- [ ] Replace driver ops legacy account lookup with driver-account-link summary lookup.
- [ ] Run driver-profile and driver-ops tests until green.

### Task 7: Refresh docs/OpenAPI and run full verification

**Files:**
- Modify any generated OpenAPI outputs touched by refresh scripts
- Move completed auth phase-1/phase-2 plan docs later if needed

- [ ] Run `python3 ./development/integration-local-stack/scripts/refresh_api_docs.py --service service-account-access`
- [ ] Run any additional OpenAPI refresh needed for touched services.
- [ ] Run full test suites for `service-account-access`, `front-admin-console`, `front-operator-console`, `service-driver-profile`, `service-driver-operations-view`.
- [ ] Run `git diff --check`.
- [ ] Commit only after all verification commands pass.
