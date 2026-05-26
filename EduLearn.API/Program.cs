using System.Security.Claims;
using System.Text;
using System.Text.Json;
using EduLearn.API.Data;
using EduLearn.API.Middleware;
using EduLearn.API.Repositories.Implementations;
using EduLearn.API.Repositories.Interfaces;
using EduLearn.API.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;
using QuestPDF.Infrastructure;
using Swashbuckle.AspNetCore.SwaggerGen;
using static System.Runtime.InteropServices.JavaScript.JSType;

// SRA-03 + RKA: QuestPDF Community licence (free for open-source / educational projects)
QuestPDF.Settings.License = LicenseType.Community;

var builder = WebApplication.CreateBuilder(args);

// JSON enum serialization — enums sent as strings, not integers
builder.Services.AddControllers()
    .AddJsonOptions(options =>
        options.JsonSerializerOptions.Converters.Add(
            new System.Text.Json.Serialization.JsonStringEnumConverter()));

// Swagger + JWT lock icon
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.UseInlineDefinitionsForEnums();
    options.SchemaFilter<EnumSchemaFilter>();

    // Pull /// <summary> XML comments into Swagger UI so endpoints show
    // a brief description next to each route.
    var xmlFile = $"{System.Reflection.Assembly.GetExecutingAssembly().GetName().Name}.xml";
    var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
    if (File.Exists(xmlPath))
    {
        options.IncludeXmlComments(xmlPath);
    }

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

// CORS
builder.Services.AddCors(options =>
    options.AddDefaultPolicy(policy =>
        policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod()));

// Database
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// Repositories
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
builder.Services.AddScoped<ITicketRepository, TicketRepository>();
builder.Services.AddScoped<IGradeChangeRepository, GradeChangeRepository>();
builder.Services.AddScoped<ISyllabusRepository, SyllabusRepository>();
builder.Services.AddScoped<IPlagiarismRepository, PlagiarismRepository>();  // AGI-04
builder.Services.AddScoped<PrerequisiteEngine>();  // CCM-03: prerequisite check service
builder.Services.AddScoped<TimetableConflictService>();  // BUG-3 FIX: shared schedule conflict detection (ETS-01 + ETS-03)


builder.Services.AddScoped<IAuditLogRepository, AuditLogRepository>();

// Services
builder.Services.AddScoped<TokenService>();
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<AuditLogService>();
builder.Services.AddScoped<INotificationService, NotificationService>();
builder.Services.AddScoped<PdfGeneratorService>();
// MFA CHANGE (IAM-03): TOTP helper (RFC 6238) used by AuthService for setup/verify
builder.Services.AddScoped<MfaService>();
builder.Services.AddScoped<EmailService>();

// JWT Authentication
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
                Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Secret"]!)),
            ClockSkew = TimeSpan.Zero
        };

        options.Events = new JwtBearerEvents
        {
            // MFA CHANGE (IAM-03): A token carrying a 'purpose' claim is short-lived and
            // scoped to a specific flow (currently only mfa_pending for the /api/auth/mfa/*
            // endpoints). Reject it on any other path so a leaked challenge token cannot be
            // used as a session token. The two MFA endpoints accept it via inline check
            // inside AuthController; everything else fails closed here.
            OnTokenValidated = context =>
            {
                var purposeClaim = context.Principal?.FindFirst("purpose")?.Value;
                if (!string.IsNullOrEmpty(purposeClaim))
                {
                    var path = context.Request.Path.Value ?? string.Empty;
                    if (!path.StartsWith("/api/auth/mfa/", StringComparison.OrdinalIgnoreCase))
                    {
                        context.Fail("Purpose-scoped token cannot be used on this endpoint.");
                    }
                }
                return Task.CompletedTask;
            },

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

// Role-based Authorization Policies
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AllUsersPolicy", p => p.RequireRole(
        "Student", "Instructor", "Registrar", "DeptAdmin", "Finance", "ITAdmin", "Auditor"));

    options.AddPolicy("CourseManagerPolicy", p => p.RequireRole(
        "Instructor", "DeptAdmin", "ITAdmin"));

    options.AddPolicy("EnrollmentPolicy", p => p.RequireRole(
        "Student", "Registrar", "ITAdmin"));

    options.AddPolicy("RosterViewPolicy", p => p.RequireRole(
        "Instructor", "Registrar", "DeptAdmin", "ITAdmin"));

    options.AddPolicy("EnrollmentViewPolicy", p => p.RequireRole(
        "Student", "Instructor", "Registrar", "ITAdmin"));

    options.AddPolicy("AdminPolicy", p => p.RequireRole("ITAdmin"));

    options.AddPolicy("UserViewPolicy", p => p.RequireRole(
        "ITAdmin", "Registrar", "DeptAdmin"));

    options.AddPolicy("AuditViewPolicy", p => p.RequireRole(
        "Auditor", "ITAdmin"));

    // Ticket assign/resolve — ITAdmin only
    options.AddPolicy("SupportStaffPolicy", p => p.RequireRole("ITAdmin"));

    // Finance + ITAdmin — mutate SFB resources
    options.AddPolicy("FinancePolicy", p => p.RequireRole("Finance", "ITAdmin"));

    // DeptAdmin + ITAdmin — manage programs and rooms
    options.AddPolicy("DeptAdminPolicy", p => p.RequireRole("DeptAdmin", "ITAdmin"));

    // Registrar + ITAdmin — view/issue transcripts (phase4-fix-8)
    options.AddPolicy("TranscriptViewPolicy", p => p.RequireRole("Registrar", "ITAdmin"));

    // Read-only variants that restore Student access (C-1, C-2)
    options.AddPolicy("FinanceReadPolicy", p => p.RequireRole("Finance", "ITAdmin", "Student"));
    options.AddPolicy("SubmissionReadPolicy", p => p.RequireRole("Instructor", "Registrar", "ITAdmin", "Student"));
    options.AddPolicy("TranscriptReadPolicy", p => p.RequireRole("Registrar", "ITAdmin", "Student"));

    // FallbackPolicy: bare [Authorize] requires any authenticated user.
    // AuthController.Register/Login must use [AllowAnonymous].
    options.FallbackPolicy = new Microsoft.AspNetCore.Authorization.AuthorizationPolicyBuilder()
        .RequireAuthenticatedUser()
        .Build();
});

var app = builder.Build();

// Seed the default ITAdmin ('admin' / 'Admin@123') so the API can be demoed
await EduLearn.API.Data.DbInitializer.SeedDefaultAdminAsync(app.Services);

// Global exception handler — must be first in pipeline to wrap everything below
app.UseMiddleware<GlobalExceptionMiddleware>();

// Swagger UI
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

// Display enums as string values (names) instead of numeric values in Swagger
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
