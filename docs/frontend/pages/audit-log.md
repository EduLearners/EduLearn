# Page Spec — Audit Log

**Route:** `/admin/audit-log`
**Component:** `src/pages/governance/AuditLogPage.tsx`
**Persona:** Governance (ITAdmin + Auditor — read-only, append-only)
**Status:** Ready for implementation

---

## 1. Purpose

Immutable record of all system actions. Auditor's primary surface for compliance queries — date range filtering, user filtering, resource-type filtering, then inline expand to see DetailsJSON. Design principle 4 (read-only is first-class): every affordance signals permanence.

**Scene:** "An Auditor reviewing a grade-change dispute, 10am, fluorescent office. They need to prove a specific grade was changed by a specific instructor on a specific date in under 3 clicks."

---

## 2. API

```
GET /api/audit-log?actorId={id}&resourceType={t}&since={date}&until={date}&limit=50
```

Paginated, append-only. No POST, PUT, or DELETE ever rendered.

---

## 3. Layout

```
h1 "Audit log"

Filters:
  User [All ▾]   Resource type [All ▾]   From [____]   To [____]   [Export CSV]

[Immutable record. No events can be modified or deleted.]  ← persistent notice, caption tier

Timestamp           User              Action              Resource
──────────────────────────────────────────────────────────────────
▸ Nov 8 10:34 am   Prof. Anjali Iyer  SubmissionGraded   Submission 247
  Nov 8 10:31 am   Aarav Mehta        Login              —
▸ Nov 8  9:45 am   Priya Sharma       TranscriptIssued   Transcript 14
  Nov 8  9:12 am   Aarav Mehta        Login              —
  Nov 8  9:11 am   Rajan Mehta        InvoiceGenerated   Invoice 42
  Nov 7  4:03 pm   Prof. Anjali Iyer  AssessmentPublished Assessment 18

Showing 50 of 1,247 events  [Load more]
```

▸ = row has DetailsJSON content and can be expanded. Plain indent = no additional detail (e.g. Login events may have no DetailsJSON).

---

## 4. Immutability notice

Persistent `<div>` (not an Alert — this is permanent information, not a temporary warning) below the filter row:

```jsx
<p className="audit-notice text-muted caption mb-4" role="note">
  <i className="bi bi-lock-fill me-2" aria-hidden="true" />
  Immutable record. No events can be modified or deleted.
</p>
```

Caption tier (0.75rem), neutral-500, `bi-lock-fill` icon. Never hidden. Never dismissible.

---

## 5. Inline expand on row click

Rows with DetailsJSON: `cursor: pointer`, `▸` chevron indicator. Click → detail row slides open below, chevron rotates 90° (200ms ease-out-expo).

```
▾ Nov 8 10:34 am   Prof. Anjali Iyer  SubmissionGraded   Submission 247
──────────────────────────────────────────────────────────────────────
  submission_id   247
  student_id      3
  score_before    null
  score_after     24
  grader_id       12
  assessment_id   18
──────────────────────────────────────────────────────────────────────
```

Detail row background: `neutral-50`. DetailsJSON rendered as `<dl>/<dt>/<dd>` pairs. `font-family: $font-family-mono; font-size: 0.875rem`. Keys in `neutral-600`, values in `neutral-800`.

Multiple rows can be expanded simultaneously — no accordion-style close-others behaviour.

Rows without DetailsJSON: clicking does nothing. No pointer cursor. No ▸ indicator.

---

## 6. Filters

| Filter | Notes |
|---|---|
| User | `<Form.Select>` — "All users" + deduplicated list of actors from current page data. If `?userId={id}` param set on mount: pre-select that user. |
| Resource type | `<Form.Select>` — All / Submission / Enrollment / Transcript / Invoice / Assessment / User / Ticket |
| From / To | `<input type="date">` × 2. Applied server-side on each change (debounced 400ms). Date range resets on filter clear. |
| Export CSV | Same client-side CSV approach as payments-ledger.md. Exports currently visible + loaded rows. |

---

## 7. Action verb mapping

Display human-readable verbs:

```ts
const ACTION_LABELS: Record<string, string> = {
  SubmissionGraded: 'Graded submission',
  EnrollmentDropped: 'Dropped enrollment',
  TranscriptIssued: 'Issued transcript',
  InvoiceGenerated: 'Generated invoice',
  MFAVerified: 'Verified MFA',
  MFAReset: 'Reset MFA',
  UserCreatedByAdmin: 'Created user',
  AssessmentPublished: 'Published assessment',
  Login: 'Signed in',
  // ... full list in a constants file
}
```

Unknown actions: display raw action string in `neutral-600` italic.

---

## 8. States

| State | Render |
|---|---|
| Loading (initial) | Skeleton rows (10) |
| Empty (no events) | "No audit events recorded yet." — unlikely in demo |
| Empty (filtered) | "No events match these filters." + "Clear filters" link |
| Load more loading | Spinner below last row, not full-page skeleton |
| Error | Stale banner (data from last successful fetch still shown) |

---

## 9. A11y

- `<caption>` on table: "System audit log — append-only record".
- Expandable rows: `aria-expanded` on the trigger row, `aria-controls` pointing to the detail `<tr>` id.
- Immutability notice: `role="note"` — screen reader announces it as supplementary information.
- `aria-live="polite"` on the event count below the table — announces when "Load more" completes.
- Timestamps: `<time datetime="{iso8601}">Nov 8 10:34 am</time>` — machine-readable for screen readers and scraping tools.

---

## 10. Responsive

<768px: hide Resource column. Show Timestamp + User + Action. Detail rows show full key-value list, each pair on its own line.

---

## 11. Implementation notes

1. `?userId={id}` pre-filter: read from `useSearchParams()` on mount. Pre-populates User filter dropdown.
2. Detail row slide: `<Collapse in={expanded.has(row.auditId)}>` — Bootstrap Collapse component. Target is a `<tr>` wrapping a `<td colSpan={4}>`. Note: Bootstrap Collapse may have issues animating `<tr>` — wrap in a `<div>` inside the `<td>` instead.
3. Timestamp precision: API returns ISO 8601. Display as "Nov 8 10:34 am" for list view, full ISO in `<time datetime>` attribute. Expand shows full "Nov 8, 2026 at 10:34:22 am IST" timestamp.
4. DetailsJSON parsing: `JSON.parse(row.detailsJSON || '{}')` — handle null/empty string safely.
5. Auditor vs ITAdmin rendering: same component. The route guard handles access. No role-conditional logic needed inside the component.
