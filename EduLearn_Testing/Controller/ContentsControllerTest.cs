using System.Security.Claims;
using EduLearn.API.Controllers;
using EduLearn.API.DTOs;
using EduLearn.API.Models;
using EduLearn.API.Models.Enums;
using EduLearn.API.Repositories.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;

namespace EduLearn_Testing.Controller;

[TestFixture]
public class ContentsControllerTest
{
    // ── Mock dependencies ──
    private Mock<IContentRepository> _contentRepoMock;
    private Mock<ICourseRepository> _courseRepoMock;
    private Mock<IUserRepository> _userRepoMock;

    // ── Controller under test ──
    private ContentsController _controller;

    // ── Reusable test data ──
    private Course _testCourse;
    private User _testInstructor;
    private Content _testContent;

    [SetUp]
    public void Setup()
    {
        _contentRepoMock = new Mock<IContentRepository>();
        _courseRepoMock = new Mock<ICourseRepository>();
        _userRepoMock = new Mock<IUserRepository>();

        _controller = new ContentsController(
            _contentRepoMock.Object,
            _courseRepoMock.Object,
            _userRepoMock.Object);

        // Simulate logged-in Instructor with UserID = 1
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, "1"),
            new Claim(ClaimTypes.Role, "Instructor")
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

        _testInstructor = new User
        {
            UserID = 1,
            Username = "dr.priya",
            FullName = "Dr. Priya Sharma",
            Email = "priya@edulearn.com",
            Role = UserRole.Instructor,
            PasswordHash = "hashed",
            Status = UserStatus.Active
        };

        _testContent = new Content
        {
            ContentID = 1,
            CourseID = 1,
            Title = "Week 1 - Intro to Programming",
            Type = ContentType.Document,
            URI = "https://blob.storage/week1-notes.pdf",
            UploadedByFK = 1,
            Version = 1,
            Status = ContentStatus.Active,
            MetadataJSON = "{\"fileSize\": 2048576}",
            Course = _testCourse,
            UploadedBy = _testInstructor
        };
    }

    // ════════════════════════════════════════════════════════════════
    // POST /api/content/upload — UploadContent
    // ════════════════════════════════════════════════════════════════

    [Test]
    public async Task UploadContent_ValidDto_Returns201()
    {
        // Arrange
        _courseRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(_testCourse);
        _userRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(_testInstructor);
        _contentRepoMock.Setup(r => r.CreateAsync(It.IsAny<Content>()))
            .ReturnsAsync((Content c) => { c.ContentID = 1; return c; });

        var dto = new CreateContentDto
        {
            CourseID = 1,
            Title = "Week 1 - Intro to Programming",
            Type = ContentType.Document,
            URI = "https://blob.storage/week1-notes.pdf",
            MetadataJSON = "{\"fileSize\": 2048576}"
        };

        // Act
        var result = await _controller.UploadContent(dto);

        // Assert
        var created = result.Result as ObjectResult;
        Assert.That(created, Is.Not.Null);
        Assert.That(created!.StatusCode, Is.EqualTo(201));

        var response = created.Value as ContentResponseDto;
        Assert.That(response!.Title, Is.EqualTo("Week 1 - Intro to Programming"));
        Assert.That(response.CourseName, Is.EqualTo("Introduction to Computer Science"));
        Assert.That(response.UploadedByName, Is.EqualTo("Dr. Priya Sharma"));
        Assert.That(response.Version, Is.EqualTo(1));
        Assert.That(response.Status, Is.EqualTo(ContentStatus.Active));
        Assert.That(response.UploadedByFK, Is.EqualTo(1)); // from JWT

        _contentRepoMock.Verify(r => r.CreateAsync(It.IsAny<Content>()), Times.Once);
    }

    [Test]
    public async Task UploadContent_CourseNotFound_Returns400()
    {
        // Arrange
        _courseRepoMock.Setup(r => r.GetByIdAsync(999)).ReturnsAsync((Course?)null);

        var dto = new CreateContentDto
        {
            CourseID = 999,
            Title = "Test",
            Type = ContentType.Document,
            URI = "https://test.com/file.pdf"
        };

        // Act
        var result = await _controller.UploadContent(dto);

        // Assert
        var badRequest = result.Result as BadRequestObjectResult;
        Assert.That(badRequest, Is.Not.Null);
        Assert.That(badRequest!.StatusCode, Is.EqualTo(400));

        _contentRepoMock.Verify(r => r.CreateAsync(It.IsAny<Content>()), Times.Never);
    }

    // ════════════════════════════════════════════════════════════════
    // GET /api/content/course/{courseId} — GetByCourse
    // ════════════════════════════════════════════════════════════════

    [Test]
    public async Task GetByCourse_CourseExists_Returns200()
    {
        // Arrange
        _courseRepoMock.Setup(r => r.ExistsAsync(1)).ReturnsAsync(true);
        _contentRepoMock.Setup(r => r.GetByCourseIdWithDetailsAsync(1))
            .ReturnsAsync(new List<Content> { _testContent });

        // Act
        var result = await _controller.GetByCourse(1);

        // Assert
        var ok = result.Result as OkObjectResult;
        Assert.That(ok, Is.Not.Null);

        var list = ok!.Value as List<ContentResponseDto>;
        Assert.That(list!.Count, Is.EqualTo(1));
        Assert.That(list[0].Title, Is.EqualTo("Week 1 - Intro to Programming"));
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
    // GET /api/content/{id} — GetContent
    // ════════════════════════════════════════════════════════════════

    [Test]
    public async Task GetContent_Exists_Returns200()
    {
        // Arrange
        _contentRepoMock.Setup(r => r.GetByIdWithDetailsAsync(1)).ReturnsAsync(_testContent);

        // Act
        var result = await _controller.GetContent(1);

        // Assert
        var ok = result.Result as OkObjectResult;
        Assert.That(ok, Is.Not.Null);

        var response = ok!.Value as ContentResponseDto;
        Assert.That(response!.ContentID, Is.EqualTo(1));
        Assert.That(response.Type, Is.EqualTo(ContentType.Document));
        Assert.That(response.Version, Is.EqualTo(1));
        Assert.That(response.UploadedByName, Is.EqualTo("Dr. Priya Sharma"));
    }

    [Test]
    public async Task GetContent_NotFound_Returns404()
    {
        // Arrange
        _contentRepoMock.Setup(r => r.GetByIdWithDetailsAsync(999))
            .ReturnsAsync((Content?)null);

        // Act
        var result = await _controller.GetContent(999);

        // Assert
        var notFound = result.Result as NotFoundObjectResult;
        Assert.That(notFound, Is.Not.Null);
        Assert.That(notFound!.StatusCode, Is.EqualTo(404));
    }

    // ════════════════════════════════════════════════════════════════
    // PUT /api/content/{id}/version — UpdateVersion
    // ════════════════════════════════════════════════════════════════

    [Test]
    public async Task UpdateVersion_ActiveContent_Returns200WithBumpedVersion()
    {
        // Arrange — content is Active, version = 1
        _contentRepoMock.Setup(r => r.GetByIdWithDetailsAsync(1)).ReturnsAsync(_testContent);
        _contentRepoMock.Setup(r => r.UpdateAsync(It.IsAny<Content>()))
            .ReturnsAsync((Content c) => c);

        var dto = new UpdateContentVersionDto
        {
            URI = "https://blob.storage/week1-notes-v2.pdf",
            MetadataJSON = "{\"fileSize\": 2200000}"
        };

        // Act
        var result = await _controller.UpdateVersion(1, dto);

        // Assert
        var ok = result.Result as OkObjectResult;
        Assert.That(ok, Is.Not.Null);

        var response = ok!.Value as ContentResponseDto;
        Assert.That(response!.Version, Is.EqualTo(2)); // bumped from 1 → 2
        Assert.That(response.URI, Is.EqualTo("https://blob.storage/week1-notes-v2.pdf"));
        Assert.That(response.MetadataJSON, Is.EqualTo("{\"fileSize\": 2200000}"));

        _contentRepoMock.Verify(r => r.UpdateAsync(It.IsAny<Content>()), Times.Once);
    }

    [Test]
    public async Task UpdateVersion_ContentNotFound_Returns404()
    {
        // Arrange
        _contentRepoMock.Setup(r => r.GetByIdWithDetailsAsync(999))
            .ReturnsAsync((Content?)null);

        var dto = new UpdateContentVersionDto
        {
            URI = "https://test.com/file.pdf"
        };

        // Act
        var result = await _controller.UpdateVersion(999, dto);

        // Assert
        var notFound = result.Result as NotFoundObjectResult;
        Assert.That(notFound, Is.Not.Null);
        Assert.That(notFound!.StatusCode, Is.EqualTo(404));

        _contentRepoMock.Verify(r => r.UpdateAsync(It.IsAny<Content>()), Times.Never);
    }

    [Test]
    public async Task UpdateVersion_ArchivedContent_Returns400()
    {
        // Arrange — content is Archived, version bump should be blocked
        var archivedContent = new Content
        {
            ContentID = 2,
            CourseID = 1,
            Title = "Old Notes",
            Type = ContentType.Document,
            URI = "https://blob/old.pdf",
            UploadedByFK = 1,
            Version = 3,
            Status = ContentStatus.Archived,
            Course = _testCourse,
            UploadedBy = _testInstructor
        };
        _contentRepoMock.Setup(r => r.GetByIdWithDetailsAsync(2)).ReturnsAsync(archivedContent);

        var dto = new UpdateContentVersionDto
        {
            URI = "https://test.com/new.pdf"
        };

        // Act
        var result = await _controller.UpdateVersion(2, dto);

        // Assert
        var badRequest = result.Result as BadRequestObjectResult;
        Assert.That(badRequest, Is.Not.Null);
        Assert.That(badRequest!.StatusCode, Is.EqualTo(400));

        _contentRepoMock.Verify(r => r.UpdateAsync(It.IsAny<Content>()), Times.Never);
    }

    [Test]
    public async Task UpdateVersion_DraftContent_Returns400()
    {
        // Arrange — content is Draft, version bump should be blocked
        var draftContent = new Content
        {
            ContentID = 3,
            CourseID = 1,
            Title = "Draft Notes",
            Type = ContentType.Document,
            URI = "https://blob/draft.pdf",
            UploadedByFK = 1,
            Version = 1,
            Status = ContentStatus.Draft,
            Course = _testCourse,
            UploadedBy = _testInstructor
        };
        _contentRepoMock.Setup(r => r.GetByIdWithDetailsAsync(3)).ReturnsAsync(draftContent);

        var dto = new UpdateContentVersionDto
        {
            URI = "https://test.com/new.pdf"
        };

        // Act
        var result = await _controller.UpdateVersion(3, dto);

        // Assert
        var badRequest = result.Result as BadRequestObjectResult;
        Assert.That(badRequest, Is.Not.Null);
        Assert.That(badRequest!.StatusCode, Is.EqualTo(400));

        _contentRepoMock.Verify(r => r.UpdateAsync(It.IsAny<Content>()), Times.Never);
    }
}