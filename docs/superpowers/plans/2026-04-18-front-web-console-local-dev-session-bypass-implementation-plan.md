# Front Web Console Local Dev Session Bypass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a team-shared `front-web-console` local manual-test mode that uses `hosts`-based main/subdomain routing, a dev-only session injection page, and a full browser-side `/api` mock so people can click through the web app without touching real backends.

**Architecture:** Keep this phase entirely inside `development/front-web-console`. Preserve the existing `dev` and `dev:local-test` contracts, add a new `dev:local-sandbox` contract, activate a dev-only `/__dev__/session` route only in that mode, and install a browser-side `fetch` mock before React renders so every `/api` request is satisfied in memory and never reaches the Vite proxy or a real backend.

**Tech Stack:** React 18, TypeScript, Vite, React Router, Vitest, existing `front-web-console` session/bootstrap APIs.

---

## Mandatory Scope Lock

This plan covers only:

1. a new `dev:local-sandbox` script and mode contract in `front-web-console`
2. a dev-only `/__dev__/session` route for preset session injection
3. a browser-side `/api` mock layer that fully replaces real network access in `local-sandbox`
4. manual-test documentation for `ev-dashboard.com` and `cheonha.ev-dashboard.com`

This plan does **not** include:

1. production login or backend auth changes
2. `dev:local-test` behavior changes
3. Playwright automation
4. subdomain IA redesign or new backend endpoints

## Canonical Runtime Contract To Preserve

### Existing Modes

- `npm run dev`
  - existing normal Vite dev mode
  - no dev session route
  - no browser mock layer
- `npm run dev:local-test`
  - existing safer remote dev/staging proxy mode
  - no dev session route
  - still allowed to proxy to remote `/api`

### New Mode

- `npm run dev:local-sandbox`
  - dev-only manual browser test mode
  - `/__dev__/session` enabled
  - `/api` fully mocked in browser memory
  - no real network to backend `/api`

### Host Contract

- `ev-dashboard.com:5174`
  - main-domain shell
  - only `system_admin` preset exposed
- `cheonha.ev-dashboard.com:5174`
  - company subdomain shell
  - only `cheonha_manager` preset exposed

### Reset Contract

`세션 초기화` must clear:

1. stored session payload
2. dev preset bookkeeping
3. mock API memory state

## File Structure

The implementation should use the following file responsibilities.

- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/package.json`
  - add the new `dev:local-sandbox` script without changing existing scripts
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/vite.config.ts`
  - keep existing proxy behavior for normal modes, but make the new mode explicit and easy to verify
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/main.tsx`
  - bootstrap sandbox-only runtime hooks before React renders when `local-sandbox` is active
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/App.tsx`
  - expose `/__dev__/session` only in `local-sandbox`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/sessionPersistence.ts`
  - reuse existing storage contract; add helpers only if reset needs them
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/devSandbox/mode.ts`
  - single source of truth for `local-sandbox` activation checks
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/devSandbox/mode.test.ts`
  - mode guard tests
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/devSandbox/sessionPresets.ts`
  - host-aware preset definitions for `system_admin` and `cheonha_manager`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/devSandbox/sessionPresets.test.ts`
  - host/preset exposure tests
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/devSandbox/mockState.ts`
  - in-memory dataset and reset helpers
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/devSandbox/bootstrap.ts`
  - sandbox-only runtime bootstrap that keeps `dev` and `local-test` untouched
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/devSandbox/bootstrap.test.ts`
  - regression tests that `local-test` never activates the sandbox path
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/devSandbox/installFetchMock.ts`
  - browser-side `fetch` interception for every `/api` request
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/devSandbox/installFetchMock.test.ts`
  - prove `/api` never falls through and non-API requests still can
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/devSandbox/localSandboxSettlementRuns.test.tsx`
  - representative create/update/delete proof through real page code and sandbox fetch
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/pages/DevSessionPage.tsx`
  - minimal current-host + inject/reset UI
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/pages/DevSessionPage.test.tsx`
  - route/page behavior tests
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/App.test.tsx`
  - route visibility tests for main-domain app shell
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/App.cockpit.test.tsx`
  - subdomain `local-sandbox` shell + preset route assertions if needed
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/styles.css`
  - minimal styling for the dev session page only if needed
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/README.md`
  - document `dev`, `dev:local-test`, `dev:local-sandbox`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/lesson.md`
  - record the sandbox/manual-test contract and safety rules

## Task 1: Lock the New `local-sandbox` Mode Contract

**Files:**
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/package.json`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/vite.config.ts`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/devSandbox/mode.ts`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/devSandbox/mode.test.ts`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/devSandbox/bootstrap.ts`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/devSandbox/bootstrap.test.ts`

- [ ] **Step 1: Write the failing mode-contract tests**

Create `src/devSandbox/mode.test.ts` and `src/devSandbox/bootstrap.test.ts` covering:

```ts
import { describe, expect, it } from 'vitest';

import { isLocalSandboxMode } from './mode';

describe('isLocalSandboxMode', () => {
  it('returns false for dev and local-test', () => {
    expect(isLocalSandboxMode('development')).toBe(false);
    expect(isLocalSandboxMode('local-test')).toBe(false);
  });

  it('returns true only for local-sandbox', () => {
    expect(isLocalSandboxMode('local-sandbox')).toBe(true);
  });
});

describe('sandbox bootstrap gate', () => {
  it('keeps local-test on the existing remote-proxy path', async () => {
    expect(await shouldEnableLocalSandbox('local-test')).toBe(false);
  });

  it('activates only for local-sandbox', async () => {
    expect(await shouldEnableLocalSandbox('local-sandbox')).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console
npm run test -- src/devSandbox/mode.test.ts
npm run test -- src/devSandbox/bootstrap.test.ts
```

Expected:
- FAIL because the mode/bootstrap helpers do not exist yet

- [ ] **Step 3: Write the minimal mode helper and script**

Implement:
- `src/devSandbox/mode.ts`
- `src/devSandbox/bootstrap.ts`
- `package.json`
- `vite.config.ts`

Implementation rules:
- add `dev:local-sandbox` without modifying `dev` or `dev:local-test`
- keep existing proxy behavior unchanged for `dev` and `local-test`
- make the new mode explicit in code so the rest of the app can gate on it
- keep sandbox bootstrap fully disabled in `local-test`

Minimal implementation sketch:

```ts
export function isLocalSandboxMode(mode = import.meta.env.MODE): boolean {
  return mode === 'local-sandbox';
}
```

- [ ] **Step 4: Run focused verification**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console
npm run test -- src/devSandbox/mode.test.ts
npm run test -- src/devSandbox/bootstrap.test.ts
```

Expected:
- PASS

- [ ] **Step 5: Commit**

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console
git add package.json vite.config.ts src/devSandbox/mode.ts src/devSandbox/mode.test.ts src/devSandbox/bootstrap.ts src/devSandbox/bootstrap.test.ts
git commit -m "feat: add local sandbox mode contract"
```

## Task 2: Add the Dev Session Route and Host-Aware Presets

**Files:**
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/App.tsx`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/App.test.tsx`
- Optional Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/App.cockpit.test.tsx`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/devSandbox/sessionPresets.ts`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/devSandbox/sessionPresets.test.ts`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/pages/DevSessionPage.tsx`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/pages/DevSessionPage.test.tsx`
- Optional Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/styles.css`

- [ ] **Step 1: Write the failing preset-model tests**

Create `src/devSandbox/sessionPresets.test.ts` covering:

```ts
expect(resolveAllowedSessionPreset('ev-dashboard.com')).toEqual(['system_admin']);
expect(resolveAllowedSessionPreset('cheonha.ev-dashboard.com')).toEqual(['cheonha_manager']);
expect(resolveAllowedSessionPreset('alpha.ev-dashboard.com')).toEqual([]);
```

- [ ] **Step 2: Write the failing route/page tests**

Create `src/pages/DevSessionPage.test.tsx` and extend `src/App.test.tsx` so they require:
- `/__dev__/session` is hidden outside `local-sandbox`
- `ev-dashboard.com` shows only `system_admin`
- `cheonha.ev-dashboard.com` shows only `cheonha_manager`
- pressing `세션 주입` writes session and redirects to `/`
- pressing `세션 초기화` clears session and sandbox state

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console
npm run test -- src/devSandbox/sessionPresets.test.ts src/pages/DevSessionPage.test.tsx src/App.test.tsx
```

Expected:
- FAIL because presets/page/route do not exist yet

- [ ] **Step 3: Implement the minimal page and route**

Implement:
- `src/devSandbox/sessionPresets.ts`
- `src/pages/DevSessionPage.tsx`
- `src/App.tsx`

Implementation rules:
- do not expose the route from normal app navigation
- gate the route strictly with `isLocalSandboxMode`
- keep the page minimal: current host, allowed preset, inject, reset
- reuse `persistSession` / `clearStoredSession` rather than inventing a second session format

Minimal preset shape:

```ts
export type DevSessionPresetKey = 'system_admin' | 'cheonha_manager';
```

- [ ] **Step 4: Run focused verification**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console
npm run test -- src/devSandbox/sessionPresets.test.ts src/pages/DevSessionPage.test.tsx src/App.test.tsx
```

Expected:
- PASS

- [ ] **Step 5: Commit**

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console
git add src/App.tsx src/App.test.tsx src/devSandbox/sessionPresets.ts src/devSandbox/sessionPresets.test.ts src/pages/DevSessionPage.tsx src/pages/DevSessionPage.test.tsx src/styles.css
git commit -m "feat: add local sandbox session route"
```

## Task 3: Install the Full Browser-Side `/api` Mock Layer

**Files:**
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/main.tsx`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/devSandbox/mockState.ts`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/devSandbox/bootstrap.ts`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/devSandbox/installFetchMock.ts`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/devSandbox/installFetchMock.test.ts`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/devSandbox/localSandboxSettlementRuns.test.tsx`
- Optional Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/test/setup.ts`

- [ ] **Step 1: Write the failing mock-layer tests**

Create `src/devSandbox/installFetchMock.test.ts` covering:

```ts
it('handles workspace bootstrap and public tenant resolve in memory', async () => {
  // expect mocked JSON without real network
});

it('fails if an /api request falls through to the original fetch', async () => {
  // original fetch spy should not be called
});

it('resets mock state back to defaults', async () => {
  // create/update in memory, reset, observe defaults restored
});
```

Create `src/devSandbox/localSandboxSettlementRuns.test.tsx` covering one representative write-path:

```tsx
it('creates a settlement run through real page code using sandbox fetch only', async () => {
  // render SettlementRunsPage with a real HttpClient
  // submit the create form
  // assert the new run appears without vi.mock api modules
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console
npm run test -- src/devSandbox/installFetchMock.test.ts
npm run test -- src/devSandbox/localSandboxSettlementRuns.test.tsx
```

Expected:
- FAIL because the mock layer and representative write-path wiring do not exist yet

- [ ] **Step 3: Implement the minimal fetch interception**

Implement:
- `src/devSandbox/mockState.ts`
- `src/devSandbox/bootstrap.ts`
- `src/devSandbox/installFetchMock.ts`
- `src/main.tsx`

Implementation rules:
- install before `<App />` renders
- intercept every request whose URL resolves under `/api`
- return `Response` objects with JSON payloads matching current frontend expectations
- do not let `/api` requests reach the original fetch in `local-sandbox`
- allow non-API browser fetches to keep their existing behavior if the app needs them
- prove at least one real create/update/delete page flow works against the sandbox state without `vi.mock('../api/...')`

Minimum first dataset:
- identity login/session payloads for `system_admin` and `cheonha_manager`
- public tenant resolve for `cheonha`
- workspace bootstrap for main-domain and `cheonha`
- minimal dashboard/settlement/dispatch read models sufficient for manual clicking

- [ ] **Step 4: Run focused verification**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console
npm run test -- src/devSandbox/installFetchMock.test.ts src/pages/DevSessionPage.test.tsx src/App.cockpit.test.tsx
npm run test -- src/devSandbox/localSandboxSettlementRuns.test.tsx
```

Expected:
- PASS

- [ ] **Step 5: Commit**

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console
git add src/main.tsx src/devSandbox/mockState.ts src/devSandbox/bootstrap.ts src/devSandbox/installFetchMock.ts src/devSandbox/installFetchMock.test.ts src/devSandbox/localSandboxSettlementRuns.test.tsx src/pages/DevSessionPage.test.tsx src/App.cockpit.test.tsx
git commit -m "feat: add local sandbox api mock layer"
```

## Task 4: Document the Mode and Close the Verification Gate

**Files:**
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/README.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/lesson.md`
- Optional Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/App.test.tsx`
- Optional Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/App.cockpit.test.tsx`

- [ ] **Step 1: Write the failing doc/assertion checks**

Add or tighten test assertions if still missing:
- `/__dev__/session` unavailable in normal `dev`
- `local-sandbox` host/preset contract is explicit
- reset clears session + mock state

If the tests are already present and failing is not needed, note that this step is satisfied by existing failing assertions from Tasks 2 and 3.

- [ ] **Step 2: Update the docs**

Document in `README.md` and `lesson.md`:
- difference between `dev`, `dev:local-test`, and `dev:local-sandbox`
- `hosts` entries for `ev-dashboard.com` and `cheonha.ev-dashboard.com`
- safety rule: `local-sandbox` never calls real `/api`
- manual reset expectations

- [ ] **Step 3: Run the full verification suite**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console
npm run test
npm run build
rg -n "__dev__/session|local-sandbox" dist
```

Expected:
- all Vitest files pass
- build passes
- `rg` returns no dev route or sandbox-only entry leakage in `dist`

- [ ] **Step 4: Perform the manual route sanity check**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console
npm run dev:local-sandbox
```

Then confirm manually:
- `http://ev-dashboard.com:5174/__dev__/session` exposes only `system_admin`
- `http://cheonha.ev-dashboard.com:5174/__dev__/session` exposes only `cheonha_manager`
- after injection, `/` opens the expected shell
- interactions work without real backend access

- [ ] **Step 5: Commit**

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console
git add README.md lesson.md
git commit -m "docs: record local sandbox web test mode"
```

## Execution Notes

- Prefer fresh worktree execution in `development/front-web-console/.worktrees/`
- Keep TDD strict: tests first, then minimal implementation
- Do not repurpose `dev:local-test`; it is existing safer remote proxy mode
- If mock fidelity threatens scope, satisfy only the flows needed for manual shell verification and the existing page contracts
