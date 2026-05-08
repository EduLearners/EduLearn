# Page Spec — Gradebook

**Route:** `/teaching/sections/:id/gradebook`
**Component:** `src/pages/educator/GradebookPage.tsx`
**Persona:** Educator (Instructor + DeptAdmin)
**Status:** Ready for implementation — primary Educator demo flex

---

## 1. Purpose

Dense spreadsheet-style view of all student scores for a section. One row per student, one column per assessment. Clicking a score cell opens a grading Offcanvas. The evaluator demo shows this surface as proof of complex data-handling capability.

**Scene:** "Prof. Iyer, laptop, 4pm, grading 25 PSet 4 submissions in sequence. Each click costs time. The design must make the grading loop as fast as possible."

---

## 2. API

```
GET /api/sections/{id}                          — section + course metadata
GET /api/assessments/course/{courseId}          — assessment list (columns)
GET /api/enrollments/section/{id}               — student roster (rows)
GET /api/submissions/assessment/{assessmentId}  — all submissions per assessment
POST /api/submissions/{id}/grade                — { score, reason }
GET /api/grade-changes/submission/{id}          — grade history (in Offcanvas)
```

All fetched in parallel on mount. Submissions data normalised client-side into a `scores[studentId][assessmentId]` map.

---

## 3. Layout

```
← Back to CS-301 sec A

CS-301 sec A — Gradebook                    ← h1
Fall 2026  ·  25 students                   ← secondary

Assessment filter: [All assessments ▾]   [Filter: Ungraded ▾]

┌──────────────────────┬─────────┬─────────┬─────────┐
│ Student              │ PSet 4  │ Quiz 3  │ Midterm │  ← sticky header
│                      │ /25     │ /20     │ /100    │
├──────────────────────┼─────────┼─────────┼─────────┤
│ Aarav Mehta ←sticky  │  [24]   │  [18]   │  [82]   │
│ Diya Bhat            │  [ — ]  │  [17]   │  [79]   │
│ Karan Joshi          │  [22]   │  [ — ]  │  [—]    │
│ Priya Sharma         │  [25]   │  [20]   │  [95]   │
│ ...                  │  ...    │  ...    │  ...    │
└──────────────────────┴─────────┴─────────┴─────────┘

Row avg:              [23.1]   [18.8]   [83.2]      ← pinned footer row
```

**Container:** full-width (`container-fluid`). No max-width — gradebook needs all available horizontal space.

**Table:**
- `position: sticky; top: {topBar + pageHeader}px` on `<thead>` — header stays visible while scrolling vertically
- `position: sticky; left: 0` on the student name `<td>/<th>` — name stays visible while scrolling horizontally
- Student name column: 200px min-width
- Score columns: 80px min-width each
- Horizontal scroll on the table container when columns overflow

---

## 4. Score cell interaction

Each score cell is a `<td>` with `cursor: pointer`, `tabindex="0"`.

**States:**

| Cell state | Display | Background |
|---|---|---|
| Graded | `24` (Plex Mono tabular) | `neutral-0` |
| Not submitted | `—` | `neutral-50` |
| Late submission | `24` + `bi-exclamation-triangle` (14px warn-500) | `warn-50` |
| Ungraded (submitted, no score) | `bi-hourglass-split` icon | `brand-50` |
| Hover | 4% brand tint | brand-50 |
| Focus-visible | 2px brand-500 outline | brand-50 |
| Currently open (Offcanvas active) | 8% brand tint | brand-100 |

Click or Enter key → opens `<GradingOffcanvas>` for that student+assessment combination.

---

## 5. Grading Offcanvas — detailed spec

Bootstrap `<Offcanvas placement="end">`, width 400px, `backdrop={false}` (table remains visible and interactive behind it).

```
┌────────────────────────────────────────┐
│ Aarav Mehta                        ×  │  ← student name h2 + close
│ PSet 4 · CS-301 · Submitted Nov 5      │  ← secondary meta
│                                        │
│ [View submission ↗]                   │  ← opens fileUri in new tab
│                                        │
│ Score (out of 25)                      │  ← label
│ [_24__________]                        │  ← NumberField input, min=0 max=25
│                                        │
│ [Save grade ✓]     [Cancel]           │  ← primary + ghost buttons
│                                        │
│ ─────────────────────────────────────  │
│ Grade history                          │  ← h3, append-only
│ Nov 5 11:43pm  Prof. Iyer  → 24 / 25  │  ← oldest last, Plex Mono on numbers
└────────────────────────────────────────┘
```

**Navigation between students:** After saving, Offcanvas stays open and advances to next ungraded student in the visible rows. Keyboard shortcut for demo: Enter key in score field submits + advances.

**No re-grade warning:** Per backend, each grade call creates a new GradeChange entry. No confirmation dialog — grade history is the audit trail. Design principle 4 (read-only is first-class) satisfied by showing grade history in the panel itself.

**Offcanvas close:** × button or Escape key. Focus returns to the cell that opened it.

---

## 6. Assessment column filter

`<Form.Select>` — options: "All assessments" + each assessment title. Selecting one hides other columns (client-side show/hide). Useful when grading one assignment at a time.

"Ungraded" filter: shows only rows where the selected assessment has `submission.status !== 'Graded'`.

---

## 7. Row average footer

Pinned `<tfoot>` row:
```html
<tfoot>
  <tr>
    <th>Class avg</th>
    <td>23.1</td>  ← mean of graded scores, Plex Mono tabular-nums
    <td>18.8</td>
    <td>83.2</td>
  </tr>
</tfoot>
```

Only graded scores counted in average. "—" cells excluded. Average updates reactively after each grade save (React Query invalidation).

---

## 8. States

| State | Render |
|---|---|
| Loading | Skeleton table (5 rows × 3 cols) |
| Empty section | "No students enrolled in this section." |
| No assessments | "No assessments published for this course yet." |
| All graded (filter=Ungraded) | "All submissions graded." — empty state |
| Grading save error | Toast: error from error-messages.md §4 ("Score must be between 0 and {max}") |
| Grading save success | Score cell updates inline, Offcanvas advances to next student |

---

## 9. Semantic HTML

```html
<main aria-label="Gradebook for CS-301 section A">
  <div class="table-responsive">
    <table class="table gradebook-table">
      <caption class="visually-hidden">CS-301 Algorithms, Section A, Fall 2026</caption>
      <thead>
        <tr>
          <th scope="col" class="student-col sticky-col">Student</th>
          <th scope="col">PSet 4 <span class="max">/25</span></th>
          ...
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="student-name sticky-col"><a href="/teaching/sections/{id}/roster/{studentId}">Aarav Mehta</a></td>
          <td
            class="score-cell"
            tabIndex={0}
            role="button"
            aria-label="PSet 4 score for Aarav Mehta: 24 out of 25. Click to grade."
            onClick={openOffcanvas}
            onKeyDown={handleKeyDown}
          >24</td>
        </tr>
      </tbody>
      <tfoot>
        <tr>
          <th scope="row">Class avg</th>
          <td aria-label="Class average for PSet 4: 23.1">23.1</td>
        </tr>
      </tfoot>
    </table>
  </div>
  <GradingOffcanvas ... />
</main>
```

Score cell `role="button"` + `aria-label` gives screen readers full context: "PSet 4 score for Aarav Mehta: 24 out of 25. Click to grade."

---

## 10. Responsive

<1024px: assessment filter collapses to icon button with dropdown. Student name column shrinks to 140px. <768px: gradebook shows one assessment at a time (assessment selector becomes primary navigation). Offcanvas becomes full-width.

---

## 11. Implementation notes

1. Sticky columns: `position: sticky; left: 0; z-index: var(--z-elevated); background: inherit` on `.sticky-col`. Background must be explicit (not transparent) to cover scrolling content behind it.
2. Score normalisation: `const scores = submissions.reduce((acc, sub) => { acc[sub.studentId] = acc[sub.studentId] || {}; acc[sub.studentId][sub.assessmentId] = sub; return acc; }, {})`.
3. React Query mutation on grade save: `useMutation` + `onSuccess: () => queryClient.invalidateQueries(['submissions', assessmentId])`. Score cell updates immediately via optimistic update.
4. `backdrop={false}` on Offcanvas: instructor should be able to click other cells without closing the panel. But clicking a different cell should close the current one and open for the new target.
5. Grade calculation to letter grade: define a `scoreToLetterGrade(score, max)` util. Standard Indian grading (A+ ≥95%, A ≥90%, A- ≥85%, B+ ≥80%, B ≥75%, B- ≥70%, C+ ≥65%, C ≥60%, D ≥50%, F <50%). Confirm scale with backend grading rubric if present.
