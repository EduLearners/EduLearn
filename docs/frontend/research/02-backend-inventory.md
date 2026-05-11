# EduLearn Backend Inventory — Frontend UI Reference

Generated 2026-05-07 from codebase exploration.

## 7 User Roles

| Role | Description | MFA Required |
|---|---|---|
| Student | Enroll, submit, view grades, pay invoices, create tickets | No |
| Instructor | Create/grade assessments, manage content, sections, plagiarism | No |
| Registrar | Applicants, transcripts, enrollment management | Yes |
| DeptAdmin | Programs, courses, sections, rooms | Yes |
| Finance | Invoices, payments, fees, scholarships | Yes |
| ITAdmin | Full system access | Yes |
| Auditor | Read-only: reports, KPIs, audit logs | Yes |

## 9 Modules and Their Routes

### IAM — Identity & Access
- POST /api/auth/login, /register
- POST /api/auth/mfa/setup, /mfa/verify
- GET/PUT /api/users, /api/users/{id}, /api/users/{id}/status
- POST /api/users/{id}/mfa/reset

### SRA — Student Records & Admissions
- POST/GET /api/applicants, PUT /api/applicants/{id}
- GET /api/students, GET/PUT /api/students/{id}
- POST /api/transcripts, GET /api/transcripts/student/{id}

### CCM — Course Catalog & Curriculum
- CRUD /api/courses, /api/programs
- POST/GET /api/syllabi, /api/syllabi/course/{id}
- CRUD /api/sections, /api/rooms

### ETS — Enrollment & Timetable
- POST /api/enrollments, DELETE /api/enrollments/{id}/drop
- GET /api/enrollments/student/{id}, /api/enrollments/section/{id}
- GET /api/timetable/student/{id}/{term}

### LMS — Learning Content
- CRUD /api/content/upload, /api/content/course/{id}
- POST/GET /api/discussions, PUT /api/discussions/{id}

### AGI — Assessment, Grading & Integrity
- CRUD /api/assessments (Draft→Published→Closed lifecycle)
- POST /api/submissions, POST /api/submissions/{id}/grade
- GET /api/grade-changes/submission/{id} (append-only, read-only)
- POST /api/plagiarism/report, PUT /api/plagiarism/{id}/status

### SFB — Student Finance & Billing
- POST /api/invoices/generate, GET /api/invoices/student/{id}
- POST /api/payments, GET /api/payments/invoice/{id}
- CRUD /api/fees, /api/scholarships

### RKA — Reporting, KPIs & Audit
- POST /api/reports/generate, GET /api/reports
- GET /api/kpis, POST /api/kpis/recalculate
- POST /api/audit-packages/generate, GET /api/audit-packages/{id}/download

### NHT — Notifications & Helpdesk
- GET /api/notifications (paginated, unreadOnly filter)
- PUT /api/notifications/{id}/read, /api/notifications/read-all
- GET /api/notifications/unread-count
- CRUD /api/tickets, PUT /api/tickets/{id}/assign, /resolve

## Key State Machines (drive UI affordances)

| Entity | States | Transitions |
|---|---|---|
| Assessment | Draft → Published → Closed → Archived | Instructors publish; only Published accepts submissions |
| Submission | Submitted / Late → Graded → Returned / Plagiarised | One grade action; re-grades create GradeChange rows |
| Invoice | Pending → PartiallyPaid → Paid / Overdue / Cancelled | Finance records payments |
| Enrollment | Enrolled / Waitlisted → Dropped | WaitlistPosition managed; GradePostedFlag blocks grade view |
| Applicant | Submitted → UnderReview → Accepted / Rejected / Waitlisted | Status-driven buttons in Registrar UI |
| Transcript | Draft → Issued → Revoked | Issued = PDF download only, no edits |
| User | Active → Inactive / Suspended / Locked | ITAdmin manages; Locked = 401 on login |
| Ticket | Open → InProgress → Resolved → Closed | ITAdmin assigns/resolves |
| PlagiarismReport | Pending → Confirmed / Dismissed | ITAdmin only |

## Append-Only Tables (read-only views only, no edit/delete UI)

1. **AuditLog** — UserID, Action, ResourceType, ResourceID, DetailsJSON, Timestamp
2. **GradeChange** — SubmissionID, OldScore, NewScore, ChangedByFK, ChangedAt, Reason

## JSON Columns Needing Custom UI Editors

| Column | Entity | UI Component Needed |
|---|---|---|
| PrerequisitesJSON | Course | Multi-select course picker |
| ScheduleJSON | Section | Weekly calendar grid, time-slot picker |
| GradingRubricJSON | Assessment | Row builder: criterion / maxPoints / description |
| FeeItemsJSON | FeeSchedule | Itemized rows with auto-total |
| LineItemsJSON | Invoice | Read-only table after generation |
| PostsJSON | Discussion | Nested thread / reply hierarchy |
| ContactInfoJSON | Student, Applicant | Multi-field form (phone, address, emergency) |
| ResourcesJSON | Room | Checkbox list |
| MetadataJSON | Content | Metadata badge display |
| RequiredCoursesJSON | Program | Chip list |
| ElectivesJSON | Program | Chip list |
| EntriesJSON | Transcript | Read-only grade table |
| DocumentsURIJSON | Applicant | File list with download links |

## Per-Role Feature Access Matrix

| Feature | Student | Instructor | Registrar | DeptAdmin | Finance | ITAdmin | Auditor |
|---|---|---|---|---|---|---|---|
| Login / MFA | R | R | R+MFA | R+MFA | R+MFA | R+MFA | R+MFA |
| View own profile | R | R | R | R | R | R | R |
| Create user | -- | -- | -- | -- | -- | W | -- |
| List all users | -- | -- | R | -- | -- | R | -- |
| Apply to program | W | -- | -- | -- | -- | -- | -- |
| Manage applicants | -- | -- | W | -- | -- | W | -- |
| Enroll in course | W | -- | W | -- | -- | W | -- |
| View course roster | -- | R | R | R | -- | R | -- |
| Create/edit course | -- | -- | -- | W | -- | W | -- |
| Create assessment | -- | W | -- | -- | -- | W | -- |
| Submit assessment | W | -- | -- | -- | -- | -- | -- |
| Grade submission | -- | W | -- | -- | -- | W | -- |
| View own grades | R | R (own) | -- | -- | -- | R | -- |
| Flag plagiarism | -- | W | -- | -- | -- | W | -- |
| Upload content | -- | W | -- | -- | -- | W | -- |
| View transcript | R (own) | -- | R | -- | -- | R | -- |
| Issue transcript | -- | -- | W | -- | -- | W | -- |
| Generate invoice | -- | -- | -- | -- | W | W | -- |
| View invoice | R (own) | -- | -- | -- | R | R | -- |
| Record payment | -- | -- | -- | -- | W | W | -- |
| Manage scholarships | -- | -- | -- | -- | W | W | -- |
| Create ticket | W | W | W | W | W | W | W |
| Assign/resolve ticket | -- | -- | -- | -- | -- | W | -- |
| View audit logs | -- | -- | -- | -- | -- | R | R |
| Generate reports | -- | -- | -- | -- | -- | W | R |
| View KPIs | -- | -- | -- | -- | -- | W | R |
