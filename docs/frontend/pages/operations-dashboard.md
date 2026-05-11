# Page Spec — Operations Dashboard

**Route:** `/` (resolved when `currentPersona === 'Operations'`)
**Component file:** `src/pages/operations/OperationsDashboard.tsx`
**Persona:** Operations (Registrar + Finance roles)
**Craft pass:** 1 — delta from learner-dashboard.md; shell, tokens, typography, motion inherited
**Status:** Ready for implementation

---

## 1. Purpose

The Registrar's and Finance officer's command center. Queue-shaped: workflow-driven, organized around filterable queues of pending work. Batch mindset — the user processes many similar items in sequence.

Two roles share this dashboard shell. The rendered blocks differ per role — Registrar sees admissions + registry queues; Finance sees invoice + payment queues. This is driven by `useRole()` not by a separate route.

---

## 2. Roles allowed

- `Registrar` — full Registrar queue blocks; Invoices/Payments read-only view
- `Finance` — full Finance queue blocks; Admissions/Registry hidden

---

## 3. API endpoints + data contract

### Registrar variant

| Block | Endpoint | Notes |
|---|---|---|
| Applicants queue | `GET /api/applicants?status=Submitted,UnderReview&limit=5` | Show count + top 5 rows |
| Transcript requests | `GET /api/transcripts?status=Draft&limit=5` | Registrar-issued drafts |
| Recent enrollments | `GET /api/enrollments?since=7d&orderBy=createdAt:desc&limit=10` | Last 10 new enrollments |

### Finance variant

| Block | Endpoint | Notes |
|---|---|---|
| Overdue invoices | `GET /api/invoices?status=Overdue,PartiallyPaid&limit=5` | Count + top 5 rows |
| Payments pending | `GET /api/payments?status=Pending&limit=5` | Payments awaiting reconciliation |
| Fee schedules | `GET /api/fees?status=Draft` | Active drafts needing activation |
| Scholarships expiring | `GET /api/scholarships?validToBefore={+30d}&limit=5` | Expiring within 30 days |

---

## 4. Layout — desktop ≥1024px

### Registrar variant

```
┌──────┬──────────────────────────────────────────────────────┐
│ Rail │  TopBar                                               │
│      ├──────────────────────────────────────────────────────┤
│ Dsh  │                                                       │
│ Apl  │  Operations — Registrar                      ← h1    │
│ Stu  │  Fall 2026  ·  12 applicants pending  ·  4 transcripts  │
│ Trn  │                                                       │
│ Enr  │  ┌─────────────────────────────────────────────┐     │
│ Inv  │  │  Applicants queue (12)      [View all →]    │     │
│ Pay  │  │                                             │     │
│ Fee  │  │  Aarav Mehta    BSc CS    Under Review  →   │     │
│ Sch  │  │  Diya Bhat      BA Phil   Submitted     →   │     │
│ Tkt  │  │  Karan Joshi    BSc Eco   Under Review  →   │     │
│      │  │  + 9 more                                   │     │
│      │  └─────────────────────────────────────────────┘     │
│      │                                                       │
│      │  ┌─────────────────────────────────────────────┐     │
│      │  │  Transcript requests (4)    [View all →]    │     │
│      │  │  Aarav Mehta  draft ready   2 hours ago →   │     │
│      │  │  + 3 more                                   │     │
│      │  └─────────────────────────────────────────────┘     │
│      │                                                       │
│      │  Recent enrollments                          ← h2    │
│      │  ──────────────────────────────────────────────       │
│      │  Aarav Mehta → CS-301 sec A    today 11:23 am        │
│      │  Diya Bhat  → PHIL-220 sec B   today  9:45 am        │
│      │  + 8 more                    [View all enrollments →] │
│      │                                                       │
│      │  Quick actions                                        │
│      │  [Issue transcript]  [Approve applicants]  [Reports]  │
│      │                                                       │
└──────┴──────────────────────────────────────────────────────┘
```

### Finance variant

Same shell. Main blocks:

```
│  Operations — Finance                                        │
│  Fall 2026  ·  ₹12.4L overdue  ·  8 payments to clear       │
│                                                              │
│  ┌────────────────────────────────────────────────────┐      │
│  │  Overdue invoices (₹12.4L)        [View all →]    │      │
│  │  Aarav Mehta   ₹52,000   3 days    →              │      │
│  │  Karan Joshi   ₹48,000   5 days    →              │      │
│  │  Diya Bhat     ₹48,000   1 week    →              │      │
│  │  + 9 more                                         │      │
│  └────────────────────────────────────────────────────┘      │
│                                                              │
│  ┌────────────────────────────────────────────────────┐      │
│  │  Payments to reconcile (8)        [View all →]    │      │
│  │  Aarav Mehta  ₹52,000  Bank Transfer  today  →    │      │
│  │  + 7 more                                         │      │
│  └────────────────────────────────────────────────────┘      │
│                                                              │
│  Fee schedules needing activation (2)                        │
│  ──────────────────────────────────────────────              │
│  Spring 2027 BSc tuition  Draft  →                          │
│  Spring 2027 BA tuition   Draft  →                          │
│                                                              │
│  Scholarships expiring (next 30 days, 1)                     │
│  ──────────────────────────────────────────────              │
│  Aarav Mehta  Merit  expires Sep 30  →                      │
│                                                              │
│  Quick actions                                               │
│  [Generate invoices]  [Record payment]  [Reports]            │
```

---

## 5. Queue block component spec

Each queue block is a **compact DataTable variant** (not a card). Renders up to 5 rows inline; "View all" link navigates to the full filtered list.

```
┌───────────────────────────────────────────────────────────┐
│  {Block title} ({count})          [View all →]            │  ← block header row
│───────────────────────────────────────────────────────────│
│  {col1}    {col2}    {col3}    {status badge}    →        │  ← row (×5 max)
│  {col1}    {col2}    {col3}    {status badge}    →        │
│  + {remaining} more                                       │  ← shown when count > 5
└───────────────────────────────────────────────────────────┘
```

- Block background: `neutral-50`, `shadow-sm`, `border-radius: 8px`
- Header: IBM Plex Sans 1rem weight 600 neutral-900 + count + "View all" link (brand-700)
- Rows: hover = `brand-50` background. Cursor pointer. Click = navigate to detail.
- Divider between rows: `1px solid neutral-200`
- "+ N more" row: caption tier, neutral-600, centered, not a link (use "View all" instead)

**Accessibility:** block is a `<section>` with `aria-label="{blockTitle}"`. Rows are `<a>` elements (each row is navigable). Count updates via `aria-live="polite"`.

---

## 6. Welcome row

Role-conditioned:
- Registrar: `Operations — Registrar`
- Finance: `Operations — Finance`

Both: `{h1}` display tier. Followed by term snapshot (secondary tier):
- Registrar: `Fall 2026 · {n} applicants pending · {n} transcripts`
- Finance: `Fall 2026 · ₹{totalOverdue} overdue · {n} payments to clear`

All amounts in IBM Plex Mono with `font-variant-numeric: tabular-nums`. Currency formatted as ₹12.4L (lakhs) for dashboard summary, ₹12,40,000 in full detail pages.

---

## 7. Quick actions row

Three outcome-named buttons (secondary variant):

| Registrar | Finance |
|---|---|
| "Issue transcript" → `/registry/transcripts/issue` | "Generate invoices" → `/finance/invoices/generate` |
| "Approve applicants" → `/admissions/applicants?status=UnderReview` | "Record payment" → `/finance/payments/new` |
| "Reports" → `/admin/reports` | "Reports" → `/admin/reports` |

Button row layout: `display: flex; gap: var(--space-4); flex-wrap: wrap`. Buttons: `<Button variant="outline-primary" size="sm">`.

---

## 8. States

| State | Behavior |
|---|---|
| **Default** | All role-relevant blocks with data |
| **Loading** | Skeleton table rows (3 per block) + skeleton quick action buttons |
| **Empty queue (no applicants)** | Block reads: "No applications pending review." — subtitle: "New applications will appear here as students apply." No CTA (registrar waits). |
| **Empty overdue invoices** | Block reads: "No invoices overdue." — no further copy. |
| **Error** | Stale banner (same pattern as Learner) |
| **Operations persona: Registrar sees Finance blocks** | Finance-specific blocks (invoices, payments) render READ-ONLY. No generate/record actions. "View invoices" replaces "Generate invoices" in quick actions. |
| **Operations persona: Finance sees Registry blocks** | Students block renders READ-ONLY. "View students" link. Applicants, transcripts, enrollments hidden entirely. |

---

## 9. Interaction model (delta from Learner)

| Trigger | Action |
|---|---|
| Click queue row | Navigate to entity detail page |
| Click "View all →" | Navigate to full filtered list with status pre-applied |
| Click quick action button | Navigate to action target route |
| Hover queue row | `brand-50` background, cursor pointer |

---

## 10. A11y (delta from Learner)

- Currency values: `aria-label="12 lakh 40 thousand rupees overdue"` on summary amounts (screen reader pronunciation varies).
- "View all" links carry context: `aria-label="View all 12 pending applicants"` not just "View all".
- Queue counts: `aria-live="polite"` on each block count — changes after an approval action.
- Status badges on queue rows: icon + text always ("Under Review" not just a colored dot).

---

## 11. Demo seed data

### Registrar variant — user: **Priya Sharma** (Registrar)
- 12 pending applicants (3 shown: Aarav Mehta BSc CS Under Review, Diya Bhat BA Phil Submitted, Karan Joshi BSc Eco Under Review)
- 4 transcript drafts (1 shown: Aarav Mehta)
- 10 recent enrollments (2 shown)

### Finance variant — user: **Rajan Mehta** (Finance)
- 12 overdue invoices totalling ₹12.4L (3 shown)
- 8 pending payments (1 shown)
- 2 fee schedule drafts
- 1 scholarship expiring in 30 days

---

## 12. Responsive (same shell pattern as Learner)

<768px: queue blocks stack single column. Quick action buttons wrap. Currency amounts abbreviate to ₹12.4L format (not full lakhs) to prevent overflow.

---

## 13. Implementation notes

1. **Role-conditional rendering:** use `const role = useRole()` hook to conditionally render Registrar vs Finance blocks within the same component.
2. **Currency formatting:** create a `formatCurrency(amount: number): string` utility that formats amounts as ₹X.XL for dashboard summaries and full ₹X,XX,XXX in detail pages.
3. **"+ N more" logic:** fetch top 5 from API (`limit=5`), display count from response total. The "+ N more" is computed as `total - 5`.
4. **Quick action keyboard shortcuts:** `aria-keyshortcuts` on each button for future cmd+K integration (v2). Define the mapping even if not wired in v1.
