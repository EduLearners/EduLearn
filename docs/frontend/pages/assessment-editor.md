# Page Spec — Assessment Editor

**Routes:** `/teaching/assessments/new` (create) + `/teaching/assessments/:id/edit` (edit Draft only)
**Component:** `src/pages/educator/AssessmentEditorPage.tsx`
**Persona:** Educator
**Status:** Ready for implementation

---

## 1. Purpose

Create and manage assessments through their lifecycle: Draft → Published → Closed. Editing is only permitted when status = Draft. Published assessments show read-only view with a Close action only.

---

## 2. API

```
GET  /api/assessments/{id}           — load for edit (if :id route)
POST /api/assessments                — create { courseId, sectionId, title, type, dueAt, maxScore, gradingRubricJSON }
PUT  /api/assessments/{id}           — update (Draft only)
PUT  /api/assessments/{id}/publish   — { status: "Published" | "Closed" }
```

---

## 3. Layout

```
← Back to assessments

Action bar (sticky):
  [Save draft]    [Publish]             ← status = Draft
  [Close assessment]                    ← status = Published (no edit)
  [Closed]  (read-only badge)           ← status = Closed

Assessment details                      ← h1 (or "New assessment" for /new)

Title                                   ← required
[_________________________________]

Type                  Course            Section (optional)
[Assignment ▾]        [CS-301 ▾]        [Section A ▾]

Due date              Due time          Max score
[2026-11-05]          [23:59]           [25]

────────────────────────────────────────

Grading rubric (optional)               ← h2

  #   Criterion              Max pts   ×
  1   [Correctness        ]  [15  ]    ×
  2   [Code quality       ]  [10  ]    ×

  Total: 25 pts               ← real-time sum, updates on blur
  [+ Add criterion]
```

Max-width 720px, centered. No card wrapping — sections separated by `<hr>`.

---

## 4. Form fields

| Field | Component | Validation |
|---|---|---|
| Title | `<Form.Control type="text">` | Required, max 200 chars |
| Type | `<Form.Select>` | Required. Options: Assignment, Quiz, Exam |
| Course | `<Form.Select>` | Required. Populated from instructor's courses |
| Section | `<Form.Select>` | Optional. Populated from selected course's sections |
| Due date | `<input type="date">` | Required. Must be in future (on create) |
| Due time | `<input type="time">` | Required. Defaults to 23:59 |
| Max score | `<Form.Control type="number" min="1" max="1000">` | Required. Integer only |

Date + time rendered side-by-side on one row. Combined into a single ISO datetime for the API.

---

## 5. Rubric builder

```jsx
<section aria-label="Grading rubric">
  <h2>Grading rubric <span>(optional)</span></h2>
  <table className="table table-sm rubric-table">
    <thead>
      <tr>
        <th style={{width: '2rem'}}>#</th>
        <th>Criterion</th>
        <th style={{width: '90px'}}>Max pts</th>
        <th style={{width: '2rem'}}></th>
      </tr>
    </thead>
    <tbody>
      {criteria.map((c, i) => (
        <tr key={c.id}>
          <td className="tabular text-muted">{i + 1}</td>
          <td>
            <Form.Control
              type="text"
              value={c.criterion}
              onChange={...}
              placeholder="e.g. Correctness"
              aria-label={`Criterion ${i + 1} name`}
            />
          </td>
          <td>
            <Form.Control
              type="number"
              min="1"
              value={c.maxPoints}
              onChange={...}
              className="tabular"
              aria-label={`Criterion ${i + 1} max points`}
            />
          </td>
          <td>
            <button
              type="button"
              onClick={() => removeCriterion(i)}
              aria-label={`Remove criterion ${i + 1}`}
              className="btn-close btn-sm"
            />
          </td>
        </tr>
      ))}
    </tbody>
    <tfoot>
      <tr>
        <td colSpan={2} className="text-muted caption">Total</td>
        <td className="tabular fw-600 brand-700">{totalPoints}</td>
        <td></td>
      </tr>
    </tfoot>
  </table>
  <Button variant="outline-secondary" size="sm" onClick={addCriterion}>
    <i className="bi bi-plus" aria-hidden="true" /> Add criterion
  </Button>
</section>
```

**Total validation:** if rubric exists, `sum(criteria.maxPoints)` must equal `maxScore`. Show warn inline below total: "Rubric total (25) must match max score (25)." Non-blocking warning (user can still save draft).

**Rubric serialisation:** on save, `gradingRubricJSON = JSON.stringify(criteria.map(c => ({ criterion: c.criterion, maxPoints: c.maxPoints, description: '' })))`.

---

## 6. Action bar — status lifecycle

**Status = Draft:**
```
[Save draft]  [Publish]
```
- "Save draft" → `PUT /api/assessments/{id}` — saves without status change
- "Publish" → confirms inline (no modal): a `<Collapse>` panel slides open:
  ```
  Once published, students can submit. Fields cannot be edited.
  [Confirm and publish]  [Cancel]
  ```
  Confirmed → `PUT /api/assessments/{id}/publish { status: "Published" }`. On success: action bar switches to Published state.

**Status = Published:**
```
[Published]  (read-only badge, success-50 bg)     [Close assessment]
```
- All form fields disabled (`readOnly` or `disabled`)
- "Close assessment" → same inline confirm: "Students will no longer be able to submit. Grading can proceed."
  Confirmed → `PUT /api/assessments/{id}/publish { status: "Closed" }`.

**Status = Closed:**
```
[Closed]  (neutral-100 bg)
```
- All fields disabled. No actions. Read-only view.

**Inline confirm pattern** (not a modal — per impeccable absolute ban on modal-as-first-thought):
```jsx
{showConfirm && (
  <Alert variant="warning" className="mt-3">
    <p>{confirmMessage}</p>
    <Button variant="warning" size="sm" onClick={handleConfirm}>
      {confirmLabel}
    </Button>{' '}
    <Button variant="link" size="sm" onClick={() => setShowConfirm(false)}>
      Cancel
    </Button>
  </Alert>
)}
```

---

## 7. States

| State | Render |
|---|---|
| New assessment | Empty form, title placeholder "e.g. PSet 4" |
| Loading existing | Skeleton form fields |
| Saving | Save button: "Saving..." + spinner, fields enabled |
| Save success | Toast "Draft saved." 2s auto-dismiss |
| Save error | Toast error from error-messages.md §2 |
| Published (read-only) | Fields disabled, publish confirm replaced by close action |
| Closed (read-only) | All actions removed |
| Validation error (pre-submit) | Per-field errors below each field |

---

## 8. Semantic HTML

```html
<main aria-label="Assessment editor">
  <header class="action-bar" aria-label="Assessment actions">
    <nav aria-label="Back"><a>← Back to assessments</a></nav>
    <div class="action-buttons">...</div>
  </header>
  <form aria-label="Assessment details" noValidate>
    <h1>{title || "New assessment"}</h1>
    ...
    <section aria-label="Grading rubric">
      <h2>Grading rubric</h2>
      ...
    </section>
  </form>
</main>
```

---

## 9. Responsive

<768px: Type/Course/Section selects stack vertically (each full-width). Date/time/maxScore stack vertically. Rubric table: criterion name full-width row, max pts and delete on second row.

---

## 10. Implementation notes

1. Course dropdown: populated from `GET /api/sections?instructorId={me}&term={current}`, extract distinct courses. On course change, repopulate Section dropdown.
2. Combined datetime: `const dueAt = new Date(`${dueDate}T${dueTime}`).toISOString()`.
3. Rubric total live update: `const total = criteria.reduce((sum, c) => sum + (Number(c.maxPoints) || 0), 0)` — recalculates on any criterion change.
4. Rubric total ≠ maxScore: show `<Alert variant="warning">` inline, not a toast. Non-blocking.
5. For `/new` route: no GET on mount. For `/:id/edit`: GET on mount, populate form.
6. Unsaved changes warning: `useBeforeUnload` hook — prompt "You have unsaved changes. Leave without saving?" when navigating away with dirty form state.
