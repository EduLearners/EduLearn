# Page Spec — Educator Dashboard

**Route:** `/` (resolved when `currentPersona === 'Educator'`)
**Component file:** `src/pages/educator/EducatorDashboard.tsx`
**Persona:** Educator (Instructor + DeptAdmin roles)
**Craft pass:** 1 — delta from learner-dashboard.md; shell, tokens, typography, motion all inherited
**Status:** Ready for implementation

---

## 1. Purpose

The Instructor's (or DeptAdmin's) command center. Answers "what teaching tasks need me today?" Course-shaped: organized around the instructor's sections and grading queue. Time-bankrupt user; every extra click multiplies by N students.

Primary demo flex: the **gradebook** link from each section card — clicking it opens `/teaching/sections/{id}/gradebook`, showing the dense DataTable that demonstrates real data-handling capability.

---

## 2. Roles allowed

- `Instructor` — sees own sections, grading queue, content, discussions
- `DeptAdmin` — sees own sections PLUS admin-rail items (Programs, Course Catalog, Rooms); dashboard content identical to Instructor variant

---

## 3. API endpoints + data contract

All parallel via `useQueries()`.

| Block | Endpoint | Notes |
|---|---|---|
| Instructor identity | `GET /api/users/me` (decode from JWT) | FullName, Role |
| To grade | `GET /api/submissions?instructorId={me}&status=Submitted,Late` | Group by assessmentId client-side |
| Today's classes | Compose from `GET /api/sections?instructorId={me}&term={current}` + filter ScheduleJSON for today | No dedicated endpoint — build locally |
| My sections | `GET /api/sections?instructorId={me}&term={current}` | With EnrolledCount, Capacity |
| Plagiarism queue | `GET /api/plagiarism?status=Pending&flaggedBy={me}` | Count + top 3 |

---

## 4. Layout — desktop ≥1024px

```
┌──────┬──────────────────────────────────────────────────────┐
│      │  TopBar (56px)                                        │
│  S   │  [EduLearn]                         [bell (2)] [AI▾] │
│  I   ├──────────────────────────────────────────────────────┤
│  D   │                                                       │
│  E   │  Good morning, Prof. Iyer                    ← h1    │
│  B   │  Fall 2026  ·  3 sections  ·  87 students  ·  14 to grade  │
│  A   │                                                       │
│  R   │  ┌───────────────────────────────────────────────┐    │
│      │  │  To grade (14)                                │    │
│ Dsh  │  │                                               │    │
│ Crs  │  │  CS-301 sec A  PSet 4      8 ungraded    →   │    │
│ Sec  │  │  PHIL-220 sec B  Essay     6 ungraded    →   │    │
│ Grb  │  └───────────────────────────────────────────────┘    │
│ Asm  │                                                       │
│ Sub  │  Today's classes                             ← h2    │
│ Ctn  │  ─────────────────────────────────────────────        │
│ Dis  │  10:00 am  CS-301 sec A    Room TS-201   25 / 25     │
│ Plg  │   2:00 pm  PHIL-220 sec B  Room HS-104   18 / 22     │
│ Tkt  │                                                       │
│      │  My sections                                 ← h2    │
│      │  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│      │  │ CS-301 A │  │ CS-301 B │  │PHIL-220 C│           │
│      │  │ Fall 2026│  │ Fall 2026│  │ Fall 2026│           │
│      │  │  25/25   │  │  24/25   │  │  18/22   │           │
│      │  │  Avg B+  │  │  Avg A−  │  │  Avg B   │           │
│      │  │[Gradebook│  │[Gradebook│  │[Gradebook│           │
│      │  └──────────┘  └──────────┘  └──────────┘           │
│      │                                                       │
│      │  Plagiarism flags (2 pending)                ← h2    │
│      │  ─────────────────────────────────────────────        │
│      │  CS-301 PSet 3   78% similarity   2 days ago    →    │
│      │  PHIL-220 Essay  62% similarity   yesterday     →    │
│      │                                                       │
└──────┴──────────────────────────────────────────────────────┘
```

**Sidebar (Educator rail per role-nav.md section 3):**
Dashboard · Courses · Sections · Gradebook · Assessments · Submissions · Content · Discussions · Plagiarism · Tickets
(+ Programs / Course Catalog / Rooms divider for DeptAdmin)

---

## 5. Welcome row

`Good morning / afternoon / evening, Prof. {lastName}` — greeting varies by hour (morning <12, afternoon <18, evening ≥18). IBM Plex Sans display tier, weight 600, neutral-900.

Term snapshot: `Fall 2026 · {N} sections · {total students} students · {ungraded} to grade` — secondary tier, neutral-600, monospace on all numerics.

"To grade" count in snapshot updates reactively from the grading queue.

---

## 6. "To grade" block — detailed spec

Same pattern as Learner's `<ActionRequiredBlock>` but with a single severity level (no bucketing — all items are "action needed"). Renamed to "To grade" to match Instructor mental model.

Each row:
```
{courseCode} {sectionLabel}  {assessmentTitle}   {n} ungraded   →
```

- Course code: IBM Plex Mono weight 600
- Section label: IBM Plex Sans secondary weight 400 neutral-600
- Assessment title: weight 500 neutral-800
- Ungraded count: IBM Plex Mono weight 600 `warn-500` with `bi-hourglass-split` icon
- Arrow: navigates to `/teaching/sections/{sectionId}/gradebook?assessment={id}&filter=ungraded`

Block hidden when count = 0. When empty: single line "All submissions graded for this week." No exclamation mark.

---

## 7. Today's classes block

Rows render only for sections whose `ScheduleJSON` contains today's day-of-week.

```
{HH:MM am/pm}  {courseCode} sec {section}  {roomNumber}  {enrolled}/{capacity}
```

- Times in IBM Plex Mono tabular-nums
- Room is link to `/admin/rooms/{id}` for DeptAdmin; plain text for Instructor
- Enrollment numbers: `{enrolled}/{capacity}` — color-coded:
  - At capacity (enrolled === capacity): `warn-500` text
  - Near capacity (≥90%): `warn-500` text
  - Normal: `neutral-600`

Block hidden if no classes today (no "No classes today" placeholder).

---

## 8. My sections grid

Same visual pattern as Learner's course card grid. Cards use `repeat(auto-fit, minmax(280px, 1fr))`.

Section card layout:
```
{courseCode} {sectionLabel}                   ← Plex Mono 600
{courseName}                                  ← Plex Sans 500 secondary
{term}                                        ← neutral-600 caption
─────────────────────────
{enrolled} / {capacity} enrolled              ← Plex Mono tabular
Avg {grade}                                   ← Badge, same color logic as grade pill
─────────────────────────
[Open gradebook]                              ← primary button full-width
```

"Open gradebook" button: `<Button variant="primary" size="sm" className="w-100">Open gradebook</Button>` → navigates to `/teaching/sections/{id}/gradebook`.

---

## 9. Plagiarism queue block

Rows mirror Learner's feedback rows:
```
{courseCode} {assessmentTitle}   {similarity}%   {relative time}   →
```

- Similarity % in Plex Mono, color: ≥80% `danger-500`, 60–79% `warn-500`, <60% `neutral-600`
- Click → `/teaching/plagiarism/{reportId}`

Block hidden when count = 0.

---

## 10. States

| State | Behavior |
|---|---|
| **Default** | All blocks. "To grade" has items; "Today's classes" has 2+ entries; 3 section cards; 2 plagiarism flags |
| **Loading** | Skeleton rows and cards (same pattern as Learner) |
| **Nothing to grade** | "To grade" block reads: "All submissions graded for this week." (hidden when 0) |
| **No classes today** | "Today's classes" block hidden entirely |
| **No sections this term** | Greeting + snapshot render. Main content: `<EmptyState>` — "Your teaching schedule for Fall 2026 is not published yet. Contact your department admin." No CTA (Instructor cannot create sections). |
| **DeptAdmin with no teaching** | "To grade" hidden. "Today's classes" hidden. Section cards render from admin perspective (all department sections, not just personal). |
| **Error** | Stale banner + last-known-good data (same as Learner) |

---

## 11. Demo seed data

Instructor: **Prof. Anjali Iyer** (userId deterministic)

| Block | Content |
|---|---|
| Welcome | "Good morning, Prof. Iyer" |
| Snapshot | "Fall 2026 · 3 sections · 87 students · 14 to grade" |
| To grade | CS-301 sec A PSet 4 (8 ungraded), PHIL-220 sec B Essay (6 ungraded) |
| Today | 10:00 am CS-301 sec A Room TS-201 25/25, 2:00 pm PHIL-220 sec B Room HS-104 18/22 |
| My sections | CS-301 sec A (25/25, Avg B+), CS-301 sec B (24/25, Avg A−), PHIL-220 sec C (18/22, Avg B) |
| Plagiarism | CS-301 PSet 3 78% (2 days ago), PHIL-220 Essay 62% (yesterday) |

---

## 12. Interaction model (delta from Learner)

| Trigger | Action |
|---|---|
| Click "To grade" row | Navigate to gradebook filtered to ungraded submissions for that assessment |
| Click "Open gradebook" on section card | Navigate to `/teaching/sections/{id}/gradebook` |
| Click today's class row | Navigate to `/teaching/sections/{id}/roster` |
| Click plagiarism flag row | Navigate to `/teaching/plagiarism/{reportId}` |

All navigation via React Router `useNavigate`. 300ms route fade.

---

## 13. A11y (delta from Learner)

- "To grade" count announced via `aria-live="polite"` — decrements as instructor grades
- "Open gradebook" buttons on each section card: `aria-label="Open gradebook for CS-301 section A"` — disambiguates duplicate button labels
- Plagiarism similarity percentages: `aria-label="{similarity}% similarity — flag review required"` when ≥80%
- Today's classes enrollment color: not color-only — "25 of 25 enrolled, section at capacity" in `aria-label`

---

## 14. Responsive (same shell pattern as Learner)

≥1024px: full rail + 3-col section grid. 768–1023px: icon-only rail + 2-col grid. <768px: hamburger + 1-col grid. Today's class time stamps abbreviated to HH:MM at <640px.
