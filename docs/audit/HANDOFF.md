# EduLearn Audit Sprint — Teammate Handoff

**Branch:** `testing1/utkarsh-audit-sprint`
**Owner:** Utkarsh Wasan
**Tests:** 299/299 passing
**Last commit:** `dc20967` — comprehensive form hardening

---

## Step-by-Step: Pull, Build & Run

### 1. Pull the latest code

```bash
git fetch origin
git checkout testing1/utkarsh-audit-sprint
git pull origin testing1/utkarsh-audit-sprint
```

### 2. Apply database migrations

```bash
cd EduLearn.API
dotnet ef database update
```

> If `dotnet ef` is not installed: `dotnet tool install --global dotnet-ef`

### 3. Start the backend (Terminal 1)

```bash
cd EduLearn.API
dotnet run
```

Wait until you see: `Now listening on: http://localhost:5000`

> **Port 5000 busy?** Kill the old process first:
> ```
> netstat -ano | findstr :5000
> taskkill /PID <pid> /F
> ```

### 4. Start the frontend (Terminal 2)

```bash
cd edulearn.client
npm install
npm run dev
```

Open **http://localhost:5173**

### 5. Disable MFA for admin (one-time, in SQL Server)

Open SQL Server Object Explorer or `sqlcmd` and run against `EduLearnDb`:

```sql
UPDATE Users SET MFAEnabled = 0, MFASecret = NULL WHERE Username = 'admin';
```

Login: **admin** / **Admin@123**

---

## Known Issue: Login Redirects Back to Login Page

**Symptom:** You log in successfully but immediately get sent back to the login screen.

**Cause:** MFA (Multi-Factor Authentication) is enabled for privileged roles (ITAdmin, Registrar, Auditor, etc.). When you log in:
1. Backend returns a temporary `mfa_pending` token instead of a full JWT
2. Frontend redirects to `/mfa/verify` expecting a TOTP code from an authenticator app
3. Without the authenticator app, you can't complete verification — no full JWT is issued
4. `ProtectedRoute` sees no JWT in localStorage and redirects to `/login`

**Fix:** Run the SQL above (Step 5) to disable MFA for the admin user. No backend restart needed — the change takes effect on the next login attempt.

If you created other users with MFA enabled, disable them too:
```sql
UPDATE Users SET MFAEnabled = 0, MFASecret = NULL WHERE MFAEnabled = 1;
```

Students and Instructors are NOT affected — they never go through MFA.

---

## What This Branch Does

A structured quality sprint covering the whole codebase — RBAC gaps, form validation holes, frontend resilience, and UX bugs.

---

## Phase 4 — Bug & UX Fixes

| Fix | What was wrong | What we did |
|---|---|---|
| Dashboard cards | Instructor course/section cards weren't clickable | Wrapped in `<Link>` |
| Content URI | Content file URI showed as plain text | Made it a clickable `<a>` |
| Student invoices | Finance page required manual search; students couldn't see their own | Auto-load on mount, scoped to student's own data |
| Enrollment programs | Dropdown showed all programs including inactive | Filtered to Active only |
| KPI computation | `RecalculateAndSaveAsync` renamed but callers not updated | Renamed consistently + fixed 1 broken test |

Also fixed: DeptAdmin sidebar (wrong nav item), DOB leaking in URL params (PII), phone/email validation on Student and Applicant forms.

---

## Phase 5 — Frontend Resilience (kept simple)

- **`ErrorBoundary.jsx`** — React crashes show "Something went wrong" instead of blank screen
- **`ConnectivityBanner.jsx`** — offline warning banner when browser loses network
- **`axiosClient.js`** — 15s request timeout, auto-redirect to `/login` on 401, `console.error` on 5xx

---

## Phase 6 — Security & Validation Audit (36 findings)

**RBAC (backend) — 9 fixes**
- `AuditLogController`, `ReportsController`, `KPIsController` — restricted to `Auditor,ITAdmin`
- `SyllabiController`, `DiscussionsController`, `PlagiarismController` — blocked Finance/DeptAdmin/Auditor from GET endpoints
- `App.jsx` — `/reports`, `/kpis`, `/audit-log` routes wrapped in `ProtectedRoute`

**Form validation (frontend) — 14 fixes**
- Score: rejects values outside 0–maxScore, confirm dialog before posting
- Content URI: `type="url"` + regex validation, MetadataJSON validated as parseable JSON
- Phone: strictly `^\d{10}$` (no symbols, no negative numbers)
- Email: auto-lowercased on input
- Scholarship dates: validFrom must be before validTo
- Term inputs: pattern enforced (`2026-Fall` format) across Fees, Invoices, Timetable, Students
- Username: trim guard (spaces-only rejected)
- Thread title: maxLength + trim guard
- Student/Invoice/Payment ID search inputs: `min="1"` (no zero/negative)
- Computers field: `max={500}` cap
- JSON fields (CourseForm prerequisites, AssessmentForm rubric): parse validation before submit

**Backend DTO annotations — 13 fixes**
- `[MaxLength]` on LoginDto, MfaVerifyDto, ForgotPasswordDto, CreateSectionDto
- `[Url]` on submission FileURI, content URI, content version URI
- `[MinLength(4)]` on ApplicantDto NationalID
- `[RegularExpression(@"^\d{10}$")]` on UpdateUserDto Phone
- Age guard in StudentsController (must be ≥15)
- IDOR fix in StudentsController (`int.TryParse` instead of `?? "0"`)
- `Math.max(0, capacity - enrolledCount)` to prevent negative seat count

---

## Dev Notes

- **Vite proxy** points to `http://localhost:5000` — if backend runs on a different port, update `edulearn.client/vite.config.js`
- **GlobalExceptionMiddleware** is unchanged — pre-existing, catches unhandled backend exceptions
- **No new NuGet packages**, no new DB tables, no background services
- **Build check:** `dotnet build` then `dotnet test` — should show 299/299 passed
