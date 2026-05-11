# EduLearn Smoke Test Suite

End-to-end HTTP contract tests covering all 23 controllers (65+ endpoints), role-based authorization, cross-user ownership, state machine transitions, performance SLA, and security regressions. Designed to run unattended on a developer laptop (Windows/Git Bash) and in CI.

**Last verified green:** 2026-04-20 · 205 PASS · 0 FAIL · exit 0

---

## Table of Contents

1. [What this suite verifies](#what-this-suite-verifies)
2. [Directory structure](#directory-structure)
3. [Prerequisites](#prerequisites)
4. [Step-by-step: first run](#step-by-step-first-run)
5. [Run modes](#run-modes)
6. [Environment variables](#environment-variables)
7. [Module reference](#module-reference)
8. [Security tests](#security-tests)
9. [Performance SLA](#performance-sla)
10. [Outputs](#outputs)
11. [Exit codes](#exit-codes)
12. [Troubleshooting](#troubleshooting)
13. [Windows-specific gotchas](#windows-specific-gotchas)
14. [Known limitations](#known-limitations)
15. [Migration path](#migration-path)

---

## What this suite verifies

| Layer | Coverage |
|---|---|
| **Auth (IAM)** | Register, login, wrong password, duplicate username, missing/garbage JWT, expired token response shape |
| **Authorization policies** | Every `[Authorize(Policy=...)]` and `[Authorize(Roles=...)]` — denials (403) and allows (2xx) both verified |
| **CRUD correctness** | POST/GET/PUT/DELETE for all 23 controllers — success paths, 404, 400, 409, 403 |
| **Error codes** | Every `SCREAMING_SNAKE_CASE` error code grepped from response body |
| **State machines** | Ticket Open→Assigned→Resolved, Assessment Draft→Published, Invoice→Paid |
| **Ownership / horizontal privilege** | Student A cannot read Student B's invoice, notification, ticket |
| **Attribution forgery** | `GeneratedByFK`, `GraderID`, etc. taken from JWT not body |
| **C-26 privilege escalation** | Anonymous register with `role=ITAdmin` in body → forced to Student |
| **Finance bypass (C-1)** | Student JWT rejected on all SFB mutation endpoints |
| **Full authz sweep** | Student JWT rejected on every privileged endpoint (19 checks) |
| **Performance SLA** | Per-call wall-clock vs `config/sla.conf`; PRD-HARD violations fail build |
| **SignalR side-effect (NHT-01)** | Notification created + unread-count increments after test-push |

---

## Directory structure

```
tests/smoke/
├── run-all.sh              # Orchestrator — entry point
├── README.md               # This file
├── config/
│   └── sla.conf            # SLA budgets (METHOD PATH BUDGET_MS SEVERITY)
├── lib/
│   ├── common.sh           # http(), jget(), assert_status(), assert_body_contains()
│   ├── perf.sh             # perf_check(), perf_summary() — SLA evaluation
│   ├── report.sh           # render_report(), _write_markdown() — final output
│   └── seed.sh             # seed_users() — register + promote + login 8 users
├── modules/
│   ├── 00_auth.sh          # IAM-01: auth flows
│   ├── 01_health.sh        # N-1: health endpoint gating
│   ├── 02_users.sh         # IAM-02: user CRUD + ownership
│   ├── 03_programs.sh      # CCM-01: degree programs
│   ├── 04_courses.sh       # CCM-01: courses + CourseManagerPolicy
│   ├── 05_rooms.sh         # ETS-02: room management
│   ├── 06_students.sh      # SRA-02: student profiles
│   ├── 07_sections.sh      # ETS-02: course sections
│   ├── 08_enrollments.sh   # ETS-01: enroll/drop + PRD SLA
│   ├── 09_assessments.sh   # AGI-01: assessments + publish guard
│   ├── 10_content.sh       # LMS-01: content upload + versioning
│   ├── 11_submissions.sh   # AGI-02: submit + grade + PRD SLA
│   ├── 12_applicants.sh    # SRA-01: admissions workflow
│   ├── 13_fees.sh          # SFB: fee schedules
│   ├── 14_scholarships.sh  # SFB: scholarships
│   ├── 15_invoices.sh      # SFB: invoice generation + ownership
│   ├── 16_payments.sh      # SFB: payment processing
│   ├── 17_reports.sh       # RKA-01: report generation + download
│   ├── 18_kpis.sh          # RKA-02: KPI seed + recalculate
│   ├── 19_audit_packages.sh # RKA-03: audit package + download
│   ├── 20_audit_log.sh     # IAM-04: audit log filters + AuditViewPolicy
│   ├── 21_notifications.sh # NHT-01: push, read, read-all, ownership
│   └── 22_tickets.sh       # NHT-03: helpdesk tickets + SupportStaffPolicy
├── security/
│   ├── finance_bypass.sh   # C-1: Student JWT vs all SFB mutation endpoints
│   ├── anonymous_elevation.sh  # C-26: register with privileged role → forced Student
│   └── authz_full_sweep.sh # Full Student-JWT sweep across 19 privileged endpoints
└── run/                    # Generated per run (git-ignored)
    ├── perf.csv
    ├── results.log
    ├── perf-report.md
    └── body.tmp
```

---

## Prerequisites

### Required tools

| Tool | Min version | Check | Notes |
|---|---|---|---|
| **Bash** | 4.x | `bash --version` | Git Bash on Windows works; WSL also works |
| **curl** | any | `curl --version` | Bundled with Git Bash |
| **Node.js** | 14+ | `node --version` | JSON parsing only — no npm packages needed |
| **sqlcmd** | any | `sqlcmd -?` | Required for role promotion (C-26 bootstrap); bundled with SQL Server or install separately |
| **SQL Server LocalDB** | 2019+ | `sqllocaldb info` | Dev database; instance name `MSSQLLocalDB` |

### Required: EduLearn API running

The API must be running and reachable at `$API_BASE` (default `https://localhost:5001`) before the suite starts.

The suite probes `GET /swagger/v1/swagger.json` at startup and aborts with exit code 3 if it gets anything other than 200.

---

## Step-by-step: first run

### 1. Start SQL Server LocalDB

LocalDB shuts down automatically after ~5 minutes of idle. Always start it explicitly before running the suite.

```bash
sqllocaldb start MSSQLLocalDB
```

Expected output: `LocalDB instance "MSSQLLocalDB" started.`

If already running: `LocalDB instance "MSSQLLocalDB" is already running.`

### 2. Apply migrations (first time only, or after schema changes)

```bash
cd EduLearn.API
dotnet ef database update
```

### 3. Build the API

```bash
cd EduLearn.API
dotnet build --nologo
```

A clean build produces no `error CS` lines — migration-name warnings (CS8981) are harmless.

### 4. Launch the API

In a **separate terminal**, or background it:

```bash
# Foreground (separate terminal — recommended for first run so you can see logs)
cd EduLearn.API
dotnet run --no-build --launch-profile https

# Background (same terminal)
cd EduLearn.API
dotnet run --no-build --launch-profile https > ../api.log 2>&1 &
echo "API PID=$!"
```

Wait for the API to print:
```
Now listening on: https://localhost:5001
```

or probe it:
```bash
curl -sk -o /dev/null -w "%{http_code}" https://localhost:5001/swagger/v1/swagger.json
# Expected: 200
```

### 5. Run the suite

```bash
cd tests/smoke
bash run-all.sh
```

Expected run time: **12–15 minutes** (199 HTTP requests, BCrypt auth is the bottleneck at ~150ms/login).

Expected final line: `205 passed · 0 failed`

---

## Run modes

```bash
# Full suite (all 23 modules + all 3 security sections)
bash run-all.sh

# Security regressions only (minimal module seed for IDs, then security scripts)
bash run-all.sh --security-only

# Full suite minus security regressions
bash run-all.sh --no-security

# Single module (seed still runs first)
bash run-all.sh modules/22_tickets.sh
bash run-all.sh security/finance_bypass.sh

# Performance report only — not a valid mode; perf data is always in run/perf.csv
```

---

## Environment variables

| Variable | Default | Set it when... |
|---|---|---|
| `API_BASE` | `https://localhost:5001` | Running against staging or a different port |
| `CURL_INSECURE` | `1` | Set to `0` when using a real TLS cert (staging/prod) |
| `SEED_TS` | `$(date +%s)` | Set to a fixed value to reproduce a specific seed (`SEED_TS=1234567890 bash run-all.sh`) |

All variables are read with `: "${VAR:=default}"` — you can export them before running or prefix the command:

```bash
API_BASE=https://staging.edulearn.io CURL_INSECURE=0 bash run-all.sh
```

---

## Module reference

Each module is a sourced bash script. Modules run in dependency order (early modules export IDs used by later ones).

| Module | Endpoints tested | Key assertions |
|---|---|---|
| `00_auth` | POST /auth/register, /auth/login | wrong password→401, duplicate→400, missing JWT→401 |
| `01_health` | GET /health | no-auth→401, Student→403 [N-1], ITAdmin→200 |
| `02_users` | GET/PUT/POST /users | UserViewPolicy, Student self-only, duplicate email→409 |
| `03_programs` | POST/GET/PUT /programs | DeptAdminPolicy, 404, UPDATE |
| `04_courses` | POST/GET/PUT /courses | CourseManagerPolicy, duplicate code→409, Student read-only |
| `05_rooms` | POST/GET /rooms | DeptAdminPolicy, 404 |
| `06_students` | POST/GET/PUT /students | non-Student userID→400 [INVALID_USER_ROLE], duplicate→409 |
| `07_sections` | POST/GET /sections | Student-as-instructor→400, course+term filter |
| `08_enrollments` | POST/DELETE /enrollment | duplicate→409, bad section→400, RosterViewPolicy, PRD SLA |
| `09_assessments` | POST/GET/PUT /assessments | Draft→Published, edit-after-publish→400 |
| `10_content` | POST/GET/PUT /content | upload, version bump, Student read-only |
| `11_submissions` | POST/GET/POST-grade /submissions | duplicate→409, score-exceeds-max→400, PRD SLA |
| `12_applicants` | POST/GET/PUT /applicants | status workflow UnderReview→Accepted |
| `13_fees` | POST/GET/PUT /fees | FinancePolicy, date-range→400 |
| `14_scholarships` | POST/GET /scholarships | FinancePolicy, negative-amount→400, bad-dates→400 |
| `15_invoices` | POST/GET /invoices | FinancePolicy, student ownership [C-3], bad-student→404 |
| `16_payments` | POST/GET /payments | double-pay→400, bad-invoice→404 |
| `17_reports` | POST/GET /reports/generate, /download | AuditViewPolicy, invalid scope→400 |
| `18_kpis` | POST/GET /kpis | seed idempotent, recalculate, Auditor/Student denial |
| `19_audit_packages` | POST/GET /audit-packages | generate, bad date range, download |
| `20_audit_log` | GET /audit-log | AuditViewPolicy, action filter |
| `21_notifications` | POST/GET/PUT /notifications | ownership [C-18], unread-count, mark-read, read-all |
| `22_tickets` | POST/GET/PUT /tickets | SupportStaffPolicy, ownership, status transitions |

### Exported IDs

Modules export IDs for downstream use. These are set automatically from API responses:

```
COURSE_ID_1, COURSE_ID_2, SECTION_ID_SMALL, SECTION_ID_BIG,
STUDENT_ID_1, STUDENT_ID_2, ASSESSMENT_ID, SUBMISSION_ID,
INVOICE_ID, REPORT_ID, PACKAGE_ID, PROGRAM_ID, ROOM_ID,
FEE_ID, CONTENT_ID
```

---

## Security tests

Three security scripts run at the end of a full suite:

### `finance_bypass.sh`
Tests that Student JWT is blocked from all SFB mutation endpoints:
- POST /fees (C-1.D)
- POST /scholarships (C-1.A)
- POST /invoices/generate (C-1.B)
- POST /payments (C-1.C)

### `anonymous_elevation.sh`
Tests C-26 (self-registration privilege escalation):
1. POST /auth/register with `role=ITAdmin` in body
2. Login → decode JWT role claim
3. Assert server forced `Role=Student`

### `authz_full_sweep.sh`
19 assertions — Student JWT rejected on every privileged endpoint:

| Check | Endpoint | Policy |
|---|---|---|
| C-1.D | POST /fees | FinancePolicy |
| C-1.A | POST /scholarships | FinancePolicy |
| C-1.B | POST /invoices/generate | FinancePolicy |
| C-1.C | POST /payments | FinancePolicy |
| C-2 | POST /reports/generate | Auditor+ITAdmin |
| C-2 | GET /reports | Auditor+ITAdmin |
| C-20 | GET /kpis | Auditor+ITAdmin+Instructor+Registrar |
| C-6 | POST /programs | DeptAdminPolicy |
| C-12 | POST /content/upload | CourseManagerPolicy |
| C-11 | POST /assessments | CourseManagerPolicy |
| C-5 | POST /submissions/{id}/grade | Instructor+ITAdmin |
| C-7 | POST /applicants | Registrar+ITAdmin |
| C-7 | GET /applicants | Registrar+ITAdmin |
| C-8 | POST /students | Registrar+ITAdmin |
| C-8 | GET /students | Registrar+ITAdmin |
| C-10 | POST /rooms | DeptAdminPolicy |
| C-9 | POST /sections | CourseManagerPolicy |
| N-1 | GET /health | AdminPolicy |
| C-18 | GET /invoices/{id} (wrong owner) | Ownership check |

---

## Performance SLA

Budgets are in `config/sla.conf`. First match wins; comments and blank lines are ignored.

### PRD-HARD (violates PRD §11 Non-Functional Requirements — fails build)

| Endpoint | Budget |
|---|---|
| POST /api/enrollment/enroll | 2000ms |
| DELETE /api/enrollment/*/drop | 2000ms |
| POST /api/submissions/*/grade | 2000ms |

### Team baselines (WARN — reported, don't fail build)

| Category | Budget |
|---|---|
| POST/PUT /auth/register | 1000ms |
| POST /auth/login | 800ms |
| GET /health | 100ms |
| GET unread-count | 150ms |
| GET /{id} | 250ms |
| GET list | 500ms |
| POST/PUT | 750ms |
| DELETE | 500ms |
| Catch-all | 1500ms |

Tune budgets by editing `config/sla.conf`. No code changes needed.

---

## Outputs

All artifacts land in `tests/smoke/run/` (git-ignored via `.gitignore`).

| File | Contents | Use |
|---|---|---|
| `results.log` | `[HH:MM:SS] PASS/FAIL/WARN message` per assertion | CI log parsing, diff between runs |
| `perf.csv` | `timestamp,method,path,status,ms,role` per request | Import to Excel/Grafana, trend analysis |
| `perf-report.md` | Human-readable markdown — pass/fail + perf table + PRD SLA check | Share with team/mentor, attach to PR |
| `body.tmp` | Last HTTP response body (overwritten each request) | Debug aid during development |

---

## Exit codes

| Code | Meaning | Action |
|---|---|---|
| `0` | All assertions passed, no PRD-HARD SLA violations | Ship it |
| `1` | Functional failure or PRD-HARD SLA violation | Fix before merge |
| `3` | API unreachable at `$API_BASE` | Start the API (Step 4 above) |
| `4` | Seed failed — users could not be registered or logged in | Check DB connectivity (Step 1 above) |

---

## Troubleshooting

### API unreachable (exit 3)

**Symptom:** `FAIL API not reachable at https://localhost:5001/swagger (status=000)`

**Causes and fixes:**

| Cause | Fix |
|---|---|
| API not started | `cd EduLearn.API && dotnet run --no-build --launch-profile https` |
| LocalDB stopped (auto-idle after ~5 min) | `sqllocaldb start MSSQLLocalDB` then restart API |
| API started on wrong port | Check `Properties/launchSettings.json` for `applicationUrl`; set `API_BASE` to match |
| TLS cert error | Run `dotnet dev-certs https --trust` once, then restart |

---

### Seed fails (exit 4)

**Symptom:** `FAIL seed: register itadmin_xxx/ITAdmin (status=500)` or similar

**Causes and fixes:**

| Cause | Fix |
|---|---|
| LocalDB stopped | `sqllocaldb start MSSQLLocalDB` |
| Migrations not applied | `cd EduLearn.API && dotnet ef database update` |
| DB doesn't exist | `dotnet ef database update` (creates DB + applies all migrations) |
| Unique constraint on email | Restart with new `SEED_TS` (or let it auto-generate) |

---

### Role promotion fails silently

**Symptom:** Seed passes but all policy-gated endpoints return 403 for "ITAdmin" user

**Cause:** `_promote()` uses `sqlcmd` to UPDATE role in DB. If `sqlcmd` is not on `PATH` or fails, the promotion is silent — the user stays as Student. The re-login then gets a JWT with `Role=Student`.

**Fix:**
```bash
# Verify sqlcmd is available
sqlcmd -?

# Manually check the promotion worked (replace USERNAME)
sqlcmd -S "(localdb)\MSSQLLocalDB" -d EduLearnDb -Q "SELECT Username, Role FROM Users WHERE Username LIKE 'itadmin_%' ORDER BY UserID DESC"
```

If `sqlcmd` is missing, install **SQL Server command-line tools**:
- Windows: [Microsoft SQL Server Tools](https://learn.microsoft.com/en-us/sql/tools/sqlcmd-utility)
- The tool is also bundled with SQL Server Management Studio (SSMS)

---

### Some modules fail with 401 instead of expected status

**Symptom:** Multiple modules fail with `got 401` even though seed passed

**Cause:** JWT tokens expire (default 60 minutes). If the suite takes longer than the token TTL, later modules get 401.

**Fix:** Re-run the suite from the beginning. The suite re-seeds and re-logs in at startup, so tokens are always fresh at run start.

---

### `jget` returns empty / IDs are 0

**Symptom:** Subsequent module fails with `bad section` or `404` because a dependent ID (e.g., `COURSE_ID_1`) is `0` or empty.

**Cause:** An upstream module's POST failed silently, so `jget` returned empty.

**Fix:** Run with the upstream module explicitly first:
```bash
bash run-all.sh modules/04_courses.sh
```
Check the failure there, fix it, then run the full suite.

---

### Build fails: `Microsoft.OpenApi.Models` does not exist

**Symptom:**
```
error CS0234: The type or namespace name 'Models' does not exist in the namespace 'Microsoft.OpenApi'
error CS0535: 'EnumSchemaFilter' does not implement interface member 'ISchemaFilter.Apply(IOpenApiSchema, SchemaFilterContext)'
```

**Cause:** `Microsoft.OpenApi` was explicitly pinned to 3.5.2 in `EduLearn.API.csproj`, which removed the `Models` sub-namespace. Swashbuckle 10.x requires `Microsoft.OpenApi 2.4.1`.

**Fix:** Remove the explicit `Microsoft.OpenApi` package reference from `EduLearn.API.csproj` (let Swashbuckle pull in 2.4.1 transitively), and update `EnumSchemaFilter.Apply` to use `IOpenApiSchema` + `JsonSchemaType` from the 2.x API. This fix is already applied on the `NHT_Priyanshu` branch.

---

### `report.sh: ((: 0\n0: syntax error`

**Symptom:** Last line of output is `C:/Users/.../report.sh: line 89: ((: 0<newline>0: syntax error in expression`

**Cause:** `grep -c` on an empty file returns `0\n0` (two lines) on some Windows grep versions; arithmetic expansion chokes on two tokens.

**Impact:** None — this fires after `render_report` completes. Pass/fail counts are correct. Suite still exits 0 or 1 correctly.

**Fix (post-interim):** Change `grep -c ... || echo 0` to `grep -c ... 2>/dev/null; true` in `report.sh` line 88.

---

### `perf_check` never fires / SLA not evaluated

**Symptom:** No `SLA HARD` or `SLA WARN` lines in output even on slow endpoints

**Cause:** `perf_check` must be called explicitly from each module after the HTTP call. Not all modules call it — only the PRD-critical ones (`08_enrollments`, `11_submissions`) do by default.

**Fix:** Add `perf_check "$LAST_MS" METHOD PATH "label"` after any `http_*` call in any module to add SLA monitoring for that endpoint.

---

## Windows-specific gotchas

### Non-ASCII characters in JSON bodies

**Problem:** Characters like em dash `—` (U+2014) passed via curl `-d` on Windows Git Bash may not serialize as clean UTF-8. ASP.NET Core's System.Text.Json rejects invalid UTF-8 sequences with: `"The JSON value could not be converted to System.String"`.

**Rule:** Use only ASCII characters in all test JSON body strings. Replace em dash with ` - ` (hyphen-space). This is a test infrastructure limitation, not an API limitation — the API handles UTF-8 correctly via Swagger UI and Postman.

---

### `cygpath` for Node.js-compatible paths

**Problem:** Node.js on Windows resolves `/tmp/foo` as `C:\tmp\foo` (Windows CRT path), but Git Bash's `/tmp` is actually `C:\Program Files\Git\usr\tmp` or similar.

**Rule:** When writing temp files for Node.js consumption, use Windows-style paths:
```bash
TMPF="C:/Users/$USERNAME/AppData/Local/Temp/myfile.json"
```
Or use `SMOKE_RUN_DIR` (exported by `run-all.sh` via `cygpath -m` — always a forward-slash Windows path that both curl and Node.js accept).

---

### `cygpath -m` for `SMOKE_ROOT`

`run-all.sh` converts `SMOKE_ROOT` via `cygpath -m` which gives mixed-style paths (`C:/Users/...`) safe for both curl and Node.js string interpolation. Do not change this to `cygpath -w` (backslash paths cause escape-sequence errors in Node.js `-e '...'` strings).

---

### `sqlcmd` not on PATH

Git Bash does not automatically add SQL Server tools to `PATH`. Add it:
```bash
export PATH="$PATH:/c/Program Files/Microsoft SQL Server/Client SDK/ODBC/170/Tools/Binn"
```
Or add it permanently in `~/.bashrc`.

---

## Known limitations

| Limitation | Status | Plan |
|---|---|---|
| No concurrency tests | Post-interim | NUnit parallel test harness |
| SignalR push not verified over WebSocket | Post-interim | WebSocket client test |
| `audit-log` combined-filter bug (M-2) silently unverified | Post-interim | DB inspection needed |
| Grader forgery (`GraderID` in body) — manual DB verify only | Warn | Strip body FK, use JWT sub in `SubmissionsController` |
| No negative SLA trend tracking across runs | Post-interim | Grafana / GitHub Actions artifact diff |
| `report.sh` arithmetic syntax warning on Windows | Minor | One-line fix in `report.sh:89` |

---

## Migration path

This bash suite is a **stopgap for the interim demo (2026-04-24)**. Post-interim, replace with:

- `EduLearn.Tests` — NUnit + Moq + `WebApplicationFactory<Program>`
- Each `modules/*.sh` → one `[TestFixture]` class
- JSON bodies → anonymous-object literals
- `config/sla.conf` → `[Category("Performance")]` + BenchmarkDotNet
- `sqlcmd` role promotion → `DbContext` seeding in `[SetUp]`

Mapping:

| Bash module | NUnit fixture |
|---|---|
| `00_auth.sh` | `AuthTests.cs` |
| `08_enrollments.sh` | `EnrollmentTests.cs` |
| `11_submissions.sh` | `SubmissionTests.cs` |
| `security/authz_full_sweep.sh` | `AuthorizationTests.cs` |
| ... | ... |

---

## CI integration (GitHub Actions)

```yaml
jobs:
  smoke:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup .NET
        uses: actions/setup-dotnet@v4
        with:
          dotnet-version: '8.0.x'

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Start LocalDB
        run: sqllocaldb start MSSQLLocalDB

      - name: Apply migrations
        run: dotnet ef database update --project EduLearn.API

      - name: Start API
        run: |
          cd EduLearn.API
          dotnet run --no-build --launch-profile https > ../api.log 2>&1 &
          Start-Sleep -Seconds 12
        shell: pwsh

      - name: Run smoke tests
        run: bash tests/smoke/run-all.sh
        env:
          API_BASE: https://localhost:5001
          CURL_INSECURE: "1"

      - name: Upload perf report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: smoke-perf-report
          path: tests/smoke/run/perf-report.md
```
