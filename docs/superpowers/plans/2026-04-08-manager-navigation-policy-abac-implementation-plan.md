# Manager Navigation Policy (ABAC-lite) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 시스템 관리자가 관리자 유형별 사이드바 메뉴 정책을 관리하고, 로그인 사용자는 백엔드가 계산한 허용 메뉴만 보도록 전환한다.

**Architecture:** 1차 구현은 `manager_role + nav_item_key + action=view`만 다루는 ABAC-lite 정책 저장소를 `service-account-access`에 추가하고, 현재 로그인 세션 기준 허용 메뉴 조회 API를 제공한다. `front-web-console`은 기존 하드코딩 `authScopes`를 유지한 상태에서 정책 조회 결과를 우선 적용하는 호환 단계로 시작하고, 시스템 관리자 화면에서 전역 정책을 편집할 수 있게 한다.

**Tech Stack:** Django REST Framework, existing `service-account-access` domain models/services/tests, React + TypeScript + React Router in `front-web-console`

---

## File Map

### Backend: `development/service-account-access/`

- Modify: `accounts/models.py`
  - 네비게이션 정책 저장 모델 추가
- Create: `accounts/services/navigation_policy_service.py`
  - 허용 메뉴 계산, 정책 upsert, 기본 정책 계산
- Modify: `accounts/serializers.py`
  - 정책 조회/수정 serializer 추가
- Modify: `accounts/views.py`
  - 현재 사용자 허용 메뉴 조회, 시스템 관리자 정책 조회/수정 endpoint 추가
- Modify: `accounts/urls.py`
  - policy API route 연결
- Modify: `accounts/permissions.py`
  - 시스템 관리자 정책 편집 permission helper 추가 필요 시 사용
- Test: `accounts/tests/test_navigation_policy_api.py`
  - 조회/수정/권한/기본 정책 테스트
- Test: `accounts/tests/test_auth_api.py`
  - 로그인 세션 payload와 정책 조회 연계에 필요한 기존 흐름 보강

### Frontend: `development/front-web-console/`

- Modify: `src/navigation.ts`
  - `nav_item_key`를 각 항목에 명시적으로 추가
- Modify: `src/components/Layout.tsx`
  - 정책 조회 결과로 사이드바 필터링
- Modify: `src/authScopes.ts`
  - 기존 role 하드코딩은 fallback으로 축소
- Create: `src/api/navigationPolicy.ts`
  - policy 조회/저장 API 클라이언트
- Create: `src/hooks/useNavigationPolicy.ts`
  - 현재 사용자 허용 메뉴 로드/캐시
- Create: `src/pages/ManagerNavigationPolicyPage.tsx`
  - 시스템 관리자 정책 편집 화면
- Modify: `src/App.tsx`
  - 정책 관리 화면 라우트 추가
- Modify: `src/components/RequireAdmin.tsx`
  - 정책 관리 화면은 system admin만 허용
- Test: `src/components/Layout.test.tsx`
  - 정책 조회 결과 기준 노출 테스트
- Test: `src/pages/ManagerNavigationPolicyPage.test.tsx`
  - 정책 편집 화면 테스트
- Test: `src/navigation.ts` or existing UI tests
  - stable key 노출 및 fallback 동작 테스트

### Docs

- Modify: `docs/superpowers/specs/2026-04-08-manager-navigation-policy-abac-design.md`
  - 구현 후 결정사항 차이 반영 필요 시 보정
- Create: `docs/runbooks/manager-navigation-policy.md`
  - 운영자가 정책을 보고 수정하는 절차

## Task 1: Define stable navigation keys and default policy mapping

**Files:**
- Modify: `development/front-web-console/src/navigation.ts`
- Modify: `development/front-web-console/src/authScopes.ts`
- Test: `development/front-web-console/src/components/Layout.test.tsx`

- [ ] **Step 1: Add explicit `navItemKey` to every navigation item**

```ts
export type NavigationItem = {
  key: string;
  label: string;
  to: string;
  isVisible: Visibility;
  matchPrefixes?: string[];
};
```

Expected keys:
- `dashboard`
- `account`
- `accounts`
- `announcements`
- `support`
- `notifications`
- `companies`
- `regions`
- `vehicles`
- `vehicle_assignments`
- `drivers`
- `personnel_documents`
- `dispatch`
- `settlements`

- [ ] **Step 2: Add default manager-role-to-nav-key mapping helper in frontend fallback layer**

```ts
export function getDefaultAllowedNavKeys(session: SessionPayload): string[] {
  // existing role-based visibility translated into nav keys
}
```

- [ ] **Step 3: Update layout tests to assert by nav keys instead of only labels**

Add expectations for role-specific visible items and hidden items.

- [ ] **Step 4: Commit**

```bash
git add development/front-web-console/src/navigation.ts development/front-web-console/src/authScopes.ts development/front-web-console/src/components/Layout.test.tsx
git commit -m "refactor: add stable navigation item keys"
```

## Task 2: Add backend navigation policy model and service

**Files:**
- Modify: `development/service-account-access/accounts/models.py`
- Create: `development/service-account-access/accounts/services/navigation_policy_service.py`
- Test: `development/service-account-access/accounts/tests/test_navigation_policy_api.py`

- [ ] **Step 1: Add failing backend tests for policy evaluation and admin-only mutation**

Tests to add:
- system admin can set allowed nav keys for `vehicle_manager`
- non-system-admin cannot mutate global policy
- current user policy returns default keys when no override exists
- company super admin still gets fallback default policy in phase 1

- [ ] **Step 2: Add minimal storage model**

```python
class ManagerNavigationPolicy(models.Model):
    manager_role = models.CharField(max_length=32, choices=ManagerAccount.RoleType.choices)
    nav_item_key = models.CharField(max_length=64)
    action = models.CharField(max_length=32, default="view")
    effect = models.CharField(max_length=16, default="allow")

    class Meta:
        unique_together = ("manager_role", "nav_item_key", "action")
```

Keep phase-1 scope global only. Do not add `company_id` yet.

- [ ] **Step 3: Add service for default policy + stored policy merge**

```python
class NavigationPolicyService:
    def get_allowed_nav_keys_for_session(self, principal): ...
    def list_global_policy(self): ...
    def replace_global_policy(self, principal, role_type, nav_keys): ...
```

Rules:
- system admin gets all keys
- manager gets stored keys if present, else default fallback keys
- driver gets empty list for admin console nav policy

- [ ] **Step 4: Commit**

```bash
git add development/service-account-access/accounts/models.py development/service-account-access/accounts/services/navigation_policy_service.py development/service-account-access/accounts/tests/test_navigation_policy_api.py
git commit -m "feat: add manager navigation policy model"
```

## Task 3: Expose policy APIs from `service-account-access`

**Files:**
- Modify: `development/service-account-access/accounts/serializers.py`
- Modify: `development/service-account-access/accounts/views.py`
- Modify: `development/service-account-access/accounts/urls.py`
- Test: `development/service-account-access/accounts/tests/test_navigation_policy_api.py`

- [ ] **Step 1: Add serializers for policy read/write**

```python
class ManagerNavigationPolicyEntrySerializer(serializers.Serializer):
    nav_item_key = serializers.CharField()

class ManagerNavigationPolicyUpdateSerializer(serializers.Serializer):
    role_type = serializers.ChoiceField(choices=ManagerAccount.RoleType.choices)
    allowed_nav_keys = serializers.ListField(child=serializers.CharField())
```

- [ ] **Step 2: Add current-user policy endpoint**

Route example:
- `GET /api/auth/navigation-policy/`

Response example:

```json
{
  "allowed_nav_keys": ["dashboard", "vehicles", "vehicle_assignments"],
  "source": "default"
}
```

- [ ] **Step 3: Add system-admin policy management endpoints**

Routes example:
- `GET /api/auth/navigation-policy/manage/`
- `PUT /api/auth/navigation-policy/manage/`

Keep shape simple:

```json
{
  "policies": [
    {"role_type": "vehicle_manager", "allowed_nav_keys": ["dashboard", "vehicles"]}
  ]
}
```

- [ ] **Step 4: Commit**

```bash
git add development/service-account-access/accounts/serializers.py development/service-account-access/accounts/views.py development/service-account-access/accounts/urls.py development/service-account-access/accounts/tests/test_navigation_policy_api.py
git commit -m "feat: expose manager navigation policy APIs"
```

## Task 4: Wire frontend policy fetch and sidebar filtering

**Files:**
- Create: `development/front-web-console/src/api/navigationPolicy.ts`
- Create: `development/front-web-console/src/hooks/useNavigationPolicy.ts`
- Modify: `development/front-web-console/src/components/Layout.tsx`
- Modify: `development/front-web-console/src/App.tsx`
- Test: `development/front-web-console/src/components/Layout.test.tsx`

- [ ] **Step 1: Add API client for current-user policy and admin policy management**

```ts
export async function getNavigationPolicy(client: HttpClient) { ... }
export async function getManagedNavigationPolicies(client: HttpClient) { ... }
export async function updateManagedNavigationPolicies(client: HttpClient, payload: ...) { ... }
```

- [ ] **Step 2: Add hook that loads allowed nav keys and returns fallback while loading**

```ts
export function useNavigationPolicy(client: HttpClient, session: SessionPayload) {
  return { allowedNavKeys, isLoading, errorMessage, source };
}
```

Fallback rule:
- while policy API is unavailable, use existing `authScopes`-based default policy mapping

- [ ] **Step 3: Filter `navigationGroups` by `item.key` membership before render**

`Layout` should apply both:
- existing structural item visibility
- policy-based allowed-nav-key filter

- [ ] **Step 4: Commit**

```bash
git add development/front-web-console/src/api/navigationPolicy.ts development/front-web-console/src/hooks/useNavigationPolicy.ts development/front-web-console/src/components/Layout.tsx development/front-web-console/src/App.tsx development/front-web-console/src/components/Layout.test.tsx
git commit -m "feat: apply backend navigation policy to sidebar"
```

## Task 5: Add system-admin policy management screen

**Files:**
- Create: `development/front-web-console/src/pages/ManagerNavigationPolicyPage.tsx`
- Modify: `development/front-web-console/src/App.tsx`
- Modify: `development/front-web-console/src/navigation.ts`
- Test: `development/front-web-console/src/pages/ManagerNavigationPolicyPage.test.tsx`

- [ ] **Step 1: Add failing test for policy management UI**

Test scenarios:
- system admin can load role groups and toggle nav items
- non-system-admin cannot access page
- save sends `role_type + allowed_nav_keys`

- [ ] **Step 2: Add a system-admin-only route and menu item**

Suggested route:
- `/admin/menu-policy`

Suggested nav key:
- `manager_navigation_policy`

- [ ] **Step 3: Implement editor screen**

UI shape:
- role selector or stacked cards for
  - `company_super_admin`
  - `vehicle_manager`
  - `settlement_manager`
  - `fleet_manager`
- grouped checkbox list of nav items
- 저장 button

- [ ] **Step 4: Commit**

```bash
git add development/front-web-console/src/pages/ManagerNavigationPolicyPage.tsx development/front-web-console/src/App.tsx development/front-web-console/src/navigation.ts development/front-web-console/src/pages/ManagerNavigationPolicyPage.test.tsx
git commit -m "feat: add manager navigation policy admin screen"
```

## Task 6: Add compatibility, docs, and rollout guidance

**Files:**
- Modify: `docs/superpowers/specs/2026-04-08-manager-navigation-policy-abac-design.md`
- Create: `docs/runbooks/manager-navigation-policy.md`
- Modify: `development/front-web-console/src/authScopes.ts`
- Test: `development/front-web-console/src/components/Layout.test.tsx`

- [ ] **Step 1: Reduce `authScopes` to fallback/default-policy helpers**

Keep old role helpers only where needed for compatibility. Remove direct long-term sidebar ownership from them.

- [ ] **Step 2: Write runbook**

Include:
- how to view current global policy
- how system admin edits it
- fallback behavior if policy table is empty
- phase-2 note for company override

- [ ] **Step 3: Document implemented differences from the spec**

Update the spec only if the actual shipped shape differs from the original design.

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/specs/2026-04-08-manager-navigation-policy-abac-design.md docs/runbooks/manager-navigation-policy.md development/front-web-console/src/authScopes.ts development/front-web-console/src/components/Layout.test.tsx
git commit -m "docs: record manager navigation policy rollout"
```

## Task 7: Deploy and verify in dev

**Files:**
- Modify: `development/service-account-access/` if API fixes are needed
- Modify: `development/front-web-console/` if UI fixes are needed
- Runbook: `docs/runbooks/manager-navigation-policy.md`

- [ ] **Step 1: Push backend and frontend `main` branches**

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
- system admin sees `관리자 권한 정책`
- system admin can save `vehicle_manager` allowed menu set
- a vehicle manager session sees only allowed items
- a settlement manager session does not see vehicle-only items
- existing accounts still log in without nav-policy regressions

- [ ] **Step 4: Commit follow-up fixes if needed**

```bash
git add ...
git commit -m "fix: polish manager navigation policy rollout"
```

## Rollout Notes

- Phase 1 ships global policy only.
- `company_id` override is intentionally deferred.
- Do not let company managers create arbitrary new roles in this phase.
- Keep backend as source of truth; frontend fallback exists only to keep rollout safe.
- After dev rollout stabilizes, the next plan should introduce company-level override on top of the same policy model.
