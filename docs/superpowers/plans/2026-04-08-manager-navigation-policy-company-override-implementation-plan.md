# Manager Navigation Policy Company Override Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 회사 전체 관리자가 자기 회사 범위에서만 관리자 유형별 사이드바 메뉴 정책을 override 하고, 로그인 사용자 메뉴 계산이 `company override -> global policy -> default fallback` 순서를 따르도록 확장한다.

**Architecture:** 기존 `ManagerNavigationPolicy` 전역 정책 모델을 `company_id nullable` 기반으로 확장해 전역 정책과 회사별 override를 같은 저장 축에 올린다. `service-account-access`는 현재 사용자 policy 계산, 회사 관리자 policy 조회/저장/reset API를 추가하고, `front-web-console`은 시스템 관리자용 전역 편집 화면과 별개로 회사 관리자용 override 화면을 제공한다.

**Tech Stack:** Django REST Framework, Django models/migrations/services/tests in `development/service-account-access`, React + TypeScript + React Router + existing API client patterns in `development/front-web-console`

---

## File Map

### Backend: `development/service-account-access/`

- Modify: `accounts/models.py`
  - `ManagerNavigationPolicy`를 `company_id nullable`, `updated_by_identity_id`, `is_override` 수준으로 확장
- Create: `accounts/migrations/0010_manager_navigation_policy_company_override.py`
  - 모델 확장 migration
- Modify: `accounts/services/navigation_policy_service.py`
  - 회사별 override 저장/조회/reset과 policy resolution order 확장
- Modify: `accounts/serializers.py`
  - 회사 관리자용 policy 조회/수정/reset serializer 추가
- Modify: `accounts/views.py`
  - company override management API 추가
- Modify: `accounts/urls.py`
  - company override route 연결
- Modify: `accounts/services/manager_account_service.py`
  - 회사 전체 관리자 권한 검사 helper 재사용 필요 시 정리
- Test: `accounts/tests/test_navigation_policy_api.py`
  - current-user policy resolution, company override 관리, reset, 권한 경계 테스트 추가

### Frontend: `development/front-web-console/`

- Modify: `src/api/navigationPolicy.ts`
  - 회사 관리자용 조회/저장/reset API 추가
- Create: `src/pages/CompanyNavigationPolicyPage.tsx`
  - 회사 관리자용 override 편집 화면
- Create: `src/pages/CompanyNavigationPolicyPage.test.tsx`
  - 회사 관리자 화면 테스트
- Modify: `src/App.tsx`
  - 회사 관리자 route 추가
- Modify: `src/navigation.ts`
  - 회사 관리자 메뉴 키 추가 여부 결정 및 반영
- Modify: `src/authScopes.ts`
  - company super admin 정책 관리 노출 fallback 보정
- Modify: `src/components/Layout.tsx`
  - current-user policy source 노출이 필요하면 최소 표시 추가
- Test: `src/components/Layout.test.tsx`
  - company override가 반영된 메뉴 노출 테스트 보강

### Docs

- Modify: `docs/superpowers/specs/2026-04-08-manager-navigation-policy-company-override-design.md`
  - 구현 후 차이가 생기면 반영
- Create: `docs/runbooks/company-navigation-policy.md`
  - 회사 관리자 override 운영 절차 기록

## Task 1: Extend policy storage for company overrides

**Files:**
- Modify: `development/service-account-access/accounts/models.py`
- Create: `development/service-account-access/accounts/migrations/0010_manager_navigation_policy_company_override.py`
- Test: `development/service-account-access/accounts/tests/test_navigation_policy_api.py`

- [ ] **Step 1: Write failing backend tests for company-scoped policy rows**

Add tests for:
- company override row can coexist with global row for the same `manager_role + nav_item_key`
- same company cannot duplicate `manager_role + nav_item_key + action`
- reset deletes only company rows and keeps global rows intact

- [ ] **Step 2: Extend `ManagerNavigationPolicy` model minimally**

```python
class ManagerNavigationPolicy(models.Model):
    company_id = models.UUIDField(null=True, blank=True)
    updated_by_identity_id = models.UUIDField(null=True, blank=True)
```

Keep one table. `company_id is null` means global policy. `company_id set` means company override.

- [ ] **Step 3: Add migration**

Create migration to:
- add nullable `company_id`
- add nullable `updated_by_identity_id`
- replace unique constraint with `(company_id, manager_role, nav_item_key, action)` semantics that allow one global row and one per-company row

- [ ] **Step 4: Commit**

```bash
git add development/service-account-access/accounts/models.py development/service-account-access/accounts/migrations/0010_manager_navigation_policy_company_override.py development/service-account-access/accounts/tests/test_navigation_policy_api.py
git commit -m "feat: support company navigation policy overrides"
```

## Task 2: Implement policy resolution order in backend service

**Files:**
- Modify: `development/service-account-access/accounts/services/navigation_policy_service.py`
- Test: `development/service-account-access/accounts/tests/test_navigation_policy_api.py`

- [ ] **Step 1: Write failing tests for resolution order**

Add tests for:
- company super admin in company A gets company override over global policy
- company super admin in company B still gets global/default when no override exists
- system admin still gets full menu set regardless of stored policy
- manager users inherit their company-specific override if their company has one

- [ ] **Step 2: Extend service methods**

Add/modify methods:

```python
def get_allowed_nav_keys_for_principal(self, principal): ...
def list_company_policy(self, principal): ...
def replace_company_policy(self, principal, role_type, nav_keys): ...
def reset_company_policy(self, principal, role_type): ...
```

Resolution order:
1. system admin full allow
2. company override
3. global policy
4. default fallback

- [ ] **Step 3: Add company-boundary enforcement**

`replace_company_policy` and `reset_company_policy` must:
- require active `company_super_admin`
- use only `principal.company_id`
- reject edits to other companies implicitly by never accepting arbitrary `company_id` input

- [ ] **Step 4: Commit**

```bash
git add development/service-account-access/accounts/services/navigation_policy_service.py development/service-account-access/accounts/tests/test_navigation_policy_api.py
git commit -m "feat: resolve company navigation policy overrides"
```

## Task 3: Expose company override APIs

**Files:**
- Modify: `development/service-account-access/accounts/serializers.py`
- Modify: `development/service-account-access/accounts/views.py`
- Modify: `development/service-account-access/accounts/urls.py`
- Test: `development/service-account-access/accounts/tests/test_navigation_policy_api.py`

- [ ] **Step 1: Add company override serializers**

Add serializers for:
- current company policy snapshot
- update payload by `role_type + allowed_nav_keys`
- reset payload or role selector

- [ ] **Step 2: Add company management endpoints**

Routes:
- `GET /api/auth/company-navigation-policy/manage/`
- `PUT /api/auth/company-navigation-policy/manage/`
- `POST /api/auth/company-navigation-policy/reset/`

Response shape should include:

```json
{
  "policies": [
    {
      "role_type": "vehicle_manager",
      "allowed_nav_keys": ["dashboard", "vehicles"],
      "source": "company_override"
    }
  ]
}
```

- [ ] **Step 3: Keep system-admin global policy APIs unchanged**

Do not mix global and company edit endpoints. Keep ownership boundaries explicit.

- [ ] **Step 4: Commit**

```bash
git add development/service-account-access/accounts/serializers.py development/service-account-access/accounts/views.py development/service-account-access/accounts/urls.py development/service-account-access/accounts/tests/test_navigation_policy_api.py
git commit -m "feat: expose company navigation policy APIs"
```

## Task 4: Add company manager policy editor in frontend

**Files:**
- Modify: `development/front-web-console/src/api/navigationPolicy.ts`
- Create: `development/front-web-console/src/pages/CompanyNavigationPolicyPage.tsx`
- Create: `development/front-web-console/src/pages/CompanyNavigationPolicyPage.test.tsx`
- Modify: `development/front-web-console/src/App.tsx`
- Modify: `development/front-web-console/src/navigation.ts`
- Modify: `development/front-web-console/src/authScopes.ts`

- [ ] **Step 1: Add failing frontend tests for company override screen**

Test scenarios:
- company super admin can load company policy
- toggling nav items updates local state
- save sends `role_type + allowed_nav_keys`
- reset reverts selected role to inherited global policy

- [ ] **Step 2: Extend API client**

Add functions:

```ts
getCompanyNavigationPolicies(client)
updateCompanyNavigationPolicies(client, payload)
resetCompanyNavigationPolicy(client, payload)
```

- [ ] **Step 3: Implement company policy page**

UI shape:
- company badge/header showing current company context
- role selector for `vehicle_manager`, `settlement_manager`, `fleet_manager`
- source label: `company override` / `global policy` / `default fallback`
- checkbox groups for nav items
- actions: `저장`, `전역 기본값으로 되돌리기`

- [ ] **Step 4: Add route and navigation entry**

Suggested route:
- `/company/navigation-policy`

Suggested nav key:
- `company_navigation_policy`

Visibility:
- company super admin only

- [ ] **Step 5: Commit**

```bash
git add development/front-web-console/src/api/navigationPolicy.ts development/front-web-console/src/pages/CompanyNavigationPolicyPage.tsx development/front-web-console/src/pages/CompanyNavigationPolicyPage.test.tsx development/front-web-console/src/App.tsx development/front-web-console/src/navigation.ts development/front-web-console/src/authScopes.ts
git commit -m "feat: add company navigation policy management screen"
```

## Task 5: Reflect company override in current-user experience

**Files:**
- Modify: `development/front-web-console/src/hooks/useNavigationPolicy.ts`
- Modify: `development/front-web-console/src/components/Layout.tsx`
- Test: `development/front-web-console/src/components/Layout.test.tsx`

- [ ] **Step 1: Add failing tests for company override behavior in layout**

Test scenarios:
- vehicle manager in company with override sees reduced menu set
- vehicle manager in company without override still sees global/default menu set
- system admin keeps full menu set

- [ ] **Step 2: Keep current-user hook contract stable**

`useNavigationPolicy` should continue reading current-user endpoint only. No frontend company inference logic.

- [ ] **Step 3: Add minimal source awareness in UI if needed**

Optional small UI note for policy editor pages only. Do not add noisy global badges to the main shell unless required.

- [ ] **Step 4: Commit**

```bash
git add development/front-web-console/src/hooks/useNavigationPolicy.ts development/front-web-console/src/components/Layout.tsx development/front-web-console/src/components/Layout.test.tsx
git commit -m "feat: apply company navigation overrides to sidebar"
```

## Task 6: Add runbook and rollout notes

**Files:**
- Create: `docs/runbooks/company-navigation-policy.md`
- Modify: `docs/superpowers/specs/2026-04-08-manager-navigation-policy-company-override-design.md`

- [ ] **Step 1: Write company override runbook**

Include:
- who can edit company policy
- how inheritance works
- how to reset to global
- what happens when no global policy exists

- [ ] **Step 2: Update design doc if implementation differs**

Only change the spec if actual shipped behavior diverges from the approved design.

- [ ] **Step 3: Commit**

```bash
git add docs/runbooks/company-navigation-policy.md docs/superpowers/specs/2026-04-08-manager-navigation-policy-company-override-design.md
git commit -m "docs: record company navigation policy override rollout"
```

## Task 7: Deploy and verify in dev

**Files:**
- Modify: `development/service-account-access/` if API fixes are needed
- Modify: `development/front-web-console/` if UI fixes are needed
- Runbook: `docs/runbooks/company-navigation-policy.md`

- [ ] **Step 1: Push backend and frontend main branches**

```bash
git -C development/service-account-access push origin main
git -C development/front-web-console push origin main
```

- [ ] **Step 2: Run central deploy for both repos**

```bash
gh workflow run "Central MSA Deploy Dispatch" \
  -R EVNSolution/clever-deploy-control \
  -f environment=dev \
  -f targets=service-account-access,front-web-console \
  -f dry_run=false
```

- [ ] **Step 3: Verify in dev**

Manual checks:
- system admin global policy screen still works
- company super admin sees company override screen
- company super admin can save override for `vehicle_manager`
- vehicle manager in same company sees override menu set
- vehicle manager in other company does not inherit that override
- reset restores global/default behavior

- [ ] **Step 4: Commit follow-up fixes if needed**

```bash
git add ...
git commit -m "fix: polish company navigation policy override rollout"
```

## Rollout Notes

- Phase 2 still forbids company-defined role creation.
- Company override is strictly narrower than global policy ownership.
- Current-user policy API remains the single source for sidebar filtering.
- After this rollout stabilizes, the next safe expansion is API authorization alignment on top of the same policy model.
