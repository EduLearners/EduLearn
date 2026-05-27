# EduLearn Form Validation Sprint — Teammate Handoff

**Branch:** `formValidation/Ashish`  
**Base:** `testing1/utkarsh-audit-sprint` at commit `dc20967`  
**Owner:** Ashish Sharma  
**Tests:** 299/299 passing  
**Last commit:** `294d7e7` — comprehensive form validation hardening + login redirect fix

---

## Step-by-Step: Pull, Build & Run

### 1. Pull the latest code

```bash
git fetch origin
git checkout formValidation/Ashish
git pull origin formValidation/Ashish
```

### 2. Apply database migrations

```bash
cd EduLearn.API
dotnet ef database update
```

> If `dotnet ef` is not installed: `dotnet tool install --global dotnet-ef`

### 3. Disable MFA for admin (one-time, in SQL Server)

If your admin user was seeded before this branch, MFA may still be enabled. Run against `EduLearnDb`:

```sql
UPDATE Users SET MFAEnabled = 0, MFASecret = NULL WHERE Username = 'admin';
```

> **New databases** are fine — the updated DbInitializer now seeds admin with `MFAEnabled = false`.

### 4. Start the backend (Terminal 1)

```bash
cd EduLearn.API
dotnet run
```

Wait until you see: `Now listening on: https://localhost:5001`

> **Port 5001 busy?** Kill the old process:
> ```
> netstat -ano | findstr :5001
> taskkill /PID <pid> /F
> ```

### 5. Start the frontend (Terminal 2)

```bash
cd edulearn.client
npm install
npm run dev
```

Open **http://localhost:5173**  
Login: **admin** / **Admin@123**

---

## What This Branch Does

Builds on Utkarsh's audit sprint (`testing1/utkarsh-audit-sprint`) with comprehensive form validation hardening across the entire codebase — frontend and backend.

---

## Changes Summary

### New File: `edulearn.client/src/utils/validators.js`

28 pure validator functions, zero npm dependencies. Every function returns `null` (valid) or an error string.

| Validator | Purpose |
|-----------|---------|
| `validatePhone` / `validatePhoneRequired` | Exactly 10 digits, no symbols |
| `validateEmail` | Proper format, no double-dots, auto-lowercased |
| `validateUsername` | `[a-zA-Z0-9_]` only, starts alphanumeric, 3–50 chars |
| `validatePassword` | Min 8 chars, at least one letter + one digit |
| `validateUrl` / `validateOptionalUrl` | Must start `http://` or `https://` |
| `validateTerm` | `YYYY-Season` format (e.g., `2026-Spring`) |
| `validateCourseCode` | 2–6 letters + 2–6 digits (e.g., `CS101`) |
| `validateJson` | Valid JSON object or array |
| `validatePositiveId` / `validateOptionalPositiveId` | Integer ≥ 1, no dots/dashes |
| `validatePositiveInteger` | Whole number within range |
| `validateAmount` | Monetary value within range |
| `validateScore` | Number between 0 and maxScore |
| `validateName` | Unicode letters + spaces/hyphens/apostrophes/dots |
| `validateTitle` | Letters, digits, spaces, basic punctuation |
| `validateProgramName` | Letters, digits, spaces, hyphens, parens, dots, ampersand |
| `validateBuildingName` | Letters, digits, spaces, hyphens, dots |
| `validateRoomNumber` | Alphanumeric + hyphens (e.g., `A-101`) |
| `validateLevel` | Optional, alphanumeric + spaces + hyphens |
| `validateReference` | Optional, alphanumeric + hyphens + slashes |
| `validateMinLength` / `validateNotWhitespace` | Generic length/blank checks |
| `validateDateRange` / `validateFutureDate` | Date comparisons |
| `validateVersion` | Semantic version (e.g., `v2.1.3`) |
| `validateAddress` / `validateNationalId` / `validateAwardType` | Domain-specific |
| `validateTotpCode` | Exactly 6 digits |
| `hasErrors` | Submit guard utility |

### Frontend Forms Updated (33 files)

Every form page now uses the validation pattern:
```jsx
const [errors, setErrors] = useState({});

// On each input:
onBlur={e => setErrors(prev => ({
    ...prev,
    fieldName: validateXxx(e.target.value)
}))}
className={`form-control${errors.fieldName ? ' is-invalid' : ''}`}

// Submit guard:
const next = { field1: validateXxx(val1), field2: validateYyy(val2) };
if (Object.values(next).some(Boolean)) { setErrors(next); return; }
```

**What was replaced:**
- `validateMinLength()` on structured fields → semantic validators (e.g., `validateTitle`, `validateProgramName`)
- Inline regex (e.g., `/^\d{10}$/`) → shared `validatePhone`, `validateEmail`
- Missing validation on 6 forms → added proper validators

### Backend DTOs Updated (22 files)

Added `[RegularExpression]` annotations matching frontend validators:
- User DTOs: Username, FullName, Phone regex
- Course/Program/Room DTOs: Code, Title, Level, Name, Building, RoomNumber regex
- Student/Applicant DTOs: Name, Gender, Term, NationalID regex
- Assessment/Content/Discussion/Ticket DTOs: Title/Subject regex
- Finance DTOs: Term, Reference, AwardType regex
- Syllabus DTOs: Version regex, `[Url]` on SyllabusURI
- Auth DTOs: RegisterDto Username/FullName/Phone, MfaVerifyDto Code regex

### Bug Fixes

| Fix | What was wrong | What we did |
|-----|---------------|-------------|
| validateTitle SyntaxError | `\"` escape invalid with regex `/u` flag → crashed 25+ pages | Removed unnecessary escape: `'"` instead of `'\"` |
| Admin login redirect loop | `vite.config.js` proxy targeted HTTP:5000, backend redirected to HTTPS:5001, auth headers lost | Changed proxy target to `https://localhost:5001` |
| Admin MFA blocks login | DbInitializer seeded `MFAEnabled = true` | Changed seed to `MFAEnabled = false` |

---

## Known Issues

- `KpisPage` has a React "unique key" warning — cosmetic, doesn't affect functionality
- `axiosClient.js` 401 interceptor is aggressive — any single 401 from a non-auth endpoint clears the session and redirects to login. This is by design but can mask real issues.

---

## Dev Notes

- **Vite proxy** points to `https://localhost:5001` — if backend runs on a different port, update `edulearn.client/vite.config.js`
- **Backend HTTPS redirect** is active (`app.UseHttpsRedirection()` in `Program.cs`) — always use HTTPS:5001 for API calls
- **No new NuGet packages**, no new DB tables, no background services
- **Build check:** `dotnet build` then `dotnet test` — should show 299/299 passed
- **Frontend build:** `npx vite build` — should show 185 modules, 0 errors
- **Design spec:** `docs/superpowers/specs/2026-05-27-form-validation-design.md`
