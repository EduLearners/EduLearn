using System.Security.Claims;
using EduLearn.API.Controllers;
using EduLearn.API.DTOs;
using EduLearn.API.Models;
using EduLearn.API.Models.Enums;
using EduLearn.API.Repositories.Interfaces;
using EduLearn.API.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;

namespace EduLearn_Testing.Controller;

[TestFixture]
public class UsersControllerTest
{
    // ── Mock dependencies ──
    private Mock<IUserRepository> _userRepoMock;
    private Mock<IAuditLogRepository> _auditLogRepoMock;
    private Mock<INotificationService> _notificationServiceMock;

    // ── Real service with mocked inner dependency ──
    private AuditLogService _auditLogService;

    // ── Controller under test ──
    private UsersController _controller;

    // ── Reusable test data ──
    private User _testUser;

    [SetUp]
    public void Setup()
    {
        _userRepoMock = new Mock<IUserRepository>();
        _auditLogRepoMock = new Mock<IAuditLogRepository>();
        _notificationServiceMock = new Mock<INotificationService>();

        _auditLogService = new AuditLogService(_auditLogRepoMock.Object);

        _controller = new UsersController(
            _userRepoMock.Object,
            _auditLogService,
            _notificationServiceMock.Object);

        _testUser = new User
        {
            UserID = 1,
            Username = "rahul.s",
            FullName = "Rahul Kumar",
            Email = "rahul@edulearn.com",
            Phone = "+91-9876543211",
            Role = UserRole.Student,
            PasswordHash = "hashed",
            MFAEnabled = false,
            Status = UserStatus.Active,
            CreatedAt = DateTime.UtcNow
        };
    }

    /// Helper: sets up ControllerContext with given UserID and Role
    private void SetCaller(int userId, string role)
    {
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
            new Claim(ClaimTypes.Role, role)
        };
        var identity = new ClaimsIdentity(claims, "TestAuth");
        _controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(identity) }
        };
    }

    // ════════════════════════════════════════════════════════════════
    // POST /api/users — CreateUser (AdminPolicy)
    // ════════════════════════════════════════════════════════════════

    [Test]
    public async Task CreateUser_ValidDto_Returns201()
    {
        // Arrange — logged in as ITAdmin
        SetCaller(10, "ITAdmin");

        _userRepoMock.Setup(r => r.GetByEmailAsync("new@edulearn.com"))
            .ReturnsAsync((User?)null);
        _userRepoMock.Setup(r => r.GetByUsernameAsync("newuser"))
            .ReturnsAsync((User?)null);
        _userRepoMock.Setup(r => r.CreateAsync(It.IsAny<User>()))
            .ReturnsAsync((User u) => { u.UserID = 5; return u; });

        var dto = new CreateUserDto
        {
            Username = "newuser",
            FullName = "New User",
            Email = "new@edulearn.com",
            Phone = null,
            Role = UserRole.Instructor,
            Password = "Inst@123"
        };

        // Act
        var result = await _controller.CreateUser(dto);

        // Assert
        var created = result.Result as CreatedAtActionResult;
        Assert.That(created, Is.Not.Null);
        Assert.That(created!.StatusCode, Is.EqualTo(201));

        var response = created.Value as UserResponseDto;
        Assert.That(response!.Username, Is.EqualTo("newuser"));
        Assert.That(response.Role, Is.EqualTo(UserRole.Instructor));
        Assert.That(response.Status, Is.EqualTo(UserStatus.Active));

        _userRepoMock.Verify(r => r.CreateAsync(It.IsAny<User>()), Times.Once);
    }

    [Test]
    public async Task CreateUser_DuplicateEmail_Returns409()
    {
        // Arrange
        SetCaller(10, "ITAdmin");
        _userRepoMock.Setup(r => r.GetByEmailAsync("existing@edulearn.com"))
            .ReturnsAsync(_testUser);

        var dto = new CreateUserDto
        {
            Username = "newuser",
            FullName = "New",
            Email = "existing@edulearn.com",
            Role = UserRole.Student,
            Password = "Test@123"
        };

        // Act
        var result = await _controller.CreateUser(dto);

        // Assert
        var conflict = result.Result as ConflictObjectResult;
        Assert.That(conflict, Is.Not.Null);
        Assert.That(conflict!.StatusCode, Is.EqualTo(409));

        _userRepoMock.Verify(r => r.CreateAsync(It.IsAny<User>()), Times.Never);
    }

    [Test]
    public async Task CreateUser_DuplicateUsername_Returns409()
    {
        // Arrange
        SetCaller(10, "ITAdmin");
        _userRepoMock.Setup(r => r.GetByEmailAsync("new@test.com"))
            .ReturnsAsync((User?)null);
        _userRepoMock.Setup(r => r.GetByUsernameAsync("rahul.s"))
            .ReturnsAsync(_testUser);

        var dto = new CreateUserDto
        {
            Username = "rahul.s",
            FullName = "New",
            Email = "new@test.com",
            Role = UserRole.Student,
            Password = "Test@123"
        };

        // Act
        var result = await _controller.CreateUser(dto);

        // Assert
        var conflict = result.Result as ConflictObjectResult;
        Assert.That(conflict, Is.Not.Null);
        Assert.That(conflict!.StatusCode, Is.EqualTo(409));
    }

    // ════════════════════════════════════════════════════════════════
    // GET /api/users — GetUsers (UserViewPolicy)
    // ════════════════════════════════════════════════════════════════

    [Test]
    public async Task GetUsers_ReturnsList()
    {
        // Arrange
        SetCaller(10, "ITAdmin");
        _userRepoMock.Setup(r => r.GetAllAsync())
            .ReturnsAsync(new List<User> { _testUser });

        // Act
        var result = await _controller.GetUsers();

        // Assert
        var ok = result.Result as OkObjectResult;
        Assert.That(ok, Is.Not.Null);

        var list = ok!.Value as List<UserResponseDto>;
        Assert.That(list!.Count, Is.EqualTo(1));
        Assert.That(list[0].Username, Is.EqualTo("rahul.s"));
    }

    // ════════════════════════════════════════════════════════════════
    // GET /api/users/{id} — GetUser (self-only for non-privileged)
    // ════════════════════════════════════════════════════════════════

    [Test]
    public async Task GetUser_OwnProfile_Returns200()
    {
        // Arrange — Student viewing own profile (UserID=1, requesting id=1)
        SetCaller(1, "Student");
        _userRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(_testUser);

        // Act
        var result = await _controller.GetUser(1);

        // Assert
        var ok = result.Result as OkObjectResult;
        Assert.That(ok, Is.Not.Null);

        var response = ok!.Value as UserResponseDto;
        Assert.That(response!.UserID, Is.EqualTo(1));
        Assert.That(response.Username, Is.EqualTo("rahul.s"));
    }

    [Test]
    public async Task GetUser_OtherProfile_Student_Returns403()
    {
        // Arrange — Student (UserID=1) trying to view another user (id=2)
        SetCaller(1, "Student");

        // Act
        var result = await _controller.GetUser(2);

        // Assert
        var forbidden = result.Result as ObjectResult;
        Assert.That(forbidden, Is.Not.Null);
        Assert.That(forbidden!.StatusCode, Is.EqualTo(403));
    }

    [Test]
    public async Task GetUser_OtherProfile_ITAdmin_Returns200()
    {
        // Arrange — ITAdmin can view any user's profile
        SetCaller(10, "ITAdmin");
        _userRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(_testUser);

        // Act
        var result = await _controller.GetUser(1);

        // Assert
        var ok = result.Result as OkObjectResult;
        Assert.That(ok, Is.Not.Null);
    }

    [Test]
    public async Task GetUser_NotFound_Returns404()
    {
        // Arrange
        SetCaller(10, "ITAdmin");
        _userRepoMock.Setup(r => r.GetByIdAsync(999)).ReturnsAsync((User?)null);

        // Act
        var result = await _controller.GetUser(999);

        // Assert
        var notFound = result.Result as NotFoundObjectResult;
        Assert.That(notFound, Is.Not.Null);
        Assert.That(notFound!.StatusCode, Is.EqualTo(404));
    }

    // ════════════════════════════════════════════════════════════════
    // PUT /api/users/{id} — UpdateUser (self-only for non-admin)
    // ════════════════════════════════════════════════════════════════

    [Test]
    public async Task UpdateUser_OwnProfile_Returns200()
    {
        // Arrange — Student updating own profile
        SetCaller(1, "Student");
        _userRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(_testUser);
        _userRepoMock.Setup(r => r.UpdateAsync(It.IsAny<User>()))
            .ReturnsAsync((User u) => u);

        var dto = new UpdateUserDto
        {
            FullName = "Rahul Kumar Singh",
            Email = "rahul@edulearn.com", // same email — no collision
            Phone = "+91-9999999999"
        };

        // Act
        var result = await _controller.UpdateUser(1, dto);

        // Assert
        var ok = result.Result as OkObjectResult;
        var response = ok!.Value as UserResponseDto;
        Assert.That(response!.FullName, Is.EqualTo("Rahul Kumar Singh"));
        Assert.That(response.Phone, Is.EqualTo("+91-9999999999"));

        _userRepoMock.Verify(r => r.UpdateAsync(It.IsAny<User>()), Times.Once);
    }

    [Test]
    public async Task UpdateUser_OtherProfile_Student_Returns403()
    {
        // Arrange — Student (UserID=1) trying to update another user (id=2)
        SetCaller(1, "Student");

        var dto = new UpdateUserDto
        {
            FullName = "Hacked",
            Email = "hack@test.com"
        };

        // Act
        var result = await _controller.UpdateUser(2, dto);

        // Assert
        var forbidden = result.Result as ObjectResult;
        Assert.That(forbidden!.StatusCode, Is.EqualTo(403));

        _userRepoMock.Verify(r => r.UpdateAsync(It.IsAny<User>()), Times.Never);
    }

    [Test]
    public async Task UpdateUser_EmailCollision_Returns409()
    {
        // Arrange — changing email to one that already belongs to another user
        SetCaller(1, "Student");
        _userRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(_testUser);

        var otherUser = new User
        {
            UserID = 2,
            Username = "other",
            Email = "taken@edulearn.com",
            FullName = "Other",
            PasswordHash = "hash",
            Role = UserRole.Student
        };
        _userRepoMock.Setup(r => r.GetByEmailAsync("taken@edulearn.com"))
            .ReturnsAsync(otherUser);

        var dto = new UpdateUserDto
        {
            FullName = "Rahul",
            Email = "taken@edulearn.com"
        };

        // Act
        var result = await _controller.UpdateUser(1, dto);

        // Assert
        var conflict = result.Result as ConflictObjectResult;
        Assert.That(conflict, Is.Not.Null);
        Assert.That(conflict!.StatusCode, Is.EqualTo(409));

        _userRepoMock.Verify(r => r.UpdateAsync(It.IsAny<User>()), Times.Never);
    }

    // ════════════════════════════════════════════════════════════════
    // PUT /api/users/{id}/status — UpdateUserStatus (AdminPolicy)
    // ════════════════════════════════════════════════════════════════

    [Test]
    public async Task UpdateUserStatus_Returns200()
    {
        // Arrange
        SetCaller(10, "ITAdmin");
        _userRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(_testUser);
        _userRepoMock.Setup(r => r.UpdateAsync(It.IsAny<User>()))
            .ReturnsAsync((User u) => u);

        var dto = new UpdateStatusDto { Status = UserStatus.Suspended };

        // Act
        var result = await _controller.UpdateUserStatus(1, dto);

        // Assert
        var ok = result.Result as OkObjectResult;
        var response = ok!.Value as UserResponseDto;
        Assert.That(response!.Status, Is.EqualTo(UserStatus.Suspended));

        _userRepoMock.Verify(r => r.UpdateAsync(It.IsAny<User>()), Times.Once);
    }

    [Test]
    public async Task UpdateUserStatus_NotFound_Returns404()
    {
        // Arrange
        SetCaller(10, "ITAdmin");
        _userRepoMock.Setup(r => r.GetByIdAsync(999)).ReturnsAsync((User?)null);

        var dto = new UpdateStatusDto { Status = UserStatus.Suspended };

        // Act
        var result = await _controller.UpdateUserStatus(999, dto);

        // Assert
        var notFound = result.Result as NotFoundObjectResult;
        Assert.That(notFound, Is.Not.Null);

        _userRepoMock.Verify(r => r.UpdateAsync(It.IsAny<User>()), Times.Never);
    }

    // ════════════════════════════════════════════════════════════════
    // POST /api/users/{id}/mfa/reset — ResetMfa (AdminPolicy)
    // ════════════════════════════════════════════════════════════════

    [Test]
    public async Task ResetMfa_Returns204()
    {
        // Arrange
        SetCaller(10, "ITAdmin");
        var mfaUser = new User
        {
            UserID = 5,
            Username = "admin2",
            FullName = "Admin Two",
            Email = "admin2@test.com",
            PasswordHash = "hash",
            Role = UserRole.DeptAdmin,
            MFAEnabled = true,
            MFASecret = "SOMEBASE32SECRET",
            Status = UserStatus.Active
        };
        _userRepoMock.Setup(r => r.GetByIdAsync(5)).ReturnsAsync(mfaUser);
        _userRepoMock.Setup(r => r.UpdateAsync(It.IsAny<User>()))
            .ReturnsAsync((User u) => u);

        // Act
        var result = await _controller.ResetMfa(5);

        // Assert
        var noContent = result as NoContentResult;
        Assert.That(noContent, Is.Not.Null);
        Assert.That(noContent!.StatusCode, Is.EqualTo(204));

        // Verify MFA fields were cleared
        Assert.That(mfaUser.MFAEnabled, Is.False);
        Assert.That(mfaUser.MFASecret, Is.Null);

        _userRepoMock.Verify(r => r.UpdateAsync(It.IsAny<User>()), Times.Once);
    }

    [Test]
    public async Task ResetMfa_UserNotFound_Returns404()
    {
        // Arrange
        SetCaller(10, "ITAdmin");
        _userRepoMock.Setup(r => r.GetByIdAsync(999)).ReturnsAsync((User?)null);

        // Act
        var result = await _controller.ResetMfa(999);

        // Assert
        var notFound = result as NotFoundObjectResult;
        Assert.That(notFound, Is.Not.Null);
        Assert.That(notFound!.StatusCode, Is.EqualTo(404));
    }
}