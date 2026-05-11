# Frontend Module Ownership

Each member owns the routes and page components listed below. You are responsible for building, testing, and submitting PRs for your pages. **Phase 0 shared-shell components are owned by Utkarsh — do not build your own AppShell, sidebar, or DataTable.**

---

## Phase 0 — Shared Shell (Utkarsh)

Must merge before anyone starts Phase 1.

| Deliverable | File |
|---|---|
| Bootstrap 5 + Sass + `_tokens.scss` scaffold | `src/styles/` |
| AppShell (sidebar + top bar) | `src/components/shell/AppShell.tsx` |
| Sidebar with persona switcher | `src/components/shell/AppSidebar.tsx` |
| Route guards (`RequireAuth`, `RequirePersona`, `RequireRole`) | `src/components/auth/` |
| Auth context + JWT interceptor + sessionStorage | `src/auth/` + `src/api/axiosInstance.ts` |
| React Router v6 tree | `src/App.tsx` |
| Redux store + auth + persona slices | `src/store/` |
| React Query client | `src/api/queryClient.ts` |
| DataTable component | `src/components/shared/DataTable.tsx` |
| Offcanvas panel wrapper | `src/components/shared/SlidePanel.tsx` |
| EmptyState component | `src/components/shared/EmptyState.tsx` |
| Skeleton loader wrapper | `src/components/shared/SkeletonRows.tsx` |
| Toast queue context | `src/components/shared/ToastQueue.tsx` |
| IBM Plex fonts (self-hosted, OFL) | `public/fonts/` |
| `formatRelative(date)` util | `src/utils/time.ts` |
| `formatCurrency(amount)` util (en-IN locale) | `src/utils/format.ts` |

---

## Ashish — IAM Module

**Routes:**
- `/login` — `src/pages/auth/LoginPage.tsx`
- `/mfa-setup` — `src/pages/auth/MfaSetupPage.tsx`
- `/mfa-verify` — `src/pages/auth/MfaVerifyPage.tsx`
- `/admin/users` — `src/pages/governance/UsersListPage.tsx`
- `/admin/users/:id` — `src/pages/governance/UserDetailPage.tsx`

**Specs:**
- `docs/frontend/pages/login.md`
- `docs/frontend/pages/mfa-setup.md`
- `docs/frontend/pages/mfa-verify.md`
- `docs/frontend/pages/users-list.md`

**Backend endpoints:** `/api/auth/*`, `/api/users/*`

---

## Saurav — SRA + ETS Module

**Routes:**
- `/registrar/applicants` — `src/pages/operations/ApplicantsQueuePage.tsx`
- `/registrar/students/:id` — `src/pages/operations/StudentDetailPage.tsx`
- `/registrar/transcripts/issue` — `src/pages/operations/TranscriptIssuePage.tsx`
- `/student/transcript` — `src/pages/learner/TranscriptPage.tsx`
- `/student/timetable` — `src/pages/learner/TimetablePage.tsx`
- `/teaching/sections/:id/roster` — `src/pages/educator/SectionRosterPage.tsx`
- `/registrar/enrollment` — `src/pages/operations/EnrollmentPage.tsx`

**Specs:**
- `docs/frontend/pages/applicants-queue.md`
- `docs/frontend/pages/student-detail.md`
- `docs/frontend/pages/transcript-issue.md`
- `docs/frontend/pages/transcript.md`
- `docs/frontend/pages/section-roster.md`

**Backend endpoints:** `/api/applicants/*`, `/api/students/*`, `/api/transcripts/*`, `/api/enrollment/*`, `/api/sections/*`, `/api/timetable/*`

---

## Vikash — CCM + LMS + AGI Module

**Routes:**
- `/courses` — `src/pages/educator/CoursesPage.tsx`
- `/courses/:id` — `src/pages/educator/CourseDetailPage.tsx`
- `/teaching/sections/:id/gradebook` — `src/pages/educator/GradebookPage.tsx`
- `/teaching/sections/:id/assessments` — `src/pages/educator/AssessmentEditorPage.tsx`
- `/student/courses/:id` — `src/pages/learner/CourseViewPage.tsx`
- `/student/assessments/:id` — `src/pages/learner/SubmitAssessmentPage.tsx`
- `/teaching/content` — `src/pages/educator/ContentUploadPage.tsx`
- `/admin/plagiarism/queue` — `src/pages/governance/PlagiarismQueuePage.tsx`
- `/admin/plagiarism/:id` — `src/pages/governance/PlagiarismDetailPage.tsx`

**Specs:**
- `docs/frontend/pages/gradebook.md`
- `docs/frontend/pages/assessment-editor.md`
- `docs/frontend/pages/courses.md`
- `docs/frontend/pages/course-detail.md`
- `docs/frontend/pages/submit-assessment.md`
- `docs/frontend/pages/content-upload.md`
- `docs/frontend/pages/plagiarism-resolve.md`

**Backend endpoints:** `/api/courses/*`, `/api/programs/*`, `/api/assessments/*`, `/api/submissions/*`, `/api/content/*`, `/api/discussions/*`, `/api/plagiarism/*`, `/api/grade-changes/*`

---

## Tanya — SFB Module

**Routes:**
- `/student/invoices/:id` — `src/pages/learner/InvoiceDetailPage.tsx`
- `/finance/invoices` — `src/pages/operations/InvoiceGeneratePage.tsx`
- `/finance/payments` — `src/pages/operations/PaymentsLedgerPage.tsx`
- `/finance/fees` — `src/pages/operations/FeesEditorPage.tsx`
- `/finance/scholarships` — `src/pages/operations/ScholarshipsPage.tsx`

**Specs:**
- `docs/frontend/pages/invoice-detail.md`
- `docs/frontend/pages/invoice-generate.md`
- `docs/frontend/pages/payments-ledger.md`

**Backend endpoints:** `/api/invoices/*`, `/api/payments/*`, `/api/fees/*`, `/api/scholarships/*`

---

## Utkarsh — RKA Module + Phase 0

**Routes (Phase 2):**
- `/admin/reports` — `src/pages/governance/ReportsPage.tsx`
- `/admin/kpis` — `src/pages/governance/KpisPage.tsx`
- `/admin/audit-packages` — `src/pages/governance/AuditPackagesPage.tsx`
- `/admin/audit-log` — `src/pages/governance/AuditLogPage.tsx`

**Specs:**
- `docs/frontend/pages/reports.md`
- `docs/frontend/pages/kpis.md`
- `docs/frontend/pages/audit-log.md`

**Backend endpoints:** `/api/reports/*`, `/api/kpis/*`, `/api/audit-packages/*`, `/api/audit-log`

---

## Swarna — NHT Module

**Routes:**
- `/notifications` — `src/pages/shared/NotificationsPage.tsx`
- `/tickets` — `src/pages/shared/TicketsListPage.tsx`
- `/tickets/:id` — `src/pages/shared/TicketDetailPage.tsx`

**Specs:**
- `docs/frontend/pages/notifications.md`
- `docs/frontend/pages/ticket-detail.md`

**Backend endpoints:** `/api/notifications/*`, `/api/tickets/*`

---

## Dashboards (Phase 1 — each member builds own persona)

| Persona | Owner | Component |
|---|---|---|
| Learner Dashboard | Saurav | `src/pages/learner/LearnerDashboard.tsx` |
| Educator Dashboard | Vikash | `src/pages/educator/EducatorDashboard.tsx` |
| Operations Dashboard | Tanya | `src/pages/operations/OperationsDashboard.tsx` |
| Governance Dashboard | Utkarsh | `src/pages/governance/GovernanceDashboard.tsx` |

Spec: `docs/frontend/pages/learner-dashboard.md`, `docs/frontend/pages/educator-dashboard.md`, etc.
