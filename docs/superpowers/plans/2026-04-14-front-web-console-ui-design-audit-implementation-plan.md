# Front Web Console UI Design Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clean up the highest-value `front-web-console` UI/design issues found in the audit without changing deploy/infra/image workflows during the current DevOps cutover window.

**Architecture:** Keep the work strictly inside `development/front-web-console` plus existing docs. Introduce shared UI primitives for semantic badges and helper copy, then apply them to the audited pages in small slices so the work remains local, testable, and easy to pause before any image/build publication step.

**Tech Stack:** React 18, TypeScript, Vite, Vitest, CSS, existing CLEVER design contract docs.

---

## Mandatory Execution Gate

Do not start implementation until the user gives an explicit go signal.

Execution constraints locked for this plan:

1. Do not build or publish container images.
2. Do not touch deploy workflows, infra repos, or central deploy control repos.
3. Do not push any runtime/deploy changes during the current DevOps cutover.
4. Limit execution to local `front-web-console` code, tests, and design/docs sync only.
5. If any task starts requiring gateway/API/runtime/deploy changes, stop and ask for a new execution decision.

## Scope Locked By This Plan

This plan covers only the audited UI/design issues below:

1. missing shared button `focus-visible` and `disabled` states
2. non-semantic `status-badge` usage across multiple status meanings
3. `empty-state` being overloaded for helper copy and explanatory text
4. dispatch board detail page mixing the primary board with too many maintenance surfaces
5. management notifications form exposing too many raw internal fields at equal visual weight

This plan does not include:

1. image build or deployment
2. API or backend contract changes
3. route restructuring across the whole console
4. design changes outside `front-web-console`

## File Structure

The implementation should use the following file responsibilities.

- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/components/StatusBadge.tsx`
  - semantic badge wrapper with stable tone mapping
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/components/StatusBadge.test.tsx`
  - tests for tone/class/data-attribute behavior
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/components/SurfaceNote.tsx`
  - helper/explanatory copy primitive that is not an empty state
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/components/SurfaceNote.test.tsx`
  - tests for helper/explanatory rendering
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/styles.css`
  - shared button states, badge tones, helper note styles
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/pages/DispatchBoardsPage.tsx`
  - semantic status badge adoption for board cards
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/pages/DispatchBoardDetailPage.tsx`
  - semantic badge adoption and board-vs-maintenance hierarchy cleanup
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/components/DispatchUploadWizard.tsx`
  - semantic badge adoption for upload batch statuses
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/pages/NotificationsPage.tsx`
  - helper copy separation and management form reduction
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/pages/SupportPage.tsx`
  - helper copy separation and management detail cleanup
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/pages/AnnouncementFormPage.tsx`
  - replace helper copy misuse of `empty-state`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/pages/CompaniesPage.tsx`
  - replace helper copy misuse of `empty-state`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/pages/RegionsPage.tsx`
  - replace helper copy misuse of `empty-state`
- Test: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/pages/DispatchBoardDetailPage.test.tsx`
- Test: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/pages/NotificationsPage.test.tsx`
- Test: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/pages/SupportPage.test.tsx`
- Test: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/components/TopNotificationBar.test.tsx`

## Execution Strategy

Keep the work in three local slices:

1. shared primitives first
2. helper/status cleanup on audited pages
3. dispatch board detail hierarchy reduction

If the user gives a limited go signal later, Task 1 and Task 2 can be executed first without committing to the bigger dispatch board cleanup.

### Task 1: Add Shared UI Audit Primitives

**Files:**
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/components/StatusBadge.tsx`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/components/StatusBadge.test.tsx`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/components/SurfaceNote.tsx`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/components/SurfaceNote.test.tsx`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/styles.css`
- Test: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/components/TopNotificationBar.test.tsx`

- [ ] **Step 1: Read the current audit contract and shared style anchors**

Read:
- `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/contracts/21-design-system-and-surface-rules.md`
- `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/styles.css`

- [ ] **Step 2: Write failing badge tests**

Create failing tests in `src/components/StatusBadge.test.tsx` covering:
- neutral tone
- success tone
- warning tone
- danger tone
- archived/non-positive tone

Expected failure:
- `StatusBadge` component does not exist yet

- [ ] **Step 3: Write failing helper-note tests**

Create failing tests in `src/components/SurfaceNote.test.tsx` covering:
- default helper note rendering
- muted explanatory note rendering
- helper note not using the empty-state class

Expected failure:
- `SurfaceNote` component does not exist yet

- [ ] **Step 4: Implement the minimal shared primitives**

Implement:
- `StatusBadge.tsx` with a stable `tone` prop and explicit class/data-attribute output
- `SurfaceNote.tsx` for helper/explanatory copy

- [ ] **Step 5: Add shared CSS states**

Modify `styles.css` to add:
- `.button:focus-visible`
- `.button:disabled`
- semantic tone rules for `.status-badge[data-tone='success'|'warning'|'danger'|'neutral'|'info']`
- `.surface-note` styles for helper/explanatory copy

- [ ] **Step 6: Run the new primitive tests**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console
npm run test -- src/components/StatusBadge.test.tsx src/components/SurfaceNote.test.tsx src/components/TopNotificationBar.test.tsx
```

Expected:
- all three files pass

- [ ] **Step 7: Commit**

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console
git add src/components/StatusBadge.tsx src/components/StatusBadge.test.tsx src/components/SurfaceNote.tsx src/components/SurfaceNote.test.tsx src/styles.css src/components/TopNotificationBar.test.tsx
git commit -m "feat: add semantic badge and helper note primitives"
```

### Task 2: Replace Empty-State Misuse On Audited Surface Copy

**Files:**
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/pages/AnnouncementFormPage.tsx`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/pages/CompaniesPage.tsx`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/pages/RegionsPage.tsx`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/pages/NotificationsPage.tsx`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/pages/SupportPage.tsx`
- Test: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/pages/NotificationsPage.test.tsx`
- Test: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/pages/SupportPage.test.tsx`

- [ ] **Step 1: Write failing management page tests**

Add failing assertions in:
- `NotificationsPage.test.tsx`
- `SupportPage.test.tsx`

Cover:
- explanatory/helper copy uses `SurfaceNote`
- true loading/empty states still use `empty-state`

Expected failure:
- audited helper copy is still rendered with `empty-state`

- [ ] **Step 2: Convert the audited explanatory copy**

Replace helper/explanatory uses of `empty-state` in:
- `AnnouncementFormPage.tsx`
- `CompaniesPage.tsx`
- `RegionsPage.tsx`
- `NotificationsPage.tsx`
- `SupportPage.tsx`

Use `SurfaceNote` for:
- form guidance
- panel guidance
- operational caveats

Keep `empty-state` only for:
- loading
- true zero-data states
- not-found or missing-context cases

- [ ] **Step 3: Run the audited page tests**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console
npm run test -- src/pages/NotificationsPage.test.tsx src/pages/SupportPage.test.tsx
```

Expected:
- both files pass

- [ ] **Step 4: Commit**

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console
git add src/pages/AnnouncementFormPage.tsx src/pages/CompaniesPage.tsx src/pages/RegionsPage.tsx src/pages/NotificationsPage.tsx src/pages/SupportPage.tsx src/pages/NotificationsPage.test.tsx src/pages/SupportPage.test.tsx
git commit -m "refactor: separate helper copy from empty states"
```

### Task 3: Roll Out Semantic Status Badges

**Files:**
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/pages/DispatchBoardsPage.tsx`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/pages/DispatchBoardDetailPage.tsx`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/components/DispatchUploadWizard.tsx`
- Test: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/pages/DispatchBoardDetailPage.test.tsx`

- [ ] **Step 1: Write failing badge-tone assertions**

Add failing assertions in `DispatchBoardDetailPage.test.tsx` for:
- archived outsourced driver badge uses a non-success tone
- day-exception/work-rule badge uses a neutral/info tone, not generic success
- confirmed batch badge remains positive

Expected failure:
- current page uses the same generic badge treatment

- [ ] **Step 2: Replace direct status badge markup with semantic usage**

Use `StatusBadge` in:
- `DispatchBoardsPage.tsx`
- `DispatchBoardDetailPage.tsx`
- `DispatchUploadWizard.tsx`

Tone mapping should follow these rules:
- confirmed/positive completion -> `success`
- archived/passive record -> `neutral`
- caution/difference state -> `warning`
- negative/failure state -> `danger`
- general descriptive state -> `info` or `neutral`

- [ ] **Step 3: Run the dispatch badge tests**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console
npm run test -- src/pages/DispatchBoardDetailPage.test.tsx
```

Expected:
- `DispatchBoardDetailPage.test.tsx` passes

- [ ] **Step 4: Commit**

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console
git add src/pages/DispatchBoardsPage.tsx src/pages/DispatchBoardDetailPage.tsx src/components/DispatchUploadWizard.tsx src/pages/DispatchBoardDetailPage.test.tsx
git commit -m "refactor: add semantic status badge usage"
```

### Task 4: Reduce Dispatch Board Detail Hierarchy Overload

**Files:**
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/pages/DispatchBoardDetailPage.tsx`
- Test: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/pages/DispatchBoardDetailPage.test.tsx`

- [ ] **Step 1: Write failing hierarchy tests**

Add failing assertions covering:
- primary board panel stays first and visually dominant
- maintenance surfaces render under a clearly labeled admin/maintenance section
- board table remains readable without being buried by creation forms

Expected failure:
- maintenance forms still render as peer surfaces immediately after the board

- [ ] **Step 2: Implement the minimal hierarchy cleanup**

Keep route and API behavior unchanged, but reorganize the page so:
- board table stays the primary surface
- schedule/rule/exception/outsourced maintenance areas move under a secondary maintenance heading
- helper copy is demoted to `SurfaceNote`
- no new routes or backend calls are introduced

- [ ] **Step 3: Run dispatch board page tests**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console
npm run test -- src/pages/DispatchBoardDetailPage.test.tsx
```

Expected:
- `DispatchBoardDetailPage.test.tsx` passes with the new hierarchy

- [ ] **Step 4: Commit**

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console
git add src/pages/DispatchBoardDetailPage.tsx src/pages/DispatchBoardDetailPage.test.tsx
git commit -m "refactor: simplify dispatch board detail hierarchy"
```

### Task 5: Reduce Raw Internal Weight In Notification And Support Management

**Files:**
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/pages/NotificationsPage.tsx`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/pages/SupportPage.tsx`
- Test: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/pages/NotificationsPage.test.tsx`
- Test: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/pages/SupportPage.test.tsx`

- [ ] **Step 1: Write failing management-flow tests**

Add failing assertions for:
- notifications management form visually separating required fields from internal metadata
- support management detail showing localized state/priority labels instead of raw enum-like values in the main action area

Expected failure:
- current forms present internal fields and operational actions at the same visual weight

- [ ] **Step 2: Implement the minimal management UX cleanup**

In `NotificationsPage.tsx`:
- group truly required send fields first
- demote raw metadata fields into an advanced/internal block
- use `SurfaceNote` for operational caveats

In `SupportPage.tsx`:
- keep ticket detail readable-first
- reduce the visual dominance of inline management controls
- convert helper copy to `SurfaceNote`
- keep behavior unchanged

- [ ] **Step 3: Run the management page tests**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console
npm run test -- src/pages/NotificationsPage.test.tsx src/pages/SupportPage.test.tsx
```

Expected:
- both files pass

- [ ] **Step 4: Run the local build as the final non-deploy gate**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console
npm run build
```

Expected:
- TypeScript passes
- Vite build completes locally
- no image build or deploy action is started

- [ ] **Step 5: Commit**

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console
git add src/pages/NotificationsPage.tsx src/pages/SupportPage.tsx src/pages/NotificationsPage.test.tsx src/pages/SupportPage.test.tsx
git commit -m "refactor: reduce raw internal weight in management pages"
```

## Final Local Verification Gate

After Tasks 1 through 5, run this local-only verification set before asking for the next instruction:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console
npm run test -- src/components/StatusBadge.test.tsx src/components/SurfaceNote.test.tsx src/components/TopNotificationBar.test.tsx src/pages/DispatchBoardDetailPage.test.tsx src/pages/NotificationsPage.test.tsx src/pages/SupportPage.test.tsx
npm run build
```

Expected:

1. targeted tests pass
2. local build passes
3. no deploy/image action has run

## Pause Point For User Signal

After local verification passes:

1. stop
2. summarize changed files and verification output
3. wait for the user's explicit execution/deploy signal before doing anything related to images, deploy repos, or runtime rollout
