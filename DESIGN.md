# CLEVER Design System

> Canonical source of truth: [`docs/contracts/21-design-system-and-surface-rules.md`](docs/contracts/21-design-system-and-surface-rules.md)
>
> If this file and the canonical contract disagree, the contract wins.

## Mission

CLEVER UI must feel like a precise operations console, not a generic SaaS dashboard.

The product surface must help operators scan, decide, and act quickly across dispatch, vehicles, drivers, settlements, communication, and permissions.

## Brand

- Product: `CLEVER`
- Active surface: `front-web-console`
- Planned appendix surface: driver self-service mobile app
- Visual direction: `light workspace + dark shell + lime accent`
- Experience keywords: `operational`, `restrained`, `high-signal`, `tactile`, `clear`

## Style Foundations

### Visual Style

- Use a bright work area with dark shell framing.
- Use restrained depth, not flat austerity and not glossy marketing effects.
- Use lime as the primary action color.
- Keep information hierarchy stronger than decoration.

### Typography

- Body/UI font: `IBM Plex Sans`
- Heading/metric/code-accent font: `Space Grotesk`
- Do not introduce a third primary font without explicit approval.

### Confirmed Core Tokens

| Token | Value | Use |
| --- | --- | --- |
| `accent` | `#cdde00` | primary CTA, active emphasis |
| `accent-soft` | `#f4f8c7` | soft accent surface |
| `panel-bg` | `#ffffff` | cards, forms, panels |
| `panel-border` | `#e7e9ee` | panel boundaries |
| `text-default` | `#181818` | primary content |
| `text-muted` | `#6f7785` | secondary content |
| `danger` | `#c5352c` | error, destructive action |
| `console-dark` | `#171817` | shell background |
| `console-dark-soft` | `#1f201f` | shell secondary surface |

### Confirmed Status Families

- `allow`: lime-positive state
- `deny`: burgundy-negative state
- `locked`: muted neutral constraint state
- `changed`: burgundy-warning/difference state

### Expansion States

The system should add semantic handling for these states, but exact values are not fully fixed in current code:

- `info`
- `pending`
- `live`
- `stale`
- `offline`
- `archived`

Mark exact values as `TBD` until they are explicitly adopted.

### Layout Grammar

- Login and public auth use their own shell.
- Logged-in UI uses `topbar + page-body`.
- Major content blocks use `panel`.
- List, detail, create, and edit routes stay separate.
- New create/edit forms default to one column.
- Relationship-heavy detail pages may use a limited two-column exception.

### Density, Radius, Motion

- Use restrained spacing rhythm close to a `4px` base.
- Keep motion short and functional.
- Small controls use small radius.
- Cards and larger surfaces may use larger radius.
- Heavy blur, glass, neon, and long spring motion are prohibited.

Current confirmed patterns:

- small control radius: `8px`
- pill radius: `999px`
- card radius family: `16px` and `22px`
- short transitions: around `120ms`
- notice entry/exit: around `240ms`

## Accessibility

- Target `WCAG 2.2 AA`
- Keyboard-first interaction patterns required
- Visible `focus-visible` states required
- Do not rely on color alone for meaning
- Distinguish empty, unavailable, and error states

## Writing Tone

- concise
- direct
- operational
- implementation-focused

Use short UI copy. Avoid marketing language in operational surfaces.

## Rules: Do

- Use semantic token names and shared foundations before introducing local values.
- Define component states explicitly: `default`, `hover`, `focus-visible`, `active`, `disabled`.
- Add `loading`, `error`, and `success` states when relevant.
- Keep the single web console model and permission-based view branching.
- Keep tables scan-friendly and dense without sacrificing readability.
- Use row-click detail entry for primary operational lists.
- Preserve dark shell / light workspace contrast.
- Keep lime reserved for primary action hierarchy.

## Rules: Don't

- Do not split the product back into separate admin/operator web apps.
- Do not introduce purple or unrelated accent families as new primary brand colors.
- Do not use gradients, glass, blur, or decorative effects as a default style language.
- Do not place long edit forms inside list pages.
- Do not default to action columns with `view` and `edit` buttons in tables.
- Do not hide focus indicators.
- Do not let internal identifiers force page-level horizontal overflow.

## Component Expectations

### App Shell

- Dark navigation shell, light work surface
- Navigation structure should explain information architecture, not compete with it
- Mobile drawer may collapse navigation, but not change hierarchy

### Panel

- Use white surfaces with restrained border and shadow
- Keep summary cards and detail sheets in the same visual family

### Button

- Primary uses lime accent
- Secondary and ghost stay neutral
- Destructive actions use danger only
- Small buttons belong in dense tables and toolbars

### Field Controls

- Full-width by default
- Labels stay above fields
- Focus is shown by border and ring, not by browser default alone
- Read-only content should not masquerade as editable controls

### Tables

- Default to `table-layout: fixed`
- Use muted uppercase headers
- Use subtle hover and selected states
- Keep long relational detail out of the list surface

### Detail Surfaces

- Read-first summary and relationship view
- Edit entry belongs in detail, not list
- Two-column layouts are exceptions for clear parent-child relationships

### Feedback

- Empty states stay muted and short
- Errors use explicit danger banners
- Top notices are for short global success/error feedback
- Loading is not the same as empty

### Status Badges

- Badge meaning comes before color
- Keep status shape language consistent
- Avoid letting policy badges and generic status badges drift into separate systems

### Analytics / Telemetry

- Add distinct semantic handling for `live`, `stale`, and `offline`
- Do not collapse freshness into generic success/error only
- Exact palette remains `TBD`

## Web Console Appendix

- Active runtime repo: `front-web-console`
- Base URL surface: `/`
- Permission differences should appear as view/action differences within shared routes
- Follow the route and layout grammar in `docs/contracts/10-front-ui-rules.md`

## Driver App Appendix

- Current status: planned, not active runtime
- Planned repo: `development/front-driver-app`
- Expected stack: `Flutter`
- Must share brand foundation and semantic state meaning with the web console
- Must use lower density, larger touch targets, and mobile-first navigation
- Exact runtime token export and mobile component library are `확인 필요`
