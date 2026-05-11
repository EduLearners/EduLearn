# Routes — EduLearn Frontend

**Status:** Locked 2026-05-07.
**Router:** React Router v6 (BrowserRouter + nested Routes).
**Auth:** sessionStorage JWT + Axios interceptor + `<RequireAuth>` + `<RequirePersona>` + `<RequireRole>` route guards.

Every route in EduLearn must appear in this file. Every backend endpoint in `docs/ARCHITECTURE-REFERENCE.md` must be consumable by at least one route here.

---

## 1. Public routes (unauthenticated)

| Path | Component | Notes |
|---|---|---|
| `/login` | `<LoginPage>` | Username + password form. POST `/api/auth/login`. On success → MFA flow OR root. |
| `/mfa-verify` | `<MfaVerifyPage>` | Reached via `mfa_pending` JWT. POST `/api/auth/mfa/verify`. |
| `/mfa-setup` | `<MfaSetupPage>` | First-time MFA enrollment. POST `/api/auth/mfa/setup` then verify. |
| `/forgot` | `<ForgotPage>` | Email-based reset (deferred to v2 if endpoint missing). |
| `/register` | `<RegisterPage>` | POST `/api/auth/register`. Self-registration for Students/Applicants. |
| `/403` | `<ForbiddenPage>` | Wrong-role landing. Calm copy + login link. |
| `/404` | `<NotFoundPage>` | Calm copy + link home. |
| `/offline` | `<OfflinePage>` | Network error fallback. |

---

## 2. Authenticated routes (post-MFA)

All authenticated routes wrapped in `<AppShell>` (sidebar + top bar + canvas) and gated by `<RequireAuth>`.

### 2.1 Universal (all roles)

| Path | Component | Backend | Persona |
|---|---|---|---|
| `/` | `<RoleHome>` redirect → persona's default | (none) | resolves at runtime |
| `/profile` | `<ProfilePage>` | GET/PUT `/api/users/me` | all |
| `/settings/security` | `<SecurityPage>` | POST `/api/users/{id}/mfa/reset` (own) | all |
| `/notifications` | `<NotificationsPage>` | GET `/api/notifications`, PUT `/api/notifications/{id}/read` | all |
| `/tickets` | `<TicketsListPage>` | GET `/api/tickets` | all |
| `/tickets/new` | `<TicketCreatePage>` | POST `/api/tickets` | all |
| `/tickets/:id` | `<TicketDetailPage>` | GET `/api/tickets/{id}` | all (creator/assignee/ITAdmin only enforced on backend) |

### 2.2 Learner persona (Student)

Default route: `/` → resolves to `<LearnerDashboard>`.

| Path | Component | Backend | Notes |
|---|---|---|---|
| `/` | `<LearnerDashboard>` | composite of multiple endpoints | Showpiece per Shape Brief 01 |
| `/courses` | `<MyCoursesPage>` | GET `/api/enrollments/student/{me}` | Card grid + filters |
| `/courses/:id` | `<CourseDetailPage>` | GET `/api/courses/{id}` + tabs | Has Tabs: Syllabus, Content, Assessments, Discussions |
| `/courses/:id/syllabus` | `<SyllabusTab>` | GET `/api/syllabi/course/{id}` | Tab inside CourseDetailPage |
| `/courses/:id/content` | `<ContentTab>` | GET `/api/content/course/{id}` | Tab — Student view = read-only |
| `/courses/:id/assessments` | `<AssessmentsTab>` | GET `/api/assessments/course/{id}` | Tab — Student view |
| `/courses/:id/discussions` | `<DiscussionsTab>` | GET `/api/discussions/course/{id}` | Tab |
| `/discussions/:id` | `<DiscussionDetailPage>` | GET `/api/discussions/{id}` | Reply UI |
| `/enrollment/browse` | `<EnrollmentBrowsePage>` | GET `/api/sections?courseId=&term=` | Browse + enroll |
| `/assessments/:id` | `<AssessmentDetailPage>` | GET `/api/assessments/{id}` | Submission entry point |
| `/assessments/:id/submit` | `<SubmissionFormPage>` | POST `/api/submissions` | File upload + submit |
| `/grades` | `<MyGradesPage>` | GET `/api/submissions/student/{me}` | All grades across courses |
| `/transcripts` | `<MyTranscriptsPage>` | GET `/api/transcripts/student/{me}` | List of issued/draft transcripts |
| `/transcripts/:id` | `<TranscriptViewPage>` | GET `/api/transcripts/{id}` | View + PDF download |
| `/timetable` | `<MyTimetablePage>` | GET `/api/timetable/student/{me}/{term}` | Weekly grid |
| `/finance/invoices` | `<MyInvoicesPage>` | GET `/api/invoices/student/{me}` | Filtered list |
| `/finance/invoices/:id` | `<InvoiceDetailPage>` | GET `/api/invoices/{id}` | View + Pay action |
| `/finance/invoices/:id/pay` | `<InvoicePayPage>` | POST `/api/payments` | Pay form |
| `/finance/scholarships` | `<MyScholarshipsPage>` | GET `/api/scholarships/student/{me}` | Read-only |

### 2.3 Educator persona (Instructor + DeptAdmin)

Default route: `/` → resolves to `<EducatorDashboard>`.

| Path | Component | Backend | Allowed Roles |
|---|---|---|---|
| `/` | `<EducatorDashboard>` | composite | Instructor, DeptAdmin |
| `/teaching/courses` | `<TeachingCoursesPage>` | GET `/api/courses?instructor=me` | Both |
| `/teaching/courses/:id` | `<CourseDetailPage>` (Instructor view) | GET `/api/courses/{id}` | Both — write actions enabled |
| `/teaching/sections` | `<MySectionsPage>` | GET `/api/sections?instructor=me` | Both |
| `/teaching/sections/:id` | `<SectionDetailPage>` | GET `/api/sections/{id}` | Both |
| `/teaching/sections/:id/roster` | `<SectionRosterPage>` | GET `/api/enrollments/section/{id}` | Both |
| `/teaching/sections/:id/gradebook` | `<GradebookPage>` | GET `/api/submissions/assessment/{id}` per assessment | Both — showpiece |
| `/teaching/assessments` | `<AssessmentsListPage>` | GET `/api/assessments` (filtered by instructor) | Both |
| `/teaching/assessments/new` | `<AssessmentEditPage>` | POST `/api/assessments` | Both |
| `/teaching/assessments/:id/edit` | `<AssessmentEditPage>` | PUT `/api/assessments/{id}` | Both — only when status=Draft |
| `/teaching/submissions/:id/grade` | `<SubmissionGradePage>` (or Offcanvas) | POST `/api/submissions/{id}/grade` | Both |
| `/teaching/content` | `<ContentManagePage>` | GET `/api/content` (own courses) | Both |
| `/teaching/content/upload` | `<ContentUploadPage>` | POST `/api/content/upload` | Both |
| `/teaching/discussions` | `<DiscussionsManagePage>` | GET `/api/discussions` | Both |
| `/teaching/plagiarism/queue` | `<PlagiarismQueuePage>` | GET `/api/plagiarism?status=Pending` | Both |
| `/admin/programs` | `<ProgramsListPage>` | GET `/api/programs` | DeptAdmin only |
| `/admin/programs/:id/edit` | `<ProgramEditPage>` | PUT `/api/programs/{id}` | DeptAdmin only |
| `/admin/courses` | `<CoursesListPage>` | GET `/api/courses` | DeptAdmin only |
| `/admin/courses/new` | `<CourseEditPage>` | POST `/api/courses` | DeptAdmin only |
| `/admin/sections/new` | `<SectionEditPage>` | POST `/api/sections` | DeptAdmin only |
| `/admin/rooms` | `<RoomsListPage>` | GET `/api/rooms` | DeptAdmin only |

### 2.4 Operations persona (Registrar + Finance)

Default route: `/` → resolves to `<OperationsDashboard>`.

| Path | Component | Backend | Allowed Roles |
|---|---|---|---|
| `/` | `<OperationsDashboard>` | composite | Both |
| `/admissions/applicants` | `<ApplicantsQueuePage>` | GET `/api/applicants` | Registrar (write), Finance (read-only) |
| `/admissions/applicants/:id` | `<ApplicantDetailPage>` | GET `/api/applicants/{id}` | Registrar (write status) |
| `/registry/students` | `<StudentsListPage>` | GET `/api/students` | Registrar (write), Finance (read-only) |
| `/registry/students/:id` | `<StudentDetailPage>` | GET `/api/students/{id}` | Registrar (write) |
| `/registry/students/:id/transcript` | `<StudentTranscriptPage>` | GET `/api/transcripts/student/{id}` | Registrar (issue), Finance (read) |
| `/registry/transcripts/issue` | `<TranscriptIssuePage>` | POST `/api/transcripts/generate/{studentId}` | Registrar |
| `/registry/enrollments` | `<EnrollmentsManagePage>` | GET `/api/enrollments` | Registrar |
| `/finance/invoices` | `<InvoicesListPage>` | GET `/api/invoices` | Finance (write), Registrar (read-only) |
| `/finance/invoices/generate` | `<InvoiceGeneratePage>` | POST `/api/invoices/generate` | Finance |
| `/finance/invoices/:id` | `<InvoiceDetailPage>` (Operations view) | GET `/api/invoices/{id}` | Both |
| `/finance/payments` | `<PaymentsLedgerPage>` | GET `/api/payments` | Finance (write), Registrar (read) |
| `/finance/payments/new` | `<PaymentRecordPage>` | POST `/api/payments` | Finance |
| `/finance/fees` | `<FeeSchedulesListPage>` | GET `/api/fees` | Finance |
| `/finance/fees/new` | `<FeeScheduleEditPage>` | POST `/api/fees` | Finance |
| `/finance/scholarships` | `<ScholarshipsListPage>` | GET `/api/scholarships` | Finance |
| `/finance/scholarships/new` | `<ScholarshipEditPage>` | POST `/api/scholarships` | Finance |

### 2.5 Governance persona (ITAdmin + Auditor)

Default route: `/` → resolves to `<GovernanceDashboard>`.

| Path | Component | Backend | Allowed Roles |
|---|---|---|---|
| `/` | `<GovernanceDashboard>` | composite | Both |
| `/admin/users` | `<UsersListPage>` | GET `/api/users` | ITAdmin (write), Auditor (read) |
| `/admin/users/:id` | `<UserDetailPage>` | GET `/api/users/{id}` | ITAdmin |
| `/admin/users/new` | `<UserCreatePage>` | POST `/api/users` | ITAdmin |
| `/admin/audit-log` | `<AuditLogPage>` | GET `/api/audit-log` | Both — read-only |
| `/admin/plagiarism/queue` | `<PlagiarismResolveQueue>` | GET `/api/plagiarism` | ITAdmin (resolve) |
| `/admin/plagiarism/:id` | `<PlagiarismDetailPage>` | GET `/api/plagiarism/{id}` | ITAdmin |
| `/admin/tickets` | `<TicketsAdminPage>` | GET `/api/tickets` (all) | ITAdmin (assign/resolve), Auditor (read) |
| `/admin/tickets/:id/assign` | inline in TicketDetail | PUT `/api/tickets/{id}/assign` | ITAdmin |
| `/admin/reports` | `<ReportsListPage>` | GET `/api/reports` | Both |
| `/admin/reports/new` | `<ReportGeneratePage>` | POST `/api/reports/generate` | ITAdmin (write), Auditor (write) |
| `/admin/reports/:id` | `<ReportDetailPage>` | GET `/api/reports/{id}/download` | Both |
| `/admin/kpis` | `<KpisPage>` | GET `/api/kpis` | Both |
| `/admin/kpis/recalculate` | inline action | POST `/api/kpis/recalculate` | ITAdmin |
| `/admin/audit-packages` | `<AuditPackagesPage>` | GET/POST `/api/audit-packages` | Auditor (write), ITAdmin (write) |

---

## 3. Route guards

Three layers wrap each route, in this order:

```jsx
<Route element={<AppShell />}>
  <Route element={<RequireAuth />}>           {/* JWT exists + valid */}
    <Route element={<RequirePersona persona="Learner" />}>
      <Route path="/" element={<LearnerDashboard />} />
      <Route path="/courses" element={<MyCoursesPage />} />
      ...
    </Route>
    <Route element={<RequirePersona persona="Educator" />}>
      <Route element={<RequireRole role="DeptAdmin" />}>
        <Route path="/admin/programs" element={<ProgramsListPage />} />
      </Route>
      ...
    </Route>
  </Route>
</Route>
```

`<RequirePersona>` reads the user's role from sessionStorage, resolves Role→Persona via `project_frontend_persona_model.md` mapping. ITAdmin's "current persona" is read from a Redux slice (default = Governance, switchable via persona switcher in top bar).

---

## 4. Special routes for ITAdmin (universal)

Because ITAdmin is in every backend policy, they have access to **all** routes. The persona switcher controls which **default route** + **nav rail** they see, not which routes they can access.

### Cross-persona route access behavior (ITAdmin only)

When ITAdmin is in persona X and navigates to a route that belongs to persona Y (e.g., they are in "Learner" persona and navigate directly to `/admin/users` which is "Governance"):

**Behavior: auto-switch persona + show toast.**

```
1. RequirePersona detects: current persona = Learner, route belongs to Governance.
2. Auto-update Redux currentPersona slice to 'Governance'.
3. Persist 'Governance' to sessionStorage.itPersona.
4. Re-render AppSidebar with Governance nav rail (300ms fade).
5. Render the target route normally (/admin/users).
6. Show toast (info-500): "Switched to Governance view."
```

This is the friendliest behavior for the ITAdmin who is context-jumping across entities (their primary workflow). It does not block, does not warn, does not require confirmation. The toast is informational only.

**Route-to-persona mapping** (for the guard implementation):

| Route prefix | Persona it belongs to |
|---|---|
| `/courses`, `/grades`, `/enrollment`, `/assessments`, `/transcripts`, `/finance/invoices`, `/timetable` | Learner |
| `/teaching`, `/admin/programs`, `/admin/courses`, `/admin/sections`, `/admin/rooms` | Educator |
| `/admissions`, `/registry`, `/finance/payments`, `/finance/fees`, `/finance/scholarships` | Operations |
| `/admin/users`, `/admin/audit-log`, `/admin/plagiarism`, `/admin/tickets`, `/admin/reports`, `/admin/kpis`, `/admin/audit-packages` | Governance |
| `/`, `/profile`, `/settings`, `/notifications`, `/tickets` | Universal (no persona switch) |

**Implementation note**: `<RequirePersona>` should only enforce switching for ITAdmin. For other roles, if they somehow reach an out-of-scope route, show `/403`.

---

## 5. URL conventions

- All paths kebab-case (`/audit-log`, not `/auditLog`).
- Detail routes use IDs (`/tickets/:id`), never slugs.
- Verb routes for actions (`/finance/invoices/generate`, `/admissions/applicants/:id/approve`).
- Tab state lives in the URL (`?tab=syllabus`) NOT in component state — preserves back/forward navigation.
- Filter state lives in the URL (`?status=Pending&term=Fall2026`) NOT in Redux for shareable links.
- Pagination in URL (`?page=2&pageSize=20`).

---

## 6. Coverage check

Every backend endpoint in `docs/ARCHITECTURE-REFERENCE.md` must be consumed by at least one route. Verification table will be generated when implementation starts (script: grep route definitions + endpoint paths).
