# EduLearn Audit Sprint — Teammate Handoff

**Branch:** `testing1/utkarsh-audit-sprint`
**Owner:** Utkarsh Wasan
**Tests:** 299/299 passing

---

## Pull & Run

```bash
git fetch origin
git checkout testing1/utkarsh-audit-sprint
git pull origin testing1/utkarsh-audit-sprint

# Backend (terminal 1)
cd EduLearn.API
dotnet run

# Frontend (terminal 2)
cd edulearn.client
npm install
npm run dev
```

Open **http://localhost:5173**
Login: `admin` / `Admin@123`

> If port 5000 is busy, kill the old process first:
> `netstat -ano | findstr :5000` then `taskkill /PID <pid> /F`

---

## What This Branch Does

A structured quality sprint covering the whole codebase — RBAC gaps, form validation holes, frontend resilience, and UX bugs. Split into four phases.

---

## Phase 4 — Bug & UX Fixes (5 fixes)

| Fix | What was wrong | What we did |
|---|---|---|
| Dashboard cards | Instructor course/section cards weren't clickable | Wrapped in `<Link>` |
| Content URI | Content file URI showed as plain text | Made it a clickable `<a>` |
| Student invoices | Finance page required manual search; students couldn't see their own | Auto-load on mount, scoped to student's own data |
| Enrollment programs | Dropdown showed all programs including inactive | Filtered to Active only |
| KPI computation | `RecalculateAndSaveAsync` renamed but callers not updated | Renamed consistently + fixed 1 broken test |

Also fixed: DeptAdmin saw Timetable nav item (wrong role), DOB was leaking in URL query params (PII issue), phone/email validation added to Student and Applicant forms.

---

## Phase 5 — Frontend Resilience (kept simple)

Three lightweight additions — each explainable in one sentence:

- **`ErrorBoundary.jsx`** — wraps the whole app; React crashes show a "Something went wrong" page instead of a blank screen
- **`ConnectivityBanner.jsx`** — shows an offline warning banner when the browser loses network
- **`axiosClient.js`** — 10-second request timeout, auto-redirect to `/login` on 401, `console.error` on 5xx

**What we removed (over-engineered):** A custom `AppErrors` DB table, background retention service, `ClientLogsController`, `errorReporterService.js`, `ErrorsPage.jsx`, and a rate limiter were added then cleaned up — all production-level infrastructure out of scope for an internship project.

---

## Phase 6 — Security & Validation Audit (36 findings fixed)

Full scan across all 7 roles. Fixes grouped by severity:

**RBAC (backend) — 9 fixes**
- `AuditLogController`, `ReportsController`, `KPIsController` — changed bare `[Authorize]` to `[Authorize(Roles = "Auditor,ITAdmin")]`
- `SyllabiController`, `DiscussionsController`, `PlagiarismController` — Finance/DeptAdmin/Auditor were hitting GET endpoints they shouldn't access
- `App.jsx` — `/reports`, `/kpis`, `/audit-log` routes now wrapped in `ProtectedRoute` with `allowedRoles={['Auditor','ITAdmin']}`

**Form validation (frontend) — 14 fixes**
- Score field on grade page: rejects values outside 0–maxScore, requires confirm dialog before posting
- Content upload URI: `type="url"` + regex validation, MetadataJSON validated as parseable JSON
- Phone fields (UserDetail, ApplicantDetail): must be exactly 10 digits
- Scholarship dates: validFrom must be before validTo
- Term inputs (Fees, Invoices): pattern enforced (`2026-Fall` format)
- Late submission warning: `window.confirm` if deadline has passed
- TimetablePage: DeptAdmin/Auditor/Finance removed from `isAdmin` (they saw student lookup they can't use)

**Backend DTO annotations — 13 fixes**
- `[MaxLength]` on LoginDto, MfaVerifyDto, ForgotPasswordDto, CreateSectionDto
- `[Url]` on CreateSubmissionDto FileURI, CreateContentDto URI, UpdateContentVersionDto URI
- `[MinLength(4)]` on CreateApplicantDto NationalID
- `[RegularExpression(@"^\d{10}$")]` on UpdateUserDto Phone
- Age guard in StudentsController: rejects if DOB < 15 years ago
- IDOR fix in StudentsController: `int.TryParse` instead of `?? "0"` fallback
- `Math.max(0, capacity - enrolledCount)` on SectionDetailPage to prevent negative seat count

---

## Dev Notes

- **Vite proxy** points to `http://localhost:5000` (not `https://5001`) — both must match
- **Admin MFA** is disabled in the DB for testing (`UPDATE Users SET MFAEnabled = 0 WHERE Username = 'admin'`)
- **GlobalExceptionMiddleware** is unchanged — pre-existing, catches unhandled exceptions and returns JSON
- No new NuGet packages, no new DB tables, no background services — stays explainable
