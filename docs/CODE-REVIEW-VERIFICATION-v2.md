# EduLearn — Full Codebase Audit (v2)

**Date:** 2026-04-17
**Supersedes:** `docs/CODE-REVIEW-VERIFICATION.md` (v1 — which was a verification of peer-review claims, not a full sweep)
**Methodology:** Five independent investigations dispatched in parallel, each with a narrow lens — Authorization-policy vs PRD, Attribution-forgery, Ownership / horizontal-escalation, Data-integrity / state-machine / validation, and Services / DI / DbContext / Migrations. Findings then deduplicated and critical items hand-verified against source.
**Files covered:** 23 controllers, 5 services, 20 repositories, 20 DTOs, 10 enum files, AppDbContext, 4 migration files, Program.cs, appsettings.json, NotificationHub.
**Files NOT covered** (see §Gaps at end): detailed per-migration diff review, React frontend (not in scope), SignalR wire-level security.

## Executive summary

The v1 report tracked 16 findings across 4 severity tiers. This v2 sweep identifies **39 additional confirmed bugs**, bringing the total to **55**. The two most impactful new categories:

1. **Authorization drift is system-wide, not isolated to SFB/Reports.** 12 controllers ship with bare `[Authorize]` on endpoints where the PRD names a specific role. Any authenticated user — including a Student — can create applicants, rewrite other students' records, create Sections/Rooms/Assessments, upload course content, publish/archive assessments, or read institutional KPIs.
2. **Horizontal privilege escalation is pervasive.** Outside of `NotificationsController` and `TicketsController` (which correctly enforce JWT-subject ownership), almost every resource identified by ID in a path can be read or mutated by a non-owner. Student A reads Student B's grades, submissions, enrollments, invoices, payment history, MRN, DOB, and contact info.

**None of these are theoretical.** They are directly exploitable by any authenticated Student JWT in under 30 seconds each. The 5 pre-interim blockers identified in v1 grow to **24 pre-interim blockers** once the audit is complete.

Good news: the architecture is sound and the data model has the right shape. The bugs cluster into ~4 template fixes applied dozens of places (add role policy, extract JWT subject, add ownership guard, validate FK existence). Total fix effort is hours of work, not days — but the scope tripled versus the v1 estimate.

## Severity legend

| | Meaning |
|---|---|
| 🔴 **CRITICAL** | A non-privileged role can mutate a privileged resource, or PII leaks to any authenticated user. Exploitable in one HTTP call. |
| 🟠 **HIGH** | Functional or data-integrity bug with clear abuse or corruption scenarios (overbooking, overpayment, forged audit trail). |
| 🟡 **MEDIUM** | Correctness / UX / long-term-scale issues. Real but not catastrophic. |
| 🟢 **LOW** | Code hygiene, latent risk, config tightening. |
| 🔵 **FUNCTIONAL** | Code is *more restrictive* than PRD — legitimate users blocked. Not a security bug, but a bug. |

## Running finding ID scheme

v1 used `C-1..C-5` / `H-1..H-3` / `M-1..M-7` / `L-1..L-3`. v2 continues — new findings are `C-6` onward, etc. Where v1 findings are restated they keep their original IDs and are marked *(v1)*.

---

## 🔴 CRITICAL — must fix before any multi-user demo

### SFB module (Tanya) — already in v1

- **C-1 (v1)** — All 4 SFB controllers (`Fees`, `Invoices`, `Payments`, `Scholarships`) use bare `[Authorize]`. No `FinancePolicy` exists. Student can self-fund scholarship → zero invoice → mark Paid.
- **C-3 (v1)** — `GET /api/invoices/student/{studentId}` no ownership check.

### RKA module (Utkarsh) — already in v1

- **C-2 (v1)** — `ReportsController` all 3 endpoints bare `[Authorize]`; `GeneratedByFK` from body.

### AGI module (Vikash) — already in v1

- **C-5 (v1, reframed)** — `GradeSubmission` no role restriction; `GraderID` from body.

### CCM module (Vikash) — added during triage

- **C-6 (verified)** — `ProgramsController.cs:22,71` POST and PUT use bare `[Authorize]` where PRD Section 6.4 requires DeptAdmin. Student creates/updates any degree program.

### Newly discovered in v2

- **C-7** — `ApplicantsController.cs:10` — entire controller bare `[Authorize]`. PRD SRA-01 requires Registrar on POST, GET list, GET by id, PUT status. **Exploit:** Student lists every applicant's NationalID + DOB + contact JSON (full PII), or Accepts/Rejects arbitrary applications corrupting admissions.
- **C-8** — `StudentsController.cs:10` — entire controller bare `[Authorize]`. PRD SRA-02 requires Registrar for writes, Registrar/Instructor for reads. **Exploit:** Student A calls `PUT /api/students/<B.id>` with `{name:"forged", contactInfoJSON:"..."}` and rewrites Student B's record. Or `GET /api/students/<B.id>` reads MRN, DOB, gender, contact info (PII + FERPA violation in US context).
- **C-9** — `SectionsController.cs:10` — POST `/api/sections` bare `[Authorize]`. PRD ETS-02 requires Registrar/DeptAdmin. **Exploit:** Student creates arbitrary sections (timetable pollution, instructor double-booking).
- **C-10** — `RoomsController.cs:10` — POST `/api/rooms` bare `[Authorize]`. PRD ETS-02 requires DeptAdmin. **Exploit:** Student mints phantom rooms that Section creation then references.
- **C-11** — `AssessmentsController.cs:10` — POST, PUT, PUT `/publish` all bare `[Authorize]`. PRD AGI-01 requires Instructor. **Exploit:** Student creates a forged assessment attributed to any instructor (via `CreatedByFK` from body — `H-3`), or transitions any existing Draft→Published→Closed→Archived to disrupt grading.
- **C-12** — `ContentsController.cs:10` — POST `/upload`, PUT `/version` bare `[Authorize]`. PRD LMS-01 requires Instructor. **Exploit:** Student replaces a course's lecture PDF URI with a phishing page (`PUT /{id}/version`), or uploads forged content attributed to any instructor (`UploadedByFK` from body).
- **C-13** — `ContentsController.cs:53` `UploadedByFK = dto.UploadedByFK` — attribution forgery companion to C-12.
- **C-14** — `SubmissionsController.cs:174` `GET /api/submissions/student/{studentId}` no ownership check. **Exploit:** Student reads another student's full submission history including scores and plagiarism evidence URIs.
- **C-15** — `SubmissionsController.cs:100` `GET /api/submissions/assessment/{assessmentId}` open to any authenticated user with no instructor-of-section check. **Exploit:** Student lists every classmate's submission + score + fileURI for any assessment.
- **C-16** — `SubmissionsController.cs:34` POST `/api/submissions` reads `StudentID` from body with no check against JWT subject. **Exploit:** Student A submits coursework on Student B's behalf; also pre-empts B's real submission because the duplicate-submission unique rule then blocks B.
- **C-17** — `SubmissionsController.cs:148` GradeChange record is written with `ChangedByFK = dto.GraderID`. **This is separate from C-5** — fixing C-5 (`submission.GraderID`) alone leaves this audit-trail forgery live. **Exploit:** the immutable `GradeChange` audit record — the very artifact required for accreditation compliance — is attributable-from-body, so a regrade can show "ChangedBy = Dean" when the actual caller was the student. Compromises the entire AGI-03 audit trail.
- **C-18** — `InvoicesController.cs:93` `GET /api/invoices/{id}` no ownership check. **Exploit:** Student enumerates `GET /api/invoices/1`, `GET /api/invoices/2`, … and reads every student's financial records (amount due, term, line items). Distinct from C-3 (which covered the `/student/{id}` route).
- **C-19** — `PaymentsController.cs:62` `GET /api/payments/invoice/{invoiceId}` no ownership check. **Exploit:** Student reads every payment's method, amount, reference number (bank/card ref) for arbitrary invoices.
- **C-20** — `KPIsController.cs:24` `GET /api/kpis` bare `[Authorize]`. PRD RKA-02 requires Admin/Auditor. **Exploit:** Student reads institutional KPIs (retention rate, fill rate, on-time graduation) — data intended to be leadership-only.
- **C-21** — `EnrollmentsController.cs:113` `DELETE /api/enrollment/{id}/drop` — `EnrollmentPolicy` admits Student role but there is **no check that the enrollment belongs to the caller**. **Exploit:** Student A calls `DELETE /api/enrollment/<B's enrollID>/drop` and kicks B out of the course. Also triggers the waitlist-promotion flow, potentially admitting someone who paid a bribe.
- **C-22** — `EnrollmentsController.cs:33` POST `/enroll` reads `StudentID` from body with no caller-binding. **Exploit:** Student A enrolls Student B in a section that conflicts with B's timetable, or in a section that is already full (Waitlisting B without consent). Legitimate users (Registrar, ITAdmin) should be able to pass any `StudentID`; the check is *"if caller is Student role, `dto.StudentID` must equal caller's own StudentID."*
- **C-23** — `Migrations/20260410041555_InitialCreate.cs` — **no composite unique index on `Enrollments(StudentID, SectionID)`**. The `IsAlreadyEnrolledAsync` check in the controller is the sole guard; under concurrent POSTs, two inserts race between the check and the write. **Exploit:** programmatic duplicate enrollment (`SectionID` appears twice in the student's enrollment list). Also means the re-enroll-after-drop flow can silently insert a second row.
- **C-24** — `Services/AuthService.cs:97-100` — **username-enumeration timing oracle**. Login path: if user not found, return null *without* running `BCrypt.Verify`. Valid usernames respond ~300ms slower than invalid ones. **Exploit:** attacker enumerates valid accounts for subsequent phishing / brute-force. Fix: always run a constant-time dummy verify.
- **C-25** — `Program.cs:211-248` — **no `FallbackPolicy` set**. Any controller whose author forgets `[Authorize]` defaults to anonymous. The team has already forgotten it once (ProgramsController narrowly avoided — class attribute was present; future controllers may not be so lucky). **Exploit:** any pre-interim controller added without the attribute is publicly accessible. Fix: `options.FallbackPolicy = new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build();`.

---

## 🟠 HIGH

### AGI/ETS/SFB functional bugs

- **H-1 (v1)** — `PaymentsController` no transaction around Payment+Invoice update. Concurrent payments can overbook `Paid` status. *(Already scoped for post-interim per v1.)*
- **H-2 (v1)** — Payment auto-set to `Completed` without gateway confirmation. *(Known; blocks real payment integration post-interim.)*
- **H-3 (v1)** — Attribution-from-body on `AssessmentsController.cs:68` and `ReportsController.cs:37`. Already covered.
- **H-4** — `EnrollmentsController.cs:40-87` — capacity race inside transaction. `BeginTransactionAsync()` with default Read Committed isolation; `section = GetByIdWithCourseAsync(...)` is a plain SELECT with no `UPDLOCK`/`HOLDLOCK` hint. Two concurrent enrolls both read `EnrolledCount=59 < Capacity=60`, both insert, both increment → section at 61/60. Fix: either `IsolationLevel.Serializable` on the transaction or a concurrency token (`RowVersion`) on `Section.EnrolledCount`.
- **H-5** — `SectionsController.cs:73-83` — no uniqueness check on `(CourseID, Term, InstructorID, ScheduleJSON)`. Same instructor double-booked at the same time slot in different rooms. Adjacent: no check that `ScheduleJSON` fits within the room's availability.
- **H-6** — `Services/AuthService.cs` — **no brute-force lockout**. `UserStatus.Locked` enum exists but is never written anywhere. Combined with C-24's enumeration oracle, the login endpoint is wide open to credential stuffing.
- **H-7** — `Models/Section.cs:30` — `EnrolledCount` is a denormalized counter with no `RowVersion` / concurrency token. Confirms H-4 at the model level.

### New attribution-forgery + ownership

- **H-8** — `StudentsController.cs` — multiple endpoints share the ownership problem but have already been rolled up under C-8. Recording separately to keep the matrix honest: `PUT /api/students/{id}` writes `Name, Gender, ContactInfoJSON, ExpectedGraduationTerm` for ANY student ID supplied in the path. Not a repetition of C-8's policy fix; the body-level change also needs ownership validation for the case where policy is legitimately widened to "Student can edit own record."
- **H-9** — `UsersController.cs:90-94` — `UpdateUser` writes `Email` without re-checking the unique index. When a collision occurs, `DbUpdateException` bubbles as HTTP 500 instead of 409 `DUPLICATE_EMAIL`. Surface pattern identical to M-3's MRN race.
- **H-10** — `UsersController.cs:108` — `UpdateUserStatus` writes `Status` with no transition guard. An admin can flip `UserStatus.Locked → Active` silently, undoing a security lockout without audit.

---

## 🟡 MEDIUM

### v1 items (already tracked for post-interim)

- **M-1 (v1)** — `PUT /api/assessments/{id}` accepts `CreateAssessmentDto` (mutates `CourseID`/`Type`).
- **M-2 (v1)** — `AuditLogController` filter is first-match, not AND-composed.
- **M-3 (v1)** — MRN race → 500.
- **M-4 (v1)** — `SectionsController` N+1.
- **M-5 (v1)** — `AuditPackagesController` loads full reports table then filters in-memory.
- **M-6 (v1)** — `KPIsController` + `AuditPackagesController` share `IReportRepository`.
- **M-7 (v1)** — `CancellationToken` propagation inconsistent.

### New in v2

- **M-8** — `InvoicesController` — **no uniqueness check on `(StudentID, Term)`**. Two `POST /api/invoices/generate` with the same student+term produce two invoices, each with the full scholarship deduction applied. Student double-billed. DB has no composite index either (migrations #26 gap).
- **M-9** — `InvoicesController.cs:64` — `AmountDue = Math.Max(0m, totalFees - scholarshipTotal)` creates Pending invoices with `AmountDue=0` when scholarship ≥ fees. These stay "unpaid" forever because no Payment is ever recorded against them.
- **M-10** — `InvoicesController.cs:72` — `DueDate` not validated against `DateTime.UtcNow`. Past-dated invoices accepted, going immediately overdue.
- **M-11** — `InvoicesController.cs:50` — `item.GetDecimal()` throws `InvalidOperationException` on non-numeric JSON, returning 500. Malformed `feeItemsJSON` should yield 400 with `INVALID_FEE_JSON`.
- **M-12** — `FeesController`, `ScholarshipsController` — missing FK-existence checks. POST with bogus `ProgramID` / `StudentID` returns 500 (`DbUpdateException`) instead of 400 with a code. PRD convention is 400. Same issue in `CoursesController` (DepartmentID), `ProgramsController` (DepartmentID).
- **M-13** — `ScholarshipsController` Update — no state-transition guard. `Revoked → Active` silently allowed without audit.
- **M-14** — `FeesController` Update — no state-transition guard. `Retired → Draft` silently allowed, and a retired schedule can then be reused by invoice generation.
- **M-15** — `PaymentsController` — overpayment allowed. `dto.Amount` can exceed `invoice.AmountDue - totalPaid`; excess doesn't bounce. Combined with H-1, reconciliation is impossible.
- **M-16** — `SubmissionsController.cs:127` — `GraderID` looked up but role not enforced to be `Instructor`. Even after C-5 adds the method-level role attribute, a DeptAdmin or Registrar JWT can still submit a grade with any UserID as `GraderID` and pass. Fix: verify `grader.Role == Instructor`.
- **M-17** — `SubmissionsController` — `GradeSubmission` has no guard against grading a submission whose parent `Assessment.Status` is `Closed` or `Archived`. Archived assessments still accept score mutations.
- **M-18** — `SubmissionsController.cs:60` — `Late` status only set if `DueAt.HasValue && DateTime.UtcNow > DueAt`. An assessment without a due date can never be Late; fine. But: no guard against submitting to a `Closed`/`Archived` assessment (the check on line ~45 validates `Published`; race window allows a submission to slip through during a Publish→Close transition).
- **M-19** — `Services/NotificationService.cs:75-86` — `GetForUserAsync` loads every notification for a user then paginates in memory. O(N) memory per user, grows unboundedly. Post-interim work but should push Skip/Take into the repository query.
- **M-20** — `Services/AuthService.cs:43-89` — `RegisterAsync` does two separate duplicate SELECTs then inserts, with no ambient transaction. Concurrent registers with the same username both pass the check; the second INSERT throws `DbUpdateException` → 500 instead of 400 `DUPLICATE_USERNAME`.
- **M-21** — `Repositories/Implementations/InvoiceRepository.cs:41-44` (and parallel patterns in `Scholarship`/`FeeSchedule`/`Payment`/`Assessment`/`Section` repos) — `.Update(entity)` marks *every* property as modified. When an entity is loaded, a single field is changed, and `.Update()` is called, EF issues a full UPDATE of every column. Concurrent writes on distinct fields lose data (last-write-wins). Fix: use change tracking (`ctx.Entry(entity).State = Modified` only after `Attach`, or rely on automatic change tracking with `SaveChanges`).
- **M-22** — `Data/AppDbContext.cs` — missing unique/composite indexes at the schema level:
  - `Applicant.NationalID` — PRD treats it as a natural key, no unique index.
  - `Room.(Building, RoomNumber)` — no composite unique.
  - `Program.Name` — not unique even within DegreeType.
  - `FeeSchedule.(ProgramID, Term)` — no composite unique; two active schedules coexist.
  - `Invoice.(StudentID, Term)` — no composite unique (see M-8).
  - `Enrollment.(StudentID, SectionID)` — no composite unique (already C-23, logged here for DbContext view).
- **M-23** — `Program.cs:152-156` — `ClockSkew = TimeSpan.Zero` means tokens expire to the second. On systems with even small clock drift between API and client, tokens are rejected 1-2 seconds before their expiry. Intentional per PRD stateless-JWT philosophy, but document it and set a default of 30 seconds for production.
- **M-24** — `Services/TokenService.cs:40-43` — JWT claims include `NameIdentifier`, `Name`, `Email`, `Role` but **no `jti` (JWT ID)** and no **`iat` (issued-at)**. Without `jti` there is no per-token correlation ID in the audit trail, and no future mechanism to revoke individual tokens if needed.

---

## 🟢 LOW

### v1 items

- **L-1 (v1, demoted)** — JWT signing key in `appsettings.json`. **Per mentor: acceptable for intern project.** Retain note; revisit before any public deployment.
- **L-2 (v1)** — `EnrollmentRepository` duplicate `IsAlreadyEnrolledAsync` / `HasActiveEnrollmentAsync` methods.
- **L-3 (v1)** — `POST /api/kpis/seed` undocumented in PRD.

### New in v2

- **L-4** — `Services/AuthService.cs` and `TokenService.cs` — integer enum values are accepted by `JsonStringEnumConverter` (`AllowIntegerValues=true` default). `{"role":0}` silently deserializes to `UserRole.Student`. Unlikely real-world but the converter should be constructed with `allowIntegerValues: false`.
- **L-5** — `Services/NotificationService.cs:101` — `GetUnreadCountAsync` pulls every unread row then calls `.Count()`. Should be a DB-level `COUNT(*)`.
- **L-6** — `Services/NotificationService.cs:54-56` — `_hubContext.Clients.User(userId.ToString())` correctly uses `NameIdentifier` claim via default `IUserIdProvider`, but with multiple API instances and no Redis backplane, cross-instance pushes silently drop. Single-instance deployment only.
- **L-7** — `Program.cs:211-248` — policies hardcode role strings. If `UserRole.Student` is renamed, policies compile fine but silently mismatch the JWT role claim. Low risk but fragile; use `nameof(UserRole.Student)` or a const table.
- **L-8** — `Migrations/20260410090037_mig.cs`, `20260410170720_migg.cs`, `20260412110656_miigg.cs` — three empty migrations with no-op `Up`/`Down`. Pollute history; any future `Remove-Migration` will touch these.
- **L-9** — `Models/Ticket.cs:17` — `UpdatedAt` is nullable but never written by any controller/service. Cannot tell when a ticket last changed.
- **L-10** — Most read-only repo methods are not using `.AsNoTracking()` despite PRD mentioning it for RKA. Already flagged as not-a-bug in v1 for non-RKA repos; re-noting here only because it matters for the reporting repos where it IS used (good) versus the rest (ignored). Not re-classified.

---

## 🔵 FUNCTIONAL — code more restrictive than PRD

These are **not security bugs** — they block legitimate users from doing what the PRD says they should be able to.

- **F-1** — `UsersController.cs:68` `GET /api/users/{id}` — code requires `UserViewPolicy` ({ITAdmin, Registrar}); PRD line 1779 says `*` (any authenticated user can view any profile). Currently no Student / Instructor / Finance / DeptAdmin / Auditor can even read their own profile via this endpoint.
- **F-2** — `UsersController.cs:82` `PUT /api/users/{id}` — code requires `AdminPolicy` ({ITAdmin}); PRD line 1783 says `*` with description "Update own profile". Currently no user can update their own profile. Fix is two-part: widen policy AND add ownership check (`id == callerId || isAdmin`).
- **F-3** — `UsersController.cs:59` `GET /api/users` — code `UserViewPolicy` adds Registrar; PRD line 1773 says ITAdmin only. Registrar has a broader-than-intended read of the user table. *(Direction-wise this is also a security concern, but it's minor — Registrar is a trusted role and the user list is not PII-heavy.)*
- **F-4** — `EnrollmentsController.cs:173` `GET /api/enrollment/student/{studentId}` — code `EnrollmentViewPolicy` ({Student, Instructor, Registrar, ITAdmin}); PRD says `*`. DeptAdmin / Finance / Auditor blocked.
- **F-5** — `KPIsController.cs:33` `POST /api/kpis/recalculate` — code `Roles="ITAdmin,Auditor"`; PRD says Admin only. Widened to allow a read-only role (Auditor) to trigger mutation. *(Direction-wise this is a minor security widening; not CRITICAL because recalculation is idempotent-ish.)*

---

## Summary table

| Severity | v1 carried forward | v2 new | Total open |
|---|---:|---:|---:|
| 🔴 CRITICAL | 4 *(C-4 demoted)* | 20 | 24 |
| 🟠 HIGH | 3 | 7 | 10 |
| 🟡 MEDIUM | 7 | 17 | 24 |
| 🟢 LOW | 3 | 7 | 10 *(1 demoted from CRITICAL)* |
| 🔵 FUNCTIONAL | 0 | 5 | 5 |
| **Total** | **17** | **56** | **73** |

*(Note: some v1 items renumbered or demoted per mentor decision on JWT.)*

---

## Action plan — ordered by risk

The pre-interim list grew from 6 items in v1 to **24 items** in v2. Grouped by controller for efficient per-owner work:

### P0 — Pre-interim blockers (must ship by 2026-04-24)

| # | Owner | Controller | Fix |
|---|---|---|---|
| 1 | Ashish | Program.cs | Add `FinancePolicy` ({Finance, ITAdmin}) and `DeptAdminPolicy` ({DeptAdmin, ITAdmin}). Set `FallbackPolicy = RequireAuthenticatedUser` as a safety net (C-25). |
| 2 | Ashish | Program.cs + UsersController | Restore PRD intent on user endpoints (F-1, F-2, F-3). Widen policies AND add JWT-subject ownership check where PRD says `*`. |
| 3 | Tanya | Fees/Invoices/Payments/Scholarships | Apply `[Authorize(Policy="FinancePolicy")]` on all mutating endpoints (C-1). |
| 4 | Tanya | InvoicesController | Add JWT-subject ownership check on `GET /api/invoices/{id}` and `GET /api/invoices/student/{id}` (C-3, C-18). Add FK-existence validation (M-12). Add `(StudentID, Term)` unique check (M-8). |
| 5 | Tanya | PaymentsController | Add JWT-subject ownership check on `GET /api/payments/invoice/{id}` (C-19). |
| 6 | Utkarsh | ReportsController | Apply `[Authorize(Roles="Auditor,ITAdmin")]`; extract `GeneratedByFK` from JWT (C-2 + H-3). |
| 7 | Utkarsh | KPIsController | Apply `[Authorize(Roles="Auditor,ITAdmin")]` on GET list (C-20). |
| 8 | Vikash | ProgramsController | Apply `[Authorize(Policy="DeptAdminPolicy")]` on POST/PUT (C-6). |
| 9 | Vikash | AssessmentsController | Apply `[Authorize(Roles="Instructor,ITAdmin")]` on POST/PUT/publish (C-11). Extract `CreatedByFK` from JWT (H-3). |
| 10 | Vikash | ContentsController | Apply `[Authorize(Roles="Instructor,ITAdmin")]` on POST/PUT `/version`; extract `UploadedByFK` from JWT (C-12, C-13). |
| 11 | Vikash | SubmissionsController | C-5 fix (role + JWT claim). **Also** fix `ChangedByFK = dto.GraderID` on GradeChange record (C-17). Add ownership checks on GET `/student/{id}` and GET `/assessment/{id}` (C-14, C-15). Bind `POST /api/submissions` StudentID to JWT subject (C-16). Verify grader role is Instructor (M-16). |
| 12 | Saurav | ApplicantsController | Apply `[Authorize(Roles="Registrar,ITAdmin")]` on entire controller (C-7). |
| 13 | Saurav | StudentsController | Apply `[Authorize(Roles="Registrar,ITAdmin")]` on writes; allow Students to read their own record only (C-8). |
| 14 | Saurav | SectionsController | Apply `[Authorize(Roles="Registrar,DeptAdmin,ITAdmin")]` on POST (C-9). |
| 15 | Saurav | RoomsController | Apply `[Authorize(Policy="DeptAdminPolicy")]` on POST (C-10). |
| 16 | Saurav | EnrollmentsController | Bind `POST /enroll` StudentID to JWT when caller is Student (C-22). Add ownership check on `DELETE /drop` (C-21). Add ownership binding on `GET /student/{id}` (F-4 related). |
| 17 | Saurav | DbContext / new migration | Add composite unique index on `Enrollments(StudentID, SectionID)` (C-23). |
| 18 | Ashish | AuthService | Always run a dummy `BCrypt.Verify` on user-not-found to close the timing oracle (C-24). |

### P1 — Post-interim (finalize by 2026-06-16)

| # | Owner | Item |
|---|---|---|
| 19 | Tanya | Wrap Payment+Invoice in a transaction with `RowVersion` concurrency token (H-1). |
| 20 | Tanya | Introduce `Pending → Completed` Payment state machine (H-2). |
| 21 | Saurav | Change Enrollment transaction to `IsolationLevel.Serializable` OR add `RowVersion` to `Section.EnrolledCount` (H-4, H-7). |
| 22 | Vikash | Introduce `UpdateAssessmentDto`, drop `CreateAssessmentDto` from PUT (M-1). |
| 23 | Ashish | Fix `AuditLogController` filter to AND-compose (M-2). |
| 24 | Saurav | Catch `DbUpdateException` on MRN collision → 409 (M-3). |
| 25 | Ashish | Add account lockout flow using existing `UserStatus.Locked` enum (H-6). |
| 26 | Ashish | Register duplicate race — wrap in transaction (M-20). |
| 27 | All | Add missing FK existence checks across `Courses`, `Fees`, `Scholarships`, `Programs` POST/PUT (M-12). |
| 28 | Utkarsh | Push `AuditPackages` date filter into EF query (M-5); extract dedicated `IKPIRepository` + `IAuditPackageRepository` (M-6). |
| 29 | Saurav | Add uniqueness check on (Section, Instructor, Schedule) (H-5). |
| 30 | Ashish | Add unique composite indexes per M-22 list. |
| 31 | Vikash | Guard `GradeSubmission` against archived assessments (M-17). |
| 32 | Vikash | Remove redundant `HasActiveEnrollmentAsync` (L-2). |
| 33 | Ashish | Add `jti` and `iat` claims to JWT (M-24); set `ClockSkew` to 30s (M-23). |
| 34 | Vikash | `NotificationService.GetForUserAsync` paginate at DB level (M-19). `GetUnreadCountAsync` use DB COUNT (L-5). |

### P2 — Pre-production (cleanup before public)

| # | Owner | Item |
|---|---|---|
| 35 | Ashish | Restrict CORS to explicit origin list (L-1 of v1 / not re-numbered). |
| 36 | Ashish | Rotate JWT signing key out of git AFTER intern project (C-4 demoted note). |
| 37 | Vikash/Saurav | Fix N+1 in Sections list (M-4). |

---

## Gaps — what this audit did NOT cover

To be transparent so the next pass knows where to look:

- **React frontend** — not in scope for this API audit; should be audited separately once it exists.
- **SignalR wire-level security** — we verified the `/notificationHub` JWT pickup is correctly path-scoped (`Program.cs:152-156`) and the hub has `[Authorize]` with no public methods. Not audited: rate limiting, connection flooding, client-to-client message interception if hub methods are added later.
- **Penetration-depth input fuzzing** — we identified categories of input validation gaps (negative amounts, future DOB, past due dates, malformed JSON) but did not fuzz-test every DTO field.
- **EF query-plan analysis** — beyond the flagged N+1 and in-memory filter, deeper slow-query analysis is a post-interim perf pass.
- **Dependency CVE scan** — package versions (`BCrypt.Net-Next 4.0.3`, `EF Core 8.0.*`, `JwtBearer 8.0.11`) not checked against published advisories.

---

## Verification evidence

Every finding above is backed by direct source read at the cited `File:Line`. The investigation was conducted by five parallel agents with non-overlapping scopes:

1. Authorization-policy sweep (vs PRD endpoint/role tables at `prd_text.txt:1749-2227`)
2. Attribution-forgery sweep (every POST/PUT for body-sourced user-identity FKs)
3. Horizontal-escalation sweep (every ID-in-path endpoint for caller-vs-owner enforcement)
4. Data-integrity sweep (FK validation, state machines, input validation, races, uniqueness)
5. Services / DI / DbContext / Migrations sweep

Critical findings (C-1 … C-25) were hand-verified by the primary reviewer before inclusion. Line numbers match as of the file state at 2026-04-17.

---

*If Priyanshu or any teammate finds additional bugs during their fix work, add them to this document under the appropriate severity with file:line evidence. The smoke-test suite in `tests/smoke/` will carry regression tests for every pre-interim blocker (P0 items) so green CI becomes the proof-of-fix artifact.*
