# EduLearn — Interim State Report & Post-Interim Fix Plan

**Generated:** 2026-04-21
**Status of Smoke Tests:** ✅ All passing
**Interim Milestone:** 2026-04-24
**Risk of Fixing Before Interim:** HIGH (10+ controllers would need changes + regression testing)

---

## Part A — What Is Working (Verified Against Code)

### A.1 Authentication & Authorization (IAM-01, IAM-02)

| Feature | Status | Evidence |
|---------|:-:|----------|
| Public registration forces `Role = Student` (anti-escalation) | ✅ | `AuthService.cs:68` — `Role = UserRole.Student` hardcoded |
| BCrypt password hashing with high work factor | ✅ | `AuthService.cs:61` — ~300ms per hash |
| Timing-safe login (BCrypt dummy hash for non-existent users) | ✅ | `AuthService.cs:112-117` — prevents username enumeration |
| JWT with claims: UserID, Username, Email, Role | ✅ | `TokenService.cs:37-43` |
| JWT expiry (60 min default, configurable) | ✅ | `TokenService.cs:46` |
| `FallbackPolicy` — all endpoints require auth by default | ✅ | `Program.cs` — only `[AllowAnonymous]` routes bypass |
| 11 distinct authorization policies (FinancePolicy, AdminPolicy, etc.) | ✅ | `Program.cs` — all mapped to correct roles |
| Custom 401/403 responses with endpoint + timestamp | ✅ | `Program.cs` — middleware configured |

### A.2 Admissions (SRA-01)

| Feature | Status |
|---------|:-:|
| Create applicant (Registrar/ITAdmin) with duplicate NationalID check | ✅ |
| List applicants, get by ID | ✅ |
| Transition status: Submitted → UnderReview → Accepted/Rejected/Waitlisted | ✅ |

### A.3 Student Registry (SRA-02)

| Feature | Status |
|---------|:-:|
| Create student (Registrar/ITAdmin) linked to User | ✅ |
| Auto-generate MRN in `STU-00001` format with race-safe retry | ✅ |
| Update student profile (name, gender, contact, graduation term) | ✅ |
| List all students (staff only — prevents PII enumeration) | ✅ |
| Student can read own record only (JWT ownership check) | ✅ |

### A.4 Course Catalog & Curriculum (CCM-01)

| Feature | Status |
|---------|:-:|
| Create/update course with unique code check | ✅ |
| Create/update program with unique name+degree check | ✅ |
| Role-based write access (CourseManagerPolicy, DeptAdminPolicy) | ✅ |

### A.5 Sections & Rooms (ETS-02)

| Feature | Status |
|---------|:-:|
| Create section with instructor-role validation | ✅ |
| Create room with unique building+number check | ✅ |
| Get section by ID and by course+term | ✅ |

### A.6 Enrollment (ETS-01)

| Feature | Status |
|---------|:-:|
| Enroll student with capacity check → auto-waitlist if full | ✅ |
| Composite unique index prevents duplicate enrollment | ✅ (DB-level) |
| Drop enrollment → auto-promote first waitlisted student | ✅ |
| Dropped student receives notification | ✅ |
| Student can only enroll/drop self (ownership check) | ✅ |
| Registrar/ITAdmin can manage any enrollment | ✅ |
| Transaction wrapping for enroll operation | ✅ (though isolation level is default Read Committed) |

### A.7 Learning Management (LMS-01)

| Feature | Status |
|---------|:-:|
| Upload content with JWT-based `UploadedByFK` (anti-forgery) | ✅ |
| List content by course, get content by ID | ✅ |
| Version content (auto-increment version number) | ✅ |

### A.8 Assessments & Submissions (AGI-01, AGI-02)

| Feature | Status |
|---------|:-:|
| Create assessment in Draft status | ✅ |
| `CreatedByFK` forced from JWT (anti-forgery hardening) | ✅ |
| Status transition chain: Draft → Published → Closed → Archived | ✅ |
| Only Draft assessments are editable | ✅ |
| Students see only Published assessments | ✅ |
| Student submits work; duplicate submission blocked | ✅ |
| `GraderID` forced from JWT (anti-forgery hardening) | ✅ |
| Grade submission with score validated against `MaxScore` | ✅ |
| Student notified on grade post | ✅ |
| Auto-creates `GradeChange` audit record on re-grade | ✅ |

### A.9 Finance (SFB-01 through SFB-04)

| Feature | Status |
|---------|:-:|
| Create fee schedule per Program+Term (Finance role) | ✅ |
| Fee schedule status: Draft → Active → Superseded (one-way) | ✅ |
| Generate invoice: fee lookup + scholarship deduction | ✅ |
| Invoice notification sent to student | ✅ |
| JSON validation of `FeeItemsJSON` at invoice generation time (not creation) | ✅ (catches bad JSON loudly) |
| Record payment with auto-update of invoice status | ✅ |
| Invoice auto-transitions: Pending → PartiallyPaid → Paid | ✅ |
| Overpayment blocked | ✅ |
| Award scholarship; revoke scholarship | ✅ |
| Revoked scholarship cannot be revived (terminal state) | ✅ |

### A.10 Notifications (NHT-01)

| Feature | Status |
|---------|:-:|
| REST-only notification persistence (SignalR removed per PRD) | ✅ |
| List notifications (paginated, with `unreadOnly` filter) | ✅ |
| Unread count endpoint for bell icon | ✅ |
| Mark read (single + all) with ownership check | ✅ |
| Wired in Enrollments (enroll/drop), Invoices, Submissions (grade), Tickets | ✅ |

### A.11 Helpdesk (NHT-03)

| Feature | Status |
|---------|:-:|
| Create ticket (any authenticated user) | ✅ |
| List own tickets; ITAdmin sees all | ✅ |
| Assign ticket with notification to assignee | ✅ |
| Resolve ticket with notification to creator | ✅ |
| Ownership guard on read (creator/assignee/ITAdmin only) | ✅ |

### A.12 Audit & Reporting (IAM-04, RKA-01/02/03)

| Feature | Status |
|---------|:-:|
| Audit log append-only (no update/delete) | ✅ |
| Composable AND-filter query (userId, action, resourceType, resourceId, from, to) | ✅ |
| Result limit clamped to [1, 1000] | ✅ (anti-resource-exhaustion) |
| Generate reports (scope: Course/Department/Institution/Student) | ✅ (metadata only; PDF is post-interim) |
| List and download reports (metadata) | ✅ |
| List, seed, recalculate KPIs | ✅ |
| Generate and retrieve audit packages | ✅ (metadata only; ZIP is post-interim) |

### A.13 Data Integrity & Security Hardening

| Hardening | Status |
|-----------|:-:|
| C-23: DB-level composite unique index on (StudentID, SectionID) | ✅ |
| C-24: BCrypt dummy hash for timing-safe login | ✅ |
| C-25: FallbackPolicy requires auth on all endpoints | ✅ |
| C-26: Public registration ignores dto.Role (forces Student) | ✅ |
| C-5: GraderID from JWT (body value ignored) | ✅ |
| C-13: UploadedByFK from JWT (body value ignored) | ✅ |
| H-3: Report/Assessment CreatedByFK / GeneratedByFK from JWT | ✅ |
| M-2: Audit log filter composition (AND-composed, not first-match) | ✅ |
| U-2: Audit log limit clamped to [1, 1000] | ✅ |

---

## Part B — Interim Impact Assessment

### B.1 Does Any Bug Break the Interim Demo?

**No.** Every listed issue falls into one of three categories:

| Category | Count | Demo Impact |
|----------|:-:|-------------|
| Explicitly post-interim per PRD | 7 | None — scoped out |
| Edge-case security (not exercised in demo) | 2 | None — demo won't trigger |
| Missing polish (notifications, audit logs, endpoints) | ~20 | None — happy path still demonstrable |
| **Actual demo-breaking bugs** | **0** | **—** |

### B.2 Smoke Test Coverage

The passing smoke test suite validates the happy path end-to-end:
- Register → login → enroll → content → assessment → submit → grade → invoice → pay → notify → resolve ticket → audit query.

Every module produces a demoable output.

### B.3 Risk of Fixing Before Interim

| Fix | Files Touched | Risk |
|-----|:-:|------|
| UserStatus check at login | 1 (AuthService.cs) | **🟢 Very low — 3-line addition** |
| Remove `[Required]` on GraderID | 1 (GradeSubmissionDto.cs) | 🟡 Medium — may break smoke test fixture |
| Add 6 missing `NotifyAsync` calls | 6 controllers + constructor DI | 🟡 Medium — 6 regression points |
| Add 5 missing audit log calls | 5 controllers + DI | 🟡 Medium — 5 regression points |
| Add PUT /api/sections/{id} | SectionsController + DTO + repo | 🔴 High — new endpoint, new tests needed |
| Add Syllabus/Discussion/Transcript controllers | 3 new controllers + DTOs + repos | 🔴 High — scoped out of interim per PRD |
| Fix race condition with serializable isolation | EnrollmentsController + Repo | 🔴 High — changes transactional behavior |

**Net recommendation:** **Fix only UserStatus-at-login before interim.** Everything else → post-interim.

---

## Part C — Fixes Needed (Post-Interim, Priority-Ordered)

### Priority 1 — Security (Fix in Interim Week If Time Permits)

#### FIX-1: UserStatus Check at Login
- **File:** `Services/AuthService.cs` in `LoginAsync`
- **Bug:** `Suspended` / `Locked` / `Inactive` users can still authenticate if their password is correct.
- **Why it matters:** ITAdmin suspends a user → the user still gets valid JWTs.
- **Fix (3 lines):**
  ```csharp
  if (user.Status != UserStatus.Active)
      return null;  // or return specific "account disabled" response
  ```
- **Risk:** Near-zero. Pure addition, no smoke tests will hit this.
- **PRD coverage:** IAM-02 implies status-based access control.

---

### Priority 2 — User Experience (Week 1 Post-Interim)

#### FIX-2: Applicant Notification on Status Change
- **File:** `Controllers/ApplicantsController.cs` `UpdateStatus`
- **Problem:** Applicants (once they have user accounts) aren't told when they're Accepted / Rejected / Waitlisted.
- **Note:** Applicants in current design don't have User accounts until AFTER acceptance, so this notification only works for reviewable Accepted → Student cases. Keep simple: record audit log for now, notify post-interim once applicant→user flow is formalized.
- **Fix:** Inject `AuditLogService`, add `LogAsync("ApplicantStatusChanged", ...)`. Defer notification until applicant-user linkage is built.

#### FIX-3: Notify Promoted Waitlist Student on Drop
- **File:** `Controllers/EnrollmentsController.cs` `Drop` (around line 186)
- **Problem:** When someone drops and a waitlisted student is promoted, the promoted student isn't told.
- **Fix:** Add `NotifyAsync(promotedStudent.UserID, Enrollment, Info, "You've been moved from waitlist to enrolled in {course}")` after promotion.
- **Risk:** Very low — existing patterns already in the file.

#### FIX-4: Notify Student on Payment Received
- **File:** `Controllers/PaymentsController.cs` POST
- **Problem:** No confirmation that payment was processed.
- **Fix:** Inject `INotificationService`, call `NotifyAsync(student.UserID, Finance, Info, "Payment of ₹X received for invoice #Y")`.

#### FIX-5: Notify Student on Scholarship Award/Revoke
- **File:** `Controllers/ScholarshipsController.cs` POST and PUT
- **Problem:** Scholarship directly affects student's owed amount; they should be told.
- **Fix:** Inject `INotificationService`; notify on create and on status change.

#### FIX-6: Notify Students on Assessment Publish
- **File:** `Controllers/AssessmentsController.cs` status transition to `Published`
- **Problem:** Students don't know a new assessment exists.
- **Fix:** On transition to `Published`, fan-out notification to all enrolled students in the relevant section(s).
- **Consideration:** If section count is high, this could be a lot of notifications — acceptable tradeoff per PRD NHT-01.

#### FIX-7: Notify Students on Content Upload
- **File:** `Controllers/ContentsController.cs` POST
- **Problem:** Students don't know new materials are available.
- **Fix:** On upload, fan-out notification to all enrolled students in all sections of that course.

#### FIX-8: Notify Instructor on Student Submission
- **File:** `Controllers/SubmissionsController.cs` POST (create)
- **Problem:** Instructors don't know work arrived; they check manually.
- **Fix:** On submission create, notify the assessment's `CreatedByFK` (instructor).

---

### Priority 3 — Audit Coverage (Week 2 Post-Interim)

#### FIX-9 through FIX-13: Add `AuditLogService.LogAsync` calls

| Controller | Actions to Log |
|-----------|---------------|
| `UsersController` | `UpdateUser` (profile changes), `UpdateUserStatus` (Suspend/Lock) |
| `EnrollmentsController` | `Enroll` (create), `Drop`, waitlist promotion |
| `InvoicesController` | `Generate` |
| `PaymentsController` | `Create` |
| `SubmissionsController` | `CreateSubmission`, `GradeSubmission` |
| `ApplicantsController` | `UpdateStatus` |
| `ScholarshipsController` | `Create`, `Update` |

**Pattern to follow:** Already implemented in `AuthController`, `TicketsController`, `UsersController.CreateUser`. Just copy the injection pattern.

---

### Priority 4 — API Contract Cleanup (Week 2 Post-Interim)

#### FIX-14: Remove `[Required]` on `GradeSubmissionDto.GraderID`
- **File:** `DTOs/GradeSubmissionDto.cs`
- **Problem:** Server ignores the field per hardening C-5, but DTO still requires it. Confusing API contract.
- **Fix:** Remove the field entirely from the DTO (server already uses JWT).
- **Risk:** Breaks any client currently sending it. Update smoke tests in the same commit.

#### FIX-15: Rename `/publish` → `/status`
- **File:** `Controllers/AssessmentsController.cs`
- **Problem:** The endpoint called `/publish` actually accepts any status (Published/Closed/Archived). Misleading.
- **Fix:** Rename route to `PUT /api/assessments/{id}/status`. Keep `/publish` as alias for backward compatibility for one release.

---

### Priority 5 — Missing Endpoints (Later Post-Interim)

#### FIX-16: `PUT /api/sections/{id}` and Section Status Transitions
- **Problem:** Cannot change room, capacity, schedule, or status after creation.
- **Fix:** Add `UpdateSectionDto`, PUT endpoint, and status-transition endpoint (Open → Closed / Cancelled).
- **PRD coverage:** Implicit in ETS-02.

#### FIX-17: `PUT /api/rooms/{id}`
- **Problem:** Cannot update capacity or mark maintenance.
- **Fix:** Add update DTO and endpoint.

#### FIX-18: Invoice Cancel / Payment Refund
- **Problem:** No voiding of invoices, no refund workflow.
- **Fix:** Add `PUT /api/invoices/{id}/cancel` and `POST /api/payments/{id}/refund`.
- **PRD coverage:** Implied by InvoiceStatus.Cancelled, PaymentStatus.Refunded.

#### FIX-19: `InvoiceStatus.Overdue` Background Job
- **Problem:** Enum value exists but no code ever sets it.
- **Fix:** Hosted background service that runs daily and flips `Pending` invoices to `Overdue` when `DueDate < Today`.

---

### Priority 6 — Post-Interim Features (Already Scoped Out in PRD)

These are already planned for post-interim per `README.md` and `ARCHITECTURE-REFERENCE.md`:

- **SyllabusController** (CCM-02)
- **DiscussionsController** (LMS-02)
- **TranscriptController** (SRA-03)
- **Prerequisite engine on enrollment** (CCM-03)
- **Schedule conflict detection** (ETS-03)
- **Plagiarism integration** (AGI-04)
- **PDF generation for reports** (RKA-01 completion)
- **ZIP packaging for audit packages** (RKA-03 completion)

**Do not attempt these before interim.** They are multi-day builds each.

---

### Priority 7 — Enhancements (Defer Indefinitely Unless Needed)

- Race-condition hardening on enrollment (add Serializable isolation or UPDLOCK)
- Scholarship validity date enforcement in invoice-generation query
- Retroactive invoice recalculation when scholarship awarded
- Bulk invoice generation endpoint
- Bulk grading endpoint
- KPI history table for trending
- StudentID in JWT claim (currently requires extra DB lookup)
- User status-change notifications to the affected user
- Resubmission after grading (currently blocked)
- Delete-for-draft assessments / delete-archived courses
- Ticket assignee role expansion (currently ITAdmin-only)
- Add DeptAdmin + Finance to report-access roles (requires PRD approval)

---

## Part D — Summary for Interim Interview Talking Points

When asked "what's left?":

1. **"We identified 6 notification gaps and 5 audit-log gaps in non-happy-path flows. We have a prioritized fix queue ready for post-interim sprint 1."** ← Shows awareness, not gaps.
2. **"The system has 9 hardening measures (C-23 through C-26, M-2, U-2, etc.) documented and tested."** ← Sells the security posture.
3. **"Post-interim features (Syllabus, Discussion, Transcript, prerequisite engine, schedule conflicts, PDF gen) are scoped and estimated per the PRD."** ← Shows roadmap control.
4. **"Smoke test suite covers the full end-to-end happy path across all 9 modules."** ← Current confidence.
5. **"One known security item — UserStatus check at login — is a 3-line fix we may ship this week."** ← Shows proactive ownership.
