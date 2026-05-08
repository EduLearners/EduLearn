# Page Spec — Plagiarism Resolve

**Routes:** `/admin/plagiarism/queue` (list) + `/admin/plagiarism/:id` (detail)
**Component:** `src/pages/governance/PlagiarismQueuePage.tsx` + `PlagiarismDetailPage.tsx`
**Persona:** Governance (ITAdmin only — Auditor cannot see this per role-nav.md §5)
**Status:** Ready for implementation

---

## 1. Purpose

ITAdmin reviews flagged plagiarism reports and resolves them as Confirmed or Dismissed. Affects whether the submission gets a grade penalty (backend concern) and the student's academic-integrity record visible on the Learner Dashboard.

---

## 2. API

```
GET /api/plagiarism?status=Pending&limit=50      — queue list
GET /api/plagiarism/{id}                         — report detail
PUT /api/plagiarism/{id}/status                  — { status: "Confirmed" | "Dismissed" }
GET /api/submissions/{submissionId}              — linked submission detail
```

---

## 3. Queue layout (`/admin/plagiarism/queue`)

```
h1 "Plagiarism queue"
2 pending review

Status filter: [Pending ▾]   [All cases]

Student          Course        Assessment      Similarity   Flagged by      Flagged
──────────────────────────────────────────────────────────────────────────────────────
Aarav Mehta      CS-301        PSet 3          78%          Prof. Iyer      2 days ago  →
Karan Joshi      PHIL-220      Essay 1         62%          Prof. Bhatt     yesterday   →
```

Similarity % column: color-coded, tabular-nums, right-aligned.
- ≥80%: `danger-500` text
- 60–79%: `warn-500` text
- <60%: `neutral-600` text

Click row → navigate to `/admin/plagiarism/{id}` (full-page detail — this decision has significant consequences, so ITAdmin should review fully before acting).

---

## 4. Detail layout (`/admin/plagiarism/:id`)

```
← Back to plagiarism queue

Plagiarism report #47                      ← h1

Student        Aarav Mehta  (MRN 2024-0042)
Course         CS-301 Algorithms
Assessment     PSet 3
Section        Section A
Flagged by     Prof. Anjali Iyer
Flagged        Nov 6, 2026 at 2:14 pm

Status: [Pending]

──────────────────────────────────────────

Similarity analysis                        ← h2

  Similarity score    78%                  ← large, warn-500 if ≥60, danger-500 if ≥80
  Details             {report details text}

──────────────────────────────────────────

Submission                                 ← h2

  Submitted           Nov 5 at 11:43 pm
  [View submission ↗]                      ← opens submission file in new tab

──────────────────────────────────────────

Resolution                                 ← h2

  [Confirm plagiarism]     [Dismiss]       ← both with inline confirmation
```

Max-width 720px, centered.

---

## 5. Resolution actions with inline confirmation

**Confirm plagiarism:**

Click `[Confirm plagiarism]` → inline Collapse opens:

```jsx
<Alert variant="danger">
  <p>Confirming plagiarism will flag this student's record and may affect their grade.</p>
  <Button variant="danger" size="sm">Confirm plagiarism</Button>{' '}
  <Button variant="link" size="sm">Cancel</Button>
</Alert>
```

On confirm: `PUT /api/plagiarism/{id}/status { status: "Confirmed" }`. Status badge updates to danger-50/danger-500 "Confirmed". Action buttons hidden. Toast "Plagiarism confirmed."

**Dismiss:**

Click `[Dismiss]` → inline Collapse:

```jsx
<Alert variant="warning">
  <p>Dismissing will close this report. The submission will not be flagged.</p>
  <Button variant="warning" size="sm">Dismiss report</Button>{' '}
  <Button variant="link" size="sm">Cancel</Button>
</Alert>
```

On confirm: `PUT /api/plagiarism/{id}/status { status: "Dismissed" }`. Status badge → neutral "Dismissed". Toast "Report dismissed."

---

## 6. States

| State | Render |
|---|---|
| Queue loading | Skeleton rows (3) |
| Queue empty (no pending) | "No pending plagiarism reports." — shown as success, not empty-state anxiety |
| Detail loading | Skeleton sections |
| Already resolved | Status badge (Confirmed/Dismissed). Resolution buttons hidden. Read-only view. |
| Resolution submitting | Buttons disabled + spinner |
| Error | Toast from error-messages.md §8 |

---

## 7. A11y

- Queue table `<caption>`: "Plagiarism reports queue".
- Similarity score: `aria-label="Similarity score: 78 percent"` — screen reader reads "78 percent" not "78%".
- Confirm/Dismiss buttons: `aria-label="Confirm plagiarism for Aarav Mehta, PSet 3"` — disambiguates when multiple reports open.
- Inline confirmation Alert: `role="alertdialog"` with `aria-modal="false"` — announces to screen reader without trapping focus.

---

## 8. Responsive

Queue <768px: hide "Flagged by" column. Show Student + Similarity + Flagged date. Detail: sections stack naturally.

---

## 9. Implementation notes

1. Status filter on queue: `?status=Pending` default. "All cases" shows Pending + Confirmed + Dismissed for historical review.
2. Report details field: plain text rendered as `<pre>` with `white-space: pre-wrap; font-family: $font-family-mono` if it contains structured data, or as a paragraph if prose.
3. Status update is final — no un-confirm or un-dismiss. The resolution buttons permanently hide after any status change. Make this visually clear: status badge updates and the section heading changes to "Resolved".
