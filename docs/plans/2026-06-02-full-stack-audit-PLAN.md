# EduLearn Final Full-Stack Audit — Executable Plan

> **For agentic workers:** This is an AUDIT plan, not a code-implementation plan. It is **report-only**: you LOG findings, you do NOT change code unless the user explicitly tells you to switch to a fix pass. Use checkbox (`- [ ]`) syntax to track progress. Append findings to the master report as you go so progress survives a crash or context compaction.

**Goal:** Perform the deepest end-to-end audit of EduLearn to date — backend API correctness, frontend UI/UX, all 7 roles, deep + edge + form-validation + chaos testing, and a 100% backend↔frontend wiring cross-check — driven live in a visible Chrome instance the user watches.

**Architecture:** 6 phases (Setup/Seed → Backend Contract → Role Journeys → Chaos/Resilience → Wiring Audit → Synthesis). Role-first within Phase 2. Every finding goes to one append-only master report.

**Tech Stack:** ASP.NET Core 8 + EF Core + SQL Server LocalDB (backend), React 18 + Vite + Bootstrap 5 + axios (frontend), Chrome DevTools MCP (browser control), PowerShell (seed + process control).

---

## CRITICAL ORIENTATION — Read this first (you have zero prior context)

### Where the app lives
- **Live working copy (edit/test THIS one):** `C:\Users\2487421\OneDrive - Cognizant\Desktop\Vikash\EduLearn`
- **Branch:** `Transh_fixing`
- **DO NOT touch** `…\Desktop\ProjectWork\EduLearn` — that is an older clone on `Development`, missing modules. Wrong copy = wasted work.
- All paths below are relative to the live copy unless absolute.

### Ports & URLs
| Thing | URL |
|---|---|
| Frontend (Vite) | `http://localhost:5173` |
| Backend HTTPS | `https://localhost:5001` (self-signed cert; curl needs `-k`) |
| Backend HTTP | `http://localhost:5000` |
| Swagger | `https://localhost:5001/swagger` |

### How to start the app (two background processes)
```
# Backend — run from the API project folder
cd "C:\Users\2487421\OneDrive - Cognizant\Desktop\Vikash\EduLearn\EduLearn.API"
dotnet run
```
```
# Frontend — run from the client folder
cd "C:\Users\2487421\OneDrive - Cognizant\Desktop\Vikash\EduLearn\edulearn.client"
npm run dev
```
Start each with `run_in_background: true` so you keep control. Wait until backend logs "Now listening on https://localhost:5001" and Vite logs "Local: http://localhost:5173/" before proceeding.

### How to confirm backend is up (the /api/health endpoint is ITAdmin-only)
Port check is the reliable, auth-free signal:
```powershell
Get-NetTCPConnection -LocalPort 5001 -ErrorAction SilentlyContinue | Select-Object State,OwningProcess
```
Empty result = backend down. A `Listen` row = up. (The `/api/health` endpoint requires an ITAdmin bearer token — only use it once logged in as admin.)

### How to KILL the backend (Phase 3 chaos) and restart it
```powershell
# Find and kill the dotnet process serving :5001
$pid5001 = (Get-NetTCPConnection -LocalPort 5001 -ErrorAction SilentlyContinue).OwningProcess
if ($pid5001) { Stop-Process -Id $pid5001 -Force }
```
Restart by re-running the `dotnet run` background command above. **Never kill the Vite/:5173 process during backend chaos** — the whole point is to watch the still-running frontend react to a dead backend.

### Seed accounts (all MFA disabled — direct login)
| Username | Password | Role |
|---|---|---|
| `admin` | `Admin@123` | ITAdmin |
| `student` | `Student@123` | Student |
| `instructor` | `Instructor@123` | Instructor |
| `registrar` | `Registrar@123` | Registrar |
| `deptadmin` | `DeptAdmin@123` | DeptAdmin |
| `finance` | `Finance@123` | Finance |
| `auditor` | `Auditor@123` | Auditor |

### Chrome DevTools MCP — load tools before using them
These tools are DEFERRED. At session start run this ToolSearch query to load them:
```
ToolSearch query: select:mcp__plugin_chrome-devtools-mcp_chrome-devtools__list_pages,mcp__plugin_chrome-devtools-mcp_chrome-devtools__new_page,mcp__plugin_chrome-devtools-mcp_chrome-devtools__navigate_page,mcp__plugin_chrome-devtools-mcp_chrome-devtools__take_snapshot,mcp__plugin_chrome-devtools-mcp_chrome-devtools__take_screenshot,mcp__plugin_chrome-devtools-mcp_chrome-devtools__click,mcp__plugin_chrome-devtools-mcp_chrome-devtools__fill,mcp__plugin_chrome-devtools-mcp_chrome-devtools__fill_form,mcp__plugin_chrome-devtools-mcp_chrome-devtools__evaluate_script,mcp__plugin_chrome-devtools-mcp_chrome-devtools__wait_for,mcp__plugin_chrome-devtools-mcp_chrome-devtools__list_network_requests,mcp__plugin_chrome-devtools-mcp_chrome-devtools__list_console_messages,mcp__plugin_chrome-devtools-mcp_chrome-devtools__emulate,mcp__plugin_chrome-devtools-mcp_chrome-devtools__resize_page
```
Usage rules:
- `new_page` → `http://localhost:5173` opens a VISIBLE Chrome the user watches.
- Prefer `take_snapshot` (returns element `uid`s you click/fill with) over `take_screenshot`.
- Use `evaluate_script` for cheap factual DOM/state reads (e.g. read a toast's text, count table rows) instead of huge snapshots. The `/users` snapshot alone is ~500 lines.
- Use `take_screenshot` only when the USER needs to see a visual (layout/clipping bugs) or to attach a finding.
- Use `list_network_requests` after every action to capture the real HTTP status/shape.
- Use `list_console_messages` to catch JS errors the UI swallows.
- Use `emulate` (network/offline) and `resize_page` (narrow viewport) for chaos and responsive checks.

### Login procedure in browser (repeat per role)
1. `navigate_page` → `http://localhost:5173/login`
2. `take_snapshot`, find the username + password inputs and Sign In button uids
3. `fill` username, `fill` password (from the table above), `click` Sign In
4. `wait_for` text "Dashboard" (or the role's landing content)
5. To switch roles: open the avatar menu (top-right) → Logout, then repeat. Verify after logout that pressing browser Back does NOT re-expose the dashboard (bfcache guard test — see Phase 3).

---

## Conventions the audit must ENFORCE (flag any violation as a finding)

| Convention | What "pass" looks like | Flag if… |
|---|---|---|
| Button color | Every action button uses class `btn-primary-edulearn` (dark navy) | You see `btn-primary`, `btn-outline-primary`, or `btn-link` used for a primary action |
| Modals | Rendered via `ModalPortal`; footer/buttons always visible, never clipped; body scrolls | Modal footer cut off, dialog sized to a tiny box, or background scroll bleaks |
| No JSON inputs | All former JSON fields are structured UI (checkboxes, dynamic rows, scoped ID fields) | Any raw JSON `<textarea>`/`<input>` expecting hand-typed JSON |
| Read-only locks | Locked fields are `readOnly` + `bg-light` + `cursor:not-allowed` and truly uneditable | A "locked" field still accepts typing or changes the payload |
| Friendly errors | API failures show a human message via `getFriendlySimpleMessage`; never raw "status code 500", stack, route, or SQL | Any leaked status code, stack trace, route, or SQL text in the UI |
| Toasts | Success/info toasts appear AND auto-dismiss on their timer; don't stack infinitely | Toast never dismisses, stacks unbounded, or no feedback at all on success |
| Bell badge | Unread count updates live after mark-read (custom event `notifications:read`), not only on 60s poll | Badge stays stale after marking read |
| bfcache guard | After logout, Back→Forward does NOT show a stale authenticated page (forced reload) | A protected page renders for a logged-out user via history nav |
| Number inputs | Mouse-wheel over a focused number field does NOT change its value | Scrolling changes a number field's value |

---

## The fixed per-page checklist (apply to EVERY page in Phase 2)

For each page a role can reach, run all 7 and record pass/fail per item:

1. **Happy path** — page loads, renders expected data, primary action (create/edit/submit/grade/pay) succeeds, result is correct in UI and persists on reload.
2. **Form validation** — for every input: empty-required, whitespace-only, max-length + 1 char, negative / zero where invalid, invalid email, past/invalid date, unicode + emoji, very long string (500+ chars), and injection strings `' OR 1=1 --` and `<script>alert(1)</script>`. Expected: inline validation blocks bad input; injection is stored/escaped harmlessly (never executed, never 500).
3. **UI/UX inventory** — button classes (`btn-primary-edulearn`), modal via ModalPortal + not clipped, empty state present, loading spinner present, read-only locks honored, layout intact at narrow viewport (`resize_page` to 390×844).
4. **Messages** — success path shows a toast/alert that auto-dismisses; error path shows a friendly message (no leaked internals). Capture the exact message text via `evaluate_script`.
5. **Notifications** — actions that should notify someone do (e.g. assessment publish → enrolled students; ticket create → ITAdmins; grade → student). Verify the bell badge updates live and mark-read works.
6. **Edge data vs rich seed** — pagination/sort behavior on long lists, full vs waitlisted vs empty sections, paid/partial/overdue invoices, archived/closed assessments, boundary GPA values.
7. **Authz / IDOR** — try to reach another user's resource by direct URL/ID (e.g. `/submissions/{otherId}`, `/students/{otherId}`). Expected: 403 or scoped-empty, never another user's data. Confirm the API status via `list_network_requests`.

Record each finding immediately (see Phase 5 format). Don't batch — append-as-you-go.

---

## Role → Page inventory (authoritative, from `Sidebar.jsx`)

Test exactly these routes per role. `+` marks detail/form sub-pages reachable from the list page.

- **Student:** `/dashboard` `/enrollment` `/timetable` `/courses`(+detail) `/assessments`(+detail) `/submissions`(+`/submit`) `/contents`(+detail) `/syllabi` `/discussions` `/transcripts` `/invoices` `/programs`(+detail) `/notifications` `/tickets` `/profile`
- **Instructor:** `/dashboard` `/sections`(+detail) `/courses`(+form) `/assessments`(+`/assessments/new`,+detail,+edit) `/submissions`(+`/grade`) `/grade-changes` `/contents`(+form) `/syllabi` `/discussions` `/students`(+detail) `/timetable` `/notifications` `/tickets` `/profile`
- **Registrar:** `/dashboard` `/applicants`(+`/new`,+detail) `/students`(+`/new`,+detail) `/sections`(+detail) `/enrollment` `/transcripts` `/courses` `/syllabi` `/discussions` `/timetable` `/programs`(+detail) `/notifications` `/tickets` `/profile`
- **DeptAdmin:** `/dashboard` `/programs`(+`/new`,+detail) `/courses`(+form,+detail) `/students`(+detail) `/sections`(+detail) `/rooms`(+detail) `/syllabi` `/discussions` `/notifications` `/tickets` `/profile` (NOTE: Timetable intentionally hidden — `EnrollmentViewPolicy` excludes DeptAdmin; if `/timetable` is deep-linked it should 403/redirect, verify that.)
- **Finance:** `/dashboard` `/fees` `/invoices` `/payments` `/scholarships` `/notifications` `/tickets` `/profile`
- **Auditor (read-only):** `/dashboard` `/reports` `/kpis` `/audit-log` `/audit-packages` `/grade-changes` `/notifications` `/tickets` `/profile` — every mutation control must be absent or 403. (NOTE: Audit Packages *generate* IS allowed for Auditor + ITAdmin — it produces a compliance bundle, not a domain mutation.)
- **ITAdmin (sees everything):** `/dashboard` `/users`(+detail) `/applicants` `/students` `/sections` `/rooms` `/enrollment` `/timetable` `/transcripts` `/programs` `/courses` `/syllabi` `/discussions` `/assessments` `/submissions` `/grade-changes` `/contents` `/fees` `/invoices` `/payments` `/scholarships` `/reports` `/kpis` `/audit-log` `/audit-packages` `/notifications` `/tickets` `/profile`

---

## Backend ↔ Frontend reference lists (for Phase 4 wiring audit)

**29 controllers** (`EduLearn.API/Controllers/`): Auth, Users, AuditLog, Applicants, Students, Transcripts, Enrollments, Sections, Rooms, Timetable, Courses, Programs, Contents, Discussions, Syllabi, Assessments, Submissions, GradeChanges, Plagiarism, Fees, Scholarships, Invoices, Payments, Reports, KPIs, AuditPackages, Notifications, Tickets, Health.

**28 frontend services** (`edulearn.client/src/services/`): applicant, enrollment, room, timetable, transcript, submission, content, report, kpi, auditLog, gradeChange, syllabus, discussion, payment, ticket, notification, student, user, auth, fee, invoice, program, scholarship, section, assessment, plagiarism, course, **auditPackage** (+ `safeUri` helper). NOTE: `auditPackageService.js` was added in commit `8063848` — AuditPackages is now wired (`POST /audit-packages/generate`, `GET /audit-packages/{id}/download[?format=json]`).

Note the asymmetries to investigate: **Health** controller has no dedicated frontend service — confirm whether the UI ever calls `/api/health` (likely unused by pages; ITAdmin-only). Flag any backend controller with zero frontend callers and any frontend service method whose endpoint 404s.

---

## Known prior findings — RE-VERIFY each (don't assume fixed/unfixed)

| ID | Where | Claim to re-test |
|---|---|---|
| A1-02 🔴 | `SubmissionsController.cs` `POST /api/submissions/{id}/grade` | Can an instructor who owns NO section still grade a submission? (prior: YES = IDOR) |
| A1-03 🟠 | `SubmissionsController.cs` `GET /api/submissions/{id}` | Can any instructor read any submission by direct ID? |
| A1-10 🟡 | `AssessmentFormPage.jsx` + `assessmentService.updateStatus` → `PUT /api/assessments/{id}/publish` | **CLAIMED FIXED by `8063848`.** Status dropdown is now wired to the publish endpoint with a client-side transition guard. Verify it works AND that invalid transitions are blocked (see Task 2.2). |
| A1-01 🔵 | `EnrollmentPage.jsx` `GET /api/students/me` | Unlinked student → does `/enrollment` loop on "Resolving your student record…"? |
| A1-06 🔵 | `UsersPage.jsx` | Does `/users` render all rows with no pagination? |

The git history claims commit `27c3216` "Fix CRITICAL authorization bugs A1-07, A1-02, A1-03" and `944bc74` "Mark all CRITICAL and MEDIUM bugs as FIXED" — **treat these as claims to verify by live test, not facts.**

### RKA module changes to verify (commit `8063848` — landed 2026-06-02)

These are NEW or CHANGED behaviors. Each must be tested as part of the relevant role pass (cross-referenced in Phase 2) AND has a dedicated regression task (Phase 2.8).

| Change | Where | What to verify |
|---|---|---|
| Audit Packages page (RKA-03) | `/audit-packages`, `AuditPackagesPage.jsx`, `auditPackageService.js` | Generate by date range, PDF + JSON download, expand contents, date validation, Auditor + ITAdmin access; Student/Finance/etc. get 403 on deep-link |
| Assessment status now live | `AssessmentFormPage.jsx`, `PUT /{id}/publish` | Full lifecycle Draft→Published→Closed→Archived works; invalid jumps blocked client-side; non-Draft shows field-lock banner |
| Audit Log chart fix | `AuditLogPage.jsx` `ActivityChart` | Chart renders bars (was always blank from double-`Z` timestamp bug); table timestamps correct in IST |
| Audit Log button color | `AuditLogPage.jsx` | "show all" button is `btn-outline-secondary` (was `btn-outline-primary`) |
| Reports + KPIs toasts | `ReportsPage.jsx`, `KpisPage.jsx` | Success feedback is the auto-dismiss `Toast` component, not a static alert |
| KPI recalculate works | `KPIsController.cs`, `/kpis` | 4 KPIs now: Active Student Count, Section Fill Rate, Assessment Completion Rate, Invoice Collection Rate — each has a `ComputationKey`; recalculate returns real values, not nulls/errors |
| Current term = 2026-Fall | `config/academic.js`, 5 dashboards, enrollment/section/timetable | Default term shown everywhere is `2026-Fall` and matches the seed term; enrollment/section/timetable lists default to it and return data |
| 3 EF migrations | `Migrations/20260602000001..3` | `migrate-database` applies cleanly; assessment `InstructionsURI` saves; student `Gender` accepts a 50-char value; KPI `ComputationKey` column exists |

---

# PHASES

## Phase 0 — Setup & Rich Seed

**Files:** none modified (uses existing `tests/seed-sample-data.ps1`, optionally adds `tests/seed-volume-data.ps1`).

- [ ] **Step 1: Confirm you are on the right copy + branch**

Run:
```powershell
cd "C:\Users\2487421\OneDrive - Cognizant\Desktop\Vikash\EduLearn"; git rev-parse --abbrev-ref HEAD; git status --short
```
Expected: branch `Transh_fixing`. If working tree is dirty, note it in the report (audit runs against committed state).

- [ ] **Step 2: Apply database migrations (3 new ones landed in `8063848`)**

The API does NOT auto-run migrations on startup. Commit `8063848` added `20260602000001_AddAssessmentInstructionsURI`, `20260602000002_WidenStudentGender`, `20260602000003_AddKpiComputationKey`. Apply them before starting:
```powershell
cd "C:\Users\2487421\OneDrive - Cognizant\Desktop\Vikash\EduLearn"; dotnet ef database update --project EduLearn.API --startup-project EduLearn.API
```
(or run `migrate-database.bat`). Expected: ends "Done." with no error. Then confirm the 3 migrations are listed as applied:
```powershell
dotnet ef migrations list --project EduLearn.API --startup-project EduLearn.API
```
Expected: the three `20260602000001..3` entries appear WITHOUT a "(pending)" marker.

- [ ] **Step 3: Start backend (background) and wait for listen**

Run (background): `cd "C:\Users\2487421\OneDrive - Cognizant\Desktop\Vikash\EduLearn\EduLearn.API"; dotnet run`
Then poll: `Get-NetTCPConnection -LocalPort 5001 -ErrorAction SilentlyContinue | Select State`
Expected: a `Listen` row appears within ~30s.

- [ ] **Step 4: Reseed base data from scratch**

Run:
```powershell
cd "C:\Users\2487421\OneDrive - Cognizant\Desktop\Vikash\EduLearn"; powershell -ExecutionPolicy Bypass -File tests\seed-sample-data.ps1 -Reset
```
Expected: cyan `==>` step lines, green `OK` lines, ends without a red `ERR`. If it errors on null courseIDs or leftover Courses, see the seed-bug notes in `memory/edulearn_audit_2026-06.md` (FK-disable around wipe; resolve course IDs by code).

- [ ] **Step 5: Generate RICH multi-record volume**

The base seed makes one linked set. For volume testing, create additional records THROUGH THE API as the correctly-authorized role (mirror the `Api` helper pattern at the top of `seed-sample-data.ps1`). Target volume — create a `tests/seed-volume-data.ps1` that adds:
  - **≥3 programs**, **≥8 courses** (incl. one 0-credit and one with prerequisites), **≥6 sections** spread across 3 capacity states: **full** (enrolled == capacity), **waitlisted** (enrolled > capacity with waitlist), **empty** (0 enrolled).
  - **≥12 students** spread across enrollment states: Enrolled, Waitlisted, Dropped, Completed.
  - **≥10 assessments** covering all 4 statuses: Draft, Published, Closed, Archived.
  - **≥15 invoices**: Paid, PartiallyPaid, Overdue (due date in the past), Unpaid.
  - **payments** via all 5 methods: Cash, Card, BankTransfer, Cheque, Online.
  - **≥2 scholarships**, **≥5 tickets** (Open/InProgress/Resolved), **≥1 student with NO linked Student record** (to reproduce A1-01), and **one record each with a unicode/emoji name and a 200-char name** (boundary data).

Run it, expect all-green. If any create returns 4xx/5xx, that itself is a finding — log it. NOTE: the seed term is `2026-Fall` (matches `CURRENT_TERM` after `8063848`) — keep volume data on the same term so the UI defaults surface it.

- [ ] **Step 6: Start frontend (background) and confirm**

Run (background): `cd "C:\Users\2487421\OneDrive - Cognizant\Desktop\Vikash\EduLearn\edulearn.client"; npm run dev`
Then load Chrome DevTools tools (ToolSearch query in Orientation), `new_page` → `http://localhost:5173`, `take_screenshot`. Expected: EduLearn landing/login renders.

- [ ] **Step 7: Create the master report file** (see Phase 5 for the template). Commit it empty-but-templated so progress is tracked:
```powershell
cd "C:\Users\2487421\OneDrive - Cognizant\Desktop\Vikash\EduLearn"; git add docs/AUDIT-2026-06-FINAL.md; git commit -m "docs: start final full-stack audit report"
```

---

## Phase 1 — Backend API Contract Sweep

**Goal:** Prove every endpoint is reachable with correct status codes and the role authorization matrix holds — independent of the UI. Use PowerShell `Invoke-RestMethod` (or curl `-k`) with bearer tokens.

- [ ] **Step 1: Get a bearer token per role**

For each of the 7 accounts:
```powershell
$body = @{ usernameOrEmail="admin"; password="Admin@123" } | ConvertTo-Json
Invoke-RestMethod -Uri "https://localhost:5001/api/auth/login" -Method Post -Body $body -ContentType "application/json" -SkipCertificateCheck
```
(Windows PowerShell 5.1 has no `-SkipCertificateCheck`; use the TrustAllCertsPolicy block from `seed-sample-data.ps1` lines 34–45, or run in PowerShell 7.) Save each `token`. Note: privileged roles may return `mfa_pending` — but seed accounts are MFA-off, so expect a direct `token`. If a privileged role returns `mfa_pending`, that's a config finding.

- [ ] **Step 2: Reachability + happy-path GET per controller**

For each of the 29 controllers, call its primary list/GET endpoint with an authorized token. Expected: 200 + well-formed JSON. Record any 404 (route missing), 500 (server error — capture, do NOT see stack in response body), or unexpected shape. `/api/health` → call as **admin only**, expect 200 `{status:"Healthy"}`.

- [ ] **Step 3: Authorization matrix**

For a representative protected endpoint of each module, call it with a token that should be DENIED and confirm 403 (not 200, not 500). Minimum matrix to assert:
  - Student → `POST /api/courses` (create) → 403
  - Student → `GET /api/users` → 403
  - Auditor → any `POST`/`PUT`/`DELETE` (e.g. `POST /api/fees`) → 403
  - Instructor → `POST /api/payments` → 403
  - Finance → `POST /api/assessments` → 403
  - Unauthenticated (no token) → any protected GET → 401
Record the full matrix as a table in the report.

- [ ] **Step 4: IDOR probes (re-verify A1-02, A1-03)**

As `instructor`, find a submission id the instructor does NOT own (from a section taught by someone else) and call:
  - `GET /api/submissions/{thatId}` → expected 403/empty; if 200 with data → **A1-03 still open**.
  - `POST /api/submissions/{thatId}/grade` with a body → expected 403; if it succeeds → **A1-02 still open (CRITICAL)**. If you mutate, revert the grade afterward and note the original value.

- [ ] **Step 5: Edge inputs at the API**

For 3–4 write endpoints (create course, create assessment, record payment), POST: missing required fields, wrong types, negative amounts, overlong strings, and injection strings. Expected: 400 with `{error, code}` shape, never 500, never executed SQL. Log deviations.

- [ ] **Step 6: Commit Phase 1 findings** to the master report.

---

## Phase 2 — Role Journeys (the core, 7 sequential passes)

Run one role at a time, in this order: **Student → Instructor → Registrar → DeptAdmin → Finance → ITAdmin → Auditor.** For each role: log in (browser), then visit every page in that role's inventory and run the full 7-point per-page checklist. Append findings live.

### Task 2.1 — Student pass
- [ ] Log in as `student`. Confirm dashboard shows student-appropriate cards only. **Term check (regression for `8063848`):** confirm any term shown on the dashboard / enrollment / timetable defaults to `2026-Fall` (the centralized `CURRENT_TERM`), not `2026-Spring`, and that term-filtered lists actually return the seed data. Repeat this term check on each role's dashboard during its pass.
- [ ] For each route in the Student inventory, run the 7-point checklist. Key flows to exercise fully:
  - `/enrollment` — enroll into an open section (happy), attempt a FULL section (expect waitlist/blocked), attempt a section with an unmet prerequisite, confirm Program + Student ID are read-only when arriving via the locked link (`?locked=1`).
  - `/submissions/submit` — submit to a Published assessment; confirm success toast + the student receives no error; reload to confirm persistence.
  - `/invoices` + pay flow — view an Unpaid and an Overdue invoice; confirm amounts/status render correctly.
  - `/notifications` — mark one read, mark all read; confirm bell badge drops live.
  - `/tickets` — raise a ticket; confirm success + that ITAdmin gets notified (verify later in ITAdmin pass).
- [ ] Re-verify A1-01: if a no-linked-record student account exists, log in as it and confirm whether `/enrollment` loops on "Resolving your student record…" with repeated failing `/api/students/me` calls (`list_network_requests`).
- [ ] Append all Student findings; commit.

### Task 2.2 — Instructor pass
- [ ] Log in as `instructor`.
- [ ] Run the checklist across the Instructor inventory. Key flows:
  - Create an assessment as **Draft**, then **Publish** it (Draft→Published) — confirm enrolled students get a notification (check a student's bell after).
  - **A1-10 fix verification (full lifecycle):** Edit the Draft assessment, change Status dropdown Draft→Published, Save. Confirm `PUT /api/assessments/{id}/publish` fires (network tab) and status persists on reload. Then edit again: Published→Closed (allowed), Closed→Archived (allowed). Confirm an **invalid** jump (e.g. Draft→Closed, or Published→Draft) is blocked by the client-side guard with the "Invalid status transition" message and does NOT hit the API. Confirm a non-Draft assessment shows the blue "field edits are locked" banner and field inputs are disabled while the status dropdown still works.
  - Grade a submission the instructor OWNS (happy). Then re-verify **A1-02** in the UI: navigate directly to `/submissions/{idNotOwned}/grade` and try to Save — does it succeed?
  - Content create (Description field, not JSON), Discussion post, Grade Changes view.
- [ ] Append Instructor findings; commit.

### Task 2.3 — Registrar pass
- [ ] Log in as `registrar`.
- [ ] Run the checklist. Key flows:
  - Applicant lifecycle: create applicant → review → approve → "Create Student User Account" (confirm Name/Email/Phone are read-only, pre-filled).
  - New Student form: selecting an Active student locks Name/DOB/Email/Phone.
  - Enrollment from Student Detail (locked Program + Student ID).
  - Transcript generation + status.
- [ ] Append Registrar findings; commit.

### Task 2.4 — DeptAdmin pass
- [ ] Log in as `deptadmin`.
- [ ] Run the checklist across Programs / Courses / Sections / Rooms / Students / Syllabi / Discussions. Key flows:
  - Create program, create course (prerequisites via CHECKBOX multi-select, not JSON), create section with capacity, assign room.
  - Confirm Timetable is NOT in the sidebar; then deep-link `/timetable` and confirm it 403s/redirects gracefully (not a blank crash).
- [ ] Append DeptAdmin findings; commit.

### Task 2.5 — Finance pass
- [ ] Log in as `finance`.
- [ ] Run the checklist across Fees / Invoices / Payments / Scholarships. Key flows:
  - Fee schedule CRUD ("+ Add Item" buttons = `btn-primary-edulearn`).
  - Invoice: generate single + "Generate for All"; look up by **Invoice ID** AND by **Student ID** (both must return data; verify the multi-invoice student doesn't blank out).
  - Record payments with all 5 methods; confirm invoice status transitions (Unpaid→PartiallyPaid→Paid) and the math is correct.
  - Scholarship create + assign.
- [ ] Append Finance findings; commit.

### Task 2.6 — ITAdmin pass
- [ ] Log in as `admin`.
- [ ] Run the checklist across the full ITAdmin inventory (every module). Key flows:
  - `/users` — Create New User modal: confirm full form visible (not clipped), create succeeds. Re-verify **A1-06**: is there pagination on a long user list?
  - `/notifications` — Send Test Notification (ITAdmin-only); confirm it arrives.
  - Confirm the ticket raised by the student in Task 2.1 appears and ITAdmin was notified.
  - `/api/health` works (admin token).
- [ ] Append ITAdmin findings; commit.

### Task 2.7 — Auditor pass
- [ ] Log in as `auditor`.
- [ ] Run the checklist across Reports / KPIs / Audit Log / Audit Packages / Grade Changes (read-only). Verify:
  - Every domain page loads read-only; NO create/edit/delete controls for domain data are present (or are disabled). (Report generation, KPI recalculate, and Audit-Package generation ARE permitted for Auditor — they produce read artifacts, not domain writes.)
  - Attempt a true domain mutation by deep-linking a create/edit route (e.g. `/courses/new`, `/students/new`) → expect 403 / AccessDenied page, never a successful write.
  - Reports use the scope-aware ID UI (no JSON parameter box); success feedback is the auto-dismiss **Toast** (not a static alert).
  - **KPIs (`/kpis`):** confirm 4 KPIs render — Active Student Count, Section Fill Rate, Assessment Completion Rate, Invoice Collection Rate. Click recalculate; confirm each returns a real numeric value (not null/NaN/error) and a Toast confirms success. (This validates the `ComputationKey` seed fix.)
  - **Audit Log (`/audit-log`):** confirm the ActivityChart actually renders bars (regression: it was blank due to a double-`Z` timestamp bug). Confirm table timestamps are correct IST values. Confirm the show-all toggle button is `btn-outline-secondary`.
  - **Audit Packages (`/audit-packages`):** see Task 2.8 for the full flow — run it here as the Auditor.
- [ ] Append Auditor findings; commit.

### Task 2.8 — RKA module regression (Audit Packages + lifecycle, deep)

Run as `auditor` first, then repeat the generate/download flow as `admin` (ITAdmin) to confirm both roles work.

- [ ] **Audit Packages happy path:** On `/audit-packages`, pick a Period Start + End that brackets the seed data (e.g. `2026-01-01` → `2026-12-31`), click Generate. Confirm: `POST /api/audit-packages/generate` returns 200 (network tab), a success Toast shows "Audit package #N generated — M reports bundled", the new row appears at the top of the table with the correct period, report count badge, and generated-at timestamp.
- [ ] **Contents expand:** Click "View" on a package with ≥1 report; confirm the expandable row lists "Report #id (type)" badges. Click "Hide"; confirm it collapses.
- [ ] **PDF download:** Click PDF; confirm `GET /api/audit-packages/{id}/download` returns a blob (200, content-type pdf) and a file `audit-package-{id}-{start}-{end}.pdf` downloads. (Downloading a file is allowed for this audit — it's the feature under test; do not treat the download itself as a prohibited action.)
- [ ] **JSON download:** Click JSON; confirm `GET /api/audit-packages/{id}/download?format=json` returns JSON and a `.json` file downloads with readable content.
- [ ] **Validation:** Submit with empty dates → inline "required" errors, no API call. Set End before Start → "End date must be after start date", no API call.
- [ ] **Empty range:** Generate for a period with no reports (e.g. `2000-01-01`→`2000-01-02`); confirm it still creates a package showing "0 reports" / "No reports in range" without erroring.
- [ ] **Authz:** As `student` (and `finance`), deep-link `http://localhost:5173/audit-packages` → expect redirect to AccessDenied (ProtectedRoute allows only Auditor + ITAdmin). Also hit `POST /api/audit-packages/generate` directly with a student token → expect 403.
- [ ] **Session-only caveat:** Note in the report that the package list is session-only (cleared on refresh) — verify a refresh empties the table (documented behavior, not a bug, but confirm it matches the footer note).
- [ ] Append Task 2.8 findings; commit.

---

## Phase 3 — Chaos & Resilience

**Goal:** Prove the frontend degrades gracefully when the backend dies or the network fails, and that transient UI (toasts/spinners) behaves.

### Task 3.1 — Backend death mid-submission (full kill/restart)
For each of these critical forms — **login, enrollment, payment, grade submission, assessment create, ticket create**:
- [ ] Open the form in the browser and fill it but do NOT submit yet.
- [ ] Kill the backend (Stop-Process on the :5001 PID — see Orientation).
- [ ] Click submit. Observe and record:
  - Does a **friendly error** appear (not "Network Error"/"status code 0"/stack)?
  - Does the spinner **stop** (no infinite loading)?
  - Is the user's entered data **preserved** (not wiped)?
  - On clicking submit again after restart, is there a **double-submit**/duplicate record?
- [ ] Restart the backend, confirm the same form now succeeds WITHOUT a full page reload (i.e. the app recovered).
- [ ] Record one finding row per form.

### Task 3.2 — Network offline / throttle (no backend kill)
- [ ] Use `emulate` to set the network OFFLINE.
- [ ] Trigger a page load and a form submit on 2–3 pages. Confirm friendly errors + no frozen spinners.
- [ ] Set a slow 3G-style throttle; confirm loading states show and nothing double-fires.
- [ ] Restore network; confirm recovery.

### Task 3.3 — Toast / spinner / transient UI behavior
- [ ] Trigger several success toasts in quick succession (e.g. mark-read several notifications). Confirm they auto-dismiss on timer and don't stack unbounded or overlap permanently. Read toast lifecycle via `evaluate_script` (count `.toast`/alert nodes over time).
- [ ] Confirm error alerts are dismissible and clear on the next successful action (stale-error hygiene).

### Task 3.4 — bfcache / session integrity
- [ ] Log in, navigate to a dashboard, Logout.
- [ ] Press browser Back, then Forward. Confirm the protected page does NOT re-render for the logged-out user (the `pageshow`+`persisted` reload guard forces a fresh load → redirect to login).
- [ ] Append all Phase 3 findings; commit.

---

## Phase 4 — Backend ↔ Frontend Wiring Audit

**Goal:** Prove 100% of the backend is wired to the frontend and vice-versa.

- [ ] **Step 1: Build the endpoint inventory.** For each of the 29 controllers, list its routes + HTTP verbs (read the `[HttpGet]`/`[HttpPost]` attributes; or scrape Swagger JSON at `https://localhost:5001/swagger/v1/swagger.json`). Record as a table.
- [ ] **Step 2: Build the frontend call inventory.** For each of the 27 services in `src/services/`, list the `apiClient.get/post/put/delete` paths it calls.
- [ ] **Step 3: Cross-match.** Produce two lists:
  - **Orphan endpoints** — backend routes with NO frontend caller (e.g. confirm whether AuditPackages/Health/Plagiarism endpoints are actually used by any page).
  - **Dangling calls** — frontend service paths that 404 against the live API (verb or path mismatch).
- [ ] **Step 4: DTO shape spot-check.** For 5 representative endpoints, compare the JSON the API returns (from Phase 1 captures) against the fields the frontend reads/renders. Flag fields the UI expects but the API omits (and vice-versa).
- [ ] **Step 5:** Record the wiring matrix + every orphan/dangling/mismatch as findings; commit.

---

## Phase 5 — Synthesis & Master Report

**File:** `docs/AUDIT-2026-06-FINAL.md` (append-only throughout; finalize here).

- [ ] **Step 1: Finalize the report** using this structure:

```markdown
# EduLearn Final Full-Stack Audit — 2026-06-02

## Executive Summary
- Scope, date, branch, commit SHA tested
- Totals: pages tested, endpoints tested, findings by severity

## Coverage Metrics
| Role | Pages in scope | Pages tested | % |
(one row per role + totals)

## Bug Count Summary
| Severity | Count | IDs |
| 🔴 Critical | | |
| 🟠 High | | |
| 🟡 Medium | | |
| 🔵 Low/Info | | |

## Findings (one block each)
### [ID] [Severity] — [Short title]
- **Role / Page:** 
- **Repro steps:** numbered, exact
- **Expected vs Actual:** 
- **Evidence:** network status, console error, screenshot ref
- **Suspected file:line:** 
- **Status:** OPEN (report-only)

## Phase 1 — Backend Contract results (reachability + authz matrix tables)
## Phase 3 — Chaos results (per-form table)
## Phase 4 — Wiring matrix (orphans / dangling / DTO mismatches)
## Re-verification of prior findings (A1-01,02,03,06,10) — current status
## RKA module regression results (commit 8063848) — Audit Packages, assessment lifecycle, KPI recalculate, audit-log chart, term default, migrations
## Recommendations (prioritized fix order, for a separate approved pass)
```

- [ ] **Step 2: Severity rubric** — 🔴 Critical = data corruption, auth bypass/IDOR, app-breaking crash. 🟠 High = security/data issue with a precondition. 🟡 Medium = wrong behavior, dead UI, missing validation. 🔵 Low = cosmetic, perf, polish.
- [ ] **Step 3: Final commit + push.**
```powershell
cd "C:\Users\2487421\OneDrive - Cognizant\Desktop\Vikash\EduLearn"; git add docs/AUDIT-2026-06-FINAL.md tests/seed-volume-data.ps1; git commit -m "docs: final full-stack audit report — 7 roles, backend+frontend, chaos, wiring"; git push origin Transh_fixing
```
- [ ] **Step 4: Present a summary to the user** — totals by severity, the must-fix list, and ask whether to proceed to a fix pass (which would be a NEW plan, not part of this report-only audit).

---

## Operating rules (for the whole run)
- **Report-only.** Never edit application code. The only files you create are the report and the optional volume-seed script. If you find a 🔴 you think must be fixed immediately, STOP and ask the user — do not fix unilaterally.
- **No assumptions / no hallucinations.** Every finding must be backed by a live observation (network status, console message, screenshot, or DOM read). If you can't reproduce it, don't log it as a bug.
- **Append-as-you-go.** Write each finding to the report the moment you confirm it, and commit at the end of every Task. If context gets long, checkpoint and continue — never degrade into guessing.
- **Keep the browser visible and narrated.** The user watches. Briefly say what you're about to test before each page.
- **No Claude attribution in commit messages.**
- **Revert any test mutation** you make (e.g. an IDOR grade change), and note original values.

## Self-review done against the design
- Covers all 7 roles (Phase 2), backend (Phase 1), frontend UI/UX incl. buttons/modals/toasts/notifications (per-page checklist), chaos incl. real backend crash mid-submit (Phase 3.1), toast auto-dismiss (3.3), 100% wiring compat (Phase 4), edge + form-validation (checklist items 2 & 6), and re-verification of all prior findings. No placeholders; all paths, ports, commands, accounts, tool names, and route inventories are concrete.
- **RKA commit `8063848` fully covered:** Audit Packages page + endpoints (Task 2.8, Phase 4 wiring), assessment status lifecycle A1-10 fix (Task 2.2), KPI recalculate + `ComputationKey` (Task 2.7), audit-log chart double-`Z` fix + button color (Task 2.7), Reports/KPIs Toast migration (Tasks 2.7), `CURRENT_TERM=2026-Fall` default (Task 2.1 + per-dashboard), and the 3 EF migrations (Phase 0 Step 2). Inventories, services list (28), and known-findings table all updated to current state.
```
