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
using static System.Runtime.InteropServices.JavaScript.JSType;


//initializes  configuration, logging, and dependency injection container
var builder = WebApplication.CreateBuilder(args);

//UserRole{Admin,User} is will send 0 or 1
builder.Services.AddControllers()
    .AddJsonOptions(options =>
        options.JsonSerializerOptions.Converters.Add(
            new System.Text.Json.Serialization.JsonStringEnumConverter()));//convert Enum into  number

//Swagger + JWT lock icon
builder.Services.AddEndpointsApiExplorer();//Find all routrs(get,post..)
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


//.AllowAnyOrigin(): Any website(Google, a malicious site, or your own frontend) can call your API.
//.AllowAnyHeader(): Allows the request to include any custom headers (like Authorization or Content-Type).
//.AllowAnyMethod(): Allows any HTTP verb (GET, POST, PUT, DELETE, etc.).
builder.Services.AddCors(options =>
    options.AddDefaultPolicy(policy =>
        policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod()));

// Database
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

//All 13 Repositories
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
builder.Services.AddScoped<PrerequisiteEngine>();  // CCM-03: prerequisite check service


builder.Services.AddScoped<IAuditLogRepository, AuditLogRepository>();
builder.Services.AddScoped<TokenService>();
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<AuditLogService>();
builder.Services.AddScoped<INotificationService, NotificationService>();

//JWT Authentication
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
            //Custom 401 response
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

//Role-based Authorization Policies//Stratagy
builder.Services.AddAuthorization(options =>
{
    //logged-in all 7 roles
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
        "ITAdmin", "Registrar"));

    options.AddPolicy("AuditViewPolicy", p => p.RequireRole(
        "Auditor", "ITAdmin"));

    options.AddPolicy("SupportStaffPolicy", p => p.RequireRole("ITAdmin"));

    options.AddPolicy("FinancePolicy", p => p.RequireRole("Finance", "ITAdmin"));

    options.AddPolicy("DeptAdminPolicy", p => p.RequireRole("DeptAdmin", "ITAdmin"));

    options.FallbackPolicy = new Microsoft.AspNetCore.Authorization.AuthorizationPolicyBuilder()
        .RequireAuthenticatedUser()
        .Build();
});

var app = builder.Build();

// Seed the default ITAdmin ('admin' / 'Admin@123') so the API can be demoed
await EduLearn.API.Data.DbInitializer.SeedDefaultAdminAsync(app.Services);

//Swagger UI
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


//display enums as STRING values instead of numeric values
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
