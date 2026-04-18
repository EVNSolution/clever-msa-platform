# Subdomain Settlement Cheonha Visual Adaptation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the existing subdomain shell intact while restyling the full `정산` workspace to match the `cheonha` reference tone, using real connected data when available and explicit empty states otherwise.

**Architecture:** The outer cockpit shell, brand card, global header, and detached workspace model stay unchanged. The implementation adds a settlement-only presentation layer inside `front-web-console` by upgrading the detached settlement sidebar, rebuilding the settlement home surface, and wrapping existing settlement/process/upload pages in a consistent `cheonha`-style panel system.

**Tech Stack:** React 18, React Router, TypeScript, Vite, Vitest, Testing Library, existing `front-web-console` CSS architecture in `src/styles.css`

---

## File Structure

### Existing files to modify

- `development/front-web-console/src/cockpit/SubdomainSettlementSidebar.tsx`
  - Upgrade the detached settlement sidebar into the larger two-line `cheonha`-style menu.
- `development/front-web-console/src/cockpit/cheonha/CheonhaSettlementWorkspace.tsx`
  - Define the shared settlement workspace frame, shared header, and route-specific stage container.
- `development/front-web-console/src/cockpit/cheonha/CheonhaSettlementHomePage.tsx`
  - Replace the current simple cards with a banner, process card, KPI strip, and recent-settlement box.
- `development/front-web-console/src/cockpit/cheonha/CheonhaSettlementProcessPage.tsx`
  - Keep the `SettlementInputsPage` runtime but wrap it in the new settlement visual shell.
- `development/front-web-console/src/cockpit/cheonha/CheonhaRuleShellPanel.tsx`
  - Re-style shell-only pages (`배송원 관리`, `운영 현황`, `팀 관리`) so they share the same settlement panel language.
- `development/front-web-console/src/cockpit/cheonha/CheonhaDispatchDataPage.tsx`
  - Keep the existing dispatch upload behavior but restyle its surrounding frame so it visually belongs to settlement.
- `development/front-web-console/src/styles.css`
  - Add or update the settlement-only visual tokens and layout rules.

### Existing tests to modify

- `development/front-web-console/src/cockpit/SubdomainAccordionNav.test.tsx`
  - Lock the upgraded settlement sidebar copy and menu density.
- `development/front-web-console/src/cockpit/cheonha/CheonhaSettlementHomePage.test.tsx`
  - Lock the new home structure, KPI slots, and empty-state contract.
- `development/front-web-console/src/cockpit/cheonha/CheonhaSettlementWorkspace.test.tsx`
  - Lock that all settlement child routes still render through the unified workspace shell.
- `development/front-web-console/src/cockpit/cheonha/CheonhaSettlementProcessPage.test.tsx`
  - Lock that the existing process page is still wrapped with the same settlement frame.
- `development/front-web-console/src/cockpit/cheonha/CheonhaDispatchDataPage.test.tsx`
  - Lock that dispatch upload behavior survives inside the restyled settlement frame.
- `development/front-web-console/src/App.cockpit.test.tsx`
  - Lock the cockpit entry contract if any text labels or empty-state behavior changes.

### Optional new focused tests if needed

- `development/front-web-console/src/cockpit/SubdomainSettlementSidebar.test.tsx`
  - Only create if the sidebar presentation logic becomes large enough that existing integration coverage is too coarse.

---

### Task 1: Lock the settlement visual contract with failing tests

**Files:**
- Modify: `development/front-web-console/src/cockpit/SubdomainAccordionNav.test.tsx`
- Modify: `development/front-web-console/src/cockpit/cheonha/CheonhaSettlementHomePage.test.tsx`
- Modify: `development/front-web-console/src/cockpit/cheonha/CheonhaSettlementWorkspace.test.tsx`
- Modify: `development/front-web-console/src/cockpit/cheonha/CheonhaSettlementProcessPage.test.tsx`
- Modify: `development/front-web-console/src/cockpit/cheonha/CheonhaDispatchDataPage.test.tsx`
- Modify: `development/front-web-console/src/App.cockpit.test.tsx`

- [ ] **Step 1: Write failing expectations for the new settlement sidebar**

Add assertions for:
- six settlement menu items still in the same order
- each menu item now renders title + description text
- sidebar surface is visually treated as the larger detached settlement panel

- [ ] **Step 2: Write failing expectations for the settlement home layout**

Add assertions for:
- greeting banner exists
- process card exists with four ordered steps
- KPI strip exists with the exact slot labels `수신합계`, `지급합계`, `조정비용`, `수익`
- recent settlement section shows explicit empty text when data is absent

- [ ] **Step 3: Write failing expectations for settlement child page framing**

Add assertions that `배차 데이터`, `정산 처리`, and shell-only pages render inside the shared settlement workspace shell rather than as isolated generic panels.

- [ ] **Step 4: Run only the focused cockpit settlement suite to verify the new assertions fail**

Run:
```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console
npm run test -- --run src/cockpit/SubdomainAccordionNav.test.tsx src/cockpit/cheonha/CheonhaSettlementHomePage.test.tsx src/cockpit/cheonha/CheonhaSettlementWorkspace.test.tsx src/cockpit/cheonha/CheonhaSettlementProcessPage.test.tsx src/cockpit/cheonha/CheonhaDispatchDataPage.test.tsx src/App.cockpit.test.tsx
```
Expected: FAIL because the current settlement sidebar and home page still use the older compact layout.

- [ ] **Step 5: Commit the red contract**

```bash
git add development/front-web-console/src/cockpit/SubdomainAccordionNav.test.tsx \
        development/front-web-console/src/cockpit/cheonha/CheonhaSettlementHomePage.test.tsx \
        development/front-web-console/src/cockpit/cheonha/CheonhaSettlementWorkspace.test.tsx \
        development/front-web-console/src/cockpit/cheonha/CheonhaSettlementProcessPage.test.tsx \
        development/front-web-console/src/cockpit/cheonha/CheonhaDispatchDataPage.test.tsx \
        development/front-web-console/src/App.cockpit.test.tsx
git commit -m "test: lock settlement cheonha visual contract"
```

### Task 2: Rebuild the detached settlement sidebar in the cheonha tone

**Files:**
- Modify: `development/front-web-console/src/cockpit/SubdomainSettlementSidebar.tsx`
- Modify: `development/front-web-console/src/styles.css`
- Test: `development/front-web-console/src/cockpit/SubdomainAccordionNav.test.tsx`
- Optional: `development/front-web-console/src/cockpit/SubdomainSettlementSidebar.test.tsx`

- [ ] **Step 1: Refactor the settlement sidebar item shape to support description text**

Use the existing order but add the exact subtitle copy from the spec.

- [ ] **Step 2: Update the settlement sidebar markup**

Render each entry as a two-line block:
- top line: menu title
- second line: helper description

Do not change the route bindings.

- [ ] **Step 3: Update CSS for the larger cheonha-like sidebar**

Adjust:
- width
- padding
- row height
- title/subtitle typography
- active-state treatment

Keep the detached sidebar family and shell ownership intact.

- [ ] **Step 4: Run the focused sidebar tests**

Run:
```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console
npm run test -- --run src/cockpit/SubdomainAccordionNav.test.tsx
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add development/front-web-console/src/cockpit/SubdomainSettlementSidebar.tsx \
        development/front-web-console/src/styles.css \
        development/front-web-console/src/cockpit/SubdomainAccordionNav.test.tsx
git commit -m "feat: restyle settlement detached sidebar"
```

### Task 3: Rebuild the settlement home screen

**Files:**
- Modify: `development/front-web-console/src/cockpit/cheonha/CheonhaSettlementHomePage.tsx`
- Modify: `development/front-web-console/src/styles.css`
- Test: `development/front-web-console/src/cockpit/cheonha/CheonhaSettlementHomePage.test.tsx`

- [ ] **Step 1: Replace the current simple cards with the new section structure**

Implement the home sections in this order:
- greeting banner
- small toggle/filter chip row
- process card
- KPI strip
- recent settlement box

- [ ] **Step 2: Keep data real-first and empty-state explicit**

Use currently available connected values when they exist. For missing values, render explicit fallback text like `0원`, `없음`, or `정산 내역이 없습니다`.

- [ ] **Step 3: Define KPI slots exactly as the spec requires**

Render the slots in this order:
- `수신합계`
- `지급합계`
- `조정비용`
- `수익`

Do not invent new KPI labels.

- [ ] **Step 4: Define process-card behavior exactly as the spec requires**

- `배차 업로드` and `정산 처리` should be clickable links
- `특근 설정` and `단가 확인` should render as status-only steps in this phase

- [ ] **Step 5: Run home-page tests**

Run:
```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console
npm run test -- --run src/cockpit/cheonha/CheonhaSettlementHomePage.test.tsx
```
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add development/front-web-console/src/cockpit/cheonha/CheonhaSettlementHomePage.tsx \
        development/front-web-console/src/styles.css \
        development/front-web-console/src/cockpit/cheonha/CheonhaSettlementHomePage.test.tsx
git commit -m "feat: rebuild cheonha settlement home surface"
```

### Task 4: Wrap settlement process and dispatch pages in the shared visual shell

**Files:**
- Modify: `development/front-web-console/src/cockpit/cheonha/CheonhaSettlementWorkspace.tsx`
- Modify: `development/front-web-console/src/cockpit/cheonha/CheonhaSettlementProcessPage.tsx`
- Modify: `development/front-web-console/src/cockpit/cheonha/CheonhaDispatchDataPage.tsx`
- Modify: `development/front-web-console/src/cockpit/cheonha/CheonhaRuleShellPanel.tsx`
- Modify: `development/front-web-console/src/styles.css`
- Test: `development/front-web-console/src/cockpit/cheonha/CheonhaSettlementWorkspace.test.tsx`
- Test: `development/front-web-console/src/cockpit/cheonha/CheonhaSettlementProcessPage.test.tsx`
- Test: `development/front-web-console/src/cockpit/cheonha/CheonhaDispatchDataPage.test.tsx`
- Test: `development/front-web-console/src/cockpit/cheonha/CheonhaRuleShellPanel.test.tsx`

- [ ] **Step 1: Create a shared settlement panel language in the workspace shell**

Refactor the settlement workspace so child pages inherit the same visual frame and spacing.

- [ ] **Step 2: Keep `SettlementInputsPage` behavior intact**

Do not replace the process runtime. Only wrap or frame it so it matches the cheonha presentation layer.

- [ ] **Step 3: Keep dispatch upload behavior intact**

Do not regress upload flow, auto-detection, or settlement handoff. Only reframe it inside the settlement workspace style.

- [ ] **Step 4: Upgrade shell-only pages to the new panel family**

`배송원 관리`, `운영 현황`, and `팀 관리` should look like intentional settlement pages, not generic placeholder boxes.

- `운영 현황`은 특히 box-style summary layout을 가져야 한다
- 그 요약 박스는 날짜/배차/근태 문맥을 담는 구조여야 한다
- 실제 값이 비면 `없음` 또는 `0` empty state를 명시적으로 보여야 한다

- [ ] **Step 5: Run focused settlement-route tests**

Run:
```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console
npm run test -- --run src/cockpit/cheonha/CheonhaSettlementWorkspace.test.tsx src/cockpit/cheonha/CheonhaSettlementProcessPage.test.tsx src/cockpit/cheonha/CheonhaDispatchDataPage.test.tsx src/cockpit/cheonha/CheonhaRuleShellPanel.test.tsx src/App.cockpit.test.tsx
```
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add development/front-web-console/src/cockpit/cheonha/CheonhaSettlementWorkspace.tsx \
        development/front-web-console/src/cockpit/cheonha/CheonhaSettlementProcessPage.tsx \
        development/front-web-console/src/cockpit/cheonha/CheonhaDispatchDataPage.tsx \
        development/front-web-console/src/cockpit/cheonha/CheonhaRuleShellPanel.tsx \
        development/front-web-console/src/styles.css \
        development/front-web-console/src/cockpit/cheonha/CheonhaSettlementWorkspace.test.tsx \
        development/front-web-console/src/cockpit/cheonha/CheonhaSettlementProcessPage.test.tsx \
        development/front-web-console/src/cockpit/cheonha/CheonhaDispatchDataPage.test.tsx \
        development/front-web-console/src/cockpit/cheonha/CheonhaRuleShellPanel.test.tsx \
        development/front-web-console/src/App.cockpit.test.tsx
git commit -m "feat: unify settlement workspace presentation"
```

### Task 5: Final regression, docs sync, and local verification

**Files:**
- Modify if needed: `development/front-web-console/README.md`
- Modify if needed: `development/front-web-console/lesson.md`
- Verify only if docs stay accurate as-is

- [ ] **Step 1: Re-read the spec and check the implementation against it line by line**

Spec:
`/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/superpowers/specs/2026-04-18-subdomain-settlement-cheonha-visual-adaptation-design.md`

- [ ] **Step 2: Run the full frontend test suite**

Run:
```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console
npm run test -- --run
```
Expected: PASS with zero failing files.

- [ ] **Step 3: Run the production build**

Run:
```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console
npm run build
```
Expected: PASS. Chunk-size warnings are acceptable unless they become errors.

- [ ] **Step 4: Run local-sandbox manual verification for settlement**

Start:
```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console
npm run dev:local-sandbox
```
Manual checks:
- `http://cheonha.ev-dashboard.com:5174/__dev__/session`
- inject `cheonha_manager`
- open `정산`
- verify enlarged two-line settlement sidebar
- verify settlement home banner/process/KPI/recent-settlement layout
- verify `배차 데이터` still opens the current upload flow
- verify empty values render as `0원`, `없음`, or `정산 내역이 없습니다`

- [ ] **Step 5: Update docs only if the implementation changed runtime contracts**

If runtime contracts or manual verification notes changed materially, update:
- `development/front-web-console/README.md`
- `development/front-web-console/lesson.md`

Otherwise leave docs untouched.

- [ ] **Step 6: Commit final verification/docs sync**

```bash
git add development/front-web-console/README.md \
        development/front-web-console/lesson.md
git commit -m "docs: record settlement cheonha adaptation"
```
Only include docs files if they actually changed.
