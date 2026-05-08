# Page Spec — Course Detail

**Route:** `/courses/:id?tab={syllabus|content|assessments|discussions}`
**Component:** `src/pages/learner/CourseDetailPage.tsx`
**Persona:** Learner (read-only tabs). Instructor/DeptAdmin see same shell with write actions — handled via role-conditional rendering, not separate routes.
**Status:** Ready for implementation

---

## 1. Purpose

Central hub for one course. Four tabs expose the four content surfaces a student accesses within a course. Tab state persisted in URL (`?tab=`) for sharable links and back/forward navigation.

---

## 2. API endpoints

| Tab | Endpoint |
|---|---|
| Syllabus | `GET /api/syllabi/course/{id}` |
| Content | `GET /api/content/course/{id}` |
| Assessments | `GET /api/assessments/course/{id}` |
| Discussions | `GET /api/discussions/course/{id}` |
| Header (always) | `GET /api/courses/{id}` + enrollment grade from `GET /api/enrollments/student/{me}` |

Tab content fetched lazily on first tab activation, then cached 5 min.

---

## 3. Layout

```
┌─────────────────────────────────────────────────────────────┐
│ AppShell (sidebar + top bar)                                │
│                                                             │
│  ← Back to courses          [Action bar — Instructor only]  │
│                                                             │
│  CS-301                                                     │ ← Plex Mono display
│  Algorithms                                                 │ ← Plex Sans subhead 600
│  Prof. Anjali Iyer  ·  Fall 2026  ·  Room TS-201  ·  [B+]  │ ← secondary, grade pill
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│  Syllabus │ Content │ Assessments │ Discussions             │ ← Bootstrap nav-tabs
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  [Tab content — see per-tab specs below]                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Course header:** `neutral-0` background, `padding: space-8 space-8 0`, sticky top (after top bar, so `top: 56px`).

**Back link:** `← Back to courses` — plain text-link (brand-700), no card/button. Navigates to `/courses` (preserving scroll position via React Router state).

**Tab bar:** Bootstrap `nav-tabs`. Active tab: `brand-500` underline (2px), `brand-700` text, weight 600. Inactive: `neutral-600` text. Tab labels: "Syllabus", "Content", "Assessments", "Discussions". Tab state synced to URL `?tab=` via `useSearchParams`.

---

## 4. Tab: Syllabus

Content: rendered Markdown from `GET /api/syllabi/course/{id}`.

```
syllabus-content max-width 65ch, margin: space-8 0
IBM Plex Sans, 1rem, 1.5 line-height
Headings inside markdown: h2→subhead tier, h3→body tier 600
```

Use a Markdown renderer (e.g. `react-markdown`, MIT license). Sanitise with `rehype-sanitize` — content is instructor-authored, not user-generated, but sanitise as defence.

**Empty state:** "No syllabus published for this course yet." (no CTA for student).

---

## 5. Tab: Content

List of course materials. Layout: dense list (not cards).

```
[icon]  Title                         Type    Uploaded
────────────────────────────────────────────────────
📄  Lecture 1: Introduction          PDF     2 days ago   →
🎬  Lecture 1 Recording              Video   2 days ago   →
📝  Week 2 Notes                     Doc     yesterday    →
```

Icon per ContentType: PDF `bi-file-earmark-pdf`, Video `bi-play-circle`, Link `bi-link-45deg`, Document `bi-file-earmark-text`.

Click row → opens `content.uri` in new tab (`target="_blank" rel="noopener noreferrer"`).

**Empty state:** "No materials uploaded yet."

---

## 6. Tab: Assessments

List of assessments with student's submission status. Same dense list pattern.

```
Assessment          Type        Due          Status        Score
──────────────────────────────────────────────────────────────
PSet 4              Assignment  Nov 5 11:59  Graded        24/25
Quiz 3              Quiz        Oct 28       Graded        18/20
Midterm             Exam        Oct 15       Graded        82/100
Final Project       Assignment  Dec 10       Not submitted  —/50
```

Status badges (icon + label, never color alone):
- `Graded`: success-50 bg, success-500 text, `bi-check-circle`
- `Submitted`: brand-100 bg, brand-700 text, `bi-hourglass-split`
- `Late`: warn-50 bg, warn-500 text, `bi-exclamation-triangle`
- `Not submitted`: neutral-100 bg, neutral-600 text, `bi-dash`
- `Overdue` (past due, no submission): danger-50 bg, danger-500 text, `bi-x-circle`

Click row for unsubmitted/overdue → `/assessments/{id}/submit`.
Click row for submitted → `/assessments/{id}/submit` (shows submission status, no re-submit unless instructor allows).

All score values: `font-variant-numeric: tabular-nums`.

---

## 7. Tab: Discussions

List of discussion threads.

```
Discussion title                  Posts  Status    Last post
──────────────────────────────────────────────────────────
Week 1 Introduction Thread        12     Open      2h ago
Final Project Questions           3      Open      yesterday
Midterm Prep Discussion           28     Closed    3 weeks ago
```

Click row → `/discussions/{id}`.

**Empty state:** "No discussions yet." (no CTA for student — can't start a thread, only instructors can per backend spec).

---

## 8. States (all tabs)

| State | Render |
|---|---|
| Tab loading | Skeleton rows/lines preserving rhythm |
| Empty (no data) | Per-tab empty state (see above) |
| Error | Stale banner below tab bar |
| Course not found (bad :id) | Redirect to `/404` |
| Not enrolled in this course | Alert: "You are not enrolled in this course." with link back to `/courses` |

---

## 9. Semantic HTML

```html
<main>
  <nav aria-label="Back"><a href="/courses">← Back to courses</a></nav>
  <header>
    <h1 class="course-code">CS-301</h1>
    <p class="course-title">Algorithms</p>
    <p class="course-meta">Prof. Anjali Iyer · Fall 2026 · Room TS-201
      <span class="grade-pill" aria-label="Current grade B+">B+</span>
    </p>
  </header>
  <div role="tablist" aria-label="Course sections">
    <button role="tab" aria-selected="true" aria-controls="tab-syllabus">Syllabus</button>
    <button role="tab" aria-selected="false" aria-controls="tab-content">Content</button>
    <button role="tab" aria-selected="false" aria-controls="tab-assessments">Assessments</button>
    <button role="tab" aria-selected="false" aria-controls="tab-discussions">Discussions</button>
  </div>
  <div id="tab-syllabus" role="tabpanel">...</div>
</main>
```

Bootstrap's `<Tabs>` handles `role="tab"` and `aria-selected` natively. Verify it uses `role="tabpanel"` and correct `aria-controls` associations.

---

## 10. Responsive

<768px: tabs scroll horizontally if they overflow (Bootstrap's default behavior — acceptable). Course header metadata wraps to 2 lines. Back link stays top-left.

---

## 11. Motion

Tab switch: 200ms fade between tab panels (opacity 0→1, ease-out-expo). No slide — slide on tabs causes content jump on mobile.

---

## 12. Implementation notes

1. `?tab=` sync: `const [searchParams, setSearchParams] = useSearchParams()`. Default to `syllabus` if param absent.
2. Lazy tab loading: only fetch current tab's API on activation. Use a `loaded` set in component state to prevent re-fetching on tab revisit.
3. `react-markdown` + `rehype-sanitize`: install both. Instructor-authored markdown rendered as-is; student-generated content would need stricter sanitisation.
4. Assessment row click: check `submission.status` before navigating — if graded, navigate to submission detail view, not the submit form.
