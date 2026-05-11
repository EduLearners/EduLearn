# Team Pull Instructions — EduLearn (after 2026-05-04 evening session)

> **What's new on `Development`:** global exception middleware, all 7 audit fixes (R-1 through R-6, R-7 skipped), Extensions/ folder removed (inlined into 12 controllers), Swagger summaries on every endpoint, **one EF migration** widening `Transcripts.GPA` to `decimal(4,2)`.
>
> **Latest commit:** `28ef88f` on both `origin/Development` and `origin/Golpel_Exception`.
>
> **Critical:** there is a database migration step. Don't skip it.

---

## ⚡ TL;DR — most teammates

```bash
# from the repo root, on Git Bash / PowerShell:
git fetch origin
git checkout Development
git pull --ff-only origin Development

# Apply the new migration to your local LocalDB:
./migrate-database.bat       # Windows
# or:
dotnet ef database update --project EduLearn.API --startup-project EduLearn.API
```

That's it. Run the API and Swagger as usual.

---

## ⚠️ Special instructions for Utkarsh (or anyone with a local `bf7abbf` commit)

Earlier today you (Utkarsh) made a local commit on `Golpel_Exception` with hash `bf7abbf` titled *"refactor: remove Extensions folder, inline ClaimsPrincipal claim reading in all controllers"*. That commit was **partial** (only 7 of 12 controllers) and accidentally loosened auth on `POST /api/submissions` from `[Authorize(Roles = "Student")]` to bare `[Authorize]`. It was never pushed.

The complete, correct version of that work is now on `origin/Development` as commit `1b81306` (all 12 controllers inlined, no auth loosening). **Discard `bf7abbf` and pull fresh.**

```bash
git fetch origin

# Verify your local Golpel_Exception is the one with bf7abbf:
git log --oneline -3 Golpel_Exception
# If you see "bf7abbf refactor: remove Extensions folder…" → that's the one to discard.

# Throw away the local Golpel_Exception (bf7abbf goes with it):
git checkout Development
git branch -D Golpel_Exception

# Pull the canonical remote state:
git pull --ff-only origin Development

# Apply the migration:
./migrate-database.bat
```

If you have **uncommitted work** on top of `bf7abbf`, stash it first (`git stash`) before deleting the branch, and inspect after pulling whether any of it is still needed (most of bf7abbf's intent is now on Development; only any non-inline edits you added on top would still be relevant).

---

## What to expect after pulling

### Swagger UI changes
Every endpoint in Swagger UI now has a 2-3 line description. Open https://localhost:5001/swagger (or http://localhost:5000/swagger) and you'll see them.

### Error response shape
Unhandled exceptions now return a clean JSON body instead of the framework's default HTML error page:
```json
{
  "error": "An unexpected error occurred. Please try again or contact support.",
  "statusCode": 500,
  "timestamp": "2026-05-04T...",
  "traceId": "0HMV...",
  "exceptionType": "...",          // dev only
  "detail": "..."                   // dev only
}
```
Existing `return BadRequest/NotFound/Conflict(...)` responses are unchanged. JWT 401/403 from `OnChallenge`/`OnForbidden` are unchanged.

### appsettings.json — JWT key names
If your Git tool shows `appsettings.json` as conflicted because of local edits, note these renames:
- `Jwt:Key` → `Jwt:Secret`
- `Jwt:ExpiryInMinutes` → `Jwt:AccessTokenExpiryMinutes`

The values are unchanged. Update any local override files (`appsettings.Development.json` if you have one) accordingly.

### Transcripts API — GPA now populated
`POST /api/transcripts/generate/{studentId}` now returns a numeric GPA on the Indian 10-point CGPA scale (or `null` if the student has no graded submissions). Don't be surprised by the new value.

### Smoke tests
Modules `07_sections.sh`, `14_scholarships.sh`, `15_invoices.sh` were updated. Smoke run total goes from 246 to **247** (one new assertion on the scholarship deduction). All should pass after migration.

---

## Verifying the pull worked

```bash
# 1. Should show 28ef88f or later as the tip:
git log --oneline -1

# 2. Build should be clean:
dotnet build EduLearn.API/EduLearn.API.csproj
#  Expected: 0 errors. 6 pre-existing CS8981 warnings about migration class names (mig/migg/miigg) are not from this session; ignore.

# 3. The new migration should be applied to your DB:
sqlcmd -S "(localdb)\MSSQLLocalDB" -d EduLearnDb -Q "SELECT MigrationId FROM __EFMigrationsHistory ORDER BY MigrationId DESC"
#  Expected: 20260504101347_WidenTranscriptGPA appears at the top of the list.

# 4. Quick smoke run:
cd tests/smoke
API_BASE="http://localhost:5000" CURL_INSECURE=0 bash run-all.sh
#  Expected: 247/247 pass, 0 fail.
```

If `dotnet build` errors with "Cannot find class GlobalExceptionMiddleware" or similar, your pull didn't bring in the new `Middleware/` folder — re-fetch.

If `POST /api/transcripts/generate/{id}` returns a 500 with `Parameter value '10.00' is out of range`, the migration didn't run — execute `migrate-database.bat`.

---

## If something goes wrong

- **Build error after pull:** `git status` to confirm no half-merge state. If clean, run `dotnet restore` then `dotnet build`.
- **Login returns 500:** the `Jwt:Secret` rename probably didn't make it into your local `appsettings.json`. Open the file, confirm the keys match the canonical version on `Development`.
- **Migration fails with "Database is in use":** stop any running `dotnet run` API instance first, then re-run the migration.
- **Smoke fails on scholarship deduction:** the migration probably didn't run on your DB. The `Transcripts.GPA` column is the only schema change in this session.

---

## Who owns what

If a fix from this session breaks something specific to your module, check:

| Module | Owner | Fixes touching this module |
|---|---|---|
| IAM | Ashish | R-1 (JWT keys), middleware, AuthController inline, UsersController inline |
| SRA | Saurav | R-4 (transcript filter), R-5 (GPA computation + migration) |
| ETS | Saurav | R-6 (smoke schedule fixture), EnrollmentsController inline |
| CCM | Vikash | ContentsController / DiscussionsController / SyllabiController inline |
| AGI | Vikash | AssessmentsController / GradeChangesController / SubmissionsController inline |
| SFB | Tanya | R-2 (scholarship fixture), R-3 (class-level Authorize on Payments/Invoices/Scholarships/Fees), InvoicesController inline |
| RKA | Utkarsh | R-3 (class-level Authorize on KPIs/Reports/AuditPackages), ReportsController inline |
| NHT | Priyanshu | (no changes this session) |

---

**End of pull instructions. The full session handoff with deeper context is in `docs/SESSION-HANDOFF-2026-05-04-EVENING.md`.**
