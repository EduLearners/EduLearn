# Component Map — EduLearn Frontend

**Status:** Locked 2026-05-07.
**Purpose:** Single source of truth for every UI primitive the design will require, mapped to its implementation strategy under the React 18 + Bootstrap 5 + react-bootstrap stack.

Every component in every page spec MUST trace back to a row in this map. If a page spec needs something not listed here, this map gets updated first.

---

## Strategy by tier

| Tier | What it means | Style of implementation |
|---|---|---|
| **A. Bootstrap-native** | Bootstrap class works as-is after our Sass token overrides | Use `react-bootstrap` component or raw `className` |
| **B. Bootstrap-customized** | Bootstrap structure + token overrides + small custom CSS | Use `react-bootstrap` component, layer our SCSS on top |
| **C. Custom-built** | No Bootstrap equivalent; we build a React component from scratch | Lift JSX/ARIA from shadcn or Radix, re-skin with our tokens |

shadcn/ui is **not installed** as a dependency. We read its source for visual structure and ARIA patterns, then re-implement using Bootstrap utility classes + our tokens.

---

## 1. Form primitives

| Component | Tier | Implementation | shadcn/Radix lift | Where used |
|---|---|---|---|---|
| **Button** (variants: primary, secondary, ghost, danger, link) | A | `<Button variant="primary">` with custom Sass overriding `$btn-padding-y/x`, `$btn-border-radius` (8px), `$btn-font-weight` (600) | shadcn variant API (lift names: primary/secondary/ghost/destructive/link) | Every page |
| **IconButton** (icon-only) | B | `<Button>` + Bootstrap Icons + 44px min touch target via padding | shadcn IconButton | Top bar (bell, avatar), Action bar |
| **Input + label** | B | `<Form.Group>` + `<Form.Label>` + `<Form.Control>`. Custom `<Field>` wrapper handles error/help text below the field. | shadcn Field (the wrapper composition) | Every form |
| **Textarea** | A | `<Form.Control as="textarea" rows={4}>` | — | Discussions, ticket creation |
| **Select** (single value, ≤10 options) | A | `<Form.Select>` (native HTML `<select>`) | — | Status filters, role pickers |
| **Combobox / AsyncCombobox** (searchable, async) | C | Custom `<AsyncCombobox>` component built on Bootstrap dropdown. Debounced fetch, keyboard nav, ARIA combobox roles. | React Aria `useComboBox` ARIA pattern | Student/instructor pickers, course search in enrollment |
| **MultiSelect** | C | Custom `<MultiSelect>` based on Combobox + chip rendering | shadcn Combobox multi-mode | Required courses (programs), prerequisite chips |
| **Checkbox** | A | `<Form.Check type="checkbox">` | — | Bulk actions, agreement boxes |
| **Radio group** | A | `<Form.Check type="radio">` × N | — | Status filters with mutually exclusive options |
| **Switch / toggle** | A | `<Form.Check type="switch">` | — | Settings toggles (notifications on/off) |
| **Date input** | A | `<input type="date">` (HTML5 native — already in PRD scope) | — | DOB on applicant form, due-date filters |
| **Date range** | C | Two `<input type="date">` side-by-side with validation that end ≥ start | — | Audit log filters, report generation |
| **Time input** | A | `<input type="time">` (HTML5 native) | — | Section schedule editor |
| **NumberField** (with step, locale-aware) | C | Custom `<NumberField>` wrapping `<input type="number">` with locale formatting | React Aria `useNumberField` | Fee amounts, scholarship percentages, score entry |
| **File upload** | B | `<Form.Control type="file">` + custom drop zone wrapper showing filename + progress | shadcn FileUpload | Submission upload, content upload, applicant docs |
| **Stepper** (multi-step form) | C | Custom `<Stepper>` using Bootstrap progress + flex. Steps: 1. Account → 2. MFA setup → 3. Profile etc. | None — design in-house | Applicant form, MFA setup, registration |

---

## 2. Data display

| Component | Tier | Implementation | shadcn/Radix lift | Where used |
|---|---|---|---|---|
| **Card** | B | `<Card>` with custom Sass — 8px radius, subtle shadow-sm, no border. NEVER nest cards. | shadcn Card variants | Course cards, action items, dashboard widgets |
| **DataTable** | C | Custom `<DataTable>` component. Bootstrap `.table` + sticky thead + custom column definitions + sort/filter state in component. NO TanStack Table dependency. | shadcn DataTable column-def pattern | Gradebook, audit log, applicant queue, invoice list |
| **DataTable row actions** | C | Inline icon buttons on hover OR per-row Offcanvas (Sheet) for edit | shadcn row actions | Within DataTable |
| **List** (dense rows) | A | `<ListGroup>` with `<ListGroup.Item>`. Used when content is data, not interactive cards. | — | Up next, recent feedback, notifications dropdown |
| **Description list** (label/value pairs) | A | `<dl>` + `<dt>` + `<dd>` styled. Used in detail panels (student detail, invoice detail). | — | Detail pages |
| **Avatar** | B | Custom — circular `<img>` or initials fallback. 24/32/40/48 sizes. | shadcn Avatar | User chips, instructor names, comments |
| **Avatar group** (stacked) | C | Custom — overlapping avatars with overflow count | shadcn AvatarGroup | Section roster preview |
| **Badge / Pill** | A | `<Badge>` from react-bootstrap. Variants: neutral, brand, success, warn, danger, info. | shadcn Badge | Status chips (Enrolled, Overdue, Pending), grade pills |
| **Status row** | C | Custom — icon + label + value + optional action button, single line | shadcn pattern | Term snapshot row, status banners |
| **KPI stat** | C | Custom — large mono number + caption label below. Tabular-nums mandatory. | shadcn StatCard (without the gradient) | KPI dashboards, term snapshot |
| **Progress bar** | A | `<ProgressBar>` from react-bootstrap | — | Credit completion, file upload progress |
| **Spinner** | A | `<Spinner>` from react-bootstrap | — | In-flight async indicators |
| **Skeleton loader** | B | Bootstrap placeholder utilities + custom `<Skeleton>` wrapper preserving 24px rhythm | shadcn Skeleton | Initial dashboard loading state |
| **Empty state** | C | Custom `<EmptyState>` — icon + heading + body copy + optional CTA. Onboarding-style copy per impeccable rule. | shadcn Empty | Every list/grid that can be empty |
| **Tag / Chip removable** | C | Custom — pill with × button, onRemove callback | shadcn Chip | Selected prerequisites, multi-select |

---

## 3. Navigation

| Component | Tier | Implementation | shadcn/Radix lift | Where used |
|---|---|---|---|---|
| **AppSidebar** (left rail) | C | Custom — built from React Router `NavLink` + Bootstrap utility classes. Three states: full-240px, icon-only-64px, hidden+drawer. Active state: 2px brand-500 inset left edge + 8% brand-100 bg. | shadcn Sidebar composition | Every authenticated route |
| **TopBar** | C | Custom — flex container 56px tall with brand mark, persona switcher slot, bell, avatar | None | Every authenticated route |
| **PersonaSwitcher** (ITAdmin only) | C | Custom — Bootstrap `<Dropdown>` with 4 personas. Selecting repaints rail + redirects to persona's default route. Hidden for non-ITAdmin. | None | Top bar |
| **HamburgerDrawer** (mobile nav) | A | `<Offcanvas placement="start">` from react-bootstrap, holds the same nav as AppSidebar | — | <768px breakpoint |
| **Tabs** | A | `<Tabs>` + `<Tab>` from react-bootstrap | — | Course detail (Syllabus / Content / Assessments / Discussions), settings panels |
| **Breadcrumb** | A | `<Breadcrumb>` + `<Breadcrumb.Item>` from react-bootstrap | — | Detail pages (Course → Section → Submission) |
| **Pagination** | A | `<Pagination>` from react-bootstrap with custom Sass for token compliance | — | Every list endpoint pagination |
| **Action bar** (sticky page-level actions) | C | Custom — sticky top container holding page title + action buttons. Sticky `top: 56px` so it sits below TopBar. | None | Detail pages (Edit, Status change, Generate transcript) |

---

## 4. Overlays & feedback

| Component | Tier | Implementation | shadcn/Radix lift | Where used |
|---|---|---|---|---|
| **Modal / Dialog** | A | `<Modal>` from react-bootstrap. Used for irreversible confirms only (drop course, delete account). | — | Confirms |
| **Offcanvas / Sheet** (slide-out panel) | A | `<Offcanvas placement="end">` from react-bootstrap. The grading panel for instructors lives here. | shadcn Sheet pattern | Submission grading, student detail edit |
| **Drawer** (mobile nav) | A | Same `<Offcanvas placement="start">` reused for hamburger | — | Mobile nav |
| **Dropdown menu** | A | `<Dropdown>` from react-bootstrap | — | Avatar menu, row actions |
| **Tooltip** | A | `<OverlayTrigger>` + `<Tooltip>` from react-bootstrap. Delay 500ms. | — | Truncated text, icon-only buttons |
| **Popover** | A | `<OverlayTrigger>` + `<Popover>` from react-bootstrap. Used sparingly. | — | Notification preview on hover |
| **Toast** (notification) | B | `<Toast>` + `<ToastContainer>` from react-bootstrap. Custom queue context manages stack of toasts. | shadcn Sonner pattern | Success/error feedback after actions |
| **Alert** (inline page-level message) | A | `<Alert variant="warning">` from react-bootstrap | — | Page banners (account suspended, term ending) |
| **NotificationsDropdown** | C | Custom — `<Dropdown>` with custom menu containing list of notifications + "Mark all read" + footer link to /notifications | shadcn pattern | Top bar bell click |
| **CommandPalette** (cmd+K) | — | **DEFERRED to v2** — out of scope per locked decision (would need backend search endpoint) | — | Future |

---

## 5. Domain-specific custom components

These are EduLearn-specific compositions; they don't have direct shadcn parallels because they're product surfaces.

| Component | Composition | States | Where used |
|---|---|---|---|
| **TermSnapshotRow** | Caption-tier text row: "Fall 2026 · GPA 3.4 · 9 / 16 credits · Attendance 92%" with mono on numerics, secondary text color, interpunct separators | default, loading (skeleton row), error (omit) | Learner Dashboard top |
| **ActionRequiredBlock** | List of items grouped by severity (Critical / Action needed / Reminder). Each item: icon + title + meta + outcome-named CTA. | default, empty (block hidden entirely — no placeholder) | Learner Dashboard |
| **CourseCard** | Card containing course code (Plex Mono, large), title (subhead), instructor avatar+name (Avatar + secondary text), grade pill (Badge), last-update relative time | default, no-grade-yet, archived | Learner Dashboard, Educator dashboard |
| **UpNextRow** | Single row: day-of-week (mono) · type-icon · title · course code · time | default, mixed assessment+invoice items | Learner Dashboard |
| **GradebookCell** | Editable score cell. Click → inline NumberField. Shows pending state during save. | default, editing, saving, error, plagiarism-flagged | Educator gradebook |
| **TimetableGrid** | CSS Grid week-view: 7 columns × hour rows. Sections render as block elements positioned by start time / duration. | default, empty (no enrollments), conflict (overlap warning) | /timetable |
| **AuditLogRow** | Append-only table row with immutability badge, user avatar, action verb, resource link, timestamp | default — no edit affordance ever | /audit-logs |
| **GradeChangeHistory** | Timeline view of GradeChange entries for a Submission | default, single entry, multiple entries | Submission detail |
| **PlagiarismFlag** | Inline alert on a submission row showing similarity score + status | pending, confirmed, dismissed | Gradebook, plagiarism queue |
| **InvoiceLineItems** | Read-only table of FeeItemsJSON / LineItemsJSON | default — read-only after generation | Invoice detail |
| **TranscriptViewer** | Read-only academic transcript (course code, title, grade, credits, term, GPA) styled for print + PDF download CTA | draft, issued, revoked | /transcripts/:id |
| **DiscussionThread** | Nested PostsJSON renderer with reply form | default, locked, archived | Course detail Discussions tab |
| **RubricBuilder** | Editable rubric: rows of criterion + maxPoints + description | default (drag-to-reorder rows) | Assessment editor |
| **ScheduleEditor** | Weekly calendar grid for ScheduleJSON entry — pick days × time slots | default, conflict (overlapping with another section) | Section editor |

---

## 6. Layout primitives

| Token / class | Use |
|---|---|
| `<Container>` from react-bootstrap | Centered max-width content |
| `<Row>` / `<Col>` | 12-col grid (legacy Bootstrap; OK to use) |
| `display: grid` + `gap` | Preferred for new layouts (per impeccable rule: gap not margin) |
| `.course-grid` (custom) | `repeat(auto-fit, minmax(280px, 1fr))` with `gap: var(--space-6)` |
| `.action-bar` (custom) | Sticky `top: 56px`, `bg: surface-page`, `box-shadow: shadow-sm` on scroll |
| `<Stack>` (custom) | Vertical or horizontal flex with token-driven gap. Avoid `<Stack>` from react-bootstrap (uses pixel gaps). |

---

## 7. Banned components / patterns

These appear in shadcn / Bootstrap / external libraries but are explicitly banned for EduLearn (per `04-anti-ai-slop-checklist.md`):

- **Carousel** — no slideshow on dashboards or anywhere
- **Accordion as primary nav** — fine for FAQ, banned for dashboard sections
- **Marquee** — never
- **Animated background** (Aurora, particles) — never inside the authenticated app
- **Glassmorphism panels** — never
- **Hero gradient strip** — never
- **Bootstrap default `.card` border + `.text-muted`** — too "Bootstrap-template" feel; we override

---

## 8. Interaction States — 8-State Table

Every interactive component must implement all 8 states. This table is the authoritative spec — implementation must not invent behavior outside these definitions.

**Token references:** brand-500 = `#1f4d2c`, brand-600 = `#173e22`, brand-100 = `#cee0d2`, neutral-100 = `#f4f1ec`, danger-500 = `#a83d29`.

### Button (primary)

| State | Background | Border | Text / icon | Cursor | Notes |
|---|---|---|---|---|---|
| default | `brand-500` | none | white, 600 weight | pointer | |
| hover | `brand-400` | none | white | pointer | lighten 1 step |
| focus-visible | `brand-500` | `2px solid brand-500, outline-offset 2px` | white | pointer | ring outside |
| active / pressed | `brand-600` | none | white | pointer | darken 1 step |
| selected | n/a (buttons are not toggle) | — | — | — | use Switch or Toggle instead |
| disabled | `brand-300` (#82b489) | none | `neutral-400` | not-allowed | no hover |
| loading | `brand-500` opacity 80% | none | spinner icon (16px) + hide label | wait | spinner respects prefers-reduced-motion |
| error | `danger-500` | none | white | pointer | only when action itself caused an error |

### Button (secondary / ghost)

| State | Background | Border | Text | Cursor |
|---|---|---|---|---|
| default | transparent | `1px solid brand-500` | `brand-700` | pointer |
| hover | `brand-50` | `1px solid brand-500` | `brand-700` | pointer |
| focus-visible | transparent | `2px solid brand-500, offset 2px` | `brand-700` | pointer |
| active | `brand-100` | `1px solid brand-600` | `brand-800` | pointer |
| disabled | transparent | `1px solid neutral-300` | `neutral-400` | not-allowed |
| loading | `brand-50` opacity 80% | `1px solid brand-300` | spinner | wait |
| error | transparent | `1px solid danger-500` | `danger-500` | pointer |

### Input field (text, textarea, select, date, number)

| State | Background | Border | Label | Helper / error text | Cursor |
|---|---|---|---|---|---|
| default | `neutral-100` | `1px solid neutral-200` | `neutral-700` | `neutral-600` caption | text |
| hover | `neutral-50` | `1px solid neutral-300` | unchanged | unchanged | text |
| focus-visible | `neutral-0` | `2px solid brand-500` | `brand-700` | unchanged | text |
| active (typing) | `neutral-0` | `2px solid brand-500` | `brand-700` | unchanged | text |
| filled (has value) | `neutral-100` | `1px solid neutral-200` | unchanged | unchanged | text |
| disabled | `neutral-50` | `1px solid neutral-200` | `neutral-400` | `neutral-400` | not-allowed |
| loading (async validate) | `neutral-100` | `1px solid neutral-200` | unchanged | spinner icon at right | text |
| error | `neutral-0` | `2px solid danger-500` | `neutral-700` | `danger-500` text below: what/why/fix | text |

Validate on **blur only** (not keystroke). Error text replaces helper text. Error persists until blur on corrected value.

### CourseCard

| State | Card background | Shadow | Border | Title color | Cursor |
|---|---|---|---|---|---|
| default | `neutral-50` | `shadow-sm` | none | `neutral-800` | pointer |
| hover | `neutral-50` | `shadow-md` | none | `brand-700` | pointer |
| focus-visible | `neutral-50` | `shadow-sm` | `2px solid brand-500` (outline) | `brand-700` | pointer |
| active (mousedown) | `neutral-100` | `shadow-sm` | none | `brand-700` | pointer |
| selected | n/a (cards navigate, not select) | — | — | — | — |
| disabled | `neutral-50` opacity 50% | none | none | `neutral-400` | not-allowed |
| loading | skeleton overlay preserving card dimensions | — | — | — | wait |
| error | `neutral-50` | `shadow-sm` | `1px solid danger-500` | `neutral-800` | pointer |

### ActionRequiredItem (row inside ActionRequiredBlock)

| State | Row background | Border | Text | CTA button | Cursor |
|---|---|---|---|---|---|
| default | transparent | bottom `1px solid neutral-200` | `neutral-800` | secondary button (brand outline) | pointer (whole row) |
| hover | `brand-50` (4%) | bottom `1px solid neutral-200` | `neutral-800` | hover state on CTA | pointer |
| focus-visible | `brand-50` | `2px solid brand-500` outline on row | `neutral-800` | focus ring on CTA | pointer |
| active (click) | `brand-100` | — | — | active CTA | pointer |
| selected | n/a | — | — | — | — |
| disabled | transparent | bottom `1px solid neutral-200` | `neutral-400` | disabled button | not-allowed |
| loading (after CTA click) | `brand-50` opacity 60% | — | `neutral-400` | loading spinner | wait |
| error | `danger-50` | left `2px solid danger-500` (exception: only time side-stripe allowed — it's a status indicator, not decoration) | `neutral-800` | retry button | pointer |

**Note on ActionRequiredItem error state:** this is the ONE permitted use of a left colored bar — only on a container explicitly in an error/warning status (payment failed, action failed), and only 2px. This is a status indicator matching the severity color, not the "side-stripe border" AI-slop pattern which applies to cards/callouts as decoration.

### NavItem (left rail)

| State | Background | Left bar | Icon + label color | Font weight | Cursor |
|---|---|---|---|---|---|
| default | transparent | none | `neutral-600` | 400 | pointer |
| hover | `neutral-100` | none | `neutral-700` | 400 | pointer |
| focus-visible | transparent | none | `neutral-700` | 400 | pointer + `2px solid brand-500` outline |
| active (current route) | `brand-100` | `2px solid brand-500` inset left (box-shadow) | `brand-700` | 500 | default |
| selected | same as active | — | — | — | — |
| disabled | n/a (hidden, not disabled — see role-nav.md) | — | — | — | — |
| loading | n/a (nav items don't load) | — | — | — | — |
| error | n/a | — | — | — | — |

### DataTableRow

| State | Row background | Border | Cell text | Cursor |
|---|---|---|---|---|
| default (odd) | `neutral-0` | bottom `1px neutral-200` | `neutral-800` | default |
| default (even) | `neutral-50` | bottom `1px neutral-200` | `neutral-800` | default |
| hover | `brand-50` (4% tint on either stripe) | bottom `1px neutral-200` | `neutral-800` | pointer (if row is clickable) |
| focus-visible (keyboard nav) | `brand-50` | `2px solid brand-500` outline | `neutral-800` | pointer |
| selected (checkbox checked) | `brand-100` | bottom `1px brand-200` | `neutral-800` | pointer |
| disabled | `neutral-50` opacity 50% | bottom `1px neutral-200` | `neutral-400` | not-allowed |
| loading (skeleton) | skeleton overlay, preserves row height | none | shimmer | wait |
| error (API fail on row action) | `danger-50` | left `2px solid danger-500` | `neutral-800` | pointer |

All DataTable rows: `font-variant-numeric: tabular-nums` on every cell containing a number.

---

## 9. Component readiness checklist

Before any page spec uses a component, verify the row in this map answers:

1. ✅ Tier (A / B / C) decided
2. ✅ Implementation strategy named (Bootstrap class OR custom file path)
3. ✅ States enumerated (default + edge cases relevant to that component)
4. ✅ shadcn/Radix source documented (if any) — for ARIA / behavior reference
5. ✅ A11y requirements noted (focus order, ARIA roles, keyboard interaction)

If any answer is "TBD," fix here before referencing it in a page spec.
