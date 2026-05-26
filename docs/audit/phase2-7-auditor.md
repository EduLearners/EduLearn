# Phase 2 Audit — Auditor

## Lens A: Visibility

Sidebar items (Sidebar.jsx:80–85): Dashboard, Reports, KPIs, Audit Log, Grade Changes, Notifications, Tickets.

Notable absences: All academic management pages, financial management, user management, student/applicant/section management. Auditor is intentionally read-only narrow scope.

## Lens B: Per-page rights

| Page | Allowed Actions | Access Control Mechanism |
|------|-----------------|--------------------------|
| /dashboard | Stats: audit logs (last 30 days), reports generated, KPIs tracked, grade changes (always "—"), resolved tickets | AuditorDashboard.jsx calls reportService, kpiService, auditLogService, ticketService — all via Auditor-allowed policies |
| /reports | View list; Generate new report; Download | Backend: Roles=Auditor,ITAdmin |
| /kpis | View all KPIs | Backend: Roles=Auditor,ITAdmin (read); recalculate/seed = Roles=ITAdmin only |
| /audit-log | View full audit log | Backend: Roles=Auditor,ITAdmin |
| /grade-changes | View audit trail for a submission | Backend: GET submission/{id} = Roles=Instructor,Auditor,ITAdmin |
| /notifications | Own notifications | Backend: `[Authorize]` + userId |
| /tickets | Create and view own tickets | Backend: `[Authorize]` + own-only filter |
| /profile | View/edit own + MFA self-manage | Backend: ownership check; MFA includes Auditor |

## Lens C: RBAC check

| Route | Expected | Actual Policy | Verdict |
|-------|----------|---------------|---------|
| GET /api/audit-log | Auditor/ITAdmin | Roles=Auditor,ITAdmin | OK |
| POST /api/audit-packages/generate | Auditor/ITAdmin | Roles=Auditor,ITAdmin | OK |
| GET /api/audit-packages/{id}/download | Auditor/ITAdmin | Roles=Auditor,ITAdmin | OK |
| GET /api/kpis | Auditor/ITAdmin | Roles=Auditor,ITAdmin | OK |
| POST /api/kpis/recalculate | ITAdmin only | Roles=ITAdmin | OK — Auditor blocked |
| POST /api/kpis/seed | ITAdmin only | Roles=ITAdmin | OK — Auditor blocked |
| GET /api/reports | Auditor/ITAdmin | Roles=Auditor,ITAdmin | OK |
| POST /api/reports/generate | Auditor/ITAdmin | Roles=Auditor,ITAdmin | OK |
| GET /api/reports/{id}/download | Auditor/ITAdmin | Roles=Auditor,ITAdmin | OK |
| GET /api/grade-changes/submission/{id} | Instructor/Auditor/ITAdmin | Roles=Instructor,Auditor,ITAdmin | OK |
| POST /api/grade-changes | Instructor/ITAdmin | Roles=Instructor,ITAdmin | OK — Auditor blocked from creating |
| GET /api/fees | Finance/ITAdmin | FinancePolicy | OK — Auditor blocked |
| GET /api/invoices | Finance/ITAdmin | FinancePolicy | OK — Auditor blocked |
| GET /api/invoices/student/{studentId} | Finance/ITAdmin + Student self | `[Authorize]` | **CONCERN** — Auditor can read student invoice data |
| GET /api/invoices/{id} | Finance/ITAdmin + Student self | `[Authorize]` | **CONCERN** — Auditor can read any invoice |
| GET /api/payments/invoice/{invoiceId} | Finance/ITAdmin + Student self | `[Authorize]` | **CONCERN** — Auditor can read payment data |
| GET /api/transcripts/student/{studentId} | Registrar/ITAdmin ideally | `[Authorize]` | OK for Auditor — academic data for audit purposes |
| GET /api/students/{id} | Any auth + Student self-only | `[Authorize]` + Student-only check | OK — Auditor can look up student details |
| GET /api/submissions/student/{studentId} | Any auth + Student self-only | `[Authorize]` + Student-only check | OK — Auditor can read submission history (for audit) |
| GET /api/users | Registrar/DeptAdmin/ITAdmin | UserViewPolicy | OK — Auditor blocked |
| POST /api/users | ITAdmin only | AdminPolicy | OK — Auditor blocked |
| PUT /api/plagiarism/{id}/status | ITAdmin only | Roles=ITAdmin | OK — Auditor blocked from resolving |
| GET /api/plagiarism/student/{studentId}/integrity | Any auth + Student self-only | `[Authorize]` + Student-only check | OK — Auditor can check integrity status |

**Concern (High):** `GET /api/invoices/student/{studentId}`, `GET /api/invoices/{id}`, and `GET /api/payments/invoice/{invoiceId}` are all bare `[Authorize]` endpoints. Auditor can read full financial data (invoice amounts, payment amounts, payment dates). Finance policy endpoints (`GET /api/fees`, `GET /api/invoices` list) correctly block Auditor. However, the per-resource lookup endpoints bypass the FinancePolicy restriction. This is an inconsistent access model — the intent appears to be that only Finance/ITAdmin manage finance, but Auditor can read individual records if they know IDs.  
Evidence: `InvoicesController.cs:246,269; PaymentsController.cs:106`

**Concern (Medium):** GradeChanges page shows in Auditor sidebar and AuditorDashboard.jsx:17 has a quick action for it. The GET endpoint exists (`GET /api/grade-changes/submission/{submissionId}`) and Auditor is included. However, to use this, Auditor must know a submission ID — there's no endpoint to list all grade changes (no `GET /api/grade-changes` list endpoint). The Auditor cannot enumerate grade changes without knowing specific submission IDs. This creates a functional gap in audit capability.  
Evidence: `GradeChangesController.cs:83–91; routes.json`

**Concern (Low):** AuditorDashboard.jsx:83 forces `gradeChanges` stat to always show "—" (`card.key === 'gradeChanges' ? '—' : ...`). There is no API endpoint to count grade changes. This is an acknowledged placeholder but represents a missing feature for audit completeness.  
Evidence: `AuditorDashboard.jsx:83`

**Positive finding:** Auditor is correctly excluded from all mutate operations — no POST/PUT/DELETE endpoints have Auditor in their policy except `POST /api/reports/generate` and `POST /api/audit-packages/generate` (both read-style generation endpoints).

## Lens D: UX journey

- AuditorDashboard.jsx header shows "Read Only · {TERM}" badge — good UX signaling of role constraints.
- Grade Changes stat card always shows "—" (AuditorDashboard.jsx:83). This is noted in the code but is a clear UX gap — the dashboard is incomplete.
- Grade Changes quick action links to `/grade-changes`. GradeChangesPage.jsx hides the create button for non-Instructor/ITAdmin (`canCreate` check at GradeChangesPage.jsx:40). However, the page would likely show an empty table or 403 because there's no list-all endpoint accessible to Auditor.
- Auditor can generate audit packages and reports — these are the primary outputs for an audit role. Flow seems well-supported.
- Audit log page accessible with full history — no time-range default filter visible from the dashboard call `auditLogService.getAll({ limit: 100 })`. If there are >100 records, the stat count caps at 100, underreporting actual activity.

## Findings Summary

| Severity | Finding | Evidence |
|----------|---------|----------|
| High | Auditor can read individual invoice and payment records via bare `[Authorize]` endpoints — bypasses FinancePolicy on per-resource lookups | `InvoicesController.cs:246,269; PaymentsController.cs:106` |
| Medium | No `GET /api/grade-changes` list endpoint — Auditor cannot enumerate grade changes for audit without knowing specific submission IDs | `routes.json` (no list route for grade-changes) |
| Low | Grade Changes stat card always hardcoded "—" — incomplete dashboard for audit role | `AuditorDashboard.jsx:83` |
| Low | Audit log "last 30 days" stat capped at 100 records — may underreport actual log volume | `AuditorDashboard.jsx:46` |
