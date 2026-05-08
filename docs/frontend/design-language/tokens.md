# Design Tokens — EduLearn Frontend

**Status:** Locked 2026-05-07.
**Source of truth for compilation:** `_tokens.scss` (sibling file).
**Anchor:** PRODUCT.md (register, brand) + DESIGN.md (visual system) + Shape Brief 01.

This document explains the **why** behind each token. The Sass file holds the values. Implementation imports `_tokens.scss` first, then Bootstrap's `bootstrap.scss`, so token overrides cascade into Bootstrap's component styling.

---

## 1. Color

### 1.1 Color space

All color decisions are made in **OKLCH** (Oklab Lightness / Chroma / Hue), then ported to hex for legacy browser fallback. OKLCH gives perceptually uniform lightness — equal `L` steps actually look equally different to the human eye, unlike HSL.

| Browser support | Behavior |
|---|---|
| Modern (≥Chrome 111, Safari 15.4, Firefox 113) | Render `oklch()` directly via CSS custom properties |
| Older | Fall back to hex equivalents declared as Sass variables |

### 1.2 Brand hue (forest green)

Locked: **`OKLCH(42%, 0.10, 145)`** → approximate hex `#1f4d2c`.

| Step | OKLCH | Hex (approx) | Use |
|---|---|---|---|
| brand-50 | `OKLCH(95%, 0.020, 145)` | `#ecf2ec` | Hover background tint, subtle row highlight |
| brand-100 | `OKLCH(88%, 0.040, 145)` | `#cee0d2` | Active nav background tint (8% opacity feel) |
| brand-200 | `OKLCH(78%, 0.060, 145)` | `#aaccaf` | Selection states |
| brand-300 | `OKLCH(68%, 0.080, 145)` | `#82b489` | Disabled CTA |
| brand-400 | `OKLCH(55%, 0.100, 145)` | `#4f8059` | Primary CTA hover lighten |
| **brand-500** | **`OKLCH(42%, 0.100, 145)`** | **`#1f4d2c`** | **Primary CTA, focus ring, active nav bar, KPI accent** |
| brand-600 | `OKLCH(36%, 0.100, 145)` | `#173e22` | CTA pressed / active |
| brand-700 | `OKLCH(30%, 0.090, 145)` | `#10301a` | Body emphasis on brand surface |
| brand-800 | `OKLCH(22%, 0.070, 145)` | `#0a2110` | Brand surface on dark mode (v2) |
| brand-900 | `OKLCH(15%, 0.050, 145)` | `#051509` | Brand surface darkest |

**Usage rules (per impeccable Restrained strategy):**
- Brand-500 is the only color that says "this is interactive and primary" — used for primary CTAs, focus rings, active-nav indicators, KPI deltas. Never decorative.
- Brand-50/100 are background tints for hover/active states. Never as a chrome surface.
- Total brand pixels on any screen ≤ 10%. If you see more, recolor.

### 1.3 Neutrals (warm cream, tinted toward brand)

Locked tint: **chroma `0.008`, hue `75` (warm cream)**. Pure gray banned per impeccable rule.

| Step | OKLCH | Hex (approx) | Role |
|---|---|---|---|
| neutral-0 | `OKLCH(99%, 0.005, 75)` | `#fdfcfa` | Page background |
| neutral-50 | `OKLCH(97%, 0.008, 75)` | `#faf8f4` | Elevated surface (cards, modals) |
| neutral-100 | `OKLCH(94%, 0.008, 75)` | `#f4f1ec` | Pressed/input field surface |
| neutral-200 | `OKLCH(88%, 0.008, 75)` | `#e6e2d9` | Borders, dividers |
| neutral-300 | `OKLCH(78%, 0.010, 75)` | `#cec7b8` | Disabled border |
| neutral-400 | `OKLCH(65%, 0.012, 75)` | `#ada593` | Disabled text, placeholder |
| neutral-500 | `OKLCH(55%, 0.012, 75)` | `#918a78` | Icons only (not text below 18px — fails WCAG AA at small sizes) |
| neutral-600 | `OKLCH(45%, 0.015, 75)` | `#756e5d` | Caption text, metadata, secondary text — **$text-caption uses this** (5.8:1 contrast) |
| neutral-700 | `OKLCH(35%, 0.015, 75)` | `#595442` | Body text emphasis |
| **neutral-800** | **`OKLCH(25%, 0.012, 75)`** | **`#3e3a2c`** | **Body text default** |
| neutral-900 | `OKLCH(18%, 0.010, 75)` | `#2b2820` | Headings, display type |
| neutral-950 | `OKLCH(12%, 0.008, 75)` | `#1d1a16` | Deepest text emphasis |

**Why warm cream:** the brand is forest green (cool). A *cool* neutral (gray-blue) would read as "tech SaaS." A *warm* neutral pulls the palette toward the institutional/library/reading-room mood that Krea/Plaksha aim for. Cool brand + warm neutral is the signature of editorial design.

### 1.4 Semantic colors

| Token | OKLCH | Hex | Meaning | Pairs with icon |
|---|---|---|---|---|
| success-500 | `OKLCH(50%, 0.13, 165)` | `#1c7a5e` | Submission accepted, payment cleared | Check |
| warn-500 | `OKLCH(70%, 0.15, 75)` | `#b89243` | Approaching deadline, low credit | Triangle-exclamation |
| danger-500 | `OKLCH(50%, 0.18, 25)` | `#a83d29` | Overdue, plagiarism flag, account locked | Octagon-exclamation |
| info-500 | `OKLCH(55%, 0.13, 230)` | `#3a72a8` | Neutral info, system message | Info-circle |

**Rule (per PRODUCT.md a11y):** color-only signaling banned. Every status pairs an icon AND a label. The hue is reinforcement, not the signal.

**Hue separation:** success at H 165 (more teal) is deliberately offset from brand at H 145 (more green) so they don't read as the same color. Equally, warn at H 75 sits in the warm-neutral zone but with chroma 0.15 (vs neutral chroma 0.012) so it pops cleanly.

### 1.5 Surface tiers

| Token | Background | Border | Used for |
|---|---|---|---|
| `--surface-page` | `neutral-0` | none | App body background |
| `--surface-elevated` | `neutral-50` | `neutral-200` 1px | Cards, dropdowns, modals |
| `--surface-pressed` | `neutral-100` | `neutral-300` 1px | Input fields, code blocks |
| `--surface-brand` | `brand-100` | `brand-200` 1px | Active nav background, selected row |

### 1.6 Contrast verification (WCAG AA)

Computed against neutral-0 page background:

| Pair | Contrast ratio | WCAG AA |
|---|---|---|
| neutral-800 on neutral-0 | 12.4 : 1 | ✅ AAA |
| neutral-700 on neutral-0 | 8.5 : 1 | ✅ AAA |
| neutral-600 on neutral-0 | 5.8 : 1 | ✅ AA |
| neutral-500 on neutral-0 | 4.6 : 1 | ✅ AA (large body ≥18px only), ❌ small text — **do not use for text below 18px** |
| brand-500 on neutral-0 | 6.8 : 1 | ✅ AA (text + components) |
| brand-500 (text) on brand-100 | 5.4 : 1 | ✅ AA |
| white on brand-500 | 7.1 : 1 | ✅ AAA |

**Verify before ship:** run actual hex through [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/). Approximations above are mathematical; humans see slightly differently.

---

## 2. Typography

### 2.1 Font families

```scss
$font-family-sans: 'IBM Plex Sans', system-ui, -apple-system, sans-serif;
$font-family-mono: 'IBM Plex Mono', 'Cascadia Code', Menlo, monospace;
```

**Loading strategy:** self-host woff2 in `/public/fonts/`. `@font-face` with `font-display: swap`. License: SIL Open Font License (free for self-host). Weights bundled: 400, 500, 600 (regular, medium, semibold). 4 files total per family (regular + italic × 3 weights minus italic-semi-bold which we don't need).

### 2.2 Type scale (5-tier)

```
caption    0.75rem  (12px)  / 1.5  (18px)  → fine print, badges, helper text
secondary  0.875rem (14px)  / 1.43 (20px)  → table cells, metadata, labels
body       1rem     (16px)  / 1.5  (24px)  → paragraph text, base
subhead    1.25rem  (20px)  / 1.4  (28px)  → card titles, section headings
display    2rem     (32px)  / 1.15 (37px)  → page titles, hero stats
```

Ratio: 1.17 / 1.14 / 1.25 / 1.6 — not strictly modular, but each step earns its place. Fewer sizes + bigger jumps beats finer-grained scales for a data-dense product.

### 2.3 Vertical rhythm

24px rhythm. Body line-height of 24px is the anchor. Section spacing in multiples of 24px (24 / 48 / 72 / 96).

Within a single block, line-heights tighter than 24px are allowed (subheads use 28px, displays 37px). The rhythm reasserts at block boundaries.

### 2.4 Numerics — non-negotiable

Every grade, GPA, credit count, fee amount, currency, percentage, attendance, count-of-anything uses:

```css
font-variant-numeric: tabular-nums;
```

In Plex Mono usage, this is automatic. In Plex Sans, it must be explicitly applied via a utility class `.tabular` or directly in the rule.

### 2.5 OpenType features

```scss
$font-feature-defaults: "tnum" 0, "ss01" 1, "cv11" 1;
// "ss01" — alternate stylistic set 1 (single-storey 'a')
// "cv11" — character variant 11 (alternate '@' for IDs)
```

`tnum` is OFF by default; turned ON only on numeric contexts via the utility class.

### 2.6 Banned typography choices

- Inter as primary (impeccable AI-slop tell)
- Italic-serif headlines (Fraunces / Playfair / Cormorant as h1)
- Eyebrow chips (uppercase letter-spaced labels above h1)
- Thin weights (≤300) on body text — readability cost
- `font-size: 14px` on body without explicit reason — defaults to 16px

---

## 3. Spatial

### 3.1 Base unit

**4pt grid.** Every spacing token is a multiple of 4. Tokens:

```
--space-0:    0
--space-1:    4px   ( 0.25rem)
--space-2:    8px   ( 0.5rem)
--space-3:   12px   ( 0.75rem)
--space-4:   16px   ( 1rem)
--space-5:   20px   ( 1.25rem)
--space-6:   24px   ( 1.5rem)   <- vertical-rhythm anchor
--space-8:   32px   ( 2rem)
--space-10:  40px   ( 2.5rem)
--space-12:  48px   ( 3rem)     <- 2× rhythm
--space-16:  64px   ( 4rem)
--space-20:  80px   ( 5rem)
--space-24:  96px   ( 6rem)     <- 4× rhythm
```

Steps 1-6 are dense (4-24px). Steps 8-24 thin out — once you cross 24px, the next jump matters more.

### 3.2 Layout method

**Use `gap` for sibling spacing. Use `margin` only for typographic rhythm between text blocks.**

```css
/* GOOD */
.dashboard {
  display: grid;
  gap: var(--space-6);
}

/* BAD — margin-collapse trap */
.dashboard > * + * {
  margin-top: 24px;
}
```

### 3.3 Grids

```css
/* Card grid (courses on dashboard) */
.course-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--space-6);
}
```

`auto-fit` collapses empty tracks; `minmax(280px, 1fr)` lets cards reflow without breakpoint overhead.

### 3.4 Containers

```
--container-narrow:   640px   (forms, articles, transcripts)
--container-default:  1200px  (dashboards, route pages)
--container-wide:     1440px  (data tables, gradebooks)
--container-fluid:    100%    (timetable grid, full-width sections)
```

Centered with horizontal `padding: var(--space-6)` on small screens.

### 3.5 Touch targets

Minimum **44 × 44 px** for any interactive target. Use `::before` pseudo-elements to expand hit area without bloating visuals.

---

## 4. Border, Radius, Shadow

### 4.1 Border

```
--border-width: 1px       (default)
--border-color: neutral-200
```

Bootstrap default is 1px; we keep that. No 2px decorative borders. The 2px brand-edge bar on active nav is a special case implemented via `box-shadow` inset.

### 4.2 Radius

```
--radius-none: 0
--radius-sm:   4px    (badges, chips)
--radius-md:   8px    (cards, inputs, buttons)
--radius-lg:   12px   (modals, dropdowns)
--radius-pill: 9999px (status pills, rare)
```

Bootstrap defaults to 0.25rem (4px) for `.btn`, 0.375rem for cards. Override to land on 8px for buttons and cards (more institutional feel; 4px reads as "Bootstrap default" which is an AI-slop tell).

### 4.3 Shadow

Banned: dark glow shadows, colored glows, large `0 20px 50px rgba(0,0,0,0.5)` drama shadows.

```
--shadow-sm:  0 1px 2px rgba(30, 27, 22, 0.05)              (subtle elevation)
--shadow-md:  0 2px 8px rgba(30, 27, 22, 0.08)              (cards, dropdowns)
--shadow-lg:  0 8px 24px rgba(30, 27, 22, 0.10)             (modals, popovers)
--shadow-focus: 0 0 0 2px var(--brand-500)                  (focus ring proxy)
```

Shadow color is a tinted-near-black (the brand-tinted-neutral 950 stub), not pure black. Hard rule.

---

## 5. Motion

### 5.1 Duration

```
--motion-instant: 100ms   (button press, toggle, immediate feedback)
--motion-quick:   200ms   (tooltip, dropdown open)
--motion-base:    300ms   (panel transitions, route changes)
--motion-slow:    500ms   (page-level layout shifts, drawer slide-in)
```

### 5.2 Exit duration

Per impeccable rule: **exit = 75% of entry.**

```
--motion-base-exit: 225ms  (300 × 0.75)
--motion-slow-exit: 375ms  (500 × 0.75)
```

### 5.3 Easing

Exponential only. Banned: `ease`, `ease-in-out` default, bounce, elastic, spring overshoot.

```
--ease-out-expo:    cubic-bezier(0.19, 1, 0.22, 1)       (entries — feels like decel)
--ease-in-expo:     cubic-bezier(0.95, 0.05, 0.795, 0.035)  (exits — feels like accel)
--ease-in-out-expo: cubic-bezier(1, 0, 0, 1)             (toggles, reciprocal)
```

### 5.4 Properties

Animate **transform** and **opacity** only. Never `width / height / top / left / margin` — those trigger layout. Use `transform: translate*` and `transform: scale*` for spatial motion, `opacity` for fades.

### 5.5 Reduced motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

Functional motion (loading spinners, progress bars, focus rings) is preserved. Spatial motion (slide-in drawers, route fades) is killed.

---

## 6. Z-Index Scale

Named, never magic numbers:

```
--z-base:      0      (everything default)
--z-elevated:  10     (sticky table headers, sticky action bars)
--z-dropdown:  100    (dropdown menus, autocompletes)
--z-overlay:   500    (modal backdrops, drawer scrim)
--z-modal:     510    (modal content, drawer body)
--z-toast:     900    (toast queue — always on top of modals)
--z-debug:     9999   (dev tools overlay)
```

---

## 7. Breakpoints

```
$breakpoint-sm:  640px   (small tablet)
$breakpoint-md:  768px   (tablet — left rail collapses to hamburger)
$breakpoint-lg:  1024px  (small laptop — left rail icon-only)
$breakpoint-xl:  1280px  (laptop — left rail full)
$breakpoint-2xl: 1536px  (desktop — wider canvases)
```

Bootstrap defaults are close (`576 / 768 / 992 / 1200 / 1400`). We override to standard impeccable sizes. Mobile-first `min-width` queries throughout.

---

## 8. Dark Mode (v2)

Tokens reserve namespace via `data-theme="dark"` attribute on `<html>`. v1 ships light only; v2 will:
- Rebuild the neutral ramp top-down (not invert)
- Reduce chroma ~25%
- Raise brand-500 lightness from L 42% to L 55% (so it pops on dark surfaces)
- Reverse surface tier semantics (page = darkest, elevated = lighter)

Don't author dark-mode CSS in v1. Just leave the variables behind a selector that doesn't activate.

---

## 9. Implementation handoff

When the build phase begins (separate plan), implementation imports tokens before Bootstrap:

```scss
// styles/main.scss
@import "tokens";              // our locked tokens
@import "bootstrap-overrides"; // our Bootstrap variable overrides (uses tokens)
@import "../node_modules/bootstrap/scss/bootstrap";
@import "components";          // our custom components (Sidebar, DataTable, etc.)
```

Bootstrap's `$primary`, `$body-bg`, `$body-color`, `$font-family-base`, `$border-radius`, etc. all get overridden in `bootstrap-overrides.scss` to reference our token variables. After compilation, every Bootstrap component (`.btn-primary`, `.card`, `.form-control`, `.nav-link`) inherits our brand without per-component restyling.
