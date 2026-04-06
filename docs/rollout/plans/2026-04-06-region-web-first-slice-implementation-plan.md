# Region Web First Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a first-slice region web flow to the single web console, with registry CRUD and analytics read surfaces connected through a single list/detail UX.

**Architecture:** Keep `service-region-registry` as the only write truth for region master data and keep `service-region-analytics` read-focused in the web. Build a list/detail flow in `front-admin-console`, aggregate latest analytics summaries for the list view, and use role-based UI gating instead of separate apps or routes.

**Tech Stack:** React + Vite + Vitest, Django/DRF region services, platform Markdown docs

---

### Task 1: Lock docs and contracts

**Files:**
- Create: `docs/decisions/specs/2026-04-06-region-web-first-slice-design.md`
- Create: `docs/contracts/19-admin-region-pages.md`
- Modify: `docs/contracts/README.md`
- Modify: `docs/rollout/16-web-first-platform-delivery-order.md`

- [ ] Save the approved region web design doc.
- [ ] Save the page contract for region list/detail/edit flows.
- [ ] Register the new contract doc in the contracts index.
- [ ] Update the rollout order so region web is the active next slice.
- [ ] Run `git diff --check`.

### Task 2: Add failing service tests for latest-summary list support

**Files:**
- Modify: `development/service-region-registry/regions/tests/test_region_api.py`
- Modify: `development/service-region-analytics/regionanalytics/tests/test_region_analytics_api.py`

- [ ] Write failing tests for any API support needed to fetch latest daily/performance snapshots by region.
- [ ] Prefer thin list-compatible support over broad new analytics APIs.
- [ ] Run targeted tests and verify they fail for the missing behavior.

### Task 3: Implement minimal backend support for list summaries

**Files:**
- Modify: `development/service-region-registry/regions/views.py` if registry needs extra filters only
- Modify: `development/service-region-analytics/regionanalytics/views.py`
- Modify: `development/service-region-analytics/regionanalytics/serializers.py`
- Modify tests under both region services

- [ ] Implement the minimal analytics list support needed for “latest daily” and “latest performance” lookups.
- [ ] Do not turn analytics into a write-heavy dashboard API.
- [ ] Keep service boundaries intact: registry stays truth, analytics stays snapshot.
- [ ] Run region service tests until green.

### Task 4: Add failing front-end tests for region list/detail flow

**Files:**
- Add: `development/front-admin-console/src/pages/RegionsPage.test.tsx`
- Add: `development/front-admin-console/src/pages/RegionDetailPage.test.tsx`
- Add/Modify: route/menu tests under `src/App.test.tsx` and `src/components/Layout.test.tsx`

- [ ] Write failing tests for a new `권역` menu entry and route.
- [ ] Write failing tests for list rows showing registry fields plus latest analytics summaries.
- [ ] Write failing tests for a detail page showing basic info, polygon, daily stats, and performance summaries together.
- [ ] Write failing tests for role-based edit visibility.
- [ ] Run targeted tests and verify they fail.

### Task 5: Implement front-end region list/detail/edit screens

**Files:**
- Create: `development/front-admin-console/src/api/regions.ts`
- Create: `development/front-admin-console/src/pages/RegionsPage.tsx`
- Create: `development/front-admin-console/src/pages/RegionDetailPage.tsx`
- Create: `development/front-admin-console/src/pages/RegionFormPage.tsx`
- Modify: `development/front-admin-console/src/App.tsx`
- Modify: `development/front-admin-console/src/components/Layout.tsx`
- Modify: `development/front-admin-console/src/authScopes.ts`
- Modify tests under `development/front-admin-console/src/**/*.test.tsx`

- [ ] Add the region routes:
  - `/regions`
  - `/regions/new`
  - `/regions/:regionRef`
  - `/regions/:regionRef/edit`
- [ ] Implement list rows with latest daily/performance summaries.
- [ ] Implement detail sections for registry info, polygon, daily statistics, and performance summaries.
- [ ] Keep analytics read-only in the UI.
- [ ] Gate edit/create actions by role while keeping read flow broader.
- [ ] Run targeted front tests until green.

### Task 6: Verification and finish

**Files:**
- Refresh only files touched by the slice

- [ ] Run `python manage.py test -v 2` in `development/service-region-registry`.
- [ ] Run `python manage.py test -v 2` in `development/service-region-analytics`.
- [ ] Run `npm test -- --run` in `development/front-admin-console`.
- [ ] Run `npm run build` in `development/front-admin-console`.
- [ ] Run `git diff --check`.
- [ ] Commit only after all verification commands pass.
