# Page Spec — Issue Transcript

**Route:** `/registry/transcripts/issue`
**Component:** `src/pages/operations/TranscriptIssuePage.tsx`
**Persona:** Operations (Registrar only — Finance has no write access here)
**Status:** Ready for implementation

---

## 1. Purpose

Registrar generates and issues an official transcript for a specific student. Two-step: generate a draft (which pulls grade data), review it, then issue it. Issued transcripts become immutable.

---

## 2. API

```
POST /api/transcripts/generate/{studentId}    — { entriesJSON, gpa } → creates Draft transcript
GET  /api/transcripts/student/{studentId}     — list existing transcripts
PATCH /api/transcripts/{id}                   — { status: "Issued" }  → issue it
```

---

## 3. Layout — Step 1: Student selection

```
h1 "Issue transcript"

Student
[Search student by name or MRN...  ▾]   ← AsyncComboBox

                  [Next →]
```

`<AsyncComboBox>` — debounced search against `GET /api/students?q={query}`. Displays name + MRN in each option. Required before Next.

---

## 4. Layout — Step 2: Review and issue

After student selected, pulls their completed course grades and renders a preview:

```
← Back

Issue transcript for Aarav Mehta (MRN 2024-0042)

Transcript preview               ← h2

  Course           Credits  Grade  Term
  ──────────────────────────────────────
  CS-201           3        A      Sp 2024
  CS-301           3        B+     Fa 2024
  PHIL-220         3        A−     Fa 2026
  ECO-150          3        B      Fa 2026
  ──────────────────────────────────────
  Total credits    12
  Cumulative GPA   3.40

This transcript will be issued as an official record.
Once issued, it cannot be edited.

[Issue transcript]    [Save as draft]
```

Preview uses the same table layout as the student-facing transcript view (`transcript.md`) for consistency. All tabular-nums.

GPA and entries computed from the student's graded submissions client-side, or fetched from the student record. For v1: use `student.gpa` and a simplified entries list from enrollments + grades.

---

## 5. Stepper header

Two-step flow visualised as a minimal stepper above the form:

```
[1] Select student  →  [2] Review and issue
 ●                          ○
```

Step 1 active: filled circle brand-500. Step 2 inactive: empty circle neutral-300. On step 2: step 1 = checkmark brand-500, step 2 = filled brand-500.

Implementation: custom `<Stepper steps={2} current={step} />` (Tier C per component-map.md) using Bootstrap progress + flex. No external stepper library.

---

## 6. States

| State | Render |
|---|---|
| Step 1 default | Empty student search |
| Step 1 no results | ComboBox dropdown: "No students found for '{query}'" |
| Step 2 loading | Skeleton transcript table rows (3) |
| Step 2 no grades | Alert: "No completed courses found. Transcripts can only be issued after courses are graded." (error-messages.md §7) |
| Issuing | "Issue transcript" button: "Issuing..." + spinner |
| Issue success | Navigate to `/registry/students/{id}` + toast "Transcript issued." |
| Issue error | Toast error from error-messages.md §7 |
| Existing issued transcript | Alert on Step 2: "An issued transcript already exists for this student. Issuing again will create a new record." |

---

## 7. A11y

- Stepper: `<ol aria-label="Steps">` with `<li aria-current="step">` on the active step.
- Preview table: `<caption>` "Transcript preview for {studentName}".
- "Issue transcript" button: `aria-describedby` pointing to the "cannot be edited" warning paragraph — screen reader reads the warning alongside the button.

---

## 8. Responsive

Single-column layout at all breakpoints. Preview table scrolls horizontally at <480px.

---

## 9. Implementation notes

1. `AsyncComboBox` for student search: same component from component-map.md (Tier C, React Aria `useComboBox` ARIA pattern). Reuse across applicants, invoice generate, etc.
2. EntriesJSON construction: map over student's graded enrollments → `[{courseCode, courseTitle, credits, grade, term}]`. Sort by term ascending.
3. GPA for transcript: use `student.gpa` from `GET /api/students/{id}`. Do not recompute unless backend signals it's stale.
4. PATCH to issue: `{ status: "Issued" }` — backend sets `issuedAt`, generates `transcriptUri` (QuestPDF). After success, the transcript is accessible at the `transcriptUri` for PDF download.
