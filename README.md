# EduLearn

**University Learning Management & Student Information System**

Monolithic REST API • Repository Pattern • 25 Entities • 9 Modules • 7 Roles • 30 Features

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

## Quick Start

### Prerequisites

Before you begin, make sure you have the following installed:

- [.NET 8.0 SDK](https://dotnet.microsoft.com/download/dotnet/8.0) — run `dotnet --version` to verify (should show `8.0.x`)
- [SQL Server LocalDB](https://learn.microsoft.com/en-us/sql/database-engine/configure-windows/sql-server-express-localdb) — comes with Visual Studio or can be installed separately
- [dotnet-ef global tool](https://learn.microsoft.com/en-us/ef/core/cli/dotnet) — install with `dotnet tool install --global dotnet-ef`
- [Git](https://git-scm.com/) — for version control

### Clone & Setup

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd EduLearn

# 2. Switch to the Development branch
git checkout Development

# 3. Restore NuGet packages
dotnet restore

# 4. Apply database migrations (creates EduLearnDb on LocalDB)
.\migrate-database.bat
# Or manually:
dotnet ef database update --project EduLearn.API --startup-project EduLearn.API

# 5. Run the API
dotnet run --project EduLearn.API

# 6. Open Swagger in your browser
# https://localhost:5001/swagger
```

### Verify Setup

After running the API, hit the health check endpoint:

```
GET https://localhost:5001/api/health
```

You should see:
```json
{
  "status": "Healthy",
  "service": "EduLearn.API",
  "version": "11.0",
  "database": { "status": "Healthy", "name": "EduLearnDb" }
}
```

**Reset DB (if needed):**
```sql
USE master;
ALTER DATABASE EduLearnDb SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
DROP DATABASE EduLearnDb;
```
Then re-run `.\migrate-database.bat`.

---

## Project Structure

```
EduLearn/
├── EduLearn.slnx                    # Solution file
├── EduLearn.API/                    # Single monolithic API project
│   ├── Controllers/                 # One file per resource (10 active controllers)
│   ├── Data/
│   │   └── AppDbContext.cs          # All 25 DbSets, FK configs, HasConversion calls
│   ├── DTOs/                        # Request and response DTOs per controller
│   ├── Models/                      # 25 entity classes
│   │   └── Enums/                   # 10 enum files
│   ├── Repositories/
│   │   ├── Interfaces/              # 16 IXxxRepository interfaces
│   │   └── Implementations/         # 16 XxxRepository classes
│   ├── Migrations/                  # EF Core generated migrations
│   ├── Program.cs                   # DI, Swagger, CORS, JsonStringEnumConverter
│   ├── appsettings.json             # Connection string, logging config
│   └── appsettings.Development.json # Dev overrides
├── docs/
│   ├── ARCHITECTURE-REFERENCE.md    # Full entity table, endpoint map, module ownership
│   └── EduLearn-PRD-v1.0.2.doc      # Product Requirements Document
├── add-migrations.bat               # Shortcut: dotnet ef migrations add <n>
├── migrate-database.bat             # Shortcut: dotnet ef database update
└── README.md                        # This file
```

Data flow: `Controller → IRepository → Repository → AppDbContext → SQL Server`

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Backend | ASP.NET Core | 8.0 LTS |
| ORM | Entity Framework Core | 8.0 |
| Database | SQL Server (LocalDB) | 2022 |
| Pattern | Repository Pattern | 16 interface + implementation pairs |
| API Docs | Swagger (Swashbuckle) | 6.6.2 |
| Frontend | React + TypeScript | 18 (planned) |

---

## Database

- **Database Name:** EduLearnDb
- **Server:** `(localdb)\MSSQLLocalDB`
- **Connection String:** See `appsettings.json`
- **Total Tables:** 25
- **All FKs:** `DeleteBehavior.NoAction`
- **All Enums:** Stored as `nvarchar` strings via `HasConversion<string>()`
- **Unique Indexes:** Users.Username, Users.Email, Students.UserID, Students.MRN, Courses.Code

### Migration Commands

```bash
# Generate a new migration after model changes
.\add-migrations.bat <MigrationName>
# Or: dotnet ef migrations add <n> --project EduLearn.API --startup-project EduLearn.API

# Apply pending migrations to the database
.\migrate-database.bat
# Or: dotnet ef database update --project EduLearn.API --startup-project EduLearn.API
```

### Entities by Owner

| Owner | Entities |
|---|---|
| Ashish (IAM) | User, AuditLog |
| Saurav (SRA+ETS) | Student, Applicant, Transcript, Section, Enrollment, Room |
| Vikash (CCM+LMS+AGI) | Course, Program, Syllabus, Content, Discussion, Assessment, Submission, GradeChange |
| Utkarsh (RKA) | Report, KPI, AuditPackage |
| Tanya (SFB) | FeeSchedule, Invoice, Payment, Scholarship |
| Swarna (NHT) | Notification, Ticket |

---

## Team & Module Ownership

| Member | Name | Modules | Features | Entities |
|---|---|---|---|---|
| M1 | Ashish | IAM | IAM-01 to IAM-04 | User, AuditLog |
| M2 | Saurav | SRA + ETS | SRA-01 to SRA-03, ETS-01 to ETS-03 | Student, Applicant, Transcript, Section, Enrollment, Room |
| M3 | Vikash | CCM + LMS + AGI | CCM-01 to CCM-03, LMS-01 to LMS-02, AGI-01 to AGI-04 | Course, Program, Syllabus, Content, Discussion, Assessment, Submission, GradeChange |
| M4 | Utkarsh | RKA | RKA-01 to RKA-03 | Report, KPI, AuditPackage |
| M5 | Tanya | SFB | SFB-01 to SFB-04 | FeeSchedule, Invoice, Payment, Scholarship |
| M6 | Swarna | NHT | NHT-01 to NHT-03 | Notification, Ticket |

---

## Repositories

| Interface | Implementation | Entity | Owner |
|---|---|---|---|
| IUserRepository | UserRepository | User | Ashish |
| ICourseRepository | CourseRepository | Course | Vikash |
| IProgramRepository | ProgramRepository | Program | Vikash |
| IEnrollmentRepository | EnrollmentRepository | Enrollment | Saurav |
| IStudentRepository | StudentRepository | Student | Saurav |
| IApplicantRepository | ApplicantRepository | Applicant | Saurav |
| IRoomRepository | RoomRepository | Room | Saurav |
| ISectionRepository | SectionRepository | Section | Saurav |
| ITranscriptRepository | TranscriptRepository | Transcript | Saurav |
| IAssessmentRepository | AssessmentRepository | Assessment | Vikash |
| ISubmissionRepository | SubmissionRepository | Submission | Vikash |
| IContentRepository | ContentRepository | Content | Vikash |
| IDiscussionRepository | DiscussionRepository | Discussion | Vikash |
| IPaymentRepository | PaymentRepository | Payment | Tanya |
| IInvoiceRepository | InvoiceRepository | Invoice | Tanya |
| INotificationRepository | NotificationRepository | Notification | Swarna |

---

## Git Branching Strategy

```
main                          ← Production-ready code
└── Development               ← Integration branch (all features merge here)
    ├── IAM_Ashish             ← Ashish's feature branch
    ├── SRA_ETS_Saurav         ← Saurav's feature branch
    ├── CCM_Viksh              ← Vikash's CCM feature branch
    ├── AGI_Vikash             ← Vikash's AGI feature branch
    ├── SFB_Tanya              ← Tanya's feature branch
    ├── RKA_Utkarsh            ← Utkarsh's feature branch
    └── NHT_Swarna             ← Swarna's feature branch
```

### How to Work on Your Feature

```bash
# 1. Always start from latest Development
git checkout Development
git pull origin Development

# 2. Create your feature branch (or switch to existing one)
git checkout -b <ModuleCode>_<YourName>
# Example: git checkout -b SFB_Tanya

# 3. Do your work — add controllers, DTOs, update repositories, etc.

# 4. Stage, commit, and push
git add .
git commit -m "feat(<Module>): <short description of what you built>"
git push origin <your-branch-name>

# 5. When feature is complete, merge into Development
git checkout Development
git pull origin Development
git merge <your-branch-name>
git push origin Development
```

### Commit Message Format

```
feat(<Module>): <what you did>

Examples:
  feat(IAM): implement JWT login and register endpoints
  feat(SRA): add applicant intake and student CRUD
  feat(CCM): add Program CRUD with repository pattern
  feat(AGI): implement assessment creation and publish workflow
  feat(SFB): add fee schedule and invoice generation
  fix(ETS): fix waitlist auto-promote on enrollment drop
  docs: update README with setup instructions
```

---

## Currently Implemented Endpoints

### Health Check
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Database connectivity check |

### Users (IAM-02) — Ashish
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/users` | Create new user |
| GET | `/api/users` | List all users |
| GET | `/api/users/{id}` | Get user by ID |
| PUT | `/api/users/{id}` | Update user profile |
| PUT | `/api/users/{id}/status` | Activate/suspend/lock user |

### Courses (CCM-01) — Vikash
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/courses` | Create course in catalog |
| GET | `/api/courses` | List all courses |
| GET | `/api/courses/{id}` | Get course details |
| PUT | `/api/courses/{id}` | Update course |

### Programs (CCM-01) — Vikash
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/programs` | Create degree program |
| GET | `/api/programs` | List all programs |
| GET | `/api/programs/{id}` | Get program with curriculum |
| PUT | `/api/programs/{id}` | Update program |

### Assessments (AGI-01) — Vikash
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/assessments` | Create assessment (starts as Draft) |
| GET | `/api/assessments/course/{courseId}` | List assessments for course |
| PUT | `/api/assessments/{id}` | Update assessment (Draft only) |
| PUT | `/api/assessments/{id}/publish` | Publish or close assessment |

### Enrollments (ETS-01) — Saurav
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/enrollment/enroll` | Enroll in section (capacity + waitlist) |
| DELETE | `/api/enrollment/{id}/drop` | Drop enrollment (auto-promote waitlist) |
| GET | `/api/enrollment/student/{studentId}` | Student's enrollments |
| GET | `/api/enrollment/section/{sectionId}` | Section roster |

### Applicants (SRA-01) — Saurav
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/applicants` | Create applicant |
| GET | `/api/applicants` | List applicants |
| PUT | `/api/applicants/{id}/status` | Update application status |

### Students (SRA-02) — Saurav
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/students` | List students |
| GET | `/api/students/{id}` | Get student |
| PUT | `/api/students/{id}` | Update student |

### Sections (ETS-02) — Saurav
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/sections` | Create section |
| GET | `/api/sections/course/{courseId}/term/{term}` | Get sections by course & term |

### Rooms (ETS-02) — Saurav
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/rooms` | Create room |
| GET | `/api/rooms` | List rooms |

---

## Architecture Patterns

### Repository Pattern

All controllers use repository interfaces for data access (not AppDbContext directly). This enables unit testing with mocks and separates concerns.

```
Controller → IXxxRepository (interface) → XxxRepository (implementation) → AppDbContext → SQL Server
```

**Exception:** `EnrollmentsController` uses `IEnrollmentRepository.BeginTransactionAsync()` for transactional enrollment/drop operations. All data reads/writes still go through repositories.

**Exception:** `HealthController` uses `AppDbContext` directly for raw SQL health check — no entity involved.

### DTO Pattern

Every endpoint uses DTOs (Data Transfer Objects) for request and response shapes. Controllers never expose raw entity models to the API consumer.

- `CreateXxxDto` — POST request body (no ID, no Status)
- `UpdateXxxDto` — PUT request body (where different from Create)
- `XxxResponseDto` — Response shape (includes ID, Status, computed fields)

### Enum Serialization

All enums serialize as readable strings in JSON (not integers). This is configured in `Program.cs` with `JsonStringEnumConverter` and in Swagger with `EnumSchemaFilter`.

```json
{ "status": "Active" }     // ✅ What the API returns
{ "status": 0 }            // ❌ NOT this
```

---

## Key Deadlines

| Milestone | Date | Requirement |
|---|---|---|
| Interim | April 24, 2026 | ≥50% backend complete per team member |
| Final | June 16, 2026 | Full project + React frontend + Viva |

### Interim Checklist by Team Member

| Member | Must Complete by April 24 |
|---|---|
| Ashish | IAM-01 (Auth+JWT), IAM-02 (RBAC), IAM-04 (Audit Log) |
| Saurav | SRA-01 (Admissions), SRA-02 (Student CRUD), ETS-01 (Enrollment), ETS-02 (Sections) |
| Vikash | CCM-01 (Courses+Programs) ✅, AGI-01 (Assessments) ✅, LMS-01 (Content), AGI-02 (Submissions) |
| Utkarsh | RKA-01 (Reports), RKA-02 (KPI Dashboard) |
| Tanya | SFB-01 (Fee Schedules), SFB-02 (Invoices), SFB-03 (Payments) |
| Swarna | NHT-01 (Notifications+SignalR), NHT-03 (Tickets) |

---

## Important Notes for All Team Members

1. **Always pull Development before starting work** — avoid merge conflicts
2. **Follow the repository pattern** — inject `IXxxRepository` in controllers, not `AppDbContext`
3. **Use DTOs** — never return raw entity models from controllers
4. **Enums as strings** — use the existing enum types from `Models/Enums/`, don't use magic strings
5. **DeleteBehavior.NoAction** — all FK configurations must use this (already done in AppDbContext)
6. **Error response format** — always return `{ error: "message", code: "MACHINE_CODE" }` for errors
7. **No migration conflicts** — coordinate if your feature requires model/entity changes
8. **Check `docs/ARCHITECTURE-REFERENCE.md`** — contains the full endpoint map for all 30 features

---

## Documentation

| Document | Location | Description |
|---|---|---|
| PRD v1.0.2 | `docs/EduLearn-PRD-v1.0.2.doc` | Full product requirements with all 30 features |
| Architecture Reference | `docs/ARCHITECTURE-REFERENCE.md` | Entity table, endpoint map, module ownership |
| This README | `README.md` | Setup guide, branching strategy, current status |

---

*EduLearn v11.0 • Cognizant ADM DotNet FSE — React Stage • Program: INTDE26DFSR002 • March 2026*
