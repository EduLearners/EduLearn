# EduLearn v11.0 — Testing Guide & Next Steps

## Current Status (April 10, 2026)

### Completed
- Monolith restructuring complete
- 25 entities, 10 enum files, AppDbContext fully configured
- 13 repository interfaces + implementations, all registered in DI
- 3 controllers with 13 endpoints total
- `InitialCreate` migration generated and applied — `EduLearnDb` exists with 25 tables
- API runs on `http://localhost:5000`

### 13 Working Endpoints
- `UsersController` — POST /api/users, GET /api/users, GET /api/users/{id}, PUT /api/users/{id}, PUT /api/users/{id}/status
- `CoursesController` — POST /api/courses, GET /api/courses, GET /api/courses/{id}, PUT /api/courses/{id}
- `EnrollmentsController` — POST /api/enrollment/enroll, DELETE /api/enrollment/{id}/drop, GET /api/enrollment/student/{studentId}, GET /api/enrollment/section/{sectionId}

---

## Run the API

```bash
dotnet run --project EduLearn.API
```

Open Swagger: `http://localhost:5000/swagger`

---

## DB Verification in SSMS

Connect to `(localdb)\MSSQLLocalDB` → `EduLearnDb` and run:

```sql
-- Must return 26 (25 entity tables + __EFMigrationsHistory)
SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE';

-- Must return 31
SELECT COUNT(*) FROM sys.foreign_keys;

-- Must return 0
SELECT COUNT(*) FROM sys.foreign_keys WHERE delete_referential_action_desc != 'NO_ACTION';

-- All Status columns must be nvarchar, not int
SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
FROM INFORMATION_SCHEMA.COLUMNS WHERE COLUMN_NAME = 'Status' ORDER BY TABLE_NAME;
```

---

## Swagger Test Sequence

Run in order — each section depends on data from the previous one.

### SECTION 1 — Users

**1. Create admin user (POST /api/users)**
```json
{
  "username": "ashish.admin",
  "fullName": "Ashish Kumar",
  "email": "ashish@edulearn.com",
  "role": "ITAdmin",
  "password": "Admin@123"
}
```
Expected: `201`, `"userID": 1`

**2. Create instructor (POST /api/users)**
```json
{
  "username": "dr.priya",
  "fullName": "Dr. Priya Sharma",
  "email": "priya@edulearn.com",
  "role": "Instructor",
  "password": "Inst@123"
}
```
Expected: `201`, `"userID": 2`

**3. Create student 1 (POST /api/users)**
```json
{
  "username": "rahul.s",
  "fullName": "Rahul Kumar",
  "email": "rahul@edulearn.com",
  "role": "Student",
  "password": "Stud@123"
}
```
Expected: `201`, `"userID": 3`

**4. Create student 2 (POST /api/users)**
```json
{
  "username": "sneha.s",
  "fullName": "Sneha Gupta",
  "email": "sneha@edulearn.com",
  "role": "Student",
  "password": "Stud@456"
}
```
Expected: `201`, `"userID": 4`

**5. Duplicate email — negative test (POST /api/users)**
```json
{
  "username": "someone.else",
  "fullName": "Someone",
  "email": "ashish@edulearn.com",
  "role": "Student",
  "password": "Test@123"
}
```
Expected: `409`, `"code": "DUPLICATE_EMAIL"`

**6. Get all users (GET /api/users)**
Expected: `200`, array of 4 users. Verify `"role"` is a string e.g. `"ITAdmin"`, not an integer.

**7. Get user by ID (GET /api/users/1)**
Expected: `200`, Ashish Kumar

**8. Get non-existent user — negative test (GET /api/users/999)**
Expected: `404`, `"code": "USER_NOT_FOUND"`

**9. Update profile (PUT /api/users/3)**
```json
{
  "fullName": "Rahul Kumar Singh",
  "email": "rahul.updated@edulearn.com",
  "phone": "+91-9999999999"
}
```
Expected: `200`, updated `fullName` and `email`, `"updatedAt"` is not null

**10. Update status (PUT /api/users/4/status)**
```json
{ "status": "Suspended" }
```
Expected: `200`, `"status": "Suspended"`

> **Note on enum fields:** Swagger shows `role` and `status` as plain text boxes. Type the value exactly — case sensitive. Valid roles: `Student`, `Instructor`, `Registrar`, `DeptAdmin`, `Finance`, `ITAdmin`, `Auditor`. Valid statuses: `Active`, `Inactive`, `Suspended`, `Locked`.

---

### SECTION 2 — Courses

**11. Create course 1 (POST /api/courses)**
```json
{
  "code": "CS101",
  "title": "Introduction to Computer Science",
  "credits": 3,
  "level": "UG"
}
```
Expected: `201`, `"courseID": 1`, `"status": "Active"`

**12. Create course 2 (POST /api/courses)**
```json
{
  "code": "MATH201",
  "title": "Linear Algebra",
  "credits": 4,
  "level": "UG"
}
```
Expected: `201`, `"courseID": 2`

**13. Duplicate code — negative test (POST /api/courses)**
```json
{
  "code": "CS101",
  "title": "Another CS Course",
  "credits": 3
}
```
Expected: `409`, `"code": "DUPLICATE_COURSE_CODE"`

**14. Get all courses (GET /api/courses)**
Expected: `200`, array of 2 courses, each with `"status": "Active"`

**15. Get course by ID (GET /api/courses/1)**
Expected: `200`, CS101

**16. Get non-existent course — negative test (GET /api/courses/999)**
Expected: `404`, `"code": "COURSE_NOT_FOUND"`

**17. Update course (PUT /api/courses/1)**
```json
{
  "code": "CS101",
  "title": "Intro to CS — Updated",
  "credits": 4,
  "level": "UG"
}
```
Expected: `200`, updated `title` and `credits`

---

### SECTION 3 — Enrollment

**Seed data required first.** Connect to `(localdb)\MSSQLLocalDB` → `EduLearnDb` in SSMS and run:

```sql
-- Program
INSERT INTO Programs (Name, DegreeType, DurationTerms, Status)
VALUES ('B.Tech CS', 'Bachelor', 8, 'Active');

-- Room
INSERT INTO Rooms (Building, RoomNumber, Capacity, Status)
VALUES ('Block A', 'A101', 60, 'Available');

-- Students — use UserID 3 (Rahul) and UserID 4 (Sneha) created above
INSERT INTO Students (UserID, MRN, Name, DOB, EnrollmentStatus, ProgramID, EntryTerm, CreatedAt)
VALUES (3, 'STU2026001', 'Rahul Kumar', '2004-05-15', 'Active', 1, 'Fall 2026', GETUTCDATE());

INSERT INTO Students (UserID, MRN, Name, DOB, EnrollmentStatus, ProgramID, EntryTerm, CreatedAt)
VALUES (4, 'STU2026002', 'Sneha Gupta', '2004-08-22', 'Active', 1, 'Fall 2026', GETUTCDATE());

-- Section 1 — capacity 60 (normal enrollment testing)
INSERT INTO Sections (CourseID, Term, InstructorID, RoomID, Capacity, EnrolledCount, Status)
VALUES (1, 'Fall 2026', 2, 1, 60, 0, 'Open');

-- Section 2 — capacity 1 (waitlist testing)
INSERT INTO Sections (CourseID, Term, InstructorID, RoomID, Capacity, EnrolledCount, Status)
VALUES (1, 'Fall 2026', 2, 1, 1, 0, 'Open');

-- Verify seed data
SELECT StudentID, MRN, Name FROM Students;
SELECT SectionID, CourseID, Capacity, Status FROM Sections;
```

**18. Enroll student 1 in section 1 (POST /api/enrollment/enroll)**
```json
{ "studentID": 1, "sectionID": 1 }
```
Expected: `201`, `"status": "Enrolled"`, `"studentName": "Rahul Kumar"`, `"waitlistPosition": null`

**19. Duplicate enrollment — negative test (POST /api/enrollment/enroll)**
Same body again.
Expected: `409`, `"code": "DUPLICATE_ENROLLMENT"`

**20. Enroll student 2 in section 1 (POST /api/enrollment/enroll)**
```json
{ "studentID": 2, "sectionID": 1 }
```
Expected: `201`, `"status": "Enrolled"`, `"studentName": "Sneha Gupta"`

**21. Waitlist test — fill section 2 (POST /api/enrollment/enroll)**
```json
{ "studentID": 1, "sectionID": 2 }
```
Expected: `201`, `"status": "Enrolled"` (section 2 now full, capacity = 1)

```json
{ "studentID": 2, "sectionID": 2 }
```
Expected: `201`, `"status": "Waitlisted"`, `"waitlistPosition": 1`

**22. Get student 1 enrollments (GET /api/enrollment/student/1)**
Expected: `200`, 2 enrollments — section 1 Enrolled, section 2 Enrolled.
Note the `"enrollID"` for student 1's section 2 enrollment — needed for next test.

**23. Drop enrollment and verify auto-promote (DELETE /api/enrollment/{enrollID}/drop)**
Use the `enrollID` from test 22 for student 1 in section 2.
Expected: `204 No Content`

**24. Verify auto-promote (GET /api/enrollment/section/2)**
Expected: `200`, Sneha's record now shows `"status": "Enrolled"`, `"waitlistPosition": null`

**25. Get section 1 roster (GET /api/enrollment/section/1)**
Expected: `200`, 2 students — Rahul and Sneha both `"status": "Enrolled"`

**26. Invalid student — negative test (POST /api/enrollment/enroll)**
```json
{ "studentID": 999, "sectionID": 1 }
```
Expected: `400`, `"code": "STUDENT_NOT_FOUND"`

**27. Invalid section — negative test (POST /api/enrollment/enroll)**
```json
{ "studentID": 1, "sectionID": 999 }
```
Expected: `400`, `"code": "SECTION_NOT_FOUND"`

---

## Post-Test DB Integrity Check

```sql
-- Enum strings confirmed (not integers)
SELECT UserID, Username, Role, Status FROM Users ORDER BY UserID;

-- Section enrolled counts updated correctly by API
SELECT SectionID, Capacity, EnrolledCount FROM Sections;
-- Section 1: EnrolledCount = 2
-- Section 2: EnrolledCount = 1 (Sneha promoted)

-- Enrollment statuses stored as strings
SELECT EnrollID, StudentID, SectionID, Status, WaitlistPosition
FROM Enrollments ORDER BY EnrollID;
-- Status values must be 'Enrolled', 'Waitlisted', or 'Dropped' — never integers
```

---

## Commit and Push

```bash
git add .
git commit -m "chore: restructure to monolith, add repository pattern, fix SIS enum conversions"
git push
```

---

## Interim Milestone (April 24, 2026) — What Each Member Builds Next

| Member | Features | Controllers to Build |
|---|---|---|
| Ashish | IAM-01, IAM-02, IAM-04 | AuthController, AuditLogController |
| Saurav | SRA-01, SRA-02, ETS-01, ETS-02 | ApplicantsController, StudentsController, SectionsController, RoomsController |
| Vikash | CCM-01, LMS-01, AGI-01, AGI-02 | ProgramsController, ContentsController, AssessmentsController, SubmissionsController |
| Utkarsh | RKA-01, RKA-02 | ReportsController, KPIsController |
| Tanya | SFB-01, SFB-02, SFB-03 | FeesController, InvoicesController, PaymentsController |
| Swarna | NHT-01, NHT-03 | NotificationsController, TicketsController |

### Rules When Building a New Controller
1. Inject the relevant repository interface — never `AppDbContext` directly
2. Create request/response DTOs in `EduLearn.API/DTOs/`
3. All 13 existing repos are already registered in `Program.cs` — no changes needed for those
4. If you need a repo that doesn't exist yet (e.g. `IApplicantRepository`, `IRoomRepository`, `IProgramRepository`), create the interface in `Repositories/Interfaces/`, the implementation in `Repositories/Implementations/`, and add one `AddScoped` line to `Program.cs`
