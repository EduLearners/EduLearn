using EduLearn.API.Controllers;
using EduLearn.API.DTOs;
using EduLearn.API.Models;
using EduLearn.API.Models.Enums;
using EduLearn.API.Repositories.Interfaces;
using EduLearn.API.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Moq;

namespace EduLearn_Testing.Controller;

[TestFixture]
public class AuthControllerTest
{
    // ── Mock inner dependencies of AuthService ──
    private Mock<IUserRepository> _userRepoMock;
    private Mock<IAuditLogRepository> _auditLogRepoMock;
    private Mock<MfaService> _mfaServiceMock;

    // ── Real services (with mocked inner dependencies) ──
    private IConfiguration _config;
    private TokenService _tokenService;
    private AuditLogService _auditLogService;
    private AuthService _authService;

    // ── Controller under test ──
    private AuthController _controller;

    [SetUp]
    public void Setup()
    {
        _userRepoMock = new Mock<IUserRepository>();
        _auditLogRepoMock = new Mock<IAuditLogRepository>();
        _mfaServiceMock = new Mock<MfaService>();

        // Real IConfiguration with JWT settings — needed by TokenService
        var configData = new Dictionary<string, string?>
        {
            { "Jwt:Secret", "ThisIsA32CharSecretKeyForTesting!" },
            { "Jwt:Issuer", "EduLearn" },
            { "Jwt:Audience", "EduLearn-Client" },
            { "Jwt:AccessTokenExpiryMinutes", "60" }
        };
        _config = new ConfigurationBuilder()
            .AddInMemoryCollection(configData)
            .Build();

        // Real TokenService — generates actual JWT tokens
        _tokenService = new TokenService(_config);

        // Real AuditLogService with mocked repository
        _auditLogService = new AuditLogService(_auditLogRepoMock.Object);

        // Real AuthService with mocked IUserRepository + real Token + real AuditLog + mocked MFA
        _authService = new AuthService(
            _userRepoMock.Object,
            _tokenService,
            _config,
            _auditLogService,
            _mfaServiceMock.Object);

        // Controller with real AuthService
        _controller = new AuthController(_authService);
    }

    // ════════════════════════════════════════════════════════════════
    // POST /api/auth/register
    // ════════════════════════════════════════════════════════════════

    [Test]
    public async Task Register_ValidDto_Returns200()
    {
        // Arrange — no duplicate username or email
        _userRepoMock.Setup(r => r.GetByUsernameAsync("rahul.s"))
            .ReturnsAsync((User?)null);
        _userRepoMock.Setup(r => r.GetByEmailAsync("rahul@edulearn.com"))
            .ReturnsAsync((User?)null);
        _userRepoMock.Setup(r => r.CreateAsync(It.IsAny<User>()))
            .ReturnsAsync((User u) => { u.UserID = 1; return u; });

        var dto = new RegisterDto
        {
            Username = "rahul.s",
            Email = "rahul@edulearn.com",
            Password = "Student@123",
            FullName = "Rahul Kumar",
            Phone = "+91-9876543211"
        };

        // Act
        var result = await _controller.Register(dto);

        // Assert
        var ok = result as OkObjectResult;
        Assert.That(ok, Is.Not.Null);
        Assert.That(ok!.StatusCode, Is.EqualTo(200));

        _userRepoMock.Verify(r => r.CreateAsync(It.IsAny<User>()), Times.Once);
    }

    [Test]
    public async Task Register_ForcesStudentRole_IgnoresBodyRole()
    {
        // Arrange — HARDENING C-26: even if someone passes ITAdmin in body, server forces Student
        _userRepoMock.Setup(r => r.GetByUsernameAsync("hacker"))
            .ReturnsAsync((User?)null);
        _userRepoMock.Setup(r => r.GetByEmailAsync("hacker@test.com"))
            .ReturnsAsync((User?)null);

        User? capturedUser = null;
        _userRepoMock.Setup(r => r.CreateAsync(It.IsAny<User>()))
            .Callback<User>(u => capturedUser = u)
            .ReturnsAsync((User u) => { u.UserID = 2; return u; });

        var dto = new RegisterDto
        {
            Username = "hacker",
            Email = "hacker@test.com",
            Password = "Hack@12345",
            FullName = "Hacker"
            // NOTE: RegisterDto has no Role field — AuthService always forces Student
        };

        // Act
        await _controller.Register(dto);

        // Assert — user was created with Student role regardless
        Assert.That(capturedUser, Is.Not.Null);
        Assert.That(capturedUser!.Role, Is.EqualTo(UserRole.Student));
    }

    [Test]
    public async Task Register_DuplicateUsername_Returns400()
    {
        // Arrange — username already exists
        _userRepoMock.Setup(r => r.GetByUsernameAsync("rahul.s"))
            .ReturnsAsync(new User
            {
                UserID = 1,
                Username = "rahul.s",
                Email = "existing@test.com",
                FullName = "Existing",
                PasswordHash = "hash",
                Role = UserRole.Student
            });

        var dto = new RegisterDto
        {
            Username = "rahul.s",
            Email = "new@test.com",
            Password = "Test@1234",
            FullName = "New User"
        };

        // Act
        var result = await _controller.Register(dto);

        // Assert
        var badRequest = result as BadRequestObjectResult;
        Assert.That(badRequest, Is.Not.Null);
        Assert.That(badRequest!.StatusCode, Is.EqualTo(400));

        _userRepoMock.Verify(r => r.CreateAsync(It.IsAny<User>()), Times.Never);
    }

    [Test]
    public async Task Register_DuplicateEmail_Returns400()
    {
        // Arrange — email already exists
        _userRepoMock.Setup(r => r.GetByUsernameAsync("newuser"))
            .ReturnsAsync((User?)null);
        _userRepoMock.Setup(r => r.GetByEmailAsync("existing@test.com"))
            .ReturnsAsync(new User
            {
                UserID = 1,
                Username = "existing",
                Email = "existing@test.com",
                FullName = "Existing",
                PasswordHash = "hash",
                Role = UserRole.Student
            });

        var dto = new RegisterDto
        {
            Username = "newuser",
            Email = "existing@test.com",
            Password = "Test@1234",
            FullName = "New User"
        };

        // Act
        var result = await _controller.Register(dto);

        // Assert
        var badRequest = result as BadRequestObjectResult;
        Assert.That(badRequest, Is.Not.Null);
        Assert.That(badRequest!.StatusCode, Is.EqualTo(400));

        _userRepoMock.Verify(r => r.CreateAsync(It.IsAny<User>()), Times.Never);
    }

    [Test]
    public async Task Register_PasswordIsHashedWithBCrypt()
    {
        // Arrange
        _userRepoMock.Setup(r => r.GetByUsernameAsync("testuser"))
            .ReturnsAsync((User?)null);
        _userRepoMock.Setup(r => r.GetByEmailAsync("test@test.com"))
            .ReturnsAsync((User?)null);

        User? capturedUser = null;
        _userRepoMock.Setup(r => r.CreateAsync(It.IsAny<User>()))
            .Callback<User>(u => capturedUser = u)
            .ReturnsAsync((User u) => { u.UserID = 3; return u; });

        var dto = new RegisterDto
        {
            Username = "testuser",
            Email = "test@test.com",
            Password = "MyPassword@123",
            FullName = "Test User"
        };

        // Act
        await _controller.Register(dto);

        // Assert — password stored is NOT plain text, it's a BCrypt hash
        Assert.That(capturedUser, Is.Not.Null);
        Assert.That(capturedUser!.PasswordHash, Is.Not.EqualTo("MyPassword@123"));
        Assert.That(capturedUser.PasswordHash, Does.StartWith("$2")); // BCrypt hash prefix
        Assert.That(BCrypt.Net.BCrypt.Verify("MyPassword@123", capturedUser.PasswordHash), Is.True);
    }

    // ════════════════════════════════════════════════════════════════
    // POST /api/auth/login
    // ════════════════════════════════════════════════════════════════

    [Test]
    public async Task Login_ValidCredentials_StudentRole_ReturnsJWT()
    {
        // Arrange — Student role gets full JWT (no MFA)
        var hashedPassword = BCrypt.Net.BCrypt.HashPassword("Student@123");
        var user = new User
        {
            UserID = 1,
            Username = "rahul.s",
            Email = "rahul@edulearn.com",
            FullName = "Rahul Kumar",
            PasswordHash = hashedPassword,
            Role = UserRole.Student,
            Status = UserStatus.Active
        };
        _userRepoMock.Setup(r => r.GetByUsernameAsync("rahul.s")).ReturnsAsync(user);

        var dto = new LoginDto { Username = "rahul.s", Password = "Student@123" };

        // Act
        var result = await _controller.Login(dto);

        // Assert — returns full JWT (AuthResponseDto shape)
        var ok = result as OkObjectResult;
        Assert.That(ok, Is.Not.Null);
        Assert.That(ok!.StatusCode, Is.EqualTo(200));

        var response = ok.Value as AuthResponseDto;
        Assert.That(response, Is.Not.Null);
        Assert.That(response!.Token, Is.Not.Empty);
        Assert.That(response.Role, Is.EqualTo("Student"));
        Assert.That(response.Username, Is.EqualTo("rahul.s"));
    }

    [Test]
    public async Task Login_WrongPassword_Returns401()
    {
        // Arrange
        var hashedPassword = BCrypt.Net.BCrypt.HashPassword("CorrectPassword");
        var user = new User
        {
            UserID = 1,
            Username = "rahul.s",
            Email = "rahul@edulearn.com",
            FullName = "Rahul",
            PasswordHash = hashedPassword,
            Role = UserRole.Student,
            Status = UserStatus.Active
        };
        _userRepoMock.Setup(r => r.GetByUsernameAsync("rahul.s")).ReturnsAsync(user);

        var dto = new LoginDto { Username = "rahul.s", Password = "WrongPassword" };

        // Act
        var result = await _controller.Login(dto);

        // Assert
        var unauthorized = result as UnauthorizedObjectResult;
        Assert.That(unauthorized, Is.Not.Null);
        Assert.That(unauthorized!.StatusCode, Is.EqualTo(401));
    }

    [Test]
    public async Task Login_NonExistentUsername_Returns401()
    {
        // Arrange — user does not exist
        _userRepoMock.Setup(r => r.GetByUsernameAsync("ghost"))
            .ReturnsAsync((User?)null);

        var dto = new LoginDto { Username = "ghost", Password = "Test@123" };

        // Act
        var result = await _controller.Login(dto);

        // Assert
        var unauthorized = result as UnauthorizedObjectResult;
        Assert.That(unauthorized, Is.Not.Null);
        Assert.That(unauthorized!.StatusCode, Is.EqualTo(401));
    }

    [Test]
    public async Task Login_SuspendedAccount_Returns401()
    {
        // Arrange — user exists, password correct, but account is Suspended
        var hashedPassword = BCrypt.Net.BCrypt.HashPassword("Test@123");
        var user = new User
        {
            UserID = 5,
            Username = "suspended.user",
            Email = "suspended@test.com",
            FullName = "Suspended User",
            PasswordHash = hashedPassword,
            Role = UserRole.Student,
            Status = UserStatus.Suspended // NOT Active
        };
        _userRepoMock.Setup(r => r.GetByUsernameAsync("suspended.user")).ReturnsAsync(user);

        var dto = new LoginDto { Username = "suspended.user", Password = "Test@123" };

        // Act
        var result = await _controller.Login(dto);

        // Assert — even with correct password, Suspended account gets 401
        var unauthorized = result as UnauthorizedObjectResult;
        Assert.That(unauthorized, Is.Not.Null);
        Assert.That(unauthorized!.StatusCode, Is.EqualTo(401));
    }

    [Test]
    public async Task Login_PrivilegedRole_ReturnsMfaChallenge_NotFullJWT()
    {
        // Arrange — ITAdmin role triggers MFA challenge instead of full JWT
        var hashedPassword = BCrypt.Net.BCrypt.HashPassword("Admin@123");
        var user = new User
        {
            UserID = 10,
            Username = "admin",
            Email = "admin@edulearn.com",
            FullName = "Admin User",
            PasswordHash = hashedPassword,
            Role = UserRole.ITAdmin, // privileged role
            Status = UserStatus.Active,
            MFAEnabled = false
        };
        _userRepoMock.Setup(r => r.GetByUsernameAsync("admin")).ReturnsAsync(user);

        var dto = new LoginDto { Username = "admin", Password = "Admin@123" };

        // Act
        var result = await _controller.Login(dto);

        // Assert — returns MFA challenge, not full JWT
        var ok = result as OkObjectResult;
        Assert.That(ok, Is.Not.Null);

        var response = ok!.Value as MfaChallengeResponseDto;
        Assert.That(response, Is.Not.Null);
        Assert.That(response!.Purpose, Is.EqualTo("mfa_pending"));
        Assert.That(response.MfaToken, Is.Not.Empty);
        Assert.That(response.ExpiresIn, Is.EqualTo(300)); // 5 minutes
    }

    [Test]
    public async Task Login_InstructorRole_ReturnsFullJWT_NoMfa()
    {
        // Arrange — Instructor is NOT a privileged role, gets full JWT
        var hashedPassword = BCrypt.Net.BCrypt.HashPassword("Inst@123");
        var user = new User
        {
            UserID = 2,
            Username = "dr.priya",
            Email = "priya@edulearn.com",
            FullName = "Dr. Priya Sharma",
            PasswordHash = hashedPassword,
            Role = UserRole.Instructor, // not privileged
            Status = UserStatus.Active
        };
        _userRepoMock.Setup(r => r.GetByUsernameAsync("dr.priya")).ReturnsAsync(user);

        var dto = new LoginDto { Username = "dr.priya", Password = "Inst@123" };

        // Act
        var result = await _controller.Login(dto);

        // Assert — full JWT, not MFA challenge
        var ok = result as OkObjectResult;
        Assert.That(ok, Is.Not.Null);

        var response = ok!.Value as AuthResponseDto;
        Assert.That(response, Is.Not.Null);
        Assert.That(response!.Token, Is.Not.Empty);
        Assert.That(response.Role, Is.EqualTo("Instructor"));
    }
}