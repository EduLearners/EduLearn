# Phase 2 Audit — Finance

## Lens A: Visibility

Sidebar items (Sidebar.jsx:71–76): Dashboard, Fees, Invoices, Payments, Scholarships, Notifications, Tickets.

Notable absences: All academic pages (Courses, Assessments, Submissions, Discussions, Sections, etc.), Student/Applicant management, Audit/Reports, User management.

## Lens B: Per-page rights

| Page | Allowed Actions | Access Control Mechanism |
|------|-----------------|--------------------------|
| /dashboard | Stats: total/pending/paid invoices, scholarships, fee schedules | FinanceDashboard.jsx calls invoiceService.getAll(), feeService.getAll(), scholarshipService.getAll() — all via FinancePolicy |
| /fees | Read all; Create; Update | Backend: FinancePolicy (Finance + ITAdmin) |
| /invoices | Read all; Generate bulk; Generate individual | Backend: FinancePolicy for mutate; GET all = FinancePolicy |
| /payments | Read by invoice; Record payment | Backend: POST = FinancePolicy; GET by invoice = `[Authorize]` |
| /scholarships | Read all; Create; Update; View by student | Backend: FinancePolicy |
| /notifications | Own notifications | Backend: `[Authorize]` + userId |
| /tickets | Create and view own | Backend: `[Authorize]` + own-only filter |
| /profile | View/edit own + MFA self-manage | Backend: ownership check; MFA includes Finance |

## Lens C: RBAC check

| Route | Expected | Actual Policy | Verdict |
|-------|----------|---------------|---------|
| GET /api/fees | Finance/ITAdmin | FinancePolicy | OK |
| POST /api/fees | Finance/ITAdmin | FinancePolicy | OK |
| PUT /api/fees/{id} | Finance/ITAdmin | FinancePolicy | OK |
| GET /api/invoices | Finance/ITAdmin | FinancePolicy | OK |
| POST /api/invoices/generate | Finance/ITAdmin | FinancePolicy | OK |
| POST /api/invoices/generate-bulk | Finance/ITAdmin | FinancePolicy | OK |
| GET /api/invoices/student/{studentId} | Finance/ITAdmin (+ Student self) | `[Authorize]` + Student-only check | OK from Finance perspective — Finance CAN read student invoices |
| GET /api/invoices/{id} | Finance/ITAdmin (+ Student self) | `[Authorize]` + Student-only check | OK from Finance perspective |
| POST /api/payments | Finance/ITAdmin | FinancePolicy | OK |
| GET /api/payments/invoice/{invoiceId} | Any auth | `[Authorize]` | **CONCERN** — All authenticated roles can view payment details for any invoice |
| GET /api/scholarships | Finance/ITAdmin | FinancePolicy | OK |
| GET /api/scholarships/student/{studentId} | Finance/ITAdmin | FinancePolicy | OK |
| POST /api/scholarships | Finance/ITAdmin | FinancePolicy | OK |
| GET /api/courses | All roles | AllUsersPolicy | OK — Finance can list courses (read-only, acceptable) |
| POST /api/courses | Instructor/DeptAdmin/ITAdmin | CourseManagerPolicy | OK — Finance blocked |
| GET /api/students/{id} | Any auth + ownership for Student | `[Authorize]` | OK — Finance can look up student by ID to validate invoice |
| GET /api/audit-log | Auditor/ITAdmin | Roles=Auditor,ITAdmin | OK — Finance blocked |
| GET /api/kpis | Auditor/ITAdmin | Roles=Auditor,ITAdmin | OK — Finance blocked |
| GET /api/users | Registrar/DeptAdmin/ITAdmin | UserViewPolicy | OK — Finance blocked from user list |
| POST /api/enrollment/enroll | Student/Registrar/ITAdmin | EnrollmentPolicy | OK — Finance blocked |

**Concern (High):** `GET /api/payments/invoice/{invoiceId}` uses bare `[Authorize]` (FallbackPolicy). Any authenticated user (Student, Instructor, Registrar, DeptAdmin, Auditor) can call this endpoint with any invoice ID and retrieve payment details including amounts. Finance domain data is exposed across all roles.  
Evidence: `PaymentsController.cs:106`

**Concern (Medium):** Finance has no access to `GET /api/audit-log` — so Finance staff cannot audit their own financial transactions. If a payment dispute arises, Finance cannot self-review the audit trail. They must escalate to ITAdmin/Auditor. This is a process gap, not a security gap.

**Concern (Low):** `GET /api/transcripts/student/{studentId}` — Finance can access student transcript data (bare `[Authorize]`, Student-only ownership check). Not a Finance use case.  
Evidence: `TranscriptsController.cs:163`

## Lens D: UX journey

- FinanceDashboard.jsx is clean and focused — only Finance-relevant data. Good separation from academic data.
- `invoiceService.getAll()` fetches all invoices — potentially large dataset with no pagination on the dashboard. If invoice count is high (thousands), dashboard load could be slow. No cap visible in the dashboard code.
- "Generate Invoice" quick action navigates to `/invoices` — no dedicated `/invoices/new` route. Generation happens from InvoicesPage presumably via modal/form. User flow is not obvious from just the sidebar.
- Payments page has no sidebar "New Payment" entry — it links to `/payments`. If PaymentsPage requires an invoice ID to create a payment, the flow requires navigating from Invoices page. Cross-page flow not guided in sidebar.
- MFA self-manage available for Finance (AuthController.cs:193 includes Finance in mfa/setup-self, confirm-self, disable). Finance can set up their own TOTP.

## Findings Summary

| Severity | Finding | Evidence |
|----------|---------|----------|
| High | `GET /api/payments/invoice/{invoiceId}` is bare `[Authorize]` — all authenticated roles can read payment amounts for any invoice | `PaymentsController.cs:106` |
| Low | Finance can read student transcripts via bare `[Authorize]` (not a Finance use case) | `TranscriptsController.cs:163` |
| Low | Finance has no self-service audit trail for their own financial actions (process gap, not security) | `AuditLogController.cs:47` |
