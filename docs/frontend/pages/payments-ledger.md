# Page Spec — Payments Ledger

**Route:** `/finance/payments`
**Component:** `src/pages/operations/PaymentsLedgerPage.tsx`
**Persona:** Operations (Finance write, Registrar read-only)
**Status:** Ready for implementation

---

## 1. Purpose

Finance officer's view of all payment records. Reconciliation surface — Finance reviews received payments and records those not yet captured. Dense DataTable, export-friendly.

---

## 2. API

```
GET /api/payments?invoiceId={id}&status={s}&since={date}&limit=50   — paginated payments
POST /api/payments                                                    — { invoiceId, amount, method, reference }
```

---

## 3. Layout

```
h1 "Payments"

Filters: Status [All ▾]  Method [All ▾]  Date from [____]  Date to [____]
                                                          [Export CSV]  [Record payment]

Date        Student            Invoice       Amount       Method          Status
─────────────────────────────────────────────────────────────────────────────────────
Nov 5       Aarav Mehta        INV-2026-042  ₹52,000      Bank Transfer   [Completed]
Nov 4       Diya Bhat          INV-2026-038  ₹52,000      UPI             [Completed]
Nov 3       Karan Joshi        INV-2026-031  ₹4,000       Cash            [Completed]
Nov 1       Priya Sharma       INV-2026-027  ₹52,000      Card            [Completed]

Showing 4 of 23 payments  [Load more]
```

Full-width. No max-width constraint. Amounts use `toLocaleString('en-IN')` + `font-variant-numeric: tabular-nums`.

---

## 4. Filters

| Filter | Component | Notes |
|---|---|---|
| Status | `<Form.Select>` | All / Completed / Pending |
| Method | `<Form.Select>` | All / Bank Transfer / UPI / Card / Cash / Cheque |
| Date from / to | `<input type="date">` × 2 | Applied on change (no submit button needed) |

Filters applied client-side on cached data (50 records max). "Load more" fetches next page.

---

## 5. Export CSV

`[Export CSV]` button: client-side CSV generation from current filtered dataset.

```ts
const csv = [
  ['Date', 'Student', 'Invoice', 'Amount', 'Method', 'Reference', 'Status'],
  ...payments.map(p => [p.paidAt, p.studentName, p.invoiceId, p.amount, p.method, p.reference, p.status])
].map(row => row.join(',')).join('\n')

const blob = new Blob([csv], { type: 'text/csv' })
const url = URL.createObjectURL(blob)
// trigger download via <a download>
```

No server-side export endpoint needed. Finance "print culture" requirement satisfied.

---

## 6. Record payment (action)

`[Record payment]` button in top-right opens an Offcanvas panel:

```
Record payment                       ×

Invoice
[Search by invoice number or student  ▾]   ← AsyncComboBox

Amount
[₹___________]

Method
[Bank Transfer ▾]

Reference / Transaction ID
[_______________________]

[Record payment]
```

Same form as `invoice-detail.md` payment section, in Offcanvas. On success: table refetches, Offcanvas closes, toast "Payment recorded."

---

## 7. Table row detail

Click any row → inline expand (no Offcanvas for read) showing Reference number and full timestamp. Collapse on second click.

```jsx
<tr onClick={() => toggleExpand(payment.id)}>
  ...
</tr>
{expanded.has(payment.id) && (
  <tr className="payment-detail-row">
    <td colSpan={6} style={{padding: 'space-4 space-8', background: 'neutral-50'}}>
      <span className="text-muted me-3">Reference: {payment.reference || '—'}</span>
      <span className="text-muted">Recorded: {formatDateTime(payment.paidAt)}</span>
    </td>
  </tr>
)}
```

---

## 8. Status badge

| Status | Badge |
|---|---|
| Completed | success-50 bg, success-500 text |
| Pending | warn-50 bg, warn-500 text |

---

## 9. States

| State | Render |
|---|---|
| Loading | Skeleton rows (5) |
| Empty (no payments) | "No payments recorded yet." |
| Empty (filtered) | "No payments match these filters." with "Clear filters" link |
| Error | Stale banner |

---

## 10. A11y

- Table `<caption>`: "Payment records — Finance ledger".
- `[Export CSV]`: `aria-label="Export filtered payments as CSV"`.
- Expanded detail row: `aria-expanded` on the parent `<tr>`, `aria-controls` pointing to the detail `<tr>`.
- Amount column: `aria-label="₹52,000"` — screen reader reads "52000 rupees" without toLocaleString formatting issues.

---

## 11. Responsive

<768px: hide Method and Reference columns. Show Date + Student + Amount + Status. Export and Record buttons stack vertically. Date filters collapse to a "Date range" button that opens a popover.

---

## 12. Implementation notes

1. `GET /api/payments` does not have a student name join by default — enrich client-side by cross-referencing invoice data, or fetch invoice + student on row expand.
2. CSV export: finance needs this to work offline (no server dependency). Client-side Blob approach works for up to ~10,000 rows.
3. "Load more" pagination: append next page to existing array (`setPayments(prev => [...prev, ...nextPage])`). Do not replace — user has scrolled down and expects accumulation.
4. `[Record payment]` Offcanvas invoice search: `AsyncComboBox` searches by invoice number (INV-2026-XXX) or student name, calls `GET /api/invoices?q={query}&status=Pending,Overdue,PartiallyPaid`.
