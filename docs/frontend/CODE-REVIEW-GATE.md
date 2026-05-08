# Code Review Gate — Frontend PRs

Reviewers: complete this gate before approving any frontend PR. Post the completed checklist as a PR comment. A PR with an incomplete gate review must not be merged.

---

## Step 1: Read the spec (2 min)

Open the page spec linked in the PR description (`docs/frontend/pages/<page>.md`). Read sections: Layout, States, A11y, Implementation notes.

If the PR description does not link a spec, **request changes** immediately.

---

## Step 2: Visual conformance check

Compare the PR screenshot to the spec's layout section.

- [ ] Page h1 matches spec
- [ ] Section order matches spec (blocks appear in the specified top-to-bottom sequence)
- [ ] No extra sections or blocks not in the spec
- [ ] Card/table layout matches spec (e.g. DataTable vs card grid — do not swap these)
- [ ] Loading skeleton visible in screenshot (not a spinner)

---

## Step 3: Token conformance

Run in the repo root — must return 0 hits:

```bash
git diff HEAD~1 -- "*.tsx" "*.scss" | grep "^+" | grep -E '#[0-9a-fA-F]{3,6}' | grep -v "^+++"
```

- [ ] Returns 0 lines
- If hits exist: each must be justified as a dynamic value (e.g. `backgroundColor: similarityColor(score)`). No static hex colors accepted.

---

## Step 4: Anti-pattern scan

Read through changed `.tsx` files. Reject immediately if any of these are present:

| Pattern | What to look for |
|---|---|
| Side-stripe border | `borderLeft:`, `border-left:`, `borderRight:`, `border-right:` with a non-neutral color value |
| Gradient text | `backgroundClip: 'text'` or `background-clip: text` |
| Em dash in copy | `—` or `&mdash;` in JSX string literals |
| Inter font | `fontFamily: 'Inter'` or `font-family: Inter` |
| Hero-metric | A large number in a gradient-accent card with no real data label hierarchy |
| Raw fetch | `fetch(` not wrapped in axiosInstance |
| Hardcoded endpoint | URL string like `'/api/kpis'` directly in a component (should use `endpoints.ts`) |

- [ ] None of the above found
- [ ] If found: note exact file + line number in review comment

---

## Step 5: Interaction state check

Pick the primary interactive element (button, score cell, form input). Verify in the screenshot or code:

- [ ] Hover state defined (CSS `:hover` or `onMouseEnter`)
- [ ] `:focus-visible` ring defined (not `:focus` — must be `focus-visible`)
- [ ] Loading state on the primary action button (`aria-busy`, spinner, disabled)
- [ ] Error state on the primary form (error message renders, correct copy from `error-messages.md`)

---

## Step 6: Accessibility spot-check

- [ ] Tables have `<caption>` (may be visually-hidden)
- [ ] Interactive non-button elements have `role="button"` + `tabIndex={0}` + `onKeyDown` handler
- [ ] Dynamic error messages use `role="alert"` or `aria-live`
- [ ] Color-only status indicators have a text/icon fallback
- [ ] `aria-label` present on icon-only buttons

---

## Step 7: Definition of Done crosscheck

Confirm the PR description includes the DoD checklist with all items checked. If any item is unchecked, **request changes** — do not approve and assume it was done.

---

## Reviewer Comment Template

Copy and post this as a PR comment:

```
## Code Review Gate

**Spec read:** [ ] Yes / [ ] No — link: docs/frontend/pages/<page>.md
**Visual conformance:** [ ] Pass / [ ] Issues: <describe>
**Token conformance:** [ ] Pass (0 hex hits) / [ ] Issues: <file:line>
**Anti-pattern scan:** [ ] Clean / [ ] Found: <pattern at file:line>
**Interaction states:** [ ] Pass / [ ] Missing: <which state>
**A11y spot-check:** [ ] Pass / [ ] Issues: <describe>
**DoD checklist:** [ ] All checked / [ ] Unchecked items: <list>

**Decision:** [ ] Approved / [ ] Request changes
**Notes:** <anything else>
```

---

## What reviewers should NOT do

- Do not approve a PR just because it "looks good." Run the gate.
- Do not approve a PR with an unchecked DoD. The submitter must fix it first.
- Do not approve a PR with a token conformance failure unless each hit is explicitly justified.
- Do not skip the spec read. Visual reviews without reading the spec miss structural problems.
