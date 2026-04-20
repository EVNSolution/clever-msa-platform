# Company Path Web Definition Implementation Plan

현재 canonical route contract는 `ev-dashboard.com/{tenant}`다. 이 plan 본문에 남아 있는 `subdomain` 표현은 historical component/file naming이나 compatibility host fallback을 가리키지 않는 한, 현재 구현 기준의 company path shell로 읽는다.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework `front-web-console` so the subdomain experience becomes the canonical company product surface with an accordion shell, dashboard-first entry, and `cheonha`-style settlement workspace while keeping the codebase and deployed app single.

**Architecture:** Keep this phase inside `development/front-web-console` only. Reuse the existing tenant host/bootstrap flow, but tighten it around a single canonical subdomain shell: dashboard entry at `/`, settlement workspace under `/settlement/*`, and no top-level dispatch route. Treat settlement as a real workspace with disabled rule-shell inputs and active read/snapshot surfaces, and avoid gateway/backend contract changes unless existing frontend assumptions prove false during implementation.

**Tech Stack:** React 18, TypeScript, React Router, Vitest, existing `front-web-console` CSS/layout system, existing tenant/bootstrap APIs.

---

## Mandatory Scope Lock

This plan covers only:

1. subdomain host interpretation and shell routing in `front-web-console`
2. subdomain accordion navigation and dashboard-first entry
3. `cheonha`-style settlement workspace routing and menu hierarchy
4. subdomain bootstrap-stage tenant existence checks and fail-closed behavior
5. wrong-domain/session rejection for main-domain vs company-domain accounts
6. subdomain login/header treatment
7. frontend test coverage for the new IA contract

This plan does **not** include:

1. backend or gateway API contract redesign
2. new MSA services or route prefixes
3. real settlement rule persistence
4. main-domain IA redesign beyond keeping current system-admin surface intact

## Canonical Runtime Contract To Preserve

### Host Resolution

- `ev-dashboard.com`
  - main-domain system-admin surface
- `cheonha.ev-dashboard.com`
  - valid company subdomain
- unknown `*.ev-dashboard.com`
  - host parser may still classify as company-shaped
  - actual tenant existence must fail closed during public tenant resolve / workspace bootstrap before cockpit render

### Domain and Session Boundary

- system-admin session on `ev-dashboard.com`
  - allowed
- company manager session on `ev-dashboard.com`
  - rejected from the main-domain shell
- system-admin session on `<tenant-slug>.ev-dashboard.com`
  - rejected from the subdomain shell
- company manager session on the wrong company subdomain
  - rejected before cockpit render

### Main-Domain IA

- main domain top-level IA must stay:
  - `대시보드`
  - `회사`
  - `정산`
- this phase may preserve the current main-domain implementation, but tests must explicitly verify those anchors remain intact

### Subdomain Routes

| Surface | Route | Required behavior |
| --- | --- | --- |
| Dashboard | `/` | canonical subdomain entry |
| Settlement root | `/settlement` | redirect to `/settlement/home` |
| Settlement home | `/settlement/home` | real settlement workspace home |
| Dispatch data | `/settlement/dispatch` | real dispatch-upload workflow surface |
| Crew | `/settlement/crew` | real crew management surface |
| Operations | `/settlement/operations` | real operations status surface |
| Process | `/settlement/process` | real auto-calculation/snapshot surface |
| Team | `/settlement/team` | team management surface, may start minimal |

### Workflow Mapping

- `배차 데이터`
  - must expose the real dispatch-upload workflow
- `정산 처리`
  - must expose the real read/snapshot workflow
- `근태`
  - remains embedded inside dashboard/settlement data context, not a separate route

## File Structure

The implementation should use the following file responsibilities.

- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/App.tsx`
  - canonical route composition for main domain vs subdomain
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/App.cockpit.test.tsx`
  - end-to-end shell routing contract tests for subdomain behavior
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/App.test.tsx`
  - main-domain IA and domain/session rejection coverage
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/tenant/resolveTenantEntry.ts`
  - tenant slug/host parsing rules
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/tenant/resolveTenantEntry.test.ts`
  - host parsing edge cases
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/api/companyTenant.ts`
  - public tenant resolve helpers only if explicit tenant-not-found mapping is needed
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/api/workspaceBootstrap.ts`
  - bootstrap typing only if shell gating needs explicit tenant/domain mismatch state
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/navigation.ts`
  - explicit verification target for main-domain `대시보드 / 회사 / 정산`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/types.ts`
  - workspace/bootstrap typing only if new explicit shell/menu presets are needed
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/cockpit/SubdomainAccordionNav.tsx`
  - focused accordion navigation component for subdomain shell
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/cockpit/SubdomainAccordionNav.test.tsx`
  - accordion expand/collapse/current-item tests
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/cockpit/CockpitShell.tsx`
  - convert shell to left-brand accordion navigation container
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/cockpit/cheonha/CheonhaDashboardPage.tsx`
  - dashboard-first subdomain landing page
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/cockpit/cheonha/CheonhaSettlementWorkspace.tsx`
  - settlement route/deep-link hierarchy
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/cockpit/cheonha/CheonhaSettlementWorkspace.test.tsx`
  - settlement menu and default route behavior
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/cockpit/cheonha/CheonhaSettlementHomePage.tsx`
  - settlement home content scaffold
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/cockpit/cheonha/CheonhaSettlementHomePage.test.tsx`
  - settlement home expectations
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/cockpit/cheonha/CheonhaDispatchDataPage.tsx`
  - adapter surface for existing dispatch-upload workflow
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/cockpit/cheonha/CheonhaDispatchDataPage.test.tsx`
  - dispatch data route expectations
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/cockpit/cheonha/CheonhaSettlementProcessPage.tsx`
  - adapter surface for existing settlement read/snapshot workflow
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/cockpit/cheonha/CheonhaSettlementProcessPage.test.tsx`
  - settlement process route expectations
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/cockpit/cheonha/CheonhaRuleShellPanel.tsx`
  - disabled rule-shell UI for company/fleet/driver scopes
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/cockpit/cheonha/CheonhaRuleShellPanel.test.tsx`
  - explicit “disabled/no save” rule-shell tests
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/pages/LoginPage.tsx`
  - subdomain company header treatment
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/pages/LoginPage.test.tsx`
  - login card header behavior
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/styles.css`
  - accordion shell, left rail, and subdomain workspace styling

## Task 1: Lock Tenant Host Parsing and Bootstrap Gate

**Files:**
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/tenant/resolveTenantEntry.ts`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/tenant/resolveTenantEntry.test.ts`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/App.cockpit.test.tsx`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/App.tsx`
- Optional Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/api/companyTenant.ts`
- Optional Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/api/workspaceBootstrap.ts`

- [ ] **Step 1: Write the failing host-resolution tests**

Add failing tests in `resolveTenantEntry.test.ts` covering:
- `cheonha.ev-dashboard.com` resolves as company tenant `cheonha`
- `ev-dashboard.com` resolves as non-tenant
- reserved subdomains like `api.ev-dashboard.com` are rejected
- unknown foreign apex domains are rejected

Expected: current tests either do not cover all cases or fail on the tightened contract.

- [ ] **Step 2: Write the failing bootstrap-gate and shell-routing test**

Add a failing assertion in `App.cockpit.test.tsx` covering:
- subdomain root `/` lands on subdomain dashboard
- top-level settlement route remains `/settlement`
- no top-level `/dispatch` route exists for the subdomain shell
- unknown company subdomain reaches tenant-not-found behavior after public tenant resolve/bootstrap, not pure host parsing

Expected: fail because current cockpit assumptions still reflect older structure.

- [ ] **Step 3: Implement the minimal parsing and bootstrap gate**

Modify:
- `resolveTenantEntry.ts`
- `App.tsx`

Implementation rules:
- keep host parsing explicit and small
- use existing public tenant resolve/bootstrap path for tenant-not-found gating
- do not add new backend APIs
- route the subdomain shell to `/` and `/settlement/*` only

- [ ] **Step 4: Run focused shell tests**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console
npm run test -- src/tenant/resolveTenantEntry.test.ts src/App.cockpit.test.tsx
```

Expected:
- both files pass

- [ ] **Step 5: Commit**

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console
git add src/tenant/resolveTenantEntry.ts src/tenant/resolveTenantEntry.test.ts src/App.tsx src/App.cockpit.test.tsx
git commit -m "feat: lock subdomain shell routing contract"
```

## Task 2: Build the Accordion-Based Subdomain Shell

**Files:**
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/cockpit/SubdomainAccordionNav.tsx`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/cockpit/SubdomainAccordionNav.test.tsx`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/cockpit/CockpitShell.tsx`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/styles.css`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/App.cockpit.test.tsx`

- [ ] **Step 1: Write the failing accordion navigation tests**

Create `SubdomainAccordionNav.test.tsx` to cover:
- brand block renders company name
- only `대시보드` and `정산` show as top-level items
- expanding `정산` reveals internal items
- current route marks the active child item

Expected: fail because the component does not exist yet.

- [ ] **Step 2: Add a failing shell integration assertion**

Extend `App.cockpit.test.tsx` to require:
- subdomain shell uses left-side accordion navigation
- old always-visible top bar assumptions are gone

Expected: fail against current shell.

- [ ] **Step 3: Implement the minimal accordion shell**

Implement `SubdomainAccordionNav.tsx` and update `CockpitShell.tsx` so that:
- company brand lives at top left
- accordion menu owns `대시보드` and `정산`
- `정산` can reveal internal menu items
- logout stays in the shell but not in a legacy top bar

- [ ] **Step 4: Add shell styles**

Modify `styles.css` with only the styles required for:
- left rail container
- accordion states
- active menu item state
- company brand block

- [ ] **Step 5: Run focused shell tests**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console
npm run test -- src/cockpit/SubdomainAccordionNav.test.tsx src/App.cockpit.test.tsx
```

Expected:
- both files pass

- [ ] **Step 6: Commit**

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console
git add src/cockpit/SubdomainAccordionNav.tsx src/cockpit/SubdomainAccordionNav.test.tsx src/cockpit/CockpitShell.tsx src/styles.css src/App.cockpit.test.tsx
git commit -m "feat: add accordion subdomain shell"
```

## Task 3: Make Dashboard the Canonical Subdomain Entry

**Files:**
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/cockpit/cheonha/CheonhaDashboardPage.tsx`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/App.cockpit.test.tsx`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/styles.css`

- [ ] **Step 1: Write the failing dashboard-entry test**

Add failing assertions in `App.cockpit.test.tsx` covering:
- subdomain `/` renders dashboard content, not legacy cockpit cards
- dashboard shows the three required sections:
  - 최근 6개월 수입/지출
  - 금월 배차표 기반 근태
  - 금일 배차
- dashboard exposes a today-first frame with a visible month-switch control

Expected: fail because current dashboard content does not match spec.

- [ ] **Step 2: Implement the minimal dashboard page**

Modify `CheonhaDashboardPage.tsx` so it becomes the canonical subdomain landing page with:
- dashboard intro/header
- confirmed-results 6 month finance summary placeholder surface
- monthly attendance summary surface
- daily dispatch summary surface

Do not add new API calls in this step. Use the minimum safe placeholder/read composition already available.

- [ ] **Step 3: Add only dashboard-specific styles**

Extend `styles.css` only for:
- dashboard grid/section layout
- summary cards
- attendance/dispatch summary blocks

- [ ] **Step 4: Run focused dashboard tests**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console
npm run test -- src/App.cockpit.test.tsx
```

Expected:
- cockpit routing/dashboard assertions pass

- [ ] **Step 5: Commit**

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console
git add src/cockpit/cheonha/CheonhaDashboardPage.tsx src/App.cockpit.test.tsx src/styles.css
git commit -m "feat: make subdomain dashboard the default entry"
```

## Task 4: Rebuild Settlement as the Real Workspace

**Files:**
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/cockpit/cheonha/CheonhaSettlementWorkspace.tsx`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/cockpit/cheonha/CheonhaSettlementWorkspace.test.tsx`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/cockpit/cheonha/CheonhaSettlementHomePage.tsx`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/cockpit/cheonha/CheonhaSettlementHomePage.test.tsx`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/cockpit/cheonha/CheonhaDispatchDataPage.tsx`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/cockpit/cheonha/CheonhaDispatchDataPage.test.tsx`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/cockpit/cheonha/CheonhaSettlementProcessPage.tsx`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/cockpit/cheonha/CheonhaSettlementProcessPage.test.tsx`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/cockpit/cheonha/CheonhaRuleShellPanel.tsx`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/cockpit/cheonha/CheonhaRuleShellPanel.test.tsx`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/styles.css`

- [ ] **Step 1: Write the failing settlement route tests**

Extend `CheonhaSettlementWorkspace.test.tsx` to cover:
- `/settlement` redirects to `/settlement/home`
- the internal menu order is:
  - 홈
  - 배차 데이터
  - 배송원 관리
  - 운영 현황
  - 정산 처리
  - 팀 관리
- there is no top-level dispatch tab in the shell
- exact route slugs are:
  - `/settlement/home`
  - `/settlement/dispatch`
  - `/settlement/crew`
  - `/settlement/operations`
  - `/settlement/process`
  - `/settlement/team`

Expected: fail against the current `dispatch-data`-first workspace.

- [ ] **Step 2: Write the failing rule-shell tests**

Create `CheonhaRuleShellPanel.test.tsx` covering:
- company/fleet/driver sections render
- all inputs are visibly disabled
- no save/submit action is rendered

Expected: fail because the component does not exist yet.

- [ ] **Step 3: Implement the minimal settlement layout**

Implement:
- `CheonhaSettlementHomePage.tsx`
- `CheonhaDispatchDataPage.tsx`
- `CheonhaSettlementProcessPage.tsx`
- `CheonhaRuleShellPanel.tsx`
- updated `CheonhaSettlementWorkspace.tsx`

Rules:
- settlement is a real routeable workspace
- rules are disabled shell only
- `배차 데이터` must render the existing dispatch-upload workflow surface instead of a placeholder-only panel
- `정산 처리` must render the existing read/snapshot workflow surface instead of a placeholder-only panel
- `근태` remains embedded inside dashboard/settlement data context, not a separate route

- [ ] **Step 4: Run focused settlement tests**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console
npm run test -- src/cockpit/cheonha/CheonhaSettlementWorkspace.test.tsx src/cockpit/cheonha/CheonhaSettlementHomePage.test.tsx src/cockpit/cheonha/CheonhaDispatchDataPage.test.tsx src/cockpit/cheonha/CheonhaSettlementProcessPage.test.tsx src/cockpit/cheonha/CheonhaRuleShellPanel.test.tsx
```

Expected:
- all three files pass

- [ ] **Step 5: Commit**

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console
git add src/cockpit/cheonha/CheonhaSettlementWorkspace.tsx src/cockpit/cheonha/CheonhaSettlementWorkspace.test.tsx src/cockpit/cheonha/CheonhaSettlementHomePage.tsx src/cockpit/cheonha/CheonhaSettlementHomePage.test.tsx src/cockpit/cheonha/CheonhaDispatchDataPage.tsx src/cockpit/cheonha/CheonhaDispatchDataPage.test.tsx src/cockpit/cheonha/CheonhaSettlementProcessPage.tsx src/cockpit/cheonha/CheonhaSettlementProcessPage.test.tsx src/cockpit/cheonha/CheonhaRuleShellPanel.tsx src/cockpit/cheonha/CheonhaRuleShellPanel.test.tsx src/styles.css
git commit -m "feat: rebuild cheonha settlement workspace"
```

## Task 5: Add Subdomain Login Identity Treatment

**Files:**
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/pages/LoginPage.tsx`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/pages/LoginPage.test.tsx`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/App.tsx`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/styles.css`

- [ ] **Step 1: Write the failing login-header test**

Add failing assertions in `LoginPage.test.tsx` covering:
- subdomain login renders centered company header
- main-domain login does not render a misleading company header

Expected: fail against current generic login card.

- [ ] **Step 2: Thread tenant company context into the login page**

Modify `App.tsx` and `LoginPage.tsx` so that:
- subdomain login receives resolved company context
- login card renders company name prominently
- no new API surface is introduced beyond current tenant resolution/bootstrap

- [ ] **Step 3: Add only the minimal login styles**

Modify `styles.css` to support:
- centered company identity block
- clear distinction between subdomain login and generic login

- [ ] **Step 4: Run focused login tests**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console
npm run test -- src/pages/LoginPage.test.tsx src/App.cockpit.test.tsx
```

Expected:
- both files pass

- [ ] **Step 5: Commit**

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console
git add src/pages/LoginPage.tsx src/pages/LoginPage.test.tsx src/App.tsx src/styles.css src/App.cockpit.test.tsx
git commit -m "feat: add company-specific subdomain login shell"
```

## Task 6: Enforce Domain/Session Boundaries and Main-Domain IA

**Files:**
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/App.tsx`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/App.cockpit.test.tsx`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/App.test.tsx`
- Verify or Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/navigation.ts`

- [ ] **Step 1: Write the failing domain/session rejection tests**

Add failing assertions covering:
- company manager session on `ev-dashboard.com` cannot enter the main-domain shell
- system-admin session on `<tenant-slug>.ev-dashboard.com` cannot enter the subdomain shell
- company manager session on the wrong company subdomain cannot enter the cockpit

Expected: fail because current session gating is not yet pinned to the approved domain boundaries.

- [ ] **Step 2: Write the failing main-domain IA verification**

Add assertions in `App.test.tsx` covering:
- main-domain navigation still exposes `대시보드 / 회사 / 정산`
- this phase does not accidentally collapse or rename those anchors while implementing the subdomain-first shell

Expected: fail if the test does not exist or the current main-domain anchors drift.

- [ ] **Step 3: Implement the minimal domain/session boundary logic**

Modify `App.tsx` and only touch `navigation.ts` if needed so that:
- main-domain and subdomain sessions are explicitly separated
- wrong-domain access fails closed before rendering the wrong shell
- main-domain IA stays intact

- [ ] **Step 4: Run focused shell and main-domain tests**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console
npm run test -- src/App.cockpit.test.tsx src/App.test.tsx
```

Expected:
- both files pass

- [ ] **Step 5: Commit**

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console
git add src/App.tsx src/App.cockpit.test.tsx src/App.test.tsx src/navigation.ts
git commit -m "feat: enforce domain-aware web shell boundaries"
```

## Task 7: Full Frontend Regression and Docs Sync

**Files:**
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/README.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/lesson.md`
- Optional Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/superpowers/specs/2026-04-17-subdomain-web-definition-design.md`

- [ ] **Step 1: Write down the current manual verification matrix before touching docs**

Record the expected manual checks:
- main domain still shows system-admin surface
- company manager session is rejected from main-domain shell
- system-admin session is rejected from subdomain shell
- subdomain `/` opens dashboard
- subdomain settlement menu order matches spec
- subdomain login shows company header

- [ ] **Step 2: Run full targeted frontend regression**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console
npm run test -- src/tenant/resolveTenantEntry.test.ts src/App.cockpit.test.tsx src/cockpit/SubdomainAccordionNav.test.tsx src/cockpit/cheonha/CheonhaSettlementWorkspace.test.tsx src/cockpit/cheonha/CheonhaSettlementHomePage.test.tsx src/cockpit/cheonha/CheonhaRuleShellPanel.test.tsx src/pages/LoginPage.test.tsx
npm run test
npm run build
```

Expected:
- targeted tests pass
- full test suite passes
- production build succeeds

- [ ] **Step 3: Update frontend repo docs**

Document:
- subdomain shell contract
- dashboard-first entry
- settlement internal menu order
- rule-shell-only behavior

- [ ] **Step 4: Commit**

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console
git add README.md lesson.md
git commit -m "docs: record subdomain web shell contract"
```

## Live Regression Gate

Do not publish images or run deployment during the implementation tasks above.

If the user later wants a runtime proof, verify only after local tests/build pass:

1. main domain still routes to system-admin shell
2. `cheonha.ev-dashboard.com` resolves to the dashboard-first shell
3. settlement workspace opens with the expected menu order
4. existing dispatch upload automation remains reachable from `정산 > 배차 데이터`

## Notes for Implementers

1. Keep gateway/backend untouched unless the implementation proves an existing frontend assumption false.
2. `tenant-slug` and workspace bootstrap ownership stay in the current tenant/bootstrap APIs for this phase.
3. Do not reopen the abandoned “top-level 배차 탭” idea. This plan supersedes it.
4. Do not turn the rule shell into a persisted editor in this phase.
