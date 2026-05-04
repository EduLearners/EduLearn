# EduLearn — End-User Code Audit (2026-05-04)

**Method:** 13 parallel agents (10 Haiku, 3 Sonnet) reviewed every controller, repository, DTO, and policy from a real-user perspective — applicant, student, instructor, registrar, deptadmin, finance, auditor, itadmin. Findings were de-duplicated, cross-checked against the actual code, and then **re-graded honestly against project context**: this is a **Cognizant internship training project**, not a production system. The 246/246 smoke suite passes; the PRD is the contract.

**Scope:** `EduLearn.API/` — 25 controllers, 21 repositories, 56 DTOs, 26 models, `Program.cs`, `Data/DbInitializer.cs`.

---

## How findings are graded

The agents produced 54 findings in their first pass. After cross-checking against the PRD intent, code comments (which often cite the PRD section a behaviour was implemented for), and the realities of an internship-scope demo, every finding is now in one of four buckets:

| Bucket | Meaning | Action |
|---|---|---|
| ✅ **REAL** | Actual bug, or PRD-mandated behaviour the code doesn't deliver, or breaks a working flow | **Fix before demo** |
| 🟦 **PRD-COMPLIANT** | The code already does exactly what the PRD specifies; the agent's "fix" would have *deviated* from the PRD | **Leave alone** |
| 🟨 **NICE-TO-HAVE** | Good practice; not in the interim scope | **Note for post-interim** |
| 🟥 **OVER-ENGINEERED** | Production-grade concern that doesn't fit an internship training project | **Drop** |

---

## Executive summary

| Bucket | Count |
|---|---|
| ✅ REAL — fix before demo | **7** |
| 🟦 PRD-COMPLIANT — leave alone | 7 |
| 🟨 NICE-TO-HAVE — post-interim | 5 |
| 🟥 OVER-ENGINEERED — drop | 35 |
| **Total reviewed** | **54** |

**Bottom line:** ~7 items are worth fixing (≈2 hours of focused work). Everything else can stay as-is for the interim demo. The audit's value isn't a long fix list — it's the **confirmation that the codebase is in good shape and the only real-world workflow gaps are either explicitly post-interim per the PRD or are PRD-aligned design choices**.

---

## ✅ REAL — Fix before demo (7)

### R-1. JWT config keys mismatch + hardcoded secret (was D-03)
**Files:** [`appsettings.json:14-19`](../EduLearn.API/appsettings.json)
PRD §9 specifies `Jwt:Secret` / `Jwt:AccessTokenExpiryMinutes: 90`; code uses `Jwt:Key` / `Jwt:ExpiryInMinutes: 60`. Secret is hardcoded.
**Why real:** the only Critical PRD discrepancy that wasn't resolved in the April→May window. Mentor will flag it. Move secret to user-secrets and align the keys.
**Effort:** 30 min.

### R-2. Scholarship deduction silently zero on invoice generation
**Files:** [`InvoicesController.cs:65-101`](../EduLearn.API/Controllers/InvoicesController.cs#L65), [`ScholarshipRepository.cs:22-29`](../EduLearn.API/Repositories/Implementations/ScholarshipRepository.cs#L22)
Smoke test [`15_invoices.sh:10`](../tests/smoke/modules/15_invoices.sh#L10) consistently logs `amountDue=55000 (expected 45000 = 55000 - 10000 scholarship)`. The math in `Generate` is correct (`Math.Max(0, totalFees - scholarshipTotal)`), and `ScholarshipsController.Create` correctly sets `Status = Active` and `.Date` boundaries — so on paper the deduction *should* apply. The fact that it doesn't suggests `GetActiveByStudentIdAsync` is finding zero rows at invoice time. Likely a date-comparison or transaction-timing issue worth a 30-min trace.
**Why real:** the smoke test only **logs** the amount — it doesn't assert. So a real bug is slipping through CI today.
**Effort:** 30 min investigation + assertion add.

### R-3. Class-level `[Authorize]` missing on 7 controllers
**Files:** [`PaymentsController.cs:14`](../EduLearn.API/Controllers/PaymentsController.cs#L14), [`InvoicesController.cs:16`](../EduLearn.API/Controllers/InvoicesController.cs#L16), [`ScholarshipsController.cs:13`](../EduLearn.API/Controllers/ScholarshipsController.cs#L13), [`FeesController.cs:12`](../EduLearn.API/Controllers/FeesController.cs#L12), [`KPIsController.cs:12`](../EduLearn.API/Controllers/KPIsController.cs#L12), [`ReportsController.cs:13`](../EduLearn.API/Controllers/ReportsController.cs#L13), [`AuditPackagesController.cs:11`](../EduLearn.API/Controllers/AuditPackagesController.cs#L11)
Every endpoint on these controllers has correct method-level `[Authorize(Policy = "...")]`. But the **class** is bare. Any new method added without an explicit attribute would inherit only the global `FallbackPolicy = AuthenticatedUser` — i.e. accessible to any logged-in user, including Students. This is exactly the "missed annotation" pattern that has slipped through prior reviews.
**Why real:** trivial defensive fix; prevents future regressions; you specifically asked us to look for this class of bug.
**Effort:** 5 minutes total — one line per controller.

### R-4. Transcript `entriesJSON` includes Dropped/Waitlisted enrollments (D-19)
**Files:** [`TranscriptsController.cs:50-59`](../EduLearn.API/Controllers/TranscriptsController.cs#L50)
A student who dropped CS201 has that drop row on their issued transcript. Add a `.Where(e => e.Status == EnrollmentStatus.Enrolled)` before the `.Select`. Also fix line 61 to compare against the enum, not the string `"Enrolled"`.
**Why real:** transcripts are a PRD-required artifact (SRA-03); printing dropped courses on an official transcript is just wrong.
**Effort:** 15 min.

### R-5. Transcript GPA is always null (D-20)
**Files:** [`TranscriptsController.cs:67`](../EduLearn.API/Controllers/TranscriptsController.cs#L67)
Hardcoded `GPA = null`. PRD SRA-03 lists GPA as a transcript field. Either compute a weighted average across graded submissions for the student's enrolled sections, or document GPA as deferred until a `GradingService` exists (D-08).
**Why real:** PRD-listed field returned as null on every issued transcript.
**Effort:** 30–60 min if computed; 5 min to document the deferral.

### R-6. Smoke seed `scheduleJSON:"[]"` silently disables conflict detection (D-21)
**Files:** [`tests/smoke/modules/07_sections.sh:6`](../tests/smoke/modules/07_sections.sh#L6), [`TimetableController.cs:113,151-163`](../EduLearn.API/Controllers/TimetableController.cs#L113)
Deserializing the array `"[]"` into `ScheduleInfo` produces a object with `Days = null, Time = null`; the conflict loop's null-guard then skips the section and reports `HasConflict = false`. Two-line fix:
1. Change the seed to a real schedule object (`"{\"days\":\"Mon-Wed-Fri\",\"time\":\"09:00-10:30\"}"`).
2. Optionally tighten `ParseSchedule` to return null on non-object JSON.
**Why real:** test fixture doesn't represent the production-shape data; a real conflict could go undetected and the test would still be green.
**Effort:** 5–10 min.

### R-7. KPIs not auto-seeded on first boot
**Files:** [`Data/DbInitializer.cs`](../EduLearn.API/Data/DbInitializer.cs) seeds the admin user only.
On a fresh deploy, `GET /api/kpis` returns `[]` until ITAdmin remembers to `POST /api/kpis/seed`. For a demo on a clean DB, this is a 30-second confusion.
**Why real:** demo polish; the seed is idempotent and the helper already exists.
**Effort:** 10 min — one extra call inside `SeedDefaultAdminAsync`.

---

## 🟦 PRD-COMPLIANT — leave alone (7)

These were initially flagged as bugs but the code already implements exactly what the PRD specifies.

| Initial flag | Reality |
|---|---|
| Anonymous applicants blocked from POST `/api/applicants` | Comment at [`ApplicantsController.cs:11`](../EduLearn.API/Controllers/ApplicantsController.cs#L11): *"HARDENING (C-7): PRD §6.2 SRA-01 requires Registrar (or ITAdmin) for applicant CRUD."* Real universities admit via admissions office. |
| Students can't self-pay (`POST /api/payments`) | Comment at [`PaymentsController.cs:39`](../EduLearn.API/Controllers/PaymentsController.cs#L39): *"HARDENING (C-1.C): PRD requires Finance role"*. PRD locks payments to Finance. |
| Instructor can read any roster | PRD's `RosterViewPolicy` is `Instructor, Registrar, DeptAdmin, ITAdmin`. Per-section ownership was never in scope. |
| Any Instructor can create/publish assessments for any course | PRD's `CourseManagerPolicy` permits this; per-course ownership was never in scope. |
| Default admin password `Admin@123` hardcoded | Intentional for the Swagger demo; the smoke tests rely on it. `DbInitializer` comment confirms. |
| `_ => StatusCode(500)` fallthrough in NotificationsController | The `MarkReadResult` enum has exactly 3 values, all 3 explicitly handled — the default branch is unreachable. Pure defensive code. |
| Hard-delete repository methods on User/Enrollment/etc. | These methods are not exposed by any controller. They're dead code, unreachable today. |

---

## 🟨 NICE-TO-HAVE — note for post-interim (5)

These are real production concerns but out of scope for the interim demo. Documented here so they're not forgotten, not actioned now.

1. **Audit log coverage gaps** on UserStatus changes, ApplicantStatus changes, Assessment publish, Transcript publish, Scholarship create. Current coverage (Login, Enrollment, Drop, Grade, Invoice, Payment, Tickets) satisfies IAM-04's spirit; expanding can wait.
2. **Password complexity** beyond `[MinLength]` — depends on whether PRD §9 specifies complexity. If it does, promote to REAL; if not, low priority.
3. **Pagination** wired up on the unbounded list GETs. Infrastructure (`PaginatedResponseDto<T>`) already exists; only `NotificationsController.GetMine` uses it. With small demo data it doesn't matter.
4. **Audit log retention** — append-only with no archive job. Fine for a demo DB.
5. **`POST /api/auth/refresh`** — listed in architecture reference, not implemented. 60-minute token expiry is acceptable for the demo. Mentor may flag.

---

## 🟥 OVER-ENGINEERED — drop (35)

For full transparency, here's what the agents flagged that I'm explicitly dropping. Each of these is **valid feedback for a production system** but inappropriate for an internship project. Listed by category, not individually.

- **Workflow ergonomics:** missing `GET /api/students/me`, missing `GET /api/sections?term=`, no auto applicant→student bridge, no student-self transcript request endpoint, no admin password reset, no refund endpoint, no bulk enrollment, no term-end finalization endpoint, no department isolation enforcement, no room/instructor double-booking detection at section creation, scholarship not program/term-scoped, payment overpay not blocked. Most of these are frontend concerns or out-of-scope features.
- **Defensive coding:** `CancellationToken` on every async action, `[Phone]`/`[EmailAddress]`/`[MaxLength]` on every DTO string, `[JsonShape]` validation for every JSON-string field, `Departments` table with FK enforcement. Premature for an internship.
- **Cosmetic:** error-shape consistency (`{message}` vs `{error,code}` in 1-2 places), `StatusCode(403)` vs `Forbid()`, `StatusCode(201)` vs `CreatedAtAction`, magic-string error codes vs centralised `ErrorCodes` constants. Low signal-to-noise.
- **Status-code nits:** 8 controllers return `400` for "not found"-class errors instead of `404`. Functionally fine; clients see a 4xx and a code field either way.
- **Security hardening beyond PRD:** ownership checks on assessment/content/section actions where PRD's policy already gates access at the role level.
- **Deployment hardening:** rotate-on-first-login flag, remove default admin, password complexity regex enforcement, audit log retention job, file-storage cleanup. Production deploy concerns; this project is not deploying.

---

## End-to-end flow — what actually works today

For completeness, here's the demo path that works **right now** through Swagger, with no fixes applied:

1. **Login** as `admin / Admin@123` → JWT.
2. **ITAdmin** creates Registrar/Finance/Instructor/DeptAdmin/Auditor accounts via `POST /api/users`.
3. **DeptAdmin** creates Program → Courses → Sections.
4. **Registrar** keys in an Applicant on the applicant's behalf, accepts them, then asks ITAdmin to create the User account (separation of duties), then creates the Student record.
5. **Student** logs in, calls `POST /api/enrollment/enroll` for the section they want.
6. **Instructor** creates an Assessment, publishes it; **Student** submits; **Instructor** grades.
7. **Finance** awards a Scholarship, generates an Invoice, records a Payment on the student's behalf.
8. **Registrar** generates and publishes a Transcript.
9. **Auditor** queries the audit log and generates a Report; **ITAdmin** assigns and resolves Tickets.

This is **the full PRD flow**. The "blockers" my first audit flagged (anonymous self-apply, student self-pay, etc.) describe a **different application** — a public-internet university portal — not the staff-mediated SIS that the PRD describes. The PRD-aligned flow is end-to-end functional today, and the 7 REAL items above are small correctness/polish fixes within that flow.

---

## Recommendation

**Fix the 7 REAL items.** Total effort: ~2 hours.

Leave the rest. The maximalist agent output is preserved in this document as a reference, but acting on the 🟥 list would be over-engineering an internship project. If a future code-review at Cognizant raises any of those items, the response is straightforward: "the PRD is satisfied; that work is post-interim."

---

*Audit produced by 13-agent parallel review (10 Haiku, 3 Sonnet) on 2026-05-04. Findings re-graded against PRD intent and project context (Cognizant internship training, not production deployment). See PRD-DISCREPANCIES.md for the formal PRD-vs-code drift list.*
