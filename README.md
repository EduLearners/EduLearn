# EduLearn v11.0 — University Learning Management & Student Information System

**Monolithic REST API · Repository Pattern · 25 Entities · 9 Modules · 7 Roles · 30 Features**

| Attribute | Value |
|---|---|
| Team Size | 6 Developers |
| Timeline | 12 Weeks (Mar 25 – Jun 16, 2026) |
| Architecture | Monolithic REST API with Repository Pattern |
| Backend | ASP.NET Core 8.0 + EF Core 8.0 |
| Database | SQL Server LocalDB — 25 Entities — Single AppDbContext |
| Interim Milestone | April 24, 2026 |
| Final Deadline | June 16, 2026 |
| Program | Cognizant ADM DotNet FSE — INTDE26DFSR002 |

---

## Architecture

Restructured from 6 microservices (v10.0) into a single monolithic API (v11.0).

```
EduLearn/
├── EduLearn.API/
│   ├── Controllers/
│   ├── Data/AppDbContext.cs
│   ├── DTOs/
│   ├── Models/
│   │   └── Enums/
│   ├── Repositories/
│   │   ├── Interfaces/
│   │   └── Implementations/
│   └── Program.cs
├── add-migrations.bat
└── migrate-database.bat
```

Data flow: `Controller → IRepository → Repository → AppDbContext → SQL Server`

---

## Quick Start

**Prerequisites:** .NET 8 SDK, VS 2022, SQL Server LocalDB, `dotnet tool install --global dotnet-ef`

```bash
git clone <repo-url>
cd EduLearn
dotnet build EduLearn.API/EduLearn.API.csproj
.\add-migrations.bat InitialCreate
.\migrate-database.bat
dotnet run --project EduLearn.API
```

Swagger: `https://localhost:5001/swagger`

**Add a migration:** `.\add-migrations.bat <MigrationName>` then `.\migrate-database.bat`

**Reset DB:**
```sql
USE master;
ALTER DATABASE EduLearnDb SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
DROP DATABASE EduLearnDb;
```
Then re-run `.\migrate-database.bat`.

---

## Current State

### Completed
- All 25 entity models with correct schema, FK annotations, and data annotations
- 10 enum files — all status/type/role/category fields are typed enums stored as nvarchar via `HasConversion<string>()`
- Single `AppDbContext` — 25 DbSets, 31 FK relationships with `DeleteBehavior.NoAction`, all enum conversions configured
- 13 entity-specific repository interfaces and implementations
- All 13 repositories registered in `Program.cs`
- `UsersController` — 5 endpoints
- `CoursesController` — 4 endpoints
- `EnrollmentsController` — 4 endpoints with transaction support, auto-waitlist, and auto-promote on drop

### Pending
- `Migrations/` folder is empty — run `.\add-migrations.bat InitialCreate` before using the DB

---

## API Endpoints

Base URL: `https://localhost:5001`

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/users` | Create user |
| GET | `/api/users` | List users |
| GET | `/api/users/{id}` | Get user |
| PUT | `/api/users/{id}` | Update profile |
| PUT | `/api/users/{id}/status` | Update status |
| POST | `/api/courses` | Create course |
| GET | `/api/courses` | List courses |
| GET | `/api/courses/{id}` | Get course |
| PUT | `/api/courses/{id}` | Update course |
| POST | `/api/enrollment/enroll` | Enroll student |
| DELETE | `/api/enrollment/{id}/drop` | Drop enrollment |
| GET | `/api/enrollment/student/{studentId}` | Student enrollments |
| GET | `/api/enrollment/section/{sectionId}` | Section roster |

---

## Database

**Name:** `EduLearnDb` on `(localdb)\MSSQLLocalDB`
**Constraints:** 31 FKs (all NoAction), 5 unique indexes (Users.Username, Users.Email, Students.UserID, Students.MRN, Courses.Code)

### Entities by Owner

| Owner | Entities |
|---|---|
| Ashish (IAM) | User, AuditLog |
| Saurav (SRA+ETS) | Student, Applicant, Transcript, Section, Enrollment, Room |
| Vikash (CCM+LMS+AGI) | Course, Program, Syllabus, Content, Discussion, Assessment, Submission, GradeChange |
| Utkarsh (RKA) | Report, KPI, AuditPackage |
| Tanya (SFB) | FeeSchedule, Invoice, Payment, Scholarship |
| Swarna (NHT) | Notification, Ticket |

### Enum Files

| File | Enums |
|---|---|
| `UserEnums.cs` | UserRole, UserStatus |
| `EnrollmentEnums.cs` | EnrollmentStatus, StudentLifecycleStatus |
| `CourseEnums.cs` | CourseStatus |
| `AdmissionsEnums.cs` | ApplicationStatus, TranscriptStatus |
| `AssessmentEnums.cs` | AssessmentType, AssessmentStatus, SubmissionStatus |
| `ContentEnums.cs` | ContentType, ContentStatus, DiscussionStatus |
| `FinanceEnums.cs` | FeeScheduleStatus, InvoiceStatus, PaymentStatus, PaymentMethod, ScholarshipStatus |
| `NotificationEnums.cs` | NotificationCategory, NotificationSeverity, NotificationStatus, TicketStatus, TicketPriority |
| `AnalyticsEnums.cs` | ReportScope, ReportingPeriod |
| `SISEnums.cs` | SectionStatus, ProgramStatus, RoomStatus |

---

## Repositories

| Interface | Entity |
|---|---|
| IUserRepository | User |
| ICourseRepository | Course |
| IEnrollmentRepository | Enrollment |
| IStudentRepository | Student |
| ISectionRepository | Section |
| ITranscriptRepository | Transcript |
| IAssessmentRepository | Assessment |
| ISubmissionRepository | Submission |
| IPaymentRepository | Payment |
| INotificationRepository | Notification |
| IContentRepository | Content |
| IInvoiceRepository | Invoice |
| IDiscussionRepository | Discussion |

---

## Team Assignment

| Member | Module | Controllers |
|---|---|---|
| Ashish (M1) | IAM | AuthController, UsersController, AuditLogController |
| Saurav (M2) | SRA+ETS | ApplicantsController, StudentsController, TranscriptsController, EnrollmentsController, SectionsController, RoomsController, TimetableController |
| Vikash (M3) | CCM+LMS+AGI | CoursesController, ProgramsController, SyllabiController, ContentsController, DiscussionsController, AssessmentsController, SubmissionsController, GradeChangesController |
| Utkarsh (M4) | RKA | ReportsController, KPIsController, AuditPackagesController |
| Tanya (M5) | SFB | FeesController, InvoicesController, PaymentsController, ScholarshipsController |
| Swarna (M6) | NHT | NotificationsController, TicketsController |

---

## Connection String

`EduLearn.API/appsettings.json`:
```json
"ConnectionStrings": {
  "DefaultConnection": "Server=(localdb)\\MSSQLLocalDB;Database=EduLearnDb;Trusted_Connection=true;TrustServerCertificate=true;MultipleActiveResultSets=true"
}
```

---

## Git Conventions

- Branches: `feature/<desc>`, `fix/<desc>`, `chore/<desc>`
- Commits: `feat:`, `fix:`, `chore:`, `docs:`
- Never push directly to `main`
