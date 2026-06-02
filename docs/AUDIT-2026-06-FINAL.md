# EduLearn Final Full-Stack Audit — 2026-06-02 (v2, corrected)

## Executive Summary

- **Scope:** Full-stack audit — backend API (29 controllers), frontend UI (7 roles), authorization matrix, edge inputs, wiring cross-check, chaos/resilience
- **Branch:** `Transh_fixing` | **Commit tested:** `83110ee` (merged to worktree `elegant-villani-5cc32d`)
- **Date:** 2026-06-02
- **Method:** Live browser testing via Claude Preview MCP + PowerShell API calls with JWT bearer tokens + **source-code verification** for every finding
- **Backend:** ASP.NET Core 8 on `https://localhost:5001` | **Frontend:** React 18 + Vite on `http://localhost:5173`

> **v2 NOTE — findings corrected after rigorous re-verification.** The first pass of this report contained **three false positives** (A1-02, A1-03, F-01) caused by an untested assumption: the IDOR probes were run with an instructor who *actually owned* the target section, so legitimate access was misread as a vulnerability. Re-testing with a genuinely non-owning instructor, plus reading the controller and frontend source, overturned those findings. This version reflects ground-truth evidence only.

---

## Bug Count Summary (corrected)

| Severity | Count | IDs |
|---|---|---|
| 🔴 Critical | 0 | — |
| 🟠 High | 0 | — |
| 🟡 Medium | 1 | F-03 |
| 🔵 Low/Info | 2 | A1-06, F-02 |
| **Total real findings** | **3** | |
| ✅ Verified FIXED | 4 | A1-02, A1-03, A1-10, A1-01 |
| ❌ False positives (retracted) | 1 | F-01 |

---

## Re-verification of Prior Findings — Ground Truth

| ID | Original claim | Verified result | Evidence |
|---|---|---|---|
| **A1-02** 🔴 | Any instructor can grade any submission (IDOR) | ✅ **FIXED** | Tested with `instructor2` (userID 17, owns sections 3,4 — NOT section 1). `POST /api/submissions/1/grade` → **403** `{"code":"NOT_YOUR_SECTION","error":"You can only grade submissions from your own sections"}`. My original 200 was because `instructor` (userID 3) **owns section 1** — legitimate grading. |
| **A1-03** 🟠 | Any instructor reads any submission by ID | ✅ **FIXED** | `instructor2` → `GET /api/submissions/1` → **403**. Ownership scope enforced. |
| **A1-10** 🟡 | Status dropdown is a dead UI element | ✅ **FIXED** | `AssessmentFormPage.jsx:191` calls `assessmentService.updateStatus()` → `PUT /api/assessments/{id}/publish` (`assessmentService.js:51-53`). Client-side transition guard (`AssessmentFormPage.jsx:172-182`) blocks invalid jumps (e.g. Draft→Closed) before any API call. Non-Draft shows lock banner (`:247-252`). Confirmed live: editing Published assessment shows the blue lock banner. |
| **A1-01** 🔵 | Unlinked student loops on "Resolving your student record…" | ✅ **FIXED (loop)** | `EnrollmentPage.jsx:186-193` catches the 404, sets `studentId='-1'` to stop the spinner, and sets a helpful message. Live: only **4** `/api/students/me` calls (StrictMode double-render), no infinite loop. **However see F-03** — the helpful message is masked. |
| **F-01** 🟡 | Tickets modal not using ModalPortal → footer clipped | ❌ **FALSE POSITIVE (retracted)** | `TicketsPage.jsx:390,514,591` wraps all modals in `<ModalPortal>`, which portals to `document.body` (`ModalPortal.jsx:13-14`). My "footer clipped" measurement was an artifact of the 311px preview viewport (modal has `maxHeight:90vh` + internal scroll). |

---

## Findings (real, confirmed)

### [F-03] 🟡 Medium — `getFriendlyError` mislabels custom error objects as "Connection problem"

- **Location:** `edulearn.client/src/utils/errorMessage.js:29`
- **Root cause:** The network-error branch condition is `if (error._userMessage || error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED' || !error.response)`. Any custom error object of the shape `{ message, code }` (which pages throw for domain conditions) has **no `.response` property**, so `!error.response` is `true` and it is categorized as a **network "Connection problem"** — discarding the page's intended `message`.
- **Confirmed impact chain (3 files):**
  1. `EnrollmentPage.jsx:188-191` sets `{ message: "We couldn't find your student record. Please contact the Registrar...", code: 'STUDENT_RECORD_NOT_FOUND' }` on a 404.
  2. `ErrorAlert.jsx:6` passes it to `getFriendlyError`.
  3. `getFriendlyError` returns `{ title: 'Connection problem', message: "We couldn't reach the server." }` — the registrar guidance is **lost**.
- **Live evidence:** Logged in as `studentnolink` → `/enrollment` rendered **"Connection problem — We couldn't reach the server. Check your internet connection"** instead of the intended "contact the Registrar" message. Network showed `/api/students/me → 404` (not a network failure).
- **Expected vs Actual:** Expected the helpful, specific message. Actual: a misleading connectivity message that sends the user down the wrong troubleshooting path.
- **Scope:** Affects **every** page that passes a custom `{message, code}` object (not an axios error) to `ErrorAlert`. This silently defeats the A1-01 UX fix.
- **Suggested fix:** Reorder the checks in `getFriendlyError` — only treat as network when `error.code` is `ERR_NETWORK`/`ECONNABORTED` or `error._userMessage` is set; for a plain object with a `.message` and no `.response`, surface `error.message` (sanitized) instead of the network fallback.
- **Status:** OPEN

---

### [A1-06] 🔵 Low — `/api/users` has no pagination

- **Location:** `EduLearn.API/Controllers/UsersController.cs` + `edulearn.client/src/pages/users/UsersPage.jsx`
- **Evidence:** `GET /api/users` returns a flat array of all 18 users. `GET /api/users?page=1&pageSize=2` **still returns all 18** — `page`/`pageSize` are ignored. No server-side pagination, no client paginator.
- **Impact:** Performance/UX degradation at scale (hundreds of users render in one list). Not a functional or security bug.
- **Status:** OPEN

---

### [F-02] 🔵 Low — Student dashboard fires forbidden `/api/sections/{id}` (403) per enrollment

- **Location:** `edulearn.client/src/components/Dashboard/StudentDashboard.jsx:54`
- **Root cause:** `activeEnrollments.map(e => sectionService.getById(e.sectionID).catch(() => null))` — `GET /api/sections/{id}` requires `RosterViewPolicy` (Instructor/Registrar/DeptAdmin/ITAdmin). Students always receive **403**.
- **Live evidence (network):** On Student dashboard load — `GET /api/sections/1 → 403`, `GET /api/sections/5 → 403`.
- **Impact:** The `.catch(() => null)` swallows the error so the dashboard does **not** break — but (a) it generates avoidable 403 noise on every student dashboard load, and (b) section-detail enrichment (schedule/room) silently fails to display for students.
- **Suggested fix:** Use a student-scoped endpoint (or include section summary in the enrollment payload) instead of the roster-only `GET /api/sections/{id}`.
- **Status:** OPEN

---

## Phase 1 — Backend Contract Results

### Reachability — 29 controllers (ITAdmin token)
All 29 controllers reachable. 27 returned 200 on their primary GET; `AuditPackages /{id}/download` → 404 (expected — no package generated yet); `users/me` → 400 (needs profile context). Scoped routes (`/enrollment/student/{id}`, `/content/course/{id}`, `/submissions/assessment/{id}`, etc.) all 200.

### Authorization Matrix — 16/16 PASS
Student denied (403) on: POST courses, GET users, POST fees/scholarships/invoices/assessments/applicants/students/rooms, GET health. Auditor denied (403) on POST fees/courses. Instructor denied on POST payments. Finance denied on POST assessments. Anonymous → 401 on protected GETs. **All correct.**

### Edge Input Validation — 6/6 PASS
Empty body, negative credits, 500-char title, negative payment amount, SQL-injection title, XSS title → all **400** with friendly validation messages. XSS/SQL strings rejected with `"Title contains invalid characters"`. **No 500s, no SQL execution, no leaks.**

### IDOR re-probe — PASS (see A1-02/A1-03 above)
`instructor2` (non-owner) blocked with 403 on both read and grade of submission 1.

---

## Phase 3 — Chaos & Resilience Results

| Test | Result | Evidence |
|---|---|---|
| **3.1 Backend death mid-action** | ✅ PASS | Killed `:5001` PID, reloaded `/users`. Spinner stopped (15s axios timeout), friendly error *"Something went wrong — An unexpected problem occurred on our side"* (Vite proxy → 500), **no stack/route/status leak**. |
| **3.1 Recovery** | ✅ PASS | Restarted backend, reloaded → all 18 user rows render, no error. App recovers cleanly. |
| **3.4 bfcache / session guard** | ✅ PASS | Logged out (cleared token → `/login`), pressed history Back → redirected to `/login`, user table NOT re-exposed, no token. Protected page does not leak to logged-out user. |
| **3.3 Toast / badge live update** | ✅ PASS | `PUT /notifications/read-all → 204`; bell badge dropped 14→0 immediately via `notifications:read` custom event. |
| **3.2 Network offline / throttle emulation** | ⚠️ NOT TESTED | No network-emulation tool available (Claude Preview has none; Chrome DevTools MCP plugin not installed; Claude-in-Chrome extension not paired). Backend-kill (3.1) partially covers the "server unreachable" path. **Recommend running 3.2 with a connected Chrome DevTools instance.** |

---

## Phase 4 — Wiring Matrix

- All 28 frontend services map to a backend controller. **No dangling calls.**
- `contentService.js` → `/content/upload` is valid (`ContentsController.cs:35` has `[HttpPost("upload")]`).
- `auditPackageService.js`, `plagiarismService.js`, `timetableService.js`, `transcriptService.js` all correctly wired.
- **Orphan (acceptable):** `HealthController` (`/api/health`) has no frontend service — it is an ITAdmin-only diagnostic endpoint, intentionally not surfaced in the UI.

---

## Tooling Limitation (transparency)

The audit plan specifies driving a **visible external Chrome** via the `chrome-devtools-mcp` plugin. That plugin is **not installed** in this environment, and the Claude-in-Chrome extension is **not paired** (`list_connected_browsers` → empty; `switch_browser` → no browser). Browser testing was therefore done through the **Claude Preview** headless Chromium (a real browser engine, controlled in-process). This is fully capable for DOM/network/console inspection and backend-kill chaos, but **cannot emulate network offline/throttle** — the one Phase 3 gap (3.2). To close it, install `chrome-devtools-mcp` or pair the Chrome extension and re-run Phase 3.2.

---

## Recommendations (prioritized)

1. **F-03 (Medium)** — Fix `getFriendlyError` ordering in `errorMessage.js` so custom `{message, code}` objects surface their own message instead of the generic "Connection problem". This restores the A1-01 helpful text and fixes the same class of mislabeling across all pages.
2. **F-02 (Low)** — Stop StudentDashboard from calling roster-only `GET /api/sections/{id}`; use a student-scoped source for section detail.
3. **A1-06 (Low)** — Add server-side pagination to `/api/users` + a client paginator.
4. **Phase 3.2** — Re-run network offline/throttle chaos once a Chrome DevTools-capable browser is connected.

---

## Verdict

After rigorous, source-verified re-testing, **the EduLearn `Transh_fixing` branch is in strong shape.** The previously-claimed critical security fixes (A1-02 IDOR grade, A1-03 IDOR read) are **genuinely working**, the assessment status lifecycle (A1-10) and unlinked-student handling (A1-01) are **fixed**, authorization is airtight (16/16), input validation is robust (6/6, including injection), and the app degrades gracefully when the backend dies. The only real defects are one Medium UX bug (F-03, misleading error message) and two Low items (F-02 dashboard 403 noise, A1-06 no pagination).

---

*Report v2 generated: 2026-06-02 | Auditor: Claude (automated, source-verified) | Branch: Transh_fixing@83110ee*
