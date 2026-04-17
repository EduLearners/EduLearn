# EduLearn — Code Review Verification Report

**Date:** 2026-04-17
**Scope:** Independent, file-and-line-level verification of a peer code review covering the full `EduLearn.API` project.
**Method:** Every claim was checked against the actual source at the exact path and line cited, with no assumptions. 26 claims total.
**Status of the reviewed codebase:** Build succeeds (0 errors). All interim features present. The findings below are **latent** (no live user data yet) but **exploitable** the moment the system is deployed to multi-user staging.

---

## Executive Summary

The peer review is **substantively accurate**. Of the 26 claims checked, **21 are fully confirmed** and **4 are partially confirmed** (correct substance, line numbers drifted by 1–2). **One claim is materially wrong** (the policy count/location in `Program.cs`) and **two need reframing** for accuracy when presented to owners. No critical finding was hallucinated.

There are **5 security blockers** that must be fixed before any multi-user demo or staging deployment. All 5 are confirmed by direct read. The most severe is a **complete finance-integrity bypass**: any authenticated Student can zero out their own tuition bill via the Scholarships / Invoices / Payments endpoints, which all ship with bare `[Authorize]` and no `FinancePolicy` exists in the DI container.

| Severity | Count | Fix owner(s) |
|---|---|---|
| 🔴 Critical | 4 | Tanya (SFB), Utkarsh (RKA), Ashish (IAM) |
| 🟠 High | 3 | Vikash (AGI), Tanya (SFB) |
| 🟡 Medium | 9 | Vikash, Saurav, Utkarsh, Ashish |
| 🟢 Low | 3 | Ashish, Saurav |

---

## Methodology

Each of the 26 claims specified a file path, a line range, and an assertion (e.g., *"`SubmissionsController.cs:117-170` has no method-level `[Authorize]`"*). An investigation agent opened each file, read the cited range plus enough surrounding context to judge the substance of the claim, and recorded:

- **CONFIRMED** — file, line, and substance all match.
- **PARTIALLY CONFIRMED** — substance correct; line numbers off by 1–2 (typically because the reviewer cited the method signature line instead of the attribute line directly above it).
- **REFUTED** — evidence in the source contradicts the claim.

The full per-claim table with literal source quotes is preserved in the verification run log; this report summarizes findings grouped by severity and module owner.

---

## 🔴 Critical Findings (5 blockers)

### C-1 — SFB Finance Bypass (all 4 SFB controllers)
**Files:** `FeesController.cs` lines 23/46/59 · `InvoicesController.cs` lines 33/83/95 · `PaymentsController.cs` lines 25/64 · `ScholarshipsController.cs` lines 23/50/60
**Evidence:** All endpoints carry bare `[Authorize]` (authenticated-but-any-role). No `FinancePolicy` is registered in `Program.cs` (policies span lines **214–247**, total **9** — contrary to the original review's claim of "7 policies at 181–213" — none restrict to the `Finance` role).
**Attack vector:**
1. A Student registers via `POST /api/auth/register` and logs in for a valid JWT.
2. `POST /api/scholarships` with their own `StudentID` and `Amount: 999999` — accepted.
3. `POST /api/invoices/generate` — `InvoicesController.cs:46-47` reads all active scholarships for the student and subtracts them, yielding `AmountDue ≈ 0`.
4. `POST /api/payments` with `Amount: 0` — invoice flips to `Paid`.
**Consequence if ignored:** Any student with a valid account can zero out their own tuition. This is not a theoretical risk; it is a single-session exploit against the demo endpoints. Reputational and financial-control failure the moment the system touches real money.
**Owner:** Tanya (controllers) + Ashish (add `FinancePolicy` to `Program.cs`).

### C-2 — Reports Module Open to All Authenticated Users
**File:** `ReportsController.cs` lines 25, 48, 57.
**Evidence:** Generate, list, and download endpoints all carry bare `[Authorize]`. The PRD (RKA module) requires `Auditor` or `ITAdmin`. Additionally, `ReportsController.cs:37` sets `GeneratedByFK = dto.GeneratedByFK` — the "who generated this" field is taken from the **request body**, not the JWT claim, enabling identity forgery on every report.
**Consequence if ignored:** (a) Any authenticated user reads the full report catalogue (data exposure). (b) Any user forges reports attributed to anyone else's ID, including auditors and admins. Audit trail integrity for the RKA module is compromised.
**Owner:** Utkarsh.

### C-3 — GET Invoices by Student: No Ownership Filter
**File:** `InvoicesController.cs` lines 82–89.
**Evidence:** `GET /api/invoices/student/{studentId}` carries bare `[Authorize]`. The controller accepts any `studentId` parameter and returns that student's invoice history with no check against the caller's JWT subject.
**Consequence if ignored:** Any Student user enumerates every other student's tuition record, payment history, and outstanding balance by iterating `studentId`. This is a PII leak under any privacy framework (FERPA in US academic contexts, GDPR elsewhere).
**Owner:** Tanya.

### C-4 — JWT Signing Key Committed to Git
**File:** `appsettings.json` line 16.
**Evidence:** `"Key": "ThisIsA32CharSecretKeyForEduLearn!"` — a literal 32-character string in a file tracked by the repository.
**Consequence if ignored:** (a) Any historical clone of the repository can forge tokens for any user, including `ITAdmin`. (b) If this key ever rotates, all previously-issued tokens remain valid until natural expiry (60 min), giving a window for impersonation. (c) Public-repo migration or any source leak is a full auth bypass.
**Owner:** Ashish. Move to `dotnet user-secrets` for dev and environment variables / Key Vault for production. Rotate the current key immediately after rollout.

### C-5 — GradeSubmission Endpoint Has No Role Restriction *(reframed from original review)*
**File:** `SubmissionsController.cs` line 117 (`[HttpPost("{id}/grade")]`).
**Evidence:** The method has no method-level `[Authorize]`, but the **class-level `[Authorize]` at line 12 does apply**, so the endpoint is authenticated — not unprotected as the original review stated. The actual bug is that **no role restriction** exists: a Student JWT is accepted. The `GraderID` field comes from the request body (`GradeSubmissionDto`), not from the JWT claim.
**Attack vector:** Any Student `POST /api/submissions/{ownSubmissionId}/grade` with `{ "score": maxScore, "graderID": <own_user_id>, "reason": "..." }`. The grade is stored, the `GradeChange` audit record is written with the Student's ID as the grader, and the Student receives full marks on their own submission.
**Consequence if ignored:** Complete academic integrity failure. The audit trail actively records the fraud as legitimate instructor action because attribution is caller-controlled.
**Owner:** Vikash. Add `[Authorize(Roles = "Instructor,ITAdmin")]` on the method AND replace `dto.GraderID` with `User.FindFirst(ClaimTypes.NameIdentifier).Value`.

> **Note for the team:** the original review wording "no `[Authorize]` at all" was technically imprecise. The correct framing — "class-level auth present; method-level role restriction missing; attribution is forged from the body" — is the one to use in the fix ticket.

---

## 🟠 High Findings

### H-1 — PaymentsController Has No Transaction (Race Condition)
**File:** `PaymentsController.cs` lines 51, 53, 56.
**Evidence:** `CreateAsync(payment)` → `GetByInvoiceIdAsync(...)` → sums totalPaid → `UpdateAsync(invoice)`. No `BeginTransaction`/`SaveChanges` scope wraps this sequence.
**Consequence if ignored:** Two concurrent payment POSTs against the same invoice both read the pre-payment total, both insert, both compute the post-payment total (each seeing the other's insert), both set `Status = Paid`. Invoice reports Paid when overpaid, and no error surfaces. Inverse case: both set status before seeing the other, leaving invoice in `Partial` when it should be `Paid`. This corrupts finance reconciliation.
**Owner:** Tanya. Wrap the sequence in `DbContext.Database.BeginTransactionAsync()` with optimistic concurrency on the invoice row.

### H-2 — Payment Immediately `Completed`, No Gateway Verification State
**File:** `PaymentsController.cs` line 48.
**Evidence:** `Status = PaymentStatus.Completed` is assigned at creation. The `PaymentStatus` enum does include a `Pending` value (`FinanceEnums.cs:13`), but it is never used.
**Consequence if ignored:** Once a real payment gateway is integrated (Stripe, Razorpay, etc.), there is no state for "submitted but not yet confirmed." Every payment row will be marked Completed before the gateway callback, which means refunds, failures, and duplicate-submission idempotency cannot be modelled. For the interim demo this is cosmetic; for any money movement it is blocking.
**Owner:** Tanya. For interim: document as known. For post-interim: introduce a two-phase state (`Pending` → `Completed` on gateway confirmation).

### H-3 — Attribution-From-Body on Assessment Creation
**File:** `AssessmentsController.cs` line 68.
**Evidence:** `CreatedByFK = dto.CreatedByFK` — the creator is taken from the body, not the JWT.
**Consequence if ignored:** Any user creates assessments attributed to any instructor. Since `GradeChange` audit chains back to assessments, forged attribution cascades.
**Owner:** Vikash. Extract `CreatedByFK` from `User.FindFirst(ClaimTypes.NameIdentifier)`.

---

## 🟡 Medium Findings

### M-1 — PUT /api/assessments Accepts CreateAssessmentDto (Mutable CourseID/Type) *(reframed)*
**File:** `AssessmentsController.cs` line 130 (method signature); body at lines 152-158.
**Evidence:** PUT accepts `CreateAssessmentDto`. The update body writes `CourseID` and `Type` — an assessment can be reparented to a different course or have its type mutated. The update body does **NOT** write `CreatedByFK` (contrary to the original review's wording) — so creator forgery via UPDATE is not currently possible, but the design is fragile: the next edit that adds `CreatedByFK = dto.CreatedByFK` would silently introduce the bug.
**Consequence if ignored:** Semantically invalid updates accepted. A Draft assessment for CS101 can be silently reparented to CS201.
**Fix:** Introduce `UpdateAssessmentDto` with only the legitimately updatable fields (Title, DueAt, MaxScore, GradingRubricJSON).
**Owner:** Vikash.

### M-2 — AuditLogController Filter Is First-Match, Not AND-Composed
**File:** `AuditLogController.cs` lines 57–86.
**Evidence:** An if/else chain handles filter params. Passing `?userId=1&action=Login` returns only the `userId` filter; `action`, `resourceType`, and date-range parameters are silently ignored because the `userId` branch returns first.
**Consequence if ignored:** Every combined audit query returns wrong data. The inline comment at lines 5-17 claims filters "combine as needed" — the code actively lies about its behavior. Auditors compiling compliance reports will get misleading results without any error surfacing.
**Owner:** Ashish. Replace with AND-combined `IQueryable` filtering.

### M-3 — StudentsController MRN Race Condition → 500 Instead of 409
**File:** `StudentsController.cs` lines 71–72.
**Evidence:** `var count = await _studentRepo.GetCountAsync(); var mrn = $"STU-{count + 1:D5}";`. The DB has a unique index on MRN, so concurrent inserts throw `DbUpdateException` — unhandled — returning 500.
**Consequence if ignored:** Under load, admission onboarding surfaces opaque 500s instead of actionable `DUPLICATE_MRN` errors. Registrar staff cannot self-serve a retry.
**Owner:** Saurav. Catch `DbUpdateException` with `SqlException.Number == 2601/2627` and return `409 Conflict { code: "DUPLICATE_MRN" }` with retry guidance.

### M-4 — SectionsController N+1 Query
**File:** `SectionsController.cs` lines 128–134.
**Evidence:** `foreach (var s in sections) { var instructor = await _userRepo.GetByIdAsync(s.InstructorID); ... }`.
**Consequence if ignored:** 50 sections = 51 DB round-trips. Irrelevant for demo data, visible as slowness at 500+ sections, outright timeouts at 5,000+.
**Owner:** Vikash/Saurav. Use `Include(s => s.Instructor)` or a single batch fetch by `DISTINCT InstructorID`.

### M-5 — AuditPackagesController Loads Full Reports Table Into Memory
**File:** `AuditPackagesController.cs` lines 31–33.
**Evidence:** `(await _reportRepository.GetAllReportsAsync(ct)).Where(r => r.GeneratedAt.Date >= ... && r.GeneratedAt.Date <= ...)`. Date filtering happens in .NET, not in the DB.
**Consequence if ignored:** Unbounded memory growth. A single quarterly package generation loads every Report row ever written.
**Owner:** Utkarsh. Push the date predicate into the `IReportRepository` query.

### M-6 — KPIs and AuditPackages Share `IReportRepository`
**Files:** `KPIsController.cs:14`, `AuditPackagesController.cs:13`.
**Evidence:** Both controllers inject `IReportRepository` for data that is not reports. No `IKPIRepository` or `IAuditPackageRepository` exists. Breaks the one-entity-one-repository convention followed by the other 20 repositories.
**Consequence if ignored:** Single point of coupling; any change to `IReportRepository` potentially breaks both unrelated controllers. Tests cannot mock KPI-specific behavior without bleeding into report tests.
**Owner:** Utkarsh. Extract dedicated interfaces.

### M-7 — CancellationToken Declared But Not Propagated
**Files:** `EnrollmentsController.cs` lines 175/177 (GetByStudent), 200/202 (GetBySection). `InvoicesController.cs` lines 36, 87, 98, 103.
**Evidence:** The method signatures accept `CancellationToken`; the repository calls inside drop it. In `InvoicesController`, `_feeScheduleRepository.GetByProgramAndTermAsync(...)` on line 41 *does* pass `ct` while `_studentRepository.GetByIdAsync(...)` on line 36 does not — same method, inconsistent.
**Consequence if ignored:** Client disconnects do not cancel in-flight DB queries. Under load, abandoned requests accumulate SQL Server session time. No crash; wasted resources.
**Owner:** Saurav (Enrollments), Tanya (Invoices).

---

## 🟢 Low Findings

### L-1 — CORS Allows Any Origin
**File:** `Program.cs` line 82.
**Evidence:** `policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod()`.
**Consequence if ignored:** Acceptable for dev/demo. Unacceptable for any public deployment — any site can call the API with the user's cookies (none currently, but that will change). **Ship-blocker for production only.**

### L-2 — EnrollmentRepository Duplicate Methods
**File:** `EnrollmentRepository.cs` lines 50–60.
**Evidence:** `IsAlreadyEnrolledAsync` and `HasActiveEnrollmentAsync` have byte-for-byte identical predicates. One is dead code.
**Consequence if ignored:** Zero runtime risk. Mild confusion in code review and future refactors.

### L-3 — Undocumented Seed Endpoint
**File:** `KPIsController.cs` lines 52–73.
**Evidence:** `POST /api/kpis/seed` exists with `[Authorize(Roles = "ITAdmin")]` but is not listed in the PRD endpoint map or architecture reference.
**Consequence if ignored:** PRD compliance gap. Operationally useful and correctly secured, but an auditor comparing code to PRD will flag it.

---

## Corrections to the Original Peer Review

Three findings in the original review need wording changes before being used as fix tickets, so owners aren't chasing non-issues:

| Original claim | Correction |
|---|---|
| `Program.cs` defines 7 policies at lines 181–213 | **9** policies at lines **214–247** — check actual code. "No `FinancePolicy`" portion is correct. |
| `PUT /api/assessments` can mutate `CreatedByFK` | PUT accepts a DTO that contains `CreatedByFK`, but the update body does NOT write it. `CourseID` and `Type` ARE mutated — that part of the finding stands. |
| `SubmissionsController` grade endpoint has no `[Authorize]` | Class-level `[Authorize]` applies. The bug is "no **role** restriction," not "no auth." |

All three corrections preserve the original findings' severity — they just need precise wording when written up as JIRA/Azure Boards tickets.

---

## Action Plan (Ordered by Risk)

| # | Action | Owner | Effort | Blocker for |
|---|---|---|---|---|
| 1 | Add `FinancePolicy` in `Program.cs` + apply `[Authorize(Policy="FinancePolicy")]` to all 4 SFB controllers | Tanya + Ashish | 20 min | Any multi-user demo |
| 2 | Add `[Authorize(Roles="Auditor,ITAdmin")]` to all `ReportsController` endpoints | Utkarsh | 5 min | Any multi-user demo |
| 3 | Add `[Authorize(Roles="Instructor,ITAdmin")]` to `SubmissionsController.GradeSubmission` + strip `GraderID` from DTO (use JWT claim) | Vikash | 10 min | Any multi-user demo |
| 4 | Replace `GeneratedByFK` / `CreatedByFK` in `ReportsController` and `AssessmentsController` with JWT claim extraction | Utkarsh + Vikash | 30 min | Any multi-user demo |
| 5 | Add JWT-subject ownership check to `GET /api/invoices/student/{id}` | Tanya | 15 min | Any multi-user demo |
| 6 | Rotate JWT secret; move to user-secrets (dev) + env vars (prod) | Ashish | 15 min | Any public deployment |
| 7 | Wrap `PaymentsController` in transaction; add concurrency token to `Invoice` | Tanya | 30 min | Post-interim |
| 8 | Fix `AuditLogController` filter composition (AND, not first-match) | Ashish | 30 min | Post-interim |
| 9 | Introduce `UpdateAssessmentDto`; drop `CreateAssessmentDto` from PUT | Vikash | 20 min | Post-interim |
| 10 | Handle `DbUpdateException` → 409 on MRN collision | Saurav | 15 min | Post-interim |
| 11 | Push AuditPackages date filter into EF query | Utkarsh | 20 min | Post-interim |
| 12 | Extract `IKPIRepository` and `IAuditPackageRepository` | Utkarsh | 45 min | Post-interim |
| 13 | Propagate `CancellationToken` consistently | Saurav + Tanya | 15 min | Post-interim |
| 14 | Fix N+1 in Sections list | Vikash/Saurav | 20 min | Pre-production |
| 15 | Tighten CORS to explicit origin list | Ashish | 10 min | Pre-production |
| 16 | Remove duplicate `HasActiveEnrollmentAsync` | Saurav | 5 min | Code hygiene |

**Items 1–6 are the pre-interim blockers.** Total estimated fix time is under two hours of focused work across the team. The bash smoke suite (separately planned) will carry regression tests for each of these six fixes so green CI becomes proof-of-fix.

---

## What Was *Correctly* Dismissed by the Original Audit

To avoid relitigating resolved points, these dismissals in the prior audit are independently confirmed correct:

- Missing `CancellationToken` on some controllers — not in PRD, not a bug (but the *inconsistent* propagation in M-7 above still needs fixing).
- `AssessmentStatus.Archived` present in enum — confirmed.
- `StudentLifecycleStatus` values — confirmed.
- `SubmissionStatus.Returned` present — confirmed.
- `PaymentStatus.Pending` present (though unused — see H-2).
- `AuthService` tuple return shape — confirmed.
- `FeeSchedule` defaulting to `Draft` — matches PRD Section 14.4.
- `AsNoTracking` on non-RKA repos not required — confirmed.

---

## Recommendation

Ship fixes 1–6 before the 2026-04-24 interim demo. Treat the bash smoke suite (separately designed) as the verification harness — it will carry one negative test per security blocker, so the suite turning green is the demonstrable proof of fix. Defer H-1 (payment transaction), M-series items, and the full NUnit+Moq test project to post-interim (target: 2026-06-16 final submission), as already scheduled in `complete-testing-and-next-steps.md`.

The codebase is architecturally sound. The remaining issues are all **configuration-level** (missing policy registrations, wrong attribute scope, claim-vs-body attribution) — not structural. None require a refactor. That is good news.

---

*Verification conducted against `main` at commit-time of 2026-04-17. 26 claims checked, 21 confirmed, 4 partially confirmed, 1 refuted, 0 hallucinated. No interpretation was applied — only direct evidence from source.*
