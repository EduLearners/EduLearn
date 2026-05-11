# Anti-AI-Slop Checklist — EduLearn Frontend

Run this before every design review. Zero tolerance on items marked BANNED.

## BANNED Patterns (absolute fails — fix before committing)

| # | Pattern | What to do instead |
|---|---|---|
| 1 | Side-stripe borders (`border-left` colored panels) | Use background tint at 6-8% opacity for active/selected states |
| 2 | Gradient text (`background-clip: text`) | Plain text, weight contrast, size contrast |
| 3 | Purple→blue or pink→violet background gradients | Flat tinted-neutral surfaces |
| 4 | Glassmorphism (`backdrop-filter: blur`) as chrome | Solid opaque surfaces with subtle shadow |
| 5 | Hero-metric template (giant KPI number + gradient + 3 stat tiles) | Dense data table or simple stat row, no gradient |
| 6 | Identical 3-column card grid for every section | Mix: table for grades/transcripts, list for notifications, card only for courses |
| 7 | Cards nested inside cards | One level of card maximum; use list items or table rows inside a card |
| 8 | Rounded-square icon tile above every heading (Lucide-in-a-box) | Icon inline with text, or no icon at all |
| 9 | Inter as the only typeface, no rhythm | Set a 5-tier scale, 24px rhythm; pick Geist or IBM Plex as primary |
| 10 | Gray text on colored backgrounds | Dark text on light surface OR light text on dark surface — never both mixed |
| 11 | Italic serif display heroes (Fraunces, Playfair, Cormorant) | Sans-serif heading unless editorial context explicitly calls for it |
| 12 | Eyebrow chip above h1 (uppercase letter-spaced pill/label) | Remove entirely or demote to page breadcrumb |
| 13 | Bounce / elastic easing on any animation | quart/quint/expo easing only |
| 14 | Dark glow drop-shadows on cards | `box-shadow: 0 1px 3px rgba(0,0,0,0.12)` — no colored glow |
| 15 | Modal as first-choice interaction | Use inline expand, Offcanvas, or route-change first; modal only for destructive confirms |
| 16 | Em dashes (—) in UI copy | Use a colon, comma, or rewrite the sentence |
| 17 | Pure `#000000` / `#ffffff` | Always tint toward brand hue at chroma 0.005–0.015 |
| 18 | `border-left: 4px solid $brand` nav active state | 2px left-edge bar + 8% brand tint background |

## First-Order AI Slop Test

Ask: "Does the domain alone predict this palette?"
- Fintech → navy + emerald = FAIL
- AI tool → purple gradient = FAIL
- University → blue + gold = FAIL (too literal)
- Observability → dark blue + orange = FAIL

If yes, restart the color direction.

## Second-Order AI Slop Test

Ask: "Even knowing the anti-references, does this still feel like a template?"
If yes, pick a different palette strategy entirely (Restrained → Committed → Full → Drenched).

## Required Checks Per Page

- [ ] All numbers (grades, fees, GPA, counts) use `font-variant-numeric: tabular-nums`
- [ ] Every interactive element has all 8 states designed: default, hover, focus-visible, active, selected, disabled, loading, error
- [ ] Focus rings are 2px, brand accent color, with 2px offset — visible to keyboard, hidden on click (`:focus-visible`)
- [ ] All forms: visible `<label>` above input, validate on blur, error message below field with what/why/fix format
- [ ] Empty states have onboarding copy (not "Nothing here" or "No data")
- [ ] All animations respect `prefers-reduced-motion`
- [ ] Exit animation duration is ~75% of entry duration
- [ ] No `bounce` or `elastic` easing anywhere
- [ ] Mobile-first: 640/768/1024 breakpoints, coarse pointer behavior defined
- [ ] Every destructive action has undo (not just confirm dialog) where reversible
