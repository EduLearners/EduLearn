# Phase 1 — Bug-Fix & Hardening (Design Spec)

**Date:** 2026-05-29
**Branch base:** `DepAdmin_Fix`
**Project:** EduLearn University Management System (ASP.NET Core 8 API + React/Vite client)
**Scope:** Phase 1 of a two-phase effort. Phase 2 (test coverage, UI/UX QA pass, performance) is a separate spec.

---

## 1. Purpose

Fix a focused set of correctness, security, and UX issues drawn from three sources:

1. The user's reported issues (back/forward auth bypass, error handling on backend crash/disconnect, logging, user-friendly error messages, leaked API routes).
2. A newly reported **critical login bug**: usernames are matched case-insensitively (`Admin` logs in as `admin`).
3. The **High** and **Medium** findings from the two architecture reviews (`EduLearn_API_Review` and `EduLearn_UI_Review`) — limited to items that fit the project's internship scope.

Plus a new requirement: a **polished, user-facing error-presentation experience** — one reusable alert plus dedicated Access-Denied and crash pages — written for end users (all 7 roles), never for developers.

### Guiding constraints

- **Internship scope.** No overengineering. Changes must be explainable to an evaluator.
- **No behaviour changes** to working features — except the one explicitly requested (case-sensitive username login).
- **No assumptions.** Every file is read on the current branch before it is edited; only what genuinely exists is changed.

---

## 2. Goals / Non-Goals

### Goals
- Close the auth back/forward bypass and the case-insensitive username bug.
- Make every error the user can hit (operational error, crash, out-of-scope route) resolve to a clear, friendly, consistently-styled message — with actionable guidance and no leaked status codes or API routes.
- Apply the low-risk High/Medium fixes from both reviews that do not change behaviour or break the existing smoke suite.

### Non-Goals (explicitly out of Phase 1)
- **All test writing and UI/UX QA** → Phase 2.
- **Performance work requiring API-contract changes** — pagination, StudentDashboard N+1 batch endpoint → skipped (internship scope).
- **JWT → httpOnly cookies** — keep `localStorage`; documented as a known limitation.
- **Moving secrets out of `appsettings.json`** — mentor instructed they stay.
- **Rate-limiting on auth** and **`api/content` → `api/contents` route rename** → deferred to Phase 2 (the bash smoke suite exercises both and would break; route + tests must change together).
- **PropTypes / TypeScript adoption** — overengineering for this project.
- Backend controller-level structured logging expansion (Low severity; backend already has `GlobalExceptionMiddleware` + audit logging).

---

## 3. Themes & Changes

> File paths are the expected locations from exploration. Each will be re-read and confirmed before editing; if a referenced construct differs on the current branch, the implementation adapts rather than assumes.

### Theme A — Authentication correctness

**A1. Back/Forward auth bypass**
- *Problem:* `LoginPage` uses `navigate('/dashboard')` (history push) and there is no guard on the public auth pages, so Back shows the login form and Forward returns to the dashboard without re-auth.
- *Fix:*
  - `pages/LoginPage.jsx` — change post-login and MFA navigations to `navigate(..., { replace: true })`.
  - New `components/PublicOnlyRoute.jsx` — if `authService.isAuthenticated()`, redirect to `/dashboard` (`replace`); otherwise render children.
  - `App.jsx` — wrap `/login`, `/mfa/setup`, `/mfa/verify`, `/forgot-password`, `/reset-password` with `PublicOnlyRoute`.
- *Why it's enough:* `ProtectedRoute` already re-checks `isAuthenticated()` on every render, so a Back press after logout cannot reveal a protected page; `PublicOnlyRoute` closes the inverse (authenticated user reaching a public page via history).

**A2. Case-sensitive username login (critical)**
- *Problem:* `UserRepository.GetByUsernameAsync` uses `u.Username == username`; SQL Server's default `CI` collation makes `'Admin' == 'admin'` true, so any casing logs in.
- *Fix:* In `Services/AuthService.cs` `LoginAsync`, on the **username** path only, after fetching the user, if `!string.Equals(user.Username, dto.UsernameOrEmail, StringComparison.Ordinal)` set `user = null` **before** the BCrypt verify. Email path stays case-insensitive (email convention).
- *Preserves:* The C-24 anti-timing-enumeration hardening — the dummy-hash `BCrypt.Verify` still runs when `user` is null, so response timing is unchanged.
- *No schema/migration change.*

### Theme B — Resilient errors & user-friendly messages

**B1. Error resolver — `utils/errorMessage.js` (new)**
- `getFriendlyError(error)` returns a structured model: `{ category, title, message, guidance }`.
- `category ∈ network | server | forbidden | notFound | validation | unknown`.
- Mapping:
  - Interceptor `_userMessage` present (timeout / `ERR_NETWORK`) → `network`.
  - No response / `ERR_NETWORK` → `network`: "Connection problem" / "We couldn't reach the server." / "Check your internet connection and try again."
  - `5xx` → `server`: "Something went wrong" / "An unexpected problem occurred on our side." / "Please try again in a few minutes. If it keeps happening, contact your department admin."
  - `403` → `forbidden`: "Access denied" / "Your account doesn't have access to this." / "If you think this is a mistake, contact your department admin."
  - `404` → `notFound`: "Not found" / "We couldn't find what you were looking for." / "It may have been moved or removed."
  - `400 / 409 / 422` → `validation`: use the backend's `{ error }` text (the API already returns a clean `{ error, code }` contract), with a safe generic fallback.
  - Anything else → `unknown` with a generic safe message.
- **Sanitiser:** before returning, scrub any message that contains an API path or route pattern (e.g. matches `/\/api\//i` or `^(GET|POST|PUT|PATCH|DELETE)\s+\//`) and replace it with the category's generic message. Status codes are never shown to the user.

**B2. `components/ErrorAlert.jsx` — consume the resolver**
- Render `title` + `message` + `guidance` with consistent, polished styling (icon, heading, body, guidance line) instead of a raw single string.
- Currently `_userMessage` is ignored — now handled via the resolver.
- The Development-only `detail` / `exceptionType` block may remain (it is dev-gated by the backend) but must never feed the user-facing primary message, and must sit visually subordinate.

### Theme C — Unified user-facing error presentation (new requirement)

A single error model (B1) rendered across three surfaces, consistent for all 7 roles:

**C1. Inline — enhanced `ErrorAlert`** (B2). The default for form/page operational errors.

**C2. `pages/AccessDeniedPage.jsx` (new) — out-of-scope route access**
- *Problem:* `ProtectedRoute` silently `<Navigate to="/dashboard">` on wrong role — the user gets no explanation.
- *Fix:* On the wrong-role branch, render `AccessDeniedPage` **in place** (inside the normal `AppLayout`, navbar + sidebar intact — "professional software" feel).
- Role-aware copy from `authService.getCurrentUser().role`: "You're signed in as **{role}**. This area isn't available to your account." + guidance to contact the department admin + a "Back to dashboard" button.
- `components/ProtectedRoute.jsx` — replace the wrong-role `<Navigate>` with `<AccessDeniedPage />`. The unauthenticated branch is unchanged (still redirects to `/login`).

**C3. Crash — `ErrorFallbackPage` (restyle existing)**
- Already wired to the app-root `ErrorBoundary`. Restyle to match the new alert/Access-Denied visual language; friendly copy + reload/reset action. No structural change to `ErrorBoundary`.

**C4. API 403** — handled by the resolver's `forbidden` category, so a 403 returned during an action shows the same friendly message family.

**Decision:** No global toast / notification system in Phase 1 (chosen for simplicity and maintainability).

### Theme D — Frontend logging

**D1. `utils/logger.js` (new)** — a thin single-choke-point wrapper over `console` (`logger.error / warn / info`). Keeps a consistent prefix; `info` can be quieted in production builds. Intentionally minimal.

**D2. Wire into silent catches** — form-page `catch` blocks that currently only `setError(err)` and the dashboard `catch` blocks (Theme E) call `logger.error(...)` so failures are traceable. No backend logging changes (already adequate).

### Theme E — Dashboard reliability

**E1. Silent catch blocks** — `components/Dashboard/StudentDashboard.jsx` and `InstructorDashboard.jsx` currently end `loadData()` with `catch { }`. Replace with `catch (err) { setError(err); logger.error(...); }` and render `<ErrorAlert error={error} />` above the cards.

**E2. Stat-card keyboard accessibility** — `StudentDashboard` stat cards are clickable `<div>`s with no keyboard support. Add `role="button"`, `tabIndex={0}`, and an `onKeyDown` (Enter / Space) handler — copying the pattern `InstructorDashboard` already uses.

### Theme F — Backend correctness (no behaviour change)

**F1. Gender `MaxLength`** — change `[MaxLength(10)]` → `[MaxLength(20)]` on the Gender field in `DTOs/CreateStudentDto.cs`, `DTOs/UpdateStudentDto.cs`, and `Models/Student.cs`; add an EF migration to widen the column. (Unblocks the valid 18-char value "Prefer not to say".)

**F2. CORS environment guard** — `Program.cs`: keep `AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod()` when `app.Environment.IsDevelopment()`; outside Development restrict to origins from configuration. No secret changes; dev workflow unchanged.

**F3. N+1 queries** — add eager loading in repositories and remove the per-item `foreach` lookups in the controllers:
- `Repositories/Implementations/SectionRepository.cs` — `.Include(s => s.Course).Include(s => s.Instructor)` in the list query (and the by-instructor query); simplify `SectionsController` accordingly.
- `Repositories/Implementations/InvoiceRepository.cs` — `.Include(i => i.Student)`; simplify `InvoicesController`.
- Verify response shape is unchanged.

**F4. `?? "0"` claim fallback** — replace `int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0")` with `if (!int.TryParse(..., out var callerId)) return Unauthorized();` in the affected controllers (`StudentsController`, `SubmissionsController`, `EnrollmentsController`, `TranscriptsController`, `InvoicesController` — confirmed per file before editing).

**F5. Assessment summary/code contradiction** — in `AssessmentsController.UpdateAssessment`, fix the XML `<summary>` to match the actual behaviour ("Only Draft assessments can be updated"). The runtime check is **not** changed (would alter behaviour).

### Theme G — Frontend cleanup (low-risk)

**G1. `TERM` constant** — new `config/academic.js` exporting `CURRENT_TERM = '2026-Spring'`; import in both dashboards, removing the duplicated literal.

**G2. Dead `courseService` methods** — delete `getSyllabus`, `updateSyllabus`, `getPrerequisites`, `addPrerequisite`, `removePrerequisite` (call non-existent routes). Grep-confirm no callers before deleting.

**G3. `AssessmentFormPage` useEffect deps** — add the missing `[isInstructor, userId]` dependencies (or an explicit, commented `eslint-disable` if intentional).

**G4. `LoginPage` polish** — `autoComplete="off"` → `username` / `current-password` so password managers work; remove the unreachable second validation check.

**G5. Navbar dropdown ARIA** — add `aria-haspopup`, `aria-expanded`, and `role="menu"`/`menuitem` to the avatar dropdown.

**G6. JWT decode resilience** — `authService` decode tolerates both long-form (ASP.NET claim URIs) and short-form claim names, so a backend claim-format change can't silently break identity.

**G7. Code-splitting** — wrap page imports in `App.jsx` with `React.lazy` and a `<Suspense fallback={<Loading />}>` around the routes; add `useMemo` to the `Sidebar` nav-filter. (High-severity bundle-size finding; mechanical and low-risk.)

### Theme H — Stop leaking API routes (backend)

**H1. JWT challenge/forbidden handlers** — `Program.cs` `JwtBearerEvents.OnChallenge` / `OnForbidden`: remove the `endpoint` field and the literal "POST /api/auth/login" guidance from the client JSON. Return a generic `{ error, code, statusCode }` ("Authentication required." / "You don't have permission to perform this action."). The frontend sanitiser (B1) is the defence-in-depth backstop.

### Theme I — MFA secret masking (optional, chosen)

**I1.** On the profile MFA-setup screen, render the raw TOTP secret behind a mask/reveal toggle (hidden by default after the QR is shown), and avoid keeping it in component state longer than the modal is open. Self-contained; no flow change.

---

## 4. New / Changed Files (summary)

### Frontend (`edulearn.client/src`)
| File | Change |
|---|---|
| `utils/errorMessage.js` | **New** — `getFriendlyError` resolver + route/status sanitiser |
| `utils/logger.js` | **New** — minimal console wrapper |
| `config/academic.js` | **New** — `CURRENT_TERM` |
| `components/PublicOnlyRoute.jsx` | **New** — guard for public auth pages |
| `pages/AccessDeniedPage.jsx` | **New** — role-aware 403 page |
| `components/ErrorAlert.jsx` | Consume resolver; polished title/message/guidance |
| `components/ProtectedRoute.jsx` | Wrong-role → render `AccessDeniedPage` in place |
| `components/ErrorFallbackPage.jsx` | Restyle to match |
| `pages/LoginPage.jsx` | `replace` navigation; autoComplete; remove dead validation |
| `App.jsx` | `PublicOnlyRoute` wrappers; `React.lazy` + `Suspense` |
| `components/Dashboard/StudentDashboard.jsx` | Error handling; stat-card a11y; `CURRENT_TERM` |
| `components/Dashboard/InstructorDashboard.jsx` | Error handling; `CURRENT_TERM` |
| `components/Layout/Sidebar.jsx` | `useMemo` nav filter |
| `components/Layout/Navbar.jsx` | Dropdown ARIA |
| `pages/assessments/AssessmentFormPage.jsx` | useEffect deps |
| `pages/ProfilePage.jsx` | MFA secret mask/reveal |
| `services/courseService.js` | Delete 5 dead methods |
| `services/authService.js` | Tolerant JWT claim decode |
| Form-page `catch` blocks | `logger.error` where currently silent |

### Backend (`EduLearn.API`)
| File | Change |
|---|---|
| `Services/AuthService.cs` | Case-sensitive username check (ordinal) |
| `Program.cs` | CORS env guard; strip routes from JWT 401/403 JSON |
| `DTOs/CreateStudentDto.cs`, `DTOs/UpdateStudentDto.cs`, `Models/Student.cs` | Gender `MaxLength(20)` |
| `Migrations/*` | New migration widening Gender column |
| `Repositories/Implementations/SectionRepository.cs`, `InvoiceRepository.cs` | `.Include()` eager loading |
| `Controllers/SectionsController.cs`, `InvoicesController.cs` | Remove `foreach` lookups |
| `Controllers/StudentsController.cs`, `SubmissionsController.cs`, `EnrollmentsController.cs`, `TranscriptsController.cs`, `InvoicesController.cs` | `TryParse` + `Unauthorized()` |
| `Controllers/AssessmentsController.cs` | Fix XML summary wording |

---

## 5. Verification (Phase 1)

Automated test writing is Phase 2; Phase 1 is verified manually plus by keeping existing suites green.

- **Login case-sensitivity:** `admin` + correct password → success; `Admin` / `ADMIN` → "Invalid username or password". Email login still case-insensitive.
- **Back/forward:** log in → Back → does not show login form (bounced to dashboard); after logout → Back → cannot reach a protected page.
- **Error presentation:** with the backend stopped, submit a form → friendly "Connection problem" alert (no `Network Error`, no status code). Force a 500 → "Something went wrong" + guidance. No message contains `/api/...`.
- **Access denied:** sign in as Student, navigate to a Registrar-only route → role-aware Access-Denied page in place (not a silent redirect).
- **Gender:** create/update a Student with "Prefer not to say" → succeeds.
- **N+1:** Sections/Invoices list endpoints return identical payloads with fewer queries (spot-check via logs/Swagger).
- **Regression:** the backend **NUnit** suite (`EduLearn_Testing`, 282 tests) and the **bash smoke suite** (`tests/smoke/`) still pass — confirming no behaviour/contract break. (Rate-limiting and the content-route rename are deferred precisely to keep these green.)
- **Build:** `dotnet build` clean; frontend `vite build` clean; ESLint no new errors.

---

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Case-sensitive login locks out users who relied on wrong casing | This is the requested behaviour; the seeded admin is `admin` (lowercase). Communicated as intended. |
| `React.lazy` changes load behaviour of 55+ routes | Pure mechanical wrapping + `Suspense` fallback; verify each route still mounts. |
| Removing `foreach` lookups changes a response shape | Compare payloads before/after; covered by smoke + NUnit suites. |
| Frontend sanitiser hides a genuinely useful validation message | Only `network/server/forbidden/notFound/unknown` get generic copy; `validation` (400/409/422) still shows the backend's clean `{ error }` text. |
| Access-Denied-in-place leaves the attempted URL in the address bar | Acceptable/expected for "in place" choice; "Back to dashboard" button provided. |

---

## 7. Out of Scope → Phase 2

Frontend unit/component tests (Vitest + React Testing Library), enhanced end-to-end coverage at the **browser** layer (Playwright — Node-based, no Python required) covering all 7 roles' real flows, the interactive manual UI/UX pass (driven live, fixing as we go), rate-limiting on auth, the `api/content → api/contents` rename (with smoke-suite update), and performance work beyond the safe wins already in Phase 1.
