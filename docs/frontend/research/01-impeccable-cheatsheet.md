# Impeccable Style — Deep Research Cheat Sheet

> Source research compiled from impeccable.style and the open-source skill repo `pbakaus/impeccable` (Apache-2.0). Direct site fetch was blocked by an SSL cert error in this sandbox, but the canonical content lives in the repo's `skill/SKILL.md`, the seven `skill/reference/*.md` files, and the project README — all retrieved successfully. Author: Paul Bakaus.

---

## 1. Core Design Philosophy (one paragraph)

Impeccable is built on the premise that **AI-generated UIs all look the same** because every model was trained on the same SaaS templates — "Inter for everything, purple-to-blue gradients, cards nested in cards, gray text on colored backgrounds, the rounded-square icon tile above every heading." The cure is not more rules but a **shared design vocabulary** between human and AI: *direction* words like "quieter," "bolder," "distill," "delight" instead of just descriptors like "16px/1.5." The skill enforces a **setup-first, skip-nothing** flow — gather product context (PRODUCT.md + DESIGN.md), pick the **register** (brand-as-product vs. product-serves-product), load the relevant domain reference, **shape before building**, and only then mutate code. It also splits design into two contradictory worlds: marketing/portfolio/editorial work where design *is* the product, and app/dashboard/tool work where design *serves* the product. Same vocabulary, different defaults.

---

## 2. The 15 Concrete Rules (one-liners to put on the wall)

1. **Pick a color strategy before picking colors** — Restrained, Committed, Full palette, or Drenched.
2. **Use OKLCH, never HSL** — equal lightness steps actually look equal.
3. **Never `#000` or `#fff`** — tint every neutral toward the brand hue (chroma 0.005–0.015).
4. **Hierarchy through contrast, not count** — fewer sizes, bigger jumps; ≥1.25× ratio between steps.
5. **Cap measure at 65–75 characters** — use the `ch` unit.
6. **Cards are a privilege, not a default** — and *never* nest them.
7. **One accent color, used rarely** — 60-30-10; "accent colors work *because* they're rare."
8. **Build mobile-first; three breakpoints suffice** — 640 / 768 / 1024 px (or fluid `clamp()`).
9. **Use `gap`, not margin** — sidesteps margin collapse and keeps rhythm.
10. **Animate transform & opacity only** — never `width/height/top/left`.
11. **Exit animations are ~75 % of entry duration** — use ease-out for entries, ease-in for exits.
12. **Skip bounce/elastic easing** — it reads as dated; prefer quart/quint/expo curves.
13. **Placeholders are not labels** — pair every input with a real `<label>`; validate on blur.
14. **Replace confirmations with undo** — except for irreversible destructive actions.
15. **Buttons name the outcome** — "Save changes," not "Submit"; "Delete 5 items," not "Remove."
16. **Respect `prefers-reduced-motion`** — ~35 % of adults over 40 have a vestibular sensitivity.
17. **Apply the squint test** — blur the screen; if hierarchy doesn't survive, it isn't there.
18. **Run the AI Slop Test** — if domain alone predicts your palette ("observability = dark blue"), restart.

---

## 3. Typography System

- **Vertical rhythm baseline**: 16 px body × 1.5 line-height = 24 px unit; all vertical spacing is a multiple of 24.
- **Five-tier scale**: xs 0.75 rem (captions) · sm 0.875 rem (secondary) · base 1 rem (body) · lg 1.25–1.5 rem (subheads) · xl+ 2–4 rem (headlines). Scaling ratios: 1.25, 1.333, or 1.5.
- **Pairing**: one family with multiple weights usually beats two competing typefaces. If pairing, contrast on multiple axes (serif vs. sans, geometric vs. humanist, condensed vs. wide).
- **Light-on-dark needs compensation on three axes**: +0.05–0.10 line-height, +0.01–0.02 em letter-spacing, optionally heavier weight.
- **Web fonts**: `font-display: swap`; match fallback metrics with `size-adjust`, `ascent-override`, `descent-override`, `line-gap-override` (Fontaine automates this). Preload only critical weights; variable fonts pay off at 3+ weights.
- **Fluid type**: `clamp()` for marketing pages; fixed rem scales for app UIs needing predictability. Keep `max ≤ 2.5× min`.
- **OpenType polish**: `tabular-nums` in tables, `diagonal-fractions` in recipes, `all-small-caps` for abbreviations, disable ligatures in code.
- **Rendering polish**: `text-wrap: balance` for headings, `text-wrap: pretty` for prose; 5–12 % letter-spacing on ALL CAPS labels.
- **Anti-reflexes to resist**: technical briefs don't need serifs "for warmth"; premium ≠ trendy serif; children's products don't need rounded display fonts; "modern" ≠ geometric sans.
- **Accessibility**: never `user-scalable=no`; rem/em sizing; minimum 16 px body; 44 px+ touch targets for text links.

---

## 4. Color System

- **Color space**: OKLCH only. Reduce chroma as lightness approaches 0 or 100 (high chroma at extremes looks garish).
- **Tinted neutrals**: pure gray is dead. Add 0.005–0.015 chroma in the brand hue direction — even cool brands shouldn't default to a warm gray.
- **Palette roles**: primary (brand) · neutral (9–11 shades) · semantic (success/error/warning/info) · surface (elevation). "Skip secondary/tertiary unless you need them. Most apps work fine with one accent color."
- **60-30-10**: 60 % neutral, 30 % secondary surface, 10 % accent. Overuse kills accent power.
- **Strategy choices** (pick before swatches): **Restrained** (mostly neutral + one accent), **Committed** (two-three brand colors used confidently), **Full palette** (semantic + extended), **Drenched** (one hue saturating the whole UI).
- **Contrast**: WCAG AA — 4.5:1 body, 3:1 components. Avoid light gray on white, gray on color, red/green-only signals.
- **Dark mode is not an inversion**: lighter surfaces = depth (instead of shadows); desaturate accents slightly; vary lightness only — keep hue and chroma stable.
- **Theme decision rule**: write a physical-scene sentence first — "who, where, light, mood" — keep rewriting until it forces dark or light.

---

## 5. Spacing, Density & Rhythm

- **4 pt base unit, not 8 pt** → scale: 4, 8, 12, 16, 24, 32, 48, 64, 96. The granularity prevents awkward gaps.
- **Semantic tokens**: `--space-sm`, `--space-lg` (relational), not literal pixel names.
- **Always `gap` for sibling spacing** — avoids margin collapse.
- **Self-adjusting grids**: `repeat(auto-fit, minmax(280px, 1fr))` for fluid layouts without breakpoints.
- **Hierarchy uses 2–3 dimensions at once**: size (≥3:1 ratio), weight, color contrast, position (top/left win), surrounding whitespace.
- **Container queries** instead of viewport queries for truly modular components.
- **Optical refinements** beat mathematical centering — negative margins to fix letterform whitespace, directional shifts to centre icons.
- **Touch targets ≥ 44 px** — use `::before` pseudo-elements to expand the hit area without bloating visuals.

---

## 6. Motion

- **100/300/500 rule**:
  - 100–150 ms — instant feedback (button press, toggle)
  - 200–300 ms — state changes (menus, tooltips)
  - 300–500 ms — layout shifts (accordions, modals)
  - 500–800 ms — entrance animations
- **Exit ≈ 75 % of entry duration.**
- **Easing by motion type**: ease-out for entries, ease-in for exits, ease-in-out for toggles. Generic `ease` is banned.
- **Prefer exponential curves** (quart/quint/expo) — they "mimic real physics."
- **No bounce, no elastic, no spring-as-decoration.**
- **Material is allowed** (blur, backdrop-filter, clip-path, shadows, filters) — but never animate layout-driving properties.
- **80 ms = the "feels instant" threshold.** Use optimistic UI to push perception below it.
- **`prefers-reduced-motion` is mandatory.** Keep functional animations (spinners, progress) but kill spatial motion.

---

## 7. Interaction

- **Eight states per element**: default, hover, focus, active, disabled, loading, error, success. Hover and focus are *different experiences* — design both.
- **Never remove focus indicators without replacement.** Use `:focus-visible` so only keyboard users see the ring; 2–3 px thickness, 3:1 contrast minimum, offset from the element.
- **Forms**: visible labels (placeholders disappear), validate on blur, error message goes *below* the field.
- **Use the platform**: native `<dialog>` for modals (auto focus-trap), Popover API to escape z-index hell, CSS Anchor Positioning (Chrome 125+) for tooltips/menus that flip on overflow.
- **Dropdown clipping bug** is a top-tier mistake — fix with `position: fixed`, the `popover` attribute, or a portal.
- **Undo > confirm** for routine deletes.
- **Keyboard nav**: roving tabindex for grouped components; provide skip links.
- **Gestures need fallbacks** — swipe-to-delete must have a visible button or onboarding hint.

---

## 8. Responsive

- **Mobile-first with `min-width` queries.**
- **Three content-driven breakpoints (640 / 768 / 1024)** or fully fluid via `clamp()`.
- **Detect input method, not screen size**: `@media (pointer: coarse)`, `@media (hover: hover)`. Never depend on hover for functionality.
- **Safe areas**: `env(safe-area-inset-*)` + `viewport-fit=cover`.
- **Responsive images**: `srcset` with width descriptors; `<picture>` for art-directed crops.
- **Test on real devices** — emulators miss touch latency, perf, and rendering quirks.
- **Avoid**: desktop-first, device-detection over feature-detection, separate mobile codebases.

---

## 9. UX Writing

- **Buttons name the outcome**: "Save changes," "Create account," "Delete 5 items."
- **Errors follow what / why / how-to-fix**: `"[Field] needs to be [format]. Example: [example]"` — never "Invalid input."
- **Empty states are onboarding**: acknowledge → explain value → next step. "No projects yet. Create your first one to get started."
- **Voice constant, tone contextual**: celebrate on success, empathise on error, never humour when frustrated, serious for irreversibles.
- **Link text stands alone** ("View pricing plans"), alt text describes content not mechanics ("Revenue increased 40 % in Q4").
- **Localisation room**: German +30 % width, Chinese fewer characters but similar width.
- **One word per concept** — pick "Delete" or "Remove," "Settings" or "Preferences," and keep a glossary.

---

## 10. Anti-AI-Slop Markers (Absolute Bans)

These are the dead giveaways the detector flags, lifted straight from `SKILL.md`:

- **Side-stripe borders** — coloured `border-left` / `border-right` panels.
- **Gradient text** via `background-clip: text`.
- **Purple-to-blue / pink-to-violet gradients** as backgrounds.
- **Glassmorphism as default decoration.**
- **The hero-metric template** — giant number + label + three stats + gradient.
- **Identical card grids** — every section a 3-up of equal cards.
- **Cards nested inside cards.**
- **Rounded-square icon tile above every heading** ("Lucide-in-a-box").
- **Inter for everything** — and likewise system-default-only typography.
- **Gray text on coloured backgrounds.**
- **Italic-serif display heroes** (Fraunces, Recoleta, Newsreader, Playfair, Cormorant, Tiempos as primary h1) — except true editorial.
- **Hero eyebrow chips** — uppercase letter-spaced label / pill above an h1.
- **Bounce / elastic easing.**
- **Dark glow drop-shadows** on cards.
- **Modal as first-choice interaction.**
- **Em dashes in copy.** *(Yes, really — the skill explicitly bans them as an AI tell.)*
- **First-order slop**: domain alone predicts the palette ("fintech = navy + emerald," "AI tool = purple gradient," "observability = dark blue + orange").
- **Second-order slop**: domain + anti-references still predicts the aesthetic family.

---

## 11. Prompts / Skills You Can Lift Directly

The 23 commands form the vocabulary. Keep this list as a prompt menu:

| Phase | Command | Purpose |
|---|---|---|
| Build | `/impeccable craft` | Full shape → build with visual iteration |
| Build | `/impeccable shape` | Plan UX/UI before any code |
| Build | `/impeccable teach` | One-time setup; writes PRODUCT.md + DESIGN.md |
| Build | `/impeccable document` | Generate DESIGN.md from existing code |
| Build | `/impeccable extract` | Pull reusable components/tokens into the system |
| Evaluate | `/impeccable critique` | UX review — hierarchy, clarity, emotional resonance |
| Evaluate | `/impeccable audit` | Technical: a11y, perf, responsive |
| Refine | `/impeccable polish` | Final pass before ship |
| Refine | `/impeccable bolder` | Amplify boring designs |
| Refine | `/impeccable quieter` | Tone down overly bold designs |
| Refine | `/impeccable distill` | Strip to essence |
| Refine | `/impeccable harden` | Errors, i18n, overflow, edge cases |
| Refine | `/impeccable onboard` | First-run flows, empty states |
| Enhance | `/impeccable animate` | Add purposeful motion |
| Enhance | `/impeccable colorize` | Strategic color introduction |
| Enhance | `/impeccable typeset` | Fix font, hierarchy, sizing |
| Enhance | `/impeccable layout` | Fix layout, spacing, rhythm |
| Enhance | `/impeccable delight` | Moments of joy |
| Enhance | `/impeccable overdrive` | Technically extraordinary effects |
| Fix | `/impeccable clarify` | Improve unclear copy |
| Fix | `/impeccable adapt` | Different devices |
| Fix | `/impeccable optimize` | Performance |
| Iterate | `/impeccable live` | Variant mode, in-browser iteration |

The flow `teach → shape → craft → critique → audit → polish` is the canonical pipeline.

### Lift-able prompt template (the workflow itself)

```
1. Gather context: read PRODUCT.md and DESIGN.md.
2. Identify register: brand (design IS the product) or product (design SERVES the product).
3. Load relevant domain reference (typography / color / motion / spatial / interaction / responsive / ux-writing).
4. Shape: describe the UX/visuals in words, get sign-off.
5. Visual probe: produce a quick mock or document why you skipped one.
6. Preflight: declare which files you'll touch and why.
7. Apply shared laws + register defaults; mutate code.
8. Run the AI Slop Test (first- and second-order).
9. Run /audit (a11y, perf, responsive) and /critique (hierarchy, clarity, resonance).
10. /polish before ship.
```

---

## 12. Tooling, Fonts & Components It Recommends

- **Color**: OKLCH. Tools: oklch.com or culori.js for palette generation.
- **Fonts**: system stacks are explicitly defended ("system fonts are underrated"). When custom, use variable fonts for 3+ weights; avoid Inter as default; resist trendy display serifs as the hero.
- **Font loading**: `font-display: swap` + `size-adjust` / `ascent-override` / `descent-override` / `line-gap-override`. **Fontaine** is named for automating this.
- **Layout**: CSS Grid (`auto-fit` + `minmax`), `gap`, container queries.
- **Modals & overlays**: native `<dialog>`, the **Popover API**, **CSS Anchor Positioning** (Chrome 125+). React/Vue portals when none are available.
- **Tokens**: 4 pt spacing scale, semantic names; Style-Dictionary or Tailwind's `theme.extend` are good carriers.
- **Detector**: `npx impeccable detect <path|url>` — runs 27 deterministic anti-pattern rules (no LLM, no API key) plus a 12-rule LLM critique pass.
- **Live mode**: `/impeccable live` — variants are written directly to source, "accept = write." No canvas, no handoff.

---

## 13. Apply It to a University LMS Frontend

Mapping the philosophy onto EduLearn's product surface:

- **Register = product** (LMS serves the user) → defaults to restrained color, dense info hierarchy, calm motion.
- **Color**: pick a tinted neutral aligned with the EduLearn brand hue (chroma 0.005–0.015). One accent color for primary actions (Enroll, Submit, Pay). Reserve semantic palette strictly for success/error/warning/info.
- **Typography**: 16 px base, 1.5 line-height, 24 px rhythm. Five-tier scale. **Tabular numerals** for grades, fees, GPA, schedules. Avoid Inter as the only choice — pair a humanist sans (Source Sans 3, IBM Plex, Geist) with a serif only if editorial pages exist.
- **Layout**: dashboards use `gap` + grid, no nested cards. The transcript, gradebook, and timetable should be tables (with `tabular-nums`), not card grids.
- **Forms** (course enrolment, fee payment, applicant submission): real labels above inputs, validate on blur, errors below in the what/why/how format. Replace confirmation dialogs with undo where reversible.
- **Motion**: 100–300 ms on tabs, dropdowns, toasts; ease-out enters / ease-in exits; quart curves; honour `prefers-reduced-motion` (critical for accessibility-mandated higher-ed software).
- **Responsive**: mobile-first; the student-facing surface (assignments, notifications, submissions) must work on coarse pointers.
- **Anti-slop guardrails for the LMS**: no purple gradient hero, no glassmorphism panels, no rounded-square icon tiles above each section heading, no "hero metric" boxes for GPA/CGPA, no card-in-card on the dashboard.

---

## Sources

- [impeccable.style](https://impeccable.style/) — landing page (homepage fetch blocked by SSL in sandbox; content cross-referenced via repo).
- [github.com/pbakaus/impeccable — README.md](https://github.com/pbakaus/impeccable/blob/main/README.md)
- [skill/SKILL.md](https://github.com/pbakaus/impeccable/blob/main/skill/SKILL.md) — philosophy, shared laws, absolute bans, AI Slop Test
- [skill/reference/typography.md](https://github.com/pbakaus/impeccable/blob/main/skill/reference/typography.md)
- [skill/reference/color-and-contrast.md](https://github.com/pbakaus/impeccable/blob/main/skill/reference/color-and-contrast.md)
- [skill/reference/spatial-design.md](https://github.com/pbakaus/impeccable/blob/main/skill/reference/spatial-design.md)
- [skill/reference/motion-design.md](https://github.com/pbakaus/impeccable/blob/main/skill/reference/motion-design.md)
- [skill/reference/interaction-design.md](https://github.com/pbakaus/impeccable/blob/main/skill/reference/interaction-design.md)
- [skill/reference/responsive-design.md](https://github.com/pbakaus/impeccable/blob/main/skill/reference/responsive-design.md)
- [skill/reference/ux-writing.md](https://github.com/pbakaus/impeccable/blob/main/skill/reference/ux-writing.md)
- [DeepWiki: pbakaus/impeccable](https://deepwiki.com/pbakaus/impeccable)

> Note: direct WebFetch on `impeccable.style` and `github.com` HTML pages returned `unable to get local issuer certificate` from this sandbox. The substantive content was retrieved via `raw.githubusercontent.com` (which served fine) and via WebSearch summarization for the homepage marketing copy. No page was paywalled or gated; only the corporate-network SSL chain blocked HTTPS to two hosts.
