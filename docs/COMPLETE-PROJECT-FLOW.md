# EduLearn — Complete Project Flow

**A real-world narrative of every role's journey through the system**

**Document purpose:** This is the canonical end-to-end flow of the EduLearn API, written as real-world user stories covering every role, every action, every form, and every decision point. Each phase maps to PRD features and includes the exact API calls, required fields, business rules, and compliance notes.

**Scope:** All 8 user types (7 roles + Applicant), all 9 PRD modules, complete academic term lifecycle.

**Updated:** 2026-04-21 — reflects the interim-polish additions (promoted-waitlist notification, payment/scholarship notifications, audit logs on enrollment/drop/invoice/payment/grading).

---

## Table of Contents

1. [Cast of Characters (The 8 User Types)](#1-cast-of-characters-the-8-user-types)
2. [Phase 1 — System Bootstrap (Day 0)](#2-phase-1--system-bootstrap-day-0)
3. [Phase 2 — Academic Setup (Week -4 to -2)](#3-phase-2--academic-setup-week--4-to--2)
4. [Phase 3 — Financial Setup (Week -2)](#4-phase-3--financial-setup-week--2)
5. [Phase 4 — Admissions Season (Week -8 to -1)](#5-phase-4--admissions-season-week--8-to--1)
6. [Phase 5 — Student Onboarding (Week -1)](#6-phase-5--student-onboarding-week--1)
7. [Phase 6 — Instructor Preparation (Week -1)](#7-phase-6--instructor-preparation-week--1)
8. [Phase 7 — Enrollment Period (Week 0)](#8-phase-7--enrollment-period-week-0)
9. [Phase 8 — Billing Cycle (Week 1-2)](#9-phase-8--billing-cycle-week-1-2)
10. [Phase 9 — The Active Semester (Week 3-14)](#10-phase-9--the-active-semester-week-3-14)
11. [Phase 10 — Assessment & Grading](#11-phase-10--assessment--grading)
12. [Phase 11 — Support Throughout the Term](#12-phase-11--support-throughout-the-term)
13. [Phase 12 — Audit & Compliance](#13-phase-12--audit--compliance)
14. [User Story Index by Role](#14-user-story-index-by-role)
15. [PRD Compliance Map](#15-prd-compliance-map)

---

## 1. Cast of Characters (The 8 User Types)

Meet the people who will use EduLearn throughout this flow:

| Persona | Role | Real name in our story | What they do |
|---------|------|------------------------|--------------|
| 🛠️ **Arjun** | ITAdmin | System administrator | Bootstraps the system, manages all user accounts, resolves IT tickets |
| 📋 **Ritu** | Registrar | Academic administrator | Handles applications, creates student records, manages enrollments |
| 🎓 **Dr. Khanna** | DeptAdmin | Head of Computer Science Dept | Defines programs, creates courses, sets up sections and rooms |
| 👨‍🏫 **Prof. Mehra** | Instructor | Computer Science professor | Uploads content, creates assessments, grades submissions |
| 💰 **Seema** | Finance | Finance officer | Sets fee schedules, generates invoices, records payments, awards scholarships |
| 📊 **Vivek** | Auditor | Compliance officer | Reviews audit logs, generates compliance reports, tracks KPIs |
| ✉️ **Rahul** | Applicant | Prospective student (no login yet) | Submits admission application, waits for decision |
| 🧑‍🎓 **Ananya** | Student | Enrolled learner | Enrolls in courses, submits assignments, pays fees, receives grades |

All calls below use `Authorization: Bearer <token>` — the token expires in 60 minutes and must be refreshed by re-login.

---

## 2. Phase 1 — System Bootstrap (Day 0)

### 👤 Arjun (ITAdmin) — "First day. I need to get this thing running."

#### 2.1 First login with seeded admin account

The application's `DbInitializer` seeds a default ITAdmin on first startup. Arjun uses it.

**Arjun's browser sends:**
```http
POST /api/auth/login
Content-Type: application/json

{ "username": "admin", "password": "Admin@123" }
```

**What happens inside:**
1. `AuthService.LoginAsync` looks up `admin` user via `IUserRepository.GetByUsernameAsync`
2. BCrypt verification runs (~300ms — intentional timing hardening to prevent username enumeration)
3. `TokenService.GenerateToken` creates a JWT with claims: UserID=1, Username="admin", Email, Role=ITAdmin
4. `AuditLogService.LogAsync` writes action="LoginSuccess", ResourceType="User", ResourceID=1
5. Response returns the token

Arjun copies the token and uses it as `Authorization: Bearer <token>` for every subsequent call.

**User story:** *"As ITAdmin, I need a working login with the seeded default account so I can bootstrap the institution's data."*
**PRD mapping:** IAM-01

---

#### 2.2 Arjun creates staff accounts

Privileged roles cannot self-register (the public `/api/auth/register` endpoint forces `Role = Student` — hardening C-26). Arjun creates each staff member one by one.

**For each staff member — Ritu, Dr. Khanna, Prof. Mehra, Seema, Vivek:**

```http
POST /api/users
Authorization: Bearer <Arjun's token>

{
  "username": "ritu.registrar",
  "fullName": "Ritu Sharma",
  "email": "ritu@edulearn.edu",
  "phone": "+91-9811223344",
  "role": "Registrar",
  "password": "InitPass@123"
}
```

Each creation:
- Checks username/email uniqueness
- Password BCrypt-hashed
- Status defaults to `Active`
- `AuditLog` entry written: action="UserCreatedByAdmin"

Arjun repeats for Instructor, DeptAdmin, Finance, Auditor roles. Each staff member then logs in and changes their password (post-interim feature — currently they keep the initial password).

**User story:** *"As ITAdmin, I need to create accounts for all privileged staff because the public registration endpoint cannot create anything but Student accounts."*
**PRD mapping:** IAM-02 | Hardening C-26

---

#### 2.3 Arjun seeds the KPI definitions

```http
POST /api/kpis/seed
Authorization: Bearer <Arjun's token>
```

This creates 4 default KPI records (idempotent — safe to call again):
- Active Student Count
- Section Fill Rate
- Assessment Published Rate
- Enrollment Waitlist Rate

These are definitions only — current values are all 0 until recalculation.

**User story:** *"As ITAdmin, I need to seed KPI definitions once so the Analytics module has something to measure against."*
**PRD mapping:** RKA-02

---

## 3. Phase 2 — Academic Setup (Week -4 to -2)

### 👤 Dr. Khanna (DeptAdmin) — "Let me set up the academic structure for Computer Science."

#### 3.1 Create the degree program

```http
POST /api/programs
Authorization: Bearer <Dr. Khanna's token>

{
  "name": "Bachelor of Science in Computer Science",
  "departmentID": 1,
  "degreeType": "Bachelor",
  "requiredCoursesJSON": "[\"CS101\",\"CS201\",\"CS301\",\"MA101\"]",
  "electivesJSON": "[\"CS401\",\"CS402\",\"CS403\"]",
  "durationTerms": 8
}
```

- Duplicate check on `name + degreeType` prevents two programs with the same name
- `status` defaults to `Active`
- `ProgramID` returned

**User story:** *"As DeptAdmin, I define the degree programs my department offers, specifying required courses, electives, and the typical 8-term duration."*
**PRD mapping:** CCM-01

---

#### 3.2 Create the course catalog

Dr. Khanna adds each course individually:

```http
POST /api/courses
Authorization: Bearer <Dr. Khanna's token>

{
  "code": "CS101",
  "title": "Introduction to Computer Science",
  "description": "Fundamentals of computing, algorithms, and programming concepts.",
  "credits": 3,
  "departmentID": 1,
  "level": "Undergraduate",
  "prerequisitesJSON": "[]"
}
```

- `code` must be globally unique (enforced at DB level)
- `credits` range: 1–12 (default 3)
- `status` defaults to `Active`

Dr. Khanna repeats for CS201, CS301, CS401, MA101...

**User story:** *"As DeptAdmin, I create the course catalog — each course has a unique code and a credit weight that feeds into GPA calculations later."*
**PRD mapping:** CCM-01

---

#### 3.3 Create physical rooms

```http
POST /api/rooms
Authorization: Bearer <Dr. Khanna's token>

{
  "building": "Science Block A",
  "roomNumber": "201",
  "capacity": 60,
  "resourcesJSON": "{\"projector\": true, \"whiteboard\": true, \"computers\": 30}"
}
```

- Duplicate check on `building + roomNumber`
- `status` defaults to `Available`

**User story:** *"As DeptAdmin, I register each classroom so that sections can be scheduled in them."*
**PRD mapping:** ETS-02

---

## 4. Phase 3 — Financial Setup (Week -2)

### 👤 Seema (Finance) — "Before students can be billed, I need to define what they owe."

#### 4.1 Create the fee schedule for the term

```http
POST /api/fees
Authorization: Bearer <Seema's token>

{
  "programID": 1,
  "term": "2026-Spring",
  "feeItemsJSON": "{\"tuition\": 50000, \"labFee\": 5000, \"libraryFee\": 2000, \"sportsFee\": 1500, \"examFee\": 1000}",
  "effectiveFrom": "2026-01-01",
  "effectiveTo": "2026-06-30"
}
```

- Starts in `Draft` status
- Fee applies to all students in `programID=1` for `term="2026-Spring"`

---

#### 4.2 Activate the fee schedule

```http
PUT /api/fees/{feeID}
Authorization: Bearer <Seema's token>

{
  "feeItemsJSON": "{\"tuition\": 50000, \"labFee\": 5000, \"libraryFee\": 2000, \"sportsFee\": 1500, \"examFee\": 1000}",
  "effectiveFrom": "2026-01-01",
  "effectiveTo": "2026-06-30",
  "status": "Active"
}
```

Now the fee schedule is "live" and can be referenced by invoice generation.

**Business rule verified:** A `Superseded` fee schedule cannot be revived (terminal state).

**User story:** *"As Finance officer, I set up the fee structure for each program-term combination so students can be billed accurately."*
**PRD mapping:** SFB-01

**Important architectural note:** Creating a fee schedule does NOT automatically bill anyone. Invoices are generated on a separate Finance action — this matches real university practice where students enroll first and are billed after registration closes.

---

## 5. Phase 4 — Admissions Season (Week -8 to -1)

### 👤 Ritu (Registrar) — "Applications are arriving. Let me process them."

#### 5.1 Applicant submits an application

📝 **Rahul (applicant) has NO login account.** He fills a paper or external form. Ritu enters it into EduLearn on his behalf.

```http
POST /api/applicants
Authorization: Bearer <Ritu's token>

{
  "name": "Rahul Kumar",
  "dob": "2003-06-15",
  "nationalID": "AB1234567",
  "contactInfoJSON": "{\"email\":\"rahul@gmail.com\",\"phone\":\"+91-9876543210\",\"address\":\"123 Main St, Delhi\"}",
  "programApplied": "Bachelor of Science in Computer Science",
  "documentsURIJSON": "[\"https://storage/transcripts/rahul_hs.pdf\",\"https://storage/id/rahul_aadhaar.pdf\"]"
}
```

- Duplicate `nationalID` check — Rahul cannot apply twice
- `applicationStatus` defaults to `Submitted`
- `submittedAt` timestamp recorded

**User story:** *"As Registrar, I enter applicant details from the paper/email submissions into the system so the admissions committee can review them."*
**PRD mapping:** SRA-01

**PRD compliance note:** The EduLearn API is an internal SIS per PRD — it does not expose a public applicant portal. Registrars submit applications on the applicant's behalf. This is by design.

---

#### 5.2 Review and advance the application

Ritu periodically reviews submitted applications.

```http
GET /api/applicants
Authorization: Bearer <Ritu's token>
```

Returns a list. Ritu picks Rahul's record.

```http
GET /api/applicants/42
Authorization: Bearer <Ritu's token>
```

After admissions committee meeting:

```http
PUT /api/applicants/42/status
Authorization: Bearer <Ritu's token>

{ "status": "UnderReview" }
```

Then, after all documents are verified:

```http
PUT /api/applicants/42/status

{ "status": "Accepted" }
```

Valid transitions: `Submitted` → `UnderReview` → `Accepted` / `Rejected` / `Waitlisted`

**User story:** *"As Registrar, I advance applications through review states as the admissions committee makes decisions."*
**PRD mapping:** SRA-01

---

## 6. Phase 5 — Student Onboarding (Week -1)

### 👤 Ritu + Arjun — "Rahul was accepted. Now he needs access."

Becoming a "Student" in EduLearn is a **two-step process** because creating User accounts is ITAdmin-only:

#### 6.1 Arjun (ITAdmin) creates a User account for Rahul

Ritu requests this via internal email or ticket.

```http
POST /api/users
Authorization: Bearer <Arjun's token>

{
  "username": "rahul.kumar",
  "fullName": "Rahul Kumar",
  "email": "rahul@gmail.com",
  "phone": "+91-9876543210",
  "role": "Student",
  "password": "Welcome@123"
}
```

Returns `UserID: 50`.

---

#### 6.2 Ritu creates the Student profile linked to the new User

```http
POST /api/students
Authorization: Bearer <Ritu's token>

{
  "userID": 50,
  "name": "Rahul Kumar",
  "dob": "2003-06-15",
  "gender": "Male",
  "contactInfoJSON": "{\"phone\":\"+91-9876543210\",\"address\":\"123 Main St, Delhi\"}",
  "programID": 1,
  "entryTerm": "2026-Spring",
  "expectedGraduationTerm": "2030-Spring"
}
```

**What happens internally:**
1. Validates `userID=50` exists and is not already linked to another student
2. Validates `programID=1` exists
3. **Auto-generates MRN** — Rahul becomes `STU-00042` (sequential)
4. Sets `enrollmentStatus = Active`
5. Links the User and Student records via the one-to-one relationship

---

#### 6.3 Rahul receives his credentials (manual — out of system)

Ritu emails Rahul: "Congratulations! Log in at edulearn.edu with username `rahul.kumar` and password `Welcome@123`. Change your password on first login."

📌 *Note:* First-login password change is a post-interim feature. For now, Rahul uses the initial password.

**User story:** *"As a newly accepted applicant, I receive my student credentials so I can log into the system and begin my academic journey."*
**PRD mapping:** SRA-02

**Architectural note:** The PRD envisions this as a single "auto-create User+Student on acceptance" step — but current implementation requires manual coordination between Registrar and ITAdmin. This is a post-interim refinement noted in `PRD-DISCREPANCIES.md`.

---

## 7. Phase 6 — Instructor Preparation (Week -1)

### 👤 Dr. Khanna (DeptAdmin) — "Prof. Mehra will teach CS101 this term."

#### 7.1 Create a Section (course offering)

```http
POST /api/sections
Authorization: Bearer <Dr. Khanna's token>

{
  "courseID": 1,
  "term": "2026-Spring",
  "instructorID": 3,
  "roomID": 1,
  "capacity": 40,
  "scheduleJSON": "{\"days\":[\"Mon\",\"Wed\"],\"time\":\"09:00-10:30\"}"
}
```

**Validations:**
- `courseID` must exist
- `instructorID` must exist AND have `Role = Instructor` (non-instructors rejected)
- `roomID` must exist if provided
- `capacity` range: 1–500

Returns `SectionID: 5`, `status = Open`, `enrolledCount = 0`.

**User story:** *"As DeptAdmin, I create specific course offerings, assigning an instructor and room to each section."*
**PRD mapping:** ETS-02

---

## 8. Phase 7 — Enrollment Period (Week 0)

### 👤 Ananya (Student) — "Enrollment opens today. Let me register for classes."

#### 8.1 Ananya logs in

```http
POST /api/auth/login

{ "username": "ananya.sharma", "password": "Welcome@123" }
```

Returns her JWT token with `Role = Student`. She copies it for the session.

---

#### 8.2 Browse the catalog

```http
GET /api/programs              → See all programs (confirm her program exists)
GET /api/courses               → Browse all courses
GET /api/courses/1             → Check CS101 details, prerequisites
GET /api/sections/course/1/term/2026-Spring    → Find CS101 sections for this term
GET /api/sections/5            → View section 5 details — day, time, instructor, capacity
```

📝 **Reality note:** Ananya must know the course IDs and term in advance to search sections. There's no "find-me-all-available-sections" endpoint. This is acceptable for interim — the frontend can do filtering client-side.

---

#### 8.3 Enroll in a section

```http
POST /api/enrollment/enroll
Authorization: Bearer <Ananya's token>

{ "studentID": 12, "sectionID": 5 }
```

**What happens internally (wrapped in a DB transaction):**
1. **Ownership check** — since caller is `Student` role, validates Ananya's JWT `UserID` matches the `UserID` on student record 12. Prevents a student enrolling someone else.
2. **Duplicate check** — queries `(StudentID=12, SectionID=5)` in Enrollments. DB has a unique index, so even concurrent requests are blocked.
3. **Capacity check** — if `section.enrolledCount < section.capacity`, status = `Enrolled`. Otherwise, status = `Waitlisted` with auto-assigned `WaitlistPosition`.
4. **Commit transaction**
5. **Notify** — `NotificationService.NotifyAsync` creates a notification for Ananya: "You have been enrolled in CS101" (or "added to waitlist").

Returns `EnrollID: 77`, `status: "Enrolled"`, `waitlistPosition: null`.

**User story:** *"As a student, I enroll in the sections I want — if a section is full, I'm placed on a waitlist and automatically promoted if someone drops."*
**PRD mapping:** ETS-01

---

#### 8.4 View her enrollments

```http
GET /api/enrollment/student/12
Authorization: Bearer <Ananya's token>
```

**Access rule:** Student can only view their own enrollments.

Returns all her active/waitlisted/dropped enrollments with course name, term, section ID.

---

#### 8.5 Drop a section if she changes her mind

```http
DELETE /api/enrollment/77/drop
Authorization: Bearer <Ananya's token>
```

**What happens internally:**
1. Ownership check — only the student who owns enrollment 77 (or Registrar/ITAdmin) can drop
2. Sets enrollment status = `Dropped`
3. Decrements `section.enrolledCount`
4. **Waitlist promotion** — if someone else is waitlisted, the first in queue (lowest `WaitlistPosition`) is promoted to `Enrolled`, their position cleared
5. Remaining waitlist positions are re-ordered
6. Ananya receives "Dropped from CS101" notification
7. **The promoted student is also notified** (interim-polish 2026-04-21): "You have been promoted from the waitlist and are now enrolled in CS101"
8. An `EnrollmentDropped` entry is appended to the audit log with the `promotedEnrollId` captured, so the Auditor can trace the full chain from drop → promotion

**User story:** *"As a student, I can drop courses before the deadline, and the system automatically fills my spot from the waitlist."*
**PRD mapping:** ETS-01

---

## 9. Phase 8 — Billing Cycle (Week 1-2)

### 👤 Seema (Finance) — "Registration closed. Now I invoice every enrolled student."

Note: Seema must do this **per student, per term** — there's no batch endpoint in the interim scope.

#### 9.1 Generate an invoice for Ananya

```http
POST /api/invoices/generate
Authorization: Bearer <Seema's token>

{
  "studentID": 12,
  "term": "2026-Spring",
  "dueDate": "2026-03-31"
}
```

**What happens internally:**
1. Looks up the `Active` fee schedule for Ananya's `programID` + `term="2026-Spring"`
2. Parses `feeItemsJSON` (catches invalid JSON with a clean BadRequest)
3. Queries all `Active` scholarships for Ananya overlapping the fee schedule's validity period
4. Calculates: `AmountDue = sum(feeItems) - sum(scholarships)`
5. Creates the Invoice with detailed `LineItemsJSON` showing both fees and scholarship deductions
6. `status = Pending`, `issuedAt = UtcNow`
7. Duplicate invoice prevention — cannot generate two invoices for same (StudentID, Term)
8. **Notifies** Ananya: "Invoice generated for 2026-Spring: ₹59,500 due by 2026-03-31", category=`Finance`

**User story:** *"As Finance, I generate term invoices after enrollment closes, with scholarships automatically deducted from the total."*
**PRD mapping:** SFB-02

---

#### 9.2 Ananya views her invoice

```http
GET /api/invoices/student/12
Authorization: Bearer <Ananya's token>
```

**Access rule:** Students can only view their own invoices.

Returns the invoice list. Ananya clicks on the 2026-Spring one:

```http
GET /api/invoices/1001
```

She sees the full line-item breakdown: tuition, lab fee, library fee, minus her scholarship of ₹10,000, totaling ₹49,500.

📌 *Known UX gap:* Ananya cannot currently view her scholarships directly (`GET /api/scholarships/student/{id}` is gated to Finance). She sees the deduction only as a line item on her invoice.

---

#### 9.3 Ananya pays (via Finance counter — in person or bank transfer)

Students cannot self-pay through the API — the POST `/api/payments` endpoint is gated to Finance. This matches real-world practice: Ananya goes to the Finance counter, pays in person (or via bank transfer), and Seema records it:

```http
POST /api/payments
Authorization: Bearer <Seema's token>

{
  "invoiceID": 1001,
  "amount": 49500.00,
  "method": "BankTransfer",
  "reference": "TXN-2026-03-15-0042"
}
```

**What happens internally:**
1. Validates `amount > 0`
2. Computes total payments against invoice `AmountDue`
3. Updates invoice status:
   - `totalPaid >= amountDue` → `Paid`
   - Partial → `PartiallyPaid`
4. Blocks overpayment
5. Payment `status = Completed` (hardcoded — payment status workflow is a post-interim feature)
6. **Notifies Ananya** (interim-polish 2026-04-21): "Payment of $49500.00 recorded for invoice #1001. Invoice status: Paid."
7. **Appends `PaymentRecorded` audit log entry** with amount, method, and resulting invoice status — visible to Auditor

**User story:** *"As Finance, I record the student's payment. The invoice status updates automatically, the student is notified, and the action is captured in the audit trail."*
**PRD mapping:** SFB-03

---

#### 9.4 Seema awards a scholarship

```http
POST /api/scholarships
Authorization: Bearer <Seema's token>

{
  "studentID": 12,
  "awardType": "Merit Scholarship",
  "amount": 10000.00,
  "validFrom": "2026-01-01",
  "validTo": "2026-12-31"
}
```

- Validates studentID exists
- `status = Active`
- `appliedAt` timestamp recorded
- **Notifies the student** (interim-polish 2026-04-21): "Scholarship awarded: Merit Scholarship ($10000.00) valid 2026-01-01 to 2026-12-31."

**Business rule:** Once set to `Revoked`, cannot be reactivated (terminal state — enforced in PUT).

📌 *Remaining known gap:* if Seema awards a scholarship AFTER an invoice is already generated, the existing invoice is NOT recalculated. The student will see the benefit on the next invoice generated after the scholarship is active. Post-interim fix.

**User story:** *"As Finance, I award merit and need-based scholarships. Active scholarships automatically reduce future invoices, and the student is notified of the award."*
**PRD mapping:** SFB-04

---

## 10. Phase 9 — The Active Semester (Week 3-14)

### 👤 Prof. Mehra (Instructor) — "Classes have started. Let me upload materials."

#### 10.1 View his teaching assignments

```http
GET /api/sections/course/1/term/2026-Spring
Authorization: Bearer <Prof. Mehra's token>
```

He sees section 5 — his CS101 section.

```http
GET /api/enrollment/section/5
```

Returns the full roster — every enrolled and waitlisted student with name, enrollment status, timestamp.

**User story:** *"As an instructor, I see my class roster so I can plan the term."*
**PRD mapping:** ETS-01

---

#### 10.2 Upload lecture content

```http
POST /api/content/upload
Authorization: Bearer <Prof. Mehra's token>

{
  "courseID": 1,
  "title": "Week 1 — Introduction to Computing",
  "type": "Video",
  "uri": "https://cdn.edulearn.edu/videos/cs101_week1.mp4",
  "uploadedByFK": 3,
  "metadataJSON": "{\"duration\":\"1h 20m\",\"topic\":\"History of Computing\"}"
}
```

**Security hardening:** `uploadedByFK` in the DTO is ignored — server uses JWT `UserID` to prevent attribution forgery (hardening C-13).

Returns `ContentID: 200`, `version = 1`, `status = Active`.

---

#### 10.3 Upload a new version of the content

When Prof. Mehra revises the video:

```http
PUT /api/content/200/version
Authorization: Bearer <Prof. Mehra's token>

{
  "uri": "https://cdn.edulearn.edu/videos/cs101_week1_v2.mp4",
  "metadataJSON": "{\"duration\":\"1h 35m\",\"topic\":\"History of Computing - Updated\"}"
}
```

Version auto-increments to 2. Old URI preserved in metadata. Only `Active` content can be versioned.

**User story:** *"As an instructor, I upload learning materials for my students and version them when I revise."*
**PRD mapping:** LMS-01

📌 *Known gap:* students are not notified when new content is uploaded. Post-interim fix.

---

#### 10.4 Ananya accesses course content

```http
GET /api/content/course/1
Authorization: Bearer <Ananya's token>
```

Returns all `Active` content for CS101: list of videos, documents, links with URIs.

```http
GET /api/content/200
```

Gets the specific content item and its URI — Ananya can now stream the video.

**User story:** *"As a student, I access the learning materials for courses I'm enrolled in."*
**PRD mapping:** LMS-01

---

## 11. Phase 10 — Assessment & Grading

### 👤 Prof. Mehra creates an assessment

#### 11.1 Create in Draft state

```http
POST /api/assessments
Authorization: Bearer <Prof. Mehra's token>

{
  "courseID": 1,
  "sectionID": 5,
  "title": "Assignment 1 — Algorithm Basics",
  "type": "Assignment",
  "dueAt": "2026-05-10T23:59:00Z",
  "maxScore": 100.0,
  "gradingRubricJSON": "{\"criteria\":[{\"name\":\"Correctness\",\"points\":60},{\"name\":\"Clarity\",\"points\":40}]}",
  "createdByFK": 3
}
```

**Security hardening:** `createdByFK` is ignored — server uses JWT `UserID` (hardening H-3).

Returns `AssessmentID: 300`, `status = Draft`. Students cannot see it yet.

---

#### 11.2 Edit while in Draft

```http
PUT /api/assessments/300
Authorization: Bearer <Prof. Mehra's token>

{
  "sectionID": 5,
  "title": "Assignment 1 — Algorithm Basics (v2)",
  "type": "Assignment",
  "dueAt": "2026-05-12T23:59:00Z",
  "maxScore": 100.0,
  "gradingRubricJSON": "..."
}
```

**Business rule:** Only `Draft` assessments can be edited.

---

#### 11.3 Publish it

```http
PUT /api/assessments/300/publish
Authorization: Bearer <Prof. Mehra's token>

{ "status": "Published" }
```

**Status transitions allowed (one-way only):**
```
Draft → Published → Closed → Archived
```

No reverse transitions.

📌 *Known gap:* students are not notified of newly published assessments. Post-interim fix.

**User story:** *"As an instructor, I create assessments in draft, edit them, then publish — once published, students can submit."*
**PRD mapping:** AGI-01

---

#### 11.4 Ananya sees the assessment

```http
GET /api/assessments/course/1
Authorization: Bearer <Ananya's token>
```

Returns all published assessments for CS101. Ananya sees Assignment 1, due 2026-05-12.

---

#### 11.5 Ananya submits her work

```http
POST /api/submissions
Authorization: Bearer <Ananya's token>

{
  "assessmentID": 300,
  "studentID": 12,
  "fileURI": "https://uploads.edulearn.edu/submissions/ananya_cs101_a1.pdf"
}
```

**Validations:**
- Assessment must be `Published` (Draft/Closed/Archived rejected)
- No duplicate submission — one submission per (StudentID, AssessmentID)
- If submitted after `dueAt`, status = `Late`; otherwise `Submitted`

Returns `SubmissionID: 7000`, `status = Submitted`.

📌 *Known gap:* Prof. Mehra is not notified of the new submission. He must manually check the gradebook.

**User story:** *"As a student, I submit my assignment. The system records it with a timestamp and marks it late if I miss the deadline."*
**PRD mapping:** AGI-02

---

#### 11.6 Prof. Mehra reviews submissions

```http
GET /api/submissions/assessment/300
Authorization: Bearer <Prof. Mehra's token>
```

Returns all submissions: StudentName, SubmittedAt, FileURI, Score, Status.

---

#### 11.7 Prof. Mehra grades Ananya's submission

```http
POST /api/submissions/7000/grade
Authorization: Bearer <Prof. Mehra's token>

{
  "score": 87.5,
  "graderID": 3,
  "reason": "Excellent analysis in Q1, minor errors in Q3"
}
```

**Security hardening:** `graderID` field in DTO is ignored — server uses JWT `UserID` (hardening C-5).

📌 *Known minor DTO bug:* the DTO has `[Required]` on `GraderID` even though the server ignores it. Clients must pass *something* but the value is discarded. Cosmetic issue, fixed post-interim.

**What happens internally:**
1. Validates `score ≤ assessment.maxScore` (87.5 ≤ 100 ✓)
2. Sets `submission.score`, `submission.graderID = JWT UserID`, `submission.gradedAt`, `status = Graded`
3. If `score.HasValue` was already true (re-grade): auto-creates a `GradeChange` audit record with OldScore, NewScore, ChangedByFK, Reason, Timestamp
4. **Notifies** Ananya: "Your submission for Assignment 1 has been graded: 87.5/100"

---

#### 11.8 Ananya sees her grade

```http
GET /api/submissions/student/12
Authorization: Bearer <Ananya's token>
```

Returns all her submissions with scores and grader names.

She also sees the notification that appeared in her bell:

```http
GET /api/notifications?unreadOnly=true
GET /api/notifications/unread-count
PUT /api/notifications/{id}/read
```

**User story:** *"As a student, I see my grades and receive a notification when each assessment is graded."*
**PRD mapping:** AGI-02 | NHT-01

---

#### 11.9 Prof. Mehra closes the assessment

Once the grading window is over:

```http
PUT /api/assessments/300/publish

{ "status": "Closed" }
```

No more submissions accepted. Later, when the term ends:

```http
PUT /api/assessments/300/publish

{ "status": "Archived" }
```

Final state. No further changes.

**User story:** *"As an instructor, I close assessments after the grading window and archive them at term end."*
**PRD mapping:** AGI-01

---

## 12. Phase 11 — Support Throughout the Term

### 👤 Ananya encounters a problem

#### 12.1 She submits a ticket

```http
POST /api/tickets
Authorization: Bearer <Ananya's token>

{
  "subject": "Cannot access CS101 Week 3 video",
  "description": "Clicking the Week 3 video link returns a 404 error. Tried on Chrome, Firefox, and Edge. Please help.",
  "priority": "High"
}
```

Returns `TicketID: 800`, `status = Open`, `assignedTo = null`.

---

#### 12.2 Arjun (ITAdmin) sees the ticket

```http
GET /api/tickets
Authorization: Bearer <Arjun's token>
```

ITAdmin sees ALL tickets (others see only their own). He picks Ananya's ticket.

```http
GET /api/tickets/800
```

Accessible to creator, assignee, or ITAdmin.

---

#### 12.3 Arjun assigns the ticket

```http
PUT /api/tickets/800/assign
Authorization: Bearer <Arjun's token>

{ "assignedToUserId": 2 }
```

**Business rule:** In the interim scope, the assignee must have `Role = ITAdmin`. (Post-interim: a dedicated `SupportStaff` role is planned.)

**What happens:**
1. Ticket `status = InProgress`
2. Assignee is notified: "Ticket #800 has been assigned to you: Cannot access CS101 Week 3 video"

---

#### 12.4 The assignee resolves the ticket

```http
PUT /api/tickets/800/resolve
Authorization: Bearer <Arjun's token>

{
  "resolutionURI": "https://kb.edulearn.edu/articles/video-404-fix",
  "resolutionNote": "CDN cache was stale. Flushed and verified. Confirmed with user."
}
```

**What happens:**
1. Ticket `status = Resolved`
2. Ananya receives notification: "Your support ticket #800 has been resolved"

📌 *Known minor gap:* `resolutionNote` is written to the audit log but not persisted on the Ticket row. Post-interim fix adds the column.

**User story:** *"As any user, I can submit tickets. As ITAdmin, I assign and resolve them, and users are notified at each stage."*
**PRD mapping:** NHT-03

---

## 13. Phase 12 — Audit & Compliance

### 👤 Vivek (Auditor) — "Let me review this term's activity."

#### 13.1 Query the audit log

```http
GET /api/audit-log?from=2026-01-01&to=2026-04-30&action=LoginSuccess
Authorization: Bearer <Vivek's token>
```

**Filters** (all optional, AND-composed):
- `userId` — filter by actor
- `action` — filter by action type
- `resourceType` — filter by entity type
- `resourceId` — filter by specific entity
- `from`, `to` — date range
- `limit` — clamped to [1, 1000], default 100 (hardening U-2)

Returns matching log entries, newest first.

**Audit events currently logged:**

Auth & user management (pre-existing):
- `UserRegistered` (public registration)
- `LoginSuccess` (successful login)
- `LoginFailed` (failed login on existing user)
- `UserCreatedByAdmin` (ITAdmin creates staff)
- `TicketCreated`, `TicketAssigned`, `TicketResolved`

Academic & financial actions (added 2026-04-21 interim-polish):
- `EnrollmentCreated` — every enrollment, with studentId/sectionId/status
- `EnrollmentDropped` — every drop, with `promotedEnrollId` so auditors can trace waitlist promotion chains
- `InvoiceGenerated` — every invoice, with term/amountDue
- `PaymentRecorded` — every payment, with amount/method/resulting invoice status
- `SubmissionGraded` — every grade posted, with score/maxScore/assessmentId

📌 *Remaining compliance gap:* applicant status changes, user profile updates, user status changes, and submission creation are not yet audit-logged. These are high-volume or lower-compliance-value and are deferred to post-interim.

**User story:** *"As Auditor, I query the audit log with composable filters to review security, academic, and financial compliance events across all IAM-04, ETS, SFB, and AGI activity."*
**PRD mapping:** IAM-04

---

#### 13.2 View KPIs

```http
GET /api/kpis
Authorization: Bearer <Vivek's token>
```

Returns the 4 KPIs with their current values.

To refresh:

```http
POST /api/kpis/recalculate
Authorization: Bearer <Arjun (ITAdmin)'s token>
```

Note: recalculation is ITAdmin-only. Vivek requests it from Arjun. The recalc overwrites `CurrentValue` — no history retained (post-interim enhancement).

**User story:** *"As Auditor, I monitor institutional KPIs for active students, section fill rate, assessment publishing rate, and enrollment waitlist rate."*
**PRD mapping:** RKA-02

---

#### 13.3 Generate a report

```http
POST /api/reports/generate
Authorization: Bearer <Vivek's token>

{
  "generatedByFK": 7,
  "scope": "Institution",
  "parametersJSON": "{\"term\":\"2026-Spring\"}"
}
```

**Security hardening:** `generatedByFK` in DTO is ignored — server uses JWT `UserID` (hardening H-3).

Returns ReportID with `metricsJSON` populated.

```http
GET /api/reports
GET /api/reports/{id}/download
```

📌 *Known limitation:* `reportURI` is always null in interim scope. PDF generation (via QuestPDF) is explicitly marked post-interim — there are `// TODO` comments in the controller confirming this.

**User story:** *"As Auditor or ITAdmin, I generate reports scoped to Course/Department/Institution/Student."*
**PRD mapping:** RKA-01

---

#### 13.4 Generate an audit package

```http
POST /api/audit-packages/generate
Authorization: Bearer <Vivek's token>

{ "periodStart": "2026-01-01", "periodEnd": "2026-03-31" }
```

Returns PackageID with `contentsJSON` aggregating compliance-relevant data for the period.

```http
GET /api/audit-packages/{id}/download
```

📌 *Same limitation:* `packageURI` is null — ZIP generation is post-interim.

**User story:** *"As Auditor, I generate period-based compliance packages aggregating enrollment, finance, and grade activity."*
**PRD mapping:** RKA-03

---

## 14. User Story Index by Role

### 🛠️ ITAdmin (Arjun)
1. Log in with seeded admin account → IAM-01
2. Create privileged user accounts for all staff → IAM-02
3. Update user profiles and statuses → IAM-02
4. View all users and all tickets
5. Assign tickets to staff → NHT-03
6. Resolve tickets → NHT-03
7. Seed and recalculate KPIs → RKA-02
8. Access all endpoints (full admin override)

### 📋 Registrar (Ritu)
1. Submit applicant information → SRA-01
2. Review applications and update status → SRA-01
3. Create student profiles (after User created by ITAdmin) → SRA-02
4. Update student records (name, gender, contact, graduation term) → SRA-02
5. Create course sections → ETS-02
6. Enroll/drop any student in any section → ETS-01
7. View all students and their records
8. View rosters for any section

### 🎓 DeptAdmin (Dr. Khanna)
1. Create degree programs → CCM-01
2. Update programs → CCM-01
3. Create and update courses → CCM-01
4. Create rooms → ETS-02
5. Create sections (same as Registrar) → ETS-02
6. View section rosters → ETS-01

### 👨‍🏫 Instructor (Prof. Mehra)
1. View assigned sections and rosters → ETS-01
2. Upload course content → LMS-01
3. Version course content → LMS-01
4. Create assessments in Draft → AGI-01
5. Edit Draft assessments → AGI-01
6. Publish assessments → AGI-01
7. Review student submissions → AGI-02
8. Grade submissions (with automatic GradeChange audit on regrade) → AGI-02
9. Close and archive assessments → AGI-01
10. Create and update courses (shared with DeptAdmin via CourseManagerPolicy) → CCM-01
11. View student list and details

### 💰 Finance (Seema)
1. Create and update fee schedules per program-term → SFB-01
2. Activate and supersede fee schedules → SFB-01
3. Generate invoices (manual, per student) → SFB-02
4. Record payments, updating invoice status automatically → SFB-03
5. Award scholarships → SFB-04
6. Update/revoke scholarships → SFB-04
7. View any student's invoices and scholarships

### 📊 Auditor (Vivek)
1. Query audit log with composable filters → IAM-04
2. View KPIs → RKA-02
3. Generate reports scoped to Course/Department/Institution/Student → RKA-01
4. Generate period-based audit packages → RKA-03
5. Download reports and packages (URIs null in interim)

### ✉️ Applicant (Rahul) — No Login
1. Provide admission application details (submitted by Registrar on his behalf) → SRA-01
2. Application reviewed by Registrar
3. On acceptance, becomes a User+Student via ITAdmin + Registrar coordination → SRA-02
4. Receives credentials externally (email/paper) to begin Student journey

### 🧑‍🎓 Student (Ananya)
1. Log in with issued credentials → IAM-01
2. View own profile and student record → IAM-02, SRA-02
3. Browse programs, courses, sections → CCM-01, ETS-02
4. Enroll in sections (with automatic waitlist if full) → ETS-01
5. Drop sections (with automatic waitlist promotion for others) → ETS-01
6. View own enrollments → ETS-01
7. Access course content → LMS-01
8. View published assessments → AGI-01
9. Submit work (marked Late if past due) → AGI-02
10. View own submissions and grades → AGI-02
11. View own invoices → SFB-02
12. View own payment history → SFB-03
13. Receive notifications (enrollment, drop, grade, invoice, ticket updates) → NHT-01
14. Mark notifications as read → NHT-01
15. Submit support tickets → NHT-03
16. View own tickets → NHT-03

---

## 15. PRD Compliance Map

| PRD Module | Feature | Status | Implemented By |
|-----------|---------|--------|----------------|
| **IAM-01** | Login + JWT | ✅ Complete | AuthController, TokenService |
| **IAM-02** | User profile management | ✅ Complete | UsersController |
| **IAM-03** | MFA/TOTP | ⏳ Post-interim | — |
| **IAM-04** | Audit log query | ✅ Complete (partial write coverage) | AuditLogController |
| **SRA-01** | Applicant management | ✅ Complete | ApplicantsController |
| **SRA-02** | Student record management | ✅ Complete | StudentsController |
| **SRA-03** | Transcripts | ⏳ Post-interim | Model only, no controller |
| **ETS-01** | Enrollment with waitlist | ✅ Complete | EnrollmentsController |
| **ETS-02** | Sections and rooms | ✅ Complete | SectionsController, RoomsController |
| **ETS-03** | Timetable conflict detection | ⏳ Post-interim | — |
| **CCM-01** | Courses and programs | ✅ Complete | CoursesController, ProgramsController |
| **CCM-02** | Syllabus versioning | ⏳ Post-interim | Model only |
| **CCM-03** | Prerequisite enforcement | ⏳ Post-interim | Field exists, not enforced |
| **LMS-01** | Content upload and versioning | ✅ Complete | ContentsController |
| **LMS-02** | Discussions | ⏳ Post-interim | Model only |
| **AGI-01** | Assessment lifecycle | ✅ Complete | AssessmentsController |
| **AGI-02** | Submission and grading | ✅ Complete | SubmissionsController |
| **AGI-03** | Grade change audit | ✅ Partial (automatic on regrade, no endpoint) | Built into grade flow |
| **AGI-04** | Plagiarism detection | ⏳ Post-interim | Field exists, not computed |
| **SFB-01** | Fee schedules | ✅ Complete | FeesController |
| **SFB-02** | Invoice generation | ✅ Complete | InvoicesController |
| **SFB-03** | Payment recording | ✅ Complete | PaymentsController |
| **SFB-04** | Scholarships | ✅ Complete | ScholarshipsController |
| **RKA-01** | Report generation | ✅ Complete (PDF post-interim) | ReportsController |
| **RKA-02** | KPI tracking | ✅ Complete | KPIsController |
| **RKA-03** | Audit packages | ✅ Complete (ZIP post-interim) | AuditPackagesController |
| **NHT-01** | Notifications | ✅ Complete (REST-only per mentor decision) | NotificationsController |
| **NHT-02** | Real-time push | ❌ Removed (out of syllabus per mentor) | — |
| **NHT-03** | Helpdesk tickets | ✅ Complete | TicketsController |

**Compliance Summary:** All interim-scope features from the PRD are implemented and functional. Every feature marked ⏳ is explicitly deferred to post-interim in the PRD or TODO comments in the code.

---

## Appendix — Complete State Machines

### Applicant Status
```
Submitted → UnderReview → Accepted
                        → Rejected
                        → Waitlisted
```

### Student Lifecycle Status
```
Active → Graduated / Withdrawn / Suspended
```

### Section Status
```
Open ↔ Closed / Cancelled
```

### Enrollment Status
```
Enrolled ↔ Dropped
Waitlisted → Enrolled (automatic promotion)
```

### Assessment Status
```
Draft → Published → Closed → Archived
(one-way only — no reverse transitions)
```

### Submission Status
```
Submitted → Graded → Returned
Late → Graded
Submitted/Late → Plagiarised
```

### Fee Schedule Status
```
Draft → Active → Superseded (terminal)
```

### Invoice Status
```
Pending → PartiallyPaid → Paid
        → Overdue (not auto-set in interim)
        → Cancelled (no endpoint in interim)
```

### Payment Status
```
Completed (hardcoded in interim)
Pending/Failed/Refunded post-interim
```

### Scholarship Status
```
Active ↔ Suspended
Active/Suspended → Revoked (terminal)
Active/Suspended → Expired (terminal, time-based)
```

### Ticket Status
```
Open → InProgress → Resolved → Closed
```

### User Status
```
Active ↔ Inactive / Suspended / Locked
(currently: status not checked at login — post-interim fix)
```

---

**End of Document.**
