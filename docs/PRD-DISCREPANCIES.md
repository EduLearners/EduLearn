# PRD vs Implementation — Discrepancy Report

> **PRD Reference:** `docs/EduLearn-PRD-v1.0_2.docx` (ONLY authoritative version)
> **Audit Date:** April 15, 2026
> **Auditor:** Vikash (M3)
> **Branch Audited:** `AGI_Vikash` (post-merge from `origin/Development`)

---

## Summary

| Severity | Count | Description |
|----------|-------|-------------|
| 🔴 Critical | 4 | Enum values, config keys, and counts that would break tests or documentation accuracy |
| 🟡 Medium | 8 | Structural differences from PRD (naming, folder layout, repo granularity) |
| 🟢 Low | 6 | Aspirational items not yet built (post-interim), minor cosmetic differences |
| **Total** | **18** | |

---

## 🔴 Critical Discrepancies

### D-01: StudentLifecycleStatus enum values differ

| | PRD (Section 5.2, Student table) | Actual (`EnrollmentEnums.cs`) |
|---|---|---|
| Value 1 | Active | Active |
| Value 2 | Graduated | OnLeave |
| Value 3 | **Withdrawn** | Graduated |
| Value 4 | **Suspended** | **Expelled** |

**Impact:** PRD says `Withdrawn` and `Suspended`. Code has `OnLeave` and `Expelled` instead. Any test scripts or frontend code referencing PRD values will fail.

**Resolution needed:** Team decision — either update the enum to match PRD or update PRD to match code. The code values (`OnLeave`, `Expelled`) are arguably more precise than the PRD values.

---

### D-02: AssessmentStatus enum missing `Archived`

| | PRD (Section 6.6, AGI-01) | Actual (`AssessmentEnums.cs`) |
|---|---|---|
| Values | Draft → Published → Closed → **Archived** | Draft → Published → Closed |

**Impact:** PRD describes a 4-state lifecycle including `Archived`. The code only has 3 states. The `PublishAssessment` endpoint enforces `Draft → Published → Closed` but has no path to `Archived`.

**Resolution needed:** Either add `Archived` to the enum and allow `Closed → Archived` transition, or acknowledge this as a simplification.

---

### D-03: JWT configuration key names and values differ

| Setting | PRD (Section 9) | Actual (`appsettings.json`) |
|---|---|---|
| Secret key name | `Jwt:Secret` | `Jwt:Key` |
| Expiry key name | `Jwt:AccessTokenExpiryMinutes` | `Jwt:ExpiryInMinutes` |
| Expiry value | `90` minutes | `60` minutes |
| Secret value | `** user-secrets **` | `ThisIsA32CharSecretKeyForEduLearn!` (hardcoded) |

**Impact:** Any documentation, scripts, or frontend code referencing PRD config keys will fail. The hardcoded JWT secret in appsettings.json is a security concern for production (PRD recommends user-secrets).

**Resolution needed:** Either update `appsettings.json` keys to match PRD, or update PRD to match code. The hardcoded secret should be moved to user-secrets before deployment.

---

### D-04: Repository count — PRD says 13, actual has 20

| PRD Repository (Section 4.3) | Covers Entities | Actual Implementation |
|---|---|---|
| IUserRepository | User | ✅ IUserRepository |
| IAuditLogRepository | AuditLog | ✅ IAuditLogRepository |
| IApplicantRepository | Applicant | ✅ IApplicantRepository |
| IStudentRepository | Student, Transcript | ✅ IStudentRepository + **ITranscriptRepository** (split) |
| ICourseRepository | Course, Program, Syllabus | ✅ ICourseRepository + **IProgramRepository** (split) |
| ISectionRepository | Section, Room | ✅ ISectionRepository + **IRoomRepository** (split) |
| IEnrollmentRepository | Enrollment | ✅ IEnrollmentRepository |
| IContentRepository | Content | ✅ IContentRepository |
| IDiscussionRepository | Discussion | ✅ IDiscussionRepository |
| IAssessmentRepository | Assessment, Submission, GradeChange | ✅ IAssessmentRepository + **ISubmissionRepository** (split) |
| IFinanceRepository | FeeSchedule, Invoice, Payment, Scholarship | **IFeeScheduleRepository + IInvoiceRepository + IPaymentRepository + IScholarshipRepository** (split into 4) |
| IReportRepository | Report, KPI, AuditPackage | ✅ IReportRepository (kept as composite) |
| INotificationRepository | Notification, Ticket | ✅ INotificationRepository |

**PRD total: 13 interfaces. Actual total: 20 interfaces.**

The implementation chose to split composite repositories into focused single-entity repos. This is actually better design (single responsibility), but the PRD's Section 4.3 table and Section 4.5 project structure both say "13".

**Impact:** Documentation references to "13 repositories" are inaccurate. New team members reading the PRD will expect 13 files, find 20.

**Resolution needed:** Update PRD Section 4.3 and 4.5 to reflect 20 repositories, or add a note that composite repos were split during implementation.

---

## 🟡 Medium Discrepancies

### D-05: Controller naming — PRD uses singular, code uses plural

| PRD Name (Section 4.4, 4.5) | Actual File Name |
|---|---|
| AuthController | AuthController ✅ (matches) |
| UserController | **Users**Controller |
| AuditLogController | AuditLogController ✅ (matches) |
| ApplicantController | **Applicants**Controller |
| StudentController | **Students**Controller |
| CourseController | **Courses**Controller |
| ProgramController | **Programs**Controller |
| SyllabusController | ❌ Not yet created |
| EnrollmentController | **Enrollments**Controller |
| SectionController | **Sections**Controller |
| RoomController | **Rooms**Controller |
| ContentController | **Contents**Controller |
| AssessmentController | **Assessments**Controller |
| SubmissionController | **Submissions**Controller |
| FeeController | **Fees**Controller |
| InvoiceController | **Invoices**Controller |
| PaymentController | **Payments**Controller |
| ScholarshipController | **Scholarships**Controller |
| ReportController | **Reports**Controller |
| KPIController | **KPIs**Controller |
| AuditPackageController | **AuditPackages**Controller |

**Impact:** Low — routes still match PRD paths (e.g., `/api/users`, `/api/courses`). Only the C# class names differ (plural). Does not affect API consumers.

---

### D-06: DTOs folder structure — PRD uses subfolders, actual is flat

| PRD (Section 4.5) | Actual |
|---|---|
| `DTOs/Auth/` (LoginRequest, RegisterRequest, AuthResponse) | `DTOs/AuthDto.cs` (flat, single file with all auth DTOs) |
| `DTOs/Student/` (StudentDto, CreateStudentRequest) | `DTOs/CreateStudentDto.cs`, `DTOs/StudentResponseDto.cs` (flat) |
| `DTOs/Course/` (CourseDto, CreateCourseRequest) | `DTOs/CreateCourseDto.cs`, `DTOs/CourseResponseDto.cs` (flat) |
| `DTOs/Enrollment/` (EnrollRequest, EnrollmentDto) | `DTOs/CreateEnrollmentDto.cs`, `DTOs/EnrollmentResponseDto.cs` (flat) |
| etc. | etc. |

**Impact:** No functional impact. All DTOs are accessible. Flat structure is simpler for a monolith of this size.

---

### D-07: DTO naming convention — PRD uses `*Request`, code uses `Create*Dto`

| PRD Convention | Actual Convention |
|---|---|
| `LoginRequest` | `LoginDto` |
| `RegisterRequest` | `RegisterDto` |
| `CreateStudentRequest` | `CreateStudentDto` |
| `CreateCourseRequest` | `CreateCourseDto` |
| `StudentDto` (response) | `StudentResponseDto` |
| `CourseDto` (response) | `CourseResponseDto` |

**Impact:** None functionally. The code convention (`Create*Dto` + `*ResponseDto`) is actually more consistent and explicit.

---

### D-08: Services — PRD lists 9 services, actual has 3

| PRD Service (Section 4.5) | Exists? | Notes |
|---|---|---|
| TokenService.cs | ✅ Yes | JWT generation |
| AuthService.cs | ✅ Yes | Register/login logic (not in PRD but exists) |
| AuditLogService.cs | ✅ Yes | Audit trail (not in PRD but exists) |
| EnrollmentRuleEngine.cs | ❌ No | Logic currently in EnrollmentsController |
| TimetableService.cs | ❌ No | ETS-03 not implemented yet |
| TranscriptService.cs | ❌ No | SRA-03 not implemented yet |
| GradingService.cs | ❌ No | Logic currently in SubmissionsController |
| PrerequisiteEngine.cs | ❌ No | CCM-03 not implemented yet |
| BillingEngine.cs | ❌ No | Logic currently in InvoicesController |
| KPIEngine.cs | ❌ No | Logic in ReportRepository |
| ReportGenerator.cs | ❌ No | QuestPDF not integrated yet |

**Impact:** Business logic that the PRD envisions as separate service classes currently lives inside controllers and repositories. This works for the interim milestone but may need refactoring for post-interim features.

---

### D-09: Enum file contents don't match PRD file layout

| PRD Says (Section 4.5 Enums) | Actual |
|---|---|
| `CourseEnums.cs` → CourseStatus, ProgramStatus, SectionStatus | `CourseEnums.cs` → CourseStatus only. ProgramStatus + SectionStatus + RoomStatus are in `SISEnums.cs` |
| `TranscriptEnums.cs` → TranscriptStatus, RoomStatus | TranscriptStatus is in `AdmissionsEnums.cs`. RoomStatus is in `SISEnums.cs`. There is no `TranscriptEnums.cs` file. |

**Impact:** Developers looking for enums in the file the PRD specifies won't find them. All enums exist but in different files.

---

### D-10: NotificationSeverity — extra value not in PRD

| PRD (Section 6.9) | Actual (`NotificationEnums.cs`) |
|---|---|
| Info, Warning, Critical | Info, Warning, **Error**, Critical |

**Impact:** Minor — code has an additional `Error` severity level between `Warning` and `Critical`. No functional issue.

---

### D-11: SRA-01 endpoints — actual has extra endpoint

| PRD Endpoint | Exists? |
|---|---|
| POST /api/applicants | ✅ |
| GET /api/applicants | ✅ |
| PUT /api/applicants/{id}/status | ✅ |
| **GET /api/applicants/{id}** | ✅ (exists in code but **NOT listed in PRD**) |

**Impact:** The code has a `GET /api/applicants/{id}` endpoint that the PRD doesn't mention. This is a useful addition — likely just an omission from the PRD.

---

### D-12: SRA-02 endpoints — actual has extra POST endpoint

| PRD Endpoint | Exists? |
|---|---|
| GET /api/students | ✅ |
| GET /api/students/{id} | ✅ |
| PUT /api/students/{id} | ✅ |
| **POST /api/students** | ✅ (exists in code but **NOT listed in PRD**) |

**Impact:** Saurav added a `POST /api/students` endpoint for creating student records after applicant acceptance. The PRD doesn't list this — it implies student creation is automatic on applicant acceptance. The manual POST endpoint is a practical addition.

---

## 🟢 Low Discrepancies (Aspirational / Post-Interim)

### D-13: Interim milestone — some features completed ahead of schedule

| Feature | PRD Milestone | Actual Status |
|---|---|---|
| SFB-04 (Scholarships) | Post-interim | ✅ Already implemented by Tanya |
| RKA-03 (Audit Packages) | Post-interim | ✅ Already implemented by Utkarsh |
| IAM-04 (Audit Logs) | Interim | ✅ Implemented by Ashish |

**Impact:** Positive — team delivered more than required for interim.

---

### D-14: Controllers not yet created (post-interim)

| PRD Controller | Feature | Owner | Status |
|---|---|---|---|
| TranscriptController | SRA-03 | Saurav | ❌ Post-interim |
| SyllabusController | CCM-02 | Vikash | ❌ Post-interim |
| TimetableController | ETS-03 | Saurav | ❌ Post-interim |
| DiscussionController | LMS-02 | Vikash | ❌ Post-interim |
| GradeChangeController | AGI-03 | Vikash | ❌ Post-interim |
| NotificationController | NHT-01 | Swarna | ❌ Not started |
| TicketController | NHT-03 | Swarna | ❌ Not started |

---

### D-15: IAM-03 (MFA) — not implemented

PRD Section 6.1 describes MFA with TOTP endpoints:
- `POST /api/auth/mfa/setup` — Set up TOTP
- `POST /api/auth/mfa/verify` — Verify MFA code

These endpoints do not exist. The `User.MFAEnabled` column exists in the model but is unused. PRD marks IAM-03 as post-interim for Ashish.

---

### D-16: ETS-01 — prerequisite check not implemented in enrollment

PRD Section 6.3 states: "System checks: (1) prerequisites met, (2) capacity not exceeded, (3) no duplicate enrollment, (4) no timetable conflicts."

Actual `EnrollmentsController` implements checks 2 and 3 (capacity + duplicate). Checks 1 (prerequisites) and 4 (timetable conflicts) are not implemented. These depend on CCM-03 (PrerequisiteEngine) and ETS-03 (TimetableService) which are both post-interim.

---

### D-17: Hubs/NotificationHub.cs — listed in PRD but doesn't exist

PRD Section 4.5 project structure lists `Hubs/NotificationHub.cs` for SignalR WebSocket. No `Hubs/` folder exists in the project. This is part of Swarna's NHT-01 (not started).

---

### D-18: EduLearn.Tests/ project — listed in PRD but doesn't exist

PRD Section 4.5 describes a full test project:
```
EduLearn.Tests/
├── Controllers/    # Controller unit tests
├── Repositories/   # Repository unit tests
└── Services/       # Service/engine unit tests
```

No test project exists yet. This is a post-interim deliverable.

---

## Action Items

| # | Action | Owner | Priority | Effort |
|---|---|---|---|---|
| 1 | Decide on `StudentLifecycleStatus` values (D-01) — align code or PRD | Team | 🔴 High | 10 min |
| 2 | Add `Archived` to `AssessmentStatus` or document as intentional simplification (D-02) | Vikash | 🔴 High | 5 min |
| 3 | Decide on JWT config key names (D-03) — align `appsettings.json` or PRD | Ashish | 🔴 High | 5 min |
| 4 | Move JWT secret to user-secrets for production (D-03) | Ashish | 🟡 Medium | 15 min |
| 5 | Update PRD Section 4.3 and 4.5 repo count from 13 → 20 (D-04) | Vikash | 🟡 Medium | 10 min |
| 6 | Acknowledge controller naming convention difference (D-05) — no code change needed | Team | 🟢 Low | 0 min |
| 7 | Acknowledge DTO folder/naming conventions (D-06, D-07) — no code change needed | Team | 🟢 Low | 0 min |
| 8 | Extract business logic into service classes for post-interim (D-08) | All | 🟡 Medium | Post-interim |
| 9 | Update PRD enum file layout to match actual (D-09) | Vikash | 🟢 Low | 10 min |

---

## Conclusion

The implementation is **functionally correct** and covers all PRD-required interim features. The discrepancies are primarily structural (naming conventions, folder layout, repository granularity) and a handful of enum value mismatches. None of these prevent the API from working or being tested.

The most critical items to resolve before the interim review are D-01 (StudentLifecycleStatus), D-02 (AssessmentStatus), and D-03 (JWT config keys) — as these could cause confusion during the team demo or testing.

---

*Generated: April 15, 2026 | EduLearn PRD v1.0_2 vs AGI_Vikash branch*
