# Design

## Register

product

## Theme

Light by default. Tinted neutrals on a deep-green/teal brand axis. Dark mode = v2 milestone (not designed in v1; tokens reserve space).

Scene sentence (per impeccable): *"A 20-year-old liberal-arts student opens EduLearn at 11am between lectures, on a phone in bright sunlight, glancing at deadlines; an instructor opens it at 4pm in their office under warm lamp light, grading a stack of essays; a registrar opens it at 10am at a desk under fluorescent overhead, triaging the applicant queue."* All three contexts demand light mode.

## Color Strategy

**Restrained.** ~90% tinted-neutral surfaces, ~10% accent reserved for primary CTAs and active nav. Accent earns its place by being rare.

## Color Tokens (provisional — finalized after visual probes)

OKLCH-first; ported to hex for Bootstrap Sass.

- **Brand axis (primary accent):** deep green or muted teal, OKLCH(L 38–48%, C 0.08–0.12, H 160–180). Final hue picked after Step 3 of the plan.
- **Neutrals:** 12-step ramp tinted toward brand hue (chroma 0.005–0.015). Never pure `#000` or `#fff`.
- **Surfaces:** 3 tiers — page background (lightest), elevated (cards, modals), pressed (input fields).
- **Semantic:** success / warn / danger / info — distinct hues, never overlapping with brand. Each pairs an icon with a label (color-only signaling banned per a11y).
- **Dark mode:** v2 — palette will be rebuilt top-down, not inverted; reduce chroma ~25%, raise L of accent.

## Typography

- **Body candidates** (decided after probe): Geist, IBM Plex Sans, or Source Sans 3. **Inter banned** as primary per impeccable AI-slop rule.
- **Heading:** same family, weight contrast preferred over family contrast.
- **Scale:** 5 tiers — caption (0.75rem) / secondary (0.875rem) / body (1rem) / subhead (1.25–1.5rem) / display (2–3rem). Ratio: 1.25.
- **Vertical rhythm:** 24px (1.5rem) base unit; all vertical spacing is a multiple.
- **Numerics:** every grade, GPA, fee, count, currency uses `font-variant-numeric: tabular-nums`.
- **Devanagari/Hindi fallback:** identified at v1 (not used, but layout reserves space; German +30% width rule applies to Hindi).

## Spatial

- **Base unit:** 4pt.
- **Tokens:** `--space-1=4px --space-2=8px --space-3=12px --space-4=16px --space-6=24px --space-8=32px --space-12=48px --space-16=64px --space-24=96px`.
- **Layout spacing:** `gap` only, never `margin` (margin reserved for typographic rhythm).
- **Vertical rhythm:** 24px multiples.
- **Card grid:** `repeat(auto-fit, minmax(280px, 1fr))` for fluid layouts.
- **Squint test:** if hierarchy doesn't survive blur, it isn't there.

## Motion

- **Tiers:** 100ms (micro feedback) / 300ms (panel transitions) / 500ms (page-level layout shifts).
- **Exit duration:** 75% of entry.
- **Easing:** exponential only (quart/quint/expo). Bounce, elastic, spring overshoot all banned.
- **Properties:** transform and opacity only. Layout properties (width/height/top/left) never animated.
- **`prefers-reduced-motion`:** honored on every animation. Functional motion (loading, progress, focus) preserved; spatial motion killed.

## Components

- **Primary base:** Bootstrap 5 + react-bootstrap.
- **Customized via Bootstrap Sass:** all tokens injected by overriding Bootstrap's Sass variables before compilation.
- **Custom components built where Bootstrap falls short:** Sidebar, DataTable, TimetableGrid, AsyncComboBox, Stepper, EmptyState, CommandPalette.
- **shadcn/ui:** used as visual reference only — JSX patterns lifted, classNames re-skinned with Bootstrap utilities. NOT installed.

## Interaction States (mandatory on every interactive element)

default · hover · focus-visible · active · selected · disabled · loading · error.

- Hover and focus are different experiences — design both.
- `:focus-visible` only — keyboard users see ring, mouse users don't.
- Focus ring: 2px brand accent, 2px offset, 3:1 contrast minimum.
- Forms validate on blur; error message below the field; what/why/fix copy format.

## Anti-patterns (banned)

See `docs/frontend/research/04-anti-ai-slop-checklist.md` — 18 banned patterns enforced on every surface. Specifically banned for EduLearn: side-stripe borders, gradient text, glassmorphism, hero-metric template, nested cards, rounded-square icon tiles, Inter-as-only-font, italic-serif heroes, eyebrow chips, bounce easing, dark-glow shadows, modal-first IA, em dashes in copy.

## References

For implementation, consult:
- `spatial-design.md` (every layout decision)
- `typography.md` (every type decision)
- `color-and-contrast.md` (token finalization)
- `interaction-design.md` (form-heavy surfaces)
- `motion-design.md` (when adding any animation)
- `responsive-design.md` (every breakpoint decision)
- `ux-writing.md` (every empty/error state)
