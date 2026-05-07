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
public class TicketsControllerTest
{
    // ── Mock dependencies ──
    private Mock<ITicketRepository> _ticketRepoMock;
    private Mock<IUserRepository> _userRepoMock;
    private Mock<IAuditLogRepository> _auditLogRepoMock;
    private Mock<INotificationService> _notificationServiceMock;

    // ── Real service with mocked inner dependency ──
    private AuditLogService _auditLogService;

    // ── Controller under test ──
    private TicketsController _controller;

    // ── Reusable test data ──
    private User _studentUser;
    private User _adminUser;
    private Ticket _openTicket;
    private Ticket _resolvedTicket;

    [SetUp]
    public void Setup()
    {
        _ticketRepoMock = new Mock<ITicketRepository>();
        _userRepoMock = new Mock<IUserRepository>();
        _auditLogRepoMock = new Mock<IAuditLogRepository>();
        _notificationServiceMock = new Mock<INotificationService>();

        _auditLogService = new AuditLogService(_auditLogRepoMock.Object);

        _controller = new TicketsController(
            _ticketRepoMock.Object,
            _userRepoMock.Object,
            _auditLogService,
            _notificationServiceMock.Object);

        _studentUser = new User
        {
            UserID = 3,
            Username = "rahul.s",
            FullName = "Rahul Kumar",
            Email = "rahul@edulearn.com",
            Role = UserRole.Student,
            PasswordHash = "hash",
            Status = UserStatus.Active
        };

        _adminUser = new User
        {
            UserID = 10,
            Username = "admin",
            FullName = "IT Admin",
            Email = "admin@edulearn.com",
            Role = UserRole.ITAdmin,
            PasswordHash = "hash",
            Status = UserStatus.Active
        };

        _openTicket = new Ticket
        {
            TicketID = 1,
            CreatedByFK = 3,
            Subject = "Cannot access LMS",
            Description = "Getting 403 error on content page",
            Priority = TicketPriority.High,
            Status = TicketStatus.Open,
            CreatedBy = _studentUser,
            AssignedTo = null
        };

        _resolvedTicket = new Ticket
        {
            TicketID = 2,
            CreatedByFK = 3,
            Subject = "Old ticket",
            Description = "Already resolved",
            Priority = TicketPriority.Low,
            Status = TicketStatus.Resolved,
            CreatedBy = _studentUser,
            AssignedTo = _adminUser,
            AssignedToFK = 10
        };
    }

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
    // POST /api/tickets — Create
    // ════════════════════════════════════════════════════════════════

    [Test]
    public async Task Create_ValidDto_Returns201()
    {
        // Arrange
        SetCaller(3, "Student");
        _ticketRepoMock.Setup(r => r.CreateAsync(It.IsAny<Ticket>()))
            .ReturnsAsync((Ticket t) => { t.TicketID = 1; return t; });
        _ticketRepoMock.Setup(r => r.GetByIdWithUsersAsync(1)).ReturnsAsync(_openTicket);

        var dto = new CreateTicketDto
        {
            Subject = "Cannot access LMS",
            Description = "Getting 403 error on content page",
            Priority = TicketPriority.High
        };

        // Act
        var result = await _controller.Create(dto);

        // Assert
        var created = result.Result as CreatedAtActionResult;
        Assert.That(created, Is.Not.Null);
        Assert.That(created!.StatusCode, Is.EqualTo(201));

        var response = created.Value as TicketResponseDto;
        Assert.That(response!.Subject, Is.EqualTo("Cannot access LMS"));
        Assert.That(response.Status, Is.EqualTo(TicketStatus.Open));
        Assert.That(response.CreatedByUsername, Is.EqualTo("rahul.s"));
        Assert.That(response.Priority, Is.EqualTo(TicketPriority.High));

        _ticketRepoMock.Verify(r => r.CreateAsync(It.IsAny<Ticket>()), Times.Once);
    }

    // ════════════════════════════════════════════════════════════════
    // GET /api/tickets — GetAll
    // ════════════════════════════════════════════════════════════════

    [Test]
    public async Task GetAll_ITAdmin_ReturnsAllTickets()
    {
        // Arrange — ITAdmin sees all
        SetCaller(10, "ITAdmin");
        _ticketRepoMock.Setup(r => r.GetAllWithUsersAsync())
            .ReturnsAsync(new List<Ticket> { _openTicket, _resolvedTicket });

        // Act
        var result = await _controller.GetAll();

        // Assert
        var ok = result.Result as OkObjectResult;
        Assert.That(ok, Is.Not.Null);

        var list = (ok!.Value as IEnumerable<TicketResponseDto>)?.ToList();
        Assert.That(list!.Count, Is.EqualTo(2));
    }

    [Test]
    public async Task GetAll_Student_ReturnsOnlyOwnTickets()
    {
        // Arrange — Student sees only own
        SetCaller(3, "Student");
        _ticketRepoMock.Setup(r => r.GetByUserAsync(3))
            .ReturnsAsync(new List<Ticket> { _openTicket });

        // Act
        var result = await _controller.GetAll();

        // Assert
        var ok = result.Result as OkObjectResult;
        var list = (ok!.Value as IEnumerable<TicketResponseDto>)?.ToList();
        Assert.That(list!.Count, Is.EqualTo(1));
        Assert.That(list[0].CreatedByUserID, Is.EqualTo(3));
    }

    // ════════════════════════════════════════════════════════════════
    // GET /api/tickets/{id} — GetById
    // ════════════════════════════════════════════════════════════════

    [Test]
    public async Task GetById_Creator_Returns200()
    {
        // Arrange — ticket creator views their own ticket
        SetCaller(3, "Student");
        _ticketRepoMock.Setup(r => r.GetByIdWithUsersAsync(1)).ReturnsAsync(_openTicket);

        // Act
        var result = await _controller.GetById(1);

        // Assert
        var ok = result.Result as OkObjectResult;
        Assert.That(ok, Is.Not.Null);

        var response = ok!.Value as TicketResponseDto;
        Assert.That(response!.TicketID, Is.EqualTo(1));
        Assert.That(response.Subject, Is.EqualTo("Cannot access LMS"));
    }

    [Test]
    public async Task GetById_NotFound_Returns404()
    {
        // Arrange
        SetCaller(3, "Student");
        _ticketRepoMock.Setup(r => r.GetByIdWithUsersAsync(999)).ReturnsAsync((Ticket?)null);

        // Act
        var result = await _controller.GetById(999);

        // Assert
        var notFound = result.Result as NotFoundObjectResult;
        Assert.That(notFound, Is.Not.Null);
        Assert.That(notFound!.StatusCode, Is.EqualTo(404));
    }

    [Test]
    public async Task GetById_OtherUser_Returns403()
    {
        // Arrange — user 99 is not creator, not assignee, not admin
        SetCaller(99, "Instructor");
        _ticketRepoMock.Setup(r => r.GetByIdWithUsersAsync(1)).ReturnsAsync(_openTicket);

        // Act
        var result = await _controller.GetById(1);

        // Assert
        var forbidden = result.Result as ObjectResult;
        Assert.That(forbidden!.StatusCode, Is.EqualTo(403));
    }

    // ════════════════════════════════════════════════════════════════
    // PUT /api/tickets/{id}/assign
    // ════════════════════════════════════════════════════════════════

    [Test]
    public async Task Assign_ValidDto_Returns200()
    {
        // Arrange
        SetCaller(10, "ITAdmin");
        _ticketRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(_openTicket);
        _userRepoMock.Setup(r => r.GetByIdAsync(10)).ReturnsAsync(_adminUser);
        _ticketRepoMock.Setup(r => r.UpdateAsync(It.IsAny<Ticket>()))
            .ReturnsAsync((Ticket t) => t);

        var assignedTicket = new Ticket
        {
            TicketID = 1,
            CreatedByFK = 3,
            AssignedToFK = 10,
            Subject = "Cannot access LMS",
            Description = "Getting 403 error",
            Priority = TicketPriority.High,
            Status = TicketStatus.InProgress,
            CreatedBy = _studentUser,
            AssignedTo = _adminUser
        };
        _ticketRepoMock.Setup(r => r.GetByIdWithUsersAsync(1)).ReturnsAsync(assignedTicket);

        var dto = new AssignTicketDto { AssignedToUserId = 10 };

        // Act
        var result = await _controller.Assign(1, dto);

        // Assert
        var ok = result.Result as OkObjectResult;
        var response = ok!.Value as TicketResponseDto;
        Assert.That(response!.Status, Is.EqualTo(TicketStatus.InProgress));
        Assert.That(response.AssignedToUserID, Is.EqualTo(10));
        Assert.That(response.AssignedToUsername, Is.EqualTo("admin"));

        _ticketRepoMock.Verify(r => r.UpdateAsync(It.IsAny<Ticket>()), Times.Once);
    }

    [Test]
    public async Task Assign_ResolvedTicket_Returns400()
    {
        // Arrange — cannot assign resolved ticket
        SetCaller(10, "ITAdmin");
        _ticketRepoMock.Setup(r => r.GetByIdAsync(2)).ReturnsAsync(_resolvedTicket);

        var dto = new AssignTicketDto { AssignedToUserId = 10 };

        // Act
        var result = await _controller.Assign(2, dto);

        // Assert
        var badRequest = result.Result as BadRequestObjectResult;
        Assert.That(badRequest, Is.Not.Null);
        Assert.That(badRequest!.StatusCode, Is.EqualTo(400));

        _ticketRepoMock.Verify(r => r.UpdateAsync(It.IsAny<Ticket>()), Times.Never);
    }

    [Test]
    public async Task Assign_AssigneeNotITAdmin_Returns400()
    {
        // Arrange — assignee must be ITAdmin
        SetCaller(10, "ITAdmin");
        _ticketRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(_openTicket);
        _userRepoMock.Setup(r => r.GetByIdAsync(3)).ReturnsAsync(_studentUser); // Student role

        var dto = new AssignTicketDto { AssignedToUserId = 3 };

        // Act
        var result = await _controller.Assign(1, dto);

        // Assert
        var badRequest = result.Result as BadRequestObjectResult;
        Assert.That(badRequest, Is.Not.Null);

        _ticketRepoMock.Verify(r => r.UpdateAsync(It.IsAny<Ticket>()), Times.Never);
    }

    // ════════════════════════════════════════════════════════════════
    // PUT /api/tickets/{id}/resolve
    // ════════════════════════════════════════════════════════════════

    [Test]
    public async Task Resolve_ValidDto_Returns200()
    {
        // Arrange
        SetCaller(10, "ITAdmin");
        var inProgressTicket = new Ticket
        {
            TicketID = 1,
            CreatedByFK = 3,
            AssignedToFK = 10,
            Subject = "Cannot access LMS",
            Description = "Getting 403 error",
            Priority = TicketPriority.High,
            Status = TicketStatus.InProgress,
            CreatedBy = _studentUser,
            AssignedTo = _adminUser
        };
        _ticketRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(inProgressTicket);
        _ticketRepoMock.Setup(r => r.UpdateAsync(It.IsAny<Ticket>()))
            .ReturnsAsync((Ticket t) => t);

        var resolvedHydrated = new Ticket
        {
            TicketID = 1,
            CreatedByFK = 3,
            AssignedToFK = 10,
            Subject = "Cannot access LMS",
            Status = TicketStatus.Resolved,
            ResolutionURI = "https://wiki/fix-403",
            CreatedBy = _studentUser,
            AssignedTo = _adminUser
        };
        _ticketRepoMock.Setup(r => r.GetByIdWithUsersAsync(1)).ReturnsAsync(resolvedHydrated);

        var dto = new ResolveTicketDto
        {
            ResolutionURI = "https://wiki/fix-403",
            ResolutionNote = "Cleared role cache"
        };

        // Act
        var result = await _controller.Resolve(1, dto);

        // Assert
        var ok = result.Result as OkObjectResult;
        var response = ok!.Value as TicketResponseDto;
        Assert.That(response!.Status, Is.EqualTo(TicketStatus.Resolved));
        Assert.That(response.ResolutionURI, Is.EqualTo("https://wiki/fix-403"));

        _ticketRepoMock.Verify(r => r.UpdateAsync(It.IsAny<Ticket>()), Times.Once);
    }

    [Test]
    public async Task Resolve_AlreadyResolved_Returns400()
    {
        // Arrange — cannot resolve an already-resolved ticket
        SetCaller(10, "ITAdmin");
        _ticketRepoMock.Setup(r => r.GetByIdAsync(2)).ReturnsAsync(_resolvedTicket);

        var dto = new ResolveTicketDto { ResolutionURI = "https://test.com" };

        // Act
        var result = await _controller.Resolve(2, dto);

        // Assert
        var badRequest = result.Result as BadRequestObjectResult;
        Assert.That(badRequest, Is.Not.Null);
        Assert.That(badRequest!.StatusCode, Is.EqualTo(400));

        _ticketRepoMock.Verify(r => r.UpdateAsync(It.IsAny<Ticket>()), Times.Never);
    }

    [Test]
    public async Task Resolve_NotFound_Returns404()
    {
        // Arrange
        SetCaller(10, "ITAdmin");
        _ticketRepoMock.Setup(r => r.GetByIdAsync(999)).ReturnsAsync((Ticket?)null);

        var dto = new ResolveTicketDto { ResolutionURI = "https://test.com" };

        // Act
        var result = await _controller.Resolve(999, dto);

        // Assert
        var notFound = result.Result as NotFoundObjectResult;
        Assert.That(notFound, Is.Not.Null);
        Assert.That(notFound!.StatusCode, Is.EqualTo(404));
    }
}