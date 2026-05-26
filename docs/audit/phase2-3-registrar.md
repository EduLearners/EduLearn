# Phase 2 Audit — Registrar

## Lens A: Visibility

Sidebar items (Sidebar.jsx:43–54): Dashboard, Applicants, Students, Sections, Enrollment, Transcripts, Courses, Syllabus, Discussions, Timetable, Programs, Notifications, Tickets.

Notable absences: Rooms (no create/manage), Finance pages, Grade Changes, Assessments, Submissions, Reports, KPIs, Audit Log, Users.

## Lens B: Per-page rights

| Page | Allowed Actions | Access Control Mechanism |
|------|-----------------|--------------------------|
| /dashboard | View applicant stats, student counts, section counts, enrollment totals, transcript counts; Create Student User quick action | Frontend: RegistrarDashboard.jsx calls applicant/student/course/section/enrollment/transcript services; also includes inline "Create Student User" modal (posts to `/auth/register`) |
| /applicants | View list; Create; Update status | Backend: Roles=Registrar,ITAdmin (ApplicantsController.cs:28,76,110) |
| /students | View list; View detail; Edit | Backend: GET list = Roles=Registrar,Instructor,ITAdmin; PUT = Roles=Registrar,ITAdmin |
| /sections | View list; Create; Edit | Backend: GET list/POST/PUT = Roles=Registrar,DeptAdmin,ITAdmin |
| /enrollment | Enroll students; Drop enrollments; View by student/section | Backend: EnrollmentPolicy (Registrar OK); RosterViewPolicy (Registrar OK) |
| /transcripts | Generate; View; Publish | Backend: POST generate = Roles=Registrar,ITAdmin; GET = `[Authorize]`; PUT publish = Roles=Registrar,ITAdmin |
| /courses | Read all; no create/edit (backend blocks: CourseManagerPolicy excludes Registrar) | Backend: GET = AllUsersPolicy; POST/PUT = CourseManagerPolicy (excludes Registrar) |
| /syllabi | Read only | Backend: GET = `[Authorize]`; POST/PUT = Roles=Instructor,ITAdmin (blocks Registrar) |
| /discussions | Post, reply | Backend: `[Authorize]` |
| /timetable | View section timetable | Backend: EnrollmentViewPolicy (includes Registrar) |
| /programs | Read only | Backend: GET = `[Authorize]`; POST/PUT = DeptAdminPolicy (blocks Registrar) |
| /notifications | Own notifications | Backend: `[Authorize]` + userId |
| /tickets | Create and view own | Backend: `[Authorize]` + own-only filter |
| /profile | View/edit own + MFA self-manage | Backend: ownership check; MFA self endpoints include Registrar |

## Lens C: RBAC check

| Route | Expected | Actual Policy | Verdict |
|-------|----------|---------------|---------|
| POST /api/applicants | Registrar/ITAdmin | Roles=Registrar,ITAdmin | OK |
| GET /api/students | Registrar/Instructor/ITAdmin | Roles=Registrar,Instructor,ITAdmin | OK |
| PUT /api/students/{id} | Registrar/ITAdmin | Roles=Registrar,ITAdmin | OK |
| GET /api/sections (list) | Registrar/DeptAdmin/ITAdmin | Roles=Registrar,DeptAdmin,ITAdmin | OK |
| POST /api/sections | Registrar/DeptAdmin/ITAdmin | Roles=Registrar,DeptAdmin,ITAdmin | OK |
| POST /api/transcripts/generate/{studentId} | Registrar/ITAdmin | Roles=Registrar,ITAdmin | OK |
| PUT /api/transcripts/{id}/publish | Registrar/ITAdmin | Roles=Registrar,ITAdmin | OK |
| GET /api/plagiarism/{id} | Instructor/Registrar/ITAdmin | Roles=Instructor,Registrar,ITAdmin | OK — Registrar can view reports |
| GET /api/users | Registrar/DeptAdmin/ITAdmin | UserViewPolicy | OK — Registrar CAN list all users |
| GET /api/users/{id} | Self or privileged | `[Authorize]` + in-code: Registrar is marked privileged | OK — Registrar can view any user profile |
| POST /api/users | ITAdmin only | AdminPolicy | OK — Registrar blocked |
| GET /api/fees | Finance/ITAdmin | FinancePolicy | OK — Registrar blocked |
| GET /api/kpis | Auditor/ITAdmin | Roles=Auditor,ITAdmin | OK — Registrar blocked |
| GET /api/audit-log | Auditor/ITAdmin | Roles=Auditor,ITAdmin | OK — Registrar blocked |
| POST /api/courses | Instructor/DeptAdmin/ITAdmin | CourseManagerPolicy | OK — Registrar blocked |
| POST /api/programs | DeptAdmin/ITAdmin | DeptAdminPolicy | OK — Registrar blocked |
| GET /api/invoices | Finance/ITAdmin | FinancePolicy | OK — Registrar blocked from invoice management |
| GET /api/invoices/student/{studentId} | Finance/ITAdmin + Student self | `[Authorize]` + Student-only ownership check | **CONCERN** — Registrar can view any student's invoices |

**Concern (Medium):** `GET /api/invoices/student/{studentId}` and `GET /api/invoices/{id}` use bare `[Authorize]` with ownership check only for Student role. Registrar (and any other non-Finance role) can read any student's invoice data. This crosses a Finance domain boundary.  
Evidence: `InvoicesController.cs:246–256, 269–284`

**Concern (Medium):** `GET /api/transcripts/student/{studentId}` and `GET /api/transcripts/{id}` — ownership check only for Student role. All other authenticated roles including Registrar can read transcript GPA data. Registrar having transcript access is arguably appropriate, but DeptAdmin/Finance/Auditor also pass, which is a broader concern (noted per their reports).  
Evidence: `TranscriptsController.cs:163,189`

**Feature flag note:** RegistrarDashboard.jsx:130 posts to `/auth/register` (AllowAnonymous endpoint) to create student users — this is intentional design. However, the Registrar is posting to a **public endpoint** without any backend enforcement that the created role is Student. The backend register endpoint always assigns a default role (Student is the default). If that default ever changes or the API accepts a `role` parameter, this could escalate.  
Evidence: `RegistrarDashboard.jsx:130, AuthController.cs:59`

## Lens D: UX journey

- Dashboard is data-heavy: 5 stat cards all populated by parallel API calls. Risk of partial load if any call fails. Handled gracefully via `Promise.allSettled` (RegistrarDashboard.jsx:60).
- "Create Student User" quick action lives in hero AND quick-actions grid — two entry points, clear two-step flow documented in UI.
- Registrar navigates to `/courses/new` — CourseFormPage renders but backend rejects POST with 403. Frontend shows no guard. Same issue as Student.
- Registrar has Sections create access but the sidebar "Sections" link goes to `/sections` which loads sections by course-term. If no courses exist, the page shows empty. No "create section" CTA surfaced on empty state.

## Findings Summary

| Severity | Finding | Evidence |
|----------|---------|----------|
| Medium | Registrar can read any student's invoices via bare `[Authorize]` endpoints (Finance domain boundary crossed) | `InvoicesController.cs:246,269` |
| Medium | Registrar can read transcripts of all students (intentional per role but overly broad `[Authorize]` policy) | `TranscriptsController.cs:163,189` |
| Low | `/auth/register` is always-anonymous; Registrar dashboard calls it — if backend ever accepts role param, privilege escalation possible | `RegistrarDashboard.jsx:130` |
| Low | No frontend guard on `/courses/new` — Registrar sees form, backend 403s on submit | `App.jsx:128` |
