# Single Web Console Cutover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidate the current two-web setup into a single `front-admin-console` runtime at `/`, with role-based UI branching replacing the old admin/operator app split.

**Architecture:** Keep current backend/service boundaries unchanged and treat this as a front/gateway/integration cutover. First lock docs and audit parity between the two current web apps. Then migrate operator read/self-service screens into `front-admin-console`, switch routes to a single shared set, update gateway/compose/runtime metadata, and only then remove `front-operator-console`.

**Tech Stack:** React + Vite + Vitest, gateway-routed HTTP APIs, Docker Compose local stack, Markdown rollout/spec docs

---

### Task 1: Lock the target truth and active rollout

**Files:**
- Create: `docs/decisions/specs/2026-04-06-single-web-console-cutover-design.md`
- Create: `docs/rollout/plans/2026-04-06-single-web-console-cutover-implementation-plan.md`
- Modify: `docs/rollout/16-web-first-platform-delivery-order.md`
- Modify: `docs/rollout/README.md`

- [ ] Write the single-web cutover design document.
- [ ] Update the web-first rollout order so single-web cutover is explicit work before region/personnel web.
- [ ] Add the active plan link to the rollout index.
- [ ] Run `git diff --check`.

### Task 2: Audit operator/admin parity before changing code

**Files:**
- Review only: `development/front-admin-console/src/App.tsx`
- Review only: `development/front-operator-console/src/App.tsx`
- Review only: `development/front-admin-console/src/components/Layout.tsx`
- Review only: `development/front-operator-console/src/components/Layout.tsx`
- Review only: `development/front-admin-console/src/pages/*.tsx`
- Review only: `development/front-operator-console/src/pages/*.tsx`
- Create: `docs/contracts/18-single-web-console-screen-map.md`

- [ ] Inventory every route/page that exists only in `front-operator-console`.
- [ ] Map each operator-only screen to one of:
  - shared route in the unified app
  - role-gated panel inside an existing admin route
  - obsolete and removable
- [ ] Write the route/screen map doc so migration scope is explicit.
- [ ] Run `git diff --check`.

### Task 3: Add failing tests for unified routing and role-gated screen access

**Files:**
- Modify: `development/front-admin-console/src/App.test.tsx` if present, otherwise add route tests under `src/**/*.test.tsx`
- Modify: `development/front-admin-console/src/components/Layout.test.tsx`
- Add/Modify: `development/front-admin-console/src/pages/*.test.tsx`

- [ ] Write failing tests for public auth entry remaining on the single app.
- [ ] Write failing tests that the unified app exposes shared routes like `/support`, `/notifications`, `/announcements`, `/drivers`, `/vehicles`, `/settlements`.
- [ ] Write failing tests that each role sees the right menus/actions on shared routes.
- [ ] Write failing tests that routes no longer depend on `/admin/*`.
- [ ] Run targeted tests and verify they fail for the missing unified routing behavior.

### Task 4: Move operator shared/self-service screens into front-admin-console

**Files:**
- Create/Modify: `development/front-admin-console/src/pages/AnnouncementsPage.tsx`
- Create/Modify: `development/front-admin-console/src/pages/SupportPage.tsx`
- Create/Modify: `development/front-admin-console/src/pages/NotificationsPage.tsx`
- Create/Modify: `development/front-admin-console/src/pages/DriversPage.tsx`
- Create/Modify: `development/front-admin-console/src/pages/Driver360Page.tsx` or equivalent read page
- Create/Modify: `development/front-admin-console/src/pages/VehiclesPage.tsx`
- Create/Modify: `development/front-admin-console/src/pages/SettlementsPage.tsx`
- Modify: `development/front-admin-console/src/api/*.ts`
- Modify tests under `development/front-admin-console/src/**/*.test.tsx`

- [ ] Copy or absorb operator-only read/self-service behavior into `front-admin-console`.
- [ ] Keep route names shared; do not introduce `/operator/*`.
- [ ] Preserve existing admin write behavior on the same pages where applicable.
- [ ] Run targeted admin-front tests until green.

### Task 5: Replace app-level split with role-based menu and page branching

**Files:**
- Modify: `development/front-admin-console/src/App.tsx`
- Modify: `development/front-admin-console/src/components/Layout.tsx`
- Modify: `development/front-admin-console/src/components/RequireAdmin.tsx`
- Modify: `development/front-admin-console/src/components/RequireRoleScope.tsx`
- Modify: `development/front-admin-console/src/authScopes.ts`
- Modify: `development/front-admin-console/src/uiLabels.ts`
- Modify tests under `development/front-admin-console/src/**/*.test.tsx`

- [ ] Remove assumptions that certain routes belong to an `operator` app versus an `admin` app.
- [ ] Make the menu tree depend on `role + scope + self-service` only.
- [ ] Make shared routes render role-appropriate read/write panels.
- [ ] Keep driver web access blocked as before.
- [ ] Run admin-front tests and build until green.

### Task 6: Cut gateway and local stack over to the single web runtime

**Files:**
- Modify: `development/edge-api-gateway/` routing/config files that expose web apps
- Modify: `development/integration-local-stack/docker-compose.account-driver-settlement.yml`
- Modify: `docs/mappings/current-runtime-inventory.md`
- Modify: `repo-map.md`
- Modify: `docs/mappings/repo-responsibility-matrix.md`

- [ ] Change the surviving web runtime to `front-admin-console` at `/`.
- [ ] Remove `/admin/` web routing and stop exposing `front-operator-console` as a live runtime.
- [ ] Update runtime inventory and repo map only after the gateway/compose cutover is real.
- [ ] Run any edge/local-stack smoke verification that proves the single app is the only web entry.

### Task 7: Remove front-operator-console from active platform flow

**Files:**
- Modify or delete references in docs that still describe `front-operator-console` as active
- Remove runtime references from integration/gateway configs
- Leave repo archival/removal decision explicit in docs if the folder is not physically deleted in this batch

- [ ] Remove `front-operator-console` from active rollout and contract docs.
- [ ] Decide whether this batch only deactivates the repo or physically deletes it.
- [ ] If deleted, update all references and verification commands accordingly.
- [ ] Run `git diff --check`.

### Task 8: Full verification and completion

**Files:**
- Refresh generated artifacts if touched

- [ ] Run `npm test` in `development/front-admin-console`.
- [ ] Run `npm run build` in `development/front-admin-console`.
- [ ] Run any gateway/integration-local-stack verification required by the cutover.
- [ ] Run `git diff --check`.
- [ ] Commit only after all verification commands pass.
