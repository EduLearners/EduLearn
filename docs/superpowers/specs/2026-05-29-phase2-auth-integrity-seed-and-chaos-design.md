# Phase 2 — Auth/Session Integrity, Comprehensive Seed & Live Chaos Verification (Design Spec)

**Date:** 2026-05-29
**Branch:** `DepAdmin_Fix`
**Project:** EduLearn (ASP.NET Core 8 API + React/Vite client)
**Status:** Design APPROVED by user for the auth-integrity fix (Parts A–D, centralized route-role map). Sequence approved: auth fix → seed → live chaos pass.

> Trust-reset note: Phase 1 marked the back/forward fix "done" based on code review + a passing build. Those cannot catch browser-history/bfcache or client-routing-authorization bugs. This phase verifies **in a real browser** and reports each issue with cause + criticality before claiming anything fixed.

---

## 1. Live findings (reproduced in a real browser, with evidence)

Tested against the running app (frontend :5173, backend :5001) using the managed preview browser. Logged in as `admin`, opened `/users` (23 user rows shown), logged out, logged in as `student`, navigated to `/users`.

| # | Issue | Layer | Root cause (file) | Criticality |
|---|-------|-------|-------------------|-------------|
| 1 | **Cross-role page+data restore via bfcache.** After logout + new login, pressing browser Back restores the previous user's *painted* page (incl. their data) from the back/forward cache; React never re-runs so guards never fire. | Frontend | `authService.logout()` only clears storage; no `Cache-Control: no-store`, no `pageshow`/`persisted` re-validation (`services/authService.js`, `main.jsx`/`App.jsx`). | **Critical ~95%** |
| 2 | **No frontend route authorization on ~37 of 40 routes.** A Student rendered the admin "User Management" screen (with "Create User" button + filters) by URL. Only `/reports`, `/kpis`, `/audit-log` are role-gated. Backend 403s the *data* (table was empty), but the wrong-role UI shell is exposed. | Frontend | `App.jsx` routes lack `allowedRoles` except 3. | **High ~70%** |
| 3 | **Logout uses push navigation.** `history.length` grew 2→3→4 across logout; authed URLs remain in the back-stack, enabling #1/#2 via Back. | Frontend | Logout navigates without `{ replace: true }` (`components/Layout/Navbar.jsx`). | **High ~75%** (enabler) |
| 4 | Back while still logged in lands on public landing `/` (valid session). | Frontend | `/` intentionally not wrapped in `PublicOnlyRoute`. | Low ~20% (cosmetic) |

**Backend authorization for this cluster tested sound** (student → `GET /api/users` returned 403 / 0 rows). The cluster is a **frontend routing + browser-cache** problem, not a backend one. (Per-endpoint backend authz will still be swept in the chaos pass.)

Evidence captured: screenshots of admin on User Management (23 rows) and Student rendering the same "User Management" shell.

---

## 2. Approved fix — Auth & Session Integrity (Parts A–D)

Internship-scoped, minimal, no overengineering. No global state store exists (data is per-page `useState`), so no state-management rework is needed.

### Part A — Defeat bfcache restore (fixes #1)
Add a `pageshow` listener at the app root (`main.jsx` or a small `useBfcacheGuard` hook mounted in `App.jsx`): if `event.persisted` is true, the page was restored from bfcache → `window.location.reload()`. Forces React + route guards to re-run with the *current* session. ~10 lines.

### Part B — Authoritative logout (fixes #3)
`Navbar` logout calls `authService.logout()` then `navigate('/login', { replace: true })`. Evaluate (and document) whether a hard `window.location.replace('/login')` is preferable to fully tear down React state on sign-out; default to `navigate(..., {replace:true})` + Part A guard.

### Part C — Frontend route authorization for ALL sensitive routes (fixes #2)
Create `edulearn.client/src/config/routeRoles.js` exporting a single `ROUTE_ROLES` map, derived from the **Sidebar `NAV_ITEMS`** (the team's existing role→section design) unioned across roles, plus sub-route nuances. `ProtectedRoute` (or a thin wrapper applied in `App.jsx`) looks up the matched route and passes `allowedRoles`; wrong role → existing `AccessDeniedPage`. `'*'` = any authenticated user.

**ROUTE_ROLES matrix (derived from `Sidebar.jsx` NAV_ITEMS + backend authorize attrs):**

| Route (pattern) | Allowed roles |
|---|---|
| `/dashboard`, `/profile` | `*` (any authenticated) |
| `/notifications`, `/tickets` | `*` (all 7 roles have the nav item) |
| `/enrollment` | Student, Registrar, ITAdmin |
| `/timetable` | Student, Instructor, Registrar, ITAdmin |
| `/courses`, `/courses/*` | Student, Instructor, Registrar, DeptAdmin, ITAdmin |
| `/assessments`, `/assessments/*` | Student, Instructor, ITAdmin |
| `/submissions` | Student, Instructor, ITAdmin |
| `/submissions/:id/submit` | Student, ITAdmin |
| `/submissions/:id/grade` | Instructor, ITAdmin |
| `/contents`, `/contents/*` | Student, Instructor, ITAdmin |
| `/syllabi` | Student, Instructor, Registrar, DeptAdmin, ITAdmin |
| `/discussions` | Student, Instructor, Registrar, DeptAdmin, ITAdmin |
| `/transcripts` | Student, Registrar, ITAdmin |
| `/invoices` | Student, Finance, ITAdmin |
| `/programs`, `/programs/*` | Student, Registrar, DeptAdmin, ITAdmin |
| `/grade-changes` | Instructor, Auditor, ITAdmin |
| `/students`, `/students/*` | Instructor, Registrar, DeptAdmin, ITAdmin |
| `/applicants`, `/applicants/*` | Registrar, ITAdmin |
| `/sections`, `/sections/*` | Registrar, DeptAdmin, ITAdmin |
| `/rooms`, `/rooms/*` | DeptAdmin, ITAdmin |
| `/fees` | Finance, ITAdmin |
| `/payments` | Finance, ITAdmin |
| `/scholarships` | Finance, ITAdmin |
| `/reports`, `/kpis`, `/audit-log` | Auditor, ITAdmin |
| `/users`, `/users/*` | ITAdmin |

> Note: `/students` includes Instructor because the Sidebar grants instructors a Students view; the backend further restricts data. Sub-routes inherit their base section's roles except the two `/submissions/:id/*` distinctions above. Where a sidebar nav and backend policy disagree (e.g., DeptAdmin timetable was removed in phase4-fix-17), the **stricter** set wins; these are enumerated during implementation by cross-checking each controller's `[Authorize]`.

### Part D — Re-verify live across role pairs
Re-run the exact browser repro for ≥4 role pairs (admin→student, finance→instructor, registrar→auditor, deptadmin→student): after the fix, Back/forward and direct-URL to an out-of-scope route must show AccessDenied (or redirect), never the wrong-role shell or restored data. Capture screenshots.

**Explicitly OUT (YAGNI):** no global state library, no httpOnly-cookie migration, no server-side session store, no broad cache-header rework beyond Part A.

---

## 3. Comprehensive seed (PowerShell, extends `tests/seed-manual-users.ps1`)

**Goal:** populate realistic, fully-linked data so all 7 roles can be tested end-to-end in proper flow order. Idempotent; re-runnable.

**Mechanism:** PowerShell calling the real API as the appropriate role (so every row is backend-validated), with `sqlcmd` used ONLY to promote registered users to privileged roles (C-26 forces register→Student) and set MFAEnabled=0 for direct login.

**Volume target — "lean but complete"** (enough to exercise every screen, lists non-trivial):
- Users: the 7 role accounts (already) + extra students (≥4 total students) and ≥2 instructors.
- Programs: 2–3 (e.g., BTech CS, BTech EE).
- Courses: 6–8 across programs, including a prerequisite chain.
- Rooms: 3.
- Students: ≥4 (each = User[role=Student] + Student row linked by UserID + Program + entryTerm).
- Sections: 4–6 (mix of small capacity for waitlist/enroll tests + standard 60), with `scheduleJSON` for timetable conflict tests.
- Enrollments: several (multiple students × sections, incl. a drop).
- Assessments: 4–6 (mix Draft/Published) on courses, with `instructionsURI`.
- Content: 2–3 per a couple courses.
- Submissions: several (student submits; instructor grades 1–2).
- Applicants: 2 (one advanced to UnderReview/Accepted).
- Fees: 1 schedule per (program, term).
- Scholarships: 1–2 (validFrom ≤ today).
- Invoices: generate for ≥2 students (term matching fees + scholarships).
- Payments: 1–2 (one partial, one full) to exercise invoice status transitions.
- Notifications: a few via `/api/notifications/test` (ITAdmin).
- Tickets: 1–2 (student creates; ITAdmin assigns/resolves).
- Transcripts: generate for ≥1 student (then publish).

**Creation order** (validated against smoke modules): users(+promote) → programs → courses → rooms → students → sections → enrollments → assessments → content → submissions → applicants → fees → scholarships → invoices → payments → notifications → tickets → transcripts.

**Entity facts to honor** (from data-model exploration): term format `^\d{4}-(Spring|Summer|Fall|Winter)$`; Gender allows "Prefer not to say"; Student requires pre-existing User(role=Student) via `userID` FK; Section instructor must be a User with Instructor role; assessment update only when Draft; scholarship validFrom ≤ today to apply at invoice generation; enums per the model (AssessmentType/Status, PaymentMethod, etc.).

**Deliverable:** `tests/seed-sample-data.ps1` (new) + keep `tests/seed-manual-users.ps1` for the accounts, or fold accounts into the new script. Prints a summary of created IDs and the credentials table.

---

## 4. Live chaos / QA verification methodology

**Driven by Claude in a real browser, live, so the user can view it.** For every role, in proper flow order, exercise every feature; attempt to break each (invalid input, boundary values, wrong-role access, empty states, double-submit, back/forward, direct URL). For each issue: report **what, where, root cause, why it matters, criticality %, and whether frontend/backend**. User approves fixes before they're made.

**Coverage checklist (must miss nothing):**
- **Auth & session:** login (case-sensitive), logout, back/forward, cross-role (post-fix), MFA enable/disable, forgot/reset password, PublicOnlyRoute.
- **All 7 dashboards:** metrics/stat cards correctness, error surfacing, keyboard a11y, navigation.
- **Per role, all sections:** Users, Applicants, Students, Sections, Rooms, Enrollment, Timetable, Transcripts, Programs, Courses, Syllabus, Discussions, Assessments, Submissions, Grade Changes, Contents, Fees, Invoices, Scholarships, Payments, Reports, KPIs, Audit Log, Notifications, Tickets, Profile.
- **All forms — full validation pass:** required fields, format/regex (term, gender, phone, course code, email, URLs), min/max bounds (capacity, credits, amounts, maxScore), date-range rules (fees, scholarships), enum selects, duplicate handling (username/email/course code), server-error surfacing, friendly-error rendering, no route/stack leakage.
- **Workflows end-to-end:** admissions (applicant→accept), academic (program→course→section→enroll→assess→submit→grade→transcript), finance (fee→scholarship→invoice→payment), KPI/metrics & audit log, notifications & tickets lifecycle.
- **UI/UX:** loading states, empty states, pagination/large lists, responsive layout, focus/keyboard, ARIA on menus, code-split chunk loads, no console errors.

**Output:** a running findings log (`docs/superpowers/reports/2026-05-29-phase2-chaos-findings.md`) with the table format above; fixes batched/approved per the user's review.

**Smoke-suite update:** as backend/route changes land (and any bug fixes), update the bash smoke suite + add coverage so it stays green and reflects new behavior.

---

## 5. Sequencing (approved)
1. **Auth & session integrity fix (Parts A–D)** — implement now, verify live. *(approved: "fix immediately")*
2. **Comprehensive seed** — build `tests/seed-sample-data.ps1`, run it, confirm data via API/UI.
3. **Live chaos pass** — role-by-role, report→approve→fix loop; update smoke suite.

Each subsequent sub-project (seed, chaos) may get its own implementation plan via writing-plans before execution.

---

## 6. Constraints (carry-forward)
Internship scope; no overengineering; no breaking existing functionality; secrets stay in appsettings; Node/PowerShell/bash tooling only (no Python); commit messages contain NO "Co-Authored-By"; read real files — no assumptions; verify in a real browser before claiming fixed.
