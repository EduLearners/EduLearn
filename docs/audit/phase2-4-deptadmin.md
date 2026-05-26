# Phase 2 Audit — DeptAdmin

## Lens A: Visibility

Sidebar items (Sidebar.jsx:59–67): Dashboard, Programs, Courses, Sections, Rooms, Syllabus, Discussions, Timetable, Notifications, Tickets.

Notable absences: Applicants, Students (no direct link), Enrollment, Transcripts, Assessments, Submissions, Grade Changes, Contents, Finance pages, Reports, KPIs, Audit Log, Users.

## Lens B: Per-page rights

| Page | Allowed Actions | Access Control Mechanism |
|------|-----------------|--------------------------|
| /dashboard | Stats: active programs, courses, sections, rooms (with available count), instructors | DeptAdminDashboard.jsx calls userService.getByRole('Instructor') — backend `GET /api/users` via UserViewPolicy (DeptAdmin included) |
| /programs | Read all; Create; Edit | Backend: GET = `[Authorize]`; POST/PUT = DeptAdminPolicy (DeptAdmin OK) |
| /courses | Read all; Create; Edit | Backend: GET = AllUsersPolicy; POST/PUT = CourseManagerPolicy (DeptAdmin OK) |
| /sections | Read list; Create; Edit | Backend: Roles=Registrar,DeptAdmin,ITAdmin — DeptAdmin OK |
| /rooms | Read all; Create | Backend: GET = `[Authorize]`; POST = DeptAdminPolicy (DeptAdmin OK); frontend canCreate check (RoomsPage.jsx:34) |
| /syllabi | Read only | Backend: GET = `[Authorize]`; POST/PUT = Roles=Instructor,ITAdmin (blocks DeptAdmin) |
| /discussions | Post, reply | Backend: `[Authorize]` |
| /timetable | View section timetable | Backend: EnrollmentViewPolicy (does NOT include DeptAdmin) |
| /notifications | Own notifications | Backend: `[Authorize]` + userId |
| /tickets | Create and view own | Backend: `[Authorize]` + own-only filter |
| /profile | View/edit own + MFA self-manage | Backend: ownership check; MFA includes DeptAdmin |

## Lens C: RBAC check

| Route | Expected | Actual Policy | Verdict |
|-------|----------|---------------|---------|
| POST /api/programs | DeptAdmin/ITAdmin | DeptAdminPolicy | OK |
| PUT /api/programs/{id} | DeptAdmin/ITAdmin | DeptAdminPolicy | OK |
| POST /api/courses | Instructor/DeptAdmin/ITAdmin | CourseManagerPolicy | OK |
| GET /api/sections (list) | Registrar/DeptAdmin/ITAdmin | Roles=Registrar,DeptAdmin,ITAdmin | OK |
| POST /api/rooms | DeptAdmin/ITAdmin | DeptAdminPolicy | OK |
| GET /api/users | Registrar/DeptAdmin/ITAdmin | UserViewPolicy (DeptAdmin included) | OK — DeptAdmin can list all users |
| GET /api/users/{id} | Self or privileged | `[Authorize]` + in-code check; code marks privileged as ITAdmin|Registrar only | **CONCERN** — DeptAdmin is NOT marked privileged in UsersController.cs:132; can only view own profile even though GET /api/users list is allowed |
| GET /api/timetable/student/{studentId}/{term} | Student/Instructor/Registrar/ITAdmin | EnrollmentViewPolicy | **CONCERN** — DeptAdmin NOT in EnrollmentViewPolicy |
| GET /api/enrollment/section/{sectionId} | Instructor/Registrar/DeptAdmin/ITAdmin | RosterViewPolicy | OK — DeptAdmin included |
| POST /api/applicants | Registrar/ITAdmin | Roles=Registrar,ITAdmin | OK — DeptAdmin blocked |
| GET /api/fees | Finance/ITAdmin | FinancePolicy | OK — DeptAdmin blocked |
| GET /api/kpis | Auditor/ITAdmin | Roles=Auditor,ITAdmin | OK — DeptAdmin blocked |
| GET /api/audit-log | Auditor/ITAdmin | Roles=Auditor,ITAdmin | OK — DeptAdmin blocked |
| GET /api/invoices/student/{studentId} | Finance/ITAdmin + Student self | `[Authorize]` | **CONCERN** — DeptAdmin can read student invoices |
| GET /api/transcripts/student/{studentId} | Registrar/ITAdmin ideally | `[Authorize]` | **CONCERN** — DeptAdmin can read student transcripts |

**Critical Concern:** DeptAdminDashboard.jsx:52 calls `userService.getByRole('Instructor')`. The `GET /api/users` endpoint requires `UserViewPolicy` (Registrar, DeptAdmin, ITAdmin) — DeptAdmin is included. This call returns all instructors. However, `userService.getByRole` likely calls `GET /api/users?role=Instructor`. All user data (including emails, phone numbers of all instructors) is exposed to DeptAdmin. This is likely intentional but should be noted.  
Evidence: `DeptAdminDashboard.jsx:52; UsersController.cs:112`

**Concern (Medium):** Sidebar shows "Timetable" link (Sidebar.jsx:65) but `GET /api/timetable/student/{studentId}/{term}` requires `EnrollmentViewPolicy` which excludes DeptAdmin. When DeptAdmin tries to view timetable by student, they get a 403. The timetable page may only ever be accessed in a context where the studentId is known.  
Evidence: `TimetableController.cs:43; Program.cs:212`

**Concern (Medium):** `GET /api/invoices/student/{studentId}` and `GET /api/invoices/{id}` accessible to DeptAdmin (bare `[Authorize]`, Student-only ownership check). Finance domain boundary crossed.  
Evidence: `InvoicesController.cs:246,269`

**Concern (Low):** `GET /api/users/{id}` code-level check marks only ITAdmin and Registrar as privileged (UsersController.cs:132). DeptAdmin can only fetch their own user profile by ID, despite being able to list all users. Minor inconsistency.  
Evidence: `UsersController.cs:132`

## Lens D: UX journey

- Dashboard "Instructors" stat card navigates to `/sections`, not `/users?role=Instructor`. The stat count shows instructor count but clicking goes to Sections — potentially confusing.
- DeptAdminDashboard.jsx:52 fetches instructors via `userService.getByRole('Instructor')`. If the userService implementation calls `GET /api/users` without a role filter, all 7-role users are fetched and filtered client-side — potential over-fetch.
- Timetable sidebar link will result in 403 if DeptAdmin clicks it and the page tries to load a student's timetable. Page likely shows empty/error state.
- No "Enrollment" link in sidebar — DeptAdmin can manage sections but cannot view which students are enrolled without directly hitting `/api/enrollment/section/{id}` from the section detail page. Roster access exists in backend (RosterViewPolicy includes DeptAdmin) but there's no dedicated sidebar entry.
- Programs and Courses have create buttons properly guarded in their pages (using canCreate/role checks).

## Findings Summary

| Severity | Finding | Evidence |
|----------|---------|----------|
| Medium | Timetable sidebar link shown but `EnrollmentViewPolicy` excludes DeptAdmin — 403 when trying to view student timetable | `Sidebar.jsx:65; TimetableController.cs:43; Program.cs:212` |
| Medium | DeptAdmin can read student invoices via bare `[Authorize]` (Finance domain boundary) | `InvoicesController.cs:246,269` |
| Medium | DeptAdmin can read student transcripts via bare `[Authorize]` | `TranscriptsController.cs:163,189` |
| Low | `GET /api/users/{id}` privileges check excludes DeptAdmin despite DeptAdmin having list access | `UsersController.cs:132` |
