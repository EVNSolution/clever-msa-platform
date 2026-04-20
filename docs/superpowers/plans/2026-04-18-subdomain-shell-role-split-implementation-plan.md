# Company Path Shell Role-Split Implementation Plan

현재 canonical route contract는 `ev-dashboard.com/{tenant}`다. 이 plan 본문에 남아 있는 `subdomain` 표현은 historical component/file naming이나 compatibility host fallback을 가리키지 않는 한, 현재 구현 기준의 company path shell로 읽는다.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework the subdomain shell in `front-web-console` so dashboard becomes a card-only landing surface and settlement becomes the only route that renders a dedicated always-open sidebar below the preserved company card block.

**Architecture:** Keep the existing subdomain route contract from the approved web-definition spec, but split the shell into three explicit responsibilities: a reusable brand card area, a top-level expansion menu, and a settlement-only sidebar. `CockpitShell` should compose those pieces by route instead of letting one navigation component own dashboard and settlement layouts at the same time.

**Tech Stack:** React 18, TypeScript, React Router, Vitest, existing `front-web-console` CSS/layout system.

---

## Mandatory Scope Lock

This plan covers only:

1. subdomain shell layout inside `development/front-web-console`
2. dashboard card-only landing behavior
3. top-level `대시보드 / 정산` expansion behavior
4. settlement-only sidebar rendering and route wiring
5. cockpit shell regression tests and CSS updates

This plan does **not** include:

1. main-domain IA redesign
2. settlement internal content redesign
3. backend or gateway contract changes
4. login/session behavior changes
5. local-sandbox mode work

## Canonical Runtime Contract To Preserve

### Dashboard

- route: `/`
- no persistent sidebar
- only the `천하운수` square card block remains on the left/top edge
- card body click always returns to `/`
- card-right expand button controls the top-level menu only
- dashboard body remains intentionally empty

### Top-Level Expansion Menu

- current items:
  - `대시보드`
  - `정산`
- expansion state is local UI state, not route-derived
- first render is collapsed
- route transitions do not auto-reset the expanded state

### Settlement

- canonical entry:
  - `/settlement` -> redirect to `/settlement/home`
- brand card block stays visible
- below the card block, a separate settlement-only sidebar appears
- settlement sidebar is always expanded
- settlement menu stays:
  - `홈`
  - `배차 데이터`
  - `배송원 관리`
  - `운영 현황`
  - `정산 처리`
  - `팀 관리`

## File Structure

The implementation should use the following file responsibilities.

- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/cockpit/CockpitShell.tsx`
  - route-aware shell composition for dashboard vs settlement
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/cockpit/SubdomainAccordionNav.tsx`
  - split current mixed navigation into brand card area + top-level expansion menu + settlement-only sidebar rendering
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/cockpit/SubdomainAccordionNav.test.tsx`
  - unit tests for top-level expansion and settlement-only sidebar behavior
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/cockpit/cheonha/CheonhaDashboardPage.tsx`
  - strip dashboard content to an empty landing body
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/cockpit/cheonha/CheonhaSettlementWorkspace.tsx`
  - remove internal tab strip so settlement navigation is owned by the shell
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/cockpit/cheonha/CheonhaSettlementWorkspace.test.tsx`
  - assert redirect behavior survives without in-content tab strip assumptions
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/App.cockpit.test.tsx`
  - integration tests for dashboard-without-sidebar and settlement-with-sidebar shell behavior
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/styles.css`
  - shell layout, square card block, detached settlement sidebar, empty dashboard body
## Task 1: Lock the Dashboard-First Shell Contract in Tests

**Files:**
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/cockpit/SubdomainAccordionNav.test.tsx`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/App.cockpit.test.tsx`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/cockpit/cheonha/CheonhaSettlementWorkspace.test.tsx`

- [ ] **Step 1: Write the failing nav unit tests**

Add failing assertions in `SubdomainAccordionNav.test.tsx` for:
- dashboard route renders the company card and top-level expansion trigger
- dashboard route does **not** render settlement child links by default
- top-level expansion only reveals `대시보드` and `정산`
- top-level expanded state stays open after route changes until the user collapses it

- [ ] **Step 2: Write the failing integration tests**

Add failing assertions in `App.cockpit.test.tsx` for:
- `/` renders the company card but no settlement sidebar
- dashboard body no longer shows the old finance/attendance/dispatch sections
- `/settlement` redirects to `/settlement/home`
- `/settlement/home` still resolves under the cockpit shell without a top-level dispatch route

- [ ] **Step 3: Tighten the settlement workspace test**

Update `CheonhaSettlementWorkspace.test.tsx` so it no longer requires an in-content tab strip and only locks:
- `/settlement` redirect behavior
- route body rendering for each child page
- fail-closed behavior for removed legacy child slugs

- [ ] **Step 4: Run the focused failing tests**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console
npm run test -- src/cockpit/SubdomainAccordionNav.test.tsx src/App.cockpit.test.tsx src/cockpit/cheonha/CheonhaSettlementWorkspace.test.tsx
```

Expected:
- failures that point to the old mixed shell behavior

- [ ] **Step 5: Commit the red test harness**

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console
git add src/cockpit/SubdomainAccordionNav.test.tsx src/App.cockpit.test.tsx src/cockpit/cheonha/CheonhaSettlementWorkspace.test.tsx
git commit -m "test: lock role-split subdomain shell contract"
```

## Task 2: Split the Brand Card and Top-Level Menu

**Files:**
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/cockpit/SubdomainAccordionNav.tsx`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/cockpit/CockpitShell.tsx`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/styles.css`

- [ ] **Step 1: Implement the smallest route-aware nav API**

Refactor `SubdomainAccordionNav.tsx` so it can render:
- the square company card
- the right-side expand button
- the top-level `대시보드 / 정산` menu

Keep the component focused. Do not redesign settlement child pages here.

- [ ] **Step 2: Move shell composition into `CockpitShell`**

Update `CockpitShell.tsx` so:
- dashboard uses the brand card area without a persistent sidebar
- settlement routes still use the same outer shell without yet moving child-menu ownership out of the workspace
- `Outlet` remains the source of route body rendering

- [ ] **Step 3: Add the minimal styles**

Update `styles.css` with only the styles required for:
- square card block
- detached top-level menu expansion
- detached settlement sidebar block under the card block
- no-dashboard-sidebar layout

- [ ] **Step 4: Run focused tests to turn Task 1 green**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console
npm run test -- src/cockpit/SubdomainAccordionNav.test.tsx src/App.cockpit.test.tsx
```

Expected:
- both files pass

- [ ] **Step 5: Commit**

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console
git add src/cockpit/SubdomainAccordionNav.tsx src/cockpit/CockpitShell.tsx src/styles.css src/cockpit/SubdomainAccordionNav.test.tsx src/App.cockpit.test.tsx
git commit -m "feat: split subdomain brand card and top menu"
```

## Task 3: Strip Dashboard to an Empty Landing Surface

**Files:**
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/cockpit/cheonha/CheonhaDashboardPage.tsx`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/App.cockpit.test.tsx`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/styles.css`

- [ ] **Step 1: Write the failing empty-dashboard assertion**

Extend `App.cockpit.test.tsx` so the dashboard route explicitly rejects:
- `최근 6개월 수입/지출`
- `금월 배차표 기반 근태`
- `금일 배차`
- any placeholder body copy that implies content still exists

- [ ] **Step 2: Implement the minimal dashboard body**

Replace `CheonhaDashboardPage.tsx` content with an intentionally empty body container only. Do not leave helper copy, placeholder cards, or hidden sections.

- [ ] **Step 3: Trim dashboard-only styling**

Remove the now-unused dashboard summary/hero layout hooks from `styles.css` only if they are unused by tests and current route output. Do not over-clean unrelated cockpit styles in this task.

- [ ] **Step 4: Run focused dashboard tests**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console
npm run test -- src/App.cockpit.test.tsx
```

Expected:
- dashboard assertions pass with the empty landing body

- [ ] **Step 5: Commit**

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console
git add src/cockpit/cheonha/CheonhaDashboardPage.tsx src/App.cockpit.test.tsx src/styles.css
git commit -m "feat: collapse subdomain dashboard to empty shell"
```

## Task 4: Move Settlement Navigation Ownership Fully Into the Shell

**Files:**
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/cockpit/cheonha/CheonhaSettlementWorkspace.tsx`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/cockpit/cheonha/CheonhaSettlementWorkspace.test.tsx`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/cockpit/SubdomainAccordionNav.test.tsx`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/styles.css`

- [ ] **Step 1: Write the failing “sidebar only” workspace test**

Extend `CheonhaSettlementWorkspace.test.tsx` so the workspace no longer expects the in-content settlement tab strip and instead expects only the route body plus redirect behavior.

Extend `SubdomainAccordionNav.test.tsx` and `App.cockpit.test.tsx` so they now require:
- settlement routes render the full child menu in a detached sidebar block
- the company card block stays above that sidebar
- returning to `/` removes the settlement sidebar but preserves the top-level menu state

- [ ] **Step 2: Remove the duplicated in-content settlement navigation**

Update `CheonhaSettlementWorkspace.tsx` so:
- route handling stays the same
- the internal `<nav aria-label=\"정산 탭\">` is removed
- content continues to render under `/settlement/*`

- [ ] **Step 3: Verify the shell still exposes all settlement items**

Use `SubdomainAccordionNav.test.tsx` to keep the complete settlement item list locked in the sidebar:
- `홈`
- `배차 데이터`
- `배송원 관리`
- `운영 현황`
- `정산 처리`
- `팀 관리`

- [ ] **Step 4: Run focused settlement tests**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console
npm run test -- src/App.cockpit.test.tsx src/cockpit/SubdomainAccordionNav.test.tsx src/cockpit/cheonha/CheonhaSettlementWorkspace.test.tsx src/cockpit/cheonha/CheonhaSettlementHomePage.test.tsx src/cockpit/cheonha/CheonhaDispatchDataPage.test.tsx src/cockpit/cheonha/CheonhaSettlementProcessPage.test.tsx src/cockpit/cheonha/CheonhaRuleShellPanel.test.tsx
```

Expected:
- all settlement-focused cockpit tests pass

- [ ] **Step 5: Commit**

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console
git add src/cockpit/cheonha/CheonhaSettlementWorkspace.tsx src/cockpit/cheonha/CheonhaSettlementWorkspace.test.tsx src/cockpit/SubdomainAccordionNav.test.tsx src/styles.css
git commit -m "refactor: keep settlement navigation in the shell"
```

## Task 5: Full Regression and Verification

**Files:**
- No code changes expected unless regression fixes are required

- [ ] **Step 1: Run the full frontend test suite**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console
npm run test
```

Expected:
- full suite passes

- [ ] **Step 2: Run the production build**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console
npm run build
```

Expected:
- build passes

- [ ] **Step 3: Re-run the smallest representative suite after full verification**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console
npm run test -- src/App.cockpit.test.tsx src/cockpit/SubdomainAccordionNav.test.tsx src/cockpit/cheonha/CheonhaSettlementWorkspace.test.tsx
```

Expected:
- representative shell tests still pass

- [ ] **Step 4: Commit any regression fix only if needed**

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console
git add <regression-fix-files>
git commit -m "fix: close role-split shell regressions"
```

Skip this step if Task 5 required no code changes.

## Optional Follow-Up: Docs Sync

If the implemented shell behavior makes the local child-repo docs inaccurate, do this as a separate post-implementation cleanup:

- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/README.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/lesson.md`

Only document:
- dashboard no longer owns a persistent left rail
- settlement owns the only always-open sidebar
- the company card block persists across both dashboard and settlement

## Verification Checklist

Before calling the work complete, confirm all of the following:

1. `/` shows only the company card block and no settlement sidebar
2. the dashboard route does not render the old summary sections
3. clicking the card body still routes home
4. the top-level expansion control is separate from settlement child navigation
5. `/settlement` redirects to `/settlement/home`
6. settlement routes show the detached always-open sidebar under the preserved card block
7. settlement internal pages still render under the existing `/settlement/*` slugs
8. the full frontend suite and production build both pass
