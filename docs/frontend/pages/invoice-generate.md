# Page Spec — Generate Invoice

**Route:** `/finance/invoices/generate`
**Component:** `src/pages/operations/InvoiceGeneratePage.tsx`
**Persona:** Operations (Finance write, Registrar no access to this form)
**Status:** Ready for implementation — v1 single-student; bulk is v2

---

## 1. Purpose

Finance officer generates an invoice for a specific student for a given term. The invoice line items are pulled from the fee schedule for that student's program and term.

---

## 2. API

```
GET /api/students?q={query}           — student search (AsyncComboBox)
GET /api/fees?programId={id}&term={t} — fee schedule for preview
POST /api/invoices/generate           — { studentId, term, dueDate }
```

---

## 3. Layout

```
← Back to invoices

h1 "Generate invoice"

Student
[Search student by name or MRN...  ▾]   ← AsyncComboBox

Term
[Fall 2026 ▾]

Due date
[2026-11-01]

─────────────────────────────────────────

Fee preview                              ← rendered after student + term selected

  Item                           Amount
  ──────────────────────────────────────
  Tuition fee (Fall 2026)       ₹48,000
  Student activities fee          ₹2,000
  Library fee                     ₹2,000
  ──────────────────────────────────────
  Total                         ₹52,000

  Source: BSc Computer Science fee schedule, Fall 2026

─────────────────────────────────────────

[Generate invoice]
```

Max-width 560px, centered. Fee preview appears inline below the form once both student + term are selected. No separate "Preview" button — reactive on field change (200ms debounce).

---

## 4. Fee preview logic

On student + term both set:
1. Fetch student's program from student record
2. Fetch fee schedule: `GET /api/fees?programId={programId}&term={term}`
3. Render `feeItemsJSON` as a preview table with total
4. If no fee schedule found: alert "No fee schedule found for {program} in {term}. Contact your Finance Admin." — Generate button disabled.

---

## 5. Term selector

`<Form.Select>` — options: last 2 terms + next 2 terms, computed from current date. Always includes current term as default selected. Terms formatted as "Fall 2026", "Spring 2027" etc.

---

## 6. States

| State | Render |
|---|---|
| Default | Empty form |
| Student + term selected | Fee preview renders below |
| No fee schedule | Alert (non-blocking) + Generate disabled |
| Existing invoice | Alert: "An invoice already exists for this student in {term}. [View existing invoice →]" + Generate disabled |
| Generating | Button: "Generating..." + spinner |
| Success | Navigate to `/finance/invoices/{newId}` + toast "Invoice generated." |
| Error | Toast from error-messages.md §6 |

---

## 7. A11y

- Student and term fields: `<label>` associated with each input.
- Fee preview table: `<caption>` "Fee preview for {studentName}, {term}". `aria-live="polite"` on the preview container — screen reader announces when fee data loads.
- Generate button: `aria-disabled="true"` when disabled, not HTML `disabled` attribute alone (to ensure it remains focusable for keyboard users who may need to understand why it's disabled via `aria-describedby`).

---

## 8. URL pre-fill

If navigated from student detail (`?studentId={id}`): on mount, `useSearchParams()` reads `studentId`, auto-populates the AsyncComboBox with that student, skipping manual search.

---

## 9. Implementation notes

1. Term computation: `const terms = generateTerms(new Date(), { past: 2, future: 2 })` — utility function, not hardcoded strings. Produces ["Spring 2026", "Fall 2026", "Spring 2027", "Fall 2027"].
2. Fee preview debounce: `useEffect` with 200ms delay watching `[studentId, term]`. Clears preview if either field changes.
3. Existing invoice check: before showing the Generate button, run `GET /api/invoices?studentId={id}&term={term}` — if result.length > 0, show the "already exists" alert. Prevents accidental duplicate invoices.
4. v2 note: bulk generation will loop over `GET /api/enrollments?term={term}`, extract studentIds, and POST for each. Factor `generateSingleInvoice(studentId, term, dueDate)` as a reusable async function from the start.
