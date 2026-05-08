# Page Spec — Student Detail

**Route:** `/registry/students/:id`
**Component:** `src/pages/operations/StudentDetailPage.tsx`
**Persona:** Operations (Registrar write, Finance read-only). Also accessible to ITAdmin.
**Status:** Ready for implementation

---

## 1. Purpose

Full view of a single student's record. Registrar uses this for enrollment disputes, program changes, and contact detail updates. Finance uses it for context on invoice queries.

---

## 2. API

```
GET /api/students/{id}                    — full student record
GET /api/enrollments/student/{id}         — current and past enrollments
GET /api/transcripts/student/{id}         — transcript list
GET /api/invoices/student/{id}            — invoice list
PUT /api/students/{id}                    — update (Registrar/ITAdmin only)
```

---

## 3. Layout

```
← Back to students

Action bar (sticky):
  [Edit student]   [View transcript]   [Generate invoice]   ← Registrar only; Finance sees View only

Aarav Mehta                    ← h1 display tier
MRN 2024-0042  ·  BSc Computer Science  ·  Fall 2026  ← secondary, Plex Mono on MRN

─────────────────────────────────────────────────

Personal details               ← h2
  Date of birth     Jan 5, 2004
  Gender            Male
  Contact           +91 98765 43210 · aarav.m@gmail.com
  Address           204, Lakeview Apts, Bengaluru 560001
  Emergency contact Meena Mehta  ·  +91 91234 56789

Academic record                ← h2
  Program           BSc Computer Science
  Entry term        Fall 2024
  Expected grad.    Spring 2028
  Status            [Active]

Current enrollments            ← h2
  Course      Section  Term        Status      Grade
  CS-301      A        Fall 2026   Enrolled    B+
  PHIL-220    C        Fall 2026   Enrolled    A−
  ECO-150     B        Fall 2026   Enrolled    B

Finance summary                ← h2
  Outstanding balance    ₹52,000 (1 invoice overdue)
  [View all invoices →]
```

Max-width 800px, centered. Sections separated by `<hr>`.

---

## 4. Action bar

**Registrar + ITAdmin:**
- `[Edit student]` → opens edit Offcanvas (inline, not separate route)
- `[View transcript]` → navigates to `/transcripts/:id` (latest issued)
- `[Generate invoice]` → navigates to `/finance/invoices/generate?studentId={id}` (pre-fills student field)

**Finance (read-only):**
- `[View transcript]` only (no edit, no generate invoice from this surface — Finance uses `/finance/invoices/generate` directly)

---

## 5. Edit Offcanvas (Registrar/ITAdmin only)

Opens on `[Edit student]`. Editable fields only (non-editable fields like MRN are not shown in the edit panel):

```
Edit student details              ×

Full name      [________________]
Contact phone  [________________]
Email          [________________]
Address        [________________  ]  (textarea)
Emergency contact name   [_______]
Emergency contact phone  [_______]
Program        [BSc CS ▾]          ← dropdown from /api/programs
Entry term     [Fall 2024]         ← read-only (cannot change entry term)

[Save changes]   [Cancel]
```

`PUT /api/students/{id}` on save. On success: main page data refetches, Offcanvas closes, toast "Student record updated."

---

## 6. Enrollment table

Per component-map.md DataTable pattern. Columns: Course (Plex Mono code + name), Section, Term, Status badge, Grade pill. All tabular-nums. Click course row → `/courses/{id}` (context-aware — leads to course detail).

---

## 7. Finance summary

Read-only section. Shows outstanding balance computed as `sum(invoices where status=Overdue or PartiallyPaid)`. Uses `toLocaleString('en-IN')` currency format.

"View all invoices →" link → `/finance/invoices?studentId={id}` (filtered list for this student).

---

## 8. Student status badge

| Status | Badge |
|---|---|
| Active | success-50 bg, success-500 text |
| Inactive | neutral-100 bg, neutral-600 text |
| Suspended | warn-50 bg, warn-500 text |
| Graduated | brand-100 bg, brand-700 text |

Status change (ITAdmin only): clicking the status badge opens an inline dropdown to change it — not a separate form.

---

## 9. States

| State | Render |
|---|---|
| Loading | Skeleton sections (h2 headings + skeleton rows) |
| Student not found | Redirect `/404` |
| Not authorised | Redirect `/403` |
| Error | Stale banner |
| Edit save loading | Offcanvas buttons disabled + spinner |

---

## 10. A11y

- Heading hierarchy: `h1` name → `h2` per section.
- Contact info: use `<address>` element wrapping phone/email. `<a href="tel:+919...">` on phone numbers.
- `<dl>/<dt>/<dd>` pattern for label-value pairs in Personal details and Academic record sections.
- Edit Offcanvas: focus moves to first field on open. Returns to [Edit student] button on close.

---

## 11. Implementation notes

1. `ContactInfoJSON` deserialization: `const contact = JSON.parse(student.contactInfoJSON)` — handle parse errors with fallback `{}`.
2. Outstanding balance: sum computed client-side from invoice list. Do not expose a dedicated balance endpoint — compute from existing data.
3. `?studentId={id}` pre-fill: invoice generate page reads this from `useSearchParams()` on mount.
4. Status badge click for ITAdmin: a controlled `<Dropdown>` positioned relative to the badge. Options: Active, Inactive, Suspended. Confirm before Suspended (affects login ability).
