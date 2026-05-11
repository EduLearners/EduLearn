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
public class SyllabiControllerTest
{
    // ── Mock dependencies ──
    private Mock<ISyllabusRepository> _syllabusRepoMock;
    private Mock<ICourseRepository> _courseRepoMock;
    private Mock<IUserRepository> _userRepoMock;

    // ── Controller under test ──
    private SyllabiController _controller;

    // ── Reusable test data ──
    private Course _testCourse;
    private User _testInstructor;
    private Syllabus _testSyllabus;

    [SetUp]
    public void Setup()
    {
        _syllabusRepoMock = new Mock<ISyllabusRepository>();
        _courseRepoMock = new Mock<ICourseRepository>();
        _userRepoMock = new Mock<IUserRepository>();

        _controller = new SyllabiController(
            _syllabusRepoMock.Object,
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

        _testSyllabus = new Syllabus
        {
            SyllabusID = 1,
            CourseID = 1,
            Version = "v1.0",
            LearningOutcomesJSON = "[\"Understand OOP\"]",
            AssessmentPlanJSON = null,
            CreatedByFK = 1,
            SyllabusURI = "https://blob/syllabus.pdf",
            Course = _testCourse,
            CreatedBy = _testInstructor
        };
    }

    // ════════════════════════════════════════════════════════════════
    // POST /api/syllabi — CreateSyllabus
    // ════════════════════════════════════════════════════════════════

    [Test]
    public async Task CreateSyllabus_ValidDto_Returns201()
    {
        // Arrange
        _courseRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(_testCourse);
        _syllabusRepoMock.Setup(r => r.VersionExistsForCourseAsync(1, "v1.0")).ReturnsAsync(false);
        _userRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(_testInstructor);
        _syllabusRepoMock.Setup(r => r.CreateAsync(It.IsAny<Syllabus>()))
            .ReturnsAsync((Syllabus s) => { s.SyllabusID = 1; return s; });

        var dto = new CreateSyllabusDto
        {
            CourseID = 1,
            Version = "v1.0",
            LearningOutcomesJSON = "[\"Understand OOP\"]",
            AssessmentPlanJSON = null,
            SyllabusURI = "https://blob/syllabus.pdf"
        };

        // Act
        var result = await _controller.CreateSyllabus(dto);

        // Assert
        var created = result.Result as ObjectResult;
        Assert.That(created, Is.Not.Null);
        Assert.That(created!.StatusCode, Is.EqualTo(201));

        var response = created.Value as SyllabusResponseDto;
        Assert.That(response!.Version, Is.EqualTo("v1.0"));
        Assert.That(response.CourseName, Is.EqualTo("Introduction to Computer Science"));
        Assert.That(response.CreatedByName, Is.EqualTo("Dr. Priya Sharma"));
        Assert.That(response.CreatedByFK, Is.EqualTo(1)); // from JWT

        _syllabusRepoMock.Verify(r => r.CreateAsync(It.IsAny<Syllabus>()), Times.Once);
    }

    [Test]
    public async Task CreateSyllabus_CourseNotFound_Returns400()
    {
        // Arrange
        _courseRepoMock.Setup(r => r.GetByIdAsync(999)).ReturnsAsync((Course?)null);

        var dto = new CreateSyllabusDto { CourseID = 999, Version = "v1.0" };

        // Act
        var result = await _controller.CreateSyllabus(dto);

        // Assert
        var badRequest = result.Result as BadRequestObjectResult;
        Assert.That(badRequest, Is.Not.Null);
        Assert.That(badRequest!.StatusCode, Is.EqualTo(400));

        _syllabusRepoMock.Verify(r => r.CreateAsync(It.IsAny<Syllabus>()), Times.Never);
    }

    [Test]
    public async Task CreateSyllabus_DuplicateVersion_Returns409()
    {
        // Arrange — v1.0 already exists for course 1
        _courseRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(_testCourse);
        _syllabusRepoMock.Setup(r => r.VersionExistsForCourseAsync(1, "v1.0")).ReturnsAsync(true);

        var dto = new CreateSyllabusDto { CourseID = 1, Version = "v1.0" };

        // Act
        var result = await _controller.CreateSyllabus(dto);

        // Assert
        var conflict = result.Result as ConflictObjectResult;
        Assert.That(conflict, Is.Not.Null);
        Assert.That(conflict!.StatusCode, Is.EqualTo(409));

        _syllabusRepoMock.Verify(r => r.CreateAsync(It.IsAny<Syllabus>()), Times.Never);
    }

    // ════════════════════════════════════════════════════════════════
    // GET /api/syllabi/course/{courseId} — GetByCourse
    // ════════════════════════════════════════════════════════════════

    [Test]
    public async Task GetByCourse_CourseExists_Returns200()
    {
        // Arrange
        _courseRepoMock.Setup(r => r.ExistsAsync(1)).ReturnsAsync(true);
        _syllabusRepoMock.Setup(r => r.GetByCourseIdWithDetailsAsync(1))
            .ReturnsAsync(new List<Syllabus> { _testSyllabus });

        // Act
        var result = await _controller.GetByCourse(1);

        // Assert
        var ok = result.Result as OkObjectResult;
        Assert.That(ok, Is.Not.Null);

        var list = ok!.Value as List<SyllabusResponseDto>;
        Assert.That(list!.Count, Is.EqualTo(1));
        Assert.That(list[0].Version, Is.EqualTo("v1.0"));
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
    // GET /api/syllabi/{id} — GetSyllabus
    // ════════════════════════════════════════════════════════════════

    [Test]
    public async Task GetSyllabus_Exists_Returns200()
    {
        // Arrange
        _syllabusRepoMock.Setup(r => r.GetByIdWithDetailsAsync(1)).ReturnsAsync(_testSyllabus);

        // Act
        var result = await _controller.GetSyllabus(1);

        // Assert
        var ok = result.Result as OkObjectResult;
        Assert.That(ok, Is.Not.Null);

        var response = ok!.Value as SyllabusResponseDto;
        Assert.That(response!.SyllabusID, Is.EqualTo(1));
        Assert.That(response.Version, Is.EqualTo("v1.0"));
        Assert.That(response.CreatedByName, Is.EqualTo("Dr. Priya Sharma"));
    }

    [Test]
    public async Task GetSyllabus_NotFound_Returns404()
    {
        // Arrange
        _syllabusRepoMock.Setup(r => r.GetByIdWithDetailsAsync(999))
            .ReturnsAsync((Syllabus?)null);

        // Act
        var result = await _controller.GetSyllabus(999);

        // Assert
        var notFound = result.Result as NotFoundObjectResult;
        Assert.That(notFound, Is.Not.Null);
        Assert.That(notFound!.StatusCode, Is.EqualTo(404));
    }

    // ════════════════════════════════════════════════════════════════
    // PUT /api/syllabi/{id} — UpdateSyllabus
    // ════════════════════════════════════════════════════════════════

    [Test]
    public async Task UpdateSyllabus_Exists_Returns200()
    {
        // Arrange
        _syllabusRepoMock.Setup(r => r.GetByIdWithDetailsAsync(1)).ReturnsAsync(_testSyllabus);
        _syllabusRepoMock.Setup(r => r.UpdateAsync(It.IsAny<Syllabus>()))
            .ReturnsAsync((Syllabus s) => s);

        var dto = new UpdateSyllabusDto
        {
            Version = "v1.0", // same version — no clash check needed
            LearningOutcomesJSON = "[\"Understand OOP\", \"Write unit tests\"]",
            AssessmentPlanJSON = "[{\"type\":\"Quiz\",\"weight\":30}]",
            SyllabusURI = "https://blob/syllabus-v1-updated.pdf"
        };

        // Act
        var result = await _controller.UpdateSyllabus(1, dto);

        // Assert
        var ok = result.Result as OkObjectResult;
        var response = ok!.Value as SyllabusResponseDto;
        Assert.That(response!.LearningOutcomesJSON, Does.Contain("Write unit tests"));
        Assert.That(response.SyllabusURI, Does.Contain("updated"));

        _syllabusRepoMock.Verify(r => r.UpdateAsync(It.IsAny<Syllabus>()), Times.Once);
    }

    [Test]
    public async Task UpdateSyllabus_NotFound_Returns404()
    {
        // Arrange
        _syllabusRepoMock.Setup(r => r.GetByIdWithDetailsAsync(999))
            .ReturnsAsync((Syllabus?)null);

        var dto = new UpdateSyllabusDto { Version = "v1.0" };

        // Act
        var result = await _controller.UpdateSyllabus(999, dto);

        // Assert
        var notFound = result.Result as NotFoundObjectResult;
        Assert.That(notFound, Is.Not.Null);

        _syllabusRepoMock.Verify(r => r.UpdateAsync(It.IsAny<Syllabus>()), Times.Never);
    }

    [Test]
    public async Task UpdateSyllabus_VersionClash_Returns409()
    {
        // Arrange — changing version from v1.0 to v2.0, but v2.0 already exists
        _syllabusRepoMock.Setup(r => r.GetByIdWithDetailsAsync(1)).ReturnsAsync(_testSyllabus);
        _syllabusRepoMock.Setup(r => r.VersionExistsForCourseAsync(1, "v2.0")).ReturnsAsync(true);

        var dto = new UpdateSyllabusDto { Version = "v2.0" };

        // Act
        var result = await _controller.UpdateSyllabus(1, dto);

        // Assert
        var conflict = result.Result as ConflictObjectResult;
        Assert.That(conflict, Is.Not.Null);
        Assert.That(conflict!.StatusCode, Is.EqualTo(409));

        _syllabusRepoMock.Verify(r => r.UpdateAsync(It.IsAny<Syllabus>()), Times.Never);
    }
}