---
name: Paper Ledger
colors:
  surface: '#fff9ee'
  surface-dim: '#e0d9cb'
  surface-bright: '#fff9ee'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#faf3e4'
  surface-container: '#f4edde'
  surface-container-high: '#eee8d9'
  surface-container-highest: '#e9e2d3'
  on-surface: '#1e1b13'
  on-surface-variant: '#494740'
  inverse-surface: '#333026'
  inverse-on-surface: '#f7f0e1'
  outline: '#7a776f'
  outline-variant: '#cac6bd'
  surface-tint: '#605e5a'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#1d1b18'
  on-primary-container: '#86837f'
  inverse-primary: '#cac6c1'
  secondary: '#aa352a'
  on-secondary: '#ffffff'
  secondary-container: '#fd7362'
  on-secondary-container: '#6f0806'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#002113'
  on-tertiary-container: '#549071'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e6e2dc'
  primary-fixed-dim: '#cac6c1'
  on-primary-fixed: '#1d1b18'
  on-primary-fixed-variant: '#484743'
  secondary-fixed: '#ffdad5'
  secondary-fixed-dim: '#ffb4a9'
  on-secondary-fixed: '#410001'
  on-secondary-fixed-variant: '#891d16'
  tertiary-fixed: '#b1f0cd'
  tertiary-fixed-dim: '#96d4b2'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#105137'
  background: '#fff9ee'
  on-background: '#1e1b13'
  surface-variant: '#e9e2d3'
typography:
  headline-xl:
    fontFamily: EB Garamond
    fontSize: 34px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-xl-mobile:
    fontFamily: EB Garamond
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: 0em
  headline-lg:
    fontFamily: EB Garamond
    fontSize: 22px
    fontWeight: '500'
    lineHeight: 28px
    letterSpacing: 0em
  body-lg:
    fontFamily: EB Garamond
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: EB Garamond
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  stamp-lg:
    fontFamily: IBM Plex Mono
    fontSize: 22px
    fontWeight: '700'
    lineHeight: 24px
    letterSpacing: 0.14em
  stamp-sm:
    fontFamily: IBM Plex Mono
    fontSize: 14px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.12em
  mono-header:
    fontFamily: IBM Plex Mono
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 18px
    letterSpacing: 0.08em
  mono-data:
    fontFamily: IBM Plex Mono
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  label-mono:
    fontFamily: IBM Plex Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.06em
  caption-mono:
    fontFamily: IBM Plex Mono
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 14px
    letterSpacing: 0.02em
spacing:
  gutter: 1rem
  gutter-lg: 1.5rem
  margin: 1rem
  margin-md: 2rem
  margin-lg: 3rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

The design system evokes the physical reality of a bound, linen-thread bookkeeper's journal from the late nineteenth to mid-twentieth century. Built for meticulous fiscal record-keeping, balance tracking, and ledger audits, it departs entirely from contemporary gloss, software abstractions, and frictionless digital aesthetics. It speaks to precision, permanence, accountability, and disciplined labor.

The aesthetic combines rigorous Brutalism with tactile analog stationery: flat pulp paper sheets, hairline ink boundaries, disciplined ruled registers, physical rubber-stamp adjudications, and crisp cold-metal typography. 

Guiding Directives:
- **Zero Digital Artifice**: Prohibit all drop shadows, box shadows, blurs, multi-stop gradients, glass surfaces, or ambient glows. Surfaces do not float; they sit flush like cut leaves of paper.
- **Ink-on-Paper Discipline**: Interfaces rely strictly on physical sheet boundaries, ruling lines, stamped ink blocks, and monospaced alignment grids.
- **Editorial Terse Tone**: Microcopy and feedback must read like dry, telegraphic bookkeeper annotations ("FOLIO 104 BALANCED", "DEBIT APPLIED", "RECORDS LOCKED", "ARREARS OUTSTANDING"). Eliminate casual greetings, playful flourishes, and marketing hyperbole.
- **Prohibited Attributes**: Absolutely no blue/purple SaaS accent palettes, pill-shaped chips, floating action buttons, circular avatar badges, decorative iconography sets, emojis, or rounded bubble containers.

## Colors

The palette is derived from aged stationery stock, iron gall ink, and mineral marking dyes. High-contrast line work against muted pulp tones ensures tabular legibility under dense informational loads.

### Palette Tokens
- **Paper Background (`#F3ECDD`)**: Base sheet canvas representing natural, unbleached heavy rag paper.
- **Paper Shade (`#EAE1CD`)**: Secondary sheet tier used for ledger folio cards, insected panels, and table header rows.
- **Ink (`#1B1A17`)**: Primary structural color for ink lines, 1.5px master rules, structural borders, primary lettering, and solid command buttons.
- **Muted Ink (`#6B655A`)**: Secondary ink tone for folio identifiers, tabular column subheadings, timestamps, and advisory notes.
- **Ledger Rule (`#CBD5CF`)**: Light mineral blue-grey hairline ruling color used for horizontal row dividers and sheet guidelines.
- **Margin Red (`#C2473A`)**: Structural accounting red for vertical journal margin rules, debit summaries, error notices, and past-due audit stamps.
- **Paid Green (`#2F6B4F`)**: Saturated verification green reserved strictly for settlement verification stamps, surplus balances, and ledger balancing receipts.

### Application Rules
- Never use opacity or alpha-channel transparency to achieve hierarchy. If an element requires de-emphasis, apply solid `Muted Ink` (`#6B655A`) or solid `Ledger Rule` (`#CBD5CF`).
- Surfaces must remain entirely opaque. Layers are depicted through mechanical nesting and border demarcation, never via transparency.

## Typography

Typographic hierarchy rests upon two opposing voices: the classical authority of literary serif letterforms for narrative headings and formal balances, countered by the mechanical precision of monospaced characters for indexing, tabular currency arrays, metadata stamps, and structural headers.

### Font Hierarchy & Roles
- **Serif System (`EB Garamond`)**: Used for page folios, narrative balance sheets, section titles, and narrative entry descriptions. It evokes the formal copperplate and serifed headings found on physical financial register title pages.
- **Monospace System (`IBM Plex Mono`)**: Governs all operational metadata, dates, monetary values, reference indices, column headers, form input labels, system statuses, and rubber audit stamps. Tabular numerals must always be aligned right when representing accounting figures.

### Typographic Constraints
- Restricted strictly to the defined scale: 12px, 14px, 16px, 22px, and 34px. No intermediate or arbitrary fractional sizes.
- Monospace headers and stamps are always uppercase with expanded letter-spacing to mimic handset lead type and carved wooden rubber stamps.

## Layout & Spacing

The layout is structured around an authentic accounting folio sheet. The core organizing principle relies on a fixed, uninterrupted vertical margin rule running down the left boundary of the primary viewport or ledger container.

### The Double Left Margin Rule
All primary views feature a signature double vertical line running down the left canvas, placed between the navigation/audit spine and the primary ledger entry area:
- Constructed as two parallel vertical rules of 1px solid `Margin Red` (`#C2473A`), separated by an exact 3px gap.
- Content to the left contains journal folio numbers, transaction dates, and line indices. Content to the right contains transaction narratives, debit/credit columns, and balance summaries.

### Grid & Folio Architecture
- **Desktop (1024px and above)**: 12-column grid within a bounded folio container (max-width: 1280px). Margin: 3rem (`margin-lg`), Gutters: 1.5rem (`gutter-lg`).
- **Tablet (768px – 1023px)**: 8-column layout. Margin: 2rem (`margin-md`), Gutters: 1rem (`gutter`).
- **Mobile (Below 768px)**: 4-column layout. Margin: 1rem (`margin`), Gutters: 1rem (`gutter`). Ledger tables collapse into vertical debit/credit item blocks, with the red vertical margin maintaining its presence along the left viewport edge.

### Rhythmic Ruled Lines
Ledger tables and records align to a fixed 36px or 44px vertical row-height cadence. Horizontal row divisions are explicitly drawn using 1px solid `Ledger Rule` (`#CBD5CF`), giving the entire page the visual structure of pre-printed accounting paper.

## Elevation & Depth

Visual hierarchy is communicated strictly through surface layering and bold physical borders. Physical depth is created through cut-sheet paper placement rather than atmospheric lighting.

### Architectural Rules
- **No Drop Shadows or Glows**: Prohibit `box-shadow`, `text-shadow`, and `filter: drop-shadow()`.
- **Primary Ink Borders**: Delimit distinct folio boundaries, structural ledger modules, modal registries, and card frames using a deliberate 1.5px solid `Ink` (`#1B1A17`) rule.
- **Layer Stacking**:
  - **Base Canvas**: `Paper Background` (`#F3ECDD`).
  - **Delineated Sheets / Containers**: Cut panels surfaced with `Paper Shade` (`#EAE1CD`) and framed by a 1.5px solid `Ink` border.
  - **Header & Rule Stacking**: Fixed structural headers sit on `Paper Background` or `Paper Shade` separated from the content by a continuous 1.5px horizontal ink line.
- **Pressed Interaction States**: Interactive items do not lift toward the user. On click/press, interactive components simulate physical stamping or insetting by inverting colors (e.g., secondary buttons switch to solid ink fill with paper text) or displacing content 1px down and 1px right along the axis.

## Shapes

The shape system represents guillotined paper and square metal-type blocks. 

### Geometric Rules
- **Default Corner Geometry**: All surfaces, sheets, containers, table cells, and buttons possess sharp 0px to maximum 2px corners (`border-radius: 0px` to `2px`). Rounded pill forms, circular buttons, and fluid organic curves are expressly forbidden.
- **Edge Finish**: Edges must remain razor-sharp and unsoftened. A maximum 2px radius is allowed solely on master card enclosures and buttons to represent slightly worn or cut heavy-stock card corners.
- **Stamps & Badges**: Rubber stamps are rendered as strict, unrounded rectangular frames (`border-radius: 0px` to `2px`).

## Components

### Buttons & Interactive Controls
- **Primary Command (Solid Ink)**:
  - Surface: Solid `Ink` (`#1B1A17`).
  - Text: Uppercase `IBM Plex Mono` (12px or 14px), letterspaced 0.08em, colored in `Paper Background` (`#F3ECDD`).
  - Border: 1.5px solid `Ink` (`#1B1A17`), corner radius 2px max.
  - State: On `:hover`, subtle color shift to `#2E2C27`. On `:active`, shift position 1px down and 1px right.
- **Secondary Command (Ruled Outline)**:
  - Surface: `Paper Background` (`#F3ECDD`) or transparent.
  - Text: Uppercase `IBM Plex Mono`, `Ink` (`#1B1A17`).
  - Border: 1.5px solid `Ink` (`#1B1A17`), corner radius 2px max.
  - State: On `:hover` and `:active`, invert surface to `Ink` with `Paper Background` text.
- **Destructive Command**:
  - Bordered with 1.5px solid `Margin Red` (`#C2473A`), text in `Margin Red`. On press, inverts to solid `Margin Red` background with `Paper Background` text.

### Form Inputs & Entry Fields
- **Underline-Only Styling**: Inputs reject enclosed boxes. Form fields consist of a single bottom border: 1.5px solid `Ink` (`#1B1A17`).
- **Surface**: Completely transparent, revealing the underlying paper shade.
- **Labeling**: Placed strictly above the entry line in uppercase `IBM Plex Mono` (12px, letter-spacing: 0.06em, `Muted Ink` `#6B655A`).
- **Focus State**: The bottom rule thickens to 2px solid `Ink`, or shifts to 1.5px solid `Margin Red` for errors. No blue outlines or glowing halos.

### Tabular Ledger Records
- **Structure**: Ruled table rows with fixed 40px height. Alternating rows may alternate subtly between `Paper Background` and `Paper Shade`.
- **Divider Lines**: Every horizontal row separator is 1px solid `Ledger Rule` (`#CBD5CF`).
- **Summary / Totals Rows**: Double bottom border consisting of two parallel 1px solid `Ink` rules spaced 2px apart (traditional accounting balance notation).
- **Alignment**: Numerical debit/credit figures must be set in `IBM Plex Mono`, right-aligned, with matching decimal positions.

### Rubber Verification Stamps
- **Visual Presentation**: Framed rectangular stamps angled slightly at `-6deg` (or `+6deg` variant).
- **Structure**: 2px solid ink border enclosing bold, uppercase `IBM Plex Mono` lettering with wide letter-spacing (`0.14em`).
- **Stamping Modes**:
  - **Settled / Verified**: 2px solid border in `Paid Green` (`#2F6B4F`), label reads "PAID", "POSTED", or "BALANCED".
  - **Overdue / Rectification**: 2px solid border in `Margin Red` (`#C2473A`), label reads "OVERDUE", "AUDIT DEFICIT", or "VOID".

### Checkboxes & Selection Controls
- **Checkboxes**: Precise 14px by 14px square (`border-radius: 0px`), 1.5px solid `Ink` outline, transparent fill. Checked state displays a solid hand-drawn diagonal hatch or an ink block fill (`#1B1A17`).
- **Radio Buttons**: Small 14px square boxes set on a 45-degree angle (diamond shape) or square outer with a solid center square to avoid modern circular radio semantics.

### Cards & Folio Sheets
- Base cards use `Paper Shade` (`#EAE1CD`) bounded by a continuous 1.5px solid `Ink` line.
- Corners are strictly 0px to 2px.
- Internal card headers are separated from card bodies by a 1px solid `Ledger Rule` or 1.5px `Ink` divider line.