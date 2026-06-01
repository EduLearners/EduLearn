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
public class DiscussionsControllerTest
{
    // ── Mock dependencies ──
    private Mock<IDiscussionRepository> _discussionRepoMock;
    private Mock<ICourseRepository> _courseRepoMock;
    private Mock<IUserRepository> _userRepoMock;
    private Mock<ISectionRepository> _sectionRepoMock;
    private Mock<INotificationService> _notificationServiceMock;

    // ── Controller under test ──
    private DiscussionsController _controller;

    // ── Reusable test data ──
    private Course _testCourse;
    private User _testUser;
    private Discussion _openDiscussion;
    private Discussion _closedDiscussion;

    [SetUp]
    public void Setup()
    {
        _discussionRepoMock = new Mock<IDiscussionRepository>();
        _courseRepoMock = new Mock<ICourseRepository>();
        _userRepoMock = new Mock<IUserRepository>();
        _sectionRepoMock = new Mock<ISectionRepository>();
        _notificationServiceMock = new Mock<INotificationService>();

        _controller = new DiscussionsController(
            _discussionRepoMock.Object,
            _courseRepoMock.Object,
            _userRepoMock.Object,
            _sectionRepoMock.Object,
            _notificationServiceMock.Object);

        // Simulate logged-in user with UserID = 1
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, "1"),
            new Claim(ClaimTypes.Role, "Student")
        };
        var identity = new ClaimsIdentity(claims, "TestAuth");
        var principal = new ClaimsPrincipal(identity);
        _controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = principal }
        };

        _testCourse = new Course
        {
            CourseID = 1,
            Code = "CS101",
            Title = "Introduction to Computer Science",
            Credits = 3,
            Status = CourseStatus.Active
        };

        _testUser = new User
        {
            UserID = 1,
            Username = "rahul.s",
            FullName = "Rahul Kumar",
            Email = "rahul@edulearn.com",
            Role = UserRole.Student,
            PasswordHash = "hashed",
            Status = UserStatus.Active
        };

        _openDiscussion = new Discussion
        {
            DiscussionID = 1,
            CourseID = 1,
            ThreadStarterID = 1,
            Title = "Can someone explain polymorphism?",
            PostsJSON = "[{\"authorID\":1,\"authorName\":\"Rahul Kumar\",\"content\":\"I am confused about polymorphism\",\"timestamp\":\"2026-05-01T10:00:00Z\",\"parentPostIndex\":null}]",
            Status = DiscussionStatus.Open,
            Course = _testCourse,
            ThreadStarter = _testUser
        };

        _closedDiscussion = new Discussion
        {
            DiscussionID = 2,
            CourseID = 1,
            ThreadStarterID = 1,
            Title = "Old thread",
            PostsJSON = null,
            Status = DiscussionStatus.Closed,
            Course = _testCourse,
            ThreadStarter = _testUser
        };
    }

    // ════════════════════════════════════════════════════════════════
    // POST /api/discussions — CreateDiscussion
    // ════════════════════════════════════════════════════════════════

    [Test]
    public async Task CreateDiscussion_WithInitialMessage_Returns201()
    {
        // Arrange
        _courseRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(_testCourse);
        _userRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(_testUser);
        _discussionRepoMock.Setup(r => r.CreateAsync(It.IsAny<Discussion>()))
            .ReturnsAsync((Discussion d) => { d.DiscussionID = 1; return d; });

        var dto = new CreateDiscussionDto
        {
            CourseID = 1,
            Title = "Can someone explain polymorphism?",
            InitialMessage = "I am confused about how polymorphism works in C#"
        };

        // Act
        var result = await _controller.CreateDiscussion(dto);

        // Assert
        var created = result.Result as ObjectResult;
        Assert.That(created, Is.Not.Null);
        Assert.That(created!.StatusCode, Is.EqualTo(201));

        var response = created.Value as DiscussionResponseDto;
        Assert.That(response!.Title, Is.EqualTo("Can someone explain polymorphism?"));
        Assert.That(response.CourseName, Is.EqualTo("Introduction to Computer Science"));
        Assert.That(response.ThreadStarterName, Is.EqualTo("Rahul Kumar"));
        Assert.That(response.ThreadStarterID, Is.EqualTo(1)); // from JWT
        Assert.That(response.Status, Is.EqualTo(DiscussionStatus.Open));
        Assert.That(response.PostsJSON, Does.Contain("polymorphism works in C#"));

        _discussionRepoMock.Verify(r => r.CreateAsync(It.IsAny<Discussion>()), Times.Once);
    }

    [Test]
    public async Task CreateDiscussion_WithoutInitialMessage_Returns201_NullPosts()
    {
        // Arrange
        _courseRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(_testCourse);
        _userRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(_testUser);
        _discussionRepoMock.Setup(r => r.CreateAsync(It.IsAny<Discussion>()))
            .ReturnsAsync((Discussion d) => { d.DiscussionID = 2; return d; });

        var dto = new CreateDiscussionDto
        {
            CourseID = 1,
            Title = "Q&A - Week 1",
            InitialMessage = null
        };

        // Act
        var result = await _controller.CreateDiscussion(dto);

        // Assert
        var created = result.Result as ObjectResult;
        var response = created!.Value as DiscussionResponseDto;
        Assert.That(response!.PostsJSON, Is.Null);
    }

    [Test]
    public async Task CreateDiscussion_CourseNotFound_Returns400()
    {
        // Arrange
        _courseRepoMock.Setup(r => r.GetByIdAsync(999)).ReturnsAsync((Course?)null);

        var dto = new CreateDiscussionDto { CourseID = 999, Title = "Test" };

        // Act
        var result = await _controller.CreateDiscussion(dto);

        // Assert
        var badRequest = result.Result as BadRequestObjectResult;
        Assert.That(badRequest, Is.Not.Null);
        Assert.That(badRequest!.StatusCode, Is.EqualTo(400));

        _discussionRepoMock.Verify(r => r.CreateAsync(It.IsAny<Discussion>()), Times.Never);
    }

    // ════════════════════════════════════════════════════════════════
    // GET /api/discussions/course/{courseId} — GetByCourse
    // ════════════════════════════════════════════════════════════════

    [Test]
    public async Task GetByCourse_CourseExists_Returns200()
    {
        // Arrange
        _courseRepoMock.Setup(r => r.ExistsAsync(1)).ReturnsAsync(true);
        _discussionRepoMock.Setup(r => r.GetByCourseIdWithDetailsAsync(1))
            .ReturnsAsync(new List<Discussion> { _openDiscussion });

        // Act
        var result = await _controller.GetByCourse(1);

        // Assert
        var ok = result.Result as OkObjectResult;
        Assert.That(ok, Is.Not.Null);

        var list = ok!.Value as List<DiscussionResponseDto>;
        Assert.That(list!.Count, Is.EqualTo(1));
        Assert.That(list[0].Title, Is.EqualTo("Can someone explain polymorphism?"));
        Assert.That(list[0].CourseName, Is.EqualTo("Introduction to Computer Science"));
    }

    [Test]
    public async Task GetByCourse_CourseNotFound_Returns404()
    {
        // Arrange
        _courseRepoMock.Setup(r => r.ExistsAsync(999)).ReturnsAsync(false);

        // Act
        var result = await _controller.GetByCourse(999);

        // Assert
        var notFound = result.Result as NotFoundObjectResult;
        Assert.That(notFound, Is.Not.Null);
        Assert.That(notFound!.StatusCode, Is.EqualTo(404));
    }

    // ════════════════════════════════════════════════════════════════
    // POST /api/discussions/{id}/reply — AddReply
    // ════════════════════════════════════════════════════════════════

    [Test]
    public async Task AddReply_OpenDiscussion_Returns200_PostAppended()
    {
        // Arrange — discussion is Open, has 1 existing post
        _discussionRepoMock.Setup(r => r.GetByIdWithDetailsAsync(1)).ReturnsAsync(_openDiscussion);
        _userRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(_testUser);
        _discussionRepoMock.Setup(r => r.UpdateAsync(It.IsAny<Discussion>()))
            .ReturnsAsync((Discussion d) => d);

        var dto = new CreateReplyDto
        {
            Content = "Polymorphism allows objects of different types to be treated as the same base type",
            ParentPostIndex = 0
        };

        // Act
        var result = await _controller.AddReply(1, dto);

        // Assert
        var ok = result.Result as OkObjectResult;
        Assert.That(ok, Is.Not.Null);

        var response = ok!.Value as DiscussionResponseDto;
        // PostsJSON should now contain both the original post and the new reply
        Assert.That(response!.PostsJSON, Does.Contain("Polymorphism allows"));
        Assert.That(response.PostsJSON, Does.Contain("polymorphism")); // original post still there

        _discussionRepoMock.Verify(r => r.UpdateAsync(It.IsAny<Discussion>()), Times.Once);
    }

    [Test]
    public async Task AddReply_ClosedDiscussion_Returns400()
    {
        // Arrange — discussion is Closed, replies blocked
        _discussionRepoMock.Setup(r => r.GetByIdWithDetailsAsync(2)).ReturnsAsync(_closedDiscussion);

        var dto = new CreateReplyDto { Content = "This should fail" };

        // Act
        var result = await _controller.AddReply(2, dto);

        // Assert
        var badRequest = result.Result as BadRequestObjectResult;
        Assert.That(badRequest, Is.Not.Null);
        Assert.That(badRequest!.StatusCode, Is.EqualTo(400));

        _discussionRepoMock.Verify(r => r.UpdateAsync(It.IsAny<Discussion>()), Times.Never);
    }

    [Test]
    public async Task AddReply_DiscussionNotFound_Returns404()
    {
        // Arrange
        _discussionRepoMock.Setup(r => r.GetByIdWithDetailsAsync(999))
            .ReturnsAsync((Discussion?)null);

        var dto = new CreateReplyDto { Content = "Test" };

        // Act
        var result = await _controller.AddReply(999, dto);

        // Assert
        var notFound = result.Result as NotFoundObjectResult;
        Assert.That(notFound, Is.Not.Null);
        Assert.That(notFound!.StatusCode, Is.EqualTo(404));
    }

    [Test]
    public async Task AddReply_PinnedDiscussion_Returns200_Allowed()
    {
        // Arrange — Pinned discussions still accept replies
        var pinnedDiscussion = new Discussion
        {
            DiscussionID = 3,
            CourseID = 1,
            ThreadStarterID = 1,
            Title = "Pinned FAQ",
            PostsJSON = null,
            Status = DiscussionStatus.Pinned,
            Course = _testCourse,
            ThreadStarter = _testUser
        };
        _discussionRepoMock.Setup(r => r.GetByIdWithDetailsAsync(3)).ReturnsAsync(pinnedDiscussion);
        _userRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(_testUser);
        _discussionRepoMock.Setup(r => r.UpdateAsync(It.IsAny<Discussion>()))
            .ReturnsAsync((Discussion d) => d);

        var dto = new CreateReplyDto { Content = "Adding to pinned thread" };

        // Act
        var result = await _controller.AddReply(3, dto);

        // Assert
        var ok = result.Result as OkObjectResult;
        Assert.That(ok, Is.Not.Null);

        var response = ok!.Value as DiscussionResponseDto;
        Assert.That(response!.PostsJSON, Does.Contain("Adding to pinned thread"));
    }

    [Test]
    public async Task AddReply_ArchivedDiscussion_Returns400()
    {
        // Arrange — Archived discussions don't accept replies
        var archivedDiscussion = new Discussion
        {
            DiscussionID = 4,
            CourseID = 1,
            ThreadStarterID = 1,
            Title = "Archived",
            Status = DiscussionStatus.Archived,
            Course = _testCourse,
            ThreadStarter = _testUser
        };
        _discussionRepoMock.Setup(r => r.GetByIdWithDetailsAsync(4)).ReturnsAsync(archivedDiscussion);

        var dto = new CreateReplyDto { Content = "This should fail" };

        // Act
        var result = await _controller.AddReply(4, dto);

        // Assert
        var badRequest = result.Result as BadRequestObjectResult;
        Assert.That(badRequest, Is.Not.Null);

        _discussionRepoMock.Verify(r => r.UpdateAsync(It.IsAny<Discussion>()), Times.Never);
    }

    // ════════════════════════════════════════════════════════════════
    // PUT /api/discussions/{id}/status — UpdateStatus
    // ════════════════════════════════════════════════════════════════

    [Test]
    public async Task UpdateStatus_OpenToClosed_Returns200()
    {
        // Arrange
        _discussionRepoMock.Setup(r => r.GetByIdWithDetailsAsync(1)).ReturnsAsync(_openDiscussion);
        _discussionRepoMock.Setup(r => r.UpdateAsync(It.IsAny<Discussion>()))
            .ReturnsAsync((Discussion d) => d);

        var dto = new UpdateDiscussionStatusDto { Status = DiscussionStatus.Closed };

        // Act
        var result = await _controller.UpdateStatus(1, dto);

        // Assert
        var ok = result.Result as OkObjectResult;
        var response = ok!.Value as DiscussionResponseDto;
        Assert.That(response!.Status, Is.EqualTo(DiscussionStatus.Closed));

        _discussionRepoMock.Verify(r => r.UpdateAsync(It.IsAny<Discussion>()), Times.Once);
    }

    [Test]
    public async Task UpdateStatus_DiscussionNotFound_Returns404()
    {
        // Arrange
        _discussionRepoMock.Setup(r => r.GetByIdWithDetailsAsync(999))
            .ReturnsAsync((Discussion?)null);

        var dto = new UpdateDiscussionStatusDto { Status = DiscussionStatus.Closed };

        // Act
        var result = await _controller.UpdateStatus(999, dto);

        // Assert
        var notFound = result.Result as NotFoundObjectResult;
        Assert.That(notFound, Is.Not.Null);
        Assert.That(notFound!.StatusCode, Is.EqualTo(404));

        _discussionRepoMock.Verify(r => r.UpdateAsync(It.IsAny<Discussion>()), Times.Never);
    }
}