# Settlement Criteria Card Workboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `/settlements/criteria` into a metadata-driven compact workboard that keeps card-local saves and removes the current long stacked form feel without breaking the current settlement-config metadata contract.

**Architecture:** Keep all behavior inside `development/front-web-console` and preserve the existing `service-settlement-registry` contract. Reorganize `SettlementCriteriaPage` into a page-scoped compact workboard that renders one card per metadata section plus one company/fleet pricing card, and move success/error handling from global page banners to card-local feedback. Height handling stays page-scoped: default to page scroll, and only enable inner-card scroll in a desktop-safe viewport branch (`min-width: 980px`, `min-height: 780px`) using a viewport-based wrapper cap (`max-height: calc(100dvh - 17rem)`), not a parent `height: 100%` chain.

**Tech Stack:** React 18, TypeScript, Vite, Vitest, existing page-scoped CSS in `src/styles.css`

---

## File Map

- Modify: `development/front-web-console/src/pages/SettlementCriteriaPage.tsx`
  - Replace the long stacked page with a workboard wrapper, metadata-backed cards, and card-local save handlers.
- Modify: `development/front-web-console/src/pages/SettlementCriteriaPage.test.tsx`
  - Lock the new information architecture, card-local save behavior, and old-heading removal.
- Modify: `development/front-web-console/src/styles.css`
  - Add `SettlementCriteriaPage`-scoped layout, internal-scroll, footer, and responsive rules.
- Create: `development/front-web-console/e2e/settlement-criteria-layout.spec.ts`
  - Lock the desktop-safe vs low-height/mobile scroll behavior at the viewport threshold.
- Reference: `docs/superpowers/specs/2026-04-13-settlement-criteria-card-workboard-design.md`
- Reference: `docs/superpowers/specs/2026-04-09-global-settlement-config-phase1-design.md`

### Task 1: Lock the new information architecture with a failing test

**Files:**
- Modify: `development/front-web-console/src/pages/SettlementCriteriaPage.test.tsx`
- Reference: `docs/superpowers/specs/2026-04-13-settlement-criteria-card-workboard-design.md`
- Reference: `development/service-settlement-registry/settlementregistry/settlement_config_metadata.py`

- [ ] **Step 1: Update the metadata fixture to match the real backend section contract**

Adjust the fixture so it uses the current backend section set, not a reduced sample:
- `tax_rates`
- `reported_amount`
- `insurance_rates`
- `thresholds`

Include the real field families so the test covers:
- `reported_amount_rate`
- insurance fields such as `national_pension_rate`
- threshold fields such as `two_insurance_min_settlement_amount` and `meal_allowance`

- [ ] **Step 2: Write failing assertions for the new page structure**

Add assertions for:
- page title `정산 기준`
- presence of metadata section card headings and `회사·플릿 단가표`
- absence of old strings:
  - `정산 설정`
  - `전역 정산 설정`
  - `회사/플릿 구분 없이`
  - `현재 설정 항목:`
- card-local save buttons:
  - metadata section별 저장 버튼
  - `단가표 저장`
- `보고 금액 반영률` field rendered from the `reported_amount` section card
- pricing card still renders company/fleet selectors and existing price inputs

- [ ] **Step 3: Add failing assertions for card-local PATCH and pricing save retention**

Cover:
- one config section card save and assert that only that section's fields are sent to `updateSettlementConfig`
- one pricing card save and assert the existing create/update path is unchanged

- [ ] **Step 4: Run the focused test and confirm failure**

Run:

```bash
cd development/front-web-console
npm test -- src/pages/SettlementCriteriaPage.test.tsx --run
```

Expected:
- FAIL because the page still renders the long global form and uses one global save button.

### Task 2: Rebuild state and save flow around card-local behavior

**Files:**
- Modify: `development/front-web-console/src/pages/SettlementCriteriaPage.tsx`

- [ ] **Step 1: Replace global success/error banner state with page-fatal + card-local feedback state**

Keep:
- one page-level fatal load error for initial metadata/config/pricing hydration failure

Add card-scoped feedback state for:
- metadata section cards
- `pricing-card`

The page should not show a broad success banner after individual saves.

- [ ] **Step 2: Add a helper that builds section-scoped PATCH payloads from metadata**

Implement a small page-local helper such as:

```ts
function buildSectionPayload(
  section: SettlementConfigMetadata['sections'][number],
  config: SettlementConfig,
): Partial<SettlementConfigPayload> {
  return section.fields.reduce((acc, field) => {
    acc[field.key as keyof SettlementConfigPayload] = getDisplayFieldValue(config, field.key);
    return acc;
  }, {} as Partial<SettlementConfigPayload>);
}
```

Do not hardcode field keys by card in the component.

- [ ] **Step 3: Split config saves into card-local submit handlers**

Each metadata section card should:
- submit only that section's fields
- own its own loading state
- own its own success/error message

Pricing stays on its own submit path and continues to use the existing create/update behavior.

- [ ] **Step 4: Keep the existing config value hydration behavior**

Do not change:
- metadata load source
- config load source
- pricing table load source
- company/fleet selection behavior

This task is only a state-flow reorganization, not a contract rewrite.

### Task 3: Rebuild the page markup into a viewport-fitted workboard

**Files:**
- Modify: `development/front-web-console/src/pages/SettlementCriteriaPage.tsx`

- [ ] **Step 1: Replace the stacked `panel` structure with a page-scoped workboard wrapper**

Use a page-local wrapper hierarchy such as:

```tsx
<div className="settlement-criteria-page">
  <header className="settlement-criteria-page-header">
    <h2>정산 기준</h2>
  </header>
  <div className="settlement-criteria-workboard">
    {/* config cards + pricing card */}
  </div>
</div>
```

- [ ] **Step 2: Render config cards directly from metadata sections**

Render one config card per metadata section in metadata order.

Important guardrails:
- do not regroup sections by field keys or section keys
- keep metadata field definitions as the source of labels/types/units
- if a new metadata section appears later, it should automatically render as another card without code changes

- [ ] **Step 3: Keep the pricing card as the final explicit card**

The pricing card stays explicit because it is not metadata-driven.
Render it after the metadata section cards inside the same workboard grid.

- [ ] **Step 4: Move action rows into card footers**

Each card should have:
- compact header
- body with fields
- footer with save action and local feedback

The old full-form bottom action row must be removed.

- [ ] **Step 5: Remove duplicated helper copy**

Delete:
- panel kicker copy
- field-count meta
- repeated section descriptions that make the screen long

Keep only the page title and concise card headings.

### Task 4: Add page-scoped height, density, and responsive styles

**Files:**
- Modify: `development/front-web-console/src/styles.css`

- [ ] **Step 1: Add `SettlementCriteriaPage`-scoped shell classes**

Add scoped classes only for this page, for example:
- `.settlement-criteria-page`
- `.settlement-criteria-workboard`
- `.settlement-criteria-card`
- `.settlement-criteria-card-header`
- `.settlement-criteria-card-body`
- `.settlement-criteria-card-footer`
- `.settlement-criteria-card-message`

Do not change global `.page-body` or unrelated settlement selectors.

- [ ] **Step 2: Implement desktop workboard layout**

At desktop widths:
- use `2 columns`
- keep cards visually balanced
- use a restrained gap
- keep page width comfortable rather than stretching into a full-width form wall

- [ ] **Step 3: Implement height-controlled internal scroll**

Implement page-scoped height behavior in two branches:

1. Default branch: normal page scroll
2. Desktop-safe branch: inner card scroll only when `min-width: 980px` and `min-height: 780px`

The criteria page-local workboard wrapper should:
- keep `overflow: visible` and auto card height in the default branch
- use `max-height: calc(100dvh - 17rem)` only in the desktop-safe branch
- keep outer overflow hidden only in that desktop-safe branch
- let card bodies scroll only in that desktop-safe branch
- fall back to normal page scroll instead of clipped content outside that branch
- never depend on a parent `height: 100%` chain for this behavior

Do not modify `SettlementSectionLayout` or `PageLayout` in this slice.

- [ ] **Step 4: Implement compact field density**

Within cards:
- reduce label/input spacing
- keep input/unit rows compact
- preserve button/select/input baseline alignment
- avoid decorative text blocks

- [ ] **Step 5: Add responsive fallback**

At smaller widths:
- collapse to `1 column`
- keep auto card height and page scroll
- do not force internal card scroll in low-height/mobile conditions

### Task 5: Verify the redesign and lock the final behavior

**Files:**
- Verify: `development/front-web-console/src/pages/SettlementCriteriaPage.tsx`
- Verify: `development/front-web-console/src/pages/SettlementCriteriaPage.test.tsx`
- Verify: `development/front-web-console/src/styles.css`
- Create/Test: `development/front-web-console/e2e/settlement-criteria-layout.spec.ts`

- [ ] **Step 1: Run the focused unit test**

Run:

```bash
cd development/front-web-console
npm test -- src/pages/SettlementCriteriaPage.test.tsx --run
```

Expected:
- PASS
- pricing card tests still PASS
- metadata section count/order tests still PASS

- [ ] **Step 2: Run the production build**

Run:

```bash
cd development/front-web-console
npm run build
```

Expected:
- PASS
- Existing chunk-size warning is acceptable if unchanged

- [ ] **Step 3: Add a viewport-threshold Playwright spec**

Create a route-mocked layout spec for `/settlements/criteria` that checks the threshold and both fallback dimensions:

1. Desktop-safe branch
   - viewport: `1280 x 900`
   - assert workboard uses inner card scroll behavior
2. Height-only fallback branch
   - viewport: `1280 x 770`
   - assert page scroll fallback remains active and content is not clipped
3. Width-only fallback branch
   - viewport: `970 x 900`
   - assert page scroll fallback remains active and content is not clipped
4. Low-width + low-height mobile fallback branch
   - viewport: `390 x 700`
   - assert page scroll fallback remains active and content is not clipped

Use mocked settlement metadata/config/pricing responses so the test is deterministic and does not depend on live proxy mode.

- [ ] **Step 4: Run the focused Playwright layout test**

Run:

```bash
cd development/front-web-console
npx playwright test e2e/settlement-criteria-layout.spec.ts
```

Expected:
- PASS
- safe branch and both threshold fallback branches verified

- [ ] **Step 5: Do scoped visual verification in the active frontend runtime only after mode selection**

When the user explicitly selects a verification mode, inspect `/settlements/criteria` for:
- page title only at top
- no old global helper copy
- metadata section cards plus final pricing card
- card-local save buttons
- `min-width: 980px` and `min-height: 780px` branch uses card-body scroll
- smaller/mobile branch falls back to page scroll without clipping
- desktop branch uses the explicit `calc(100dvh - 17rem)` wrapper cap, not inherited `100%` height
- stable baseline alignment for inputs and buttons
- low-height viewport behavior

- [ ] **Step 6: Commit the child repo change**

```bash
cd development/front-web-console
git add src/pages/SettlementCriteriaPage.tsx \
        src/pages/SettlementCriteriaPage.test.tsx \
        src/styles.css \
        e2e/settlement-criteria-layout.spec.ts
git commit -m "feat: redesign settlement criteria as card workboard"
```

### Task 6: Sync the platform root pointer

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

- [ ] **Step 3: Leave unrelated root changes untouched**

Do not stage unrelated files while syncing the pointer.
