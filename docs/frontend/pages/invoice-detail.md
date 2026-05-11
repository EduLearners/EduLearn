# Page Spec — Invoice Detail

**Route:** `/finance/invoices/:id`
**Component:** `src/pages/learner/InvoiceDetailPage.tsx`
**Persona:** Learner (own invoice), Finance/ITAdmin (any invoice)
**Status:** Ready for implementation

---

## 1. Purpose

View invoice line items and pay an outstanding invoice. High-stakes page — payment errors cause real harm. Design prioritises clarity and confirmation.

---

## 2. API

```
GET  /api/invoices/{id}             — invoice with LineItemsJSON, AmountDue, status, DueDate
POST /api/payments                  — { invoiceId, amount, method, reference }
GET  /api/payments/invoice/{id}     — payment history for this invoice
```

---

## 3. Layout

```
← Back to Finance

Invoice #INV-2026-0042              ← h1, Plex Mono
Fall 2026  ·  Aarav Mehta           ← secondary, neutral-600
Issued: Oct 1, 2026  ·  Due: Nov 1, 2026   ← caption, date in warn-500 if <7 days

Status: [Overdue]                   ← status badge

────────────────────────────────────────────────────────────

Invoice details                     ← h2

Item                         Amount
──────────────────────────────────────────────────────────
Tuition fee (Fall 2026)     ₹48,000
Student activities fee        ₹2,000
Library fee                   ₹2,000
──────────────────────────────────────────────────────────
  Subtotal                  ₹52,000
  Scholarship discount        −₹0
──────────────────────────────────────────────────────────
  Amount due                ₹52,000   ← subhead 600, brand-700

────────────────────────────────────────────────────────────

Pay now                             ← h2 (conditional — visible when status ≠ Paid/Cancelled)

Payment method
  ○ Bank Transfer
  ○ UPI
  ○ Card
  ○ Cash
  ○ Cheque

Reference / Transaction ID
[_________________________________]

[Pay ₹52,000]                       ← primary button, outcome-named

────────────────────────────────────────────────────────────

Payment history                     ← h2

Date            Amount    Method     Reference         Status
──────────────────────────────────────────────────────────
(empty if no payments yet)
```

Max-width 640px, centered. No card wrapping around sections — sections separated by `<hr>` dividers.

---

## 4. Line items table

Rendered from `invoice.lineItemsJSON`. Read-only after invoice generation.

```jsx
<table className="table table-sm table-borderless">
  <tbody>
    {lineItems.map(item => (
      <tr key={item.item}>
        <td>{item.item}</td>
        <td className="text-end tabular">₹{item.amount.toLocaleString('en-IN')}</td>
      </tr>
    ))}
  </tbody>
  <tfoot>
    <tr className="subtotal-row">
      <th>Subtotal</th>
      <th className="text-end tabular">₹{subtotal.toLocaleString('en-IN')}</th>
    </tr>
    {scholarship > 0 && (
      <tr><td>Scholarship discount</td><td className="text-end tabular success-500">−₹{scholarship.toLocaleString('en-IN')}</td></tr>
    )}
    <tr className="amount-due-row">
      <th>Amount due</th>
      <th className="text-end tabular brand-700 subhead">₹{amountDue.toLocaleString('en-IN')}</th>
    </tr>
  </tfoot>
</table>
```

Indian number formatting: `toLocaleString('en-IN')` → ₹52,000 (not ₹52,000 US-style). Currency symbol ₹ adjacent to number, no space.

---

## 5. Payment form

**Payment method:** `<Form.Check type="radio">` × 5 options. Renders corresponding contextual field:

- Bank Transfer: "Reference / Transaction ID" text input (required)
- UPI: "UPI Transaction ID" text input (required)
- Card: reference text input (optional — last 4 digits or auth code)
- Cash: no extra field (cash paid at counter, reference optional)
- Cheque: "Cheque number" text input (required)

**Submit button:** `Pay ₹{amountDue.toLocaleString('en-IN')}` — outcome-named, exact amount. Full-width at <640px.

**Confirm before submit:** no modal confirmation — undo is not available for payments. Instead, use a summary line above the submit button:

```
You are paying ₹52,000 via Bank Transfer.
[Pay ₹52,000]
```

This replaces a confirmation dialog with inline confirmation copy (lower cognitive load, no modal).

---

## 6. Invoice status display

| Status | Badge | Pay form |
|---|---|---|
| Pending | neutral-100 bg neutral-600 text | Visible |
| PartiallyPaid | brand-100 bg brand-700 text — "₹X of ₹Y paid" | Visible (remaining amount) |
| Overdue | danger-50 bg danger-500 text | Visible with overdue warning |
| Paid | success-50 bg success-500 text | Hidden |
| Cancelled | neutral-100 bg neutral-600 text | Hidden — show: "This invoice has been cancelled." |

Overdue warning (above payment form):
```
<Alert variant="warning">
  This invoice was due on {dueDate}. Pay now to avoid further action.
</Alert>
```

---

## 7. Payment history section

After successful payment, the payment history table updates (React Query invalidation). Before any payment: "No payments recorded yet." (single line, no EmptyState component needed).

---

## 8. States

| State | Render |
|---|---|
| Loading | Skeleton table rows + skeleton form |
| Error | Stale banner; invoice data still shown |
| Payment submitting | Button "Processing..." + spinner, form disabled |
| Payment success | Toast "Payment recorded." + navigate back to `/finance/invoices`. React Query invalidates invoice + payments queries. |
| Payment error | Error from error-messages.md §6: "Payment could not be processed..." |
| Invoice not found | Redirect to `/404` |
| Not authorised (other student's invoice) | Redirect to `/403` |

---

## 9. Semantic HTML

```html
<main aria-label="Invoice {invoiceNumber}">
  <h1>Invoice #{invoice.id}</h1>
  <section aria-label="Invoice details">
    <h2>Invoice details</h2>
    <table aria-label="Invoice line items">
      <caption>Invoice {invoiceNumber} — {studentName}, {term}</caption>
      ...
    </table>
  </section>
  <section aria-label="Pay now">
    <h2>Pay now</h2>
    <form aria-label="Payment form">
      <fieldset>
        <legend>Payment method</legend>
        ...
      </fieldset>
      ...
    </form>
  </section>
  <section aria-label="Payment history">
    <h2>Payment history</h2>
    ...
  </section>
</main>
```

`<fieldset>/<legend>` for payment method radio group — screen reader announces "Payment method: Bank Transfer, UPI, Card..." as a group.

---

## 10. Responsive

<640px: line item amounts right-align and stack below item name if text wraps. Payment form full-width. Summary confirmation line stays above button.

---

## 11. Implementation notes

1. Indian number formatting: always use `toLocaleString('en-IN')` for ₹ amounts. Never `toLocaleString('en-US')` (produces ₹52,000 instead of ₹52,000 — actually same for 5-digit, but crore/lakh format differs). Test with ₹1,00,000 (one lakh).
2. PartiallyPaid invoice: remaining amount = `invoice.amountDue - sum(payments.amount)`. Pre-fill the payment amount field with remaining balance.
3. POST /api/payments expects `amount` field — for full payment, send `invoice.amountDue`. For partial, student enters custom amount (if backend supports it — verify before implementing; not explicit in API spec).
4. React Query invalidation on payment success: `queryClient.invalidateQueries(['invoice', id])` and `queryClient.invalidateQueries(['payments', id])`.
5. Finance/ITAdmin view: same component, action bar shows "Generate invoice" and "Cancel invoice" buttons conditionally per role. Write actions hidden for Learner.
