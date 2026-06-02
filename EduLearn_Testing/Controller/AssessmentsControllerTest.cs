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
public class AssessmentsControllerTest
{
    // ── Mock dependencies ──
    private Mock<IAssessmentRepository> _assessmentRepoMock;
    private Mock<ICourseRepository> _courseRepoMock;
    private Mock<IUserRepository> _userRepoMock;
    private Mock<ISectionRepository> _sectionRepoMock;
    private Mock<IEnrollmentRepository> _enrollmentRepoMock;
    private Mock<IStudentRepository> _studentRepoMock;
    private Mock<INotificationService> _notificationServiceMock;

    // ── Controller under test ──
    private AssessmentsController _controller;

    // ── Reusable test data ──
    private Course _testCourse;
    private User _testInstructor;

    [SetUp]
    public void Setup()
    {
        // Create fresh mocks for each test — prevents state leaking between tests
        _assessmentRepoMock = new Mock<IAssessmentRepository>();
        _courseRepoMock = new Mock<ICourseRepository>();
        _userRepoMock = new Mock<IUserRepository>();
        _sectionRepoMock = new Mock<ISectionRepository>();
        _enrollmentRepoMock = new Mock<IEnrollmentRepository>();
        _studentRepoMock = new Mock<IStudentRepository>();
        _notificationServiceMock = new Mock<INotificationService>();

        // Create the controller with all 7 mocked dependencies
        _controller = new AssessmentsController(
            _assessmentRepoMock.Object,
            _courseRepoMock.Object,
            _userRepoMock.Object,
            _sectionRepoMock.Object,
            _enrollmentRepoMock.Object,
            _studentRepoMock.Object,
            _notificationServiceMock.Object);

        // Simulate a logged-in Instructor with UserID = 1
        // This is what JWT middleware does in production — populates User claims
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, "1"),
            new Claim(ClaimTypes.Role, "Instructor"),
            new Claim(ClaimTypes.Name, "dr.priya")
        };
        var identity = new ClaimsIdentity(claims, "TestAuth");
        var principal = new ClaimsPrincipal(identity);

        _controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = principal }
        };

        // Reusable test data
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
    }

    // ════════════════════════════════════════════════════════════════
    // POST /api/assessments — CreateAssessment
    // ════════════════════════════════════════════════════════════════

    [Test]
    public async Task CreateAssessment_ValidDto_Returns201WithResponseDto()
    {
        // Arrange — setup what the mocks return when called
        _courseRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(_testCourse);
        _userRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(_testInstructor);
        _assessmentRepoMock.Setup(r => r.CreateAsync(It.IsAny<Assessment>()))
            .ReturnsAsync((Assessment a) =>
            {
                a.AssessmentID = 1; // simulate DB generating ID
                return a;
            });

        var dto = new CreateAssessmentDto
        {
            CourseID = 1,
            Title = "Quiz 1",
            Type = AssessmentType.Quiz,
            DueAt = DateTime.UtcNow.AddDays(30),
            MaxScore = 50,
            CreatedByFK = 1
        };

        // Act
        var result = await _controller.CreateAssessment(dto);

        // Assert
        var createdResult = result.Result as CreatedAtActionResult;
        Assert.That(createdResult, Is.Not.Null);
        Assert.That(createdResult!.StatusCode, Is.EqualTo(201));

        var response = createdResult.Value as AssessmentResponseDto;
        Assert.That(response, Is.Not.Null);
        Assert.That(response!.Title, Is.EqualTo("Quiz 1"));
        Assert.That(response.CourseName, Is.EqualTo("Introduction to Computer Science"));
        Assert.That(response.CreatedByName, Is.EqualTo("Dr. Priya Sharma"));
        Assert.That(response.Status, Is.EqualTo(AssessmentStatus.Draft));
        Assert.That(response.CreatedByFK, Is.EqualTo(1)); // from JWT, not dto

        // Verify repository was called exactly once
        _assessmentRepoMock.Verify(r => r.CreateAsync(It.IsAny<Assessment>()), Times.Once);
    }

    [Test]
    public async Task CreateAssessment_CourseNotFound_Returns400()
    {
        // Arrange — course does not exist
        _courseRepoMock.Setup(r => r.GetByIdAsync(999)).ReturnsAsync((Course?)null);

        var dto = new CreateAssessmentDto
        {
            CourseID = 999,
            Title = "Test",
            Type = AssessmentType.Quiz,
            MaxScore = 50,
            CreatedByFK = 1
        };

        // Act
        var result = await _controller.CreateAssessment(dto);

        // Assert
        var badRequest = result.Result as BadRequestObjectResult;
        Assert.That(badRequest, Is.Not.Null);
        Assert.That(badRequest!.StatusCode, Is.EqualTo(400));

        // Verify CreateAsync was never called — validation stopped it
        _assessmentRepoMock.Verify(r => r.CreateAsync(It.IsAny<Assessment>()), Times.Never);
    }

    [Test]
    public async Task CreateAssessment_SectionNotFound_Returns400()
    {
        // Arrange — course exists but section does not
        _courseRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(_testCourse);
        _sectionRepoMock.Setup(r => r.ExistsAsync(999)).ReturnsAsync(false);

        var dto = new CreateAssessmentDto
        {
            CourseID = 1,
            SectionID = 999,
            Title = "Test",
            Type = AssessmentType.Quiz,
            MaxScore = 50,
            CreatedByFK = 1
        };

        // Act
        var result = await _controller.CreateAssessment(dto);

        // Assert
        var badRequest = result.Result as BadRequestObjectResult;
        Assert.That(badRequest, Is.Not.Null);
        Assert.That(badRequest!.StatusCode, Is.EqualTo(400));
    }

    [Test]
    public async Task CreateAssessment_UserNotFound_Returns400()
    {
        // Arrange — course exists, JWT has UserID=1, but user record not found
        _courseRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(_testCourse);
        _userRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync((User?)null);

        var dto = new CreateAssessmentDto
        {
            CourseID = 1,
            Title = "Test",
            Type = AssessmentType.Quiz,
            MaxScore = 50,
            CreatedByFK = 1
        };

        // Act
        var result = await _controller.CreateAssessment(dto);

        // Assert
        var badRequest = result.Result as BadRequestObjectResult;
        Assert.That(badRequest, Is.Not.Null);
    }

    [Test]
    public async Task CreateAssessment_CreatedByFK_ComesFromJWT_NotBody()
    {
        // Arrange — dto says CreatedByFK=999 but JWT says UserID=1
        _courseRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(_testCourse);
        _userRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(_testInstructor);
        _assessmentRepoMock.Setup(r => r.CreateAsync(It.IsAny<Assessment>()))
            .ReturnsAsync((Assessment a) => { a.AssessmentID = 1; return a; });

        var dto = new CreateAssessmentDto
        {
            CourseID = 1,
            Title = "Test",
            Type = AssessmentType.Quiz,
            MaxScore = 50,
            CreatedByFK = 999 // trying to fake attribution
        };

        // Act
        var result = await _controller.CreateAssessment(dto);

        // Assert — CreatedByFK should be 1 (from JWT) not 999 (from body)
        var createdResult = result.Result as CreatedAtActionResult;
        var response = createdResult!.Value as AssessmentResponseDto;
        Assert.That(response!.CreatedByFK, Is.EqualTo(1)); // JWT wins over body
    }

    // ════════════════════════════════════════════════════════════════
    // GET /api/assessments/course/{courseId} — GetAssessmentsByCourse
    // ════════════════════════════════════════════════════════════════

    [Test]
    public async Task GetByCourse_CourseExists_Returns200WithList()
    {
        // Arrange
        _courseRepoMock.Setup(r => r.ExistsAsync(1)).ReturnsAsync(true);
        _assessmentRepoMock.Setup(r => r.GetByCourseIdWithDetailsAsync(1))
            .ReturnsAsync(new List<Assessment>
            {
                new Assessment
                {
                    AssessmentID = 1, CourseID = 1, Title = "Quiz 1",
                    Type = AssessmentType.Quiz, MaxScore = 50,
                    Status = AssessmentStatus.Draft, CreatedByFK = 1,
                    Course = _testCourse, CreatedBy = _testInstructor
                },
                new Assessment
                {
                    AssessmentID = 2, CourseID = 1, Title = "Assignment 1",
                    Type = AssessmentType.Assignment, MaxScore = 100,
                    Status = AssessmentStatus.Published, CreatedByFK = 1,
                    Course = _testCourse, CreatedBy = _testInstructor
                }
            });

        // Act
        var result = await _controller.GetAssessmentsByCourse(1);

        // Assert
        var okResult = result.Result as OkObjectResult;
        Assert.That(okResult, Is.Not.Null);
        Assert.That(okResult!.StatusCode, Is.EqualTo(200));

        var list = okResult.Value as List<AssessmentResponseDto>;
        Assert.That(list, Is.Not.Null);
        Assert.That(list!.Count, Is.EqualTo(2));
        Assert.That(list[0].CourseName, Is.EqualTo("Introduction to Computer Science"));
        Assert.That(list[1].Status, Is.EqualTo(AssessmentStatus.Published));
    }

    [Test]
    public async Task GetByCourse_CourseNotFound_Returns404()
    {
        // Arrange
        _courseRepoMock.Setup(r => r.ExistsAsync(999)).ReturnsAsync(false);

        // Act
        var result = await _controller.GetAssessmentsByCourse(999);

        // Assert
        var notFound = result.Result as NotFoundObjectResult;
        Assert.That(notFound, Is.Not.Null);
        Assert.That(notFound!.StatusCode, Is.EqualTo(404));
    }

    [Test]
    public async Task GetByCourse_NoneExist_ReturnsEmptyList()
    {
        // Arrange
        _courseRepoMock.Setup(r => r.ExistsAsync(1)).ReturnsAsync(true);
        _assessmentRepoMock.Setup(r => r.GetByCourseIdWithDetailsAsync(1))
            .ReturnsAsync(new List<Assessment>());

        // Act
        var result = await _controller.GetAssessmentsByCourse(1);

        // Assert
        var okResult = result.Result as OkObjectResult;
        var list = okResult!.Value as List<AssessmentResponseDto>;
        Assert.That(list!.Count, Is.EqualTo(0));
    }

    // ════════════════════════════════════════════════════════════════
    // PUT /api/assessments/{id} — UpdateAssessment
    // ════════════════════════════════════════════════════════════════

    [Test]
    public async Task UpdateAssessment_DraftStatus_Returns200()
    {
        // Arrange — assessment is Draft, update should succeed
        var existing = new Assessment
        {
            AssessmentID = 1,
            CourseID = 1,
            Title = "Old Title",
            Type = AssessmentType.Quiz,
            MaxScore = 50,
            Status = AssessmentStatus.Draft,
            CreatedByFK = 1,
            Course = _testCourse,
            CreatedBy = _testInstructor
        };
        _assessmentRepoMock.Setup(r => r.GetByIdWithDetailsAsync(1)).ReturnsAsync(existing);
        _assessmentRepoMock.Setup(r => r.UpdateAsync(It.IsAny<Assessment>()))
            .ReturnsAsync((Assessment a) => a);

        var dto = new UpdateAssessmentDto
        {
            Title = "Updated Title",
            Type = AssessmentType.Assignment,
            MaxScore = 100,
            DueAt = DateTime.UtcNow.AddDays(30)
        };

        // Act
        var result = await _controller.UpdateAssessment(1, dto);

        // Assert
        var okResult = result.Result as OkObjectResult;
        Assert.That(okResult, Is.Not.Null);

        var response = okResult!.Value as AssessmentResponseDto;
        Assert.That(response!.Title, Is.EqualTo("Updated Title"));
        Assert.That(response.MaxScore, Is.EqualTo(100));
        Assert.That(response.Type, Is.EqualTo(AssessmentType.Assignment));
        Assert.That(response.Status, Is.EqualTo(AssessmentStatus.Draft)); // status unchanged

        _assessmentRepoMock.Verify(r => r.UpdateAsync(It.IsAny<Assessment>()), Times.Once);
    }

    [Test]
    public async Task UpdateAssessment_NotFound_Returns404()
    {
        // Arrange
        _assessmentRepoMock.Setup(r => r.GetByIdWithDetailsAsync(999))
            .ReturnsAsync((Assessment?)null);

        var dto = new UpdateAssessmentDto { Title = "Test", Type = AssessmentType.Quiz, MaxScore = 50 };

        // Act
        var result = await _controller.UpdateAssessment(999, dto);

        // Assert
        var notFound = result.Result as NotFoundObjectResult;
        Assert.That(notFound, Is.Not.Null);
        Assert.That(notFound!.StatusCode, Is.EqualTo(404));
    }

    [Test]
    public async Task UpdateAssessment_PublishedStatus_Returns400_NotDraft()
    {
        // Arrange — assessment is Published, update should be blocked
        var existing = new Assessment
        {
            AssessmentID = 1,
            CourseID = 1,
            Title = "Locked",
            Status = AssessmentStatus.Published,
            CreatedByFK = 1,
            Course = _testCourse,
            CreatedBy = _testInstructor
        };
        _assessmentRepoMock.Setup(r => r.GetByIdWithDetailsAsync(1)).ReturnsAsync(existing);

        var dto = new UpdateAssessmentDto { Title = "Try Update", Type = AssessmentType.Quiz, MaxScore = 50 };

        // Act
        var result = await _controller.UpdateAssessment(1, dto);

        // Assert
        var badRequest = result.Result as BadRequestObjectResult;
        Assert.That(badRequest, Is.Not.Null);
        Assert.That(badRequest!.StatusCode, Is.EqualTo(400));

        // Verify UpdateAsync was never called — business rule blocked it
        _assessmentRepoMock.Verify(r => r.UpdateAsync(It.IsAny<Assessment>()), Times.Never);
    }

    [Test]
    public async Task UpdateAssessment_ClosedStatus_Returns400_NotDraft()
    {
        // Arrange
        var existing = new Assessment
        {
            AssessmentID = 1,
            Status = AssessmentStatus.Closed,
            Course = _testCourse,
            CreatedBy = _testInstructor
        };
        _assessmentRepoMock.Setup(r => r.GetByIdWithDetailsAsync(1)).ReturnsAsync(existing);

        var dto = new UpdateAssessmentDto { Title = "Try", Type = AssessmentType.Quiz, MaxScore = 50 };

        // Act
        var result = await _controller.UpdateAssessment(1, dto);

        // Assert
        Assert.That(result.Result, Is.InstanceOf<BadRequestObjectResult>());
    }

    // ════════════════════════════════════════════════════════════════
    // PUT /api/assessments/{id}/publish — PublishAssessment
    // ════════════════════════════════════════════════════════════════

    [Test]
    public async Task PublishAssessment_DraftToPublished_Returns200()
    {
        // Arrange
        var existing = new Assessment
        {
            AssessmentID = 1,
            Status = AssessmentStatus.Draft,
            Course = _testCourse,
            CreatedBy = _testInstructor
        };
        _assessmentRepoMock.Setup(r => r.GetByIdWithDetailsAsync(1)).ReturnsAsync(existing);
        _assessmentRepoMock.Setup(r => r.UpdateAsync(It.IsAny<Assessment>()))
            .ReturnsAsync((Assessment a) => a);

        var dto = new UpdateAssessmentStatusDto { Status = AssessmentStatus.Published };

        // Act
        var result = await _controller.PublishAssessment(1, dto);

        // Assert
        var okResult = result.Result as OkObjectResult;
        var response = okResult!.Value as AssessmentResponseDto;
        Assert.That(response!.Status, Is.EqualTo(AssessmentStatus.Published));
    }

    [Test]
    public async Task PublishAssessment_PublishedToClosed_Returns200()
    {
        // Arrange
        var existing = new Assessment
        {
            AssessmentID = 1,
            Status = AssessmentStatus.Published,
            Course = _testCourse,
            CreatedBy = _testInstructor
        };
        _assessmentRepoMock.Setup(r => r.GetByIdWithDetailsAsync(1)).ReturnsAsync(existing);
        _assessmentRepoMock.Setup(r => r.UpdateAsync(It.IsAny<Assessment>()))
            .ReturnsAsync((Assessment a) => a);

        var dto = new UpdateAssessmentStatusDto { Status = AssessmentStatus.Closed };

        // Act
        var result = await _controller.PublishAssessment(1, dto);

        // Assert
        var okResult = result.Result as OkObjectResult;
        var response = okResult!.Value as AssessmentResponseDto;
        Assert.That(response!.Status, Is.EqualTo(AssessmentStatus.Closed));
    }

    [Test]
    public async Task PublishAssessment_ClosedToArchived_Returns200()
    {
        // Arrange
        var existing = new Assessment
        {
            AssessmentID = 1,
            Status = AssessmentStatus.Closed,
            Course = _testCourse,
            CreatedBy = _testInstructor
        };
        _assessmentRepoMock.Setup(r => r.GetByIdWithDetailsAsync(1)).ReturnsAsync(existing);
        _assessmentRepoMock.Setup(r => r.UpdateAsync(It.IsAny<Assessment>()))
            .ReturnsAsync((Assessment a) => a);

        var dto = new UpdateAssessmentStatusDto { Status = AssessmentStatus.Archived };

        // Act
        var result = await _controller.PublishAssessment(1, dto);

        // Assert
        var okResult = result.Result as OkObjectResult;
        var response = okResult!.Value as AssessmentResponseDto;
        Assert.That(response!.Status, Is.EqualTo(AssessmentStatus.Archived));
    }

    [Test]
    public async Task PublishAssessment_InvalidTransition_DraftToClosed_Returns400()
    {
        // Arrange — cannot skip Draft → Closed (must go Draft → Published → Closed)
        var existing = new Assessment
        {
            AssessmentID = 1,
            Status = AssessmentStatus.Draft,
            Course = _testCourse,
            CreatedBy = _testInstructor
        };
        _assessmentRepoMock.Setup(r => r.GetByIdWithDetailsAsync(1)).ReturnsAsync(existing);

        var dto = new UpdateAssessmentStatusDto { Status = AssessmentStatus.Closed };

        // Act
        var result = await _controller.PublishAssessment(1, dto);

        // Assert
        var badRequest = result.Result as BadRequestObjectResult;
        Assert.That(badRequest, Is.Not.Null);
        Assert.That(badRequest!.StatusCode, Is.EqualTo(400));

        // Verify UpdateAsync was never called
        _assessmentRepoMock.Verify(r => r.UpdateAsync(It.IsAny<Assessment>()), Times.Never);
    }

    [Test]
    public async Task PublishAssessment_InvalidTransition_ClosedToPublished_Returns400()
    {
        // Arrange — cannot go backwards Closed → Published
        var existing = new Assessment
        {
            AssessmentID = 1,
            Status = AssessmentStatus.Closed,
            Course = _testCourse,
            CreatedBy = _testInstructor
        };
        _assessmentRepoMock.Setup(r => r.GetByIdWithDetailsAsync(1)).ReturnsAsync(existing);

        var dto = new UpdateAssessmentStatusDto { Status = AssessmentStatus.Published };

        // Act
        var result = await _controller.PublishAssessment(1, dto);

        // Assert
        Assert.That(result.Result, Is.InstanceOf<BadRequestObjectResult>());
    }

    [Test]
    public async Task PublishAssessment_NotFound_Returns404()
    {
        // Arrange
        _assessmentRepoMock.Setup(r => r.GetByIdWithDetailsAsync(999))
            .ReturnsAsync((Assessment?)null);

        var dto = new UpdateAssessmentStatusDto { Status = AssessmentStatus.Published };

        // Act
        var result = await _controller.PublishAssessment(999, dto);

        // Assert
        Assert.That(result.Result, Is.InstanceOf<NotFoundObjectResult>());
    }
}