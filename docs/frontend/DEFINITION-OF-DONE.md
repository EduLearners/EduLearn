# Definition of Done — Frontend Pages

A page is **done** when every item below is checked. No exceptions. A PR that skips items will be rejected at the code review gate.

The PR description must include this checklist with every box checked.

---

## Checklist

### Route + Access
- [ ] Route registered in `src/App.tsx` with correct guard: `<RequireAuth>` + `<RequirePersona>` + `<RequireRole>` (where applicable)
- [ ] Navigating to the route without a JWT redirects to `/login`
- [ ] Navigating to the route with a wrong-persona JWT triggers auto-switch (ITAdmin) or 403 redirect

### Data + API
- [ ] All API calls use `src/api/axiosInstance.ts` (not raw `fetch`)
- [ ] React Query used for all GET calls (`useQuery` / `useQueries`)
- [ ] React Query mutation used for all POST/PUT/DELETE calls (`useMutation`)
- [ ] `queryClient.invalidateQueries` called after mutations that should refresh the view
- [ ] No API endpoint hardcoded in the component — use `src/api/endpoints.ts` constants

### States
- [ ] **Loading state:** skeleton rows or skeleton sections render during initial fetch (Bootstrap placeholder-glow, not a full-page spinner)
- [ ] **Empty state:** custom `<EmptyState>` with message from `error-messages.md` renders when data is empty
- [ ] **Error state:** toast or inline error renders on API failure; uses exact copy from `error-messages.md`
- [ ] **Happy path:** renders correctly with real API data

### Design conformance
- [ ] No hardcoded color values in any `.tsx` or `.scss` file (`grep -E '#[0-9a-fA-F]{3,6}'` returns 0 hits in changed files)
- [ ] No `style={{ color: '...' }}` except for dynamic values (e.g. similarity percentage color computed from a value)
- [ ] All Sass variables come from `_tokens.scss` — no new variables introduced without updating the tokens spec
- [ ] IBM Plex Sans used for all body text (no Inter, no system-ui as primary)
- [ ] IBM Plex Mono (`.font-monospace`) used for: course codes, scores, GPAs, currency amounts, IDs, timestamps, percentages
- [ ] `font-variant-numeric: tabular-nums` applied to every numeric column/value (via `.tabular-nums` utility class or `font-feature-settings: 'tnum' 1`)
- [ ] No em dashes (`—`) in any user-facing copy (use comma, colon, or period)
- [ ] No side-stripe borders (`border-left` or `border-right` > 1px as a colored accent)
- [ ] Active nav item uses 2px inset box-shadow, NOT a side-stripe border

### Interaction
- [ ] All interactive elements have all 8 states implemented: default, hover, focus-visible, active, selected (where applicable), disabled (where applicable), loading, error
- [ ] `:focus-visible` ring (2px brand-500, 2px offset) visible on tab navigation to every interactive element
- [ ] Primary action reachable via keyboard only (tab to button + Enter)
- [ ] Touch targets ≥44px height on all buttons and links

### Accessibility
- [ ] `<main>` or `<section aria-label>` wraps the page content
- [ ] Data tables use `<caption>` (visually-hidden is fine), `scope="col"` on `<th>`, `scope="row"` on row headers
- [ ] Status indicators use icon + label, not color alone
- [ ] `role="alert" aria-live="assertive"` on error messages that appear dynamically
- [ ] `aria-busy="true"` on loading buttons
- [ ] Lighthouse Accessibility score ≥ 95

### Responsive
- [ ] Layout verified at 1440px, 1024px, 768px, 375px
- [ ] Columns specified as hidden at <768px in the page spec are actually hidden
- [ ] No horizontal overflow on the page body at any breakpoint

### Copy
- [ ] All error/empty/confirm messages match `error-messages.md` verbatim (no paraphrasing)
- [ ] No placeholder lorem ipsum or "TODO" copy visible in any state
- [ ] Page title matches the `h1` in the page spec

### PR
- [ ] PR description includes: "Implements `docs/frontend/pages/<page>.md`"
- [ ] PR description includes a screenshot of: loading state, happy path, empty state (if applicable)
- [ ] All checklist items above are checked in the PR description

---

## Fast-fail Rules

If a reviewer finds any of these, the PR is rejected immediately without further review:

1. Hardcoded hex color in a component file
2. Side-stripe border (`border-left > 1px` as decoration)
3. Em dash (`—`) in user-facing copy
4. `font-family: Inter` anywhere in the component's styles
5. Missing loading state (spinner where a skeleton should be, or no loading state at all)
6. API called with raw `fetch` instead of axiosInstance
