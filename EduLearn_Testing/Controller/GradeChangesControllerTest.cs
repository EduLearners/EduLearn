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
public class GradeChangesControllerTest
{
    // ── Mock dependencies ──
    private Mock<IGradeChangeRepository> _gradeChangeRepoMock;
    private Mock<ISubmissionRepository> _submissionRepoMock;
    private Mock<IUserRepository> _userRepoMock;

    // ── Controller under test ──
    private GradeChangesController _controller;

    // ── Reusable test data ──
    private User _testInstructor;
    private Submission _testSubmission;

    [SetUp]
    public void Setup()
    {
        _gradeChangeRepoMock = new Mock<IGradeChangeRepository>();
        _submissionRepoMock = new Mock<ISubmissionRepository>();
        _userRepoMock = new Mock<IUserRepository>();

        _controller = new GradeChangesController(
            _gradeChangeRepoMock.Object,
            _submissionRepoMock.Object,
            _userRepoMock.Object);

        // Simulate logged-in Instructor with UserID = 2
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, "2"),
            new Claim(ClaimTypes.Role, "Instructor")
        };
        var identity = new ClaimsIdentity(claims, "TestAuth");
        var principal = new ClaimsPrincipal(identity);
        _controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = principal }
        };

        _testInstructor = new User
        {
            UserID = 2,
            Username = "dr.priya",
            FullName = "Dr. Priya Sharma",
            Email = "priya@edulearn.com",
            Role = UserRole.Instructor,
            PasswordHash = "hashed",
            Status = UserStatus.Active
        };

        _testSubmission = new Submission
        {
            SubmissionID = 1,
            AssessmentID = 1,
            StudentID = 1,
            Score = 40.0m,
            Status = SubmissionStatus.Graded
        };
    }

    // ════════════════════════════════════════════════════════════════
    // POST /api/grade-changes — CreateGradeChange
    // ════════════════════════════════════════════════════════════════

    [Test]
    public async Task CreateGradeChange_ValidDto_Returns201()
    {
        // Arrange
        _submissionRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(_testSubmission);
        _userRepoMock.Setup(r => r.GetByIdAsync(2)).ReturnsAsync(_testInstructor);
        _gradeChangeRepoMock.Setup(r => r.CreateAsync(It.IsAny<GradeChange>()))
            .ReturnsAsync((GradeChange gc) => { gc.GradeChangeID = 1; return gc; });

        var dto = new CreateGradeChangeDto
        {
            SubmissionID = 1,
            OldScore = 40.0m,
            NewScore = 45.0m,
            Reason = "Found partial credit on Q3",
            AuditNote = "Approved by department head"
        };

        // Act
        var result = await _controller.CreateGradeChange(dto);

        // Assert
        var created = result.Result as ObjectResult;
        Assert.That(created, Is.Not.Null);
        Assert.That(created!.StatusCode, Is.EqualTo(201));

        var response = created.Value as GradeChangeResponseDto;
        Assert.That(response!.OldScore, Is.EqualTo(40.0m));
        Assert.That(response.NewScore, Is.EqualTo(45.0m));
        Assert.That(response.ChangedByName, Is.EqualTo("Dr. Priya Sharma"));
        Assert.That(response.ChangedByFK, Is.EqualTo(2)); // from JWT, not body
        Assert.That(response.Reason, Is.EqualTo("Found partial credit on Q3"));
        Assert.That(response.AuditNote, Is.EqualTo("Approved by department head"));

        _gradeChangeRepoMock.Verify(r => r.CreateAsync(It.IsAny<GradeChange>()), Times.Once);
    }

    [Test]
    public async Task CreateGradeChange_SubmissionNotFound_Returns404()
    {
        // Arrange
        _submissionRepoMock.Setup(r => r.GetByIdAsync(999))
            .ReturnsAsync((Submission?)null);

        var dto = new CreateGradeChangeDto
        {
            SubmissionID = 999,
            OldScore = 40,
            NewScore = 45,
            Reason = "Test"
        };

        // Act
        var result = await _controller.CreateGradeChange(dto);

        // Assert
        var notFound = result.Result as NotFoundObjectResult;
        Assert.That(notFound, Is.Not.Null);
        Assert.That(notFound!.StatusCode, Is.EqualTo(404));

        _gradeChangeRepoMock.Verify(r => r.CreateAsync(It.IsAny<GradeChange>()), Times.Never);
    }

    [Test]
    public async Task CreateGradeChange_ChangedByFK_ComesFromJWT()
    {
        // Arrange — even if someone tried to fake ChangedByFK, JWT wins
        _submissionRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(_testSubmission);
        _userRepoMock.Setup(r => r.GetByIdAsync(2)).ReturnsAsync(_testInstructor);
        _gradeChangeRepoMock.Setup(r => r.CreateAsync(It.IsAny<GradeChange>()))
            .ReturnsAsync((GradeChange gc) => { gc.GradeChangeID = 2; return gc; });

        var dto = new CreateGradeChangeDto
        {
            SubmissionID = 1,
            OldScore = 40,
            NewScore = 45,
            Reason = "Test"
            // NOTE: ChangedByFK is NOT in the DTO — always comes from JWT
        };

        // Act
        var result = await _controller.CreateGradeChange(dto);

        // Assert — ChangedByFK should be 2 (from JWT)
        var created = result.Result as ObjectResult;
        var response = created!.Value as GradeChangeResponseDto;
        Assert.That(response!.ChangedByFK, Is.EqualTo(2));
    }

    // ════════════════════════════════════════════════════════════════
    // GET /api/grade-changes/submission/{submissionId} — GetBySubmission
    // ════════════════════════════════════════════════════════════════

    [Test]
    public async Task GetBySubmission_Exists_Returns200WithList()
    {
        // Arrange
        _submissionRepoMock.Setup(r => r.ExistsAsync(1)).ReturnsAsync(true);
        _gradeChangeRepoMock.Setup(r => r.GetBySubmissionIdWithDetailsAsync(1))
            .ReturnsAsync(new List<GradeChange>
            {
                new GradeChange
                {
                    GradeChangeID = 1, SubmissionID = 1,
                    OldScore = 40.0m, NewScore = 45.0m,
                    ChangedByFK = 2, Reason = "Partial credit",
                    AuditNote = "Re-graded from 40 to 45",
                    ChangedBy = _testInstructor
                },
                new GradeChange
                {
                    GradeChangeID = 2, SubmissionID = 1,
                    OldScore = 45.0m, NewScore = 48.0m,
                    ChangedByFK = 2, Reason = "Final adjustment",
                    AuditNote = null,
                    ChangedBy = _testInstructor
                }
            });

        // Act
        var result = await _controller.GetBySubmission(1);

        // Assert
        var ok = result.Result as OkObjectResult;
        Assert.That(ok, Is.Not.Null);
        Assert.That(ok!.StatusCode, Is.EqualTo(200));

        var list = ok.Value as List<GradeChangeResponseDto>;
        Assert.That(list!.Count, Is.EqualTo(2));
        Assert.That(list[0].OldScore, Is.EqualTo(40.0m));
        Assert.That(list[0].NewScore, Is.EqualTo(45.0m));
        Assert.That(list[0].ChangedByName, Is.EqualTo("Dr. Priya Sharma"));
        Assert.That(list[1].OldScore, Is.EqualTo(45.0m));
        Assert.That(list[1].NewScore, Is.EqualTo(48.0m));
    }

    [Test]
    public async Task GetBySubmission_SubmissionNotFound_Returns404()
    {
        // Arrange
        _submissionRepoMock.Setup(r => r.ExistsAsync(999)).ReturnsAsync(false);

        // Act
        var result = await _controller.GetBySubmission(999);

        // Assert
        var notFound = result.Result as NotFoundObjectResult;
        Assert.That(notFound, Is.Not.Null);
        Assert.That(notFound!.StatusCode, Is.EqualTo(404));
    }

    [Test]
    public async Task GetBySubmission_NoGradeChanges_ReturnsEmptyList()
    {
        // Arrange — submission exists but was never re-graded
        _submissionRepoMock.Setup(r => r.ExistsAsync(1)).ReturnsAsync(true);
        _gradeChangeRepoMock.Setup(r => r.GetBySubmissionIdWithDetailsAsync(1))
            .ReturnsAsync(new List<GradeChange>());

        // Act
        var result = await _controller.GetBySubmission(1);

        // Assert
        var ok = result.Result as OkObjectResult;
        var list = ok!.Value as List<GradeChangeResponseDto>;
        Assert.That(list!.Count, Is.EqualTo(0));
    }
}