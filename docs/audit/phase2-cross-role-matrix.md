# Cross-Role Access Matrix

Policy legend (from Program.cs:200–230):
- **AllUsersPolicy** = all 7 roles
- **CourseManagerPolicy** = Instructor, DeptAdmin, ITAdmin
- **EnrollmentPolicy** = Student, Registrar, ITAdmin
- **RosterViewPolicy** = Instructor, Registrar, DeptAdmin, ITAdmin
- **EnrollmentViewPolicy** = Student, Instructor, Registrar, ITAdmin
- **AdminPolicy** = ITAdmin only
- **UserViewPolicy** = ITAdmin, Registrar, DeptAdmin
- **AuditViewPolicy** = Auditor, ITAdmin (defined but not used directly in controllers — controllers use `Roles=Auditor,ITAdmin`)
- **SupportStaffPolicy** = ITAdmin only
- **FinancePolicy** = Finance, ITAdmin
- **DeptAdminPolicy** = DeptAdmin, ITAdmin
- **`[Authorize]`** = any authenticated user (FallbackPolicy: RequireAuthenticatedUser)

Symbols: ✅ Allowed | ❌ Blocked | ⚠️ Allowed (concern noted)

## Backend Routes — Top 30

| Route | Student | Instructor | Registrar | DeptAdmin | Finance | ITAdmin | Auditor |
|-------|---------|------------|-----------|-----------|---------|---------|---------|
| **GET /api/courses** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **POST /api/courses** | ❌ | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ |
| **PUT /api/courses/{id}** | ❌ | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ |
| **GET /api/students** | ❌ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| **GET /api/students/me** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **GET /api/students/{id}** | ⚠️ own | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **PUT /api/students/{id}** | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ |
| **POST /api/enrollment/enroll** | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ |
| **DELETE /api/enrollment/{id}/drop** | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ |
| **GET /api/enrollment/student/{studentId}** | ⚠️ own | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| **GET /api/enrollment/section/{sectionId}** | ❌ | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| **GET /api/sections (list)** | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ | ❌ |
| **GET /api/sections/{id}** | ⚠️ | ✅ | ✅ | ✅ | ⚠️ | ✅ | ⚠️ |
| **POST /api/sections** | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ | ❌ |
| **GET /api/assessments/course/{courseId}** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **POST /api/assessments** | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| **POST /api/submissions** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **GET /api/submissions/assessment/{id}** | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| **GET /api/submissions/student/{studentId}** | ⚠️ own | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **GET /api/invoices** | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ |
| **GET /api/invoices/student/{studentId}** | ⚠️ own | ⚠️ | ⚠️ | ⚠️ | ✅ | ✅ | ⚠️ |
| **GET /api/invoices/{id}** | ⚠️ own | ⚠️ | ⚠️ | ⚠️ | ✅ | ✅ | ⚠️ |
| **POST /api/payments** | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ |
| **GET /api/payments/invoice/{invoiceId}** | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ✅ | ✅ | ⚠️ |
| **GET /api/fees** | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ |
| **GET /api/users** | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ | ❌ |
| **POST /api/users** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| **GET /api/kpis** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| **GET /api/audit-log** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| **GET /api/grade-changes/submission/{id}** | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ |
| **GET /api/transcripts/student/{studentId}** | ⚠️ own | ⚠️ | ✅ | ⚠️ | ⚠️ | ✅ | ⚠️ |
| **GET /api/applicants** | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ |
| **GET /api/programs** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **POST /api/programs** | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ |
| **GET /api/tickets** | ⚠️ own | ⚠️ own | ⚠️ own | ⚠️ own | ⚠️ own | ✅ all | ⚠️ own |
| **PUT /api/tickets/{id}/assign** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| **GET /api/health** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |

## Key: ⚠️ Concern explanations

| Route | Concern |
|-------|---------|
| `GET /api/sections/{id}` | Bare `[Authorize]` — Student, Finance, Auditor can call if they know the ID |
| `GET /api/invoices/student/{studentId}` | Bare `[Authorize]` with Student-only ownership check — Instructor, Registrar, DeptAdmin, Auditor pass through (Finance domain leakage) |
| `GET /api/invoices/{id}` | Same as above |
| `GET /api/payments/invoice/{invoiceId}` | Bare `[Authorize]` — all authenticated roles can read payment amounts |
| `GET /api/submissions/student/{studentId}` | Bare `[Authorize]` with Student-only ownership — Finance/DeptAdmin/Auditor can read all submissions for any student |
| `GET /api/transcripts/student/{studentId}` | Bare `[Authorize]` with Student-only ownership — Finance/DeptAdmin/Instructor/Auditor can read GPA data |

## Summary of Cross-Role RBAC Gaps

| Finding | Severity | Affected Roles | Evidence |
|---------|----------|----------------|---------|
| Invoice read endpoints (per-student, per-ID) accessible to all authenticated roles except blocked-via-FinancePolicy list | **High** | Instructor, Registrar, DeptAdmin, Auditor | `InvoicesController.cs:246,269` |
| Payment read endpoint bare `[Authorize]` — all roles can read payment amounts | **High** | All roles | `PaymentsController.cs:106` |
| Transcript read accessible to all authenticated non-Student roles | **Medium** | Instructor, DeptAdmin, Finance, Auditor | `TranscriptsController.cs:163,189` |
| Section `{id}` and `course/term` reads accessible to Student, Finance, Auditor | **Medium** | Student, Finance, Auditor | `SectionsController.cs:122,147` |
| Submission history by studentId readable by all non-Student roles without course scope | **Medium** | DeptAdmin, Finance, Auditor | `SubmissionsController.cs:223` |
| Student detail by ID bare `[Authorize]` — Finance, Auditor, DeptAdmin can lookup student profile | **Low** | Finance, Auditor, DeptAdmin | `StudentsController.cs:156` |
| DeptAdmin sidebar shows Timetable link but EnrollmentViewPolicy excludes DeptAdmin | **Medium** | DeptAdmin (UX 403) | `Sidebar.jsx:65; Program.cs:212` |
| No `GET /api/grade-changes` list endpoint — Auditor cannot enumerate grade changes | **Medium** | Auditor (functional gap) | `routes.json` |
