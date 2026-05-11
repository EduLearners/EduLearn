# Page Spec — Learner Dashboard

**Route:** `/` (resolved when `currentPersona === 'Learner'`)
**Component file:** `src/pages/learner/LearnerDashboard.tsx`
**Persona:** Learner (Student role only)
**Craft pass:** 1 — written per impeccable craft discipline, Shape Brief 01
**Status:** Ready for implementation

---

## 1. Purpose

The student's landing surface after login. Answers "what needs my attention right now?" within 5 seconds of first paint. Lead-polished showpiece surface for the demo evaluator.

Two audiences, one design:
- **Evaluator (demo):** recognise this as a real institutional product. No template tells.
- **Simulated student:** find the next required action without hunting.

---

## 2. Roles allowed

- `Student` only (enforced by `<RequirePersona persona="Learner">`)
- ITAdmin in Learner persona view: all data shown is "as-student", no admin actions surfaced

---

## 3. API endpoints + data contract

All calls use Axios with the JWT interceptor. Calls in this group are **parallel** (React Query parallel queries, not sequential).

| Block | Endpoint | Cache time | Error behavior |
|---|---|---|---|
| Student identity | `GET /api/students/{me}` | 5 min | show welcome row with name only (from JWT), omit term snapshot |
| Action required: invoices | `GET /api/invoices/student/{me}?status=Overdue,PartiallyPaid` | 2 min | omit block, show stale banner |
| Action required: feedback | `GET /api/submissions/student/{me}?status=Returned&limit=5` | 2 min | omit block, show stale banner |
| Action required: plagiarism | `GET /api/plagiarism/student/{me}/integrity` | 2 min | omit block silently (student may not know) |
| Up next | `GET /api/enrollments/student/{me}` → assessments per section + invoice due dates | 5 min | show empty-up-next state |
| My courses | `GET /api/enrollments/student/{me}` with grade join | 5 min | show empty-courses state |
| Recent feedback | `GET /api/submissions/student/{me}?status=Graded&since=7d&limit=5` | 2 min | omit block silently |
| Notification count | `GET /api/notifications/unread-count` | 30 s (React Query `refetchInterval`) | bell badge shows last-known count |

`{me}` = UserID decoded from JWT in sessionStorage. Never exposed in URL to other users.

---

## 4. Layout — desktop ≥1024px

```
┌──────┬─────────────────────────────────────────────────────────┐
│      │  TopBar (56px, position: sticky, top: 0, z: 10)         │
│  S   │  [EduLearn logo]      [bell (3)]   [JD ▾]               │
│  I   ├─────────────────────────────────────────────────────────┤
│  D   │                                                         │
│  E   │  <main> max-width: 1200px, mx: auto, px: space-8        │
│  B   │                                                         │
│  A   │  Welcome, Aarav                        ← h1 display     │
│  R   │  Fall 2026  ·  GPA 3.4  ·  9/16 cr  ·  Att 92%  ← cap  │
│      │                                                         │
│ 240  │  ┌─────────────────────────────────────────────────┐    │
│  p   │  │  Action required (3)                            │    │
│  x   │  │                                                 │    │
│      │  │  CRITICAL                                       │    │
│      │  │  ⊘ Academic-integrity review     [Open case]   │    │
│      │  │                                                 │    │
│      │  │  ACTION NEEDED                                  │    │
│      │  │  $ Tuition invoice  3d overdue   [Pay ₹52,000] │    │
│      │  │  ↩ Feedback on PSet 4 ready      [View feedback]│   │
│      │  │                                                 │    │
│      │  │  REMINDERS                                      │    │
│      │  │  ◷ Drop deadline Sat                            │    │
│      │  └─────────────────────────────────────────────────┘    │
│      │                                                         │
│      │  Up next                              ← h2 subhead      │
│      │  ─────────────────────────────────────────────          │
│      │  Tue  Quiz    CS-301 Algorithms     11:59 pm            │
│      │  Wed  Essay   PHIL-220 Ethics in AI   4:00 pm           │
│      │  Fri  Reading HIST-205 Modern India   9:00 am           │
│      │  Sat  Drop deadline                                     │
│      │  [View timetable →]                                     │
│      │                                                         │
│      │  My courses                           ← h2 subhead      │
│      │  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│      │  │ CS-301   │  │ PHIL-220 │  │ ECO-150  │              │
│      │  │Algorithms│  │ Ethics   │  │ Microeco │              │
│      │  │Prof. Iyer│  │Prof. Bhatt│  │Prof. Rao │              │
│      │  │ B+  2h   │  │ A-  1d   │  │ B   3d   │              │
│      │  └──────────┘  └──────────┘  └──────────┘              │
│      │  ┌──────────┐                                           │
│      │  │ HIST-205 │                                           │
│      │  │Modern Ind│                                           │
│      │  │Prof. Khan │                                          │
│      │  │ A   1w   │                                           │
│      │  └──────────┘                                           │
│      │                                                         │
│      │  Recent feedback (3)                  ← h2 subhead      │
│      │  ─────────────────────────────────────────────          │
│      │  PSet 4 returned  24 / 25    2 hours ago        →       │
│      │  Discussion reply from Prof. Iyer  yesterday    →       │
│      │  Plagiarism review opened          3 days ago   →       │
│      │                                                         │
└──────┴─────────────────────────────────────────────────────────┘
```

### Sidebar (Learner rail per role-nav.md)

Nav items in order: Dashboard · My Courses · Enrollment · Grades · Transcripts · Timetable · Finance · Tickets. Active item: 2px brand-500 inset-left (box-shadow) + brand-100 background + brand-700 text + weight 500. All items: icon (16px BI) + label (14px IBM Plex Sans). No persona switcher (Student role).

---

## 5. Layout — tablet 768–1023px

- Left rail collapses to 64px icon-only (labels on hover/focus via tooltip)
- Course grid: 2 cols (auto-fit 280px)
- Action required block: full width
- Top bar: unchanged

---

## 6. Layout — mobile <768px

- Left rail hidden behind hamburger (Bootstrap Offcanvas placement="start")
- Top bar: `[≡] [EduLearn] .................... [bell] [JD▾]`
- All blocks: single column, `px: space-6`, `gap: space-6`
- Course grid: 1 col
- Action required CTAs: `width: 100%` stacked below item text
- Up next rows: day/type labels truncate to 2-letter abbreviations (Tu, We, Fr)
- Term snapshot: wraps to 2 lines (GPA · credits on line 1, attendance on line 2)

---

## 7. Semantic HTML structure

```html
<AppShell>
  <TopBar />
  <AppSidebar persona="Learner" activeRoute="/" />
  <main id="main-content" aria-label="Learner dashboard">
    <section aria-label="Welcome">
      <h1>Welcome[, back], {firstName}</h1>
      <TermSnapshotRow term gpa credits attendance />
    </section>

    {/* Rendered only if items exist */}
    <section aria-label="Action required" aria-live="polite">
      <h2>Action required ({count})</h2>
      <ul role="list">
        {/* CRITICAL bucket */}
        <li role="group" aria-label="Critical">
          <span class="severity-label">CRITICAL</span>
          <ActionRequiredItem ... />
        </li>
        {/* ACTION NEEDED bucket */}
        {/* REMINDERS bucket */}
      </ul>
    </section>

    <section aria-label="Up next">
      <h2>Up next</h2>
      <ul role="list">
        <UpNextRow ... />
      </ul>
      <a href="/timetable">View timetable</a>
    </section>

    <section aria-label="My courses">
      <h2>My courses</h2>
      <div class="course-grid" role="list">
        <CourseCard role="listitem" ... />
      </div>
    </section>

    {/* Rendered only if items exist */}
    <section aria-label="Recent feedback">
      <h2>Recent feedback ({count})</h2>
      <ul role="list">
        <FeedbackRow ... />
      </ul>
    </section>
  </main>
</AppShell>
```

**Heading hierarchy:** `<h1>` welcome, `<h2>` per block. No skipped heading levels.
**Skip link:** "Skip to main content" (`href="#main-content"`) hidden until `:focus`, absolute positioned above top bar.
**Landmark roles:** `<main>`, `<nav>` (sidebar), `<header>` (top bar), `<footer>` (if help/profile anchored at bottom of sidebar).

---

## 8. Typography + spacing (from `_tokens.scss`)

| Element | Font | Size | Weight | Color | Line-height |
|---|---|---|---|---|---|
| Welcome heading | IBM Plex Sans | 2rem (display) | 600 | neutral-900 | 1.15 |
| Term snapshot | IBM Plex Sans / Mono on numbers | 0.875rem (secondary) | 400 | neutral-600 ($text-caption → neutral-600) | 1.43 |
| Section headings (h2) | IBM Plex Sans | 1.25rem (subhead) | 600 | neutral-900 | 1.4 |
| Section count badge | IBM Plex Sans | 0.75rem (caption) | 500 | neutral-600 | 1.5 |
| Action item title | IBM Plex Sans | 1rem (body) | 500 | neutral-800 | 1.5 |
| Action item meta | IBM Plex Sans | 0.875rem (secondary) | 400 | neutral-600 | 1.43 |
| Action CTA | IBM Plex Sans | 0.875rem (secondary) | 600 | white on brand-500 | 1.43 |
| Up next day label | IBM Plex Mono | 0.875rem | 400 | neutral-500 | 1.43 |
| Up next course code | IBM Plex Mono | 0.875rem | 500 | neutral-700 | 1.43 |
| Up next time | IBM Plex Mono | 0.875rem | 400 | neutral-600 | 1.43 |
| Course card code | IBM Plex Mono | 1rem | 600 | neutral-900 | 1.5 |
| Course card title | IBM Plex Sans | 0.875rem | 500 | neutral-700 | 1.43 |
| Course card meta (instructor, time) | IBM Plex Sans | 0.75rem | 400 | neutral-600 | 1.5 |
| Grade pill | IBM Plex Mono | 0.75rem | 600 | varies by grade | 1 |
| Feedback row title | IBM Plex Sans | 0.875rem | 500 | neutral-800 | 1.43 |
| Feedback row meta | IBM Plex Sans | 0.75rem | 400 | neutral-600 | 1.5 |

**Numerics:** `font-variant-numeric: tabular-nums` via `.tabular` class on: GPA, credits, attendance %, grade pill values, course counts, up-next times, feedback scores (24/25).

**Spacing rhythm:**
```
Page top margin from top bar:       space-8  (32px)
Between sections (gap):             space-12 (48px)
Within a section heading + content: space-4  (16px)
Course grid gap:                    space-6  (24px)
Action item rows gap:               0 (divider lines separate them)
Up next row gap:                    0 (divider lines)
```

**Container:** max-width `1200px`, `margin: 0 auto`, `padding: 0 var(--space-8)`. At <768px: `padding: 0 var(--space-6)`.

---

## 9. Component map

| UI element | Component (from component-map.md) | Notes |
|---|---|---|
| Global nav rail | `<AppSidebar persona="Learner">` | Custom Tier C |
| Top bar | `<TopBar>` | Custom Tier C — no persona switcher for Student |
| Notification bell + badge | `<NotificationsDropdown>` + `<Badge>` | Custom Tier C + Bootstrap Badge |
| User avatar menu | `<Dropdown>` (react-bootstrap) | Tier A |
| Welcome heading + snapshot | `<TermSnapshotRow>` | Custom Tier C |
| Action required block | `<ActionRequiredBlock>` → `<ActionRequiredItem>` × N | Custom Tier C |
| Up next rows | `<UpNextRow>` × N | Custom Tier C |
| My courses grid | `.course-grid` → `<CourseCard>` × N | Bootstrap grid + Custom Tier C |
| Recent feedback rows | `<FeedbackRow>` × N | Custom Tier C (similar to UpNextRow) |
| Skeleton loaders | `<Skeleton>` (Bootstrap placeholder) | Tier B |
| Empty state (no enrollments) | `<EmptyState>` | Custom Tier C |
| Stale data banner | `<Alert variant="warning">` | Bootstrap Tier A |
| Mobile drawer nav | `<Offcanvas placement="start">` | Bootstrap Tier A |

---

## 10. All states

### 10.1 Default (typical — has data)

Render all 4 blocks (action required / up next / courses / feedback). Count badges show live numbers. Notification bell shows polling unread count.

### 10.2 Loading (first paint — APIs in-flight)

Replace each block with skeleton rows:
```
Welcome row: skeleton line (60% width, 32px height)
Snapshot row: skeleton line (40% width, 14px height)

Action required: 2 skeleton rows (80% width, 56px height each), separator between
Up next: 3 skeleton rows (70% width, 40px height each)
My courses: 3 skeleton cards (full card height, border-radius 8px)
Recent feedback: 2 skeleton rows (75% width, 32px height each)
```
Skeleton shimmer: `background: linear-gradient(90deg, neutral-100, neutral-50, neutral-100) animated`. Duration 1.5s. Killed under `prefers-reduced-motion` (static neutral-100 placeholder).

### 10.3 Empty (new student — no enrollments)

Action required block: hidden entirely.
Up next block: hidden entirely.
My courses: `<EmptyState>` replaces card grid.
Recent feedback: hidden entirely.

```
EmptyState content:
  Icon: book-open (Bootstrap Icons, 48px, neutral-400)
  Heading: "You are not enrolled in any courses yet."
  Body: "Once you enrol in courses for Fall 2026, they will appear here."
  CTA: <Button variant="primary">Browse course catalogue</Button>
       → navigates to /enrollment/browse
```

Term snapshot still renders (term/GPA/credits/attendance from student record).

### 10.4 Error (API failure — network / 500)

Show stale data with warning band below term snapshot:
```
<Alert variant="warning" className="mb-4" role="alert">
  <i className="bi bi-exclamation-triangle me-2" aria-hidden="true"></i>
  We could not refresh your dashboard. Showing data from {relativeTime} ago.{' '}
  <Button variant="link" className="p-0" onClick={refetch}>Refresh</Button>
</Alert>
```
Cards render with React Query's last-known-good data. No block disappears on refresh failure. If no cached data exists (first load), show skeleton indefinitely with the warning band above it.

### 10.5 First-run (just MFA'd, first ever dashboard view)

Render all blocks as normal. After DOM settles (100ms delay), show tour-cue tooltips:
- Bell icon: "Tap the bell anytime to see your notifications." (Tooltip, auto-dismiss after 4s or on first interaction)

Persist `localStorage.firstRunDashboardSeen = true` after tooltips dismissed or 5 seconds pass. Do not re-show on any subsequent login.

### 10.6 Long content (extreme — 12 courses, 8+ action items)

**Action required:** Show first 3 items, then "Show {n} more" text-button that expands inline (no navigation). No pagination.

**Up next:** Show next 5 items (earliest first). "View full timetable →" link at bottom navigates to `/timetable`.

**My courses:** Grid flows naturally to 4 rows / 5 rows. No cap. Scroll within `<main>`.

**Recent feedback:** Show 5 items max, then "View all grades →" link.

### 10.7 Account suspended

Replace entire `<main>` with full-page alert:
```jsx
<Alert variant="danger" className="mx-auto mt-5" style={{maxWidth: '600px'}}>
  <Alert.Heading>Your account is suspended</Alert.Heading>
  <p>
    Contact your registrar to resolve this.
    If you believe this is an error, submit a support ticket.
  </p>
  <Button variant="outline-danger" href="/tickets/new">Submit ticket</Button>
</Alert>
```
No dashboard data is fetched in this state.

---

## 11. Action required block — detailed spec

### Severity buckets

Three buckets rendered in order. Each bucket hidden if it has no items.

| Bucket | Trigger | Icon | Color accent | Label rendered |
|---|---|---|---|---|
| CRITICAL | Plagiarism flag (Pending/Confirmed), Account warning (ITAdmin flag) | `bi-octagon-exclamation` | danger-500 text | "CRITICAL" — caption tier, `danger-500`, tracking 0.04em, uppercase |
| ACTION NEEDED | Overdue or PartiallyPaid invoice, Returned submission (feedback ready) | `bi-exclamation-triangle` (invoice), `bi-arrow-return-left` (feedback) | warn-500 text | "ACTION NEEDED" — caption tier, `warn-500`, uppercase |
| REMINDERS | Invoice due within 7 days (not yet overdue), Drop deadline approaching | `bi-clock` | neutral-600 text | "REMINDERS" — caption tier, `neutral-600`, uppercase |

**Bucket order logic (within each bucket):** sort by most urgent first (earliest due date / most recent creation).

**Bucket label accessibility:** bucket label rendered as `<dt>` inside a `<dl>`, items as `<dd>` elements. Screen reader reads: "CRITICAL — Academic-integrity review — [Open case button]".

### Item layout

```
┌──────────────────────────────────────────────────────────┐
│  [icon]  Title                        [CTA button]        │
│          Meta (amount, date, course)                      │
└──────────────────────────────────────────────────────────┘
```

- Icon: Bootstrap Icons, 16px, inline, `aria-hidden="true"`
- Title: IBM Plex Sans 1rem weight 500 neutral-800
- Meta: 0.875rem weight 400 neutral-600
- CTA: `<Button size="sm" variant="primary">` or `variant="outline-primary"` for lower-severity items
- CTA labels (outcome-named, from error-messages.md and brief):
  - Invoice overdue: "Pay ₹{amount}" → `/finance/invoices/{id}/pay`
  - Multiple invoices: "Pay all ({n} invoices, ₹{total})" → `/finance/invoices`
  - Feedback ready: "View feedback" → `/grades?submission={id}` (Offcanvas)
  - Plagiarism review: "Open case" → `/assessments/{id}` (read-only student view)
  - Drop deadline: "View schedule" → `/enrollment/student/{me}`

Rows separated by `1px solid neutral-200` divider. No side-stripe. No colored left border.

**When empty:** block rendered with zero height (`display: none` or conditional). No "All clear!" placeholder.

---

## 12. Course card — detailed spec

```
┌──────────────────────────────────┐  ← border-radius: 8px
│  CS-301                [B+]      │  ← mono code left, grade pill right
│  Algorithms                      │  ← IBM Plex Sans 14px weight 500
│                                  │  ← gap: 4px
│  [JD] Prof. Iyer                 │  ← Avatar 24px + name
│  2 hours ago                     │  ← relative time, 12px neutral-600
└──────────────────────────────────┘
```

**Card background:** `neutral-50`, `shadow-sm`, `border: none`. NOT Bootstrap's default card border.
**Course code:** IBM Plex Mono 16px weight 600 neutral-900.
**Grade pill:** `<Badge bg="">` — color by grade:
  - A/A+: `success-500` background, white text
  - A-/B+/B: `brand-100` background, `brand-700` text
  - B-/C+/C: `warn-50` background, `warn-500` text
  - D/F/No grade: `neutral-100` background, `neutral-600` text

**No grade yet:** pill hidden entirely, not "—".

**Hover state:** shadow-md (per component-map.md). Title color `brand-700`. Cursor pointer.
**Focus-visible:** 2px solid `brand-500` outline, 2px offset.
**Active:** `neutral-100` background.
**Click:** navigate to `/courses/{id}` with 300ms `ease-out-expo` route fade.

---

## 13. Up next row — detailed spec

```
Tue  ◷  CS-301  Algorithms Quiz             11:59 pm
```

```jsx
<li className="up-next-row d-flex align-items-center gap-3 py-3 border-bottom">
  <span className="day-label tabular text-secondary" style={{minWidth: '2ch'}}>
    {shortDayName}  {/* Tue, Wed, etc. */}
  </span>
  <i className={`bi ${typeIcon} text-muted`} aria-hidden="true" />
  <div className="flex-grow-1">
    <span className="course-code me-2 tabular fw-500">{courseCode}</span>
    <span className="text-secondary">{assessmentTitle}</span>
  </div>
  <span className="time-label tabular text-secondary">{dueTime}</span>
</li>
```

**Type icons:** Quiz `bi-patch-question`, Assignment `bi-file-earmark-text`, Exam `bi-journal-bookmark`, Reading/other `bi-book`, Invoice deadline `bi-receipt`, Drop deadline `bi-calendar-x`.

**Sort:** chronological, mixed sources (assessments + invoice due dates). Day boundary rendered as a section when date changes to the next day.

**"View timetable" link:** `<a href="/timetable">View full timetable →</a>` — after the last row. Arrow is a text character (→), not an icon.

---

## 14. Interaction model

| Trigger | Action | Feedback |
|---|---|---|
| Click course card | Navigate to `/courses/{id}` | 300ms route fade (ease-out-expo) + 225ms exit |
| Click action required CTA | Navigate to target route OR open Offcanvas | Offcanvas slides from right (300ms) for feedback items |
| Click "Show more" in action required | Expand list inline | 200ms height reveal (max-height transition, NOT height) |
| Click "View timetable" | Navigate to `/timetable` | 300ms route fade |
| Click recent feedback row | Navigate to `/grades?submission={id}` | Route fade |
| Click bell icon | Open `<NotificationsDropdown>` | Dropdown opens 200ms ease-out-expo |
| Click notification in dropdown | Mark read (PUT `/api/notifications/{id}/read`) + navigate to resource | Toast omitted (low-noise); badge count decrements |
| Click "Mark all read" | PUT `/api/notifications/read-all` | Badge clears, list shows "You are all caught up." |
| Hamburger tap (mobile) | Open `<Offcanvas placement="start">` | 300ms slide-in from left, backdrop 40% opacity |
| Backdrop click / Escape | Close Offcanvas | 225ms slide-out (75% of entry) |
| Tab key | Move focus through: skip-link → sidebar → top bar → welcome → action items → up next rows → courses → feedback rows | Linear DOM order |
| Escape | Close any open dropdown, Offcanvas, tooltip | Immediate |

**All motion:** killed under `prefers-reduced-motion: reduce`. Opacity transitions 100ms remain.

---

## 15. A11y specification

- **Skip link:** `<a href="#main-content" className="skip-link visually-hidden-focusable">Skip to main content</a>` — first focusable element in DOM.
- **Heading hierarchy:** `h1` (welcome) → `h2` (Action required / Up next / My courses / Recent feedback). No skipped levels.
- **Action required count:** rendered in the heading (`h2`) AND as `aria-live="polite"` region on the block — screen reader announces when count changes after an action.
- **Severity labels:** part of the accessible text flow (rendered as visible text, not CSS `::before` content).
- **Course cards:** `<article>` or `<a>` wrapped card. `aria-label="CS-301 Algorithms. Grade B+. Prof. Iyer. Last updated 2 hours ago."` — synthesised from visible data.
- **Grade pills:** color alone never conveys meaning; each pill renders both the text value and an `aria-label` with fuller context: `aria-label="Current grade: B+"`.
- **Icon buttons (bell, avatar):** `aria-label` on every `<button>`. Bell: `aria-label="Notifications, 3 unread"`.
- **Tabular numerics:** announce naturally (screen reader reads "3 point 4" not "3dot4" — use `aria-label="GPA 3.4"` on the GPA value if the dot causes misreading).
- **Loading state:** skeleton containers have `aria-busy="true"` on the parent section; removed when data loads.
- **Focus restoration:** when Offcanvas or dropdown closes, focus returns to the trigger element.
- **Color contrast:** all text meets WCAG AA; captions use neutral-600 (5.8:1 on neutral-0).

---

## 16. Mobile-first responsive behavior

| Breakpoint | Layout change |
|---|---|
| ≥1024px | Sidebar 240px full (icon + label). Course grid 3 col. |
| 768–1023px | Sidebar 64px icon-only (labels on hover tooltip). Course grid 2 col via auto-fit 280px. |
| <768px | Sidebar hidden (hamburger). Course grid 1 col. Term snapshot wraps 2 lines. Action required CTAs `width: 100%`. Up next day labels abbreviated to "Tu/We/Fr/Sa". Top bar simplified. |
| <640px | Action item title and meta stack vertically (was inline). Font sizes unchanged (no fluid type). |

Touch targets: all interactive elements ≥44px × 44px. Expand with `padding` or `::before` pseudo-element on visually small icons.

---

## 17. Motion spec

| Animation | Duration | Easing | Reduced motion |
|---|---|---|---|
| Route enter fade + Y(8px) translate | 300ms | `ease-out-expo` | disabled |
| Route exit | 225ms | `ease-in-expo` | disabled |
| Offcanvas slide-in (mobile nav) | 300ms | `ease-out-expo` | disabled (instant) |
| Offcanvas slide-out | 225ms | `ease-in-expo` | disabled (instant) |
| Dropdown open | 200ms | `ease-out-expo` | 100ms opacity only |
| Dropdown close | 150ms | `ease-in-expo` | 100ms opacity only |
| Skeleton shimmer | 1500ms loop | linear | disabled (static neutral-100) |
| Notification badge increment | 150ms scale 1→1.2→1 | `ease-in-out` | disabled |
| Action required "Show more" expand | 200ms max-height | `ease-out-expo` | instant show |

Bootstrap's default transitions (250ms linear) must be overridden for all of the above — use our token variables in the SCSS override layer.

---

## 18. Demo seed data

Student: **Aarav Mehta** (userId deterministic, MRN fixed for demo)

| Block | Content |
|---|---|
| Welcome | "Welcome back, Aarav" (not first login in demo flow) |
| Term snapshot | "Fall 2026 · GPA 3.4 · 9 / 16 credits · Attendance 92%" |
| Action required — CRITICAL | Plagiarism review on PHIL-220 Discussion essay (similarity 71%) |
| Action required — ACTION NEEDED | Tuition invoice ₹52,000 overdue 3 days; PSet 4 feedback from Prof. Iyer graded 24/25 |
| Action required — REMINDERS | Section drop deadline Saturday 11:59 pm |
| Up next | Tue Quiz CS-301 11:59 pm, Wed Essay PHIL-220 4:00 pm, Fri Reading HIST-205 9:00 am, Sat Drop deadline |
| My courses | CS-301 Algorithms (Prof. Anjali Iyer, B+, 2h), PHIL-220 Ethics in AI (Prof. Vikram Bhatt, A−, 1d), ECO-150 Microeconomics (Prof. Priya Rao, B, 3d), HIST-205 Modern India (Prof. Rahul Khan, A, 1w) |
| Recent feedback | "PSet 4 graded 24/25 · 2 hours ago", "Discussion reply from Prof. Iyer · yesterday", "Plagiarism review opened · 3 days ago" |
| Notifications | 3 unread: feedback notification, invoice reminder, plagiarism alert |

All instructor names and student data should be consistent across the full demo seed (same names appear in Educator dashboard, gradebook, etc.).

---

## 19. Error message reference

All error messages for this surface come from `docs/frontend/design-language/error-messages.md`:
- Dashboard stale data: Section 8 — "We could not refresh your dashboard..."
- Session expired: Section 1 — "Your session ended. Sign in to continue."
- 403 / permission: Section 8 — redirect to `/403`
- Empty states: Section 10 — "You are not enrolled in any courses yet..."

---

## 20. Implementation notes (for craft phase)

1. **React Query parallel queries:** use `useQueries()` not sequential `useQuery()` chaining. Dashboard must feel instant — all blocks load independently.
2. **`{me}` userId:** decode from JWT in sessionStorage via a `useCurrentUser()` hook, not a separate API call.
3. **Action required aggregation:** merge invoice + submission + plagiarism results client-side, sort by severity then date. A `useActionRequired()` custom hook is recommended.
4. **Course grid:** `display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: var(--space-6)` — NO Bootstrap col-* here. Let the grid self-adjust.
5. **`font-variant-numeric: tabular-nums`:** applied via the `.tabular` utility class (`_tokens.scss` line ~270) on every numeric span. Do not apply to the entire body.
6. **Notification polling:** `useQuery` with `refetchInterval: 30000` (30s) for the bell count. Do NOT poll the full notifications list from this page.
7. **First-run state:** check `localStorage.getItem('firstRunDashboardSeen')` on mount. If null, schedule tooltip after 100ms delay (avoid flash-on-mount).
8. **Welcome copy:** check `localStorage.getItem('lastLogin')`. If null or today = first-ever login: "Welcome, Aarav". Otherwise: "Welcome back, Aarav". Set `lastLogin` to today on mount.
9. **Stale data check:** React Query's `dataUpdatedAt` timestamp — show stale banner if last successful fetch > 3 minutes ago AND current fetch is failing.
10. **Bootstrap overrides needed:** card border (`$card-border-width: 0`), card radius (`$card-border-radius: 0.5rem`), button radius (`$btn-border-radius: 0.5rem`), all set via `_tokens.scss` before Bootstrap import.
