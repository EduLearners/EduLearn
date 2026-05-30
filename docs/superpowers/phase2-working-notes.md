# Phase 2 — Working Notes & Brainstorming Handoff

**Branch:** `DepAdmin_Fix`
**Last updated:** 2026-05-29
**Status:** Phase 1 COMPLETE & verified. Phase 2 brainstorming IN PROGRESS — exploration partially done, no clarifying questions asked yet, no design presented.

> This file preserves the learnings + exploration findings so the Phase 2 planning context is not lost. Resume from §5 "Where we are in the process".

---

## 1. Phase 1 status (DONE)

- 22 implementation commits `fb6e240..1d5fe53` + report `43887cc` + seed/guide `e66cefa`, all on `DepAdmin_Fix`.
- Backend tests: **299/299 pass**. Frontend build clean (91 split chunks).
- Completion report: `docs/superpowers/reports/2026-05-29-phase1-completion-report.md`
- Manual test guide: `docs/superpowers/reports/2026-05-29-phase1-manual-test-guide.md`
- Spec: `docs/superpowers/specs/2026-05-29-phase1-error-handling-and-hardening-design.md`
- Plan: `docs/superpowers/plans/2026-05-29-phase1-error-handling-and-hardening.md`
- **Confirmed LIVE on the running backend** (PID was 20500, net8): case-sensitive login rejects `Registrar`; 401 = `{error,"AUTH_REQUIRED",401}` no route; 403 = `{error,"FORBIDDEN",403}` no role/route.

### Seeded manual-test accounts (persist in EduLearnDb, MFA disabled)
Script: `tests/seed-manual-users.ps1` (idempotent). Accounts: admin/Admin@123 (ITAdmin), student/Student@123, instructor/Instructor@123, registrar/Registrar@123, deptadmin/DeptAdmin@123, finance/Finance@123, auditor/Auditor@123.

---

## 2. Phase 2 scope (deferred items from Phase 1 spec §7 + user asks)

From the Phase 1 spec's "Out of Scope → Phase 2" plus user instructions during Phase 1 brainstorming:

1. **Frontend unit/component tests** (Vitest + React Testing Library — Node-based, NO Python available on this machine).
2. **Enhanced Playwright E2E** covering all 7 roles' real flows (browser layer, Node-based).
3. **Interactive manual UI/UX pass** — user drives, fix issues as found (user chose "Interactive pass that I drive + fix as I go").
4. **Enhanced/updated bash smoke suite** — user wants it to test the whole project start-to-end across all 7 roles incl. UI/UX flow.
5. **Rate-limiting on auth endpoints** (deferred because it would break the smoke suite until the suite is updated together).
6. **`api/content` → `api/contents` route rename** (deferred for same reason — smoke module + frontend must change together).
7. **Performance** beyond Phase 1 safe wins — e.g. pagination (kept simple per internship scope).

### Hard user constraints (carry forward — verbatim intent)
- "do not make it overcomplex and overengineer anything or break the flow of the project do not break any existing functionality"
- "this is just an internship project not proper production"
- "make no assumptions or hallucinations always read the files and actual implementation before hand"
- Secrets stay in appsettings (mentor's instruction).
- "keep the changes simple and minimal do not introduce any overcomplexity as per projects scope"
- Commit messages: **NO** "Co-Authored-By" line.
- Python is NOT installed and cannot be installed → test tooling must be Node-based (Vitest/Playwright), not pytest.

---

## 3. EXPLORATION FINDINGS — CONFIRMED (read from real files this session)

### 3.1 Auth endpoints (AuthController.cs, `[Route("api/auth")]`)
10 endpoints:
- POST /api/auth/register (forces Role=Student — C-26)
- POST /api/auth/login (returns full JWT, or mfa_pending challenge for privileged roles WHEN MFAEnabled)
- POST /api/auth/mfa/setup, /mfa/confirm, /mfa/verify (require mfa_pending token)
- POST /api/auth/mfa/setup-self, /mfa/confirm-self, /mfa/disable (full JWT, privileged roles)
- POST /api/auth/forgot-password (anon, always 200)
- POST /api/auth/reset-password (anon, token-based)

### 3.2 Rate-limiting readiness
- **NONE exists** (no AddRateLimiter/UseRateLimiter/RateLimitPartition/[EnableRateLimiting], no NuGet pkg).
- TargetFramework = **net8.0** → built-in `Microsoft.AspNetCore.RateLimiting` available.
- **Program.cs middleware order:** GlobalExceptionMiddleware → Swagger(dev) → HttpsRedirection → Cors → Authentication → Authorization → MapControllers.
- `UseRateLimiter` would go **after Cors, before Authentication** (to cover anonymous auth endpoints).
- NOTE: a fixed-window limiter on `/api/auth/login` etc. will make the smoke suite's rapid-fire logins hit 429 — smoke `lib/seed.sh` logs in 8 users + re-logins; must tune limits or exempt test runs.

### 3.3 `api/content` rename blast radius
- Backend: `ContentsController.cs` line 12 `[Route("api/content")]` (SINGULAR). Sub-routes: POST /upload, GET /course/{courseId}, GET /{id}, PUT /{id}/version.
- Frontend `contentService.js` — 5 calls all use `/content...` (lines ~10,22,28,34,40).
- Frontend UI routes already PLURAL (`/contents`) in App.jsx — only API strings change.
- Smoke suite references `api/content` in `tests/smoke/modules/10_content.sh` (exact line still to be confirmed — see §4 pending).
- No other backend controller references the content route.

### 3.4 Pagination
- **NONE exists** (no [FromQuery] paging, no Skip/Take, no page/pageSize anywhere).
- Unbounded GetAll endpoints: Students `GET /api/students`, Users `GET /api/users`, Courses `GET /api/courses`, Assessments `GET /api/assessments/course/{id}`, Submissions `GET /api/submissions/assessment/{id}` and `/student/{id}`, Content `GET /api/content/course/{id}`.
- Frontend `StudentsPage.jsx` / `UsersPage.jsx`: client-side filtering only (useMemo/.filter), NO pagination UI, load all rows at once.

### 3.5 Error contract (confirms Phase 1 assumptions)
- `GlobalExceptionMiddleware.cs`: returns `{ error, statusCode, timestamp, traceId }` always; adds `exceptionType` + `detail` **dev-only**. Generic user message in all cases.
- Controllers use `{ error, code }` envelope; success returns DTO directly.
- JWT 401/403 handlers (Phase 1) return generic `{ error, code, statusCode }`.

### 3.6 Other facts confirmed earlier this session
- `DbInitializer.cs` seeds ONLY `admin`/`Admin@123` (ITAdmin, MFA off). Idempotent.
- `tests/smoke/lib/seed.sh` registers 8 users with **timestamped usernames** + SQL-promotes 6 privileged roles + sets MFAEnabled=1 for 5 of them (uses fixed TOTP secret `JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP` matching DbInitializer.DefaultAdminMfaSecret + `lib/totp.sh`). Password `Passw0rd!Seed`.
- `CreateUserDto`: Username regex `^[a-zA-Z0-9][a-zA-Z0-9_]*$`, FullName letters/space/'-/. only (NO digits), Password MinLength(8) only, Phone optional 10 digits, Role required, SendInvite default true.
- `AuthService.LoginAsync`: privileged roles only challenged for MFA **when `user.MFAEnabled==true`**; else direct JWT. POST /api/users (ITAdmin) creates users with MFAEnabled=false default → direct login.
- Program.cs has `JsonStringEnumConverter` → role accepted as string ("Registrar").
- Role-gated frontend routes (ProtectedRoute allowedRoles): `/reports`, `/kpis`, `/audit-log` → **Auditor, ITAdmin** only. (`/users` not frontend-gated; backend 403s.)
- `tests/smoke/run-all.sh`: probes `/swagger/v1/swagger.json`; runs `seed_users`; 26 modules (00_auth..26_mfa) + 3 security sweeps (finance_bypass, anonymous_elevation, authz_full_sweep); API_BASE default `https://localhost:5001`, CURL_INSECURE=1. Any FAIL exits 1.
- `tests/e2e/` has 9 Playwright spec stubs: `_phase4-fix{1,2,9,11,12,13,14,15,17}.spec.ts`.

---

## 4. EXPLORATION STILL PENDING (the test-infra agent was interrupted — re-run before designing)

Need EXACT facts (no assumptions) on:
1. **NUnit suite** (`EduLearn_Testing/`): file count + names, .csproj versions (NUnit/Moq/Test.Sdk/coverlet) + TargetFramework, representative test structure (mocking + ClaimsPrincipal faking pattern), any coverage tooling, any non-controller (service/repo) tests.
2. **Bash smoke suite**: full file tree (modules/, security/, lib/), `lib/common.sh` helper semantics + PASS/FAIL tracking, one module's assertion pattern, EXACT `api/content` line(s) in `modules/10_content.sh`, any 429/rate-limit refs, README documented baseline PASS count.
3. **Playwright**: is there a `playwright.config.*` + package.json (scripts/baseURL/webServer/browsers) anywhere, or are the 9 specs orphaned stubs? One spec's login+assert pattern.
4. **Frontend test setup** (`edulearn.client/package.json`): full deps/devDeps/scripts; is Vitest/Jest/RTL/jsdom present; any vitest/jest config or setup file; any existing `*.test.*`/`__tests__`; React + Vite versions; vite.config.js summary.

---

## 5. Where we are in the brainstorming process

Brainstorming skill checklist:
- [x] (re)Explore project context — PARTIAL (§3 done, §4 pending)
- [ ] Ask clarifying questions (one at a time) — NOT STARTED
- [ ] Propose 2-3 approaches with trade-offs — NOT STARTED
- [ ] Present design sections, get approval — NOT STARTED
- [ ] Write spec to `docs/superpowers/specs/YYYY-MM-DD-phase2-*-design.md` + commit — NOT STARTED
- [ ] Spec self-review — NOT STARTED
- [ ] User reviews spec — NOT STARTED
- [ ] Invoke writing-plans — NOT STARTED

### Likely decomposition (to confirm WITH the user, not assume)
Phase 2 spans multiple independent subsystems → probably **decompose into sub-projects**, each its own spec→plan→implement cycle. Candidate ordering to propose:
- **2A. Frontend test harness + unit/component tests** (Vitest + RTL + jsdom; wire `test` script).
- **2B. Backend changes that pair with smoke updates** — rate-limiting on auth + `api/content`→`api/contents` rename, done WITH the smoke suite update in the same change so the suite stays green.
- **2C. Enhanced bash smoke suite** (end-to-end, all 7 roles, incl. the 2B changes).
- **2D. Enhanced Playwright E2E** per role.
- **2E. Performance** (simple pagination where it matters).
- **2F. Interactive UI/UX manual pass** — user-driven, fix-as-you-go (not a written-test deliverable; runs against the seeded accounts + manual guide).

### Open questions to ask the user (one at a time)
1. Confirm decomposition + which sub-project to brainstorm FIRST (recommend 2A frontend test harness, or 2B if they want the deferred backend items done first).
2. Frontend test coverage target/depth (smoke-level critical paths vs broad coverage) given internship scope.
3. Rate-limiting: acceptable limits + how to keep smoke suite green (exempt localhost? raise threshold? per-IP fixed window?).
4. `api/content` rename: confirm we change backend + contentService + smoke module together in one commit.
5. Pagination: which lists actually need it for the demo (Students/Users?) or defer entirely.
6. Playwright: extend the 9 existing `_phase4-fix*` stubs or start a fresh role-based suite?

---

## 6. Resume instruction
Re-run the §4 pending exploration FIRST (no assumptions), then ask the §5 open questions one at a time, then propose approaches, present design, write the spec, get user review, and hand off to writing-plans. Honor all §2 constraints. Do NOT start implementation until a spec is approved.
