# Phase 2 - Browser Chaos-Test Harness (Design Spec)

**Date:** 2026-05-29
**Branch:** `DepAdmin_Fix`
**Project:** EduLearn (ASP.NET Core 8 API + React 19 / Vite client, react-router v7)
**Status:** Design APPROVED by user. Next: writing-plans -> build -> run waves.

> Trust-reset note: this harness exists because "it builds / unit tests pass" did not catch real browser bugs (bfcache cross-role bleed, missing route authorization). Every check here runs against the **running app in a real browser** and reports findings with cause + criticality before any fix.

---

## 1. Goal & hard constraints

Build a **dependency-free, re-runnable browser chaos-test harness** that exercises every button, form, field, component, workflow, validation, and role-access rule across all 7 roles - frontend AND backend - using the seeded sample data, and reports each issue with cause + criticality for user approval before fixing.

**Hard constraints (from user):**
- **No installs of any kind** (no Playwright, no Vitest, no npm packages). Python is also unavailable.
- Execution uses **Claude's browser** only (the Preview / in-browser `eval` + navigate/click/screenshot/console tooling).
- Internship scope: simple, no overengineering, do not break existing functionality.
- The harness file must be plain browser JS so it ALSO runs if pasted into DevTools console (and ports to Playwright 1:1 later).

---

## 2. Architecture

**One committed artifact + Claude as the runner.**

```
tests/browser-chaos/
  chaos-harness.js     # dependency-free: all data + helpers (the "script")
  README.md            # how to run it (via Claude browser, or console paste)
```

`chaos-harness.js` attaches `window.EDU` exposing:
- **Data:** `ACCOUNTS` (role -> {user,pass}), `ROUTE_ACCESS` (frontend route -> allowed roles), `API_ACCESS` (METHOD+path -> allowed roles), `FORM_SPECS` (per form: route, fields[], invalid cases + expected error regex, submit selector, success signal), `WORKFLOWS` (ordered steps).
- **Helpers:** `api(method,path,token,body)` (fetch via the Vite proxy), `login(user,pass)`, `setSession(token,role,user)` (writes localStorage exactly like `authService.saveSession`), `assert(id,area,role,cond,expected,actual,severity)`, `softCheck(...)`, `report()` (returns JSON + summary; persisted to `localStorage['EDU_RESULTS']` so results survive reloads).

**Two execution layers:**

### Layer A - API matrix (backend), fully scriptable in one page context
A single `EDU.runApiMatrix()` call: logs in as each role via `fetch /api/auth/login`, then for every entry in `API_ACCESS` issues the request with that role's token and asserts `200/201/204` for allowed roles and `403` for forbidden. Also asserts **data isolation** (e.g., student A cannot `GET` student B's invoice; non-owner cannot read another user's notifications). No navigation -> runs to completion in one shot and returns a full matrix report.

### Layer B - UI layer (frontend), Claude-driven
Using `FORM_SPECS` / `ROUTE_ACCESS` / `WORKFLOWS`, Claude's browser:
- logs in as each role; visits every section; asserts the page renders for allowed roles and shows `AccessDeniedPage` for disallowed (mirrors the auth fix);
- exercises every form: submit empty (required errors), bad formats (regex errors), boundary values (min/max), duplicates (409 surfaced as friendly error), then a valid submit (success);
- clicks every primary action button; captures **console errors** (via `preview_console_logs`) and **screenshots** per page;
- chaos: browser back/forward, bfcache restore, direct-URL to wrong-role routes, double-submit, empty-state and loading-state presence.

**Why split:** backend authorization/data-isolation is exhaustively and cheaply checked by `fetch` (Layer A); UI behavior that needs a real DOM is checked by Claude (Layer B). Together they cover "frontend AND backend."

---

## 3. Frontend route-access matrix (Layer B)

Source of truth: `edulearn.client/src/config/routeRoles.js` (built this phase from Sidebar NAV_ITEMS). The harness asserts, for each route, that allowed roles render the page and all other roles get Access-Denied.

| Route | Allowed |
|---|---|
| `/dashboard`, `/profile`, `/notifications`, `/tickets` | all 7 |
| `/enrollment` | Student, Registrar, ITAdmin |
| `/timetable` | Student, Instructor, Registrar, ITAdmin |
| `/courses` | Student, Instructor, Registrar, DeptAdmin, ITAdmin |
| `/assessments`, `/submissions`, `/contents` | Student, Instructor, ITAdmin |
| `/syllabi`, `/discussions` | Student, Instructor, Registrar, DeptAdmin, ITAdmin |
| `/transcripts` | Student, Registrar, ITAdmin |
| `/invoices` | Student, Finance, ITAdmin |
| `/programs` | Student, Registrar, DeptAdmin, ITAdmin |
| `/grade-changes` | Instructor, Auditor, ITAdmin |
| `/students` | Instructor, Registrar, DeptAdmin, ITAdmin |
| `/applicants` | Registrar, ITAdmin |
| `/sections` | Registrar, DeptAdmin, ITAdmin |
| `/rooms` | DeptAdmin, ITAdmin |
| `/fees`, `/payments`, `/scholarships` | Finance, ITAdmin |
| `/reports`, `/kpis`, `/audit-log` | Auditor, ITAdmin |
| `/users` | ITAdmin |

Sub-routes inherit base section; `/submissions/:id/grade` = Instructor/ITAdmin, `/submissions/:id/submit` = Student/ITAdmin.

---

## 4. Backend API access matrix (Layer A) - representative

Derived from controller `[Authorize]` attributes (verified earlier). The harness encodes the full set; representative rows:

| Method + path | Allowed roles |
|---|---|
| POST `/api/users` | ITAdmin |
| POST `/api/programs` | DeptAdmin, ITAdmin |
| POST `/api/courses` | Instructor, DeptAdmin, ITAdmin |
| POST `/api/rooms` | ITAdmin |
| POST `/api/students` | Registrar, ITAdmin |
| POST `/api/sections` | ITAdmin |
| POST `/api/enrollment/enroll` | Student, Registrar, ITAdmin |
| POST `/api/assessments` | Instructor, ITAdmin |
| POST `/api/submissions` | Student, ITAdmin |
| POST `/api/submissions/{id}/grade` | Instructor, ITAdmin |
| POST `/api/applicants` | Registrar, ITAdmin |
| POST `/api/fees` / `/api/scholarships` / `/api/invoices/generate` / `/api/payments` | Finance, ITAdmin |
| POST `/api/transcripts/generate/{id}` | Registrar, ITAdmin |
| POST `/api/notifications/test` | ITAdmin |
| GET `/api/reports` / `/api/kpis` / `/api/audit-log` | Auditor, ITAdmin |

Plus **data-isolation** assertions (own-vs-other) for invoices, submissions, notifications, transcripts.

---

## 5. Form-validation matrix (Layer B) - what every form must enforce

Encoded in `FORM_SPECS`. Key rules to assert (from the DTO validators):
- **User create:** username `^[a-zA-Z0-9][a-zA-Z0-9_]*$`; fullName letters/space/'-/. only (no digits); email format; phone `^\d{10}$`; password min 8; duplicate username/email -> 409 friendly error.
- **Student:** term fields `^\d{4}-(Spring|Summer|Fall|Winter)$` (confirmed live); gender includes "Prefer not to say"; dob date.
- **Section:** term format; capacity 1-500; instructor must be Instructor role (else error); duplicate handling.
- **Course:** code regex (unique); credits 1-12; prereq chain enforced on enroll (422 PREREQUISITES_NOT_MET - confirmed live).
- **Assessment:** type enum (Assignment/Quiz/Exam); maxScore 0.1-9999.9; status lifecycle (edit only when Draft -> 400 if Published).
- **Fees:** `feeItemsJSON` valid; effectiveFrom <= effectiveTo (else INVALID_DATE_RANGE).
- **Scholarship:** validFrom <= validTo; amount > 0.
- **Payment:** amount > 0; method enum; over-pay / already-paid -> error.
- **Applicant:** status transitions Pending->UnderReview->Accepted.

For each: empty submit, each invalid case (expect specific error text/region), boundary values, then a valid submit (expect success + no console error + no raw stack/route leakage).

---

## 6. Workflows (Layer B - Wave 4)

1. **Admissions:** Registrar creates applicant -> UnderReview -> Accepted.
2. **Academic:** verify seeded enroll -> assessment published -> student submits -> instructor grades -> registrar generates + publishes transcript; grade appears for student.
3. **Finance:** Finance creates fee + scholarship -> generates invoice (amountDue reflects scholarship) -> records payment (status transitions Pending->PartiallyPaid->Paid).
4. **Support/Notifications:** student raises ticket -> ITAdmin assigns + resolves; notifications appear + mark-read.

---

## 7. Reporting (hybrid)

Each result: `{ id, area, role, expected, actual, status: pass|fail|anomaly, severity (Critical/High/Medium/Low + %), layer: frontend|backend, evidence (screenshot path / console excerpt) }`.

- **fail** = hard assertion broken (role-gating, validation, workflow) -> a real bug.
- **anomaly** = soft signal (console error, missing loading/empty/error state, a11y gap) -> logged, not gating.

Output committed to `docs/superpowers/reports/2026-05-29-phase2-chaos-findings.md` as a running table. **No fixes are applied until the user approves** the findings batch.

---

## 8. Phased delivery (run + report after each wave)

- **Wave 1:** `chaos-harness.js` skeleton + Layer A API matrix + frontend role-access matrix + auth chaos (back/forward, bfcache, logout). Highest security value first.
- **Wave 2:** per-role navigation + all 7 dashboards (render, metrics, empty/error states, console errors).
- **Wave 3:** full `FORM_SPECS` validation matrix for every form.
- **Wave 4:** end-to-end workflows on seeded data.

---

## 9. Execution model & honest limitation

Claude injects `chaos-harness.js` via `preview_eval`, calls `EDU.runApiMatrix()` (one shot) and the per-form / per-route helpers, navigating with the browser tools and reading DOM + console + screenshots. **Full-page reloads (login/logout/bfcache) reset in-page JS**, so results are persisted to `localStorage['EDU_RESULTS']` and Claude orchestrates across reload boundaries. This is inherent to running without an installed test runner; the harness remains the single source of truth for *what* is checked, so it is fully re-runnable and reviewable.

---

## 10. Constraints carried forward

No installs; Claude-browser execution only; internship scope; no breaking existing functionality; secrets stay in appsettings; commit messages contain NO "Co-Authored-By"; read real files / verify in a real browser - no assumptions; user approves findings before fixes.
