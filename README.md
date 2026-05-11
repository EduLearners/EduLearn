# EduLearn

**University Learning Management & Student Information System**

Monolithic REST API • Repository Pattern • 25 Entities • 9 Modules • 7 Roles • 32 Features

| Attribute | Value |
|---|---|
| Team Size | 6 Developers |
| Timeline | 12 Weeks (Mar 25 – Jun 16, 2026) |
| Architecture | Monolithic REST API with Repository Pattern |
| Backend | ASP.NET Core 8.0 + EF Core 8.0 |
| Database | SQL Server LocalDB — 25 Entities — Single AppDbContext |
| Authentication | JWT Bearer + BCrypt + 8 Role-Based Policies |
| Interim Milestone | April 24, 2026 |
| Final Deadline | June 16, 2026 |
| Program | Cognizant ADM DotNet FSE — INTDE26DFSR002 |

---

## Quick Start

### Prerequisites

- [.NET 8.0 SDK](https://dotnet.microsoft.com/download/dotnet/8.0) — run `dotnet --version` to verify
- [SQL Server LocalDB](https://learn.microsoft.com/en-us/sql/database-engine/configure-windows/sql-server-express-localdb) — included with Visual Studio
- [dotnet-ef global tool](https://learn.microsoft.com/en-us/ef/core/cli/dotnet) — install with `dotnet tool install --global dotnet-ef`
- [Git](https://git-scm.com/)

### Setup & Run

```bash
# 1. Clone the repository
git clone https://github.com/EduLearners/EduLearn.git
cd EduLearn

# 2. Switch to the Development branch
git checkout Development

# 3. Restore NuGet packages
dotnet restore

# 4. Apply database migrations
.\migrate-database.bat
# Or: dotnet ef database update --project EduLearn.API --startup-project EduLearn.API

# 5. Run the API
dotnet run --project EduLearn.API

# 6. Open Swagger
# https://localhost:5001/swagger
```

### Verify Setup

```
GET https://localhost:5001/api/health
```
Expected response:
```json
{
  "status": "Healthy",
  "service": "EduLearn.API",
  "version": "11.0",
  "database": { "status": "Healthy", "name": "EduLearnDb" }
}
```

### Authentication Flow

All endpoints (except `/api/auth/*` and `/api/health`) require JWT authentication:

1. Register: `POST /api/auth/register` with username, password, email, role
2. Login: `POST /api/auth/login` with username + password → returns JWT token
3. In Swagger, click the 🔒 **Authorize** button → paste the token
4. Access protected endpoints based on your role

---

## Project Structure

```
EduLearn/
├── EduLearn.slnx                        # Solution file
├── EduLearn.API/                        # Single monolithic API project
│   ├── Controllers/                     # 23 controllers (one per resource)
│   ├── Data/
│   │   └── AppDbContext.cs              # All 25 DbSets, FK configs, HasConversion
│   ├── DTOs/                            # 50+ request/response DTOs
│   ├── Models/                          # 25 entity classes
│   │   └── Enums/                       # 10 enum files
│   ├── Repositories/
│   │   ├── Interfaces/                  # 20 IXxxRepository interfaces
│   │   └── Implementations/             # 20 XxxRepository classes
│   ├── Services/                        # Business logic (TokenService, AuthService, AuditLogService, NotificationService)
│   ├── Migrations/                      # EF Core generated migrations
│   ├── Program.cs                       # DI, JWT Auth, Swagger, CORS, Policies
│   ├── appsettings.json                 # Connection string, JWT config
│   └── appsettings.Development.json     # Dev overrides
├── docs/                                # PRD, architecture reference, code-review verification
├── tests/smoke/                         # Bash smoke suite (205 PASS · 0 FAIL; run-all.sh)
├── add-migrations.bat                   # Shortcut: dotnet ef migrations add
├── migrate-database.bat                 # Shortcut: dotnet ef database update
└── README.md                            # This file
```

---

## Tech Stack

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| Backend | ASP.NET Core | 8.0 LTS | Monolithic REST API |
| ORM | Entity Framework Core | 8.0 | Code-first migrations, LINQ queries |
| Database | SQL Server (LocalDB) | 2022 | 25 entity tables, ACID compliant |
| Auth | JWT Bearer + BCrypt | 8.0.11 / 4.0.3 | Stateless JWT (60 min), password hashing |
| Pattern | Repository Pattern | — | 20 interface + implementation pairs |
| API Docs | Swagger (Swashbuckle) | 10.1.7 | Interactive API explorer with JWT support |

---

## Database

| Property | Value |
|---|---|
| Name | EduLearnDb |
| Server | `(localdb)\MSSQLLocalDB` |
| Tables | 25 |
| FK Strategy | `DeleteBehavior.NoAction` on all FKs |
| Enum Storage | `nvarchar` strings via `HasConversion<string>()` |
| Unique Indexes | Users.Username, Users.Email, Students.UserID, Students.MRN, Courses.Code, Enrollments(StudentID+SectionID) |

### Migration Commands

```bash
# Generate a new migration
.\add-migrations.bat <MigrationName>

# Apply pending migrations
.\migrate-database.bat
```

---

## Team & Module Ownership

| Member | Name | Modules | Features | Entities |
|---|---|---|---|---|
| M1 | Ashish | IAM | IAM-01 to IAM-04 | User, AuditLog |
| M2 | Saurav | SRA + ETS | SRA-01 to SRA-03, ETS-01 to ETS-03 | Student, Applicant, Transcript, Section, Enrollment, Room |
| M3 | Vikash | CCM + LMS + AGI | CCM-01 to CCM-03, LMS-01 to LMS-02, AGI-01 to AGI-04 | Course, Program, Syllabus, Content, Discussion, Assessment, Submission, GradeChange |
| M4 | Utkarsh | RKA | RKA-01 to RKA-03 | Report, KPI, AuditPackage |
| M5 | Tanya | SFB | SFB-01 to SFB-04 | FeeSchedule, Invoice, Payment, Scholarship |
| M6 | Priyanshu | NHT | NHT-01 to NHT-02 | Notification, Ticket |

---

## Currently Implemented Endpoints (65+)

### Authentication (IAM-01) — Open (no JWT required)
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register new user (BCrypt hashed) |
| POST | `/api/auth/login` | Login → returns JWT token |

### Users (IAM-02) — Secured
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/users` | Create user |
| GET | `/api/users` | List all users |
| GET | `/api/users/{id}` | Get user by ID |
| PUT | `/api/users/{id}` | Update user profile |
| PUT | `/api/users/{id}/status` | Activate/suspend/lock |

### Audit Log (IAM-04) — Secured (Auditor + ITAdmin)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/audit-log` | Query audit trail (filters: userId, action, resourceType, dateRange) |

### Applicants (SRA-01) — Secured
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/applicants` | Submit application |
| GET | `/api/applicants` | List applicants |
| GET | `/api/applicants/{id}` | Get applicant |
| PUT | `/api/applicants/{id}/status` | Accept/reject/waitlist |

### Students (SRA-02) — Secured
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/students` | Create student record |
| GET | `/api/students` | List students |
| GET | `/api/students/{id}` | Get student |
| PUT | `/api/students/{id}` | Update student |

### Courses (CCM-01) — Secured
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/courses` | Create course |
| GET | `/api/courses` | List courses |
| GET | `/api/courses/{id}` | Get course |
| PUT | `/api/courses/{id}` | Update course |

### Programs (CCM-01) — Secured
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/programs` | Create degree program |
| GET | `/api/programs` | List programs |
| GET | `/api/programs/{id}` | Get program |
| PUT | `/api/programs/{id}` | Update program |

### Sections (ETS-02) — Secured
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/sections` | Create section |
| GET | `/api/sections/{id}` | Get section |
| GET | `/api/sections/course/{courseId}/term/{term}` | Sections by course + term |

### Rooms (ETS-02) — Secured
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/rooms` | Create room |
| GET | `/api/rooms` | List rooms |
| GET | `/api/rooms/{id}` | Get room |

### Enrollments (ETS-01) — Secured
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/enrollment/enroll` | Enroll (capacity + waitlist) |
| DELETE | `/api/enrollment/{id}/drop` | Drop (auto-promote waitlist) |
| GET | `/api/enrollment/student/{studentId}` | Student's enrollments |
| GET | `/api/enrollment/section/{sectionId}` | Section roster |

### Assessments (AGI-01) — Secured
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/assessments` | Create assessment (Draft) |
| GET | `/api/assessments/course/{courseId}` | List by course |
| PUT | `/api/assessments/{id}` | Update (Draft only) |
| PUT | `/api/assessments/{id}/publish` | Publish/close |

### Submissions & Grading (AGI-02) — Secured
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/submissions` | Submit work |
| GET | `/api/submissions/assessment/{assessmentId}` | List by assessment |
| POST | `/api/submissions/{id}/grade` | Grade submission |
| GET | `/api/submissions/student/{studentId}` | Student's submissions |

### Content (LMS-01) — Secured
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/content/upload` | Upload learning material |
| GET | `/api/content/course/{courseId}` | List course content |
| GET | `/api/content/{id}` | Get content item |
| PUT | `/api/content/{id}/version` | Upload new version |

### Fee Schedules (SFB-01) — Secured
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/fees` | Create fee schedule |
| GET | `/api/fees/program/{programId}/term/{term}` | Get fee schedule |
| PUT | `/api/fees/{id}` | Update fee schedule |

### Invoices (SFB-02) — Secured
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/invoices/generate` | Generate invoice |
| GET | `/api/invoices/student/{studentId}` | Student's invoices |
| GET | `/api/invoices/{id}` | Get invoice |

### Payments (SFB-03) — Secured
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/payments` | Record payment |
| GET | `/api/payments/invoice/{invoiceId}` | Payments for invoice |

### Scholarships (SFB-04) — Secured
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/scholarships` | Award scholarship |
| GET | `/api/scholarships/student/{studentId}` | Student's scholarships |
| PUT | `/api/scholarships/{id}` | Update/revoke |

### Reports (RKA-01) — Secured
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/reports/generate` | Generate report |
| GET | `/api/reports` | List reports |
| GET | `/api/reports/{id}/download` | Download report |

### KPIs (RKA-02) — Secured (recalculate/seed: ITAdmin + Auditor)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/kpis` | List KPI values |
| POST | `/api/kpis/recalculate` | Recalculate all KPIs |
| POST | `/api/kpis/seed` | Seed default KPI definitions |

### Audit Packages (RKA-03) — Secured (Auditor + ITAdmin)
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/audit-packages/generate` | Generate audit package |
| GET | `/api/audit-packages/{id}/download` | Download package |

### Notifications (NHT-01) — Secured
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/notifications` | Create notification (cross-module producers) |
| GET | `/api/notifications/user/{userId}` | Get notifications for user |
| PUT | `/api/notifications/{id}/read` | Mark as read |
| GET | `/api/notifications/user/{userId}/unread-count` | Unread count |

### Helpdesk Tickets (NHT-02) — Secured
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/tickets` | Submit support ticket |
| GET | `/api/tickets` | List tickets (ITAdmin: all; Student: own) |
| GET | `/api/tickets/{id}` | Get ticket |
| PUT | `/api/tickets/{id}/assign` | Assign ticket (ITAdmin) |
| PUT | `/api/tickets/{id}/resolve` | Resolve ticket (ITAdmin) |

### Health Check — Open
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | API + database health check |

---

## Git Branching Strategy

```
main                              ← Production-ready code
└── Development                   ← Integration branch (all features merge here)
    ├── Auth_Ashish                ← IAM module (JWT, Auth, Audit Log)
    ├── Saurav                     ← SRA + ETS modules
    ├── AGI_Vikash                 ← CCM + LMS + AGI modules
    ├── CCM_Viksh                  ← Earlier CCM work
    ├── SFB_Tanya                  ← SFB module
    ├── RKA_Utkarsh                ← RKA module
    └── NHT_Priyanshu              ← NHT module (Notifications + Helpdesk)
```

### Workflow

```bash
# Start from latest Development
git checkout Development
git pull origin Development

# Create or switch to your branch
git checkout -b <ModuleCode>_<YourName>

# Work on your feature...

# Commit and push
git add .
git commit -m "feat(<Module>): <description>"
git push origin <your-branch>

# Merge into Development when ready
git checkout Development
git pull origin Development
git merge <your-branch>
git push origin Development
```

### Commit Message Format

```
feat(<Module>): <what you did>       ← New feature
fix(<Module>): <what you fixed>      ← Bug fix
docs: <what you updated>             ← Documentation
refactor(<Module>): <what changed>   ← Code restructure
```

---

## Architecture Patterns

### Repository Pattern
All controllers use repository interfaces — not AppDbContext directly. This enables testability and separation of concerns.
```
Controller → IXxxRepository → XxxRepository → AppDbContext → SQL Server
```

### JWT Authentication
Stateless JWT tokens with 60-minute expiry. 8 role-based authorization policies defined in Program.cs. Custom 401/403 JSON responses.

### DTO Pattern
Every endpoint uses DTOs. Controllers never expose raw entity models. `CreateXxxDto` for POST, `XxxResponseDto` for responses, `UpdateXxxDto` for PUT where different.

### Enum Serialization
All enums serialize as readable strings (`"Active"`, `"Published"`, `"Enrolled"`) — not integers. Configured via `JsonStringEnumConverter` in Program.cs.

---

## Important Notes for Team Members

1. **Always pull Development before starting work** — avoid merge conflicts
2. **All endpoints require JWT** — register → login → use token in Swagger 🔒
3. **Follow repository pattern** — inject `IXxxRepository`, not `AppDbContext`
4. **Use DTOs** — never return raw entity models from controllers
5. **Enums as strings** — use types from `Models/Enums/`, not magic strings
6. **Error format** — always return `{ error: "message", code: "MACHINE_CODE" }`
7. **Check `docs/ARCHITECTURE-REFERENCE.md`** — full endpoint map for all 30 features

---

## Key Deadlines

| Milestone | Date | Requirement |
|---|---|---|
| Interim | April 24, 2026 | ≥50% backend per team member |
| Final | June 16, 2026 | Full project + React frontend + Viva |

---

## Documentation

| Document | Location | Description |
|---|---|---|
| PRD v11.0 | `docs/EduLearnPRD-v11.0-Final.doc` | Full product requirements |
| Architecture Reference | `docs/ARCHITECTURE-REFERENCE.md` | Entity table, endpoint map, module ownership |
| PRD Discrepancies | `docs/PRD-DISCREPANCIES.md` | Tracked deviations from PRD with justifications |
| Code Review Verification | `docs/CODE-REVIEW-VERIFICATION.md` | Security findings + resolution status |
| Smoke Test Suite | `tests/smoke/README.md` | Prerequisites, run modes, troubleshooting |
| README | `README.md` | This file — setup, endpoints, branching |

---

*EduLearn v11.0 • Cognizant ADM DotNet FSE — React Stage • INTDE26DFSR002 • March 2026*
