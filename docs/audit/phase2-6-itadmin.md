# Phase 2 Audit — ITAdmin

## Lens A: Visibility

Sidebar items (Sidebar.jsx:88–112): Dashboard, Users, Applicants, Students, Sections, Rooms, Enrollment, Timetable, Transcripts, Programs, Courses, Syllabus, Discussions, Assessments, Submissions, Grade Changes, Contents, Fees, Invoices, Payments, Scholarships, Reports, KPIs, Audit Log, Notifications, Tickets.

ITAdmin sees all 25 sidebar entries — the most complete role.

## Lens B: Per-page rights

| Page | Allowed Actions | Access Control Mechanism |
|------|-----------------|--------------------------|
| /dashboard | All stats: users, open tickets, students, courses, notifications; Open tickets list; Recent users table; Create User modal (any role) | ITAdminDashboard.jsx; posts to `/users` (AdminPolicy = ITAdmin only) |
| /users | List all; View detail; Create; Status update; MFA reset; Invite | Backend: AdminPolicy for create/status/mfa-reset; UserViewPolicy for list; bare `[Authorize]` for get/update |
| /applicants | Full CRUD (list, create, detail, update status) | Backend: Roles=Registrar,ITAdmin |
| /students | List; View; Create; Edit | Backend: Roles=Registrar,ITAdmin for write; Roles=Registrar,Instructor,ITAdmin for list |
| /sections | List; Create; Edit; View roster | Backend: Roles=Registrar,DeptAdmin,ITAdmin |
| /rooms | List; Create; View | Backend: GET=`[Authorize]`; POST=DeptAdminPolicy (ITAdmin OK) |
| /enrollment | Enroll; Drop; View by student/section | Backend: EnrollmentPolicy (ITAdmin OK) |
| /timetable | View any timetable | Backend: EnrollmentViewPolicy (ITAdmin OK) |
| /transcripts | Generate; View; Publish | Backend: Roles=Registrar,ITAdmin |
| /programs | List; Create; Edit | Backend: DeptAdminPolicy (ITAdmin OK) |
| /courses | List; Create; Edit | Backend: AllUsersPolicy + CourseManagerPolicy (ITAdmin OK) |
| /syllabi | List; Create; Edit | Backend: `[Authorize]` + Roles=Instructor,ITAdmin for mutate |
| /discussions | Post; Reply; Moderate (status) | Backend: `[Authorize]` + Roles=Instructor,ITAdmin for status |
| /assessments | List; Create; Publish; Edit | Backend: `[Authorize]` + Roles=Instructor,ITAdmin |
| /submissions | View all for any assessment; Grade | Backend: Roles=Instructor,ITAdmin |
| /grade-changes | Create; View audit trail | Backend: Roles=Instructor,ITAdmin; GET = Roles=Instructor,Auditor,ITAdmin |
| /contents | List; Upload; Version | Backend: Roles=Instructor,ITAdmin for mutate |
| /fees | List; Create; Update | Backend: FinancePolicy (ITAdmin OK) |
| /invoices | List; Generate; View student invoices | Backend: FinancePolicy + bare `[Authorize]` endpoints |
| /payments | Record; View | Backend: POST=FinancePolicy; GET=`[Authorize]` |
| /scholarships | List; Create; Update | Backend: FinancePolicy (ITAdmin OK) |
| /reports | Generate; List; Download | Backend: Roles=Auditor,ITAdmin |
| /kpis | View; Recalculate; Seed | Backend: Roles=Auditor,ITAdmin + Roles=ITAdmin for recalc/seed |
| /audit-log | View full log | Backend: Roles=Auditor,ITAdmin |
| /notifications | Own + test notification | Backend: `[Authorize]` + AdminPolicy for test |
| /tickets | All tickets (not just own); Assign; Resolve | Backend: `[Authorize]` for list (ITAdmin sees all); SupportStaffPolicy for assign/resolve |

## Lens C: RBAC check

| Route | Expected | Actual Policy | Verdict |
|-------|----------|---------------|---------|
| POST /api/users | ITAdmin only | AdminPolicy | OK |
| PUT /api/users/{id}/status | ITAdmin only | AdminPolicy | OK |
| POST /api/users/{id}/mfa/reset | ITAdmin only | AdminPolicy | OK |
| POST /api/users/{id}/invite | ITAdmin only | AdminPolicy | OK |
| GET /api/health | ITAdmin only | AdminPolicy | OK |
| POST /api/notifications/test | ITAdmin only | AdminPolicy | OK |
| POST /api/kpis/recalculate | ITAdmin only | Roles=ITAdmin | OK |
| POST /api/kpis/seed | ITAdmin only | Roles=ITAdmin | OK |
| PUT /api/tickets/{id}/assign | ITAdmin only | SupportStaffPolicy (=ITAdmin) | OK |
| PUT /api/tickets/{id}/resolve | ITAdmin only | SupportStaffPolicy (=ITAdmin) | OK |
| PUT /api/plagiarism/{id}/status | ITAdmin only | Roles=ITAdmin | OK |
| GET /api/audit-log | Auditor/ITAdmin | Roles=Auditor,ITAdmin | OK |
| GET /api/kpis | Auditor/ITAdmin | Roles=Auditor,ITAdmin | OK |
| POST /api/reports/generate | Auditor/ITAdmin | Roles=Auditor,ITAdmin | OK |
| GET /api/users | Registrar/DeptAdmin/ITAdmin | UserViewPolicy | OK |
| POST /api/auth/mfa/setup-self | Registrar/DeptAdmin/Finance/ITAdmin/Auditor | Explicit roles | OK — ITAdmin included |
| PUT /api/users/{id} | Self or ITAdmin | `[Authorize]` + in-code | OK — ITAdmin can update any user's profile |
| GET /api/tickets (list) | All auth, ITAdmin sees all | `[Authorize]` + in-code role check | OK |

**Concern (Low):** ITAdmin can call `PUT /api/users/{id}` (bare `[Authorize]`) to update any user's email, phone, name. This is intentional for admin purposes but there's no audit trail at the controller level for these updates — only the general audit log captures it if the `GlobalAuditMiddleware` is in place.

**Concern (Low):** `GET /api/timetable/student/{studentId}/{term}` is accessible to ITAdmin (EnrollmentViewPolicy includes ITAdmin) — can view any student's timetable. Correct for a superadmin role; noted for completeness.

**No hostile RBAC gaps found for ITAdmin** — all privileged routes correctly require ITAdmin via AdminPolicy, Roles=ITAdmin, or named policies that include ITAdmin.

## Lens D: UX journey

- ITAdminDashboard is the most feature-rich dashboard: stat cards, open-tickets panel, recent users table, create-user modal. All elements properly load data.
- Create User modal includes ALL_ROLES selector (ITAdminDashboard.jsx:16) — ITAdmin can assign any role including ITAdmin itself. This is privileged self-granting capability; intentional but worth noting as a segregation-of-duties concern.
- Notification stat card shows "—" always (ITAdminDashboard.jsx:172 — `card.key === 'notifications' ? '—' : ...`). "Notifications sent today" is never loaded. This is a known placeholder.
- Open tickets panel only shows first 5 open tickets (slice 0–5). If there are many open tickets, the dashboard understates severity.
- ITAdmin sidebar has 25 items — no grouping or collapsing. Navigation is dense but functional.
- MFA self-manage available and ITAdmin can also reset other users' MFA via `POST /api/users/{id}/mfa/reset`.

## Findings Summary

| Severity | Finding | Evidence |
|----------|---------|----------|
| Low | ITAdmin can self-assign ITAdmin role to new users (no segregation of duty constraint) | `ITAdminDashboard.jsx:16; UsersController.cs:45` |
| Low | Notifications stat card always shows "—" — dead data placeholder | `ITAdminDashboard.jsx:172` |
| Low | Open tickets panel shows max 5; dashboard understates backlog | `ITAdminDashboard.jsx:90` |
