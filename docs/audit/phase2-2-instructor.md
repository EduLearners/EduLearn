# Phase 2 Audit — Instructor

## Lens A: Visibility

Sidebar items (Sidebar.jsx:28–38): Dashboard, Courses, Assessments, Submissions, Grade Changes, Contents, Syllabus, Discussions, Students, Timetable, Notifications, Tickets.

Notable **absence** from sidebar: Applicants, Sections (read/write), Rooms, Enrollment (manage), Transcripts, Finance pages, Reports, KPIs, Audit Log, Users. Instructor has no sidebar path to these.

## Lens B: Per-page rights

| Page | Allowed Actions | Access Control Mechanism |
|------|-----------------|--------------------------|
| /dashboard | Read own sections, assessments, pending-grading count | Frontend: calls `/sections/instructor/{userId}` (bare `[Authorize]` — works) + assessment/submission fetches |
| /courses | Read all; Create; Update | Backend: GET = AllUsersPolicy; POST/PUT = CourseManagerPolicy (Instructor OK) |
| /assessments | Read all; Create; Publish; Edit | Backend: GET = `[Authorize]`; POST/PUT = Roles=Instructor,ITAdmin |
| /submissions | View all for my assessment; Grade | Backend: GET by assessment = Roles=Instructor,ITAdmin; POST grade = Roles=Instructor,ITAdmin |
| /grade-changes | Create grade change; View audit trail | Backend: POST = Roles=Instructor,ITAdmin; GET = Roles=Instructor,Auditor,ITAdmin |
| /contents | Read; Upload; Version | Backend: GET = `[Authorize]`; POST/PUT = Roles=Instructor,ITAdmin |
| /syllabi | Read; Create; Update | Backend: GET = `[Authorize]`; POST/PUT = Roles=Instructor,ITAdmin |
| /discussions | Read; Post; Reply; Moderate (status update) | Backend: all GET/POST = `[Authorize]`; PUT status = Roles=Instructor,ITAdmin |
| /students | Read list and detail | Backend: GET list = Roles=Registrar,Instructor,ITAdmin; GET by ID = `[Authorize]` + ownership (Instructor has no ownership restriction) |
| /timetable | Read own teaching schedule | Backend: GET = EnrollmentViewPolicy (includes Instructor) |
| /notifications | View/mark own | Backend: `[Authorize]` + userId from JWT |
| /tickets | Create and view own | Backend: `[Authorize]`; own-only filter |
| /profile | View/edit own profile | Backend: ownership check UsersController.cs:157 |

## Lens C: RBAC check

| Route | Expected | Actual Policy | Verdict |
|-------|----------|---------------|---------|
| GET /api/courses | All roles | AllUsersPolicy (Instructor OK) | OK |
| POST /api/courses | Instructor/DeptAdmin/ITAdmin | CourseManagerPolicy | OK |
| GET /api/students | Registrar/Instructor/ITAdmin | Roles=Registrar,Instructor,ITAdmin | OK |
| GET /api/students/{id} | Privileged roles | `[Authorize]` + ownership in-code | OK — Instructor can view any student |
| POST /api/assessments | Instructor/ITAdmin | Roles=Instructor,ITAdmin | OK |
| POST /api/grade-changes | Instructor/ITAdmin | Roles=Instructor,ITAdmin | OK |
| GET /api/grade-changes/submission/{id} | Instructor/Auditor/ITAdmin | Roles=Instructor,Auditor,ITAdmin | OK |
| GET /api/fees | Finance/ITAdmin | FinancePolicy | OK — Instructor blocked |
| GET /api/kpis | Auditor/ITAdmin | Roles=Auditor,ITAdmin | OK — Instructor blocked |
| GET /api/audit-log | Auditor/ITAdmin | Roles=Auditor,ITAdmin | OK — Instructor blocked |
| GET /api/users | Registrar/DeptAdmin/ITAdmin | UserViewPolicy | OK — Instructor blocked |
| POST /api/programs | DeptAdmin/ITAdmin | DeptAdminPolicy | OK — Instructor blocked |
| GET /api/applicants | Registrar/ITAdmin | Roles=Registrar,ITAdmin | OK — Instructor blocked |
| GET /api/plagiarism/{id} | Instructor/Registrar/ITAdmin | Roles=Instructor,Registrar,ITAdmin | OK |
| POST /api/plagiarism/report | Instructor/ITAdmin | Roles=Instructor,ITAdmin | OK |
| GET /api/sections | Registrar/DeptAdmin/ITAdmin | Roles=Registrar,DeptAdmin,ITAdmin | OK — Instructor blocked from list |
| GET /api/sections/{id} | All auth | `[Authorize]` | OK — Instructor can look up individual section by ID |
| GET /api/enrollment/section/{sectionId} | Instructor/Registrar/DeptAdmin/ITAdmin | RosterViewPolicy | OK |

**Concern (Medium):** Instructor can call `GET /api/invoices/{id}` (bare `[Authorize]`) and `GET /api/invoices/student/{studentId}` if they know the student ID. The ownership check in InvoicesController.cs:251–256 only blocks `Student` role callers — other roles pass through. An instructor can view any student's invoice data.  
Evidence: `InvoicesController.cs:246–256`

**Concern (Medium):** Instructor can call `GET /api/transcripts/student/{studentId}` and `GET /api/transcripts/{id}` (bare `[Authorize]`) — ownership check only applies to `Student` role. Transcript data (GPA, grades) is accessible to any authenticated non-Student. No explicit policy restricting this to Registrar/ITAdmin.  
Evidence: `TranscriptsController.cs:163,172–176`

**Concern (Low):** `GET /api/submissions/student/{studentId}` is bare `[Authorize]` with ownership check only for Student. Instructor can view any student's submission history across all assessments, not just their own course's. No course-ownership scoping at the API layer.  
Evidence: `SubmissionsController.cs:223`

## Lens D: UX journey

- Dashboard loads sections via `/sections/instructor/{userId}` using `userId` from sessionStorage. If `userId` is undefined (edge case from partial JWT parse), sections will be empty with "No sections assigned" message and "Contact the Registrar" note — acceptable.
- InstructorDashboard "Grade" button navigates to `/submissions?sectionId=X` — SubmissionsPage filters by sectionId client-side. If Instructor navigates without query param, they see all submissions they have backend access to (all assessments for their courses), which is expected behavior.
- Grade Changes page shows Auditor's link in sidebar but not Instructor's — confirmed Instructor does have the sidebar entry.
- No empty state for "no students in my section" on the Students page — defaults to generic empty table. Minor UX gap.

## Findings Summary

| Severity | Finding | Evidence |
|----------|---------|----------|
| Medium | `GET /api/invoices/student/{studentId}` and `GET /api/invoices/{id}` accessible to Instructor — ownership check only blocks Student role | `InvoicesController.cs:246,269` |
| Medium | `GET /api/transcripts/*` accessible to Instructor — ownership check only blocks Student; transcript GPA/grades exposed | `TranscriptsController.cs:163,189` |
| Low | `GET /api/submissions/student/{studentId}` accessible to Instructor without course-scope guard | `SubmissionsController.cs:223` |
