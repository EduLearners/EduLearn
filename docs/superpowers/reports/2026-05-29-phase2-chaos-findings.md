# Phase 2 — Browser Chaos Test Findings (Wave 1)

**Date:** 2026-05-29
**Harness:** `tests/browser-chaos/chaos-harness.js` (Wave1-2026-05-29)
**Execution:** Claude preview browser (frontend :5173 → API :5001), live running app + seeded data.
**Scope:** Backend API authorization matrix, frontend route-access, auth chaos, Phase 1 re-verification.

---

## Summary

| Layer | Checks | Pass | Fail | Notes |
|-------|--------|------|------|-------|
| A — Backend API authz (7 roles × 19 endpoints) | 133 | 133 | 0 | Fully PRD-aligned |
| B — Frontend route-access | 27 routes + live spot-checks | all | 0 | Map complete, guard verified |
| Auth chaos (cross-role back) | 1 | 1 | 0 | Reported bug fixed |
| Phase 1 re-verification | 3 | 3 | 0 | All claimed fixes hold |

**No product bugs found in Wave 1.** Every initial "failure" was a defect in the *test harness*, not the application. The two originally-reported bugs are verified fixed against the live app.

---

## Harness defects found and fixed (not product bugs)

These were caught because the harness's first run produced 24 "failures." Investigation against the **PRD (`docs/EduLearn-PRD-v1.0_2.docx` §6), `docs/PRD-DISCREPANCIES.md`, the actual controller `[Authorize]` attributes, and the policies in `Program.cs`** showed the application was correct and the harness expectations were wrong.

| # | Harness defect | Cause | Fix |
|---|----------------|-------|-----|
| H-1 | `GET /users` expected ITAdmin-only | Real policy `UserViewPolicy` = ITAdmin, Registrar, DeptAdmin | Corrected matrix |
| H-2 | `POST /rooms` expected ITAdmin-only | PRD ETS-02 + `DeptAdminPolicy` = DeptAdmin, ITAdmin | Corrected matrix |
| H-3 | `POST /sections` expected ITAdmin-only | PRD ETS-02 + Roles `Registrar,DeptAdmin,ITAdmin` | Corrected matrix |
| H-4 | `POST /submissions` expected to allow ITAdmin | Real attribute Roles=`Student` only | Corrected matrix |
| H-5 | All GET-expecting-403 returned `HTTP 0` | Harness sent a JSON body on GET requests; the fetch spec forbids it, so `fetch` threw. This also *masked* allowed-GET results (HTTP 0 ≠ 403 passed for the wrong reason). | `api()` no longer attaches a body to GET/HEAD |
| H-6 | ITAdmin login intermittently failed; GET clusters flaky | 133 fetches fired as a tight burst → dev server dropped connections | Added 1 retry on transient (status 0) + 20 ms throttle |

After fixes: **133/133 pass**, verified with real status codes (403 for unauthorized, 200 for authorized) on the previously-failing GET endpoints.

---

## Backend API authorization (Layer A) — PASS

All 19 representative endpoints enforce the correct roles for all 7 roles (133 checks). Source of truth: controller `[Authorize]` + `Program.cs` policies, cross-checked with PRD §6. Policy expansions documented in the harness `API_ACCESS` comments.

---

## Frontend route authorization (Layer B) — PASS

- **Route-map completeness:** all 27 protected route segments in `App.jsx` have a matching entry in `config/routeRoles.js` `SECTION_ROLES`. No route silently defaults to `'*'` → no hidden access holes.
- **Live guard checks (`RoleGuardedOutlet`):**
  - Student → `/users` → **Access Denied** ✓ (the originally-reported cross-role page bleed)
  - Finance → `/reports` → **Access Denied** ✓
  - Auditor → `/reports` → **renders** ✓ (positive control)

---

## Auth chaos — PASS

**Cross-role back-button bleed (originally-reported bug #2):**
Reproduced the exact scenario — Auditor renders `/reports`, navigate to `/dashboard`, switch session to Student, press browser **Back** to `/reports`. Result: **Access Denied, no Reports content leaked.** The `pageshow`/bfcache reload + `RoleGuardedOutlet` re-evaluation correctly catch the role change. Fixed.

---

## Phase 1 re-verification — PASS

| Claim | Result |
|-------|--------|
| Case-sensitive username login | `Registrar` (caps) → 401; `registrar` → 200 ✓ |
| Generic auth errors (no stack/route leak) | 401 body = `{"error":"You need to sign in to continue.","code":"AUTH_REQUIRED"}` — no stack trace/route ✓ |
| Student form Gender includes "Prefer not to say" | Options: Male, Female, Other, Prefer not to say ✓ |
| Backend API authorization (Phase 1 hardening) | 133/133 enforced ✓ |
| Frontend route authorization | Complete + live-verified ✓ |
| Back/forward + bfcache cross-role bypass | Fixed + live-verified ✓ |

---

## Conclusion (Wave 1)

Wave 1 found **zero product defects**. The application's authorization (backend and frontend) is PRD-aligned and the two originally-reported security bugs are confirmed fixed on the live app. The only defects were in the test harness itself (wrong expectations + a GET-body bug + burst flakiness), now corrected so the matrix is trustworthy and re-runnable.

---

# Wave 2 — Per-role navigation + all 7 dashboards

**Execution:** logged in as each of the 7 roles; loaded the dashboard and swept the data-heavy list pages; checked render, role-scoped nav, metrics, empty/error states, console errors.

## All 7 dashboards — PASS

| Role | Nav items | Dashboard metrics (live) | Errors |
|------|-----------|--------------------------|--------|
| ITAdmin | 26 (full) | TOTAL USERS 26, tickets… | none |
| Student | 14 | ENROLLED 2, CGPA 9.00, NOTIFICATIONS 8 | none |
| Instructor | 12 | MY SECTIONS 0, MY COURSES 0 (see N-1) | none |
| Registrar | 13 | APPLICANTS 2, STUDENTS 4, SECTIONS 0 (see N-1) | none |
| DeptAdmin | 10 | PROGRAMS 2, COURSES 6, SECTIONS 5, ROOMS 3, INSTRUCTORS 3 | none |
| Finance | 7 | INVOICES 3, PENDING 1, PAID 1, SCHOLARSHIPS 1, FEES 2 | none |
| Auditor | 7 | AUDIT LOGS 100, KPIS 4 (READ-ONLY badge) | none |

Each role's sidebar shows exactly its permitted sections (matches `routeRoles.js`).

## Section sweep (as ITAdmin) — PASS

`/users` (26 rows), `/students` (4), `/courses` (6 + filters), `/audit-log` (7), `/tickets` (1 card), `/sections` (course+term selector by design), `/invoices` (search-by-student by design). No page crashed; no error-boundary fallback; no DOM error text.

## Observations (not product bugs)

- **N-1 (seed/term alignment):** the seed created operational rows (sections, enrollments, assessments) in term **2026-Fall**, but the app's "current term" is **2026-Spring**, so term-scoped dashboard counts (Instructor MY SECTIONS, Registrar SECTIONS) read 0. Non-term-scoped views (DeptAdmin SECTIONS 5) show the data. Consider seeding in the current term (or both) to make every dashboard metric populate for testing. Tracked for Wave 4.
- **Stale console noise:** earlier in the session the console showed `ReferenceError: Outlet is not defined (AppLayout.jsx:50)` and `Login failed for ITAdmin`. Verified these were **stale**: the current `AppLayout.jsx` (21 lines) imports/uses `RoleGuardedOutlet` and has no `Outlet` reference; the line-50 target no longer exists; a clean reload renders every dashboard with no such error. The `Login failed` lines were from the pre-fix Wave 1 burst. No current runtime error.

**Wave 2 result: zero product defects.**

---

# Wave 3 — Form-validation matrix

**Execution:** drove backend DTO validators directly via API (deterministic source of truth for data integrity), POSTing invalid payloads (must reject) and valid/boundary payloads (must accept); then spot-checked the frontend form error surfacing. Validators read from `EduLearn.API/DTOs/Create*.cs`.

## Rejection matrix (invalid input must be rejected) — 19/19 PASS

| Form | Invalid case | Result |
|------|--------------|--------|
| User | username `_bad` (regex) | 400 `Username` |
| User | fullName `John123` (digits) | 400 `FullName` |
| User | email `notanemail` | 400 `Email` |
| User | password `short` (<8) | 400 `Password` |
| User | phone `123` (≠10 digits) | 400 `Phone` |
| User | duplicate username `admin` | 409 `DUPLICATE_USERNAME` |
| Student | term `Fall 2026` (wrong format) | 400 `EntryTerm` |
| Student | gender `M` (not in enum) | 400 `Gender` |
| Course | code `cs101` (lowercase) | 400 `Code` |
| Course | credits `0` / `13` (range 1-12) | 400 `Credits` (both) |
| Assessment | maxScore `0` / `10000` (range 0.1-9999.9) | 400 `MaxScore` (both) |
| Scholarship | amount `0` / `-5` (≥0.01) | 400 `Amount` (both) |
| Scholarship | validFrom > validTo | 400 `INVALID_DATE_RANGE` |
| Payment | amount `0` / `-5` (≥0.01) | 400 `Amount` (both) |
| Fee | effectiveFrom > effectiveTo | 400 `INVALID_DATE_RANGE` |

## Accept / boundary matrix (valid input must be accepted) — 5/5 PASS

| Case | Result |
|------|--------|
| Course valid + credits = 1 (lower boundary) | 201 |
| Course credits = 12 (upper boundary) | 201 |
| Assessment maxScore = 0.1 (lower boundary) | 201 |
| Assessment maxScore = 9999.9 (upper boundary) | 201 |
| Enroll into nonexistent section | 400 `SECTION_NOT_FOUND` (correctly rejected) |

## Frontend form surfacing — PASS

On `/courses/new`: empty submit is blocked by HTML5 `required` (stays on form, fields flagged). An invalid code (`cs101`) submit surfaces a friendly alert — *"Please check your input. We couldn't process that request."* — stays on the form, **no raw stack/route leak.**

## Observation (low severity, not a bug)

- **O-1 (UX polish):** the frontend shows a *generic* error on a 400, even though the backend returns the specific offending field (`errors.Code`). Field-level inline messages would improve UX. Data integrity is unaffected — the bad submission is correctly blocked.

**Wave 3 result: zero data-integrity defects** (24/24 validation checks pass).

**Next:** Wave 4 (end-to-end workflows on seeded data).
