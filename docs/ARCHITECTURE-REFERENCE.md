# EduLearn v1.0 — Architecture Reference

## Architecture: Monolithic REST API

Single `EduLearn.API` project. Single `AppDbContext`. Single port (5000/5001).

1 API project, 1 DbContext, migrations run from EduLearn.API.

---

## Project Structure

```
EduLearn.API/
├── Controllers/          One file per resource (27 controllers)
├── Data/
│   └── AppDbContext.cs   All 25 entities, all FK configs, all HasConversion calls
├── DTOs/                 Request and response DTOs per controller
├── Models/               25 entity classes
│   └── Enums/            10 enum files
├── Repositories/
│   ├── Interfaces/       13 IXxxRepository interfaces
│   └── Implementations/  13 XxxRepository classes
├── Services/             Business logic services (TokenService, EnrollmentRuleEngine, etc.)
├── Hubs/
│   └── NotificationHub.cs  SignalR WebSocket hub
├── Migrations/           EF Core generated migrations
└── Program.cs            DI, Swagger, CORS, JsonStringEnumConverter
```

---

## 25 Entities — Quick Reference

| # | Table | PK | Key FKs | Enum Fields |
|---|---|---|---|---|
| 1 | Users | UserID | — | Role (UserRole), Status (UserStatus) |
| 2 | AuditLogs | AuditID | UserID→Users | — |
| 3 | Applicants | ApplicantID | — | ApplicationStatus |
| 4 | Students | StudentID | UserID→Users, ProgramID→Programs | EnrollmentStatus (StudentLifecycleStatus) |
| 5 | Transcripts | TranscriptID | StudentID→Students | Status (TranscriptStatus) |
| 6 | Courses | CourseID | — | Status (CourseStatus) |
| 7 | Programs | ProgramID | — | Status (ProgramStatus) |
| 8 | Syllabi | SyllabusID | CourseID→Courses, CreatedByFK→Users | — |
| 9 | Sections | SectionID | CourseID→Courses, InstructorID→Users, RoomID→Rooms | Status (SectionStatus) |
| 10 | Enrollments | EnrollID | StudentID→Students, SectionID→Sections | Status (EnrollmentStatus) |
| 11 | Rooms | RoomID | — | Status (RoomStatus) |
| 12 | Contents | ContentID | CourseID→Courses, UploadedByFK→Users | Type (ContentType), Status (ContentStatus) |
| 13 | Discussions | DiscussionID | CourseID→Courses, ThreadStarterID→Users | Status (DiscussionStatus) |
| 14 | Assessments | AssessmentID | CourseID→Courses, SectionID→Sections (nullable), CreatedByFK→Users | Type (AssessmentType), Status (AssessmentStatus) |
| 15 | Submissions | SubmissionID | AssessmentID→Assessments, StudentID→Students, GraderID→Users (nullable) | Status (SubmissionStatus) |
| 16 | GradeChanges | GradeChangeID | SubmissionID→Submissions, ChangedByFK→Users | — |
| 17 | FeeSchedules | FeeID | ProgramID→Programs | Status (FeeScheduleStatus) |
| 18 | Invoices | InvoiceID | StudentID→Students | Status (InvoiceStatus) |
| 19 | Payments | PaymentID | InvoiceID→Invoices | Method (PaymentMethod), Status (PaymentStatus) |
| 20 | Scholarships | ScholarID | StudentID→Students | Status (ScholarshipStatus) |
| 21 | Reports | ReportID | GeneratedByFK→Users | Scope (ReportScope) |
| 22 | KPIs | KPIID | — | ReportingPeriod |
| 23 | AuditPackages | PackageID | — | — |
| 24 | Notifications | NotificationID | UserID→Users | Category, Severity, Status |
| 25 | Tickets | TicketID | CreatedByFK→Users, AssignedToFK→Users (nullable) | Priority (TicketPriority), Status (TicketStatus) |

All FK constraints use `DeleteBehavior.NoAction`. All enum columns stored as nvarchar strings.

---

## Unique Indexes

| Table | Column |
|---|---|
| Users | Username |
| Users | Email |
| Students | UserID |
| Students | MRN |
| Courses | Code |

---

## AppDbContext Enum Conversion Coverage

Every enum field in every entity has a corresponding `HasConversion<string>().HasMaxLength(N)` call in `OnModelCreating`, including `Section.Status`, `Program.Status`, and `Room.Status`.

---

## Migration Commands

```bash
# Generate
dotnet ef migrations add <n> --project EduLearn.API --startup-project EduLearn.API

# Apply
dotnet ef database update --project EduLearn.API --startup-project EduLearn.API
```

Or use the batch files: `.\add-migrations.bat <n>` and `.\migrate-database.bat`

---

## 9 Modules → Controllers

| Module | Code | Owner | Interim Features |
|---|---|---|---|
| Identity & Access Management | IAM | Ashish | IAM-01, IAM-02, IAM-04 |
| Student Registry & Admissions | SRA | Saurav | SRA-01, SRA-02 |
| Course Catalog & Curriculum | CCM | Vikash | CCM-01 |
| Enrollment & Timetable | ETS | Saurav | ETS-01, ETS-02 |
| Learning Content & LMS | LMS | Vikash | LMS-01 |
| Assessment, Grading & Integrity | AGI | Vikash | AGI-01, AGI-02 |
| Student Finance & Billing | SFB | Tanya | SFB-01, SFB-02, SFB-03 |
| Reporting, KPIs & Audit | RKA | Utkarsh | RKA-01, RKA-02 |
| Notifications & Helpdesk | NHT | Swarna | NHT-01, NHT-03 |

---

## All 30 Features — Endpoint Map

### IAM (Ashish)
| Feature | Method | Endpoint |
|---|---|---|
| IAM-01 | POST | /api/auth/login |
| IAM-01 | POST | /api/auth/register |
| IAM-01 | POST | /api/auth/refresh |
| IAM-02 | GET | /api/users |
| IAM-02 | GET | /api/users/{id} |
| IAM-02 | PUT | /api/users/{id} |
| IAM-02 | PUT | /api/users/{id}/status |
| IAM-03 | POST | /api/auth/mfa/setup |
| IAM-03 | POST | /api/auth/mfa/verify |
| IAM-04 | GET | /api/audit-log |

### SRA + ETS (Saurav)
| Feature | Method | Endpoint |
|---|---|---|
| SRA-01 | POST | /api/applicants |
| SRA-01 | GET | /api/applicants |
| SRA-01 | PUT | /api/applicants/{id}/status |
| SRA-02 | GET | /api/students |
| SRA-02 | GET | /api/students/{id} |
| SRA-02 | PUT | /api/students/{id} |
| SRA-03 | POST | /api/transcripts/generate/{studentId} |
| SRA-03 | GET | /api/transcripts/student/{studentId} |
| ETS-01 | POST | /api/enrollment/enroll |
| ETS-01 | DELETE | /api/enrollment/{id}/drop |
| ETS-01 | GET | /api/enrollment/student/{studentId} |
| ETS-01 | GET | /api/enrollment/section/{sectionId} |
| ETS-02 | POST | /api/sections |
| ETS-02 | GET | /api/sections/course/{courseId}/term/{term} |
| ETS-02 | POST | /api/rooms |
| ETS-02 | GET | /api/rooms |
| ETS-03 | GET | /api/timetable/student/{studentId}/{term} |
| ETS-03 | POST | /api/timetable/validate-section |

### CCM + LMS + AGI (Vikash)
| Feature | Method | Endpoint |
|---|---|---|
| CCM-01 | POST | /api/courses |
| CCM-01 | GET | /api/courses |
| CCM-01 | GET | /api/courses/{id} |
| CCM-01 | PUT | /api/courses/{id} |
| CCM-01 | POST | /api/programs |
| CCM-01 | GET | /api/programs |
| CCM-01 | GET | /api/programs/{id} |
| CCM-01 | PUT | /api/programs/{id} |
| CCM-02 | POST | /api/syllabi |
| CCM-02 | GET | /api/syllabi/course/{courseId} |
| CCM-02 | GET | /api/syllabi/{id} |
| CCM-02 | PUT | /api/syllabi/{id} |
| CCM-03 | GET | /api/courses/{id}/check-prerequisites/{studentId} |
| LMS-01 | POST | /api/content/upload |
| LMS-01 | GET | /api/content/course/{courseId} |
| LMS-01 | GET | /api/content/{id} |
| LMS-01 | PUT | /api/content/{id}/version |
| LMS-02 | POST | /api/discussions |
| LMS-02 | GET | /api/discussions/course/{courseId} |
| LMS-02 | POST | /api/discussions/{id}/reply |
| LMS-02 | PUT | /api/discussions/{id}/status |
| AGI-01 | POST | /api/assessments |
| AGI-01 | GET | /api/assessments/course/{courseId} |
| AGI-01 | PUT | /api/assessments/{id} |
| AGI-01 | PUT | /api/assessments/{id}/publish |
| AGI-02 | POST | /api/submissions |
| AGI-02 | GET | /api/submissions/assessment/{assessmentId} |
| AGI-02 | POST | /api/submissions/{id}/grade |
| AGI-02 | GET | /api/submissions/student/{studentId} |
| AGI-03 | POST | /api/grade-changes |
| AGI-03 | GET | /api/gradechanges/submission/{submissionId} |
| AGI-04 | PUT | /api/submissions/{id}/plagiarism-report |
| AGI-04 | GET | /api/submissions/{id}/integrity-status |

### SFB (Tanya)
| Feature | Method | Endpoint |
|---|---|---|
| SFB-01 | POST | /api/fees |
| SFB-01 | GET | /api/fees/program/{programId}/term/{term} |
| SFB-01 | PUT | /api/fees/{id} |
| SFB-02 | POST | /api/invoices/generate |
| SFB-02 | GET | /api/invoices/student/{studentId} |
| SFB-02 | GET | /api/invoices/{id} |
| SFB-03 | POST | /api/payments |
| SFB-03 | GET | /api/payments/invoice/{invoiceId} |
| SFB-04 | POST | /api/scholarships |
| SFB-04 | GET | /api/scholarships/student/{studentId} |
| SFB-04 | PUT | /api/scholarships/{id} |

### RKA (Utkarsh)
| Feature | Method | Endpoint |
|---|---|---|
| RKA-01 | POST | /api/reports/generate |
| RKA-01 | GET | /api/reports |
| RKA-01 | GET | /api/reports/{id}/download |
| RKA-02 | GET | /api/kpis |
| RKA-02 | POST | /api/kpis/recalculate |
| RKA-03 | POST | /api/audit-packages/generate |
| RKA-03 | GET | /api/audit-packages/{id}/download |

### NHT (Swarna)
| Feature | Method | Endpoint |
|---|---|---|
| NHT-01 | GET | /api/notifications |
| NHT-01 | PUT | /api/notifications/{id}/read |
| NHT-01 | PUT | /api/notifications/read-all |
| NHT-01 | GET | /api/notifications/unread-count |
| NHT-01 | WS | /notificationHub |
| NHT-03 | POST | /api/tickets |
| NHT-03 | GET | /api/tickets |
| NHT-03 | GET | /api/tickets/{id} |
| NHT-03 | PUT | /api/tickets/{id}/assign |
| NHT-03 | PUT | /api/tickets/{id}/resolve |
