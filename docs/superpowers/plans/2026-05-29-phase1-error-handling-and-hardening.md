# Phase 1 — Bug-Fix & Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the reported auth/error/logging bugs and the low-risk High/Medium review findings, and add a polished, user-facing error-presentation experience — without changing any working behaviour except making username login case-sensitive.

**Architecture:** ASP.NET Core 8 API (Controller → Service → Repository → EF Core) + React 18/Vite SPA (Bootstrap 5, axios, React Router v6). One frontend error resolver feeds a restyled inline alert, a role-aware Access-Denied page, and a crash page. Backend changes are surgical: an ordinal username check, generic 401/403 JSON, a CORS env guard, eager-loaded list queries, fail-closed claim parsing, a widened Gender column, and one corrected doc comment.

**Tech Stack:** C# / EF Core / NUnit (existing 282 tests) / bash smoke suite · React / Vite / ESLint.

**Spec:** `docs/superpowers/specs/2026-05-29-phase1-error-handling-and-hardening-design.md`

**Conventions for every task:** read the file before editing; backend verify = `dotnet build` from `EduLearn.API`; frontend verify = `npm run lint` + `npm run build` from `edulearn.client`. There is no frontend test framework in Phase 1 — UI behaviour is verified manually as noted. Run all commands from the repo root unless stated.

---

## TASK GROUP A — BACKEND

### Task 1: Case-sensitive username login

**Files:**
- Modify: `EduLearn.API/Services/AuthService.cs` (LoginAsync, ~line 153-168)

- [ ] **Step 1: Read** `EduLearn.API/Services/AuthService.cs` and locate `LoginAsync`.

- [ ] **Step 2: Add the ordinal username guard.** Replace this block:

```csharp
        var isEmail = dto.UsernameOrEmail.Contains('@');
        var user = isEmail
            ? await _userRepository.GetByEmailAsync(dto.UsernameOrEmail)
            : await _userRepository.GetByUsernameAsync(dto.UsernameOrEmail);
```

with:

```csharp
        var isEmail = dto.UsernameOrEmail.Contains('@');
        var user = isEmail
            ? await _userRepository.GetByEmailAsync(dto.UsernameOrEmail)
            : await _userRepository.GetByUsernameAsync(dto.UsernameOrEmail);

        // SQL Server's default collation is case-insensitive, so GetByUsernameAsync
        // matches 'Admin' to a stored 'admin'. Enforce an exact, case-sensitive match
        // on the username path (emails remain case-insensitive by convention). Done
        // BEFORE the BCrypt check below so the C-24 timing-equality guard still runs.
        if (!isEmail && user != null &&
            !string.Equals(user.Username, dto.UsernameOrEmail, StringComparison.Ordinal))
        {
            user = null;
        }
```

- [ ] **Step 3: Build.** Run `dotnet build EduLearn.API`. Expected: build succeeds.

- [ ] **Step 4: Run existing auth tests.** Run `dotnet test EduLearn_Testing --filter AuthControllerTest`. Expected: all pass (no test logs in with altered casing).

- [ ] **Step 5: Manual check.** Start the API; `POST /api/auth/login` with `{ "usernameOrEmail": "admin", "password": "Admin@123" }` → succeeds; with `"Admin"` → returns null/401 invalid credentials. Email login with different casing still succeeds.

- [ ] **Step 6: Commit.**

```bash
git add EduLearn.API/Services/AuthService.cs
git commit -m "fix(auth): enforce case-sensitive username on login"
```

---

### Task 2: Remove API-route leakage + CORS environment guard (Program.cs)

**Files:**
- Modify: `EduLearn.API/Program.cs` (CORS ~line 63-66; `OnChallenge` ~150-174; `OnForbidden` ~176-194)

- [ ] **Step 1: Read** `EduLearn.API/Program.cs`.

- [ ] **Step 2: CORS env guard.** Replace:

```csharp
// CORS
builder.Services.AddCors(options =>
    options.AddDefaultPolicy(policy =>
        policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod()));
```

with:

```csharp
// CORS — open in Development; locked to configured origins elsewhere.
builder.Services.AddCors(options =>
    options.AddDefaultPolicy(policy =>
    {
        if (builder.Environment.IsDevelopment())
        {
            policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod();
        }
        else
        {
            var allowed = builder.Configuration
                .GetSection("Cors:AllowedOrigins").Get<string[]>()
                ?? new[] { "http://localhost:5173" };
            policy.WithOrigins(allowed).AllowAnyHeader().AllowAnyMethod();
        }
    }));
```

- [ ] **Step 3: Strip route from `OnChallenge`.** Replace the whole `OnChallenge = async context => { ... }` block with:

```csharp
            OnChallenge = async context =>
            {
                context.HandleResponse();
                context.Response.StatusCode = 401;
                context.Response.ContentType = "application/json";

                var errorMessage = "You need to sign in to continue.";
                if (!string.IsNullOrEmpty(context.ErrorDescription) &&
                    context.ErrorDescription.Contains("expired"))
                {
                    errorMessage = "Your session has expired. Please sign in again.";
                }

                var response = new
                {
                    error = errorMessage,
                    code = "AUTH_REQUIRED",
                    statusCode = 401
                };

                await context.Response.WriteAsync(JsonSerializer.Serialize(response));
            },
```

- [ ] **Step 4: Strip route/role from `OnForbidden`.** Replace the whole `OnForbidden = async context => { ... }` block with:

```csharp
            OnForbidden = async context =>
            {
                context.Response.StatusCode = 403;
                context.Response.ContentType = "application/json";

                var response = new
                {
                    error = "You don't have permission to perform this action.",
                    code = "FORBIDDEN",
                    statusCode = 403
                };

                await context.Response.WriteAsync(JsonSerializer.Serialize(response));
            }
```

- [ ] **Step 5: Build.** Run `dotnet build EduLearn.API`. Expected: success.

- [ ] **Step 6: Manual check.** Call any protected endpoint without a token → 401 body has no `endpoint` field and no `/api/...` text. Call an endpoint with a wrong-role token → 403 body is the generic message with no route/role.

- [ ] **Step 7: Commit.**

```bash
git add EduLearn.API/Program.cs
git commit -m "fix(api): generic 401/403 responses (no route leak) + CORS env guard"
```

---

### Task 3: Widen Gender column + DTO consistency

**Files:**
- Modify: `EduLearn.API/Models/Student.cs` (~line 32)
- Modify: `EduLearn.API/DTOs/UpdateStudentDto.cs` (~line 13)
- Modify: `EduLearn.API/DTOs/CreateStudentDto.cs` (~line 18)
- Create: migration via EF CLI

- [ ] **Step 1: `Student.cs`** — change `[MaxLength(10)]` directly above `public string? Gender` to `[MaxLength(20)]`.

- [ ] **Step 2: `UpdateStudentDto.cs`** — change the `[MaxLength(10)]` above `public string? Gender` to `[MaxLength(20)]`.

- [ ] **Step 3: `CreateStudentDto.cs`** — change `[MaxLength(18)]` above `public string? Gender` to `[MaxLength(20)]` (consistency; 18 already worked).

- [ ] **Step 4: Build.** `dotnet build EduLearn.API`. Expected: success.

- [ ] **Step 5: Add migration.** From `EduLearn.API`:

```bash
dotnet ef migrations add WidenStudentGender
```

Expected: a new migration whose `Up` runs `AlterColumn` widening `Gender` to `nvarchar(20)`. Inspect it to confirm it only touches the Gender column.

- [ ] **Step 6: Apply migration.** Run `.\migrate-database.bat` (or `dotnet ef database update`). Expected: applies cleanly.

- [ ] **Step 7: Manual check.** Create a Student with `Gender = "Prefer not to say"` → 201, no 400.

- [ ] **Step 8: Commit.**

```bash
git add EduLearn.API/Models/Student.cs EduLearn.API/DTOs/UpdateStudentDto.cs EduLearn.API/DTOs/CreateStudentDto.cs EduLearn.API/Migrations/
git commit -m "fix(students): widen Gender to 20 chars so 'Prefer not to say' is valid"
```

---

### Task 4: Remove N+1 lookups in Sections & Invoices list endpoints

Approach: load the related courses/instructors/students **once** into a dictionary instead of one query per row. No new repository methods, no navigation-property assumptions, identical response payloads.

**Files:**
- Modify: `EduLearn.API/Controllers/SectionsController.cs` (`GetAll` ~41-55; `GetByInstructor` ~262-280)
- Modify: `EduLearn.API/Controllers/InvoicesController.cs` (`GetAll` ~46-58)

- [ ] **Step 1: SectionsController.GetAll** — replace the method body:

```csharp
        var sections = await _sectionRepo.GetAllAsync();
        var result = new List<SectionResponseDto>();
        foreach (var s in sections)
        {
            var course = await _courseRepo.GetByIdAsync(s.CourseID);
            var instructor = await _userRepo.GetByIdAsync(s.InstructorID);
            result.Add(MapToDto(s,
                course?.Title ?? string.Empty,
                instructor?.FullName ?? string.Empty));
        }
        return Ok(result);
```

with:

```csharp
        var sections = await _sectionRepo.GetAllAsync();
        var courses = (await _courseRepo.GetAllAsync()).ToDictionary(c => c.CourseID);
        var users = (await _userRepo.GetAllAsync()).ToDictionary(u => u.UserID);
        var result = sections.Select(s => MapToDto(s,
            courses.TryGetValue(s.CourseID, out var c) ? c.Title : string.Empty,
            users.TryGetValue(s.InstructorID, out var u) ? u.FullName : string.Empty)).ToList();
        return Ok(result);
```

- [ ] **Step 2: SectionsController.GetByInstructor** — replace:

```csharp
        var sections = await _sectionRepo.GetByInstructorIdAsync(instructorId);

        var result = new List<SectionResponseDto>();
        foreach (var s in sections)
        {
            var course = await _courseRepo.GetByIdAsync(s.CourseID);
            result.Add(MapToDto(s, course?.Title ?? string.Empty, instructor.FullName));
        }

        return Ok(result);
```

with:

```csharp
        var sections = await _sectionRepo.GetByInstructorIdAsync(instructorId);
        var courses = (await _courseRepo.GetAllAsync()).ToDictionary(c => c.CourseID);
        var result = sections.Select(s => MapToDto(s,
            courses.TryGetValue(s.CourseID, out var c) ? c.Title : string.Empty,
            instructor.FullName)).ToList();
        return Ok(result);
```

- [ ] **Step 3: InvoicesController.GetAll** — replace:

```csharp
        var invoices = await _invoiceRepository.GetAllAsync();
        var result = new List<InvoiceResponseDto>();
        foreach (var i in invoices)
        {
            var student = await _studentRepository.GetByIdAsync(i.StudentID);
            result.Add(MapToDto(i, student));
        }
        return Ok(result);
```

with:

```csharp
        var invoices = await _invoiceRepository.GetAllAsync();
        var students = (await _studentRepository.GetAllAsync()).ToDictionary(s => s.StudentID);
        var result = invoices.Select(i =>
            MapToDto(i, students.TryGetValue(i.StudentID, out var s) ? s : null)).ToList();
        return Ok(result);
```

- [ ] **Step 4: Verify `GetAllAsync` exists** on `ICourseRepository`, `IUserRepository`, `IStudentRepository`. (All repos in this codebase expose `GetAllAsync()` — confirm by reading each interface; if a signature differs, adapt the call.)

- [ ] **Step 5: Build.** `dotnet build EduLearn.API`. Expected: success.

- [ ] **Step 6: Run smoke modules.** From repo root: `bash tests/smoke/run-all.sh modules/07_sections.sh` and `bash tests/smoke/run-all.sh modules/15_invoices.sh`. Expected: same PASS results as before (payloads unchanged).

- [ ] **Step 7: Commit.**

```bash
git add EduLearn.API/Controllers/SectionsController.cs EduLearn.API/Controllers/InvoicesController.cs
git commit -m "perf(api): batch-load related entities to remove N+1 in sections/invoices lists"
```

---

### Task 5: Fail-closed claim parsing (`?? "0"` → TryParse + Unauthorized)

Replace the silent `int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0")` pattern with an explicit guard. The exact sites (from grep) are below. For each method, add the guard once at the point the value is first needed, then reuse `callerId`.

**Files:**
- `EduLearn.API/Controllers/EnrollmentsController.cs` (lines ~64, ~243, ~358)
- `EduLearn.API/Controllers/SubmissionsController.cs` (lines ~62, ~238)
- `EduLearn.API/Controllers/InvoicesController.cs` (lines ~259, ~291; also the bulk `callerIdStr`/`int.Parse` at ~90-91)
- `EduLearn.API/Controllers/PaymentsController.cs` (line ~125)
- `EduLearn.API/Controllers/TimetableController.cs` (line ~54)
- `EduLearn.API/Controllers/TranscriptsController.cs` (lines ~178, ~213, ~281)

Standard guard snippet (used wherever a fresh parse is needed):

```csharp
        if (!int.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var callerId))
            return Unauthorized(new { error = "Your session is invalid. Please sign in again.", code = "INVALID_TOKEN" });
```

- [ ] **Step 1: EnrollmentsController.** In each of the three methods containing `int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0")`, add the guard snippet at the top of the method body (after existing `callerRole` reads where present) and replace the inline `int.Parse(... ?? "0")` with `callerId`. For the line `if (callerRole == "Student" && student.UserID != int.Parse(...))` it becomes `if (callerRole == "Student" && student.UserID != callerId)`.

- [ ] **Step 2: SubmissionsController.** Same transformation in both methods (lines ~62 and ~238): add the guard once per method, replace inline parse with `callerId`.

- [ ] **Step 3: InvoicesController.** In `GetByStudent` (~259) and `GetById` (~291) add the guard and use `callerId`. In `GenerateBulk` (~90-91) replace:

```csharp
        var callerIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0";
        var callerId = int.Parse(callerIdStr);
```

with:

```csharp
        if (!int.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var callerId))
            return Unauthorized(new { error = "Your session is invalid. Please sign in again.", code = "INVALID_TOKEN" });
```

(The `Generate` method at ~232 already throws on a missing claim — leave it; it is not the `?? "0"` pattern.)

- [ ] **Step 4: PaymentsController.** In the method at ~125, add the guard and replace the inline parse with `callerId`.

- [ ] **Step 5: TimetableController.** Replace `var callerId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");` (~54) with the guard snippet.

- [ ] **Step 6: TranscriptsController.** Three methods (~178, ~213, ~281) each declare `var callerId = int.Parse(... ?? "0");`. Replace each with the guard snippet. (At ~281 `callerRole` is read just above — keep it, place guard right after.)

- [ ] **Step 7: Confirm `using System.Security.Claims;`** is present in each edited controller (it is, per grep). Build: `dotnet build EduLearn.API`. Expected: success.

- [ ] **Step 8: Run smoke security sweeps.** `bash tests/smoke/run-all.sh --security-only`. Expected: same PASS results (authenticated requests carry a valid NameIdentifier, so behaviour is unchanged; only a missing/garbage claim now yields 401 instead of acting as user 0).

- [ ] **Step 9: Commit.**

```bash
git add EduLearn.API/Controllers/EnrollmentsController.cs EduLearn.API/Controllers/SubmissionsController.cs EduLearn.API/Controllers/InvoicesController.cs EduLearn.API/Controllers/PaymentsController.cs EduLearn.API/Controllers/TimetableController.cs EduLearn.API/Controllers/TranscriptsController.cs
git commit -m "fix(security): fail closed on missing NameIdentifier claim (no UserID=0 fallback)"
```

---

### Task 6: Fix AssessmentsController doc comment

**Files:**
- Modify: `EduLearn.API/Controllers/AssessmentsController.cs` (~line 117)

- [ ] **Step 1: Read** the `UpdateAssessment` XML summary (~line 115-118).

- [ ] **Step 2: Correct the comment.** Replace:

```csharp
    /// Draft and Published assessments may be modified. Closed/Archived are locked.
```

with:

```csharp
    /// Only Draft assessments can be updated. Published, Closed, and Archived are locked.
```

- [ ] **Step 3: Build.** `dotnet build EduLearn.API`. Expected: success. (Behaviour unchanged — comment now matches the `Status != Draft` check.)

- [ ] **Step 4: Commit.**

```bash
git add EduLearn.API/Controllers/AssessmentsController.cs
git commit -m "docs(api): correct UpdateAssessment summary to match Draft-only behaviour"
```

---

## TASK GROUP B — FRONTEND FOUNDATIONS

### Task 7: Academic config constant

**Files:**
- Create: `edulearn.client/src/config/academic.js`

- [ ] **Step 1: Create the file:**

```javascript
// Single source of truth for the current academic term.
// Update this one value when the term rolls over.
export const CURRENT_TERM = '2026-Spring';
```

- [ ] **Step 2: Commit.**

```bash
git add edulearn.client/src/config/academic.js
git commit -m "chore(client): add CURRENT_TERM config constant"
```

---

### Task 8: Frontend logger

**Files:**
- Create: `edulearn.client/src/utils/logger.js`

- [ ] **Step 1: Create the file:**

```javascript
// Minimal single-choke-point logger. Keeps a consistent prefix and lets us
// quiet info logs in production without touching call sites.
const isDev = import.meta.env.DEV;

export const logger = {
    error: (...args) => console.error('[EduLearn]', ...args),
    warn: (...args) => console.warn('[EduLearn]', ...args),
    info: (...args) => { if (isDev) console.info('[EduLearn]', ...args); },
};
```

- [ ] **Step 2: Commit.**

```bash
git add edulearn.client/src/utils/logger.js
git commit -m "chore(client): add minimal logger utility"
```

---

### Task 9: Friendly error resolver

**Files:**
- Create: `edulearn.client/src/utils/errorMessage.js`

- [ ] **Step 1: Create the file:**

```javascript
// Turns any error (axios error, plain Error, or string) into a user-facing
// model. Never exposes status codes or API routes. Used by ErrorAlert,
// AccessDeniedPage, and the crash page so wording stays consistent.

const ROUTE_PATTERN = /\/api\//i;
const METHOD_PATTERN = /^(GET|POST|PUT|PATCH|DELETE)\s+\//i;

// Strip anything that looks like an internal route/path so it never reaches the user.
function sanitize(text, fallback) {
    if (!text || typeof text !== 'string') return fallback;
    if (ROUTE_PATTERN.test(text) || METHOD_PATTERN.test(text)) return fallback;
    return text;
}

export function getFriendlyError(error) {
    // Plain string
    if (typeof error === 'string') {
        return { category: 'unknown', title: 'Something went wrong',
            message: sanitize(error, 'An unexpected problem occurred.'),
            guidance: 'Please try again. If it keeps happening, contact your department admin.' };
    }
    if (!error) {
        return { category: 'unknown', title: 'Something went wrong',
            message: 'An unexpected problem occurred.',
            guidance: 'Please try again.' };
    }

    // Network / timeout — axiosClient sets _userMessage for these.
    if (error._userMessage || error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED' || !error.response) {
        return { category: 'network', title: 'Connection problem',
            message: "We couldn't reach the server.",
            guidance: 'Check your internet connection and try again in a moment.' };
    }

    const status = error.response?.status;

    if (status >= 500) {
        return { category: 'server', title: 'Something went wrong',
            message: 'An unexpected problem occurred on our side.',
            guidance: 'Please try again in a few minutes. If it keeps happening, contact your department admin.' };
    }
    if (status === 403) {
        return { category: 'forbidden', title: 'Access denied',
            message: "Your account doesn't have access to this.",
            guidance: 'If you think this is a mistake, contact your department admin.' };
    }
    if (status === 404) {
        return { category: 'notFound', title: 'Not found',
            message: "We couldn't find what you were looking for.",
            guidance: 'It may have been moved or removed.' };
    }
    if (status === 400 || status === 409 || status === 422) {
        // The API returns a clean { error } message for these — show it, sanitized.
        const apiMsg = error.response?.data?.error;
        return { category: 'validation', title: 'Please check your input',
            message: sanitize(apiMsg, "We couldn't process that request."),
            guidance: '' };
    }
    if (status === 401) {
        return { category: 'unknown', title: 'Sign-in required',
            message: sanitize(error.response?.data?.error, 'Please sign in to continue.'),
            guidance: '' };
    }

    return { category: 'unknown', title: 'Something went wrong',
        message: sanitize(error.response?.data?.error || error.message, 'An unexpected problem occurred.'),
        guidance: 'Please try again. If it keeps happening, contact your department admin.' };
}
```

- [ ] **Step 2: Lint.** From `edulearn.client`: `npm run lint`. Expected: no errors for this file.

- [ ] **Step 3: Commit.**

```bash
git add edulearn.client/src/utils/errorMessage.js
git commit -m "feat(client): add user-facing error resolver with route/status sanitiser"
```

---

### Task 10: Polished ErrorAlert using the resolver

**Files:**
- Modify: `edulearn.client/src/components/ErrorAlert.jsx` (full rewrite)

- [ ] **Step 1: Replace the file contents with:**

```jsx
import { getFriendlyError } from '../utils/errorMessage';

export default function ErrorAlert({ error, onDismiss }) {
    if (!error) return null;

    const { title, message, guidance } = getFriendlyError(error);

    // Dev-only raw detail from the backend (it is dev-gated server-side). Never
    // feeds the user-facing message above; shown subordinate for debugging only.
    const detail = (import.meta.env.DEV && typeof error !== 'string')
        ? error.response?.data?.detail : null;
    const exceptionType = (import.meta.env.DEV && typeof error !== 'string')
        ? error.response?.data?.exceptionType : null;

    return (
        <div className="alert alert-danger d-flex align-items-start" role="alert">
            <i className="bi bi-exclamation-triangle-fill me-2 mt-1 flex-shrink-0"></i>
            <div className="flex-grow-1">
                <div className="fw-semibold">{title}</div>
                <div className="small">{message}</div>
                {guidance && <div className="small text-muted mt-1">{guidance}</div>}

                {detail && (
                    <div className="mt-2 p-2 rounded" style={{
                        background: 'rgba(0,0,0,0.06)', fontSize: '12px',
                        fontFamily: 'monospace', wordBreak: 'break-word'
                    }}>
                        {exceptionType && (
                            <div style={{ color: '#842029', fontWeight: 600, marginBottom: 2 }}>
                                {exceptionType}
                            </div>
                        )}
                        <div>{detail}</div>
                    </div>
                )}
            </div>
            {onDismiss && (
                <button type="button" className="btn-close ms-2 flex-shrink-0" onClick={onDismiss} />
            )}
        </div>
    );
}
```

- [ ] **Step 2: Lint + build.** From `edulearn.client`: `npm run lint && npm run build`. Expected: success.

- [ ] **Step 3: Manual check.** On the Login page, submit with the backend stopped → alert shows "Connection problem" + guidance, no "Network Error", no status code. (Login already renders `<ErrorAlert error={error} />`.)

- [ ] **Step 4: Commit.**

```bash
git add edulearn.client/src/components/ErrorAlert.jsx
git commit -m "feat(client): ErrorAlert renders friendly title/message/guidance via resolver"
```

---

### Task 11: Restyle the crash page

**Files:**
- Modify: `edulearn.client/src/components/ErrorFallbackPage.jsx` (full rewrite)

- [ ] **Step 1: Replace the file contents with:**

```jsx
export default function ErrorFallbackPage({ error, onReload, onReset }) {
    return (
        <div className="d-flex align-items-center justify-content-center min-vh-100 bg-light">
            <div className="card shadow-sm border-0" style={{ maxWidth: 480 }}>
                <div className="card-body p-4 text-center">
                    <i className="bi bi-exclamation-octagon-fill text-danger" style={{ fontSize: '2.5rem' }}></i>
                    <h1 className="h4 mt-3 mb-2">Something went wrong</h1>
                    <p className="text-muted mb-1">The page ran into an unexpected problem.</p>
                    <p className="text-muted small">
                        Please reload. If it keeps happening, contact your department admin.
                    </p>

                    <div className="mt-4 d-flex justify-content-center gap-2">
                        <button className="btn btn-primary-edulearn" onClick={onReload}>
                            <i className="bi bi-arrow-clockwise me-1"></i>Reload page
                        </button>
                        <button className="btn btn-outline-secondary" onClick={onReset}>Try again</button>
                    </div>

                    {import.meta.env.DEV && (
                        <details className="mt-4 text-start">
                            <summary className="small text-muted">Technical details (dev only)</summary>
                            <pre className="bg-light p-2 small mt-2 mb-0">{error?.message || 'Unknown error'}</pre>
                        </details>
                    )}
                </div>
            </div>
        </div>
    );
}
```

- [ ] **Step 2: Build.** From `edulearn.client`: `npm run build`. Expected: success.

- [ ] **Step 3: Commit.**

```bash
git add edulearn.client/src/components/ErrorFallbackPage.jsx
git commit -m "feat(client): restyle crash page to match error presentation"
```

---

## TASK GROUP C — ACCESS DENIED & AUTH NAVIGATION

### Task 12: Access-Denied page + ProtectedRoute wiring

**Files:**
- Create: `edulearn.client/src/pages/AccessDeniedPage.jsx`
- Modify: `edulearn.client/src/components/ProtectedRoute.jsx`

- [ ] **Step 1: Create `AccessDeniedPage.jsx`:**

```jsx
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';

export default function AccessDeniedPage() {
    const navigate = useNavigate();
    const { role } = authService.getCurrentUser();

    return (
        <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '60vh' }}>
            <div className="card shadow-sm border-0 text-center" style={{ maxWidth: 480 }}>
                <div className="card-body p-4">
                    <i className="bi bi-shield-lock-fill text-warning" style={{ fontSize: '2.5rem' }}></i>
                    <h1 className="h4 mt-3 mb-2">Access denied</h1>
                    <p className="text-muted mb-1">
                        You're signed in as <strong>{role || 'your account'}</strong>. This area isn't
                        available to your account.
                    </p>
                    <p className="text-muted small">
                        If you believe you should have access, please contact your department admin.
                    </p>
                    <button className="btn btn-primary-edulearn mt-2" onClick={() => navigate('/dashboard')}>
                        <i className="bi bi-arrow-left me-1"></i>Back to dashboard
                    </button>
                </div>
            </div>
        </div>
    );
}
```

- [ ] **Step 2: Update `ProtectedRoute.jsx`** — replace the file contents with:

```jsx
import { Navigate } from 'react-router-dom';
import { authService } from '../services/authService';
import AccessDeniedPage from '../pages/AccessDeniedPage';

// Guards routes that require authentication. Optional role-based check.
export default function ProtectedRoute({ children, allowedRoles }) {
    const isAuth = authService.isAuthenticated();

    // Not logged in? Send to login.
    if (!isAuth) {
        return <Navigate to="/login" replace />;
    }

    // Logged in but wrong role? Show a clear, role-aware access-denied page in place.
    if (allowedRoles && allowedRoles.length > 0) {
        const { role } = authService.getCurrentUser();
        if (!allowedRoles.includes(role)) {
            return <AccessDeniedPage />;
        }
    }

    return children;
}
```

- [ ] **Step 3: Build.** From `edulearn.client`: `npm run build`. Expected: success.

- [ ] **Step 4: Manual check.** Sign in as a Student, navigate to `/reports` (Auditor/ITAdmin only) → the Access-Denied page renders inside the layout (navbar + sidebar visible), names the role, offers "Back to dashboard". Unauthenticated access still redirects to `/login`.

- [ ] **Step 5: Commit.**

```bash
git add edulearn.client/src/pages/AccessDeniedPage.jsx edulearn.client/src/components/ProtectedRoute.jsx
git commit -m "feat(client): role-aware Access-Denied page for out-of-scope routes"
```

---

### Task 13: PublicOnlyRoute + login navigation fix

**Files:**
- Create: `edulearn.client/src/components/PublicOnlyRoute.jsx`
- Modify: `edulearn.client/src/App.jsx` (public route wrappers)
- Modify: `edulearn.client/src/pages/LoginPage.jsx` (replace navigation, autoComplete, dead validation)

- [ ] **Step 1: Create `PublicOnlyRoute.jsx`:**

```jsx
import { Navigate } from 'react-router-dom';
import { authService } from '../services/authService';

// Wraps public auth pages. If already signed in, bounce to the dashboard so the
// browser back/forward buttons can't re-expose the login form after login.
export default function PublicOnlyRoute({ children }) {
    if (authService.isAuthenticated()) {
        return <Navigate to="/dashboard" replace />;
    }
    return children;
}
```

- [ ] **Step 2: Wire it into `App.jsx`.** Add the import near the other component imports:

```jsx
import PublicOnlyRoute from './components/PublicOnlyRoute';
```

Then wrap the five public auth routes. Replace:

```jsx
                <Route path="/login" element={<LoginPage />} />
                <Route path="/mfa/setup" element={<MfaSetupPage />} />
                <Route path="/mfa/verify" element={<MfaVerifyPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
```

with:

```jsx
                <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
                <Route path="/mfa/setup" element={<PublicOnlyRoute><MfaSetupPage /></PublicOnlyRoute>} />
                <Route path="/mfa/verify" element={<PublicOnlyRoute><MfaVerifyPage /></PublicOnlyRoute>} />
                <Route path="/forgot-password" element={<PublicOnlyRoute><ForgotPasswordPage /></PublicOnlyRoute>} />
                <Route path="/reset-password" element={<PublicOnlyRoute><ResetPasswordPage /></PublicOnlyRoute>} />
```

> Note: `/` (LandingPage) is intentionally left unwrapped.

- [ ] **Step 3: LoginPage — replace navigation with `replace`.** In `handleLogin`, change the MFA redirects and the final dashboard redirect:

Replace:

```jsx
                if (data.message?.toLowerCase().includes('enrollment')) {
                    navigate('/mfa/setup');
                } else {
                    navigate('/mfa/verify');
                }
                return;
```

with:

```jsx
                if (data.message?.toLowerCase().includes('enrollment')) {
                    navigate('/mfa/setup', { replace: true });
                } else {
                    navigate('/mfa/verify', { replace: true });
                }
                return;
```

And replace:

```jsx
            authService.saveSession(data.token, data.role, data.username);
            navigate('/dashboard');
```

with:

```jsx
            authService.saveSession(data.token, data.role, data.username);
            navigate('/dashboard', { replace: true });
```

- [ ] **Step 4: LoginPage — remove the unreachable double-validation.** Delete this line in `handleLogin`:

```jsx
        if (!usernameOrEmail.trim() || !password.trim()) return;
```

(The `validateNotWhitespace` check immediately above already covers it.)

- [ ] **Step 5: LoginPage — fix autoComplete.** On the `<form>`, remove `autoComplete="off"`. On the username `<input>`, change `autoComplete="off"` to `autoComplete="username"`. On the password `<input>`, change `autoComplete="new-password"` to `autoComplete="current-password"`. Remove the now-stale comment `{/* autoComplete="off" ... */}`.

- [ ] **Step 6: Build.** From `edulearn.client`: `npm run lint && npm run build`. Expected: success.

- [ ] **Step 7: Manual check.** Log in → land on dashboard → press browser Back → you are NOT shown the login form (bounced to dashboard); password manager offers to fill on the login page.

- [ ] **Step 8: Commit.**

```bash
git add edulearn.client/src/components/PublicOnlyRoute.jsx edulearn.client/src/App.jsx edulearn.client/src/pages/LoginPage.jsx
git commit -m "fix(auth): block back/forward bypass + restore password-manager autofill"
```

---

### Task 14: Code-splitting in App.jsx

**Files:**
- Modify: `edulearn.client/src/App.jsx`

- [ ] **Step 1: Read** `App.jsx`. Keep `BrowserRouter`, `Routes`, `Route`, `Navigate`, `AppLayout`, `ProtectedRoute`, and `PublicOnlyRoute` as **static** imports (they are needed for the shell). Convert all **page** imports (the ~50 `import XxxPage from './pages/...'` lines) to `React.lazy`.

- [ ] **Step 2: Update the top of the file.** Change the first import line to include `lazy` and `Suspense`:

```jsx
import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import AppLayout from './components/Layout/AppLayout';
import ProtectedRoute from './components/ProtectedRoute';
import PublicOnlyRoute from './components/PublicOnlyRoute';
import Loading from './components/Loading';
```

- [ ] **Step 3: Convert each page import** to the lazy form. For every page component, replace `import X from './pages/...'` with `const X = lazy(() => import('./pages/...'));`. Example for the full set (keep the exact paths from the original file):

```jsx
const LoginPage = lazy(() => import('./pages/LoginPage'));
const MfaSetupPage = lazy(() => import('./pages/MfaSetupPage'));
const MfaVerifyPage = lazy(() => import('./pages/MfaVerifyPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const LandingPage = lazy(() => import('./pages/LandingPage'));
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const ComingSoonPage = lazy(() => import('./pages/ComingSoonPage'));
const StudentsPage = lazy(() => import('./pages/students/StudentsPage'));
const NewStudentPage = lazy(() => import('./pages/students/NewStudentPage'));
const StudentDetailPage = lazy(() => import('./pages/students/StudentDetailPage'));
const ApplicantsPage = lazy(() => import('./pages/applicants/ApplicantsPage'));
const NewApplicantPage = lazy(() => import('./pages/applicants/NewApplicantPage'));
const ApplicantDetailPage = lazy(() => import('./pages/applicants/ApplicantDetailPage'));
const RoomsPage = lazy(() => import('./pages/rooms/RoomsPage'));
const RoomDetailPage = lazy(() => import('./pages/rooms/RoomDetailPage'));
const SectionsPage = lazy(() => import('./pages/sections/SectionsPage'));
const SectionDetailPage = lazy(() => import('./pages/sections/SectionDetailPage'));
const EnrollmentPage = lazy(() => import('./pages/enrollment/EnrollmentPage'));
const TimetablePage = lazy(() => import('./pages/timetable/TimetablePage'));
const TranscriptsPage = lazy(() => import('./pages/transcripts/TranscriptsPage'));
const ProgramsPage = lazy(() => import('./pages/programs/ProgramsPage'));
const ProgramDetailPage = lazy(() => import('./pages/programs/ProgramDetailPage'));
const ProgramFormPage = lazy(() => import('./pages/programs/ProgramFormPage'));
const CoursesPage = lazy(() => import('./pages/courses/CoursesPage'));
const CourseDetailPage = lazy(() => import('./pages/courses/CourseDetailPage'));
const CourseFormPage = lazy(() => import('./pages/courses/CourseFormPage'));
const AssessmentsPage = lazy(() => import('./pages/assessments/AssessmentsPage'));
const AssessmentDetailPage = lazy(() => import('./pages/assessments/AssessmentDetailPage'));
const AssessmentFormPage = lazy(() => import('./pages/assessments/AssessmentFormPage'));
const SubmissionsPage = lazy(() => import('./pages/submissions/SubmissionsPage'));
const SubmitPage = lazy(() => import('./pages/submissions/SubmitPage'));
const GradePage = lazy(() => import('./pages/submissions/GradePage'));
const ContentsPage = lazy(() => import('./pages/contents/ContentsPage'));
const ContentDetailPage = lazy(() => import('./pages/contents/ContentDetailPage'));
const ContentFormPage = lazy(() => import('./pages/contents/ContentFormPage'));
const ReportsPage = lazy(() => import('./pages/reports/ReportsPage'));
const KpisPage = lazy(() => import('./pages/reports/KpisPage'));
const AuditLogPage = lazy(() => import('./pages/reports/AuditLogPage'));
const GradeChangesPage = lazy(() => import('./pages/gradechanges/GradeChangesPage'));
const SyllabiPage = lazy(() => import('./pages/syllabi/SyllabiPage'));
const DiscussionsPage = lazy(() => import('./pages/discussions/DiscussionsPage'));
const FeesPage = lazy(() => import('./pages/finance/FeesPage'));
const InvoicesPage = lazy(() => import('./pages/finance/InvoicesPage'));
const ScholarshipsPage = lazy(() => import('./pages/finance/ScholarshipsPage'));
const PaymentsPage = lazy(() => import('./pages/finance/PaymentsPage'));
const NotificationsPage = lazy(() => import('./pages/notifications/NotificationsPage'));
const TicketsPage = lazy(() => import('./pages/notifications/TicketsPage'));
const UsersPage = lazy(() => import('./pages/users/UsersPage'));
const UserDetailPage = lazy(() => import('./pages/users/UserDetailPage'));
```

> If any page is a named export rather than default, use `lazy(() => import('...').then(m => ({ default: m.Name })))`. Verify each page's export style while editing.

- [ ] **Step 4: Wrap `<Routes>` in `<Suspense>`.** In the returned JSX, change:

```jsx
        <BrowserRouter>
            <Routes>
```

to:

```jsx
        <BrowserRouter>
            <Suspense fallback={<Loading message="Loading..." />}>
            <Routes>
```

and the matching closing tags from:

```jsx
            </Routes>
        </BrowserRouter>
```

to:

```jsx
            </Routes>
            </Suspense>
        </BrowserRouter>
```

- [ ] **Step 5: Build.** From `edulearn.client`: `npm run build`. Expected: success, and the build output now shows multiple split chunks instead of one large bundle.

- [ ] **Step 6: Manual check.** Run `npm run dev`; navigate across several routes (login → dashboard → courses → profile) — each loads with the `Loading` fallback flashing only on first visit; no blank screens or console errors.

- [ ] **Step 7: Commit.**

```bash
git add edulearn.client/src/App.jsx
git commit -m "perf(client): code-split routes with React.lazy + Suspense"
```

---

## TASK GROUP D — DASHBOARDS & CLEANUP

### Task 15: StudentDashboard — error surfacing, term constant, card a11y

**Files:**
- Modify: `edulearn.client/src/components/Dashboard/StudentDashboard.jsx`

- [ ] **Step 1: Imports & term.** Add after the existing imports:

```jsx
import ErrorAlert from '../ErrorAlert';
import { logger } from '../../utils/logger';
import { CURRENT_TERM } from '../../config/academic';
```

Remove the line `const TERM = '2026-Spring';` and replace remaining `TERM` references in the JSX with `CURRENT_TERM` (the hero badge `Student · {TERM}` → `Student · {CURRENT_TERM}`).

- [ ] **Step 2: Add error state.** After `const [loading, setLoading] = useState(true);` add:

```jsx
    const [error, setError] = useState(null);
```

- [ ] **Step 3: Replace the silent catch.** In `loadData`, change:

```jsx
        } catch { }
        setStats(s);
        setLoading(false);
```

to:

```jsx
        } catch (err) {
            logger.error('StudentDashboard load failed:', err);
            setError(err);
        }
        setStats(s);
        setLoading(false);
```

Also add `setError(null);` right after `setLoading(true);` at the top of `loadData`.

- [ ] **Step 4: Render the alert.** Immediately after the opening `<div className="role-dashboard">`, add:

```jsx
            {error && <ErrorAlert error={error} onDismiss={() => setError(null)} />}
```

- [ ] **Step 5: Stat-card keyboard a11y.** In the `STAT_CARDS.map`, change the card `<div>` opening to add `role`, `tabIndex`, and `onKeyDown` (mirroring InstructorDashboard):

```jsx
                        <div
                            className="rd-stat-card"
                            style={{ '--rd-accent': card.accent, cursor: 'pointer' }}
                            role="button"
                            tabIndex={0}
                            onClick={() => card.path && navigate(card.path)}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); card.path && navigate(card.path); } }}
                        >
```

- [ ] **Step 6: Build.** From `edulearn.client`: `npm run lint && npm run build`. Expected: success.

- [ ] **Step 7: Commit.**

```bash
git add edulearn.client/src/components/Dashboard/StudentDashboard.jsx
git commit -m "fix(client): StudentDashboard surfaces load errors, keyboard cards, shared term"
```

---

### Task 16: InstructorDashboard — error surfacing + term constant

**Files:**
- Modify: `edulearn.client/src/components/Dashboard/InstructorDashboard.jsx`

- [ ] **Step 1: Imports & term.** Add after existing imports:

```jsx
import ErrorAlert from '../ErrorAlert';
import { logger } from '../../utils/logger';
import { CURRENT_TERM } from '../../config/academic';
```

Remove `const TERM = '2026-Spring';` and replace every `TERM` reference in the file with `CURRENT_TERM` (hero badge, `sub: () => CURRENT_TERM`, "My Sections — {CURRENT_TERM}", the empty-state text).

- [ ] **Step 2: Error state.** After `const [loading, setLoading] = useState(true);` add:

```jsx
    const [error, setError] = useState(null);
```

- [ ] **Step 3: Replace the silent catch.** Change:

```jsx
        } catch { }
        setStats(s);
        setLoading(false);
```

to:

```jsx
        } catch (err) {
            logger.error('InstructorDashboard load failed:', err);
            setError(err);
        }
        setStats(s);
        setLoading(false);
```

Add `setError(null);` right after `setLoading(true);`.

- [ ] **Step 4: Render the alert.** After the opening `<div className="role-dashboard">`, add:

```jsx
            {error && <ErrorAlert error={error} onDismiss={() => setError(null)} />}
```

- [ ] **Step 5: Build.** `npm run lint && npm run build`. Expected: success.

- [ ] **Step 6: Commit.**

```bash
git add edulearn.client/src/components/Dashboard/InstructorDashboard.jsx
git commit -m "fix(client): InstructorDashboard surfaces load errors + shared term"
```

---

### Task 17: Delete dead courseService methods

**Files:**
- Modify: `edulearn.client/src/services/courseService.js`

- [ ] **Step 1: Confirm no callers.** Run: `grep -rn "getSyllabus\|updateSyllabus\|getPrerequisites\|addPrerequisite\|removePrerequisite" edulearn.client/src` — expected: matches only inside `courseService.js`. If any other file references them, STOP and report instead of deleting.

- [ ] **Step 2: Delete the five methods** (`getSyllabus`, `updateSyllabus`, `getPrerequisites`, `addPrerequisite`, `removePrerequisite`) and their comments, leaving `getAll`, `getById`, `create`, `update`, `remove`. The file ends:

```javascript
    // DELETE /api/courses/:id
    remove: async (id) => {
        const { data } = await axiosClient.delete(`/courses/${id}`);
        return data;
    },
};
```

- [ ] **Step 3: Build.** `npm run lint && npm run build`. Expected: success.

- [ ] **Step 4: Commit.**

```bash
git add edulearn.client/src/services/courseService.js
git commit -m "chore(client): remove dead courseService methods that 404"
```

---

### Task 18: Navbar dropdown ARIA

**Files:**
- Modify: `edulearn.client/src/components/Layout/Navbar.jsx`

- [ ] **Step 1: Avatar button ARIA.** On the avatar `<button onClick={() => setOpen(!open)} ...>`, add `aria-haspopup="menu"`, `aria-expanded={open}`, and `aria-label="User menu"`:

```jsx
                    <button
                        onClick={() => setOpen(!open)}
                        className="btn d-flex align-items-center gap-2 text-white"
                        aria-haspopup="menu"
                        aria-expanded={open}
                        aria-label="User menu"
                        style={{
```

- [ ] **Step 2: Dropdown panel role.** On the dropdown panel `<div className="position-absolute end-0 mt-2 bg-white rounded shadow-lg" ...>`, add `role="menu"`. On each of the three action `<button>`s inside it (Profile, Dashboard, Logout), add `role="menuitem"`.

- [ ] **Step 3: Build.** `npm run lint && npm run build`. Expected: success.

- [ ] **Step 4: Commit.**

```bash
git add edulearn.client/src/components/Layout/Navbar.jsx
git commit -m "a11y(client): announce navbar user menu state to screen readers"
```

---

### Task 19: Sidebar useMemo on the nav filter

**Files:**
- Modify: `edulearn.client/src/components/Layout/Sidebar.jsx`

- [ ] **Step 1: Read** `Sidebar.jsx` and locate where `NAV_ITEMS` is filtered by the current role inside the component (a `NAV_ITEMS.filter(...)` expression keyed on `role`/`'*'`).

- [ ] **Step 2: Add the import.** Ensure the React import includes `useMemo`:

```jsx
import { useMemo } from 'react';
```

(Add it if the file does not already import `useMemo`.)

- [ ] **Step 3: Memoize the filtered list.** Wrap the existing filter so it only recomputes when `role` changes. Replace the inline `const visibleItems = NAV_ITEMS.filter(item => item.roles.includes('*') || item.roles.includes(role));` (or equivalent variable used in the render) with:

```jsx
    const visibleItems = useMemo(
        () => NAV_ITEMS.filter(item => item.roles.includes('*') || item.roles.includes(role)),
        [role]
    );
```

> If the component currently inlines the filter directly in JSX, introduce the `visibleItems` memo above the return and map over `visibleItems` instead.

- [ ] **Step 4: Build.** `npm run lint && npm run build`. Expected: success, sidebar renders identically per role.

- [ ] **Step 5: Commit.**

```bash
git add edulearn.client/src/components/Layout/Sidebar.jsx
git commit -m "perf(client): memoize Sidebar nav filter by role"
```

---

### Task 20: AssessmentFormPage useEffect deps

**Files:**
- Modify: `edulearn.client/src/pages/assessments/AssessmentFormPage.jsx` (~line 41-43)

- [ ] **Step 1: Fix the dependency array.** Replace:

```jsx
    useEffect(() => {
        if (isInstructor && userId) loadMySections();
    }, []);
```

with:

```jsx
    useEffect(() => {
        if (isInstructor && userId) loadMySections();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isInstructor, userId]);
```

- [ ] **Step 2: Build.** `npm run lint && npm run build`. Expected: success.

- [ ] **Step 3: Commit.**

```bash
git add edulearn.client/src/pages/assessments/AssessmentFormPage.jsx
git commit -m "fix(client): correct AssessmentFormPage effect deps so sections reload on user change"
```

---

### Task 21: Mask the MFA secret on the profile setup modal

**Files:**
- Modify: `edulearn.client/src/pages/ProfilePage.jsx`

- [ ] **Step 1: Add reveal state.** Next to the other MFA state declarations (~line 36) add:

```jsx
    const [showMfaSecret, setShowMfaSecret] = useState(false);
```

- [ ] **Step 2: Reset it when opening setup.** In `handleMfaToggle`, in the `else` branch right before `setMfaSetupModal(true);`, add:

```jsx
                setShowMfaSecret(false);
```

- [ ] **Step 3: Mask the secret in the modal.** Replace the manual-secret block:

```jsx
                                    {/* Manual secret */}
                                    <div className="mb-3 text-center">
                                        <small className="text-muted">Or enter manually:</small><br />
                                        <code style={{ fontSize: '0.85rem', letterSpacing: 2 }}>{mfaSetupData.secret}</code>
                                    </div>
```

with:

```jsx
                                    {/* Manual secret — masked by default */}
                                    <div className="mb-3 text-center">
                                        <small className="text-muted">Or enter manually:</small><br />
                                        <code style={{ fontSize: '0.85rem', letterSpacing: 2 }}>
                                            {showMfaSecret ? mfaSetupData.secret : '•'.repeat(mfaSetupData.secret.length)}
                                        </code>
                                        <button
                                            type="button"
                                            className="btn btn-link btn-sm p-0 ms-2 align-baseline"
                                            onClick={() => setShowMfaSecret(v => !v)}
                                        >
                                            <i className={`bi ${showMfaSecret ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                                            {showMfaSecret ? ' Hide' : ' Show'}
                                        </button>
                                    </div>
```

- [ ] **Step 4: Build.** `npm run lint && npm run build`. Expected: success.

- [ ] **Step 5: Manual check.** As a privileged role, enable MFA → the secret is dotted by default; "Show" reveals it; QR still scans.

- [ ] **Step 6: Commit.**

```bash
git add edulearn.client/src/pages/ProfilePage.jsx
git commit -m "security(client): mask TOTP secret behind a reveal toggle on MFA setup"
```

---

## FINAL VERIFICATION

- [ ] **Backend build & tests.** `dotnet build EduLearn.API` (clean) and `dotnet test EduLearn_Testing` (all 282 pass).
- [ ] **Smoke suite.** `bash tests/smoke/run-all.sh` → same PASS count as the pre-change baseline (rate-limiting and the content-route rename were deliberately deferred to keep this green).
- [ ] **Frontend.** From `edulearn.client`: `npm run lint` (no new errors) and `npm run build` (clean, split chunks).
- [ ] **Manual smoke of the spec's acceptance checks:** case-sensitive login; back/forward bypass closed; friendly network/500 errors with no `/api/...` leak; role-aware Access-Denied; "Prefer not to say" Gender accepted.

---

## Self-Review (completed during authoring)

- **Spec coverage:** Themes A1 (Task 13), A2 (Task 1), B1/B2 (Tasks 9-10), C1/C2/C3 (Tasks 10/12/11), D (Tasks 8,15,16), E1/E2 (Tasks 15-16), F1 (Task 3), F2 (Task 2), F3 (Task 4), F4 (Task 5), F5 (Task 6), G1 (Task 7+15+16), G2 (Task 17), G3 (Task 20), G4 (Task 13), G5 (Task 18), G7 (Tasks 14+19), H1 (Task 2), I1 (Task 21). **G6 (JWT decode tolerance) dropped** — `authService.js` already falls back to `nameid`/`sub`/`email` short claims, so no change is needed.
- **Corrections vs spec:** `?? "0"` is **not** in `StudentsController` (Task 5 targets the real files: Enrollments, Submissions, Invoices, Payments, Timetable, Transcripts). `CreateStudentDto` was already `MaxLength(18)`; only `UpdateStudentDto`/`Student.cs` were `10` (Task 3).
- **Type consistency:** `getFriendlyError` returns `{ category, title, message, guidance }` and every consumer (ErrorAlert) reads those exact keys. `CURRENT_TERM` and `logger` names are consistent across all importers.
- **Placeholder scan:** none — every code step contains the actual code; the two read-first steps (Sidebar filter location, page export style in lazy conversion) include the exact transformation and fallback instruction.
