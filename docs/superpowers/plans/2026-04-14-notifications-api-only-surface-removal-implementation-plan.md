# Notifications API-Only Surface Removal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove `/notifications` from `front-web-console` while keeping `service-notification-hub` and `/api/notifications/*` as backend-only capability.

**Architecture:** Update current-truth docs in the platform root repo first, then remove the notification route, page, nav key, and policy key from the `front-web-console` child repo. Keep `support`, `announcements`, and `TopNotificationBar` working, but stop describing or rendering a standalone web inbox/send/log surface.

**Tech Stack:** Markdown, React, TypeScript, React Router, Vitest, Vite, Git child repos/worktrees

---

## Working Repos

- Platform docs repo: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform`
- Frontend repo: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console`
- If a dedicated `front-web-console` worktree already exists, use that checkout for code tasks instead of the child repo path, but keep the same file list and commands.

## Execution Guardrails

- Do not touch image builds, ECS/CDK, gateway deploy config, or central deploy repos.
- Do not remove `service-notification-hub` runtime or `/api/notifications/*`.
- Do not change driver app notification scope in this plan.
- Keep docs commits in the platform root repo and code commits in the `front-web-console` repo.

### Task 1: Remove The Notification Surface From Current-Truth Docs

**Files:**
- Modify: `docs/contracts/17-admin-communication-pages.md`
- Modify: `docs/contracts/18-single-web-console-screen-map.md`
- Modify: `docs/runbooks/manager-navigation-policy.md`
- Modify: `docs/superpowers/specs/2026-04-08-manager-navigation-policy-abac-design.md`
- Modify: `docs/superpowers/specs/2026-04-08-manager-navigation-policy-api-authorization-design.md`
- Reference: `docs/superpowers/specs/2026-04-14-notifications-api-only-surface-removal-design.md`

- [ ] **Step 1: Rewrite the current-truth docs to describe notifications as backend capability, not a web page**

Apply these edits:

- In `17-admin-communication-pages.md`:
  - change the page scope from `공지 / 지원 / 알림` to `공지 / 지원`
  - remove the standalone `/notifications` route section
  - keep the support-reply -> notification-hub handoff explanation, but describe it as backend-generated notification delivery, not a user-facing inbox page
  - remove lower-manager “알림함” UI language
- In `18-single-web-console-screen-map.md`:
  - delete the `/notifications` row from the route map table
  - remove `NotificationsPage` from the operator/shared-route discussion
  - record that the surface is obsolete and removed from the web console
- In `manager-navigation-policy.md` and the two `2026-04-08-*` policy specs:
  - remove `notifications` from the available navigation key lists
  - remove any route/policy examples that still treat `notifications` as a live web tab
  - keep `/api/notifications/*` only where the text is explicitly about backend/API authorization

- [ ] **Step 2: Verify that current-truth docs no longer advertise `/notifications` as a live browser route**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform
rg -n "/notifications|notifications|알림함" \
  docs/contracts/17-admin-communication-pages.md \
  docs/contracts/18-single-web-console-screen-map.md \
  docs/runbooks/manager-navigation-policy.md \
  docs/superpowers/specs/2026-04-08-manager-navigation-policy-abac-design.md \
  docs/superpowers/specs/2026-04-08-manager-navigation-policy-api-authorization-design.md
```

Expected:

- no `/notifications` browser-route contract remains
- no “알림함” self-service web wording remains
- `/api/notifications/*` may remain only in backend/runtime authorization context

- [ ] **Step 3: Commit the doc contract changes in the platform repo**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform
git add \
  docs/contracts/17-admin-communication-pages.md \
  docs/contracts/18-single-web-console-screen-map.md \
  docs/runbooks/manager-navigation-policy.md \
  docs/superpowers/specs/2026-04-08-manager-navigation-policy-abac-design.md \
  docs/superpowers/specs/2026-04-08-manager-navigation-policy-api-authorization-design.md
git commit -m "docs: remove notifications web surface contract"
```

### Task 2: Remove The Route, Page, And Web-Only Notification Client

**Files:**
- Modify: `development/front-web-console/src/App.tsx`
- Modify: `development/front-web-console/src/App.test.tsx`
- Modify: `development/front-web-console/src/pages/SupportPage.tsx`
- Modify: `development/front-web-console/src/pages/SupportPage.test.tsx`
- Modify: `development/front-web-console/src/types.ts`
- Delete: `development/front-web-console/src/pages/NotificationsPage.tsx`
- Delete: `development/front-web-console/src/pages/NotificationsPage.test.tsx`
- Delete: `development/front-web-console/src/api/notifications.ts`

- [ ] **Step 1: Write the failing route and support-copy expectations**

Edit `src/App.test.tsx` to add a direct-entry regression test like this:

```tsx
it('redirects removed /notifications to the dashboard root', async () => {
  window.history.replaceState({}, '', '/notifications');

  render(<App />);

  await waitFor(() => expect(window.location.pathname).toBe('/'));
  expect(await screen.findByText('운영 요약')).toBeInTheDocument();
});
```

Edit `src/pages/SupportPage.test.tsx` to replace the old inbox copy assertion with:

```tsx
expect(screen.getByText('관리자 답변은 이 화면에서 확인합니다.')).toBeInTheDocument();
```

Also update the admin-side expectation to:

```tsx
expect(
  screen.getByText('답변을 등록하면 요청자에게 일반 알림이 자동 생성됩니다. Push는 자동 발송되지 않습니다.'),
).toBeInTheDocument();
```

- [ ] **Step 2: Run the targeted tests and confirm they fail before implementation**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console
npm run test -- src/App.test.tsx src/pages/SupportPage.test.tsx
```

Expected:

- `App.test.tsx` fails because `/notifications` still renders a live route
- `SupportPage.test.tsx` fails because the page still says “알림함”

- [ ] **Step 3: Remove the route/page/client and adjust support copy**

Apply these code changes:

- In `src/App.tsx`:
  - remove the `NotificationsPage` import
  - delete the `/notifications` route entry
  - let the existing wildcard redirect handle direct `/notifications` access
- Delete `src/pages/NotificationsPage.tsx`
- Delete `src/pages/NotificationsPage.test.tsx`
- Delete `src/api/notifications.ts`
- In `src/types.ts`:
  - delete `GeneralNotification`
  - delete `PushDeliveryLog`
- In `src/pages/SupportPage.tsx`:
  - replace `관리자 답변은 이 화면과 알림함에서 함께 확인할 수 있습니다.` with `관리자 답변은 이 화면에서 확인합니다.`
  - replace `답변을 등록하면 요청자 알림함에 일반 알림이 자동 생성됩니다. Push는 자동 발송되지 않습니다.` with `답변을 등록하면 요청자에게 일반 알림이 자동 생성됩니다. Push는 자동 발송되지 않습니다.`

- [ ] **Step 4: Re-run the targeted tests and confirm they pass**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console
npm run test -- src/App.test.tsx src/pages/SupportPage.test.tsx
```

Expected:

- both files pass
- no import errors remain from deleted notification files

- [ ] **Step 5: Commit the route/page removal in the frontend repo**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console
git add src/App.tsx src/App.test.tsx src/pages/SupportPage.tsx src/pages/SupportPage.test.tsx src/types.ts
git rm src/pages/NotificationsPage.tsx src/pages/NotificationsPage.test.tsx src/api/notifications.ts
git commit -m "refactor: remove notifications console surface"
```

### Task 3: Remove Notification Navigation And Policy Keys

**Files:**
- Modify: `development/front-web-console/src/authScopes.ts`
- Modify: `development/front-web-console/src/navigation.ts`
- Modify: `development/front-web-console/src/pages/ManagerNavigationPolicyPage.tsx`
- Modify: `development/front-web-console/src/pages/ManagerNavigationPolicyPage.test.tsx`
- Modify: `development/front-web-console/src/pages/CompanyNavigationPolicyPage.tsx`
- Modify: `development/front-web-console/src/pages/CompanyNavigationPolicyPage.test.tsx`
- Modify: `development/front-web-console/src/components/Layout.test.tsx`

- [ ] **Step 1: Update the policy and layout tests to remove `notifications` from the expected model**

Make these test-first edits:

- In `src/pages/ManagerNavigationPolicyPage.test.tsx`:
  - remove `'notifications'` from all `allowed_nav_keys` fixtures
  - remove `'notifications'` from the expected `allowedNavKeys` payload in the save assertion
- In `src/pages/CompanyNavigationPolicyPage.test.tsx`:
  - add `expect(screen.queryByLabelText('알림')).not.toBeInTheDocument();`
- In `src/components/Layout.test.tsx`:
  - remove `'notifications'` from the `getDefaultAllowedNavKeys` expected arrays for vehicle/settlement managers
  - keep the existing “알림 link should not be visible” assertions

- [ ] **Step 2: Run the navigation/policy tests and confirm they fail before implementation**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console
npm run test -- src/components/Layout.test.tsx src/pages/ManagerNavigationPolicyPage.test.tsx src/pages/CompanyNavigationPolicyPage.test.tsx
```

Expected:

- tests fail because `authScopes.ts`, `navigation.ts`, and the policy editors still expose `notifications`

- [ ] **Step 3: Remove the nav key and editor wiring**

Apply these code changes:

- In `src/authScopes.ts`:
  - remove `'notifications'` from `NavItemKey`
  - remove `'notifications'` from `allNavItemKeys`
  - delete `canManageNotificationScope`
  - stop adding `notifications` inside `getDefaultAllowedNavKeys`
- In `src/navigation.ts`:
  - delete the `알림` item from `operationsItems`
- In `src/pages/ManagerNavigationPolicyPage.tsx`:
  - remove `'notifications'` from `POLICY_NAV_KEY_ORDER`
- In `src/pages/CompanyNavigationPolicyPage.tsx`:
  - remove `{ key: 'notifications', label: '알림' }` from the `운영` group

- [ ] **Step 4: Re-run the navigation/policy tests and confirm they pass**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console
npm run test -- src/components/Layout.test.tsx src/pages/ManagerNavigationPolicyPage.test.tsx src/pages/CompanyNavigationPolicyPage.test.tsx
```

Expected:

- the policy editors no longer render `알림`
- the default allowed-nav arrays match the new key set
- layout tests pass without a `notifications` key

- [ ] **Step 5: Commit the nav/policy cleanup in the frontend repo**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console
git add \
  src/authScopes.ts \
  src/navigation.ts \
  src/pages/ManagerNavigationPolicyPage.tsx \
  src/pages/ManagerNavigationPolicyPage.test.tsx \
  src/pages/CompanyNavigationPolicyPage.tsx \
  src/pages/CompanyNavigationPolicyPage.test.tsx \
  src/components/Layout.test.tsx
git commit -m "refactor: remove notifications nav policy key"
```

### Task 4: Final Verification And Dead-Reference Sweep

**Files:**
- Verify only: `development/front-web-console/src/**`
- Verify only: `docs/contracts/17-admin-communication-pages.md`
- Verify only: `docs/contracts/18-single-web-console-screen-map.md`
- Verify only: `docs/runbooks/manager-navigation-policy.md`
- Verify only: `docs/superpowers/specs/2026-04-08-manager-navigation-policy-abac-design.md`
- Verify only: `docs/superpowers/specs/2026-04-08-manager-navigation-policy-api-authorization-design.md`

- [ ] **Step 1: Run a focused dead-reference sweep**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform
rg -n "/notifications|notifications|알림함" \
  development/front-web-console/src \
  docs/contracts/17-admin-communication-pages.md \
  docs/contracts/18-single-web-console-screen-map.md \
  docs/runbooks/manager-navigation-policy.md \
  docs/superpowers/specs/2026-04-08-manager-navigation-policy-abac-design.md \
  docs/superpowers/specs/2026-04-08-manager-navigation-policy-api-authorization-design.md
```

Expected:

- no live `front-web-console` route, page, nav, or policy references remain
- only backend/API wording around `/api/notifications/*` remains in the two policy specs if still needed

- [ ] **Step 2: Run the full targeted regression suite**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console
npm run test -- \
  src/App.test.tsx \
  src/components/Layout.test.tsx \
  src/pages/ManagerNavigationPolicyPage.test.tsx \
  src/pages/CompanyNavigationPolicyPage.test.tsx \
  src/pages/SupportPage.test.tsx \
  src/components/TopNotificationBar.test.tsx
npm run build
```

Expected:

- all listed tests pass
- `vite build` succeeds
- `TopNotificationBar` still works because it is local UI feedback, not the removed inbox surface

- [ ] **Step 3: Run patch sanity checks in both repos**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform
git diff --check

cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console
git diff --check
```

Expected:

- no whitespace or patch-format issues in either repo

- [ ] **Step 4: Only if verification required extra fixes, commit them deliberately**

Run only when Step 2 or Step 3 required follow-up edits:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console
git add -A
git commit -m "test: finish notifications surface removal verification"
```

If no follow-up edits were needed, do not create a no-op commit.
