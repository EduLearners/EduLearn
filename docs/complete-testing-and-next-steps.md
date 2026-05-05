# EduLearn v1.0 — Complete Testing Guide & Next Steps

> **PRD Reference:** `docs/EduLearn-PRD-v1.0_2.docx` — this is the ONLY authoritative PRD. All other versions are deprecated.

---

## Current Status (May 5, 2026)

### Build Status: ✅ 0 errors, 0 warnings

### Infrastructure
- ASP.NET Core 8.0 + EF Core 8.0
- SQL Server LocalDB — `EduLearnDb` with 25 tables
- JWT Bearer authentication (60 min expiry) + BCrypt password hashing (cost=12)
- 8 role-based authorization policies
- Swagger with 🔒 Authorize button + XML doc summaries on all 94 endpoints
- 21 repository interfaces + 21 implementations
- 4 services: TokenService, AuthService, AuditLogService, PdfGeneratorService (QuestPDF 2024.x)
- All controllers secured with `[Authorize]` (except Auth + Health)
- Global exception middleware returns clean JSON on unhandled errors
- Security hardening C-1 through C-26: all closed

### Smoke Test Suite
- **Run:** `bash tests/smoke/run-all.sh`
- **Coverage:** 254+ assertions across all 25 modules + security sweeps
- **Status:** ✅ All passing as of `dac2833`

### Controllers — 94 Endpoints

| Module | Owner | Controllers | Status |
|---|---|---|---|
| IAM | Ashish | AuthController, UsersController, AuditLogController | ✅ Done |
| SRA | Saurav | ApplicantsController, StudentsController, TranscriptsController | ✅ Done |
| ETS | Saurav | EnrollmentsController, SectionsController, RoomsController, TimetableController | ✅ Done |
| CCM | Vikash | CoursesController, ProgramsController, SyllabiController | ✅ Done |
| AGI | Vikash | AssessmentsController, SubmissionsController, GradeChangesController | ✅ Done |
| LMS | Vikash | ContentsController, DiscussionsController | ✅ Done |
| SFB | Tanya | FeesController, InvoicesController, PaymentsController, ScholarshipsController | ✅ Done |
| RKA | Utkarsh | ReportsController, KPIsController, AuditPackagesController | ✅ Done |
| NHT | Swarna | NotificationsController, TicketsController | ✅ Done |
| System | — | HealthController | ✅ Done |

---

## Known Gaps vs PRD

| What | Owner | Gap | Priority |
|---|---|---|---|
| SRA-03 transcript download | Saurav | Returns JSON; PRD requires PDF + QR code | High |
| AGI-04 plagiarism | Vikash | `PUT /api/submissions/{id}/plagiarism-report` and `GET /api/submissions/{id}/integrity-status` not implemented | High |
| IAM-03 MFA | Ashish | `POST /api/auth/mfa/setup` and `POST /api/auth/mfa/verify` not implemented | Medium |

---

## Post-Interim Changes (April 24 → May 5, 2026)

### Bug Fixes
| Fix | Commit | Detail |
|---|---|---|
| RKA-01 camelCase downloads | `12fd156` | `JsonSerializer.Serialize` was returning PascalCase fields; added `PropertyNamingPolicy = CamelCase` |
| R-5 GPA decimal overflow | `12fd156` | `decimal(3,2)` rejected 10.0 (Indian 10-pt CGPA); widened to `decimal(4,2)` via `WidenTranscriptGPA` migration |
| Audit R-2 scholarship deduction | `3d718f7` | Scholarship fixture date bug caused silent zero deduction |
| GeneratedByFK attribution (H-3) | `28ef88f` | `POST /api/reports/generate` now resolves `GeneratedByFK` from JWT, ignores body value |

### New Features
| Feature | Commits | Detail |
|---|---|---|
| RKA PDF downloads | `Tasks 1–6` | `GET /api/reports/{id}/download` and `GET /api/audit-packages/{id}/download` now return `application/pdf` by default via QuestPDF. Add `?format=json` to get the old JSON response. |
| Swagger XML docs | `28ef88f` | All 94 endpoints documented with `<summary>` tags; Swagger UI shows descriptions |
| Security hardening C-1–C-26 | multiple | See `docs/SECURITY-AUDIT-FINDINGS.md` for full list |

---

## Run the API

```bash
dotnet run --project EduLearn.API
```

Open Swagger: `https://localhost:5001/swagger`

---

## Authentication Flow (Must Do First)

All endpoints except `/api/auth/*` and `/api/health` require a JWT token.

On a fresh DB, the API auto-seeds a default ITAdmin account on first startup:

| Field    | Value       |
|----------|-------------|
| Username | `admin`     |
| Password | `Admin@123` |
| Role     | `ITAdmin`   |

The seeder (`EduLearn.API/Data/DbInitializer.cs`) is idempotent — it runs on every `dotnet run` but only creates the account if a user named `admin` does not already exist. Privileged public signup is still locked by design (`POST /api/auth/register` always forces `Role = Student` — C-26 anti-privilege-escalation), so the seeded admin is the Swagger-only entry point for demoing any admin-gated endpoint. Other roles are minted through `POST /api/users` (AdminPolicy — ITAdmin only) once the admin is logged in.

**Step 1 — Login as the seeded admin to get a JWT:**
```
POST /api/auth/login
```
```json
{
  "username": "admin",
  "password": "Admin@123"
}
```
Response contains `"token": "eyJhbGciOiJIUzI1NiIs..."` — copy this.

**Step 2 — Authorize in Swagger:**
Click the 🔒 **Authorize** button at the top → paste the token → click Authorize.

Now all subsequent requests will include the JWT. Token expires in 60 minutes.

---

## DB Verification

Connect to `(localdb)\MSSQLLocalDB` → `EduLearnDb` and run:

```sql
-- Must return 26 (25 entity tables + __EFMigrationsHistory)
SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE';

-- Must return 31
SELECT COUNT(*) FROM sys.foreign_keys;

-- Must return 0 (all FKs use NO_ACTION)
SELECT COUNT(*) FROM sys.foreign_keys WHERE delete_referential_action_desc != 'NO_ACTION';

-- All Status columns must be nvarchar, not int
SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
FROM INFORMATION_SCHEMA.COLUMNS WHERE COLUMN_NAME = 'Status' ORDER BY TABLE_NAME;

-- GPA must be decimal(4,2) to hold 10-point CGPA
SELECT COLUMN_NAME, NUMERIC_PRECISION, NUMERIC_SCALE
FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Transcripts' AND COLUMN_NAME = 'GPA';
```

---

## Complete Swagger Test Sequence

Run in order — each section depends on data from the previous one.

> **Important:** After registering and logging in (Section 0), click 🔒 Authorize in Swagger before testing any other endpoint.

---

### SECTION 0 — Authentication (IAM-01)

On a fresh DB the API auto-seeds an ITAdmin (`admin` / `Admin@123`) at startup. This section logs in as that seeded admin, then creates the rest of the demo users — **Instructor** and **Finance** via `POST /api/users` (AdminPolicy-gated, honors the `role` field), and two **Students** via `POST /api/auth/register` (public signup, which is hard-coded to Student by C-26).

The creation order below produces these stable UserIDs, referenced by every subsequent section:

| UserID | Username   | Role       | Created via               |
|--------|------------|------------|---------------------------|
| 1      | admin      | ITAdmin    | startup seeder            |
| 2      | dr.priya   | Instructor | `POST /api/users`         |
| 3      | rahul.s    | Student    | `POST /api/auth/register` |
| 4      | sneha.s    | Student    | `POST /api/auth/register` |
| 5      | tanya.fin  | Finance    | `POST /api/users`         |

**0.1 Login as seeded ITAdmin (get JWT)**
```
POST /api/auth/login
```
```json
{
  "username": "admin",
  "password": "Admin@123"
}
```
Expected: `200 OK` with `"token": "eyJ..."` — **Copy this token and click 🔒 Authorize in Swagger before continuing.**

**0.2 Create Instructor (UserID 2)**
```
POST /api/users
```
```json
{
  "username": "dr.priya",
  "fullName": "Dr. Priya Sharma",
  "email": "priya@edulearn.com",
  "phone": "+91-9876543220",
  "role": "Instructor",
  "password": "Inst@123"
}
```
Expected: `201 Created` — `userID: 2`, role `"Instructor"`

**0.3 Register Student 1 (UserID 3) — public signup**
```
POST /api/auth/register
```
```json
{
  "username": "rahul.s",
  "fullName": "Rahul Kumar",
  "email": "rahul@edulearn.com",
  "role": "Student",
  "password": "Stud@123"
}
```
Expected: `200 OK` — role is always forced to `"Student"` regardless of body (C-26).

**0.4 Register Student 2 (UserID 4) — public signup**
```
POST /api/auth/register
```
```json
{
  "username": "sneha.s",
  "fullName": "Sneha Gupta",
  "email": "sneha@edulearn.com",
  "role": "Student",
  "password": "Stud@456"
}
```
Expected: `200 OK`

**0.5 Create Finance Officer (UserID 5)**
```
POST /api/users
```
```json
{
  "username": "tanya.fin",
  "fullName": "Tanya Singh",
  "email": "tanya@edulearn.com",
  "phone": "+91-9876543250",
  "role": "Finance",
  "password": "Fin@123"
}
```
Expected: `201 Created` — `userID: 5`, role `"Finance"`

**0.6 Test 401 — Access without token**
Click 🔒 Authorize in Swagger and **Logout**, then try:
```
GET /api/users
```
Expected: `401 Unauthorized` — "Authentication required. Please login at POST /api/auth/login to get a JWT token."

Re-authorize with the admin token before continuing. (If the token has expired, re-run 0.1 to get a fresh one.)

---

### SECTION 1 — Users (IAM-02)

> Note: Users were already created via `/api/auth/register`. These tests verify the CRUD endpoints.

**1.1 List all users**
```
GET /api/users
```
Expected: `200 OK` — returns 5 users. Roles show as strings ("ITAdmin", "Instructor", "Student", "Finance").

**1.2 Get user by ID**
```
GET /api/users/1
```
Expected: `200 OK` — `fullName: "Default IT Administrator"`, role `"ITAdmin"` (the seeded admin).

**1.3 Get non-existent user**
```
GET /api/users/999
```
Expected: `404` — `USER_NOT_FOUND`

**1.4 Update user profile**
```
PUT /api/users/3
```
```json
{
  "fullName": "Rahul Kumar Singh",
  "email": "rahul.updated@edulearn.com",
  "phone": "+91-9999999999"
}
```
Expected: `200 OK` — name and email updated

**1.5 Update user status**
```
PUT /api/users/4/status
```
```json
{ "status": "Suspended" }
```
Expected: `200 OK` — status changed to "Suspended"

*(Revert for later tests:)*
```json
{ "status": "Active" }
```

---

### SECTION 2 — Programs (CCM-01)

**2.1 Create program**
```
POST /api/programs
```
```json
{
  "name": "B.Tech Computer Science",
  "departmentID": 1,
  "degreeType": "Bachelor",
  "requiredCoursesJSON": "[1, 2]",
  "electivesJSON": null,
  "durationTerms": 8
}
```
Expected: `201 Created` — `programID: 1`

**2.2 List programs**
```
GET /api/programs
```
Expected: `200 OK` — 1 program

**2.3 Get program**
```
GET /api/programs/1
```
Expected: `200 OK` — B.Tech CS, status "Active"

**2.4 Update program**
```
PUT /api/programs/1
```
```json
{
  "name": "B.Tech Computer Science",
  "departmentID": 1,
  "degreeType": "Bachelor",
  "requiredCoursesJSON": "[1, 2, 3]",
  "electivesJSON": null,
  "durationTerms": 10
}
```
Expected: `200 OK` — durationTerms updated to 10

---

### SECTION 3 — Courses (CCM-01)

**3.1 Create course 1**
```
POST /api/courses
```
```json
{
  "code": "CS101",
  "title": "Introduction to Computer Science",
  "description": "Fundamentals of computing and programming",
  "credits": 3,
  "departmentID": 1,
  "level": "100-level",
  "prerequisitesJSON": null
}
```
Expected: `201 Created` — `courseID: 1`

**3.2 Create course 2**
```
POST /api/courses
```
```json
{
  "code": "CS201",
  "title": "Data Structures and Algorithms",
  "credits": 4,
  "departmentID": 1,
  "level": "200-level",
  "prerequisitesJSON": "[1]"
}
```
Expected: `201 Created` — `courseID: 2`

**3.3 Duplicate code check**
```
POST /api/courses
```
```json
{ "code": "CS101", "title": "Duplicate", "credits": 3 }
```
Expected: `409 Conflict` — `DUPLICATE_COURSE_CODE`

**3.4 List courses**
```
GET /api/courses
```
Expected: `200 OK` — 2 courses

---

### SECTION 4 — Rooms (ETS-02)

**4.1 Create room**
```
POST /api/rooms
```
```json
{
  "building": "Main Block",
  "roomNumber": "A101",
  "capacity": 60,
  "resourcesJSON": "{\"projector\": true, \"whiteboard\": true}"
}
```
Expected: `201 Created` — `roomID: 1`

---

### SECTION 5 — Students (SRA-02)

**5.1 Create student 1 (linked to User 3 — Rahul)**
```
POST /api/students
```
```json
{
  "userID": 3,
  "name": "Rahul Kumar",
  "dob": "2004-05-15",
  "gender": "Male",
  "contactInfoJSON": "{\"phone\": \"+91-9876543211\"}",
  "programID": 1,
  "entryTerm": "Fall 2026",
  "expectedGraduationTerm": "Spring 2030"
}
```
Expected: `201 Created` — `studentID: 1`, auto-generated MRN like "STU-00001"

**5.2 Create student 2 (linked to User 4 — Sneha)**
```
POST /api/students
```
```json
{
  "userID": 4,
  "name": "Sneha Gupta",
  "dob": "2004-08-22",
  "gender": "Female",
  "contactInfoJSON": null,
  "programID": 1,
  "entryTerm": "Fall 2026",
  "expectedGraduationTerm": null
}
```
Expected: `201 Created` — `studentID: 2`

**5.3 List students**
```
GET /api/students
```
Expected: `200 OK` — 2 students

---

### SECTION 6 — Sections (ETS-02)

**6.1 Create section (capacity 2 — for waitlist testing)**
```
POST /api/sections
```
```json
{
  "courseID": 1,
  "term": "Fall 2026",
  "instructorID": 2,
  "roomID": 1,
  "capacity": 2,
  "scheduleJSON": "[{\"day\": \"Mon\", \"startTime\": \"09:00\", \"endTime\": \"10:30\"}]"
}
```
Expected: `201 Created` — `sectionID: 1`, capacity 2

**6.2 Create section (capacity 60)**
```
POST /api/sections
```
```json
{
  "courseID": 2,
  "term": "Fall 2026",
  "instructorID": 2,
  "roomID": null,
  "capacity": 60,
  "scheduleJSON": null
}
```
Expected: `201 Created` — `sectionID: 2`

---

### SECTION 7 — Enrollments (ETS-01)

**7.1 Enroll Rahul in section 1**
```
POST /api/enrollment/enroll
```
```json
{ "studentID": 1, "sectionID": 1 }
```
Expected: `201` — status "Enrolled"

**7.2 Enroll Sneha in section 1 (fills capacity)**
```json
{ "studentID": 2, "sectionID": 1 }
```
Expected: `201` — status "Enrolled" (section now 2/2)

**7.3 Duplicate enrollment blocked**
```json
{ "studentID": 1, "sectionID": 1 }
```
Expected: `409` — `DUPLICATE_ENROLLMENT`

**7.4 Section roster**
```
GET /api/enrollment/section/1
```
Expected: `200` — 2 enrollments, both "Enrolled"

**7.5 Drop Rahul (auto-promote if waitlisted students exist)**
```
DELETE /api/enrollment/1/drop
```
Expected: `204 No Content`

---

### SECTION 8 — Assessments (AGI-01)

**8.1 Create assessment (Draft)**
```
POST /api/assessments
```
```json
{
  "courseID": 1,
  "sectionID": null,
  "title": "Quiz 1 - Programming Basics",
  "type": "Quiz",
  "dueAt": "2026-12-01T23:59:00Z",
  "maxScore": 50.0,
  "gradingRubricJSON": null,
  "createdByFK": 2
}
```
Expected: `201` — status "Draft"

**8.2 Publish assessment**
```
PUT /api/assessments/1/publish
```
```json
{ "status": "Published" }
```
Expected: `200` — status "Published"

**8.3 Cannot update published assessment**
```
PUT /api/assessments/1
```
Expected: `400` — `ASSESSMENT_NOT_DRAFT`

---

### SECTION 9 — Content (LMS-01)

**9.1 Upload content**
```
POST /api/content/upload
```
```json
{
  "courseID": 1,
  "title": "Week 1 - Intro to Programming",
  "type": "Document",
  "uri": "https://blob.storage/edulearn/week1-notes.pdf",
  "uploadedByFK": 2,
  "metadataJSON": "{\"fileSize\": 2048576, \"mimeType\": \"application/pdf\"}"
}
```
Expected: `201` — version 1, status "Active"

**9.2 Version bump**
```
PUT /api/content/1/version
```
```json
{
  "uri": "https://blob.storage/edulearn/week1-notes-v2.pdf",
  "metadataJSON": null
}
```
Expected: `200` — version bumped to 2

---

### SECTION 10 — Submissions & Grading (AGI-02)

**10.1 Submit work (Rahul)**
```
POST /api/submissions
```
```json
{
  "assessmentID": 1,
  "studentID": 1,
  "fileURI": "https://blob.storage/submissions/rahul-quiz1.pdf"
}
```
Expected: `201` — status "Submitted"

**10.2 Grade submission**
```
POST /api/submissions/1/grade
```
```json
{
  "score": 42.0,
  "graderID": 2,
  "reason": "Good work"
}
```
Expected: `200` — status "Graded", score 42.0

**10.3 Re-grade (auto-creates GradeChange)**
```
POST /api/submissions/1/grade
```
```json
{
  "score": 45.0,
  "graderID": 2,
  "reason": "Found partial credit on Q3"
}
```
Expected: `200` — score updated to 45.0, GradeChange record auto-created in DB

**10.4 Score exceeds max**
```json
{ "score": 999.0, "graderID": 2, "reason": "Test" }
```
Expected: `400` — `SCORE_EXCEEDS_MAX`

---

### SECTION 11 — Finance (SFB)

> Login as Finance user first: `POST /api/auth/login` with `tanya.fin` / `Fin@123`, then re-authorize in Swagger.

**11.1 Create fee schedule**
```
POST /api/fees
```
```json
{
  "programID": 1,
  "term": "Fall 2026",
  "feeItemsJSON": "[{\"item\": \"Tuition\", \"amount\": 50000}, {\"item\": \"Lab Fee\", \"amount\": 5000}]",
  "effectiveFrom": "2026-06-01",
  "effectiveTo": "2026-12-31"
}
```
Expected: `201` — status "Draft"

**11.2 Award scholarship**
```
POST /api/scholarships
```
```json
{
  "studentID": 1,
  "awardType": "Merit",
  "amount": 10000.00,
  "validFrom": "2026-06-01",
  "validTo": "2026-12-31"
}
```
Expected: `201`

**11.3 Generate invoice (auto-deducts scholarship)**
```
POST /api/invoices/generate
```
```json
{
  "studentID": 1,
  "term": "Fall 2026",
  "dueDate": "2026-08-15"
}
```
Expected: `201` — amountDue = 45000 (55000 - 10000 scholarship)

**11.4 Record payment**
```
POST /api/payments
```
```json
{
  "invoiceID": 1,
  "amount": 45000.00,
  "method": "BankTransfer",
  "reference": "TXN-2026-001"
}
```
Expected: `201` — invoice status auto-updates to "Paid"

---

### SECTION 12 — Audit Log (IAM-04)

> Login as ITAdmin or Auditor to access this endpoint.

**12.1 Query audit logs**
```
GET /api/audit-log
```
Expected: `200` — returns recent audit log entries

**12.2 Filter by action**
```
GET /api/audit-log?action=LoginSuccess
```
Expected: `200` — login audit entries

---

### SECTION 13 — Applicants (SRA-01)

**13.1 Create applicant**
```
POST /api/applicants
```
```json
{
  "name": "Amit Verma",
  "dob": "2005-03-10",
  "nationalId": "AADHAAR-1234-5678",
  "contactInfoJSON": "{\"email\": \"amit@gmail.com\", \"phone\": \"+91-9876543210\"}",
  "programApplied": "B.Tech Computer Science",
  "documentsURIJSON": null
}
```
Expected: `201 Created`

**13.2 List applicants**
```
GET /api/applicants
```
Expected: `200 OK` — returns applicant list

**13.3 Get applicant by ID**
```
GET /api/applicants/1
```
Expected: `200 OK`

**13.4 Update applicant status**
```
PUT /api/applicants/1/status
```
```json
{ "status": "UnderReview" }
```
Expected: `200 OK` — status updated

**13.5 Accept applicant**
```
PUT /api/applicants/1/status
```
```json
{ "status": "Accepted" }
```
Expected: `200 OK`

---

### SECTION 14 — Transcripts (SRA-03)

> Registrar or ITAdmin only.

**14.1 Generate transcript for student 1**
```
POST /api/transcripts/generate/1
```
Expected: `201 Created` — status "Draft", includes enrolled courses and computed CGPA (10-point scale, `decimal(4,2)`)

**14.2 Get transcripts by student**
```
GET /api/transcripts/student/1
```
Expected: `200 OK` — returns draft transcript list

**14.3 Publish transcript**
```
PUT /api/transcripts/{id}/publish
```
Expected: `200 OK` — status changes to "Issued", `issuedAt` populated

**14.4 Download transcript (JSON)**
```
GET /api/transcripts/{id}
```
Expected: `200 OK` — transcript JSON with GPA, entries, student info

> **Known gap:** PRD requires PDF + QR code download. Currently only JSON is returned. Saurav to implement.

---

### SECTION 15 — Reports (RKA-01)

> Login as ITAdmin or Auditor to access these endpoints. `generatedByFK` is resolved from the JWT — body value is ignored (H-3 hardening).

**15.1 Generate report**
```
POST /api/reports/generate
```
```json
{
  "scope": "Enrollment",
  "parametersJSON": "{\"term\": \"Fall 2026\"}"
}
```
Expected: `201 Created` — report record created with scope "Enrollment"

**15.2 List all reports**
```
GET /api/reports
```
Expected: `200 OK` — returns report list

**15.3 Download report as PDF (default)**
```
GET /api/reports/1/download
```
Expected: `200 OK` — `Content-Type: application/pdf`, binary PDF file via QuestPDF

**15.4 Download report as JSON**
```
GET /api/reports/1/download?format=json
```
Expected: `200 OK` — `Content-Type: application/json`, camelCase fields (`reportID`, `scope`, `generatedAt`, etc.)

**15.5 Role denial — Student cannot access reports**
```
GET /api/reports
```
Expected: `403 Forbidden` (when called with Student token)

---

### SECTION 16 — KPIs (RKA-02)

**16.1 Seed default KPIs**
```
POST /api/kpis/seed
```
Expected: `200 OK` — default KPIs created (idempotent — returns `409 Conflict` if already seeded)

**16.2 List all KPIs**
```
GET /api/kpis
```
Expected: `200 OK` — returns list of KPIs with names, targets, current values

**16.3 Recalculate KPIs**
```
POST /api/kpis/recalculate
```
Expected: `200 OK` — KPI values recomputed from current data

---

### SECTION 17 — Audit Packages (RKA-03)

**17.1 Generate audit package**
```
POST /api/audit-packages/generate
```
```json
{
  "periodStart": "2026-01-01",
  "periodEnd": "2026-06-30"
}
```
Expected: `201 Created` — audit package with contents summary

**17.2 Invalid date range**
```
POST /api/audit-packages/generate
```
```json
{
  "periodStart": "2026-12-31",
  "periodEnd": "2026-01-01"
}
```
Expected: `400` — `INVALID_DATE_RANGE`

**17.3 Download audit package as PDF (default)**
```
GET /api/audit-packages/1/download
```
Expected: `200 OK` — `Content-Type: application/pdf`, binary PDF via QuestPDF

**17.4 Download audit package as JSON**
```
GET /api/audit-packages/1/download?format=json
```
Expected: `200 OK` — `Content-Type: application/json`, camelCase fields (`packageID`, `periodStart`, `periodEnd`, `contentsJSON`, `generatedAt`)

---

### SECTION 18 — Assessment Archival (AGI-01)

**18.1 Close assessment first**
```
PUT /api/assessments/1/publish
```
```json
{ "status": "Closed" }
```
Expected: `200 OK` — status "Closed"

**18.2 Archive closed assessment**
```
PUT /api/assessments/1/publish
```
```json
{ "status": "Archived" }
```
Expected: `200 OK` — status "Archived"

**18.3 Cannot archive non-closed assessment**
Create a new Draft assessment, then try to archive it directly:
```json
{ "status": "Archived" }
```
Expected: `400` — `INVALID_STATUS_TRANSITION`

---

## Post-Test DB Integrity Check

```sql
-- Enum strings confirmed (not integers)
SELECT UserID, Username, Role, Status FROM Users ORDER BY UserID;

-- Section enrolled counts updated correctly by API
SELECT SectionID, Capacity, EnrolledCount FROM Sections;

-- Enrollment statuses stored as strings
SELECT EnrollID, StudentID, SectionID, Status, WaitlistPosition
FROM Enrollments ORDER BY EnrollID;

-- GradeChange audit trail (from re-grading)
SELECT * FROM GradeChanges;

-- GPA column must be decimal(4,2) — supports 10-point CGPA
SELECT NUMERIC_PRECISION, NUMERIC_SCALE FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'Transcripts' AND COLUMN_NAME = 'GPA';
```

---

## What's Remaining — Open Gaps

### Saurav (SRA)
| Feature | Endpoints | Status | Note |
|---|---|---|---|
| SRA-03 transcript PDF | `GET /api/transcripts/{id}` (PDF variant) | ❌ Gap | PRD requires PDF + QR code; currently JSON only |

### Vikash (CCM + LMS + AGI)
| Feature | Endpoints | Status |
|---|---|---|
| AGI-04 plagiarism tracking | `PUT /api/submissions/{id}/plagiarism-report`, `GET /api/submissions/{id}/integrity-status` | ❌ Not implemented |

### Ashish (IAM)
| Feature | Endpoints | Status |
|---|---|---|
| IAM-03 MFA | `POST /api/auth/mfa/setup`, `POST /api/auth/mfa/verify` | ❌ Not implemented |

### All Team Members
| Task | Status |
|---|---|
| React 18 Frontend | ❌ Not started |
| EduLearn.Tests project (NUnit + Moq) | ❌ Not started |
| Azure deployment | ❌ Not started |

---

## Rules When Building New Features

1. **Inject repository interfaces** — never `AppDbContext` directly in controllers
2. **Add `[Authorize]`** to every new controller (except public endpoints)
3. **Create DTOs** — `CreateXxxDto`, `XxxResponseDto`, `UpdateXxxDto` as needed
4. **Use `{ error, code }` format** for all error responses
5. **Use strongly-typed enums** from `Models/Enums/` — no magic strings
6. **Test via Swagger** — login first, authorize with JWT, then test endpoints
7. **Reference PRD:** `docs/EduLearn-PRD-v1.0_2.docx` — the ONLY authoritative PRD document
8. **PDF downloads:** use `PdfGeneratorService` (QuestPDF 2024.x, community license, registered as Scoped) — never return raw JSON when PRD says PDF

---

*Last updated: May 5, 2026 • EduLearn v11.0*
