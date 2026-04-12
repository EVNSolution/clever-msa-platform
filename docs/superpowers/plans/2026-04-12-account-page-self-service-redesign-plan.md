# Account Page Self-Service Redesign Implementation Plan

**Goal:** Redesign `내 계정` into a narrower self-service layout with a compact access summary, balanced 2-column cards, compact request history, and the password change card fixed at the bottom.

**Architecture:** Keep the existing `AccountPage` data/API behavior intact and only reorganize the information architecture and page-scoped presentation. Use `PageLayout` as-is, add an explicit `AccountPage` wrapper/class structure, and introduce only scoped CSS in `src/styles.css` so other screens are untouched.

**Tech Stack:** React 18, TypeScript, Vite, Vitest, existing page-scoped CSS in `src/styles.css`

---

### Task 1: Lock the new AccountPage structure with a failing test

**Files:**
- Modify: `development/front-web-console/src/pages/AccountPage.test.tsx`
- Reference: `docs/superpowers/specs/2026-04-12-account-page-self-service-redesign-design.md`

- [ ] **Step 1: Write the failing test for the new page information architecture**

Add assertions for:
- compact access summary card text
- removal of old headings like `현재 웹 권한`, `self-service`, `요청 생성과 회사 변경`
- presence of new headings like `기본 정보`, `필수 동의`, `로그인 수단`, `내 요청`, `비밀번호 변경`
- password section rendered last
- request history rendered as a compact list, not nested panel cards

- [ ] **Step 2: Run the focused test and confirm the failure**

Run: `npm test -- src/pages/AccountPage.test.tsx --run`

Expected: FAIL because the current `AccountPage` still uses the old heading and layout structure.

- [ ] **Step 3: Commit the red test only if it is isolated and useful**

```bash
git add development/front-web-console/src/pages/AccountPage.test.tsx
git commit -m "test: define account page self-service layout expectations"
```

If the test and implementation will land together in one commit, skip this commit step.

### Task 2: Rebuild the AccountPage information architecture

**Files:**
- Modify: `development/front-web-console/src/pages/AccountPage.tsx`

- [ ] **Step 1: Replace the old stacked panel order with the approved self-service order**

Implement this page structure:
- top compact `현재 접근` summary card
- two-column content grid
  - left: `기본 정보`, `필수 동의`
  - right: `로그인 수단`, `내 요청`
- bottom full-width `비밀번호 변경`

- [ ] **Step 2: Remove mixed-role and duplicated wording**

Delete or rename:
- `현재 웹 권한`
- `{name} self-service`
- `요청 생성과 회사 변경`
- repeated helper copy that duplicates the page subtitle

- [ ] **Step 3: Keep all current actions but move them into clearer card-local action rows**

Preserve behavior for:
- profile update
- consent withdrawal
- login method add/delete
- request create/cancel
- password update

Only change visual grouping and ordering.

- [ ] **Step 4: Turn request history into a compact list**

Replace repeated nested `panel section-card` request cards with a compact row/list structure that shows:
- request display name
- company
- status
- requested date
- conditional cancel action

### Task 3: Add page-scoped layout and alignment styles

**Files:**
- Modify: `development/front-web-console/src/styles.css`

- [ ] **Step 1: Add an AccountPage-specific layout class block**

Create scoped classes for:
- max-width wrapper
- compact summary card
- 2-column content grid
- bottom password card

- [ ] **Step 2: Add card-local layout rules**

Implement scoped styles for:
- summary metric rows
- card body spacing
- compact action rows
- aligned buttons/selects/inputs
- request history compact rows

- [ ] **Step 3: Add responsive rules**

At narrower widths:
- collapse the 2-column grid to 1 column
- keep action rows readable without breaking baseline alignment
- ensure the password card remains last

- [ ] **Step 4: Verify styles stay page-scoped**

Do not modify global form/button behavior outside explicit `.account-page-*` or equivalent scoped classes.

### Task 4: Make the test pass and verify the redesigned page

**Files:**
- Verify: `development/front-web-console/src/pages/AccountPage.tsx`
- Verify: `development/front-web-console/src/pages/AccountPage.test.tsx`
- Verify: `development/front-web-console/src/styles.css`

- [ ] **Step 1: Run the focused unit test**

Run: `npm test -- src/pages/AccountPage.test.tsx --run`

Expected: PASS

- [ ] **Step 2: Run the production build**

Run: `npm run build`

Expected: PASS, with only the existing large chunk warning if unchanged.

- [ ] **Step 3: Inspect the page in the active 5174 app**

Route: `/me`

Check:
- page no longer feels full-width and dashboard-like
- summary is visually small
- card order matches the approved structure
- request history reads as a compact self-service list
- password card is last
- button/select/input baseline alignment is stable

- [ ] **Step 4: Commit the final UI change**

```bash
git add development/front-web-console/src/pages/AccountPage.tsx \
        development/front-web-console/src/pages/AccountPage.test.tsx \
        development/front-web-console/src/styles.css
git commit -m "feat: redesign account page as self-service workspace"
```

### Task 5: Sync the platform root pointer if the child repo commit changes

**Files:**
- Modify: `clever-msa-platform` root submodule pointer for `development/front-web-console`

- [ ] **Step 1: Stage the updated child repo pointer**

```bash
git add development/front-web-console
```

- [ ] **Step 2: Commit the root pointer update**

```bash
git commit -m "chore: update front web console pointer"
```

- [ ] **Step 3: Leave unrelated dirty files untouched**

Do not stage unrelated root changes while syncing the pointer.
