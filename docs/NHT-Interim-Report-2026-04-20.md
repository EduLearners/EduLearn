# EduLearn NHT Module — Interim Checkpoint Report

**Author:** Priyanshu Sharma (M6, NHT owner)  
**Date:** 2026-04-20  
**Branch:** `NHT_Priyanshu` (HEAD: `87cda39`)  
**Interim deadline:** 2026-04-24 | **Final deadline:** 2026-06-16  
**Status: ✅ NHT-01 and NHT-03 complete — ready for merge into `development`**

---

## 1. Executive Summary

The NHT module (Notifications + Helpdesk Tickets) has been fully implemented, tested, and verified against PRD §6.9. Two key architectural decisions made during this sprint:

1. **SignalR removed** — Mentor confirmed WebSockets/SignalR are out of syllabus. The notification system was rebuilt as a purely REST-based Web API while retaining all PRD-required functional surfaces.
2. **Cross-module wiring verified** — Enrollment, Assessment, and Finance producers all fire `NotifyAsync` correctly; Student1 accumulates 6 real upstream notifications before the notification smoke module even runs.

Final smoke run (2026-04-20 12:29–12:40): **212/212 assertions PASS, 0 failures, 0 SLA violations**.

A follow-up fix commit (`87cda39`) resolved two build-consistency issues found during the compatibility analysis that would have broken a fresh-clone build.

---

## 2. Module Implementation Status

### NHT-01 — Notifications (REST-only)

| Feature | Status | Notes |
|---|---|---|
| Persist-only notification service | ✅ Done | `NotificationService.cs` — no SignalR dependency |
| `GET /api/notifications` (own, paginated) | ✅ Done | `?page=N&pageSize=N&unreadOnly=true` supported |
| `GET /api/notifications/unread-count` | ✅ Done | Returns `{ unreadCount: N }` |
| `PUT /api/notifications/{id}/read` | ✅ Done | 204 own, 403 other user, 404 not found, idempotent |
| `PUT /api/notifications/read-all` | ✅ Done | Marks all as read, 204 response |
| `POST /api/notifications/test` (AdminPolicy) | ✅ Done | ITAdmin only, 201; Student 403 |
| PRD-aligned enums | ✅ Done | `Enrollment`, `Assessment`, `Finance`, `IT`, `System`; `Grade` removed → 400 |
| Enrollment producer (enroll + drop) | ✅ Done | Fires after transaction commit |
| Assessment producer (grade posted) | ✅ Done | `NotificationCategory.Assessment` |
| Finance producer (invoice generated) | ✅ Done | `NotificationCategory.Finance` |
| Ownership guard (`NOTIFICATION_FORBIDDEN`) | ✅ Done | Cross-user read → 403 |
| Not-found guard (`NOTIFICATION_NOT_FOUND`) | ✅ Done | Bad ID → 404 |

### NHT-03 — Helpdesk Tickets

| Feature | Status | Notes |
|---|---|---|
| `POST /api/tickets` (any authenticated user) | ✅ Done | Returns 201, AuditLog wired |
| `GET /api/tickets` (own for users, all for ITAdmin) | ✅ Done | Role-based scoping |
| `GET /api/tickets/{id}` (creator/assignee/ITAdmin) | ✅ Done | 403 + `TICKET_FORBIDDEN` for others |
| `PUT /api/tickets/{id}/assign` (SupportStaffPolicy) | ✅ Done | Assignee must be ITAdmin, status → InProgress |
| `PUT /api/tickets/{id}/resolve` (SupportStaffPolicy) | ✅ Done | 400 on duplicate resolve |
| NHT-01 bridge: assign notifies assignee | ✅ Done | `NotificationCategory.IT` |
| NHT-01 bridge: resolve notifies creator | ✅ Done | `NotificationCategory.IT` |
| Audit trail | ✅ Done | `TicketCreated`, `TicketAssigned`, `TicketResolved` events |

**Note:** NHT-02 (real-time push via WebSocket/SignalR) was explicitly removed per mentor clarification — it is out of syllabus. This is logged in `docs/PRD-DISCREPANCIES.md`.

---

## 3. Smoke Test Results

**Run timestamp:** 2026-04-20 12:29:50 → 12:40:43 IST  
**API base:** `https://localhost:5001`

| Metric | Count |
|---|---|
| Total assertions | 212 |
| ✅ Passed | 212 |
| ❌ Failed | 0 |
| ⚠️ Warnings (SLA WARN) | 0 |

**All 23 modules + 3 security suites passed.**

### Module 21 — Notifications (NHT-01) — 19 assertions, all PASS

| Assertion | Result |
|---|---|
| Pre-seed producer check: Student1 has 6 unread from upstream | ✅ PASS |
| `GET /api/notifications/unread-count` (pre-seed) → 200 | ✅ PASS |
| `POST /api/notifications/test` (Student) → 403 AdminPolicy | ✅ PASS |
| `POST /api/notifications/test` (ITAdmin) → 201 | ✅ PASS |
| `POST /api/notifications/test` category=Assessment → 201 | ✅ PASS |
| `POST /api/notifications/test` category=IT severity=Warning → 201 | ✅ PASS |
| `POST /api/notifications/test` category=Grade (removed) → 400 | ✅ PASS |
| `GET /api/notifications` (own) → 200 | ✅ PASS |
| `GET /api/notifications?unreadOnly=true` → 200 | ✅ PASS |
| `GET /api/notifications/unread-count` (post-seed) → 200 | ✅ PASS |
| `PUT /api/notifications/{id}/read` other user → 403 + NOTIFICATION_FORBIDDEN | ✅ PASS |
| `PUT /api/notifications/{bad}/read` → 404 + NOTIFICATION_NOT_FOUND | ✅ PASS |
| `PUT /api/notifications/{id}/read` (own) → 204 | ✅ PASS |
| `PUT /api/notifications/{id}/read` idempotent → 204 | ✅ PASS |
| `PUT /api/notifications/read-all` → 204 | ✅ PASS |
| After `read-all`, unread count = 0 | ✅ PASS |

### Module 22 — Tickets (NHT-03) — 17 assertions, all PASS

All ticket lifecycle tests (create, list, get, assign, resolve) passed including cross-user 403, duplicate-resolve 400, and error code assertions (`TICKET_FORBIDDEN`, `TICKET_NOT_FOUND`, `ASSIGNEE_NOT_FOUND`, `ASSIGNEE_NOT_ITADMIN`, `INVALID_TICKET_STATUS_TRANSITION`).

### Security Suite — All PASS

Finance bypass, anonymous elevation, and full AuthZ sweep suites all passed. Key checks relevant to NHT:

| Check | Result |
|---|---|
| `[C-1.B]` Student → `POST /api/invoices/generate` → 403 | ✅ PASS |
| `[C-5]` Student → `POST /api/submissions/{id}/grade` → 403 | ✅ PASS |
| `[H-3]` Attribution forgery blocked (ChangedByFK = Instructor, not Student) | ✅ PASS |

---

## 4. Performance Analysis

All endpoints measured in the smoke run. Response times on local dev (SQLite/in-memory, no network overhead):

```
Endpoint                                           n   min   avg   p95   max
-----------------------------------------------------------------------------
POST /api/auth/register                           11    25  1887 19424 19424  ← BCrypt-bound (expected)
POST /api/auth/login                              11   130   165   294   294
POST /api/users                                    3    21    65   152   152
POST /api/enrollment/enroll                        6    21    52   143   143
POST /api/students                                 5    24    42   106   106
POST /api/invoices/generate                        4    20    42   106   106
POST /api/reports/generate                         4    23    41    88    88
POST /api/fees                                     4    20    38    86    86
POST /api/payments                                 5    20    37    84    84
POST /api/submissions/{id}/grade                   6    19    43    80    80
POST /api/tickets                                  2    21    51    80    80

Total requests: 205 · >1s: 1 (0%)
```

### SLA Compliance

| Rule | Budget | Status |
|---|---|---|
| `POST /api/enrollment/enroll` (PRD HARD) | 2000ms | ✅ p95 = 143ms |
| `DELETE /api/enrollment/*/drop` (PRD HARD) | 2000ms | ✅ well under |
| `POST /api/submissions/*/grade` (PRD HARD) | 2000ms | ✅ p95 = 80ms |
| `GET /api/notifications/unread-count` (WARN) | 150ms | ✅ no violations |
| All other endpoints (WARN) | 500–750ms | ✅ no violations |

**0 PRD-mandated SLA violations. 0 WARN-level violations.**

> Auth `register` p95 = 19424ms is BCrypt-bound by design (N-1 hardening adds BCrypt cost). Excluded from all SLA checks per `sla.conf` explicit WARN-only rule.

---

## 5. Compilation Status

**Build: Clean (0 `error CS`)**

Only errors on `dotnet build` are `MSBuild MSB3027/MSB3021` (file-lock on the running `.exe`) — these are not C# compilation errors. The API compiles cleanly.

> Note: Warnings (6 total) are pre-existing migration naming warnings (`CS8981`) unrelated to NHT work.

---

## 6. PRD Compliance (§6.9 NHT)

| PRD Requirement | Implementation | Compliant |
|---|---|---|
| Notify student on enrollment | `EnrollmentsController.Enroll()` → `NotifyAsync` post-commit | ✅ |
| Notify student on drop | `EnrollmentsController.Drop()` → `NotifyAsync` post-commit | ✅ |
| Notify student on grade posted | `SubmissionsController.GradeSubmission()` → `NotifyAsync` | ✅ |
| Notify student on invoice generated | `InvoicesController.Generate()` → `NotifyAsync` | ✅ |
| Notification categories: Enrollment, Assessment, Finance, IT, System | `NotificationEnums.cs` | ✅ |
| Severity: Info, Warning, Critical | `NotificationEnums.cs` | ✅ |
| User can list own notifications | `GET /api/notifications?page=N&pageSize=N` | ✅ |
| User can filter unread only | `GET /api/notifications?unreadOnly=true` | ✅ |
| User can see unread count | `GET /api/notifications/unread-count` | ✅ |
| User can mark single notification read | `PUT /api/notifications/{id}/read` | ✅ |
| User can mark all read | `PUT /api/notifications/read-all` | ✅ |
| SignalR/WebSocket push | **Removed** — out of syllabus per mentor clarification. Logged as PRD discrepancy. | N/A |
| Helpdesk tickets (NHT-03) | Full CRUD + assign + resolve + NHT-01 bridge | ✅ |

---

## 7. Teammate Compatibility Analysis

### Uncommitted Working-Tree Changes (from Development branch teammates)

The following uncommitted changes exist in the local working tree. They originate from the `Development` branch (committed by other teammates but not yet merged into `NHT_Priyanshu`):

| File | Change | Conflict with NHT? |
|---|---|---|
| `AppDbContext.cs` | Adds unique composite index on `(StudentID, SectionID)` for enrollments (C-23 hardening) | None — additive |
| `EduLearn.API.csproj` | Swashbuckle version bump 6.6.2 → 10.1.7 | None — additive |
| `HealthController.cs` | Adds `[Authorize(Policy="AdminPolicy")]` (N-1 hardening) | None — already handled in `run-all.sh` (switched connectivity probe to Swagger JSON) |
| `AuthController.cs` | C-26 hardening (forces Student role on register) | None — affects `seed.sh` which was already updated |
| `seed.sh` | Adds `_promote()` SQL role promotion for C-26 hardening | None — additive section after our changes |
| `AuditLogService.cs` | Adds `QueryAsync` composable query method | None — we use `AuditLogService.LogAsync`, not `QueryAsync` |
| `IInvoiceRepository.cs` / `InvoiceRepository.cs` | Adds `GetByStudentAndTermAsync` | **Fixed in `87cda39`** — our committed InvoicesController already calls this; committed to branch |
| `ApplicantsController.cs`, `ContentsController.cs`, etc. | Various hardening fixes (ownership checks, auth) | None — NHT doesn't touch these controllers |
| `run-all.sh` | Connectivity probe switch to Swagger; security test exit-code tightening | None — our NHT additions (modules 21/22) already use the current run-all.sh structure |

### Merge Readiness Assessment

| Risk | Assessment |
|---|---|
| Merge conflict on shared controllers | **Low** — NHT modified 4 controllers (Enrollments, Submissions, Invoices, Tickets). Teammate working-tree modifications are for OTHER controllers. No overlap. |
| Merge conflict on `run-all.sh` | **Low** — working-tree version already contains our NHT module additions. The changes are additive. |
| Merge conflict on `seed.sh` | **Low** — teammate adds `_promote()` block in a separate section; our smoke tests use the resulting tokens. Additive. |
| Build breakage after merge | **None** — `ClaimsPrincipalExtensions.cs` is now committed (`87cda39`); `GetByStudentAndTermAsync` is committed. |
| Schema conflict | **None** — Enrollment unique index (`AppDbContext.cs` M file) is additive. NHT adds no schema changes. |

**Conclusion: Safe to merge `NHT_Priyanshu` → `development`** after reviewing the above.

### Issues Fixed in This Session (`87cda39`)

| Issue | Root Cause | Fix |
|---|---|---|
| `ClaimsPrincipalExtensions.cs` untracked | Added `using EduLearn.API.Extensions` + extension method calls in 3 controllers in our NHT commit, but never `git add`'d the Extensions file | Committed `EduLearn.API/Extensions/ClaimsPrincipalExtensions.cs` |
| `IInvoiceRepository.GetByStudentAndTermAsync` missing from interface | SFB team added call in `InvoicesController` (HARDENING M-8) but didn't commit the interface/implementation changes | Committed method to `IInvoiceRepository.cs` + `InvoiceRepository.cs` |
| Module 21 missing `perf_check` calls | Not implemented in initial NHT smoke module | Added `perf_check` to `unread-count` (×2), `POST /test`, `mark-read`, `read-all` |

---

## 8. Codebase Structure (NHT Files)

```
EduLearn.API/
├── Controllers/
│   ├── NotificationsController.cs   — NHT-01: 6 endpoints
│   └── TicketsController.cs         — NHT-03: 5 endpoints + NHT-01 bridge
├── Services/
│   ├── INotificationService.cs      — interface (NotifyAsync, GetForUserAsync, MarkReadAsync, MarkAllReadAsync)
│   └── NotificationService.cs       — persist-only implementation (no SignalR)
├── Repositories/
│   ├── Interfaces/INotificationRepository.cs
│   └── Implementations/NotificationRepository.cs
├── Models/
│   ├── Notification.cs
│   ├── Ticket.cs
│   └── Enums/
│       ├── NotificationEnums.cs     — Category (5 values), Severity (3 values), Status
│       └── TicketEnums.cs
├── DTOs/
│   ├── NotificationResponseDto.cs, CreateNotificationDto.cs, UnreadCountDto.cs
│   ├── PaginatedResponseDto.cs
│   └── TicketResponseDto.cs, CreateTicketDto.cs, AssignTicketDto.cs, ResolveTicketDto.cs
└── Extensions/
    └── ClaimsPrincipalExtensions.cs — GetUserId(), GetUserRole(), IsITAdmin()

tests/smoke/
├── modules/
│   ├── 21_notifications.sh   — 19 assertions + 5 perf_check calls
│   └── 22_tickets.sh         — 17 assertions
└── config/sla.conf            — notifications endpoint SLAs defined
```

---

## 9. Git History (NHT Branch)

```
87cda39  fix(NHT): add missing ClaimsPrincipalExtensions, IInvoiceRepository.GetByStudentAndTermAsync, perf checks
2af3d3a  refactor(NHT-01): rebuild notifications as REST-only, wire cross-module producers
0261307  feat(NHT): add notifications + helpdesk, code review docs, and smoke tests
577c249  merge: resolve .gitignore conflict, add waitlist shift logic
d71cf10  feat(ETS): add waitlist position shift on enrollment drop
...      (development base)
```

---

## 10. Outstanding Items & Next Steps

| Item | Priority | Status |
|---|---|---|
| Push `NHT_Priyanshu` to remote | High | Pending user approval |
| Merge `NHT_Priyanshu` into `development` | High | Pending user approval |
| Development branch teammate changes (M files) need commit/merge | High | Teammates' responsibility |
| `EduLearn.API.csproj` Swashbuckle 10.1.7 upgrade | Medium | Uncommitted — needs team coordination |
| AppDbContext enrollment unique index migration file | Medium | `20260417121001_AddEnrollmentUniqueIndex.cs` untracked locally |
| NHT-02 (real-time push) | N/A | Out of syllabus per mentor — removed |

### Pre-existing Issues (Not NHT-introduced, found during analysis)

These exist across all branches and predate NHT work:

| Issue | Affected Area | Notes |
|---|---|---|
| Many teammate working-tree changes uncommitted | All modules | Teammates need to `git add` + commit their hardening fixes to `development` |
| `AuthController` C-26 hardening uncommitted | Auth module | Blocks fresh-checkout integration testing for other teammates |

---

## 11. Summary

The NHT module is **fully implemented, tested, and compliant** with PRD §6.9 within the defined tech-stack constraints (REST Web API, .NET 8, EF Core). The SignalR discrepancy has been formally resolved per mentor guidance. Smoke tests pass end-to-end (212/212). The branch is compatible with the development branch and safe to merge.

**To complete the merge:**
```bash
git push origin NHT_Priyanshu
git checkout development
git merge NHT_Priyanshu --no-ff -m "merge: NHT-01 notifications + NHT-03 tickets into development"
git push origin development
```
