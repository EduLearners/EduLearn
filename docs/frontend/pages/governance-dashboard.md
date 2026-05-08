# Page Spec — Governance Dashboard

**Route:** `/` (resolved when `currentPersona === 'Governance'`)
**Component file:** `src/pages/governance/GovernanceDashboard.tsx`
**Persona:** Governance (ITAdmin + Auditor roles)
**Craft pass:** 1 — delta from learner-dashboard.md; shell, tokens, typography, motion inherited
**Status:** Ready for implementation

---

## 1. Purpose

The ITAdmin's and Auditor's command center. Query-shaped: the user arrives with a specific question ("who reported the grade change?", "which tickets need assignment?") and the dashboard surfaces navigational entry points to answer it fast. Low dwell-time — each block is a launcher, not a destination.

Primary demo flex: the **persona switcher** in the top bar — this surface is where ITAdmin lands by default, and switching to Learner/Educator/Operations from here demonstrates the architecture explicitly.

---

## 2. Roles allowed

- `ITAdmin` — full governance blocks + persona switcher in top bar
- `Auditor` — read-only subset: Audit Log, Reports, KPIs, Audit Packages; Tickets read-only; Users hidden; Plagiarism hidden

---

## 3. API endpoints + data contract

All parallel via `useQueries()`.

| Block | Endpoint | Role |
|---|---|---|
| System users | `GET /api/users?status=Active&limit=1` (just total count) | ITAdmin |
| Open tickets | `GET /api/tickets?status=Open,InProgress&limit=5` | ITAdmin (full) + Auditor (read-only) |
| Audit log recent | `GET /api/audit-log?limit=10&orderBy=timestamp:desc` | Both |
| Plagiarism pending | `GET /api/plagiarism?status=Pending&limit=5` | ITAdmin only |
| Reports recent | `GET /api/reports?limit=5&orderBy=generatedAt:desc` | Both |
| KPI snapshot | `GET /api/kpis` | Both |

---

## 4. Layout — desktop ≥1024px

```
┌──────┬──────────────────────────────────────────────────────────┐
│ Rail │  TopBar (56px)                                            │
│      │  [EduLearn]  [▾ Governance]              [bell] [JD▾]   │
│ Dsh  │              └──persona switcher──┘                      │
│ Usr  ├──────────────────────────────────────────────────────────┤
│ ALog │                                                           │
│ Tkt  │  Governance — Admin                              ← h1    │
│ Plg  │  Fall 2026  ·  312 users  ·  5 open tickets  ·  2 flags  │
│ Rep  │                                                           │
│ KPI  │  ┌──────────────────────────────────────────────────┐    │
│ APkg │  │  Open tickets (5)                [View all →]   │    │
│      │  │  Aarav Mehta  Login issue  High  today       →  │    │
│      │  │  Diya Bhat    MFA reset    Med   yesterday   →  │    │
│      │  │  + 3 more                                       │    │
│      │  └──────────────────────────────────────────────────┘    │
│      │                                                           │
│      │  Recent audit events                             ← h2    │
│      │  ─────────────────────────────────────────────────        │
│      │  Anjali Iyer  SubmissionGraded  CS-301  2 min ago  →     │
│      │  Aarav Mehta  EnrollmentDropped  ECO-150  5h ago   →     │
│      │  Rajan Mehta  InvoiceGenerated  x50  9h ago        →     │
│      │  [View full audit log →]                                  │
│      │                                                           │
│      │  Plagiarism queue (2 pending)                    ← h2    │
│      │  ─────────────────────────────────────────────────        │
│      │  CS-301 PSet 3   78%   Anjali Iyer   2d ago    →         │
│      │  PHIL-220 Essay  62%   Anjali Iyer   yesterday  →        │
│      │                                                           │
│      │  KPI snapshot                                    ← h2    │
│      │  ─────────────────────────────────────────────────        │
│      │  Enrollment rate  92%  ↑    GPA avg  3.2              │
│      │  Invoice collection 78%  ↓    Plagiarism flags  2       │
│      │                                                           │
│      │  Quick access                                    ← h2    │
│      │  [Reports]  [Audit Packages]  [User Roster]              │
└──────┴──────────────────────────────────────────────────────────┘
```

**Persona switcher in top bar (ITAdmin only):**
Dropdown immediately right of brand mark: `[▾ Governance]`. Click → 4 options (Governance ✓, Operations, Educator, Learner). Select = auto-switch persona + toast "Switched to {persona} view." + nav rail repaints (300ms fade). Per routes.md section 4.

---

## 5. Welcome row

- ITAdmin: `Governance — Admin`
- Auditor: `Governance — Audit`

Term snapshot (secondary tier, IBM Plex Mono on numbers):
- ITAdmin: `Fall 2026 · {userCount} users · {openTickets} open tickets · {plagiarismPending} flags`
- Auditor: `Fall 2026 · Read-only access · {reportCount} reports available`

---

## 6. Open tickets block

Same queue block pattern as Operations dashboard.

Row format: `{studentName}  {subject}  {priority badge}  {relative time}  →`

Priority badges:
- Critical: `danger-500` background white text
- High: `warn-500` background white text
- Medium: `neutral-200` background `neutral-800` text
- Low: `neutral-100` background `neutral-600` text

ITAdmin actions: click row → `/admin/tickets/{id}` (with Assign / Resolve buttons).
Auditor actions: click row → `/admin/tickets/{id}` (read-only view, no action buttons).

Block hidden for Auditor if they have no tickets of their own.

---

## 7. Audit log block

Append-only — rendered as a read-only time-ordered list. No edit affordances.

Row format: `{userFullName}  {action}  {resourceType}  {relative time}  →`

- Action rendered as a human-readable verb (SubmissionGraded → "graded a submission", InvoiceGenerated → "generated invoice"). Verb mappings defined in a `formatAuditAction()` util.
- `[immutable]` badge NOT rendered (would be noise on a list of 10). Immutability is surfaced in the detail view, not the dashboard preview.
- "View full audit log" link → `/admin/audit-log`

---

## 8. Plagiarism queue block (ITAdmin only)

Row format: `{courseCode} {assessmentTitle}  {similarity}%  {flaggedBy}  {relative time}  →`

Hidden for Auditor entirely.

Same similarity color logic as Educator's plagiarism block. Click → `/admin/plagiarism/{id}` (with Confirm / Dismiss actions for ITAdmin).

---

## 9. KPI snapshot section

Not a full DataTable — a 2×2 stat grid with clean numbers. No hero-metric template.

```jsx
<div className="kpi-grid" style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)'}}>
  <KpiStat label="Enrollment rate" value="92%" delta="+2%" trend="up" />
  <KpiStat label="Avg GPA" value="3.2" delta="" trend="neutral" />
  <KpiStat label="Invoice collection" value="78%" delta="-4%" trend="down" />
  <KpiStat label="Plagiarism flags" value="2" delta="" trend="neutral" />
</div>
```

`<KpiStat>` component: label (caption tier, neutral-600) above value (subhead tier, neutral-900, Plex Mono, tabular-nums). Delta shown inline: `warn-500` for down, `success-500` for up, no delta indicator for neutral.

**NOT the hero-metric template** — no gradient background, no giant number with decorative accent. Just four small labeled stats in a grid.

---

## 10. Quick access buttons

Three secondary buttons: `[Reports]` → `/admin/reports`, `[Audit Packages]` → `/admin/audit-packages`, `[User Roster]` → `/admin/users` (ITAdmin only; hidden for Auditor).

---

## 11. States

| State | Behavior |
|---|---|
| **Default (ITAdmin)** | All blocks. Persona switcher visible. 5 tickets. 10 audit events. 2 plagiarism flags. 4 KPI stats. |
| **Default (Auditor)** | Tickets hidden. Plagiarism hidden. Users block hidden. KPI + reports + audit log visible. Read-only. Quick access: Reports + Audit Packages (no User Roster). |
| **Loading** | Skeleton rows for each block. KPI stats render as 4 skeleton rects. |
| **Empty tickets** | Block reads "No open tickets." — no further copy. |
| **Empty audit log** | Single line: "No audit events recorded yet." |
| **Error** | Stale banner (same pattern as Learner). |
| **Persona switch in flight** | Nav rail fades to neutral-50 at 50% opacity (150ms) during persona switch. New rail fades in (300ms) after route change. |

---

## 12. Persona switcher — detailed interaction spec

Per routes.md section 4. Rendered as a `<Dropdown>` in the top bar, immediately right of the brand mark.

```jsx
<Dropdown>
  <Dropdown.Toggle variant="link" className="persona-switcher" aria-label="Switch view">
    <span className="current-persona">Governance</span>
    <i className="bi bi-chevron-down ms-1" aria-hidden="true" />
  </Dropdown.Toggle>
  <Dropdown.Menu align="start" style={{minWidth: '180px'}}>
    <Dropdown.Header>Switch view</Dropdown.Header>
    {PERSONAS.map(p => (
      <Dropdown.Item
        key={p}
        active={p === currentPersona}
        onClick={() => handlePersonaSwitch(p)}
        aria-current={p === currentPersona ? 'true' : undefined}
      >
        {p === currentPersona && <i className="bi bi-check me-2" aria-hidden="true" />}
        {p}
      </Dropdown.Item>
    ))}
  </Dropdown.Menu>
</Dropdown>
```

On selection:
1. `dispatch(setCurrentPersona(p))` — Redux slice update
2. `sessionStorage.setItem('itPersona', p)` — persists across route changes
3. React Router `navigate('/')` — go to new persona's default route
4. Toast: "Switched to {p} view." (info-500, bottom-right, 2s auto-dismiss)

**Hidden for all non-ITAdmin roles.** The `<TopBar>` checks `role === 'ITAdmin'` and conditionally renders the switcher slot.

---

## 13. A11y (delta from Learner)

- Persona switcher: `aria-haspopup="listbox"`, active persona `aria-current="true"`, Escape dismisses
- Audit log rows: `role="row"`, each row `aria-label="{user} {action} {resource} {time} — append-only, cannot be edited"`
- KPI stats: use `<dl>/<dt>/<dd>` pattern — screen reader reads "Enrollment rate: 92%, up 2%" 
- Immutability of audit log: single `aria-description="Audit events are permanent records and cannot be modified."` on the `<section>` containing the audit log

---

## 14. Demo seed data

ITAdmin: **Vikash Arora** (deterministic userId)

| Block | Content |
|---|---|
| Welcome | "Governance — Admin" |
| Snapshot | "Fall 2026 · 312 users · 5 open tickets · 2 plagiarism flags" |
| Open tickets | Aarav Mehta "Login issue" High today; Diya Bhat "MFA reset" Medium yesterday; + 3 more |
| Audit events | Anjali Iyer SubmissionGraded CS-301 2 min; Aarav Mehta EnrollmentDropped ECO-150 5h; Rajan Mehta InvoiceGenerated ×50 9h |
| Plagiarism | CS-301 PSet 3 78% Anjali Iyer 2d; PHIL-220 Essay 62% Anjali Iyer yesterday |
| KPIs | Enrollment 92%↑, Avg GPA 3.2, Invoice collection 78%↓, Plagiarism flags 2 |

---

## 15. Responsive (same shell pattern as Learner)

<768px: persona switcher collapses to icon-only (a person-circle icon with a small down-chevron). Tapping opens the same dropdown. KPI grid stays 2-col (narrow is fine for 2 numbers per row). Tickets and audit rows scroll horizontally inside their containers if needed.

---

## 16. Implementation notes

1. **Persona switcher must be the first interactive element in the top bar after the brand mark.** z-index must be above content (use `z-dropdown` token).
2. **KPI refresh:** `GET /api/kpis` is a slow endpoint (aggregates). Use a longer cache: `staleTime: 5 * 60 * 1000` (5 min). Show stale indicator if > 10 min old.
3. **Audit log rows are `<a>` not `<button>`.** Each row navigates to the audit log page filtered to that resource ID.
4. **Auditor vs ITAdmin rendering:** use `const isReadOnly = role === 'Auditor'` to conditionally render action buttons within ticket rows and plagiarism rows. Don't create two separate components — one component with conditional props.
5. **KPI delta direction:** API returns raw value (`value: 92`). Direction (↑/↓) and delta amount (`+2%`) come from the previous stored value in localStorage (`kpiCache`). If no previous value, omit delta.
