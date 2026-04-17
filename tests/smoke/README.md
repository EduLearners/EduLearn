# EduLearn Smoke Test Suite

End-to-end HTTP contract tests for every endpoint across all 23 controllers, plus performance metrics and security-regression checks. Designed for the interim demo (2026-04-24) and to run unattended from a laptop, CI, or over SSH to a staging box.

**Design doc:** [`docs/superpowers/specs/2026-04-17-bash-smoke-test-suite-design.md`](../../docs/superpowers/specs/2026-04-17-bash-smoke-test-suite-design.md)
**What it verifies:** [`docs/CODE-REVIEW-VERIFICATION.md`](../../docs/CODE-REVIEW-VERIFICATION.md)

## Prerequisites

- **Bash** (Git Bash on Windows works)
- **curl**
- **Node.js** (any version — used only for JSON parsing)
- A running EduLearn API with migrations applied: `dotnet run --project EduLearn.API --launch-profile https`

## Quick start

```bash
cd tests/smoke
bash run-all.sh
```

Expected run time: ~30-60 seconds for the full suite (65 endpoints × 3-5 calls each).

## What gets tested

| Layer | Coverage |
|---|---|
| **Auth** | register, login, wrong password, malformed/missing JWT, duplicate username |
| **Policies** | every `[Authorize(Policy=...)]` and `[Authorize(Roles=...)]` — denials verified, not just allows |
| **CRUD** | every POST/GET/PUT/DELETE endpoint, success + 404 + 400 + 409 + 403 where applicable |
| **Error codes** | every SCREAMING_SNAKE_CASE code is grepped in the response body |
| **State machines** | ticket status transitions, assessment Draft→Published, invoice→Paid |
| **Cross-module flows** | ticket assign/resolve fires notifications to creator/assignee |
| **Performance** | every call timed, compared to `config/sla.conf`; PRD-HARD violations fail the build |
| **Security regressions** | 8 tests for the 5 blockers in `docs/CODE-REVIEW-VERIFICATION.md` |

## Run modes

```bash
bash run-all.sh                    # full suite (default)
bash run-all.sh --security-only    # just security/finance_bypass.sh (+ minimal seed)
bash run-all.sh --no-security      # skip the security regression section
bash run-all.sh modules/22_tickets.sh  # one module (seed still runs first)
```

## Environment

| Variable | Default | Purpose |
|---|---|---|
| `API_BASE` | `https://localhost:5001` | Base URL of the API under test |
| `CURL_INSECURE` | `1` | Accept dev certs — set to `0` in staging/prod |
| `SEED_TS` | `$(date +%s)` | Suffix for seeded usernames — set to fix a specific run |

## Outputs

Everything lands in `tests/smoke/run/` (git-ignored):

| File | Contents |
|---|---|
| `perf.csv` | One row per HTTP call: `timestamp, method, path, status, ms, role` |
| `results.log` | Every assertion with PASS/FAIL/WARN, machine-readable |
| `perf-report.md` | Human-readable markdown report — commit/share this |
| `body.tmp` | Last response body (debug aid; overwritten every call) |

The orchestrator also prints a colored summary to stdout with pass/fail counts, a table of the 15 slowest endpoints by p95, and a Failures / Warnings list.

## Exit codes

| Code | Meaning |
|---|---|
| 0 | All functional asserts passed and no PRD-HARD SLA violations |
| 1 | Functional failure or PRD-HARD SLA violation — **build breaker** |
| 3 | API unreachable — check the server is running on `$API_BASE` |
| 4 | User seeding failed — almost always a DB connectivity issue |

**Security-regression failures do NOT fail the build** while the 5 blockers from the verification report are still open — CI would be stuck red otherwise. Once Tanya/Utkarsh/Vikash land the fixes and `[C-1.A] ... [C-5]` all go green, you can remove this carve-out from `run-all.sh` (search for `\[C-[0-9]`).

## Performance budgets

See `config/sla.conf`. Two categories:

**PRD-mandated (HARD — violates PRD Section 11):**
- `POST /api/enrollment/enroll` — 2000ms
- `DELETE /api/enrollment/*/drop` — 2000ms
- `POST /api/submissions/*/grade` — 2000ms

**Team baselines (WARN — reported, don't fail build):**
- GET list: 500ms · GET by id: 250ms · POST/PUT: 750ms · DELETE: 500ms · login: 800ms (BCrypt)

Tune any line in `config/sla.conf` — format is `METHOD PATH BUDGET_MS SEVERITY`. First match wins.

## Known limitations

- **No concurrency tests.** The payment race condition (finding H-1) needs a parallel harness; flagged as post-interim NUnit work.
- **SignalR push is not verified.** The HTTP side of notifications is covered; real-time WebSocket delivery needs a separate client.
- **No DB inspection.** We check HTTP responses, not table rows. The audit-log filter bug (finding M-2) is exercised but not proven green/red because the filter result set can legitimately be empty in a fresh run.

## Migration path (post-interim)

This suite exists to be replaced by `EduLearn.Tests` (NUnit + Moq + `WebApplicationFactory`) after the interim demo. Each `modules/*.sh` maps one-to-one to a `[TestFixture]` class; JSON bodies become anonymous-object literals; `config/sla.conf` becomes a `[Category("Performance")]` attribute.

## CI integration (GitHub Actions sketch)

```yaml
- name: Smoke tests
  run: |
    dotnet run --project EduLearn.API --launch-profile https &
    sleep 8
    cd tests/smoke && bash run-all.sh
  env:
    API_BASE: https://localhost:5001
```
