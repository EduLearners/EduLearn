// ============================================================
// Program.cs — Application Entry Point
//
// AUTH CHANGES:
//   - JWT Bearer authentication + custom 401/403 responses
//   - 7 role-based authorization policies
//   - Swagger 🔒 Authorize button
//
// AUDIT CHANGES:
//   - Added: IAuditLogRepository + AuditLogRepository DI registration
//   - Added: AuditLogService DI registration
//   - Added: AuditViewPolicy for Auditor + ITAdmin
//
// KEPT UNCHANGED: All 13 existing repos, EnumSchemaFilter, DbContext, CORS
// ============================================================

using System.Security.Claims;
using System.Text;
using System.Text.Json;
using EduLearn.API.Data;
using EduLearn.API.Repositories.Implementations;
using EduLearn.API.Repositories.Interfaces;
using EduLearn.API.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;
using Swashbuckle.AspNetCore.SwaggerGen;

var builder = WebApplication.CreateBuilder(args);

// [EXISTING] JSON enum serialization
builder.Services.AddControllers()
    .AddJsonOptions(options =>
        options.JsonSerializerOptions.Converters.Add(
            new System.Text.Json.Serialization.JsonStringEnumConverter()));

// [EXISTING] Swagger + JWT lock icon
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.UseInlineDefinitionsForEnums();
    options.SchemaFilter<EnumSchemaFilter>();

    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Paste your JWT token here (from /api/auth/login response)"
    });

    options.AddSecurityRequirement(doc => new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecuritySchemeReference("Bearer", doc),
            new List<string>()
        }
    });
});

// [EXISTING] CORS
builder.Services.AddCors(options =>
    options.AddDefaultPolicy(policy =>
        policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod()));

// [EXISTING] Database
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// [EXISTING] All 13 Repositories
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<ICourseRepository, CourseRepository>();
builder.Services.AddScoped<IEnrollmentRepository, EnrollmentRepository>();
builder.Services.AddScoped<IStudentRepository, StudentRepository>();
builder.Services.AddScoped<IApplicantRepository, ApplicantRepository>();
builder.Services.AddScoped<IRoomRepository, RoomRepository>();
builder.Services.AddScoped<IAssessmentRepository, AssessmentRepository>();
builder.Services.AddScoped<ISubmissionRepository, SubmissionRepository>();
builder.Services.AddScoped<IPaymentRepository, PaymentRepository>();
builder.Services.AddScoped<INotificationRepository, NotificationRepository>();
builder.Services.AddScoped<IContentRepository, ContentRepository>();
builder.Services.AddScoped<ISectionRepository, SectionRepository>();
builder.Services.AddScoped<IInvoiceRepository, InvoiceRepository>();
builder.Services.AddScoped<ITranscriptRepository, TranscriptRepository>();
builder.Services.AddScoped<IDiscussionRepository, DiscussionRepository>();
builder.Services.AddScoped<IProgramRepository, ProgramRepository>();
builder.Services.AddScoped<IReportRepository, ReportRepository>();
builder.Services.AddScoped<IFeeScheduleRepository, FeeScheduleRepository>();
builder.Services.AddScoped<IScholarshipRepository, ScholarshipRepository>();

// NHT CHANGE (NHT-03): Ticket repository.
builder.Services.AddScoped<ITicketRepository, TicketRepository>();

// AUDIT CHANGE: Register audit log repository (append-only: create + read, no update/delete)
builder.Services.AddScoped<IAuditLogRepository, AuditLogRepository>();

// [EXISTING] Auth services
builder.Services.AddScoped<TokenService>();
builder.Services.AddScoped<AuthService>();

// AUDIT CHANGE: Register AuditLogService — all teammates inject this to log actions
builder.Services.AddScoped<AuditLogService>();

// NHT CHANGE (NHT-01, 2026-04-20 restructure): persist-only REST notification service.
// SignalR removed — out of syllabus. React polls /api/notifications + /unread-count.
builder.Services.AddScoped<INotificationService, NotificationService>();

// [EXISTING] JWT Authentication
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]!)),
            ClockSkew = TimeSpan.Zero
        };

        options.Events = new JwtBearerEvents
        {
            // Custom 401 response
            OnChallenge = async context =>
            {
                context.HandleResponse();
                context.Response.StatusCode = 401;
                context.Response.ContentType = "application/json";

                var endpoint = $"{context.Request.Method} {context.Request.Path}";
                var errorMessage = "Authentication required. Please login at POST /api/auth/login to get a JWT token.";

                if (!string.IsNullOrEmpty(context.ErrorDescription) &&
                    context.ErrorDescription.Contains("expired"))
                {
                    errorMessage = "Your JWT token has expired. Please login again at POST /api/auth/login to get a new token.";
                }

                var response = new
                {
                    error = errorMessage,
                    endpoint = endpoint,
                    statusCode = 401,
                    timestamp = DateTime.UtcNow
                };

                await context.Response.WriteAsync(JsonSerializer.Serialize(response));
            },

            // Custom 403 response
            OnForbidden = async context =>
            {
                context.Response.StatusCode = 403;
                context.Response.ContentType = "application/json";

                var userRole = context.Principal?.FindFirst(ClaimTypes.Role)?.Value ?? "Unknown";
                var endpoint = $"{context.Request.Method} {context.Request.Path}";

                var response = new
                {
                    error = $"User role '{userRole}' is not allowed to access '{endpoint}'",
                    role = userRole,
                    endpoint = endpoint,
                    statusCode = 403,
                    timestamp = DateTime.UtcNow
                };

                await context.Response.WriteAsync(JsonSerializer.Serialize(response));
            }
        };
    });

// [EXISTING] + [AUDIT CHANGE] Role-based Authorization Policies
builder.Services.AddAuthorization(options =>
{
    // Any logged-in user (all 7 roles)
    options.AddPolicy("AllUsersPolicy", p => p.RequireRole(
        "Student", "Instructor", "Registrar", "DeptAdmin", "Finance", "ITAdmin", "Auditor"));

    // Instructor, DeptAdmin, ITAdmin — create/update courses
    options.AddPolicy("CourseManagerPolicy", p => p.RequireRole(
        "Instructor", "DeptAdmin", "ITAdmin"));

    // Student, Registrar, ITAdmin — enroll/drop
    options.AddPolicy("EnrollmentPolicy", p => p.RequireRole(
        "Student", "Registrar", "ITAdmin"));

    // Instructor, Registrar, DeptAdmin, ITAdmin — view section roster
    options.AddPolicy("RosterViewPolicy", p => p.RequireRole(
        "Instructor", "Registrar", "DeptAdmin", "ITAdmin"));

    // Student, Instructor, Registrar, ITAdmin — view enrollment lists
    options.AddPolicy("EnrollmentViewPolicy", p => p.RequireRole(
        "Student", "Instructor", "Registrar", "ITAdmin"));

    // ITAdmin only — full admin access
    options.AddPolicy("AdminPolicy", p => p.RequireRole("ITAdmin"));

    // ITAdmin + Registrar — view user list
    options.AddPolicy("UserViewPolicy", p => p.RequireRole(
        "ITAdmin", "Registrar"));

    // AUDIT CHANGE: Auditor + ITAdmin — view audit logs (PRD Section 6.1)
    options.AddPolicy("AuditViewPolicy", p => p.RequireRole(
        "Auditor", "ITAdmin"));

    // NHT CHANGE (NHT-03): Ticket assign/resolve — ITAdmin only today. If a SupportStaff
    // role is added later, widen here without touching controllers. Kept separate from
    // AdminPolicy to avoid broadening that policy's scope.
    options.AddPolicy("SupportStaffPolicy", p => p.RequireRole("ITAdmin"));

    // HARDENING (C-1): Finance + ITAdmin — mutate SFB resources (fees, invoices, payments, scholarships)
    options.AddPolicy("FinancePolicy", p => p.RequireRole("Finance", "ITAdmin"));

    // HARDENING (C-6, C-10): DeptAdmin + ITAdmin — manage degree programs and rooms
    options.AddPolicy("DeptAdminPolicy", p => p.RequireRole("DeptAdmin", "ITAdmin"));

    // HARDENING (C-25): FallbackPolicy — any endpoint without an explicit authorization
    // attribute defaults to requiring authentication. Prevents accidental anonymous exposure
    // if a future controller forgets [Authorize]. Endpoints that must remain anonymous
    // (AuthController.Register/Login, HealthController if public) must use [AllowAnonymous].
    options.FallbackPolicy = new Microsoft.AspNetCore.Authorization.AuthorizationPolicyBuilder()
        .RequireAuthenticatedUser()
        .Build();
});

var app = builder.Build();

// [EXISTING] Swagger UI
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();

// [EXISTING] EnumSchemaFilter — no changes
public class EnumSchemaFilter : ISchemaFilter
{
    public void Apply(IOpenApiSchema schema, SchemaFilterContext context)
    {
        if (context.Type.IsEnum && schema is OpenApiSchema openApiSchema)
        {
            openApiSchema.Enum ??= new List<System.Text.Json.Nodes.JsonNode>();
            openApiSchema.Enum.Clear();
            foreach (var name in Enum.GetNames(context.Type))
                openApiSchema.Enum.Add(System.Text.Json.Nodes.JsonValue.Create(name)!);
            openApiSchema.Type = JsonSchemaType.String;
            openApiSchema.Format = null;
        }
    }
}
