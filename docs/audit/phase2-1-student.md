# Phase 2 Audit — Student

## Lens A: Visibility

Sidebar items (Sidebar.jsx:11–23): Dashboard, Enrollment, Timetable, Courses, Assessments, Submissions, Contents, Syllabus, Discussions, Transcripts, Invoices, Programs, Notifications, Tickets.

All authenticated frontend routes (`/applicants`, `/users`, `/sections`, `/rooms`, `/fees`, `/payments`, `/scholarships`, `/reports`, `/kpis`, `/audit-log`, `/grade-changes`, `/students`, `/users`) are accessible by URL since App.jsx applies no role guard beyond `requiresAuth: true` — the backend is the enforcement layer.

## Lens B: Per-page rights

| Page | Allowed Actions | Access Control Mechanism |
|------|-----------------|--------------------------|
| /dashboard | Read own stats (enrolled, CGPA, notifications) | Frontend: calls `/students/me` (Roles=Student); backend checks student.UserID == caller |
| /enrollment | Enroll self, view own enrollments | Backend: EnrollmentPolicy (Student OK), ownership check C-22 (EnrollmentsController.cs:64) |
| /timetable | View own schedule | Backend: EnrollmentViewPolicy (Student OK); frontend: isStudent branch |
| /courses | Read-only list and detail | Backend: AllUsersPolicy (Student OK) |
| /assessments | View published assessments for enrolled courses | Backend: `[Authorize]` (FallbackPolicy, any auth); frontend: no create/edit buttons for Student |
| /submissions | Submit own work, view own submissions | Backend POST: Roles=Student; GET by studentId: ownership check SubmissionsController.cs:231 |
| /contents | Read course content | Backend: `[Authorize]` (any auth) |
| /syllabi | Read syllabi | Backend: `[Authorize]` |
| /discussions | Post, reply to threads | Backend: `[Authorize]` (any auth); Student cannot moderate (PUT /discussions/{id}/status requires Instructor/ITAdmin) |
| /transcripts | View own transcripts | Backend: `[Authorize]` + ownership check TranscriptsController.cs:175 |
| /invoices | View own invoices | Backend: `[Authorize]` + ownership check InvoicesController.cs:255 |
| /programs | Read-only list and detail | Backend: `[Authorize]` |
| /notifications | View/mark own notifications | Backend: `[Authorize]` + userId from JWT (NotificationsController.cs:40) |
| /tickets | Create and view own tickets | Backend: `[Authorize]`; ticket GET returns own only (TicketsController.cs:91–92) |
| /profile | View/edit own profile | Backend: `[Authorize]` + ownership check UsersController.cs:157 |

## Lens C: RBAC check

| Route | Expected | Actual Policy | Verdict |
|-------|----------|---------------|---------|
| GET /api/courses | All roles | AllUsersPolicy (Student included) | OK |
| POST /api/enrollment/enroll | Student, Registrar, ITAdmin | EnrollmentPolicy — OK | OK |
| GET /api/assessments/course/{courseId} | All auth | `[Authorize]` (FallbackPolicy) | OK — but Finance/Auditor/DeptAdmin/Registrar also pass; risk is low for read |
| GET /api/invoices/student/{studentId} | Own only | `[Authorize]` + ownership in-code (C-3) | OK |
| GET /api/submissions/student/{studentId} | Own only | `[Authorize]` + ownership in-code (SubmissionsController.cs:231) | OK |
| GET /api/transcripts/student/{studentId} | Own only | `[Authorize]` + ownership in-code (TranscriptsController.cs:175) | OK |
| GET /api/plagiarism/student/{studentId}/integrity | Self check | `[Authorize]` + ownership in-code (PlagiarismController.cs:113) | OK |
| GET /api/users | Registrar/DeptAdmin/ITAdmin | UserViewPolicy | OK — Student blocked |
| POST /api/submissions | Students only | Roles=Student | OK |
| POST /api/grade-changes | Instructor/ITAdmin | Roles=Instructor,ITAdmin | OK — Student blocked |
| GET /api/kpis | Auditor/ITAdmin | Roles=Auditor,ITAdmin | OK — Student blocked |
| GET /api/audit-log | Auditor/ITAdmin | Roles=Auditor,ITAdmin | OK — Student blocked |
| GET /api/fees | Finance/ITAdmin | FinancePolicy | OK — Student blocked |
| POST /api/tickets | All auth | `[Authorize]` | OK — intentional (support tickets) |
| GET /api/tickets | All auth | `[Authorize]`; Student sees own only | OK |
| GET /api/sections | Registrar/DeptAdmin/ITAdmin | Roles=Registrar,DeptAdmin,ITAdmin | OK — Student blocked |

**Concern (Medium):** `GET /api/sections/{id}` and `GET /api/sections/course/{courseId}/term/{term}` use bare `[Authorize]` (FallbackPolicy). Students can call these to enumerate section IDs, capacity, instructor names, room IDs. Not blocked in backend.  
Evidence: `SectionsController.cs:122, 147`

**Concern (Low):** `GET /api/students/{id}` is bare `[Authorize]` with in-code ownership check. Finance/Auditor/DeptAdmin have no sidebar link to students but can hit the backend endpoint directly if they know a student ID.  
Evidence: `StudentsController.cs:156,170`

## Lens D: UX journey

- Dashboard empty state handled: "You are not enrolled in any sections yet" + Browse & Enroll CTA (StudentDashboard.jsx:176–181).
- Upcoming deadlines empty state handled: "No deadlines in the next 14 days" (StudentDashboard.jsx:248–251).
- CGPA shows "—" when no issued transcripts exist — acceptable but could explain to student what CGPA means (StudentDashboard.jsx:149).
- Student navigates to `/assessments/new` or `/contents/new` by typing URL — page loads form but backend will reject POST (Roles=Instructor,ITAdmin). **No frontend route guard; UX gap.** (App.jsx:134, 145)
- Student can navigate to `/grade-changes` by URL — GradeChangesPage.jsx hides create button (`canCreate` check) but still loads all grade change records... however backend `GET /api/grade-changes/submission/{submissionId}` requires Instructor/Auditor/ITAdmin, so data fetch will 403.

## Findings Summary

| Severity | Finding | Evidence |
|----------|---------|----------|
| Medium | `GET /api/sections/{id}` and `GET /api/sections/course/.../term/...` are accessible to Student — exposes instructor assignments, room IDs, section capacity | `SectionsController.cs:122,147` |
| Low | `GET /api/students/{id}` bare `[Authorize]` — Finance/Auditor/DeptAdmin can hit it directly (not surfaced in UI) | `StudentsController.cs:156` |
| Low | No frontend route guard on `/assessments/new`, `/contents/new` — student can reach form page, backend correctly rejects POST | `App.jsx:134,145` |
