using System.Security.Claims;
using EduLearn.API.Controllers;
using EduLearn.API.DTOs;
using EduLearn.API.Models.Enums;
using EduLearn.API.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;

namespace EduLearn_Testing.Controller;

[TestFixture]
public class NotificationsControllerTest
{
    // ── Mock dependency ──
    private Mock<INotificationService> _notificationServiceMock;

    // ── Controller under test ──
    private NotificationsController _controller;

    [SetUp]
    public void Setup()
    {
        _notificationServiceMock = new Mock<INotificationService>();

        _controller = new NotificationsController(_notificationServiceMock.Object);
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
    // GET /api/notifications
    // ════════════════════════════════════════════════════════════════

    [Test]
    public async Task GetMine_ReturnsPaginatedList()
    {
        // Arrange
        SetCaller(3, "Student");
        var paginated = new PaginatedResponseDto<NotificationResponseDto>
        {
            Items = new List<NotificationResponseDto>
            {
                new NotificationResponseDto
                {
                    NotificationID = 1, UserID = 3,
                    Message = "Enrolled in CS101",
                    Category = NotificationCategory.Enrollment,
                    Severity = NotificationSeverity.Info,
                    Status = NotificationStatus.Active,
                    CreatedAt = DateTime.UtcNow
                }
            },
            Page = 1,
            PageSize = 20,
            TotalCount = 1,
            TotalPages = 1
        };
        _notificationServiceMock.Setup(s => s.GetForUserAsync(3, 1, 20, false))
            .ReturnsAsync(paginated);

        // Act
        var result = await _controller.GetMine(1, 20, false);

        // Assert
        var ok = result.Result as OkObjectResult;
        Assert.That(ok, Is.Not.Null);

        var response = ok!.Value as PaginatedResponseDto<NotificationResponseDto>;
        Assert.That(response!.TotalCount, Is.EqualTo(1));
        Assert.That(response.Items.First().Message, Is.EqualTo("Enrolled in CS101"));
    }

    [Test]
    public async Task GetMine_UnreadOnly_PassesFilterToService()
    {
        // Arrange
        SetCaller(3, "Student");
        var paginated = new PaginatedResponseDto<NotificationResponseDto>
        {
            Items = new List<NotificationResponseDto>(),
            Page = 1,
            PageSize = 20,
            TotalCount = 0,
            TotalPages = 0
        };
        _notificationServiceMock.Setup(s => s.GetForUserAsync(3, 1, 20, true))
            .ReturnsAsync(paginated);

        // Act
        var result = await _controller.GetMine(1, 20, true);

        // Assert
        var ok = result.Result as OkObjectResult;
        Assert.That(ok, Is.Not.Null);

        // Verify the service was called with unreadOnly=true
        _notificationServiceMock.Verify(s => s.GetForUserAsync(3, 1, 20, true), Times.Once);
    }

    // ════════════════════════════════════════════════════════════════
    // GET /api/notifications/unread-count
    // ════════════════════════════════════════════════════════════════

    [Test]
    public async Task GetUnreadCount_ReturnsCount()
    {
        // Arrange
        SetCaller(3, "Student");
        _notificationServiceMock.Setup(s => s.GetUnreadCountAsync(3)).ReturnsAsync(5);

        // Act
        var result = await _controller.GetUnreadCount();

        // Assert
        var ok = result.Result as OkObjectResult;
        Assert.That(ok, Is.Not.Null);

        var response = ok!.Value as UnreadCountDto;
        Assert.That(response!.UnreadCount, Is.EqualTo(5));
    }

    [Test]
    public async Task GetUnreadCount_ZeroUnread_ReturnsZero()
    {
        // Arrange
        SetCaller(3, "Student");
        _notificationServiceMock.Setup(s => s.GetUnreadCountAsync(3)).ReturnsAsync(0);

        // Act
        var result = await _controller.GetUnreadCount();

        // Assert
        var ok = result.Result as OkObjectResult;
        var response = ok!.Value as UnreadCountDto;
        Assert.That(response!.UnreadCount, Is.EqualTo(0));
    }

    // ════════════════════════════════════════════════════════════════
    // PUT /api/notifications/{id}/read
    // ════════════════════════════════════════════════════════════════

    [Test]
    public async Task MarkRead_Ok_Returns204()
    {
        // Arrange
        SetCaller(3, "Student");
        _notificationServiceMock.Setup(s => s.MarkReadAsync(1, 3))
            .ReturnsAsync(MarkReadResult.Ok);

        // Act
        var result = await _controller.MarkRead(1);

        // Assert
        var noContent = result as NoContentResult;
        Assert.That(noContent, Is.Not.Null);
        Assert.That(noContent!.StatusCode, Is.EqualTo(204));
    }

    [Test]
    public async Task MarkRead_NotFound_Returns404()
    {
        // Arrange
        SetCaller(3, "Student");
        _notificationServiceMock.Setup(s => s.MarkReadAsync(999, 3))
            .ReturnsAsync(MarkReadResult.NotFound);

        // Act
        var result = await _controller.MarkRead(999);

        // Assert
        var notFound = result as NotFoundObjectResult;
        Assert.That(notFound, Is.Not.Null);
        Assert.That(notFound!.StatusCode, Is.EqualTo(404));
    }

    [Test]
    public async Task MarkRead_Forbidden_Returns403()
    {
        // Arrange — trying to mark another user's notification
        SetCaller(3, "Student");
        _notificationServiceMock.Setup(s => s.MarkReadAsync(5, 3))
            .ReturnsAsync(MarkReadResult.Forbidden);

        // Act
        var result = await _controller.MarkRead(5);

        // Assert
        var forbidden = result as ObjectResult;
        Assert.That(forbidden, Is.Not.Null);
        Assert.That(forbidden!.StatusCode, Is.EqualTo(403));
    }

    // ════════════════════════════════════════════════════════════════
    // PUT /api/notifications/read-all
    // ════════════════════════════════════════════════════════════════

    [Test]
    public async Task MarkAllRead_Returns204()
    {
        // Arrange
        SetCaller(3, "Student");
        _notificationServiceMock.Setup(s => s.MarkAllReadAsync(3))
            .Returns(Task.CompletedTask);

        // Act
        var result = await _controller.MarkAllRead();

        // Assert
        var noContent = result as NoContentResult;
        Assert.That(noContent, Is.Not.Null);
        Assert.That(noContent!.StatusCode, Is.EqualTo(204));

        _notificationServiceMock.Verify(s => s.MarkAllReadAsync(3), Times.Once);
    }

    // ════════════════════════════════════════════════════════════════
    // POST /api/notifications/test (AdminPolicy)
    // ════════════════════════════════════════════════════════════════

    [Test]
    public async Task CreateTest_Returns201()
    {
        // Arrange
        SetCaller(10, "ITAdmin");
        var responseDto = new NotificationResponseDto
        {
            NotificationID = 1,
            UserID = 3,
            Message = "Test notification",
            Category = NotificationCategory.System,
            Severity = NotificationSeverity.Info,
            Status = NotificationStatus.Active,
            CreatedAt = DateTime.UtcNow
        };
        _notificationServiceMock.Setup(s => s.NotifyAsync(
                3, NotificationCategory.System, NotificationSeverity.Info,
                "Test notification", null))
            .ReturnsAsync(responseDto);

        var dto = new CreateNotificationDto
        {
            UserID = 3,
            Category = NotificationCategory.System,
            Severity = NotificationSeverity.Info,
            Message = "Test notification",
            EntityID = null
        };

        // Act
        var result = await _controller.CreateTest(dto);

        // Assert
        var created = result.Result as CreatedAtActionResult;
        Assert.That(created, Is.Not.Null);
        Assert.That(created!.StatusCode, Is.EqualTo(201));

        var response = created.Value as NotificationResponseDto;
        Assert.That(response!.Message, Is.EqualTo("Test notification"));
        Assert.That(response.Category, Is.EqualTo(NotificationCategory.System));
    }
}