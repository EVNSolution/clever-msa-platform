# Manager Role Scope Assignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add role-level company vs fleet scope plus account-level fleet assignment so manager-role creation, manager-request approval, active manager role changes, and company/fleet context UI all use the same source of truth.

**Architecture:** Extend `service-account-access` first: add `scope_level` to `CompanyManagerRole`, add `ManagerAccountFleetAssignment`, enforce scope rules in role APIs, request approval/setup, manager role change, and session payload projection. Then update `front-web-console` to edit `scope_level`, capture fleet assignments when required, and branch downstream company/fleet context UI from backend-provided metadata instead of local heuristics.

**Tech Stack:** Django REST Framework, Django migrations, Vitest, React, TypeScript, Vite

---

## File Structure

### Backend: `development/service-account-access`

- Modify: `accounts/models.py`
  - Add `CompanyManagerRole.scope_level`
  - Add `ManagerAccountFleetAssignment`
- Create: `accounts/migrations/<next>_manager_role_scope_assignment.py`
  - Schema migration for new field/table
- Modify: `accounts/serializers.py`
  - Add `scope_level`, `fleet_ids`, and session projection fields
- Modify: `accounts/services/company_manager_role_service.py`
  - Seed default role scopes, create/update/list enforcement
- Modify: `accounts/services/signup_request_service.py`
  - Approve/setup with role-level validation and fleet assignment creation/removal
- Modify: `accounts/services/manager_account_service.py`
  - Role change with fleet assignment validation/remap
- Modify: `accounts/session_principal.py`
  - Expose scope projection helpers from active manager account
- Modify: `accounts/services/jwt_service.py`
  - Emit scope projection claims into access/refresh payload
- Modify: `accounts/views.py`
  - Pass new request fields through APIs
- Test: `accounts/tests/test_company_manager_role_api.py`
  - Role scope CRUD and validation
- Test: `accounts/tests/test_auth_api.py`
  - Request approve/setup, manager role change, me/login payload
- Test: `accounts/tests/test_identity_session_role_display_api.py`
  - Session projection payload shape

### Frontend: `development/front-web-console`

- Modify: `src/types.ts`
  - Add `scopeLevel`, `fleetIds`, `scopeUiMode`, `defaultFleetId`
- Modify: `src/api/managerRoles.ts`
  - Send/read `scope_level`
- Modify: `src/api/authRequests.ts`
  - Send optional `fleet_ids`
- Modify: `src/api/managerAccounts.ts`
  - Send optional `fleet_ids`
- Modify: `src/authScopes.ts`
  - Add helpers for scope UI mode consumers if still needed after backend projection
- Modify: `src/pages/ManagerRolesPage.tsx`
  - Add role-level selector (`회사 레벨` / `플릿 레벨`)
- Modify: `src/pages/AccountsPage.tsx`
  - Add fleet assignment UI for request approval and manager role change
- Modify: `src/components/SettlementFlowContext.tsx`
  - Use active-session scope metadata to decide company/fleet selector behavior
- Modify: `src/pages/SettlementCriteriaPage.tsx`
  - Consume new context behavior without local scope guesswork
- Test: `src/pages/ManagerRolesPage.test.tsx`
- Test: `src/pages/AccountsPage.test.tsx`
- Test: `src/pages/SettlementCriteriaPage.test.tsx`

### Docs

- Modify: `docs/contracts/15-auth-api-scenario-map.md`
  - Reflect `scope_level`, `fleet_ids`, and session projection
- Modify: `docs/runbooks/company-navigation-policy.md`
  - Add role-scope and fleet-assignment current truth if implementation completes and verification passes

## Task 1: Add Backend Scope Schema

**Files:**
- Modify: `development/service-account-access/accounts/models.py`
- Create: `development/service-account-access/accounts/migrations/<next>_manager_role_scope_assignment.py`
- Test: `development/service-account-access/accounts/tests/test_auth_domain_models.py`

- [ ] **Step 1: Write the failing model test for scope field and fleet assignment**

Add tests that assert:

```python
role = CompanyManagerRole.objects.create(
    company_id=company_id,
    code="custom_role_1",
    display_name="플릿 정산 담당",
    scope_level="fleet",
)
assert role.scope_level == "fleet"

assignment = ManagerAccountFleetAssignment.objects.create(
    manager_account=manager_account,
    company_id=manager_account.company_id,
    fleet_id=fleet_id,
)
assert assignment.fleet_id == fleet_id
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python manage.py test accounts.tests.test_auth_domain_models -v 2`
Expected: FAIL because `scope_level` field and `ManagerAccountFleetAssignment` do not exist

- [ ] **Step 3: Add the schema**

Implement:

- `CompanyManagerRole.ScopeLevel` choices with `company` and `fleet`
- `scope_level = models.CharField(max_length=16, choices=..., default="company")`
- `ManagerAccountFleetAssignment` model with unique constraint on `(manager_account, fleet_id)`
- model validation that `assignment.company_id == manager_account.company_id`

- [ ] **Step 4: Create migration**

Run: `python manage.py makemigrations accounts`
Expected: migration file adding `scope_level` and `ManagerAccountFleetAssignment`

- [ ] **Step 5: Run the model test again**

Run: `python manage.py test accounts.tests.test_auth_domain_models -v 2`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add development/service-account-access/accounts/models.py development/service-account-access/accounts/migrations development/service-account-access/accounts/tests/test_auth_domain_models.py
git commit -m "feat: add manager role scope schema"
```

## Task 2: Add Role Catalog Scope API

**Files:**
- Modify: `development/service-account-access/accounts/serializers.py`
- Modify: `development/service-account-access/accounts/services/company_manager_role_service.py`
- Modify: `development/service-account-access/accounts/views.py`
- Test: `development/service-account-access/accounts/tests/test_company_manager_role_api.py`

- [ ] **Step 1: Write failing API tests for role scope**

Add tests that assert:

```python
response = self.client.post(
    "/company-manager-roles/",
    {"company_id": str(self.company_a_id), "display_name": "플릿 정산 담당", "scope_level": "fleet"},
    format="json",
)
assert response.status_code == 201
assert response.data["scope_level"] == "fleet"
```

and:

```python
response = self.client.patch(
    f"/company-manager-roles/{role_id}/",
    {"scope_level": "company"},
    format="json",
)
assert response.status_code == 200
```

- [ ] **Step 2: Run the role API test file**

Run: `python manage.py test accounts.tests.test_company_manager_role_api -v 2`
Expected: FAIL because serializers/services do not accept `scope_level`

- [ ] **Step 3: Implement serializer and service support**

Implement:

- `CompanyManagerRoleSerializer` includes `scope_level`
- `CompanyManagerRoleCreateSerializer` requires `scope_level`
- `CompanyManagerRoleUpdateSerializer` accepts `scope_level`
- `DEFAULT_ROLE_SPECS` seeded with:
  - `company_super_admin=company`
  - `vehicle_manager=company`
  - `settlement_manager=company`
  - `fleet_manager=fleet`
- create/list/rename/policy serialization includes `scope_level`
- reject `scope_level` change for assigned roles
- reject any attempt to change `company_super_admin` away from `company`

- [ ] **Step 4: Re-run the role API test**

Run: `python manage.py test accounts.tests.test_company_manager_role_api -v 2`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add development/service-account-access/accounts/serializers.py development/service-account-access/accounts/services/company_manager_role_service.py development/service-account-access/accounts/views.py development/service-account-access/accounts/tests/test_company_manager_role_api.py
git commit -m "feat: add manager role scope catalog"
```

## Task 3: Add Request Approval and Role Change Fleet Assignment

**Files:**
- Modify: `development/service-account-access/accounts/serializers.py`
- Modify: `development/service-account-access/accounts/services/signup_request_service.py`
- Modify: `development/service-account-access/accounts/services/manager_account_service.py`
- Modify: `development/service-account-access/accounts/views.py`
- Test: `development/service-account-access/accounts/tests/test_auth_api.py`

- [ ] **Step 1: Write failing tests for manager request approval with fleet scope**

Add tests that assert:

```python
response = self.client.post(
    f"/identity-signup-requests/{request_id}/approve/",
    {"role_type": "fleet_manager", "fleet_ids": [str(self.fleet_a_id)]},
    format="json",
)
assert response.status_code == 200
```

and:

```python
response = self.client.post(
    f"/manager-accounts/{manager_account_id}/change-role/",
    {"role_type": "fleet_manager", "fleet_ids": [str(self.fleet_a_id), str(self.fleet_b_id)]},
    format="json",
)
assert response.status_code == 200
```

Also add failing validation tests:

```python
assert response.status_code == 400  # fleet role without fleet_ids
assert response.status_code == 400  # company role with fleet_ids
```

- [ ] **Step 2: Run the auth API tests**

Run: `python manage.py test accounts.tests.test_auth_api -v 2`
Expected: FAIL because payloads and assignments are not supported

- [ ] **Step 3: Implement backend assignment flow**

Implement:

- `SignupRequestApproveSerializer` and `SignupRequestSetupSerializer` accept `fleet_ids`
- `ManagerAccountRoleChangeSerializer` accepts `fleet_ids`
- shared validation helper:
  - load target role by company + `role_type`
  - if `scope_level=fleet`, require non-empty `fleet_ids`
  - if `scope_level=company`, require `fleet_ids` empty
  - verify every fleet belongs to the same company
- create/remove `ManagerAccountFleetAssignment` rows in:
  - `approve_request`
  - `complete_manager_setup`
  - `change_role`

- [ ] **Step 4: Re-run auth API tests**

Run: `python manage.py test accounts.tests.test_auth_api -v 2`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add development/service-account-access/accounts/serializers.py development/service-account-access/accounts/services/signup_request_service.py development/service-account-access/accounts/services/manager_account_service.py development/service-account-access/accounts/views.py development/service-account-access/accounts/tests/test_auth_api.py
git commit -m "feat: assign fleets to scoped manager accounts"
```

## Task 4: Add Session Projection Metadata

**Files:**
- Modify: `development/service-account-access/accounts/session_principal.py`
- Modify: `development/service-account-access/accounts/services/jwt_service.py`
- Modify: `development/service-account-access/accounts/views.py`
- Modify: `development/service-account-access/accounts/serializers.py`
- Test: `development/service-account-access/accounts/tests/test_identity_session_role_display_api.py`
- Test: `development/service-account-access/accounts/tests/test_auth_api.py`

- [ ] **Step 1: Write failing session tests**

Add tests that assert:

```python
assert response.data["active_account"]["role_scope_level"] == "fleet"
assert response.data["active_account"]["assigned_fleet_ids"] == [str(self.fleet_a_id)]
assert response.data["active_account"]["scope_ui_mode"] == "fleet_fixed_single"
assert response.data["active_account"]["default_fleet_id"] == str(self.fleet_a_id)
```

- [ ] **Step 2: Run the session-focused tests**

Run: `python manage.py test accounts.tests.test_identity_session_role_display_api accounts.tests.test_auth_api -v 2`
Expected: FAIL because payload does not include scope projection

- [ ] **Step 3: Implement projection helpers**

Implement in `IdentitySessionPrincipal`:

- helper to read active manager role record
- helper to read assigned fleet ids
- helper to derive:
  - `role_scope_level`
  - `assigned_fleet_ids`
  - `scope_ui_mode`
  - `default_fleet_id`

Wire them through:

- `_serialize_active_account()`
- `ActiveAccountSerializer`
- access token payload in `jwt_service.py`

- [ ] **Step 4: Re-run the session tests**

Run: `python manage.py test accounts.tests.test_identity_session_role_display_api accounts.tests.test_auth_api -v 2`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add development/service-account-access/accounts/session_principal.py development/service-account-access/accounts/services/jwt_service.py development/service-account-access/accounts/views.py development/service-account-access/accounts/serializers.py development/service-account-access/accounts/tests/test_identity_session_role_display_api.py development/service-account-access/accounts/tests/test_auth_api.py
git commit -m "feat: expose manager scope session metadata"
```

## Task 5: Update Manager Roles Page for Scope Level

**Files:**
- Modify: `development/front-web-console/src/types.ts`
- Modify: `development/front-web-console/src/api/managerRoles.ts`
- Modify: `development/front-web-console/src/pages/ManagerRolesPage.tsx`
- Test: `development/front-web-console/src/pages/ManagerRolesPage.test.tsx`

- [ ] **Step 1: Write failing frontend tests for scope selection**

Add tests that assert:

```tsx
expect(screen.getByLabelText('역할 범위')).toBeInTheDocument()
fireEvent.change(screen.getByLabelText('역할 범위'), { target: { value: 'fleet' } })
expect(createCompanyManagerRole).toHaveBeenCalledWith(client, {
  companyId: 'company-a',
  displayName: '새 관리자 역할 2',
  scopeLevel: 'fleet',
})
```

- [ ] **Step 2: Run the manager roles page test**

Run: `npm test -- src/pages/ManagerRolesPage.test.tsx --run`
Expected: FAIL because `scopeLevel` is not modeled or rendered

- [ ] **Step 3: Implement role-level editor**

Implement:

- `CompanyManagerRole.scopeLevel` in `types.ts`
- `createCompanyManagerRole` and `updateCompanyManagerRole` payloads carry `scope_level`
- role cards show `회사 레벨` or `플릿 레벨`
- create/update UI exposes the selector
- lock selector when server says role is assigned or system-required as needed by response constraints

- [ ] **Step 4: Re-run the page test**

Run: `npm test -- src/pages/ManagerRolesPage.test.tsx --run`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add development/front-web-console/src/types.ts development/front-web-console/src/api/managerRoles.ts development/front-web-console/src/pages/ManagerRolesPage.tsx development/front-web-console/src/pages/ManagerRolesPage.test.tsx
git commit -m "feat: edit manager role scope levels"
```

## Task 6: Update Accounts Page for Fleet Assignment

**Files:**
- Modify: `development/front-web-console/src/api/authRequests.ts`
- Modify: `development/front-web-console/src/api/managerAccounts.ts`
- Modify: `development/front-web-console/src/pages/AccountsPage.tsx`
- Test: `development/front-web-console/src/pages/AccountsPage.test.tsx`

- [ ] **Step 1: Write failing AccountsPage tests for role-scope-aware fleet assignment**

Add tests that assert:

```tsx
fireEvent.change(screen.getByDisplayValue('플릿 관리자'), { target: { value: 'fleet_manager' } })
expect(screen.getByLabelText('배정 플릿')).toBeInTheDocument()
fireEvent.click(screen.getByRole('button', { name: '승인' }))
expect(approveManagedRequest).toHaveBeenCalledWith(
  expect.anything(),
  requestId,
  'fleet_manager',
  ['fleet-a'],
)
```

and:

```tsx
fireEvent.change(screen.getByDisplayValue('회사 전체 관리자'), { target: { value: 'company_super_admin' } })
expect(screen.queryByLabelText('배정 플릿')).not.toBeInTheDocument()
```

- [ ] **Step 2: Run the AccountsPage test**

Run: `npm test -- src/pages/AccountsPage.test.tsx --run`
Expected: FAIL because APIs/UI do not handle `fleet_ids`

- [ ] **Step 3: Implement approval/change-role fleet assignment UI**

Implement:

- `approveManagedRequest(client, requestId, roleType, fleetIds?)`
- `changeManagerAccountRole(client, managerAccountId, roleType, fleetIds?)`
- load fleet list for manageable company scope
- when selected role has `scopeLevel=fleet`, show multiselect UI
- require at least one selection before submit
- hide fleet selector for company-level roles

- [ ] **Step 4: Re-run the AccountsPage test**

Run: `npm test -- src/pages/AccountsPage.test.tsx --run`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add development/front-web-console/src/api/authRequests.ts development/front-web-console/src/api/managerAccounts.ts development/front-web-console/src/pages/AccountsPage.tsx development/front-web-console/src/pages/AccountsPage.test.tsx
git commit -m "feat: assign fleets during manager account approval"
```

## Task 7: Update Downstream Company/Fleet Context Consumers

**Files:**
- Modify: `development/front-web-console/src/types.ts`
- Modify: `development/front-web-console/src/authScopes.ts`
- Modify: `development/front-web-console/src/components/SettlementFlowContext.tsx`
- Modify: `development/front-web-console/src/pages/SettlementCriteriaPage.tsx`
- Test: `development/front-web-console/src/pages/SettlementCriteriaPage.test.tsx`

- [ ] **Step 1: Write failing tests for scope-aware settlement context**

Add tests that assert:

```tsx
// company_selectable
expect(screen.getByLabelText('회사')).toBeInTheDocument()
expect(screen.getByLabelText('플릿')).toBeInTheDocument()

// fleet_fixed_single
expect(screen.queryByLabelText('회사')).not.toBeInTheDocument()
expect(screen.queryByLabelText('플릿')).not.toBeInTheDocument()

// fleet_selectable_multi
expect(screen.queryByLabelText('회사')).not.toBeInTheDocument()
expect(screen.getByLabelText('플릿')).toBeInTheDocument()
```

- [ ] **Step 2: Run the settlement criteria page test**

Run: `npm test -- src/pages/SettlementCriteriaPage.test.tsx --run`
Expected: FAIL because context still loads all companies/fleets indiscriminately

- [ ] **Step 3: Implement session-driven context branching**

Implement:

- `ActiveAccountSummary` gains `roleScopeLevel`, `assignedFleetIds`, `scopeUiMode`, `defaultFleetId`
- `SettlementFlowContext` reads `session.activeAccount`
- branch fetch/selector behavior:
  - `company_selectable`: load companies + fleets, show both
  - `fleet_fixed_single`: hide selectors, lock to `defaultFleetId`
  - `fleet_selectable_multi`: hide company selector, show fleet selector from assigned list

- [ ] **Step 4: Re-run the settlement criteria page test**

Run: `npm test -- src/pages/SettlementCriteriaPage.test.tsx --run`
Expected: PASS

- [ ] **Step 5: Run build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add development/front-web-console/src/types.ts development/front-web-console/src/authScopes.ts development/front-web-console/src/components/SettlementFlowContext.tsx development/front-web-console/src/pages/SettlementCriteriaPage.tsx development/front-web-console/src/pages/SettlementCriteriaPage.test.tsx
git commit -m "feat: drive settlement context from manager scope metadata"
```

## Task 8: Sync Docs and Run Final Verification

**Files:**
- Modify: `docs/contracts/15-auth-api-scenario-map.md`
- Modify: `docs/runbooks/company-navigation-policy.md`

- [ ] **Step 1: Update current-truth docs**

Document:

- role scope create/update APIs
- request approval and role change `fleet_ids`
- active session projection fields
- company vs fleet scope rules

- [ ] **Step 2: Run backend verification**

Run:

```bash
cd development/service-account-access
python manage.py test accounts.tests.test_company_manager_role_api accounts.tests.test_identity_session_role_display_api accounts.tests.test_auth_api -v 2
```

Expected: PASS

- [ ] **Step 3: Run frontend verification**

Run:

```bash
cd development/front-web-console
npm test -- src/pages/ManagerRolesPage.test.tsx src/pages/AccountsPage.test.tsx src/pages/SettlementCriteriaPage.test.tsx --run
npm run build
```

Expected: PASS

- [ ] **Step 4: Commit docs**

```bash
git add docs/contracts/15-auth-api-scenario-map.md docs/runbooks/company-navigation-policy.md
git commit -m "docs: record manager role scope assignment current truth"
```

## Notes for Implementers

- Do not mix this work with the current dirty `development/front-web-console` settlement UI changes unless the user explicitly asks for bundling.
- Keep `service-account-access` as the single source of truth for scope rules. Do not re-encode scope logic in read services.
- Keep the API contract backward-compatible only where the current UI still depends on it. New fields can be additive, but validation for `fleet_ids` must be strict.
