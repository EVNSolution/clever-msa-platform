# Subdomain Vehicle Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new `차량` top-level launcher item to the subdomain shell and wire a detached vehicle workspace with a blank vehicle home plus existing driver/vehicle/vehicle-assignment pages.

**Architecture:** Extend the existing role-split shell instead of introducing a new shell. Keep the shared brand card, launcher, and global header intact; add vehicle as a second detached workspace alongside settlement. Reuse the current driver/vehicle pages and add only the minimum new vehicle-home surface and sidebar wiring.

**Tech Stack:** React, React Router, Vite, Vitest, Testing Library, existing `front-web-console` cockpit shell components

---

## File Structure

### Existing files to modify

- Modify: `development/front-web-console/src/cockpit/SubdomainAccordionNav.tsx`
  - expand the top-level menu contract from `dashboard | settlement` to `dashboard | vehicle | settlement`
  - add vehicle workspace child-nav definitions
  - extend route resolution helpers for vehicle paths
- Modify: `development/front-web-console/src/cockpit/CockpitShell.tsx`
  - treat vehicle routes as detached-workspace routes like settlement
  - choose the correct shell class and sidebar composition
- Modify: `development/front-web-console/src/App.tsx`
  - add a canonical cockpit route for `/vehicles/home`
  - keep existing `/drivers`, `/vehicles`, and `/vehicle-assignments` routes but make them render under the company cockpit shell
- Modify: `development/front-web-console/src/App.cockpit.test.tsx`
  - lock launcher order, vehicle workspace landing, and detached sidebar visibility
- Modify: `development/front-web-console/src/cockpit/SubdomainAccordionNav.test.tsx`
  - lock launcher order, vehicle route resolution, and detached vehicle sidebar behavior
- Modify: `development/front-web-console/src/styles.css`
  - if needed, share detached-sidebar surface styling between vehicle and settlement without creating a second visual system
- Modify: `development/front-web-console/README.md`
  - update the subdomain shell contract section to mention `대시보드 / 차량 / 정산`
- Modify: `development/front-web-console/lesson.md`
  - capture the new “multiple detached workspaces under one launcher” lesson

### New files to create

- Create: `development/front-web-console/src/cockpit/SubdomainVehicleSidebar.tsx`
  - detached sidebar renderer for the vehicle workspace
- Create: `development/front-web-console/src/cockpit/cheonha/CheonhaVehicleHomePage.tsx`
  - blank vehicle home landing surface
- Create: `development/front-web-console/src/cockpit/cheonha/CheonhaVehicleHomePage.test.tsx`
  - locks the blank landing contract

### Existing files likely to inspect while implementing

- Reference: `development/front-web-console/src/cockpit/SubdomainSettlementSidebar.tsx`
- Reference: `development/front-web-console/src/cockpit/cheonha/CheonhaSettlementWorkspace.tsx`
- Reference: `development/front-web-console/src/pages/DriversPage.tsx`
- Reference: `development/front-web-console/src/pages/VehiclesPage.tsx`
- Reference: `development/front-web-console/src/pages/VehicleAssignmentsPage.tsx`
- Reference: `docs/superpowers/specs/2026-04-18-subdomain-vehicle-workspace-design.md`

---

### Task 1: Lock the Vehicle Workspace Shell Contract

**Files:**
- Modify: `development/front-web-console/src/cockpit/SubdomainAccordionNav.test.tsx`
- Modify: `development/front-web-console/src/App.cockpit.test.tsx`
- Test: `development/front-web-console/src/cockpit/SubdomainAccordionNav.test.tsx`
- Test: `development/front-web-console/src/App.cockpit.test.tsx`

- [ ] **Step 1: Write the failing shell-contract tests**

Add tests that assert:

```tsx
expect(within(nav).getAllByRole('link').map((link) => link.textContent)).toEqual([
  '대시보드',
  '차량',
  '정산',
]);
```

Add cockpit integration assertions that:

```tsx
await user.click(screen.getByRole('button', { name: '상위 메뉴 열기' }));
await user.click(within(screen.getByRole('navigation', { name: '서브도메인 메뉴' })).getByRole('link', { name: '차량' }));

await waitFor(() => {
  expect(window.location.pathname).toBe('/vehicles/home');
});

expect(screen.getByRole('navigation', { name: '차량 메뉴' })).toBeInTheDocument();
expect(screen.queryByRole('navigation', { name: '정산 메뉴' })).not.toBeInTheDocument();
```

- [ ] **Step 2: Run the focused tests to verify they fail**

Run:

```bash
npm run test -- --run src/cockpit/SubdomainAccordionNav.test.tsx src/App.cockpit.test.tsx
```

Expected:
- failing assertions because `차량` does not exist in the launcher yet
- no green pass for the new `/vehicles/home` cockpit route

- [ ] **Step 3: Implement the minimal route-resolution helpers**

Extend `TopLevelMenuKey`, top-level menu items, and route resolution in:

- `src/cockpit/SubdomainAccordionNav.tsx`

Minimal target shape:

```tsx
export type TopLevelMenuKey = 'dashboard' | 'vehicle' | 'settlement';

const topLevelMenuItems = [
  { key: 'dashboard', label: '대시보드', to: '/' },
  { key: 'vehicle', label: '차량', to: '/vehicles/home' },
  { key: 'settlement', label: '정산', to: '/settlement/home' },
];
```

Route resolution rule:

```tsx
if (pathname === '/vehicles/home' || pathname.startsWith('/drivers') || pathname.startsWith('/vehicles/') || pathname === '/vehicles' || pathname.startsWith('/vehicle-assignments')) {
  return 'vehicle';
}
```

- [ ] **Step 4: Re-run the focused shell tests**

Run:

```bash
npm run test -- --run src/cockpit/SubdomainAccordionNav.test.tsx src/App.cockpit.test.tsx
```

Expected:
- new vehicle launcher assertions pass
- vehicle workspace route still fails later if sidebar/page wiring is not complete yet

- [ ] **Step 5: Commit the shell-contract slice**

```bash
git add src/cockpit/SubdomainAccordionNav.tsx src/cockpit/SubdomainAccordionNav.test.tsx src/App.cockpit.test.tsx
git commit -m "feat: add vehicle launcher contract"
```

### Task 2: Add the Detached Vehicle Sidebar

**Files:**
- Create: `development/front-web-console/src/cockpit/SubdomainVehicleSidebar.tsx`
- Modify: `development/front-web-console/src/cockpit/CockpitShell.tsx`
- Modify: `development/front-web-console/src/cockpit/SubdomainAccordionNav.tsx`
- Modify: `development/front-web-console/src/styles.css`
- Test: `development/front-web-console/src/cockpit/SubdomainAccordionNav.test.tsx`

- [ ] **Step 1: Write the failing detached-sidebar assertions**

Add or extend tests to require:

```tsx
const vehicleSidebar = screen.getByTestId('subdomain-vehicle-sidebar');
const vehicleNav = within(vehicleSidebar).getByRole('navigation', { name: '차량 메뉴' });

expect(within(vehicleNav).getAllByRole('link').map((link) => link.textContent)).toEqual([
  '홈',
  '배송원',
  '차량',
  '차량 배정',
]);
expect(vehicleSidebar.closest('.cockpit-rail')).toBeNull();
```

- [ ] **Step 2: Run the vehicle nav test to verify failure**

Run:

```bash
npm run test -- --run src/cockpit/SubdomainAccordionNav.test.tsx
```

Expected:
- failure because `subdomain-vehicle-sidebar` does not exist

- [ ] **Step 3: Implement the detached vehicle sidebar**

Create `src/cockpit/SubdomainVehicleSidebar.tsx` following the settlement sidebar pattern:

```tsx
type VehicleChildNavItem = {
  slug: 'home' | 'drivers' | 'vehicles' | 'assignments';
  label: string;
  to: string;
};
```

Render:

```tsx
<aside className="cockpit-child-nav cockpit-detached-sidebar" data-testid="subdomain-vehicle-sidebar">
  <nav aria-label="차량 메뉴">
```

Wire it into `CockpitShell.tsx` so vehicle routes render the vehicle sidebar, settlement routes render the settlement sidebar, and dashboard renders neither.

- [ ] **Step 4: Re-run the vehicle nav test**

Run:

```bash
npm run test -- --run src/cockpit/SubdomainAccordionNav.test.tsx
```

Expected:
- detached vehicle sidebar assertions pass

- [ ] **Step 5: Commit the detached sidebar slice**

```bash
git add src/cockpit/SubdomainVehicleSidebar.tsx src/cockpit/CockpitShell.tsx src/cockpit/SubdomainAccordionNav.tsx src/cockpit/SubdomainAccordionNav.test.tsx src/styles.css
git commit -m "feat: add vehicle workspace sidebar"
```

### Task 3: Add the Vehicle Home Route and Reuse Existing Pages

**Files:**
- Create: `development/front-web-console/src/cockpit/cheonha/CheonhaVehicleHomePage.tsx`
- Create: `development/front-web-console/src/cockpit/cheonha/CheonhaVehicleHomePage.test.tsx`
- Modify: `development/front-web-console/src/App.tsx`
- Modify: `development/front-web-console/src/App.cockpit.test.tsx`
- Reference: `development/front-web-console/src/pages/DriversPage.tsx`
- Reference: `development/front-web-console/src/pages/VehiclesPage.tsx`
- Reference: `development/front-web-console/src/pages/VehicleAssignmentsPage.tsx`

- [ ] **Step 1: Write the failing vehicle-home test**

Create a minimal test like:

```tsx
render(<CheonhaVehicleHomePage />);

expect(screen.getByRole('main')).toBeInTheDocument();
expect(screen.queryByText(/최근/i)).not.toBeInTheDocument();
expect(screen.queryByRole('heading')).not.toBeInTheDocument();
```

And in `App.cockpit.test.tsx`, assert that `/vehicles/home` renders:

```tsx
expect(screen.getByRole('navigation', { name: '차량 메뉴' })).toBeInTheDocument();
expect(screen.queryByRole('navigation', { name: '정산 메뉴' })).not.toBeInTheDocument();
```

- [ ] **Step 2: Run the focused vehicle-home tests and verify failure**

Run:

```bash
npm run test -- --run src/cockpit/cheonha/CheonhaVehicleHomePage.test.tsx src/App.cockpit.test.tsx
```

Expected:
- failure because `/vehicles/home` is not routed yet

- [ ] **Step 3: Implement the minimal vehicle home surface**

Create `CheonhaVehicleHomePage.tsx` as a blank surface:

```tsx
export function CheonhaVehicleHomePage() {
  return <section className="cockpit-empty-surface" aria-label="차량 홈" />;
}
```

In `App.tsx`:

- add the new `/vehicles/home` company-shell route
- keep existing `/drivers`, `/vehicles`, `/vehicle-assignments` routes intact
- make sure they continue to render under `CockpitShell`

- [ ] **Step 4: Re-run the focused vehicle-home tests**

Run:

```bash
npm run test -- --run src/cockpit/cheonha/CheonhaVehicleHomePage.test.tsx src/App.cockpit.test.tsx
```

Expected:
- `/vehicles/home` now lands in the blank vehicle dashboard surface
- existing cockpit routes remain green

- [ ] **Step 5: Commit the vehicle-home slice**

```bash
git add src/cockpit/cheonha/CheonhaVehicleHomePage.tsx src/cockpit/cheonha/CheonhaVehicleHomePage.test.tsx src/App.tsx src/App.cockpit.test.tsx
git commit -m "feat: add vehicle workspace landing"
```

### Task 4: Sync Docs and Run Full Verification

**Files:**
- Modify: `development/front-web-console/README.md`
- Modify: `development/front-web-console/lesson.md`
- Modify: `docs/superpowers/specs/2026-04-18-subdomain-vehicle-workspace-design.md` only if implementation drift requires a spec correction

- [ ] **Step 1: Update README contract lines**

Update the subdomain shell section to explicitly say:

- launcher order is `대시보드 / 차량 / 정산`
- vehicle workspace is detached like settlement
- vehicle sidebar order is `홈 / 배송원 / 차량 / 차량 배정`

- [ ] **Step 2: Update lesson.md**

Add a short lesson covering:

- detached workspaces can be added incrementally under the same launcher
- existing CRUD pages can be re-grouped into a new workspace without inventing new domain surfaces

- [ ] **Step 3: Run focused regression for cockpit + vehicle pages**

Run:

```bash
npm run test -- --run src/App.cockpit.test.tsx src/cockpit/SubdomainAccordionNav.test.tsx src/cockpit/cheonha/CheonhaVehicleHomePage.test.tsx src/pages/DriversPage.test.tsx src/pages/VehiclesPage.test.tsx src/pages/VehicleAssignmentsPage.test.tsx
```

Expected:
- all targeted workspace tests pass

- [ ] **Step 4: Run full verification**

Run:

```bash
npm run test -- --run
npm run build
```

Expected:
- `69+` test files pass with no failures
- build passes
- only existing non-blocking warnings may remain

- [ ] **Step 5: Commit docs and verification-aligned cleanup**

```bash
git add README.md lesson.md src/App.tsx src/App.cockpit.test.tsx src/cockpit/SubdomainAccordionNav.tsx src/cockpit/SubdomainAccordionNav.test.tsx src/cockpit/SubdomainVehicleSidebar.tsx src/cockpit/cheonha/CheonhaVehicleHomePage.tsx src/cockpit/cheonha/CheonhaVehicleHomePage.test.tsx src/styles.css
git commit -m "docs: record vehicle workspace shell"
```

---

## Final Verification Checklist

- [ ] `대시보드 / 차량 / 정산` launcher order is locked by tests
- [ ] `/vehicles/home` is the canonical vehicle landing route
- [ ] vehicle workspace shows a detached sidebar with `홈 / 배송원 / 차량 / 차량 배정`
- [ ] settlement workspace behavior is unchanged
- [ ] dashboard still has no detached sidebar
- [ ] existing drivers/vehicles/vehicle-assignments pages still render
- [ ] `npm run test -- --run` passes
- [ ] `npm run build` passes

## Notes For Implementers

- Do not invent new backend APIs for vehicle home.
- Do not refactor the main-domain shell in this plan.
- Do not rename existing `/drivers`, `/vehicles`, or `/vehicle-assignments` entity routes unless a new spec explicitly approves it.
- Prefer the existing detached settlement sidebar pattern over introducing a second shell abstraction.
