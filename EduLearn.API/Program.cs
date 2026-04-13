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
using Microsoft.OpenApi.Models;
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

    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
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

// AUDIT CHANGE: Register audit log repository (append-only: create + read, no update/delete)
builder.Services.AddScoped<IAuditLogRepository, AuditLogRepository>();

// [EXISTING] Auth services
builder.Services.AddScoped<TokenService>();
builder.Services.AddScoped<AuthService>();

// AUDIT CHANGE: Register AuditLogService — all teammates inject this to log actions
builder.Services.AddScoped<AuditLogService>();

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
    public void Apply(Microsoft.OpenApi.Models.OpenApiSchema schema, SchemaFilterContext context)
    {
        if (context.Type.IsEnum)
        {
            schema.Enum.Clear();
            foreach (var name in Enum.GetNames(context.Type))
                schema.Enum.Add(new Microsoft.OpenApi.Any.OpenApiString(name));
            schema.Type = "string";
            schema.Format = null;
        }
    }
}
