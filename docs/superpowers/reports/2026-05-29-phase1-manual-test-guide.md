# Phase 1 — Manual Test Guide

**Branch:** `DepAdmin_Fix`
**Date:** 2026-05-29
**Purpose:** Step-by-step manual verification of every Phase 1 fix — where to look and how to check.

---

## 0. Setup

### 0.1 Login accounts (seeded, MFA disabled — log in directly)

Run once (API must be running): `powershell -ExecutionPolicy Bypass -File tests\seed-manual-users.ps1`

| Role | Username | Password |
|------|----------|----------|
| ITAdmin | `admin` | `Admin@123` |
| Student | `student` | `Student@123` |
| Instructor | `instructor` | `Instructor@123` |
| Registrar | `registrar` | `Registrar@123` |
| DeptAdmin | `deptadmin` | `DeptAdmin@123` |
| Finance | `finance` | `Finance@123` |
| Auditor | `auditor` | `Auditor@123` |

> These persist in `EduLearnDb`. The seed is idempotent (re-running skips existing users).

### 0.2 Servers

- **Frontend:** http://localhost:5173  (Vite — always serves latest source)
- **Backend:** https://localhost:5001  (Swagger at `/swagger`)

> IMPORTANT: The backend must be running the **latest build** for the backend fixes below. If you change backend code, stop the running `EduLearn.API` process and `dotnet run --project EduLearn.API` again. (As of this guide, the running build was confirmed to include all Phase 1 backend fixes.)

### 0.3 Tip — open DevTools

Press **F12** in the browser. Keep the **Console** and **Network** tabs handy; several checks below use them.

---

## 1. Authentication

### 1.1 Case-sensitive username login (CRITICAL fix)

**Where:** http://localhost:5173/login

| Step | Input | Expected |
|------|-------|----------|
| a | `registrar` / `Registrar@123` | ✅ Logs in → dashboard |
| b | Log out. Try `Registrar` / `Registrar@123` (capital R) | ❌ "Invalid username or password" — login rejected |
| c | Try `ADMIN` / `Admin@123` | ❌ Rejected |
| d | Try `admin` / `Admin@123` | ✅ Logs in |
| e | Email login still case-insensitive: `Registrar@edulearn.local` / `Registrar@123` (any casing of the email) | ✅ Logs in |

**Verify quickly via Swagger/curl:** `POST /api/auth/login` with `{"usernameOrEmail":"Registrar","password":"Registrar@123"}` → `{"error":"Invalid username or password"}`.

---

### 1.2 Back / forward auth-bypass closed

**Where:** login flow + browser nav buttons

| Step | Action | Expected |
|------|--------|----------|
| a | Log in as any user → land on dashboard | Dashboard shows |
| b | Press the browser **Back** button | You are NOT shown the login form — you're bounced straight back to the dashboard |
| c | While logged in, manually type `http://localhost:5173/login` in the address bar | Immediately redirected to `/dashboard` (PublicOnlyRoute) |
| d | Log out, then press **Forward** | You cannot reach a protected page; you stay on login |

### 1.3 Password manager autofill restored

**Where:** login page

- Click into the username field — your browser/password manager should now **offer to autofill** saved EduLearn credentials (previously blocked by `autoComplete="off"`).
- After a successful login, the browser should **offer to save** the password.

---

## 2. Error Presentation (all 7 roles)

### 2.1 Friendly network error (backend down)

**Where:** login page, DevTools Network tab

| Step | Action | Expected |
|------|--------|----------|
| a | Stop the backend API (or disconnect) | — |
| b | On the login page, submit any credentials | A polished alert: **"Connection problem"** / "We couldn't reach the server." / "Check your internet connection and try again in a moment." |
| c | Confirm what is NOT shown | No `Network Error`, no `timeout of 15000ms exceeded`, no status code, no `/api/...` path |
| d | Restart the backend | Login works again |

### 2.2 Friendly server error (500)

If you can trigger a 500 (e.g., malformed action while testing), the alert reads **"Something went wrong"** / "An unexpected problem occurred on our side." / guidance to retry or contact the department admin. **No raw stack trace or route** is shown to the user. (In dev mode, a subordinate gray "technical details" block may appear below — that is intentional and dev-only.)

### 2.3 No API route leakage in 401/403 (backend)

**Where:** Swagger or DevTools Network tab

- Call any protected endpoint **without a token** → body is exactly:
  `{"error":"You need to sign in to continue.","code":"AUTH_REQUIRED","statusCode":401}`
  — **no** `endpoint` field, **no** `GET /api/...` text.
- Call an endpoint with the **wrong role** (e.g. `student` token → `GET /api/users`) → body is exactly:
  `{"error":"You don't have permission to perform this action.","code":"FORBIDDEN","statusCode":403}`
  — **no** role name, **no** route.

### 2.4 Role-aware Access-Denied page (in-app)

**Where:** http://localhost:5173

| Step | Action | Expected |
|------|--------|----------|
| a | Log in as **student** | Dashboard |
| b | Manually navigate to `http://localhost:5173/reports` (Auditor/ITAdmin only) | **Access-Denied page renders in place** — navbar + sidebar stay visible (not a silent redirect) |
| c | Read the copy | "You're signed in as **Student**. This area isn't available to your account." + "contact your department admin" + a **"Back to dashboard"** button |
| d | Repeat with `/kpis` and `/audit-log` | Same Access-Denied page |
| e | Log in as **auditor**, visit `/reports` | ✅ Page loads normally (allowed role) |

### 2.5 Crash page

The app-root error boundary now renders a **polished crash card** ("Something went wrong" + "Reload page" / "Try again" buttons) instead of a bare error string. This only appears on an unhandled React render error; in dev a collapsible "Technical details" section is available. (Hard to trigger deliberately — verified by build; visual style matches the alert/Access-Denied family.)

---

## 3. Dashboards

### 3.1 Error surfacing (no more blank dashboards)

**Where:** Student and Instructor dashboards

| Step | Action | Expected |
|------|--------|----------|
| a | Log in as **student**, then stop the backend and reload the dashboard | An **ErrorAlert** appears at the top of the dashboard ("Connection problem" …) instead of a silent blank page |
| b | Check DevTools **Console** | A `[EduLearn] StudentDashboard load failed:` error is logged (was silently swallowed before) |
| c | Repeat as **instructor** | Same behavior, `[EduLearn] InstructorDashboard load failed:` |

### 3.2 Stat-card keyboard accessibility (Student dashboard)

**Where:** Student dashboard

| Step | Action | Expected |
|------|--------|----------|
| a | Log in as **student** | Dashboard with clickable stat cards |
| b | Press **Tab** repeatedly | Focus ring lands on each stat card (they're now focusable, `role="button"`) |
| c | With a card focused, press **Enter** or **Space** | Navigates just like a mouse click |

### 3.3 Shared term constant

Both dashboards show the term badge **"2026-Spring"** (now sourced from one shared `CURRENT_TERM` constant). No behavior change — confirms nothing broke.

---

## 4. Forms & Data

### 4.1 Gender "Prefer not to say" accepted (backend column widened)

**Where:** Create / edit a Student

| Step | Action | Expected |
|------|--------|----------|
| a | Log in as **registrar** (or admin) → go to Students → **New Student** | Student form |
| b | Fill required fields; set **Gender = "Prefer not to say"** (18 chars) | — |
| c | Submit | ✅ Saves with **201** (no 400 / "value too long" error). Previously the 10-char column rejected it. |

> Verify via Swagger if preferred: `POST /api/students` with `"gender":"Prefer not to say"` → 201.

### 4.2 MFA secret masked on setup (security)

**Where:** Profile → enable MFA

| Step | Action | Expected |
|------|--------|----------|
| a | Log in as a privileged role (e.g. **finance**) → **Profile** | — |
| b | Start MFA setup | QR shows; the **manual secret is masked** (dots) by default |
| c | Click **Show** | Secret is revealed; button toggles to **Hide** |
| d | Confirm | The raw secret is not visible in the page by default |

---

## 5. Performance (observable signals)

### 5.1 Route code-splitting

**Where:** DevTools **Network** tab (filter: JS)

| Step | Action | Expected |
|------|--------|----------|
| a | Hard-reload the app (Ctrl+Shift+R) on the login page | Only the shell + the login chunk load — not all 50 pages |
| b | Navigate to Dashboard, then Courses, then Profile | Each navigation lazily fetches a **separate `*.js` chunk** (e.g. `DashboardPage-*.js`, `ProfilePage-*.js`) on first visit; a brief "Loading…" fallback may flash |
| c | Revisit a page | No re-fetch (already cached) |

> Build-side proof: `npm run build` in `edulearn.client` emits **91 split chunks** instead of one bundle.

### 5.2 N+1 query removal (Sections / Invoices lists)

Not directly visible in the UI (payloads are identical), but list endpoints `GET /api/sections`, `GET /api/sections/instructor/{id}`, and `GET /api/invoices` now issue a constant number of DB queries instead of one-per-row. Spot-check: the **Sections** and **Invoices** list pages load and display exactly as before — confirming no regression.

---

## 6. Accessibility (screen reader / inspector)

### 6.1 Navbar user menu ARIA

**Where:** top-right avatar menu, DevTools Elements inspector

- Inspect the avatar button → it now has `aria-haspopup="menu"`, `aria-expanded` (toggles true/false as you open/close), and `aria-label="User menu"`.
- The dropdown panel has `role="menu"`; the Profile / Dashboard / Logout buttons have `role="menuitem"`.

---

## 7. Items verified by build/tests (not manual clicking)

These Phase 1 changes have no distinct click-path; they're confirmed by the passing build/test suite:

- **Fail-closed claim parsing** (6 controllers) — a missing/corrupt JWT `NameIdentifier` now returns 401 `INVALID_TOKEN` instead of acting as user 0. (Normal logged-in usage is unchanged.)
- **AssessmentsController doc comment** — corrected to "Only Draft assessments can be updated."
- **Dead `courseService` methods removed** — 5 methods that 404'd are gone (grep-confirmed no callers).
- **Sidebar `useMemo`** — nav filter memoized by role (renders identically per role).
- **AssessmentFormPage effect deps** — sections reload correctly when the user changes.

**Regression safety net:** Backend `dotnet test EduLearn_Testing` → **299/299 pass**. Frontend `npm run build` → clean, 91 chunks.

---

## 8. Quick verification checklist

- [ ] `registrar` logs in; `Registrar` is rejected
- [ ] Email login still case-insensitive
- [ ] Back button after login does not show the login form
- [ ] `/login` while authenticated redirects to dashboard
- [ ] Password manager offers to fill/save on login
- [ ] Backend-down login shows "Connection problem" (no status code / no `/api/`)
- [ ] 401 body = `AUTH_REQUIRED`, no `endpoint`
- [ ] 403 body = `FORBIDDEN`, no role/route
- [ ] Student visiting `/reports` sees the role-aware Access-Denied page (in place)
- [ ] Auditor visiting `/reports` loads normally
- [ ] Student dashboard surfaces an ErrorAlert when backend is down (+ console log)
- [ ] Student stat cards are Tab-focusable and respond to Enter/Space
- [ ] New Student with Gender "Prefer not to say" saves (201)
- [ ] MFA setup secret is masked with a Show/Hide toggle
- [ ] Navigating routes loads separate JS chunks (Network tab)
- [ ] Navbar avatar button exposes `aria-haspopup`/`aria-expanded`/`aria-label`
