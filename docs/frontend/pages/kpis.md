# Page Spec — KPIs

**Route:** `/admin/kpis`
**Component:** `src/pages/governance/KpisPage.tsx`
**Persona:** Governance (ITAdmin + Auditor)
**Status:** Ready for implementation

---

## 1. Purpose

Full KPI table. All metrics in one dense DataTable, with a manual recalculate trigger for ITAdmin. Extends the 2×2 snapshot on the Governance dashboard to the full set.

---

## 2. API

```
GET  /api/kpis                     — all KPI records
POST /api/kpis/recalculate         — triggers recalculation (ITAdmin only)
```

---

## 3. Layout

```
h1 "KPIs"
Last recalculated: Nov 8, 2026 at 10:34 am  ← secondary, tabular-nums on time

[Recalculate all]   ← ITAdmin only; hidden for Auditor

Reporting period: [Fall 2026 ▾]

Metric                  Value       Period        Computed
──────────────────────────────────────────────────────────────
Enrollment rate         92%         Fall 2026     5 min ago
Average GPA             3.2         Fall 2026     5 min ago
Invoice collection      78%         Fall 2026     5 min ago
Plagiarism flags         2          Fall 2026     5 min ago
Active students        312          Fall 2026     5 min ago
Avg assessment score    74%         Fall 2026     5 min ago
```

Max-width 800px, centered. All numeric values: `font-variant-numeric: tabular-nums`, right-aligned.

---

## 4. [Recalculate all] button

**ITAdmin only.** `POST /api/kpis/recalculate`.

Button state: default "Recalculate all", loading "Recalculating..." + spinner (30-60s expected). On success: table refetches, "Last recalculated" timestamp updates, toast "KPIs recalculated."

**Not a background job in v1** — button is disabled until the POST resolves. No polling. If the POST takes >30s, show a persistent inline notice: "Recalculation is taking longer than usual. The page will update automatically."

---

## 5. Delta indicators

Each metric row shows a trend indicator if a previous period's value exists in `localStorage.kpiCache`:

| Trend | Indicator | Color |
|---|---|---|
| Up vs prior period | `bi-arrow-up-short` | success-500 |
| Down vs prior period | `bi-arrow-down-short` | danger-500 |
| No change / no prior | `—` | neutral-500 |

Delta stored in `localStorage.kpiCache[metric][period]` after each successful fetch. Cleared on recalculate (fresh baseline).

---

## 6. Reporting period filter

`<Form.Select>` — populates from distinct `reportingPeriod` values across all KPI records. Default: current term. Switching period filters the table client-side.

---

## 7. Table columns

| Column | Width | Notes |
|---|---|---|
| Metric | flex-grow | Human-readable metric name (formatted from API key) |
| Value | 90px | Right-aligned, tabular-nums, % or integer |
| Trend | 40px | Delta indicator icon (from localStorage cache) |
| Period | 100px | "Fall 2026" — Plex Mono |
| Computed | 100px | Relative time ("5 min ago"). `<time datetime>` attribute. |

---

## 8. Metric name formatting

```ts
const METRIC_LABELS: Record<string, string> = {
  enrollment_rate: 'Enrollment rate',
  avg_gpa: 'Average GPA',
  invoice_collection_rate: 'Invoice collection',
  plagiarism_flags: 'Plagiarism flags',
  active_students: 'Active students',
  avg_assessment_score: 'Avg assessment score',
}
// fallback: replace underscores, title-case
```

---

## 9. States

| State | Render |
|---|---|
| Loading | Skeleton rows (5) |
| Recalculating | Full table skeleton + "Recalculating..." spinner in header row |
| Empty (no KPIs) | "No KPIs computed yet. Click 'Recalculate all' to generate." |
| Error | Stale banner, last-known values still visible |

---

## 10. A11y

- `<caption>`: "Key performance indicators — Fall 2026".
- "Last recalculated": `<time datetime="{iso8601}">Nov 8, 2026 at 10:34 am</time>`.
- Delta icon: `aria-label="Up from prior period"` / `aria-label="Down from prior period"` / `aria-hidden="true"` on decorative arrows.
- Recalculate button: `aria-busy="true"` when loading.
- Auditor: `[Recalculate all]` button not rendered (not just disabled). Auditor cannot trigger data mutations.

---

## 11. Responsive

<768px: hide Trend and Period columns. Show Metric + Value + Computed only.

---

## 12. Implementation notes

1. `localStorage.kpiCache` structure: `{ [metric]: { [period]: value } }`. Updated on every successful GET. Cleared on POST recalculate response.
2. ITAdmin vs Auditor: `const canRecalculate = role === 'ITAdmin'`. The recalculate button and its loading state are conditionally rendered, not just disabled.
3. `computedAt` from API may be a full ISO timestamp or relative — store as ISO, display as relative using a `formatRelative(date)` utility consistent across all pages.
4. Value formatting: if value ends with `%` → display as-is. If integer (plagiarism_flags, active_students) → `toLocaleString('en-IN')`. No decimal on integers.
