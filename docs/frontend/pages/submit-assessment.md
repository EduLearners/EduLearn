# Page Spec — Submit Assessment

**Route:** `/assessments/:id/submit`
**Component:** `src/pages/learner/SubmitAssessmentPage.tsx`
**Persona:** Learner
**Status:** Ready for implementation

---

## 1. Purpose

Student submits a file for an assessment, or views their existing submission if already submitted. Single-purpose page — minimal chrome, focused task.

---

## 2. API

```
GET  /api/assessments/{id}         — assessment metadata, dueAt, maxScore, rubric
GET  /api/submissions/student/{me} — check if already submitted for this assessment
POST /api/submissions              — submit { assessmentId, studentId, fileUri }
```

---

## 3. Layout

```
← Back to {course name}             [action bar — breadcrumb only]

PSet 4                              ← h1, assessment title
CS-301 Algorithms  ·  Assignment    ← breadcrumb context, secondary
Due: Tuesday, Nov 5 at 11:59 pm     ← due date, warn-500 if within 24h, danger-500 if overdue

────────────────────────────────────

Grading rubric                      ← h2 (collapsible <details>)
▼  [ show rubric table ]

────────────────────────────────────

Your submission                     ← h2

[  Drop file here or click to select  ]   ← file drop zone
[  or browse files  ]                     ← file input trigger
   Accepted: PDF, DOCX, ZIP (max 10 MB)  ← caption, neutral-600

[Submit assignment]                 ← primary button, full-width at <640px

────────────────────────────────────
Already submitted? View your submission below.  ← conditional
```

Max-width 640px, centered. Form sits on `neutral-0` directly, no card wrapping.

---

## 4. Grading rubric (collapsible)

```html
<details>
  <summary>Grading rubric</summary>
  <table class="table table-sm">
    <thead>
      <tr><th>Criterion</th><th>Points</th><th>Description</th></tr>
    </thead>
    <tbody>
      <tr><td>Correctness</td><td>15</td><td>...</td></tr>
      <tr><td>Code quality</td><td>10</td><td>...</td></tr>
    </tbody>
    <tfoot>
      <tr><th>Total</th><th>25</th><td></td></tr>
    </tfoot>
  </table>
</details>
```

`<details>` closed by default — rubric is reference material, not the primary task. All point values: tabular-nums.

---

## 5. File drop zone

```
┌─────────────────────────────────────────────────┐
│                                                 │
│  bi-cloud-upload (48px, neutral-400)            │
│                                                 │
│  Drop your file here, or [browse files]         │ ← "browse files" is a <label> for hidden input
│                                                 │
│  PDF, DOCX, ZIP · Max 10 MB                     │
│                                                 │
└─────────────────────────────────────────────────┘
```

Border: `2px dashed neutral-300`, `border-radius: 8px`, `padding: space-12`, background `neutral-50`.

Drag-over state: `border-color: brand-500`, `background: brand-50`.

After file selected: drop zone replaced by:
```
📄  assignment-final.pdf    (2.4 MB)    [×]
```
File name (Plex Mono), size (neutral-600 caption), remove button (`×`) clears selection.

Error states: file too large → inline error below zone. Wrong type → inline error. Both from `error-messages.md §3`.

---

## 6. Submit button states

Per component-map.md Button states:
- Default: "Submit assignment"
- Disabled (no file selected): disabled state
- Loading: "Submitting..." + spinner
- Success: navigate back to `/courses/:id?tab=assessments` + toast "Submitted successfully."
- Error: inline error below button (from error-messages.md §4)

---

## 7. Already-submitted state

If `GET /api/submissions/student/{me}` returns an existing submission for this assessment:

```
Your submission
──────────────
📄  assignment-final.pdf              ← filename
Submitted: Tuesday, Nov 5 at 11:43 pm  ← exact datetime
Status:  [Graded]  24 / 25             ← status badge + score (if graded)

[View feedback]   ← if status = Graded/Returned, opens grade change history inline
```

File upload zone hidden. Submit button hidden. No re-submission unless assessment status allows it.

---

## 8. Assessment status edge cases

| Assessment status | Student sees |
|---|---|
| Draft | Alert: "This assessment is not published yet." — form hidden |
| Closed / Archived | Alert: "This assessment is closed and no longer accepting submissions." — form hidden |
| Past due, no submission | Due date shows in danger-500. Form still visible (late submission allowed) |
| Late submission posted | Yellow warn banner: "This was submitted after the deadline..." (error-messages.md §4) |

---

## 9. Semantic HTML

```html
<main aria-label="Submit assessment">
  <nav aria-label="Back"><a href="/courses/{id}?tab=assessments">← Back to {course}</a></nav>
  <h1>{assessment.title}</h1>
  <p class="meta">{course.code} · {assessment.type}</p>
  <p class="due-date" aria-label="Due {fullDate}">Due: {formattedDate}</p>
  <details aria-label="Grading rubric">
    <summary>Grading rubric</summary>
    ...
  </details>
  <section aria-label="Your submission">
    <h2>Your submission</h2>
    <div role="region" aria-label="File upload area">
      <input type="file" id="file-upload" accept=".pdf,.docx,.zip" aria-label="Choose file to submit" />
      <label for="file-upload">Drop file here or browse files</label>
    </div>
    <div role="alert" aria-live="assertive" class="error" />
    <button type="submit">Submit assignment</button>
  </section>
</main>
```

---

## 10. Responsive

<640px: drop zone full-width, submit button full-width. Rubric table scrolls horizontally.

---

## 11. Implementation notes

1. File upload is a URI field in the API — no multipart endpoint exists. For v1: store file in a simulated blob URI string (e.g. `file://filename.pdf`) or implement a simple local file reference. Coordinate with backend on file storage approach before implementation.
2. `accept=".pdf,.docx,.zip"` on the input — browser validates type before API call.
3. Max 10 MB: validate `file.size <= 10 * 1024 * 1024` before enabling submit.
4. Drag-and-drop: `onDragEnter`/`onDragLeave`/`onDrop` on the drop zone div. `onDrop` calls `e.preventDefault()` to prevent browser default file-open behavior.
