using EduLearn.API.Controllers;
using EduLearn.API.DTOs;
using EduLearn.API.Models;
using EduLearn.API.Models.Enums;
using EduLearn.API.Repositories.Interfaces;
using EduLearn.API.Services;
using Microsoft.AspNetCore.Mvc;
using Moq;

namespace EduLearn_Testing.Controller;

[TestFixture]
public class ScholarshipsControllerTest
{
    // ── Mock dependencies ──
    private Mock<IScholarshipRepository> _scholarshipRepoMock;
    private Mock<IStudentRepository> _studentRepoMock;
    private Mock<INotificationService> _notificationServiceMock;

    // ── Controller under test ──
    private ScholarshipsController _controller;

    // ── Reusable test data ──
    private Student _testStudent;
    private Scholarship _activeScholarship;
    private Scholarship _revokedScholarship;

    [SetUp]
    public void Setup()
    {
        _scholarshipRepoMock = new Mock<IScholarshipRepository>();
        _studentRepoMock = new Mock<IStudentRepository>();
        _notificationServiceMock = new Mock<INotificationService>();

        _controller = new ScholarshipsController(
            _scholarshipRepoMock.Object,
            _studentRepoMock.Object,
            _notificationServiceMock.Object);

        _testStudent = new Student
        {
            StudentID = 1,
            UserID = 3,
            MRN = "STU-00001",
            Name = "Rahul Kumar",
            DOB = new DateTime(2004, 5, 15),
            ProgramID = 1,
            EntryTerm = "Fall 2026"
        };

        _activeScholarship = new Scholarship
        {
            ScholarID = 1,
            StudentID = 1,
            AwardType = "Merit Scholarship",
            Amount = 25000,
            ValidFrom = new DateTime(2026, 7, 1),
            ValidTo = new DateTime(2027, 6, 30),
            Status = ScholarshipStatus.Active,
            Student = _testStudent
        };

        _revokedScholarship = new Scholarship
        {
            ScholarID = 2,
            StudentID = 1,
            AwardType = "Need-Based Aid",
            Amount = 15000,
            ValidFrom = new DateTime(2026, 1, 1),
            ValidTo = new DateTime(2026, 6, 30),
            Status = ScholarshipStatus.Revoked,
            Student = _testStudent
        };
    }

    // ════════════════════════════════════════════════════════════════
    // POST /api/scholarships — Create
    // ════════════════════════════════════════════════════════════════

    [Test]
    public async Task Create_ValidDto_Returns201()
    {
        // Arrange
        _studentRepoMock.Setup(r => r.ExistsAsync(1)).ReturnsAsync(true);
        _scholarshipRepoMock.Setup(r => r.CreateAsync(It.IsAny<Scholarship>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Scholarship s, CancellationToken _) =>
            {
                s.ScholarID = 1;
                s.Student = _testStudent;
                return s;
            });
        _studentRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(_testStudent);

        var dto = new CreateScholarshipDto
        {
            StudentID = 1,
            AwardType = "Merit Scholarship",
            Amount = 25000,
            ValidFrom = new DateTime(2026, 7, 1),
            ValidTo = new DateTime(2027, 6, 30)
        };

        // Act
        var result = await _controller.Create(dto, CancellationToken.None);

        // Assert
        var created = result.Result as CreatedAtActionResult;
        Assert.That(created, Is.Not.Null);
        Assert.That(created!.StatusCode, Is.EqualTo(201));

        var response = created.Value as ScholarshipResponseDto;
        Assert.That(response!.AwardType, Is.EqualTo("Merit Scholarship"));
        Assert.That(response.Amount, Is.EqualTo(25000));
        Assert.That(response.Status, Is.EqualTo(ScholarshipStatus.Active));

        _scholarshipRepoMock.Verify(r => r.CreateAsync(It.IsAny<Scholarship>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Test]
    public async Task Create_StudentNotFound_Returns400()
    {
        // Arrange
        _studentRepoMock.Setup(r => r.ExistsAsync(999)).ReturnsAsync(false);

        var dto = new CreateScholarshipDto
        {
            StudentID = 999,
            AwardType = "Test",
            Amount = 1000,
            ValidFrom = new DateTime(2026, 7, 1),
            ValidTo = new DateTime(2027, 6, 30)
        };

        // Act
        var result = await _controller.Create(dto, CancellationToken.None);

        // Assert
        var badRequest = result.Result as BadRequestObjectResult;
        Assert.That(badRequest, Is.Not.Null);
        Assert.That(badRequest!.StatusCode, Is.EqualTo(400));

        _scholarshipRepoMock.Verify(r => r.CreateAsync(It.IsAny<Scholarship>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Test]
    public async Task Create_InvalidDateRange_Returns400()
    {
        // Arrange — ValidFrom AFTER ValidTo
        _studentRepoMock.Setup(r => r.ExistsAsync(1)).ReturnsAsync(true);

        var dto = new CreateScholarshipDto
        {
            StudentID = 1,
            AwardType = "Test",
            Amount = 1000,
            ValidFrom = new DateTime(2027, 6, 30), // after
            ValidTo = new DateTime(2026, 7, 1)     // before
        };

        // Act
        var result = await _controller.Create(dto, CancellationToken.None);

        // Assert
        var badRequest = result.Result as BadRequestObjectResult;
        Assert.That(badRequest, Is.Not.Null);

        _scholarshipRepoMock.Verify(r => r.CreateAsync(It.IsAny<Scholarship>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Test]
    public async Task Create_ZeroAmount_Returns400()
    {
        // Arrange — amount must be positive
        _studentRepoMock.Setup(r => r.ExistsAsync(1)).ReturnsAsync(true);

        var dto = new CreateScholarshipDto
        {
            StudentID = 1,
            AwardType = "Test",
            Amount = 0,
            ValidFrom = new DateTime(2026, 7, 1),
            ValidTo = new DateTime(2027, 6, 30)
        };

        // Act
        var result = await _controller.Create(dto, CancellationToken.None);

        // Assert
        var badRequest = result.Result as BadRequestObjectResult;
        Assert.That(badRequest, Is.Not.Null);

        _scholarshipRepoMock.Verify(r => r.CreateAsync(It.IsAny<Scholarship>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    // ════════════════════════════════════════════════════════════════
    // GET /api/scholarships/student/{studentId} — GetByStudent
    // ════════════════════════════════════════════════════════════════

    [Test]
    public async Task GetByStudent_ReturnsList()
    {
        // Arrange
        _scholarshipRepoMock.Setup(r => r.GetByStudentIdAsync(1, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Scholarship> { _activeScholarship });

        // Act
        var result = await _controller.GetByStudent(1, CancellationToken.None);

        // Assert
        var ok = result.Result as OkObjectResult;
        Assert.That(ok, Is.Not.Null);

        var list = (ok!.Value as IEnumerable<ScholarshipResponseDto>)?.ToList();
        Assert.That(list!.Count, Is.EqualTo(1));
        Assert.That(list[0].AwardType, Is.EqualTo("Merit Scholarship"));
        Assert.That(list[0].Amount, Is.EqualTo(25000));
    }

    [Test]
    public async Task GetByStudent_Empty_ReturnsEmptyList()
    {
        // Arrange
        _scholarshipRepoMock.Setup(r => r.GetByStudentIdAsync(999, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Scholarship>());

        // Act
        var result = await _controller.GetByStudent(999, CancellationToken.None);

        // Assert
        var ok = result.Result as OkObjectResult;
        var list = (ok!.Value as IEnumerable<ScholarshipResponseDto>)?.ToList();
        Assert.That(list!.Count, Is.EqualTo(0));
    }

    // ════════════════════════════════════════════════════════════════
    // PUT /api/scholarships/{id} — Update
    // ════════════════════════════════════════════════════════════════

    [Test]
    public async Task Update_ActiveToExpired_Returns200()
    {
        // Arrange
        _scholarshipRepoMock.Setup(r => r.GetByIdAsync(1, It.IsAny<CancellationToken>()))
            .ReturnsAsync(_activeScholarship);
        _scholarshipRepoMock.Setup(r => r.UpdateAsync(It.IsAny<Scholarship>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Scholarship s, CancellationToken _) => s);

        var dto = new UpdateScholarshipDto { Status = ScholarshipStatus.Expired };

        // Act
        var result = await _controller.Update(1, dto, CancellationToken.None);

        // Assert
        var ok = result.Result as OkObjectResult;
        var response = ok!.Value as ScholarshipResponseDto;
        Assert.That(response!.Status, Is.EqualTo(ScholarshipStatus.Expired));

        _scholarshipRepoMock.Verify(r => r.UpdateAsync(It.IsAny<Scholarship>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Test]
    public async Task Update_NotFound_Returns404()
    {
        // Arrange
        _scholarshipRepoMock.Setup(r => r.GetByIdAsync(999, It.IsAny<CancellationToken>()))
            .ReturnsAsync((Scholarship?)null);

        var dto = new UpdateScholarshipDto { Status = ScholarshipStatus.Active };

        // Act
        var result = await _controller.Update(999, dto, CancellationToken.None);

        // Assert
        var notFound = result.Result as NotFoundObjectResult;
        Assert.That(notFound, Is.Not.Null);
        Assert.That(notFound!.StatusCode, Is.EqualTo(404));

        _scholarshipRepoMock.Verify(r => r.UpdateAsync(It.IsAny<Scholarship>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Test]
    public async Task Update_RevokedCannotBeReactivated_Returns400()
    {
        // Arrange — M-13: Revoked is terminal
        _scholarshipRepoMock.Setup(r => r.GetByIdAsync(2, It.IsAny<CancellationToken>()))
            .ReturnsAsync(_revokedScholarship);

        var dto = new UpdateScholarshipDto { Status = ScholarshipStatus.Active }; // trying to revive

        // Act
        var result = await _controller.Update(2, dto, CancellationToken.None);

        // Assert
        var badRequest = result.Result as BadRequestObjectResult;
        Assert.That(badRequest, Is.Not.Null);
        Assert.That(badRequest!.StatusCode, Is.EqualTo(400));

        _scholarshipRepoMock.Verify(r => r.UpdateAsync(It.IsAny<Scholarship>(), It.IsAny<CancellationToken>()), Times.Never);
    }
}