# EduLearn v1.0 — Complete Testing Guide & Next Steps

> **PRD Reference:** `docs/EduLearn-PRD-v1.0_2.docx` — this is the ONLY authoritative PRD. All other versions are deprecated.

---

## Current Status (April 15, 2026)

### Build Status: ✅ 0 errors, 0 warnings

### Infrastructure
- ASP.NET Core 8.0 + EF Core 8.0
- SQL Server LocalDB — `EduLearnDb` with 25 tables
- JWT Bearer authentication (60 min expiry) + BCrypt password hashing
- 8 role-based authorization policies
- Swagger with 🔒 Authorize button
- 20 repository interfaces + 20 implementations
- 3 services: TokenService, AuthService, AuditLogService
- All controllers secured with `[Authorize]` (except Auth + Health)

### 21 Controllers — 55+ Endpoints

| Module | Owner | Controllers | Status |
|---|---|---|---|
| IAM | Ashish | AuthController, UsersController, AuditLogController | ✅ Done |
| SRA | Saurav | ApplicantsController, StudentsController | ✅ Done |
| ETS | Saurav | EnrollmentsController, SectionsController, RoomsController | ✅ Done |
| CCM | Vikash | CoursesController, ProgramsController | ✅ Done |
| AGI | Vikash | AssessmentsController, SubmissionsController | ✅ Done |
| LMS | Vikash | ContentsController | ✅ Done |
| SFB | Tanya | FeesController, InvoicesController, PaymentsController, ScholarshipsController | ✅ Done |
| RKA | Utkarsh | ReportsController, KPIsController, AuditPackagesController | ✅ Done |
| NHT | Swarna | — | ❌ Not started |
| System | — | HealthController | ✅ Done |

---

## Run the API

```bash
dotnet run --project EduLearn.API
```

Open Swagger: `https://localhost:5001/swagger`

---

## Authentication Flow (Must Do First)

All endpoints except `/api/auth/*` and `/api/health` require a JWT token.

**Step 1 — Register a user:**
```
POST /api/auth/register
```
```json
{
  "username": "ashish.admin",
  "fullName": "Ashish Kumar",
  "email": "ashish@edulearn.com",
  "role": "ITAdmin",
  "password": "Admin@123"
}
```

**Step 2 — Login to get JWT:**
```
POST /api/auth/login
```
```json
{
  "username": "ashish.admin",
  "password": "Admin@123"
}
```
Response contains `"token": "eyJhbGciOiJIUzI1NiIs..."` — copy this.

**Step 3 — Authorize in Swagger:**
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
```

---

## Complete Swagger Test Sequence

Run in order — each section depends on data from the previous one.

> **Important:** After registering and logging in (Section 0), click 🔒 Authorize in Swagger before testing any other endpoint.

---

### SECTION 0 — Authentication (IAM-01)

**0.1 Register ITAdmin**
```
POST /api/auth/register
```
```json
{
  "username": "ashish.admin",
  "fullName": "Ashish Kumar",
  "email": "ashish@edulearn.com",
  "role": "ITAdmin",
  "password": "Admin@123"
}
```
Expected: `200 OK`

**0.2 Register Instructor**
```
POST /api/auth/register
```
```json
{
  "username": "dr.priya",
  "fullName": "Dr. Priya Sharma",
  "email": "priya@edulearn.com",
  "role": "Instructor",
  "password": "Inst@123"
}
```
Expected: `200 OK`

**0.3 Register Student 1**
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
Expected: `200 OK`

**0.4 Register Student 2**
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

**0.5 Register Finance Officer**
```
POST /api/auth/register
```
```json
{
  "username": "tanya.fin",
  "fullName": "Tanya Singh",
  "email": "tanya@edulearn.com",
  "role": "Finance",
  "password": "Fin@123"
}
```
Expected: `200 OK`

**0.6 Login as ITAdmin (get JWT)**
```
POST /api/auth/login
```
```json
{
  "username": "ashish.admin",
  "password": "Admin@123"
}
```
Expected: `200 OK` with `"token": "eyJ..."` — **Copy this token and click 🔒 Authorize in Swagger.**

**0.7 Test 401 — Access without token**
Remove the token from Swagger Authorize, then try:
```
GET /api/users
```
Expected: `401 Unauthorized` — "Authentication required. Please login at POST /api/auth/login to get a JWT token."

Re-authorize with the token before continuing.

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
Expected: `200 OK` — Ashish Kumar

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
```

---

## What's Remaining — Post-Interim Features (by June 16)

### Vikash (CCM + LMS + AGI)
| Feature | Endpoints | Status |
|---|---|---|
| CCM-02 (Syllabus Versioning) | 4 | ❌ Not started |
| CCM-03 (Prerequisite Engine) | 1 | ❌ Not started |
| LMS-02 (Discussion Forums) | 4 | ❌ Not started |
| AGI-03 (Grade Change Audit Trail) | 2 | ❌ Not started |
| AGI-04 (Plagiarism Tracking) | 2 | ❌ Not started |

### Swarna (NHT)
| Feature | Endpoints | Status |
|---|---|---|
| NHT-01 (Notifications + SignalR) | 5 | ❌ Not started |
| NHT-03 (Helpdesk Tickets) | 5 | ❌ Not started |

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

---

*Last updated: April 15, 2026 • EduLearn v1.0*
