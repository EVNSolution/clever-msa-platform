---
name: clever-design-system
description: Use when creating or updating UI, component rules, layouts, or surface documentation for the CLEVER web console or planned driver app surfaces.
---

# CLEVER Design System Skill

Canonical references:

- `docs/contracts/21-design-system-and-surface-rules.md`
- `docs/contracts/10-front-ui-rules.md`
- `docs/decisions/specs/2026-04-06-single-web-console-cutover-design.md`
- `docs/superpowers/specs/2026-04-13-driver-app-mvp-design.md`

If this skill conflicts with the canonical contract, the canonical contract wins.

## Mission

Build CLEVER UI as a precise operations console, not a generic SaaS dashboard and not a marketing site.

Prioritize scanability, route clarity, action hierarchy, and permission-aware surfaces across dispatch, vehicles, drivers, settlements, communication, and permissions.

## Brand

- Product: `CLEVER`
- Active surface: `front-web-console`
- Planned appendix surface: driver self-service mobile app
- Visual direction: `light workspace + dark shell + lime accent`
- Experience keywords: `operational`, `restrained`, `high-signal`, `clear`

## Style Foundations

### Typography

- Body/UI font: `IBM Plex Sans`
- Heading/metric/code-accent font: `Space Grotesk`
- Do not introduce a third primary font.

### Confirmed Core Tokens

- `accent`: `#cdde00`
- `accent-soft`: `#f4f8c7`
- `panel-bg`: `#ffffff`
- `panel-border`: `#e7e9ee`
- `text-default`: `#181818`
- `text-muted`: `#6f7785`
- `danger`: `#c5352c`
- `console-dark`: `#171817`
- `console-dark-soft`: `#1f201f`

### Confirmed Status Families

- `allow`: lime-positive state
- `deny`: burgundy-negative state
- `locked`: muted neutral constraint state
- `changed`: burgundy-warning/difference state

### Expansion States

These semantic states are needed but not fully fixed in current code. Mark exact values as `TBD` unless the implementation already defines them:

- `info`
- `pending`
- `live`
- `stale`
- `offline`
- `archived`

### Layout Grammar

- Public auth uses its own shell.
- Logged-in UI uses `topbar + page-body`.
- Major blocks use `panel`.
- List, detail, create, and edit routes stay separate.
- New create/edit forms default to one column.
- Two-column layouts are exceptions for clear relationship-heavy detail views.

### Density, Radius, Motion

- Keep spacing restrained and close to a `4px` rhythm.
- Keep motion short and functional.
- Use restrained depth only.
- No glass, blur, neon, or long spring motion.

Current confirmed patterns:

- small control radius: `8px`
- pill radius: `999px`
- card radius family: `16px`, `22px`
- short transitions: around `120ms`
- notice motion: around `240ms`

## Accessibility

- Target `WCAG 2.2 AA`
- Keyboard-first interactions required
- Visible `focus-visible` states required
- Do not rely on color alone for meaning
- Distinguish empty, unavailable, and error states

## Writing Tone

Use concise, direct, operational language.

- Short UI copy
- No marketing tone on operational surfaces
- No long raw backend error dumps

## Rules: Do

- Use semantic tokens before introducing local one-off values.
- Define all required states: `default`, `hover`, `focus-visible`, `active`, `disabled`.
- Add `loading`, `success`, and `error` states when relevant.
- Keep the single web console model with permission-based branching inside shared routes.
- Use dark shell and light work area contrast.
- Reserve lime for primary action hierarchy.
- Keep tables scan-friendly and dense.
- Use row-click detail entry for operational lists.
- Keep driver app branding aligned with the web console.

## Rules: Don't

- Do not split the product back into separate admin/operator web apps.
- Do not introduce purple or unrelated accent families as new primary brand colors.
- Do not default to gradients, glass, blur, or decorative effects.
- Do not place long edit forms inside list pages.
- Do not default to `view` and `edit` action columns in tables.
- Do not hide focus indicators.
- Do not let internal identifiers create page-level horizontal overflow.

## Guideline Authoring Workflow

1. Restate the surface goal in one sentence.
2. Check whether the work targets active web, planned mobile, or both.
3. Reuse confirmed tokens and layout grammar first.
4. Define component anatomy, variants, and states.
5. Define responsive and edge-case behavior.
6. Add accessibility acceptance criteria.
7. Flag anything not confirmed in current code as `확인 필요` or `TBD`.

## Required Output Structure

When writing UI guidance or implementation notes, structure the output like this:

- surface context and goal
- reused foundations and tokens
- component rules
- states and interactions
- responsive behavior
- accessibility requirements
- `확인 필요` / `TBD` items

## Component Rule Expectations

For each relevant component or surface, include:

- anatomy
- variants
- required states
- keyboard, pointer, and touch behavior
- spacing and typography expectations
- long-content and overflow handling
- empty/loading/error handling

## Surface Rules

### Web Console

- Active runtime repo: `front-web-console`
- Base surface: `/`
- Permission differences should appear as view/action differences within shared routes
- Follow the route grammar from `docs/contracts/10-front-ui-rules.md`

### Driver App Appendix

- Current status: planned, not active runtime
- Expected stack: `Flutter`
- Must share brand foundation and semantic state meaning with the web console
- Must use lower density, larger touch targets, and mobile-first navigation
- Exact token export and mobile component library are `확인 필요`

## Quality Gates

- Every non-negotiable rule uses `must` semantics, even if phrased tersely.
- Every recommendation uses `should` semantics.
- Accessibility requirements must be testable.
- Prefer consistency over local visual exceptions.
- If current code does not confirm a token or behavior, mark it `확인 필요` or `TBD`.
