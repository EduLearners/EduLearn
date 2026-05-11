using EduLearn.API.Controllers;
using EduLearn.API.DTOs;
using EduLearn.API.Models;
using EduLearn.API.Models.Enums;
using EduLearn.API.Repositories.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Moq;

namespace EduLearn_Testing.Controller;

[TestFixture]
public class SectionsControllerTest
{
    // ── Mock dependencies ──
    private Mock<ISectionRepository> _sectionRepoMock;
    private Mock<ICourseRepository> _courseRepoMock;
    private Mock<IUserRepository> _userRepoMock;
    private Mock<IRoomRepository> _roomRepoMock;

    // ── Controller under test ──
    private SectionsController _controller;

    // ── Reusable test data ──
    private Course _testCourse;
    private User _testInstructor;
    private Section _testSection;
    private CreateSectionDto _validCreateDto;

    [SetUp]
    public void Setup()
    {
        _sectionRepoMock = new Mock<ISectionRepository>();
        _courseRepoMock = new Mock<ICourseRepository>();
        _userRepoMock = new Mock<IUserRepository>();
        _roomRepoMock = new Mock<IRoomRepository>();

        _controller = new SectionsController(
            _sectionRepoMock.Object,
            _courseRepoMock.Object,
            _userRepoMock.Object,
            _roomRepoMock.Object);

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
            UserID = 2,
            Username = "dr.priya",
            FullName = "Dr. Priya Sharma",
            Email = "priya@edulearn.com",
            Role = UserRole.Instructor,
            PasswordHash = "hashed",
            Status = UserStatus.Active
        };

        _testSection = new Section
        {
            SectionID = 1,
            CourseID = 1,
            Term = "Fall 2026",
            InstructorID = 2,
            RoomID = null,
            Capacity = 30,
            EnrolledCount = 10,
            Status = SectionStatus.Open
        };

        _validCreateDto = new CreateSectionDto
        {
            CourseID = 1,
            Term = "Fall 2026",
            InstructorID = 2,
            RoomID = null,
            Capacity = 30,
            ScheduleJSON = null
        };
    }

    // ════════════════════════════════════════════════════════════════
    // POST /api/sections — CreateSection
    // ════════════════════════════════════════════════════════════════

    [Test]
    public async Task CreateSection_ValidDto_Returns201()
    {
        // Arrange
        _courseRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(_testCourse);
        _userRepoMock.Setup(r => r.GetByIdAsync(2)).ReturnsAsync(_testInstructor);
        _sectionRepoMock.Setup(r => r.CreateAsync(It.IsAny<Section>()))
            .ReturnsAsync((Section s) => { s.SectionID = 1; return s; });

        // Act
        var result = await _controller.CreateSection(_validCreateDto, CancellationToken.None);

        // Assert
        var created = result.Result as CreatedAtActionResult;
        Assert.That(created, Is.Not.Null);
        Assert.That(created!.StatusCode, Is.EqualTo(201));

        var response = created.Value as SectionResponseDto;
        Assert.That(response!.CourseName, Is.EqualTo("Introduction to Computer Science"));
        Assert.That(response.InstructorName, Is.EqualTo("Dr. Priya Sharma"));
        Assert.That(response.Term, Is.EqualTo("Fall 2026"));
        Assert.That(response.Capacity, Is.EqualTo(30));
        Assert.That(response.Status, Is.EqualTo(SectionStatus.Open));

        _sectionRepoMock.Verify(r => r.CreateAsync(It.IsAny<Section>()), Times.Once);
    }

    [Test]
    public async Task CreateSection_CourseNotFound_Returns400()
    {
        // Arrange
        _courseRepoMock.Setup(r => r.GetByIdAsync(999)).ReturnsAsync((Course?)null);

        var dto = new CreateSectionDto
        {
            CourseID = 999,
            Term = "Fall 2026",
            InstructorID = 2,
            Capacity = 30
        };

        // Act
        var result = await _controller.CreateSection(dto, CancellationToken.None);

        // Assert
        var badRequest = result.Result as BadRequestObjectResult;
        Assert.That(badRequest, Is.Not.Null);
        Assert.That(badRequest!.StatusCode, Is.EqualTo(400));

        _sectionRepoMock.Verify(r => r.CreateAsync(It.IsAny<Section>()), Times.Never);
    }

    [Test]
    public async Task CreateSection_InstructorNotFound_Returns400()
    {
        // Arrange
        _courseRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(_testCourse);
        _userRepoMock.Setup(r => r.GetByIdAsync(999)).ReturnsAsync((User?)null);

        var dto = new CreateSectionDto
        {
            CourseID = 1,
            Term = "Fall 2026",
            InstructorID = 999,
            Capacity = 30
        };

        // Act
        var result = await _controller.CreateSection(dto, CancellationToken.None);

        // Assert
        var badRequest = result.Result as BadRequestObjectResult;
        Assert.That(badRequest, Is.Not.Null);

        _sectionRepoMock.Verify(r => r.CreateAsync(It.IsAny<Section>()), Times.Never);
    }

    [Test]
    public async Task CreateSection_UserNotInstructor_Returns400()
    {
        // Arrange — user exists but has Student role, not Instructor
        _courseRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(_testCourse);
        var studentUser = new User
        {
            UserID = 3,
            Username = "rahul.s",
            FullName = "Rahul Kumar",
            Email = "rahul@test.com",
            Role = UserRole.Student,
            PasswordHash = "hash",
            Status = UserStatus.Active
        };
        _userRepoMock.Setup(r => r.GetByIdAsync(3)).ReturnsAsync(studentUser);

        var dto = new CreateSectionDto
        {
            CourseID = 1,
            Term = "Fall 2026",
            InstructorID = 3,
            Capacity = 30
        };

        // Act
        var result = await _controller.CreateSection(dto, CancellationToken.None);

        // Assert
        var badRequest = result.Result as BadRequestObjectResult;
        Assert.That(badRequest, Is.Not.Null);

        _sectionRepoMock.Verify(r => r.CreateAsync(It.IsAny<Section>()), Times.Never);
    }

    [Test]
    public async Task CreateSection_RoomNotFound_Returns400()
    {
        // Arrange
        _courseRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(_testCourse);
        _userRepoMock.Setup(r => r.GetByIdAsync(2)).ReturnsAsync(_testInstructor);
        _roomRepoMock.Setup(r => r.ExistsAsync(999)).ReturnsAsync(false);

        var dto = new CreateSectionDto
        {
            CourseID = 1,
            Term = "Fall 2026",
            InstructorID = 2,
            RoomID = 999,
            Capacity = 30
        };

        // Act
        var result = await _controller.CreateSection(dto, CancellationToken.None);

        // Assert
        var badRequest = result.Result as BadRequestObjectResult;
        Assert.That(badRequest, Is.Not.Null);

        _sectionRepoMock.Verify(r => r.CreateAsync(It.IsAny<Section>()), Times.Never);
    }

    // ════════════════════════════════════════════════════════════════
    // GET /api/sections/{id} — GetSection
    // ════════════════════════════════════════════════════════════════

    [Test]
    public async Task GetSection_Exists_Returns200()
    {
        // Arrange
        _sectionRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(_testSection);
        _courseRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(_testCourse);
        _userRepoMock.Setup(r => r.GetByIdAsync(2)).ReturnsAsync(_testInstructor);

        // Act
        var result = await _controller.GetSection(1, CancellationToken.None);

        // Assert
        var ok = result.Result as OkObjectResult;
        Assert.That(ok, Is.Not.Null);

        var response = ok!.Value as SectionResponseDto;
        Assert.That(response!.SectionID, Is.EqualTo(1));
        Assert.That(response.CourseName, Is.EqualTo("Introduction to Computer Science"));
        Assert.That(response.InstructorName, Is.EqualTo("Dr. Priya Sharma"));
    }

    [Test]
    public async Task GetSection_NotFound_Returns404()
    {
        // Arrange
        _sectionRepoMock.Setup(r => r.GetByIdAsync(999)).ReturnsAsync((Section?)null);

        // Act
        var result = await _controller.GetSection(999, CancellationToken.None);

        // Assert
        var notFound = result.Result as NotFoundObjectResult;
        Assert.That(notFound, Is.Not.Null);
        Assert.That(notFound!.StatusCode, Is.EqualTo(404));
    }

    // ════════════════════════════════════════════════════════════════
    // GET /api/sections/course/{courseId}/term/{term} — GetByCourseAndTerm
    // ════════════════════════════════════════════════════════════════

    [Test]
    public async Task GetByCourseAndTerm_Found_Returns200()
    {
        // Arrange
        _courseRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(_testCourse);
        _sectionRepoMock.Setup(r => r.GetByCourseAndTermAsync(1, "Fall 2026"))
            .ReturnsAsync(new List<Section> { _testSection });
        _userRepoMock.Setup(r => r.GetByIdAsync(2)).ReturnsAsync(_testInstructor);

        // Act
        var result = await _controller.GetByCourseAndTerm(1, "Fall 2026", CancellationToken.None);

        // Assert
        var ok = result.Result as OkObjectResult;
        Assert.That(ok, Is.Not.Null);

        var list = ok!.Value as List<SectionResponseDto>;
        Assert.That(list!.Count, Is.EqualTo(1));
        Assert.That(list[0].Term, Is.EqualTo("Fall 2026"));
    }

    [Test]
    public async Task GetByCourseAndTerm_CourseNotFound_Returns404()
    {
        // Arrange
        _courseRepoMock.Setup(r => r.GetByIdAsync(999)).ReturnsAsync((Course?)null);

        // Act
        var result = await _controller.GetByCourseAndTerm(999, "Fall 2026", CancellationToken.None);

        // Assert
        var notFound = result.Result as NotFoundObjectResult;
        Assert.That(notFound, Is.Not.Null);
    }

    [Test]
    public async Task GetByCourseAndTerm_NoSections_Returns404()
    {
        // Arrange — BUG-7: empty list returns 404, not silent 200
        _courseRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(_testCourse);
        _sectionRepoMock.Setup(r => r.GetByCourseAndTermAsync(1, "Spring 2099"))
            .ReturnsAsync(new List<Section>());

        // Act
        var result = await _controller.GetByCourseAndTerm(1, "Spring 2099", CancellationToken.None);

        // Assert
        var notFound = result.Result as NotFoundObjectResult;
        Assert.That(notFound, Is.Not.Null);
        Assert.That(notFound!.StatusCode, Is.EqualTo(404));
    }

    // ════════════════════════════════════════════════════════════════
    // PUT /api/sections/{id} — UpdateSection
    // ════════════════════════════════════════════════════════════════

    [Test]
    public async Task UpdateSection_ValidDto_Returns200()
    {
        // Arrange
        _sectionRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(_testSection);
        _courseRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(_testCourse);
        _userRepoMock.Setup(r => r.GetByIdAsync(2)).ReturnsAsync(_testInstructor);
        _sectionRepoMock.Setup(r => r.UpdateAsync(It.IsAny<Section>()))
            .ReturnsAsync((Section s) => s);

        var dto = new CreateSectionDto
        {
            CourseID = 1,
            Term = "Fall 2026",
            InstructorID = 2,
            Capacity = 40, // increased from 30
            ScheduleJSON = "{\"days\": [\"Mon\", \"Wed\"]}"
        };

        // Act
        var result = await _controller.UpdateSection(1, dto, CancellationToken.None);

        // Assert
        var ok = result.Result as OkObjectResult;
        var response = ok!.Value as SectionResponseDto;
        Assert.That(response!.Capacity, Is.EqualTo(40));

        _sectionRepoMock.Verify(r => r.UpdateAsync(It.IsAny<Section>()), Times.Once);
    }

    [Test]
    public async Task UpdateSection_NotFound_Returns404()
    {
        // Arrange
        _sectionRepoMock.Setup(r => r.GetByIdAsync(999)).ReturnsAsync((Section?)null);

        var dto = new CreateSectionDto
        {
            CourseID = 1,
            Term = "Fall 2026",
            InstructorID = 2,
            Capacity = 30
        };

        // Act
        var result = await _controller.UpdateSection(999, dto, CancellationToken.None);

        // Assert
        var notFound = result.Result as NotFoundObjectResult;
        Assert.That(notFound, Is.Not.Null);

        _sectionRepoMock.Verify(r => r.UpdateAsync(It.IsAny<Section>()), Times.Never);
    }

    [Test]
    public async Task UpdateSection_CapacityBelowEnrolled_Returns400()
    {
        // Arrange — 10 students enrolled, trying to reduce capacity to 5
        _sectionRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(_testSection); // EnrolledCount = 10
        _courseRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(_testCourse);
        _userRepoMock.Setup(r => r.GetByIdAsync(2)).ReturnsAsync(_testInstructor);

        var dto = new CreateSectionDto
        {
            CourseID = 1,
            Term = "Fall 2026",
            InstructorID = 2,
            Capacity = 5 // less than EnrolledCount=10
        };

        // Act
        var result = await _controller.UpdateSection(1, dto, CancellationToken.None);

        // Assert
        var badRequest = result.Result as BadRequestObjectResult;
        Assert.That(badRequest, Is.Not.Null);
        Assert.That(badRequest!.StatusCode, Is.EqualTo(400));

        _sectionRepoMock.Verify(r => r.UpdateAsync(It.IsAny<Section>()), Times.Never);
    }
}