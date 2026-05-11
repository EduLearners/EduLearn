# Page Spec — Grades

**Route:** `/grades`
**Component:** `src/pages/learner/MyGradesPage.tsx`
**Persona:** Learner
**Status:** Ready for implementation

---

## 1. Purpose

Complete grade history across all enrolled courses. DataTable grouped by course, all scores tabular-nums. Dense, scannable. Equivalent to an academic grade report.

---

## 2. API

`GET /api/submissions/student/{me}` — all submissions with assessment details, scores, statuses. Client-side grouping by courseId.

---

## 3. Layout

```
h1 "Grades"             Term filter [Fall 2026 ▾]     GPA  3.4
────────────────────────────────────────────────────────────────

CS-301 Algorithms                           ▾   Course avg: B+
────────────────────────────────────────────────────────────────
Assessment       Type        Due      Submitted  Score  Max  Grade
PSet 4           Assignment  Nov 5    Nov 5      24     25   A−
Quiz 3           Quiz        Oct 28   Oct 28     18     20   B+
Midterm          Exam        Oct 15   Oct 15     82     100  B
────────────────────────────────────────────────────────────────

PHIL-220 Ethics in AI                       ▾   Course avg: A−
────────────────────────────────────────────────────────────────
Essay 1          Assignment  Nov 8    Nov 9      45     50   A−
────────────────────────────────────────────────────────────────
```

GPA display: right-aligned in header row, IBM Plex Mono, `font-variant-numeric: tabular-nums`. Label: "GPA" caption tier neutral-600, value subhead tier neutral-900.

---

## 4. Course group rows

Each course group:
- **Group header row:** `neutral-50` background, `padding: space-3 space-4`. Course code (Plex Mono 600 neutral-900) + course name (Plex Sans 500 neutral-700) + course average grade pill (right-aligned). Click to collapse/expand. Chevron icon rotates 180deg on collapse (200ms ease-out-expo).
- **Table rows:** standard Bootstrap `.table` rows within the group.
- **Default state:** all groups expanded.

---

## 5. Table columns

| Column | Width | Type | Notes |
|---|---|---|---|
| Assessment | flex-grow | Text | Name of assessment. Clickable → `/assessments/{id}/submit` |
| Type | 90px | Badge | Quiz/Assignment/Exam — neutral badge |
| Due | 90px | Date | `tabular-nums`, short format (Nov 5) |
| Submitted | 90px | Date or "—" | "—" if not submitted |
| Score | 60px | Number | `tabular-nums`. "—" if not graded |
| Max | 50px | Number | `tabular-nums` |
| Grade | 70px | Badge | Color-coded (same as Assessments tab in course-detail) |

All numeric columns: `text-align: right; font-variant-numeric: tabular-nums`.

---

## 6. Grade badges

| Grade | Background | Text |
|---|---|---|
| A, A+ | `success-50` | `success-500` |
| A−, B+, B | `brand-100` | `brand-700` |
| B−, C+, C | `warn-50` | `warn-500` |
| D, F | `danger-50` | `danger-500` |
| Not graded (submitted) | `neutral-100` | `neutral-600` — "Pending" |
| Not submitted | `neutral-100` | `neutral-500` — "—" |

---

## 7. States

| State | Render |
|---|---|
| Loading | Skeleton table rows (3 per group × 2 groups) |
| No submissions | Empty state: "No grades recorded yet. Grades will appear here after your assessments are graded." |
| No submissions this term | Filter shows empty — "No grades for Fall 2026." with "All terms" link |
| Error | Stale banner |

---

## 8. A11y

- `<caption>` on each course table: "Grades for CS-301 Algorithms, Fall 2026"
- Group header row uses `<th scope="colgroup">` pattern or `<button>` with `aria-expanded`
- Grade badge: `aria-label="Grade A minus"` — screen reader avoids ambiguous "A−"
- Score column: `<th scope="col">` with `aria-label="Score out of maximum"`

---

## 9. Responsive

<768px: hide "Due" and "Submitted" columns. Show Assessment + Score + Max + Grade. Score/Max collapse to "Score" = "24/25" format (one column). Horizontal scroll if still too wide.

---

## 10. Implementation notes

1. Group by `assessment.courseId` client-side. Sort groups by course code alphabetically. Sort rows within group by `assessment.dueAt` descending (most recent first).
2. GPA calculation: not re-computed on frontend — use `student.gpa` from the student record API (`GET /api/students/{me}`). Displayed as read-only stat.
3. Collapse state: `useState<Set<string>>` tracking collapsed course IDs. Persist to `sessionStorage` so collapse state survives tab switches.
4. Late submission detection: compare `submission.submittedAt` to `assessment.dueAt` — if `submittedAt > dueAt`, show warn badge "Late".
