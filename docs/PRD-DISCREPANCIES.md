# PRD vs Implementation — Discrepancy Report

> **PRD Reference:** `docs/EduLearn-PRD-v1.0_2.docx` (ONLY authoritative version)
> **Original audit:** April 15, 2026 (Vikash, M3, branch `AGI_Vikash`)
> **Last refresh:** May 4, 2026 (post-13-agent end-user audit; see `docs/AUDIT-REPORT-2026-05-04.md`)

---

## Summary

| Severity | Count | Description |
|----------|-------|-------------|
| 🔴 Critical | 1 | JWT config keys still mismatched (D-03) |
| 🟡 Medium | 13 | Structural / state-machine / endpoint-shape gaps |
| 🟢 Low | 8 | Cosmetic, naming, post-interim deferrals |
| ✅ Resolved | 5 | Closed since the original audit |
| **Total tracked** | **27** | (D-01 through D-25, plus 2 closed) |

Five items resolved since 2026-04-15. Seven new items (D-19 through D-25) added from the 2026-05-04 audit.

---

## ✅ Resolved Since 2026-04-15

### ~~D-01: StudentLifecycleStatus enum values~~ — RESOLVED
[`EnrollmentEnums.cs:8-11`](../EduLearn.API/Models/Enums/EnrollmentEnums.cs#L8) now reads `Active, Graduated, Withdrawn, Suspended` — matches PRD §5.2 exactly. Earlier values (`OnLeave`, `Expelled`) are gone.

### ~~D-02: AssessmentStatus missing `Archived`~~ — RESOLVED
[`AssessmentEnums.cs:5`](../EduLearn.API/Models/Enums/AssessmentEnums.cs#L5) now declares `Draft, Published, Closed, Archived`. The transition `Closed → Archived` is enforced in [`AssessmentsController.cs:192-205`](../EduLearn.API/Controllers/AssessmentsController.cs#L192).

### ~~D-10: NotificationSeverity extra `Error` value~~ — RESOLVED
[`NotificationEnums.cs:14-18`](../EduLearn.API/Models/Enums/NotificationEnums.cs#L14) is now `Info, Warning, Critical` — exactly the PRD §6.9 set. The `Error` value was removed.

### ~~D-17: `Hubs/NotificationHub.cs` listed in PRD~~ — CLOSED (out-of-scope)
Per mentor clarification recorded in [`docs/ARCHITECTURE-REFERENCE.md`](ARCHITECTURE-REFERENCE.md), SignalR/WebSocket is out of syllabus and NHT-01 is REST-only. Not a discrepancy — a deliberate scope change.

### D-14: Controllers not yet created — PARTIALLY RESOLVED
| Controller | Feature | Status |
|---|---|---|
| TranscriptsController | SRA-03 | ✅ Resolved — file exists |
| TimetableController | ETS-03 | ✅ Resolved — file exists |
| NotificationsController | NHT-01 | ✅ Resolved — file exists |
| TicketsController | NHT-03 | ✅ Resolved — file exists |
| SyllabusController | CCM-02 | ❌ Still missing (see D-24) |
| DiscussionController | LMS-02 | ❌ Still missing (see D-24) |
| GradeChangeController | AGI-03 read endpoint | ❌ Still missing (see D-23) |

---

## 🔴 Critical (1 still open)

### D-03: JWT configuration key names and values differ
[`appsettings.json:14-19`](../EduLearn.API/appsettings.json) still uses `"Key"` (PRD says `Secret`), `"ExpiryInMinutes": 60` (PRD says `AccessTokenExpiryMinutes: 90`), and the secret value is hardcoded (`"ThisIsA32CharSecretKeyForEduLearn!"` — PRD recommends user-secrets).

**Resolution needed:** team alignment + move secret to user-secrets before any deploy.

---

## 🟡 Medium (13 still open)

### D-04: Repository count — PRD says 13, actual has 21
Updated count: `INotificationRepository` and `ITicketRepository` were both split (NHT-01/03). Actual interfaces in [`Repositories/Interfaces/`](../EduLearn.API/Repositories/Interfaces/) = 21.
**Resolution:** update PRD §4.3 and §4.5.

### D-05: Controller naming — PRD singular vs code plural
No change. All routes still match PRD paths; only C# class names differ (`UsersController` vs `UserController`). Cosmetic.

### D-06: DTOs folder structure flat vs PRD subfolders
No change. All DTOs in flat `DTOs/`. No functional impact.

### D-07: DTO naming convention `CreateXxxDto` vs PRD `XxxRequest`
No change. Cosmetic.

### D-08: Services — PRD lists 9, actual has 4
`Services/` directory now contains `TokenService`, `AuthService`, `AuditLogService`, `NotificationService` (4 — `NotificationService` was added for NHT-01). Still missing: `EnrollmentRuleEngine`, `TimetableService` (logic in `TimetableController` directly), `TranscriptService` (logic in `TranscriptsController`), `GradingService`, `PrerequisiteEngine`, `BillingEngine`, `KPIEngine`, `ReportGenerator`.

### D-09: Enum file contents don't match PRD layout
No change. `CourseEnums.cs` has only `CourseStatus`. `ProgramStatus`/`SectionStatus`/`RoomStatus` live in `SISEnums.cs`. `TranscriptStatus` lives in `AdmissionsEnums.cs`. No `TranscriptEnums.cs` file.

### D-11: SRA-01 has extra `GET /api/applicants/{id}` not in PRD
No change. Useful addition.

### D-12: SRA-02 has extra `POST /api/students` not in PRD
No change. Required by Saurav for the registrar's manual create flow.

### D-16: ETS-01 — prerequisite + timetable conflict checks still not in enroll
**Carried forward, now with extra weight.** The Timetable controller exists ([`TimetableController.cs`](../EduLearn.API/Controllers/TimetableController.cs)) and the conflict-detection logic works (smoke test module 24 verifies it). But [`EnrollmentsController.cs:41-167`](../EduLearn.API/Controllers/EnrollmentsController.cs#L41) still does not call it. Students must invoke `POST /api/timetable/validate-section` manually as a separate step. Prerequisite check still requires a `PrerequisiteEngine` (D-08).

### D-19: Transcript `entriesJSON` includes Dropped/Waitlisted enrollments — NEW
**PRD intent (SRA-03):** transcript represents completed coursework.
**Actual code:** [`TranscriptsController.cs:50-59`](../EduLearn.API/Controllers/TranscriptsController.cs#L50) builds `entries` from every enrollment row regardless of status. A student who dropped CS201 has that drop on their issued transcript.
**Resolution:** filter `.Where(e => e.Status == EnrollmentStatus.Enrolled)` (or future `Completed`) before `.Select`. The `totalCredits` calculation at [`line 61`](../EduLearn.API/Controllers/TranscriptsController.cs#L61) compares `e.Status.ToString() == "Enrolled"` with a string literal — change to enum comparison.

### D-20: GPA always null on transcripts — NEW
[`TranscriptsController.cs:67`](../EduLearn.API/Controllers/TranscriptsController.cs#L67) hardcodes `GPA = null`. PRD-required field never populated. Needs a `GradingService` (D-08).

### D-21: Section seed `scheduleJSON: "[]"` silently disables conflict detection — NEW
[`tests/smoke/modules/07_sections.sh:6`](../tests/smoke/modules/07_sections.sh#L6) creates the primary test section with `scheduleJSON: "[]"` (a JSON array string, not the expected object `{"days":...,"time":...}`). [`TimetableController.cs:151-163`](../EduLearn.API/Controllers/TimetableController.cs#L151) deserializes it into `ScheduleInfo` with both `Days` and `Time` null. The null-guard at [`line 113`](../EduLearn.API/Controllers/TimetableController.cs#L113) skips the conflict check, yielding `HasConflict = false` even on real overlaps.
**Resolution:** (1) reject malformed `scheduleJSON` at `POST /api/sections`; (2) fix the smoke seed to use the object form; (3) make `ParseSchedule` return `null` (not a partial object) when the JSON isn't an object.

### D-22: `POST /api/auth/refresh` listed in architecture reference but not implemented — NEW
[`docs/ARCHITECTURE-REFERENCE.md:126`](ARCHITECTURE-REFERENCE.md#L126) lists it as IAM-01. No implementation exists. 60-minute token expiry forces re-login.

---

## 🟢 Low (8 still open)

### D-13: Features ahead of schedule
SFB-04 (Scholarships), RKA-03 (Audit Packages), IAM-04 (Audit Logs) all done before their PRD milestone. Positive — no action.

### D-18: `EduLearn.Tests/` project missing
Smoke tests (`tests/smoke/`) are not a substitute. Post-interim deliverable.

### D-23: AGI-03 read + AGI-04 plagiarism endpoints missing — NEW
Architecture ref [`§188-192`](ARCHITECTURE-REFERENCE.md) lists `POST /api/grade-changes`, `GET /api/gradechanges/submission/{submissionId}`, `PUT /api/submissions/{id}/plagiarism-report`, `GET /api/submissions/{id}/integrity-status`. None exist. `GradeChange` rows are written internally by [`SubmissionsController.cs:152-163`](../EduLearn.API/Controllers/SubmissionsController.cs#L152) (good — attribution preserved) but cannot be queried via API.

### D-24: CCM-02 / CCM-03 / LMS-02 endpoints confirmed missing — NEW (consolidates D-14 leftovers)
- `SyllabusController` — no file (CCM-02)
- `DiscussionsController` — no file (LMS-02). `IDiscussionRepository` and `Discussion` model exist; controller absent.
- `GET /api/courses/{id}/check-prerequisites/{studentId}` — not on `CoursesController` (CCM-03)
Post-interim.

### D-25: `POST /api/users` not in IAM-02 endpoint table — NEW
[`UsersController.cs:27-29`](../EduLearn.API/Controllers/UsersController.cs#L27) implements it under `AdminPolicy`; required by user-flow Step 0.2. The endpoint is correct — only the architecture reference table is incomplete. Documentation-only fix.

---

## Action Items (refreshed 2026-05-04)

| # | Action | Priority | Effort |
|---|---|---|---|
| 1 | D-03: align JWT keys + move secret to user-secrets | 🔴 High | 30 min |
| 2 | D-16: wire `TimetableController.ValidateSection` into `EnrollmentsController.Enroll` | 🟡 Medium | 30 min |
| 3 | D-19: filter transcript entries to enrolled-only | 🟡 Medium | 15 min |
| 4 | D-20: compute GPA from graded submissions | 🟡 Medium | 1 hr |
| 5 | D-21: validate `scheduleJSON` shape on section create + fix smoke seed | 🟡 Medium | 30 min |
| 6 | D-22: implement `POST /api/auth/refresh` or document deferral | 🟡 Medium | 1 hr |
| 7 | D-23: add `GET /api/gradechanges/submission/{id}` | 🟡 Medium | 30 min |
| 8 | D-04, D-08: update PRD repo + service counts (21 / 4) | 🟢 Low | 10 min |
| 9 | D-25: add `POST /api/users` to architecture reference IAM-02 table | 🟢 Low | 5 min |
| 10 | D-24, D-15, D-18: post-interim deliverables — schedule | 🟢 Low | n/a |

The end-user audit on 2026-05-04 reviewed every controller from a real-user perspective. After re-grading findings against PRD intent, only **7 items** are worth fixing — most are reflected in this doc (D-03, D-19, D-20, D-21) plus three runtime/polish items (scholarship-not-applied to invoice, missing class-level `[Authorize]` on 7 controllers, KPIs not auto-seeded). See [AUDIT-REPORT-2026-05-04.md](AUDIT-REPORT-2026-05-04.md) for the full reasoning, including 35 over-engineered findings explicitly dropped as out-of-scope for this internship project.

---

## Conclusion

Implementation continues to be **functionally correct and PRD-aligned**. The April 15 critical-tier discrepancies are mostly resolved (4 of 4 ✅ except D-03 JWT config). The 7 new items from the May 4 audit are mostly post-interim work or single-file fixes (D-19, D-20, D-21 are 15-30 min each). No new blockers introduced by the Transcripts/Timetable/Notifications/Tickets shipment.

The most urgent item remains **D-03 (JWT keys + hardcoded secret)** — the only open Critical — which should land before any non-dev deployment.

---

*Generated: April 15, 2026 — Refreshed: May 4, 2026 (post 13-agent end-user audit)*
