# Shape Brief 01 — App Shell + Learner Dashboard

**Phase:** Mid-fi design brief (impeccable shape).
**Generated:** 2026-05-07 via impeccable shape interview (3 rounds).
**Visual probes:** Skipped — this Claude Code harness lacks native image generation.
**Status:** Awaiting user confirmation before craft / implementation.

---

## 1. Feature Summary

The **App Shell** is the persistent chrome wrapping every authenticated route in EduLearn — left navigation rail, top bar, route container, and the four-persona navigation grammar (Learner / Educator / Operations / Governance) that maps the seven backend roles to four capability personas. The **Learner Dashboard** is the densest variant of that shell: the landing surface a Student sees on login, designed to answer "what needs my attention right now?" within 5 seconds of first paint.

This brief covers both surfaces together because the shell can't be designed without a real dashboard to stress-test it, and the dashboard can't be polished without the shell that contains it.

## 2. Primary User Action

Two audiences, two intents — both must be satisfied:

- **Evaluator (laptop, 10-min demo):** recognise this as a real institutional product within 5 seconds. No "default React + Bootstrap template" tells. Differentiation comes from restraint, density, and the visible architectural decision (4 personas, persona switcher).
- **Simulated Student (the narrative the design tells):** find "am I about to fail something?" within 5 seconds, with one click to a next action per item.

Both intents resolve to the same design move: **"Action required" surfaces immediately above fold, with outcome-named CTAs.**

## 3. Design Direction

**Register:** product (per PRODUCT.md).

**Color strategy:** Restrained. ~90% tinted-neutral surfaces, ~10% accent.

**Brand hue:** Deep forest green — `OKLCH(42%, 0.10, 145)` ≈ `#1f4d2c`. Used for: primary CTAs, active nav, focus rings, KPI accent values. Rare by definition.

**Neutrals:** Warm cream ramp tinted toward H 75 at chroma 0.008 (12 steps). Surfaces: `--surface-page` (lightest), `--surface-elevated` (cards, modals), `--surface-pressed` (input fields).

**Semantic:** success / warn / danger / info — each pairs icon + label, never color alone.

**Theme:** Light by default. Dark mode = v2 milestone; tokens reserve namespace.

**Typography:** IBM Plex Sans (display + body) + IBM Plex Mono (course codes, student IDs, currency, GPAs). 5-tier scale, 24px vertical rhythm, `font-variant-numeric: tabular-nums` on every numeric.

**Scene sentence (locks light/dark):** "A 20-year-old Krea student opens EduLearn at 11am between lectures on a laptop in a sunlit reading room; an instructor opens it at 4pm in their office under warm lamp light; a registrar opens it at 10am at a desk under fluorescent overhead." All three demand light mode.

**Anchor references:**
- Institutional voice: **Ashoka, Krea, Plaksha** (modern Indian liberal-arts).
- Product craft: **Linear** (restraint), **Notion** (content-first hierarchy), **Stripe Dashboard** (institutional trust through minimal chrome).

**Anti-references:** Moodle, Ellucian Banner / SAP Campus, Indian school ERP portals, Blackboard / Canvas. Plus the 18-pattern AI-slop checklist in `docs/frontend/research/04-anti-ai-slop-checklist.md`.

## 4. Scope

| Aspect | Decision |
|---|---|
| **Fidelity** | Mid-fi spec — detailed wireframe + token decisions; no pixel-perfect mock |
| **Breadth** | App shell (all 4 personas) + Learner Dashboard fully detailed |
| **Interactivity** | All 8 interaction states designed for every interactive element |
| **Time intent** | Polish-until-it-ships for shell + Learner; deltas to follow at the same polish target |
| **Other dashboards** | Educator / Operations / Governance designed in subsequent shape passes (lighter — they inherit the shell pattern) |

## 5. Layout Strategy

### Desktop (≥1024px)

```
+------+----------------------------------------------------+
|      | Top bar (56px)                                     |
|  R   |  Logo  | Persona [ITAdmin only]    | Bell | Avatar |
|  A   +----------------------------------------------------+
|  I   |                                                    |
|  L   |  Main canvas                                       |
|      |  max-width 1200px, centered, 24px gutters          |
|      |                                                    |
|240px |                                                    |
+------+----------------------------------------------------+
```

**Left rail (240px):** brand mark at top, 8 nav items below, profile/help pinned at bottom. Each nav item: 16px icon + 14px label. Active state: 2px forest-green left edge bar + brand-tint background at 8% opacity. NEVER full side-stripe border.

**Top bar (56px):** stays consistent across breakpoints. Brand-mark + cmd+/ shortcut hint (deferred from cmd+K palette). Persona switcher only renders for ITAdmin role.

### Tablet (768–1023px)

Left rail collapses to 64px icon-only. Labels reveal on hover/focus via popover (no layout shift).

### Mobile (<768px)

Left rail hidden behind hamburger trigger (top-left). Top bar simplifies to logo + bell + avatar. Hamburger opens slide-in drawer (Bootstrap Offcanvas) showing full nav (icon + label).

### Learner Dashboard layout

```
+--------------------------------------------------+
|  Welcome back, Aarav                             |  <- display tier
|  Fall 2026  .  GPA 3.4  .  9 / 16 credits       |  <- caption tier,
|             .  Attendance 92%                    |     mono on numbers
+--------------------------------------------------+
|                                                  |
|  Action required (3)                             |
|  +--------------------------------------------+  |
|  |  Tuition invoice 3 days overdue          > |  |
|  |  [Pay  Rs 52,000]                          |  |
|  +--------------------------------------------+  |
|  |  Feedback on Algorithms PSet 4 ready     > |  |
|  |  [View feedback]                           |  |
|  +--------------------------------------------+  |
|  |  Academic-integrity review                 |  |
|  |  [Open case]                               |  |
|  +--------------------------------------------+  |
|                                                  |
|  Up next (next 7 days)                           |
|  ----------------------------------------------  |
|  Tue  Quiz       CS-301 Algorithms      11:59pm |
|  Wed  Essay      PHIL-220 Ethics in AI  4:00pm  |
|  Fri  Reading    HIST-205 Modern India  9:00am  |
|                                                  |
|  My courses                                      |
|  +--------+ +--------+ +--------+                |
|  | CS-301 | | PHIL-  | | ECO-   |                |
|  | Algos  | | 220    | | 150    |                |
|  | Iyer   | | Bhatt  | | Rao    |                |
|  |  B+    | |  A-    | |  B     |                |
|  | 2h ago | |  1d    | |  3d    |                |
|  +--------+ +--------+ +--------+                |
|  +--------+                                      |
|  | HIST   |                                      |
|  | 205    |                                      |
|  +--------+                                      |
|                                                  |
|  Recent feedback (3)                             |
|  ----------------------------------------------  |
|  PSet 4 returned with 24/25  - 2h ago         >  |
|  Discussion reply by Prof. Iyer  - yesterday  >  |
|  Plagiarism review opened  - 3 days ago       >  |
|                                                  |
+--------------------------------------------------+
```

**Hierarchy:** "Action required" is the highest-priority block — only renders if there are items; collapses to 0 height when empty (no "All clear!" placeholder, per impeccable rule on patronising copy). "Up next" is a dense list (rows, not cards). "My courses" is a card grid (3 cols, 1 col mobile). "Recent feedback" is a row list.

**Below fold:** notifications expansion, term progress (credit hours completed vs required), upcoming finance deadlines.

## 6. Key States

### Dashboard states

| State | What renders | Copy |
|---|---|---|
| **Default (typical, has data)** | All four blocks visible; 3-6 courses; 0-3 action items; 3-7 upcoming; 3 recent feedbacks | Standard data labels |
| **Empty (new student, no enrollments yet)** | "Action required" hidden. "Up next" hidden. "My courses" shows onboarding card. | "Welcome to EduLearn. Once you enrol in courses for Fall 2026, they'll appear here. [Browse course catalogue]" |
| **Loading (first paint, API in-flight)** | Skeleton cards preserving 24px rhythm. No spinner. Shimmer respects prefers-reduced-motion. | n/a |
| **Error (API failure, network)** | Top action bar shows persistent error band. Cards render last-known-good data with "stale" indicator if cached. | "We couldn't refresh your dashboard. Showing data from 3 minutes ago. [Refresh]" |
| **First-run (just MFA'd, first dashboard view)** | All blocks visible; tour-cue tooltip on persona switcher (if ITAdmin) and bell icon. Dismissible. State persisted in `localStorage.firstRunDashboardSeen` (not sessionStorage — must survive tab close so tour does not re-show on next login). | "Welcome to EduLearn. Tap the bell anytime to see notifications." |
| **Long content (extreme realistic data)** | 12 courses (overflow), 8 action items, 15 upcoming. Each block scrolls within max-height; "Show all (n)" link reveals full list inline. | Standard |

### Shell states

| State | Behavior |
|---|---|
| **Default** | All chrome rendered, persona = current user role's persona |
| **Persona switching (ITAdmin only)** | Click switcher → dropdown of 4 personas → select → rail repaints + redirects to selected persona's default route. Animation: 300ms fade. |
| **Notification dropdown open** | Click bell → dropdown of last 10 notifications with unread highlighted. Click notification → marks read + navigates. "Mark all read" at top. |
| **Mobile drawer open** | Hamburger taps → drawer slides in from left (300ms exponential ease-out). Backdrop dims at 40% opacity. |
| **Reduced motion** | All transforms killed; opacity transitions kept at 100ms. |

## 7. Interaction Model

### Keyboard

- `Tab` cycles through interactive elements in DOM order; `Shift+Tab` reverses.
- `Escape` closes any open dropdown/drawer/modal.
- `:focus-visible` ring (2px forest green, 2px offset) renders only on keyboard navigation, not mouse click.
- No app-level shortcuts in v1 (no Cmd+/, no g-prefixed nav). Defer to v2.

### Touch & mouse

- All interactive targets ≥44px touch height.
- Hover state on rows: 4% brand-tint background — NOT scale transform.
- Click course card → `/courses/:id` with 300ms fade-in route transition.
- Click action item → primary action (pay, view, open) — never opens a modal; navigates or expands inline.
- Bell click → dropdown opens (does not navigate).
- Persona switcher (ITAdmin only) → dropdown of 4 personas → select repaints + navigates to persona's default route.

### Form patterns (for nested forms in course detail, MFA setup, etc.)

- Real `<label>` above input, never placeholder-as-label.
- Validate on blur, not on every keystroke.
- Error message renders below the field, what/why/fix format.
- Submit button label names the outcome ("Pay ₹52,000", not "Submit").
- Destructive actions: undo banner where reversible; confirm dialog only for irreversible (drop course, delete account).

## 8. Content Requirements

### Voice & tone (per PRODUCT.md design principles)

- Direct, precise, not chummy. Never humorous when frustrated.
- No em dashes anywhere in UI copy (impeccable AI-slop ban).
- No "🎉" / celebratory emoji on missed-deadline contexts.
- Outcome-named buttons.
- Empty states are onboarding-style, not "Nothing to show!"

### Demo seed data

| Block | Realistic content |
|---|---|
| **Welcome row** | Display: "Welcome, Aarav" on first login (check `localStorage.lastLogin`); "Welcome back, Aarav" on subsequent logins. Caption row beneath: "Fall 2026 · GPA 3.4 · 9 / 16 credits · Attendance 92%" — mono on every numeric, secondary text color, no em dashes (interpunct separators). |
| **Action required** | Tuition invoice (₹52,000, 3 days overdue) → "Pay ₹52,000". Feedback ready on Algorithms PSet 4 → "View feedback". Academic-integrity review → "Open case". |
| **Up next (7 days)** | Tue Quiz CS-301 11:59pm. Wed Essay PHIL-220 4:00pm. Fri Reading HIST-205 9:00am. Sat Section drop deadline. |
| **My courses** | CS-301 Algorithms (Prof. Iyer, B+, 2h ago). PHIL-220 Ethics in AI (Prof. Bhatt, A-, 1d ago). ECO-150 Microeconomics (Prof. Rao, B, 3d ago). HIST-205 Modern India (Prof. Khan, A, 1w ago). |
| **Recent feedback** | "PSet 4 returned with 24/25 — 2h ago." "Discussion reply by Prof. Iyer — yesterday." "Plagiarism review opened — 3 days ago." |

### Empty-state copy

- No enrollments: "Welcome to EduLearn. Once you enrol in courses for Fall 2026, they'll appear here. [Browse course catalogue]"
- No notifications: "You're all caught up." (single line, not jokey)
- No upcoming items: "Nothing due this week." (single line)
- No recent feedback: hide the block entirely (no placeholder)

### Error-state copy

- Dashboard load fail: "We couldn't refresh your dashboard. Showing data from 3 minutes ago. [Refresh]"
- Network down: "You're offline. We'll reconnect when you're back."
- Unauthorized: redirect to /login with toast: "Your session expired. Please sign in again."

## 9. Recommended References (for craft phase)

| Reference | Why |
|---|---|
| `spatial-design.md` | Every layout decision — 4pt grid, gap-not-margin, auto-fit grids |
| `typography.md` | IBM Plex pairing, 5-tier scale, tabular-nums, OpenType features |
| `color-and-contrast.md` | OKLCH neutrals, semantic palette, WCAG AA validation |
| `interaction-design.md` | 8 states per element, focus-visible, dropdown patterns |
| `motion-design.md` | 100/300/500 tiers, exit at 75%, exponential easing only |
| `responsive-design.md` | 240/64/hamburger collapse, container queries for cards |
| `ux-writing.md` | Outcome-named buttons, empty/error copy, tone discipline |

## 10. Locked Decisions (resolved 2026-05-07)

| # | Decision | Locked answer |
|---|---|---|
| 1 | Welcome row | Display: "Welcome back, {firstName}". Caption row beneath: "Term · GPA · Credits · Attendance" with interpunct separators and mono on numerics. GPA visible on dashboard but de-emphasized typographically (caption tier, secondary color). |
| 2 | Action-required ordering | Hybrid severity-bucketed: **Critical** (plagiarism flag, account suspension) → **Action needed** (overdue invoice, ungraded feedback) → **Reminder** (upcoming-but-not-due). Time-sorted within each bucket. |
| 3 | Persona switcher visibility | ITAdmin role only, in all environments. No dev-mode override. Production behavior matches model exactly. |
| 4 | Demo seed data | 50 students / 10 instructors / 20 courses (CS, PHIL, ECO, HIST) / 30 sections / 150 enrollments / 60 assessments / 400 submissions / ~15 notifications per user (~5 unread) / 12 tickets / 50 invoices. |
| 5 | Font loading | Self-host IBM Plex Sans + IBM Plex Mono in `/public/fonts/`. `@font-face` in CSS with `font-display: swap`. Open Font License (free for self-host). |
| 6 | Bell badge cap | Show "99+" when unread > 99. iOS/Gmail/Slack convention. |
| 7 | Keyboard shortcuts overlay | Skipped in v1. No Cmd+/ overlay, no g-prefixed nav shortcuts. `Esc` and `:focus-visible` only. Defer to v2. |

---

## Confirmation gate (per impeccable shape.md Phase 2)

This brief is **not yet confirmed**. The user must explicitly approve before craft begins.

If approved, the next steps in order:
1. Save this brief to git (feature branch).
2. Move to Step 3 of the original plan: write `tokens.md` and `_tokens.scss` with the locked decisions.
3. Move to Step 4: write `component-map.md`.
4. Move to Step 5: write IA / routes / role-nav using the 4-persona model.
5. Move to Step 6: write per-page specs starting with this dashboard.

If revisions needed, identify which section, and we re-shape that part only.
