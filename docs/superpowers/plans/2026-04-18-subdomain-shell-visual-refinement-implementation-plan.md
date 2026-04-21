# Company Path Shell Visual Refinement Implementation Plan

현재 canonical route contract는 `ev-dashboard.com/{tenant}`다. 이 plan 본문에 남아 있는 `subdomain` 표현은 historical component/file naming이나 compatibility host fallback을 가리키지 않는 한, 현재 구현 기준의 company path shell로 읽는다.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refine the Cheonha subdomain shell so the square header card shows the new brand hierarchy, the top-level menu opens from a right-arrow trigger, and entering settlement does not resize the card, trigger, or detached sidebar.

**Architecture:** Keep the existing subdomain shell route contract and role-split direction, but move the current all-in-one rail toward three focused UI units: brand card, top-level expand trigger/menu, and detached settlement sidebar. Drive the implementation with cockpit-shell regression tests first, then update the CSS/layout so settlement attaches as an overlay-like block instead of pushing the dashboard frame.

**Tech Stack:** React, React Router, TypeScript, Vite, Vitest, Testing Library, CSS

---

## File Structure

### Existing files to modify

- Modify: `development/front-web-console/src/cockpit/CockpitShell.tsx`
  - Keep route-aware shell composition, but switch it to the refined visual layout contract.
- Modify: `development/front-web-console/src/cockpit/SubdomainAccordionNav.tsx`
  - Replace the text-like `정산` trigger with the new arrow affordance and compose the card/menu/sidebar from smaller units.
- Modify: `development/front-web-console/src/cockpit/cheonha/CheonhaDashboardPage.tsx`
  - Keep the dashboard body empty and ensure it does not accidentally reintroduce placeholder text or cards.
- Modify: `development/front-web-console/src/styles.css`
  - Add the square card, arrow-trigger, right-expanding menu, and detached settlement sidebar layout rules.
- Modify: `development/front-web-console/src/App.cockpit.test.tsx`
  - Lock the subdomain shell integration behavior from app entry.
- Modify: `development/front-web-console/src/cockpit/SubdomainAccordionNav.test.tsx`
  - Lock the refined card content, trigger behavior, and detached settlement sidebar behavior.

### New files to create

- Create: `development/front-web-console/src/cockpit/SubdomainBrandCard.tsx`
  - Focused square card component for `CLEVER / EV&Solution / 천하운수` plus the home-link interaction.
- Create: `development/front-web-console/src/cockpit/SubdomainExpandTrigger.tsx`
  - Arrow-only expand trigger for the top-level product menu launcher.
- Create: `development/front-web-console/src/cockpit/SubdomainSettlementSidebar.tsx`
  - Always-open settlement menu block rendered only for settlement routes.

### Optional docs sync

- Modify if needed: `development/front-web-console/README.md`
- Modify if needed: `development/front-web-console/lesson.md`
  - Only update if the current shell contract text is now inaccurate after the visual refinement.

---

### Task 1: Lock the refined shell contract in tests

**Files:**
- Modify: `development/front-web-console/src/cockpit/SubdomainAccordionNav.test.tsx`
- Modify: `development/front-web-console/src/App.cockpit.test.tsx`

- [ ] **Step 1: Add failing shell assertions for the new card content**

Add expectations that the dashboard shell shows:

```tsx
expect(screen.getByText('CLEVER')).toBeInTheDocument();
expect(screen.getByText('EV&Solution')).toBeInTheDocument();
expect(screen.getByText('천하운수')).toBeInTheDocument();
expect(screen.queryByText('전용 업무 cockpit')).not.toBeInTheDocument();
```

- [ ] **Step 2: Add failing assertions for the new top-level trigger behavior**

Replace text-button assumptions with trigger-specific assertions:

```tsx
const trigger = screen.getByRole('button', { name: '상위 메뉴 열기' });
expect(trigger).toHaveAttribute('aria-expanded', 'false');
expect(screen.queryByRole('button', { name: '정산' })).not.toBeInTheDocument();
```

After expanding:

```tsx
await user.click(trigger);
expect(screen.getByRole('link', { name: '대시보드' })).toHaveAttribute('href', '/');
expect(screen.getByRole('link', { name: '정산' })).toHaveAttribute('href', '/settlement/home');
```

- [ ] **Step 3: Add failing integration assertions for detached settlement layout**

In the cockpit app test, assert that settlement still preserves the card and trigger while adding the settlement sidebar:

```tsx
expect(await screen.findByText('CLEVER')).toBeInTheDocument();
expect(screen.getByRole('navigation', { name: '정산 메뉴' })).toBeInTheDocument();
expect(screen.getByTestId('subdomain-settlement-sidebar')).toBeInTheDocument();
```

- [ ] **Step 4: Run the focused cockpit tests to verify failure**

Run:

```bash
cd development/front-web-console
npm run test -- src/cockpit/SubdomainAccordionNav.test.tsx src/App.cockpit.test.tsx
```

Expected: FAIL because the old card subtitle and old `정산` button trigger are still rendered.

- [ ] **Step 5: Commit the red test scaffold**

```bash
git add src/cockpit/SubdomainAccordionNav.test.tsx src/App.cockpit.test.tsx
git commit -m "test: lock subdomain shell visual refinement contract"
```

---

### Task 2: Split the shell into brand card, expand trigger, and detached settlement sidebar

**Files:**
- Create: `development/front-web-console/src/cockpit/SubdomainBrandCard.tsx`
- Create: `development/front-web-console/src/cockpit/SubdomainExpandTrigger.tsx`
- Create: `development/front-web-console/src/cockpit/SubdomainSettlementSidebar.tsx`
- Modify: `development/front-web-console/src/cockpit/SubdomainAccordionNav.tsx`
- Modify: `development/front-web-console/src/cockpit/CockpitShell.tsx`
- Modify: `development/front-web-console/src/cockpit/cheonha/CheonhaDashboardPage.tsx`

- [ ] **Step 1: Implement the focused brand card component**

Create the square card component with this shape:

```tsx
<NavLink className="cockpit-brand-card" to="/">
  <span className="cockpit-brand-kicker">CLEVER</span>
  <span className="cockpit-brand-caption">EV&Solution</span>
  <span className="cockpit-brand-company">천하운수</span>
</NavLink>
```

- [ ] **Step 2: Implement the arrow-only expand trigger**

Create a trigger component that exposes only the launcher affordance and accessible name:

```tsx
<button
  aria-controls="subdomain-top-level-menu"
  aria-expanded={isExpanded}
  aria-label="상위 메뉴 열기"
  className="cockpit-expand-trigger"
  type="button"
>
  <span aria-hidden="true">→</span>
</button>
```

- [ ] **Step 3: Implement the detached settlement sidebar component**

Render only the settlement child links and mark the block for regression tests:

```tsx
<nav
  aria-label="정산 메뉴"
  className="cockpit-detached-settlement-sidebar"
  data-testid="subdomain-settlement-sidebar"
>
```

- [ ] **Step 4: Recompose `SubdomainAccordionNav` using the new focused units**

Keep the local expanded state, but remove the old subtitle-based card and text-like settlement trigger. The component should:

- render `SubdomainBrandCard`
- render `SubdomainExpandTrigger`
- render the right-expanding top-level menu
- render `SubdomainSettlementSidebar` only for settlement routes

- [ ] **Step 5: Keep the dashboard body empty**

Confirm `CheonhaDashboardPage` stays:

```tsx
return <section className="cockpit-dashboard" />;
```

No placeholder text, no summary cards, no filler copy.

- [ ] **Step 6: Run the focused cockpit tests to verify the implementation passes**

Run:

```bash
cd development/front-web-console
npm run test -- src/cockpit/SubdomainAccordionNav.test.tsx src/App.cockpit.test.tsx
```

Expected: PASS

- [ ] **Step 7: Commit the shell split implementation**

```bash
git add \
  src/cockpit/SubdomainBrandCard.tsx \
  src/cockpit/SubdomainExpandTrigger.tsx \
  src/cockpit/SubdomainSettlementSidebar.tsx \
  src/cockpit/SubdomainAccordionNav.tsx \
  src/cockpit/CockpitShell.tsx \
  src/cockpit/cheonha/CheonhaDashboardPage.tsx \
  src/cockpit/SubdomainAccordionNav.test.tsx \
  src/App.cockpit.test.tsx
git commit -m "feat: split subdomain shell visual roles"
```

---

### Task 3: Apply the visual refinement and prevent layout resizing on settlement entry

**Files:**
- Modify: `development/front-web-console/src/styles.css`
- Test: `development/front-web-console/src/cockpit/SubdomainAccordionNav.test.tsx`
- Test: `development/front-web-console/src/App.cockpit.test.tsx`

- [ ] **Step 1: Add the square card and text hierarchy styles**

Introduce stable card dimensions and the three text tiers:

```css
.cockpit-brand-card { inline-size: 11rem; block-size: 11rem; }
.cockpit-brand-kicker { font-size: ...; }
.cockpit-brand-caption { font-size: ...; }
.cockpit-brand-company { font-size: ...; }
```

- [ ] **Step 2: Style the arrow trigger and right-expanding top-level menu**

Add rules so the trigger sits immediately to the right of the card and the menu opens to the right without turning into a text CTA:

```css
.cockpit-expand-trigger { ... }
.cockpit-top-level-menu { position: absolute; left: calc(100% + ...); ... }
```

- [ ] **Step 3: Make the settlement sidebar a detached block that does not resize the card or trigger**

Use a layout that keeps the card/trigger block stable and attaches settlement beneath it instead of pushing the whole shell:

```css
.cockpit-settlement-stack { position: relative; }
.cockpit-detached-settlement-sidebar { position: absolute; top: calc(100% + ...); left: 0; ... }
```

If absolute positioning proves too brittle, use a fixed-width stacked container with reserved local positioning, but do not let settlement entry change the card or trigger dimensions.

- [ ] **Step 4: Run the focused shell tests again**

Run:

```bash
cd development/front-web-console
npm run test -- src/cockpit/SubdomainAccordionNav.test.tsx src/App.cockpit.test.tsx src/cockpit/cheonha/CheonhaSettlementWorkspace.test.tsx
```

Expected: PASS

- [ ] **Step 5: Run the full frontend verification gates**

Run:

```bash
cd development/front-web-console
npm run test
npm run build
```

Expected:

- `npm run test` => PASS
- `npm run build` => PASS

- [ ] **Step 6: Commit the visual/layout pass**

```bash
git add src/styles.css src/cockpit/SubdomainAccordionNav.test.tsx src/App.cockpit.test.tsx
git commit -m "feat: refine subdomain shell visual layout"
```

---

### Task 4: Sync docs if needed and perform final manual verification

**Files:**
- Modify if needed: `development/front-web-console/README.md`
- Modify if needed: `development/front-web-console/lesson.md`

- [ ] **Step 1: Check whether README/lesson still describe the old card/trigger shell**

Inspect the existing child repo docs and only patch them if they still mention:

- the old `전용 업무 cockpit` subtitle as the visible brand card copy
- the old text-like `정산` button as the top-level launcher
- a settlement layout that changes the card/trigger sizing

- [ ] **Step 2: Update docs only if drift exists**

Keep the doc patch minimal. Record:

- square brand card with `CLEVER / EV&Solution / 천하운수`
- arrow-only top-level trigger
- detached settlement sidebar that should not resize the header card or trigger

- [ ] **Step 3: Run local-sandbox manual verification**

Start:

```bash
cd development/front-web-console
npm run dev:local-sandbox
```

Manual checks:

- `http://ev-dashboard.com:5174/__dev__/session`
  - inject `system_admin`
  - confirm main shell still lands normally
- `http://cheonha.ev-dashboard.com:5174/__dev__/session`
  - inject `cheonha_manager`
  - confirm dashboard shows the new card content and no settlement sidebar
  - expand the arrow trigger and open `정산`
  - confirm `/settlement/home`
  - confirm the settlement sidebar appears while the card and trigger retain their size

- [ ] **Step 4: Commit doc sync if anything changed**

```bash
git add README.md lesson.md
git commit -m "docs: sync subdomain shell visual contract"
```

Skip this commit if no doc files changed.

---

## Final Verification Checklist

- [ ] `src/cockpit/SubdomainAccordionNav.test.tsx` passes
- [ ] `src/App.cockpit.test.tsx` passes
- [ ] `src/cockpit/cheonha/CheonhaSettlementWorkspace.test.tsx` passes
- [ ] `npm run test` passes
- [ ] `npm run build` passes
- [ ] local-sandbox manual verification confirms:
  - [ ] square card shows `CLEVER / EV&Solution / 천하운수`
  - [ ] arrow trigger opens the top-level menu to the right
  - [ ] dashboard still has no settlement sidebar
  - [ ] settlement route shows the detached sidebar
  - [ ] card and trigger sizing do not change on settlement entry
