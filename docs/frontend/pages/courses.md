# Page Spec — My Courses

**Route:** `/courses`
**Component:** `src/pages/learner/MyCoursesPage.tsx`
**Persona:** Learner
**Status:** Ready for implementation

---

## 1. Purpose

Full list of enrolled courses. Expands the dashboard "My courses" widget to add filter, sort, and search. Entry point to each course detail.

---

## 2. API

`GET /api/enrollments/student/{me}` — returns enrollments with joined course, section, instructor, current grade. Cached 5 min.

---

## 3. Layout

```
Page header row (sticky, 56px below top bar):
  h1 "My courses" (subhead)   Term filter [Fall 2026 ▾]   Sort [Last updated ▾]

Course grid (auto-fit minmax 280px):
  <CourseCard> × N

Empty state (no enrollments):
  <EmptyState> "You are not enrolled in any courses yet."
               CTA: "Browse course catalogue" → /enrollment/browse
```

**No search bar** — student has at most ~8 courses per term. Filter by term is sufficient.

**Term filter** — `<Form.Select>` populated from distinct terms in enrollment data. Defaults to current term. "All terms" option shows historical enrollments.

---

## 4. Course card (same as dashboard, full detail visible)

```
┌──────────────────────────────────────┐
│  CS-301              [B+]            │ ← Plex Mono + grade pill
│  Algorithms                          │ ← Plex Sans 500 secondary
│  [JD] Prof. Iyer  ·  Fall 2026       │ ← avatar 24px + secondary
│  Enrolled · 2 hours ago              │ ← status pill + relative time
└──────────────────────────────────────┘
```

Status pill (new vs dashboard): shows enrollment status — `Enrolled` (brand-100 bg brand-700 text), `Waitlisted` (warn-50 bg warn-500 text), `Dropped` (neutral-100 bg neutral-600 text).

Click → `/courses/:id?tab=syllabus`

---

## 5. States

| State | Render |
|---|---|
| Loading | 6 skeleton cards |
| Default | Card grid |
| Empty (no enrollments this term) | `<EmptyState>` with CTA |
| All terms (historical) | Cards include past terms, status pill shows "Completed" (success-50 bg success-500 text) |
| Error | Stale banner |

---

## 6. A11y

- `<h1>` "My courses". Term filter `<label>` associated with `<select>`.
- Card `aria-label="CS-301 Algorithms. Fall 2026. Grade B+. Prof. Iyer. Last updated 2 hours ago."`.

---

## 7. Responsive

≥1024px: 3 cols. 768–1023px: 2 cols. <768px: 1 col. Term filter + sort controls stack vertically at <640px.

---

## 8. Implementation notes

1. Term list: `[...new Set(enrollments.map(e => e.term))].sort()` — derive from API data, don't hardcode.
2. Sort options: "Last updated" (default), "Course code A–Z", "Grade (high–low)".
3. `?tab=syllabus` default tab passed on navigation — always open Syllabus first.
