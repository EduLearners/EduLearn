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
public class CoursesControllerTest
{
    // ── Mock dependencies ──
    private Mock<ICourseRepository> _courseRepoMock;
    private Mock<IStudentRepository> _studentRepoMock;
    private Mock<ISectionRepository> _sectionRepoMock;
    private Mock<IEnrollmentRepository> _enrollmentRepoMock;

    // ── Real PrerequisiteEngine with mocked inner dependencies ──
    private PrerequisiteEngine _prerequisiteEngine;

    // ── Controller under test ──
    private CoursesController _controller;

    // ── Reusable test data ──
    private Course _testCourse;
    private CreateCourseDto _validCreateDto;

    [SetUp]
    public void Setup()
    {
        // Create fresh mocks for each test
        _courseRepoMock = new Mock<ICourseRepository>();
        _studentRepoMock = new Mock<IStudentRepository>();
        _sectionRepoMock = new Mock<ISectionRepository>();
        _enrollmentRepoMock = new Mock<IEnrollmentRepository>();

        // Real PrerequisiteEngine — not mocked, but its 4 dependencies are mocked
        // This lets CheckAsync run its real logic against mocked data
        _prerequisiteEngine = new PrerequisiteEngine(
            _courseRepoMock.Object,
            _sectionRepoMock.Object,
            _enrollmentRepoMock.Object,
            _studentRepoMock.Object);

        // Create controller with mocked repos + real engine
        _controller = new CoursesController(
            _courseRepoMock.Object,
            _prerequisiteEngine,
            _studentRepoMock.Object);

        // Reusable test data
        _testCourse = new Course
        {
            CourseID = 1,
            Code = "CS101",
            Title = "Introduction to Computer Science",
            Description = "Fundamentals of computing",
            Credits = 3,
            DepartmentID = 1,
            Level = "100-level",
            PrerequisitesJSON = null,
            Status = CourseStatus.Active,
            CreatedAt = DateTime.UtcNow
        };

        _validCreateDto = new CreateCourseDto
        {
            Code = "CS101",
            Title = "Introduction to Computer Science",
            Description = "Fundamentals of computing",
            Credits = 3,
            DepartmentID = 1,
            Level = "100-level",
            PrerequisitesJSON = null
        };
    }

    // ════════════════════════════════════════════════════════════════
    // POST /api/courses — CreateCourse
    // ════════════════════════════════════════════════════════════════

    [Test]
    public async Task CreateCourse_ValidDto_Returns201WithResponseDto()
    {
        // Arrange — no duplicate code, create succeeds
        _courseRepoMock.Setup(r => r.GetByCodeAsync("CS101"))
            .ReturnsAsync((Course?)null);
        _courseRepoMock.Setup(r => r.CreateAsync(It.IsAny<Course>()))
            .ReturnsAsync((Course c) =>
            {
                c.CourseID = 1;
                return c;
            });

        // Act
        var result = await _controller.CreateCourse(_validCreateDto);

        // Assert
        var createdResult = result.Result as CreatedAtActionResult;
        Assert.That(createdResult, Is.Not.Null);
        Assert.That(createdResult!.StatusCode, Is.EqualTo(201));

        var response = createdResult.Value as CourseResponseDto;
        Assert.That(response, Is.Not.Null);
        Assert.That(response!.Code, Is.EqualTo("CS101"));
        Assert.That(response.Title, Is.EqualTo("Introduction to Computer Science"));
        Assert.That(response.Credits, Is.EqualTo(3));
        Assert.That(response.Status, Is.EqualTo(CourseStatus.Active));

        _courseRepoMock.Verify(r => r.CreateAsync(It.IsAny<Course>()), Times.Once);
    }

    [Test]
    public async Task CreateCourse_DuplicateCode_Returns409()
    {
        // Arrange — code already exists
        _courseRepoMock.Setup(r => r.GetByCodeAsync("CS101"))
            .ReturnsAsync(_testCourse);

        // Act
        var result = await _controller.CreateCourse(_validCreateDto);

        // Assert
        var conflict = result.Result as ConflictObjectResult;
        Assert.That(conflict, Is.Not.Null);
        Assert.That(conflict!.StatusCode, Is.EqualTo(409));

        _courseRepoMock.Verify(r => r.CreateAsync(It.IsAny<Course>()), Times.Never);
    }

    [Test]
    public async Task CreateCourse_WithPrerequisites_Returns201()
    {
        // Arrange
        var dto = new CreateCourseDto
        {
            Code = "CS201",
            Title = "Data Structures",
            Credits = 4,
            DepartmentID = 1,
            Level = "200-level",
            PrerequisitesJSON = "[1]"
        };

        _courseRepoMock.Setup(r => r.GetByCodeAsync("CS201"))
            .ReturnsAsync((Course?)null);
        _courseRepoMock.Setup(r => r.CreateAsync(It.IsAny<Course>()))
            .ReturnsAsync((Course c) => { c.CourseID = 2; return c; });

        // Act
        var result = await _controller.CreateCourse(dto);

        // Assert
        var createdResult = result.Result as CreatedAtActionResult;
        var response = createdResult!.Value as CourseResponseDto;
        Assert.That(response!.PrerequisitesJSON, Is.EqualTo("[1]"));
        Assert.That(response.Code, Is.EqualTo("CS201"));
    }

    [Test]
    public async Task CreateCourse_NullOptionalFields_Returns201()
    {
        // Arrange — minimal DTO
        var dto = new CreateCourseDto
        {
            Code = "GE100",
            Title = "General Elective",
            Credits = 2,
            DepartmentID = null,
            Level = null,
            Description = null,
            PrerequisitesJSON = null
        };

        _courseRepoMock.Setup(r => r.GetByCodeAsync("GE100"))
            .ReturnsAsync((Course?)null);
        _courseRepoMock.Setup(r => r.CreateAsync(It.IsAny<Course>()))
            .ReturnsAsync((Course c) => { c.CourseID = 3; return c; });

        // Act
        var result = await _controller.CreateCourse(dto);

        // Assert
        var createdResult = result.Result as CreatedAtActionResult;
        var response = createdResult!.Value as CourseResponseDto;
        Assert.That(response!.DepartmentID, Is.Null);
        Assert.That(response.Level, Is.Null);
        Assert.That(response.Description, Is.Null);
        Assert.That(response.PrerequisitesJSON, Is.Null);
    }

    // ════════════════════════════════════════════════════════════════
    // GET /api/courses — GetCourses (list all)
    // ════════════════════════════════════════════════════════════════

    [Test]
    public async Task GetCourses_ReturnsList()
    {
        // Arrange
        var courses = new List<Course>
        {
            new Course { CourseID = 1, Code = "CS101", Title = "Intro to CS", Credits = 3, Status = CourseStatus.Active },
            new Course { CourseID = 2, Code = "CS201", Title = "Data Structures", Credits = 4, Status = CourseStatus.Active }
        };
        _courseRepoMock.Setup(r => r.GetAllAsync()).ReturnsAsync(courses);

        // Act
        var result = await _controller.GetCourses();

        // Assert
        var okResult = result.Result as OkObjectResult;
        Assert.That(okResult, Is.Not.Null);
        Assert.That(okResult!.StatusCode, Is.EqualTo(200));

        var list = okResult.Value as List<CourseResponseDto>;
        Assert.That(list!.Count, Is.EqualTo(2));
        Assert.That(list[0].Code, Is.EqualTo("CS101"));
        Assert.That(list[1].Code, Is.EqualTo("CS201"));
    }

    [Test]
    public async Task GetCourses_NoCourses_ReturnsEmptyList()
    {
        // Arrange
        _courseRepoMock.Setup(r => r.GetAllAsync()).ReturnsAsync(new List<Course>());

        // Act
        var result = await _controller.GetCourses();

        // Assert
        var okResult = result.Result as OkObjectResult;
        var list = okResult!.Value as List<CourseResponseDto>;
        Assert.That(list!.Count, Is.EqualTo(0));
    }

    // ════════════════════════════════════════════════════════════════
    // GET /api/courses/{id} — GetCourse (single)
    // ════════════════════════════════════════════════════════════════

    [Test]
    public async Task GetCourse_Exists_Returns200()
    {
        // Arrange
        _courseRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(_testCourse);

        // Act
        var result = await _controller.GetCourse(1);

        // Assert
        var okResult = result.Result as OkObjectResult;
        Assert.That(okResult, Is.Not.Null);

        var response = okResult!.Value as CourseResponseDto;
        Assert.That(response!.CourseID, Is.EqualTo(1));
        Assert.That(response.Code, Is.EqualTo("CS101"));
        Assert.That(response.Title, Is.EqualTo("Introduction to Computer Science"));
    }

    [Test]
    public async Task GetCourse_NotFound_Returns404()
    {
        // Arrange
        _courseRepoMock.Setup(r => r.GetByIdAsync(999)).ReturnsAsync((Course?)null);

        // Act
        var result = await _controller.GetCourse(999);

        // Assert
        var notFound = result.Result as NotFoundObjectResult;
        Assert.That(notFound, Is.Not.Null);
        Assert.That(notFound!.StatusCode, Is.EqualTo(404));
    }

    // ════════════════════════════════════════════════════════════════
    // PUT /api/courses/{id} — UpdateCourse
    // ════════════════════════════════════════════════════════════════

    [Test]
    public async Task UpdateCourse_Exists_Returns200WithUpdatedFields()
    {
        // Arrange
        _courseRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(_testCourse);
        _courseRepoMock.Setup(r => r.UpdateAsync(It.IsAny<Course>()))
            .ReturnsAsync((Course c) => c);

        var dto = new CreateCourseDto
        {
            Code = "CS101",
            Title = "Intro to CS (Updated)",
            Description = "Updated description",
            Credits = 4,
            DepartmentID = 1,
            Level = "100-level",
            PrerequisitesJSON = null
        };

        // Act
        var result = await _controller.UpdateCourse(1, dto);

        // Assert
        var okResult = result.Result as OkObjectResult;
        var response = okResult!.Value as CourseResponseDto;
        Assert.That(response!.Title, Is.EqualTo("Intro to CS (Updated)"));
        Assert.That(response.Credits, Is.EqualTo(4));
        Assert.That(response.Description, Is.EqualTo("Updated description"));

        _courseRepoMock.Verify(r => r.UpdateAsync(It.IsAny<Course>()), Times.Once);
    }

    [Test]
    public async Task UpdateCourse_NotFound_Returns404()
    {
        // Arrange
        _courseRepoMock.Setup(r => r.GetByIdAsync(999)).ReturnsAsync((Course?)null);

        var dto = new CreateCourseDto { Code = "CS999", Title = "Test", Credits = 3 };

        // Act
        var result = await _controller.UpdateCourse(999, dto);

        // Assert
        var notFound = result.Result as NotFoundObjectResult;
        Assert.That(notFound, Is.Not.Null);

        _courseRepoMock.Verify(r => r.UpdateAsync(It.IsAny<Course>()), Times.Never);
    }

    [Test]
    public async Task UpdateCourse_ChangesPrerequisitesJSON()
    {
        // Arrange
        _courseRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(_testCourse);
        _courseRepoMock.Setup(r => r.UpdateAsync(It.IsAny<Course>()))
            .ReturnsAsync((Course c) => c);

        var dto = new CreateCourseDto
        {
            Code = "CS101",
            Title = "Intro to CS",
            Credits = 3,
            PrerequisitesJSON = "[2, 3]"
        };

        // Act
        var result = await _controller.UpdateCourse(1, dto);

        // Assert
        var okResult = result.Result as OkObjectResult;
        var response = okResult!.Value as CourseResponseDto;
        Assert.That(response!.PrerequisitesJSON, Is.EqualTo("[2, 3]"));
    }

    // ════════════════════════════════════════════════════════════════
    // GET /api/courses/{id}/check-prerequisites/{studentId} — CCM-03
    // Uses REAL PrerequisiteEngine with MOCKED inner dependencies
    // ════════════════════════════════════════════════════════════════

    [Test]
    public async Task CheckPrerequisites_CourseNotFound_Returns404()
    {
        // Arrange — controller validates course before calling engine
        _courseRepoMock.Setup(r => r.GetByIdAsync(999)).ReturnsAsync((Course?)null);

        // Act
        var result = await _controller.CheckPrerequisites(999, 1);

        // Assert
        var notFound = result.Result as NotFoundObjectResult;
        Assert.That(notFound, Is.Not.Null);
        Assert.That(notFound!.StatusCode, Is.EqualTo(404));
    }

    [Test]
    public async Task CheckPrerequisites_StudentNotFound_Returns404()
    {
        // Arrange — course exists, student does not
        _courseRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(_testCourse);
        _studentRepoMock.Setup(r => r.ExistsAsync(999)).ReturnsAsync(false);

        // Act
        var result = await _controller.CheckPrerequisites(1, 999);

        // Assert
        var notFound = result.Result as NotFoundObjectResult;
        Assert.That(notFound, Is.Not.Null);
        Assert.That(notFound!.StatusCode, Is.EqualTo(404));
    }

    [Test]
    public async Task CheckPrerequisites_NoPrerequisites_Returns200WithTrue()
    {
        // Arrange — CS101 has PrerequisitesJSON = null → trivially met
        _courseRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(_testCourse);
        _studentRepoMock.Setup(r => r.ExistsAsync(1)).ReturnsAsync(true);
        _studentRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(new Student
        {
            StudentID = 1,
            Name = "Rahul Kumar",
            UserID = 3,
            ProgramID = 1,
            MRN = "STU-00001",
            DOB = new DateTime(2004, 5, 15),
            Gender = "Male",
            EntryTerm = "Fall 2026"
        });

        // Act
        var result = await _controller.CheckPrerequisites(1, 1);

        // Assert
        var okResult = result.Result as OkObjectResult;
        Assert.That(okResult, Is.Not.Null);

        var response = okResult!.Value as PrerequisiteCheckResponseDto;
        Assert.That(response!.AllPrerequisitesMet, Is.True);
        Assert.That(response.Prerequisites.Count, Is.EqualTo(0));
    }

    [Test]
    public async Task CheckPrerequisites_AllMet_Returns200WithTrue()
    {
        // Arrange — CS201 requires CS101, student completed CS101
        var cs201 = new Course
        {
            CourseID = 2,
            Code = "CS201",
            Title = "Data Structures",
            Credits = 4,
            PrerequisitesJSON = "[1]",
            Status = CourseStatus.Active
        };
        var cs101 = new Course
        {
            CourseID = 1,
            Code = "CS101",
            Title = "Intro to CS",
            Credits = 3,
            Status = CourseStatus.Active
        };
        var student = new Student
        {
            StudentID = 1,
            Name = "Rahul Kumar",
            UserID = 3,
            ProgramID = 1,
            MRN = "STU-00001",
            DOB = new DateTime(2004, 5, 15),
            Gender = "Male",
            EntryTerm = "Fall 2026"
        };

        // Controller calls GetByIdAsync(2) for validation
        _courseRepoMock.Setup(r => r.GetByIdAsync(2)).ReturnsAsync(cs201);
        _studentRepoMock.Setup(r => r.ExistsAsync(1)).ReturnsAsync(true);

        // Engine internally calls GetByIdAsync(2) again + GetByIdAsync(1) for prereq course
        _courseRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(cs101);
        _studentRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(student);

        // Engine: find sections for CS101
        var cs101Section = new Section
        {
            SectionID = 1,
            CourseID = 1,
            Term = "Fall 2026",
            InstructorID = 2,
            Capacity = 30,
            EnrolledCount = 25
        };
        _sectionRepoMock.Setup(r => r.GetByCourseIdAsync(1))
            .ReturnsAsync(new List<Section> { cs101Section });

        // Engine: find student's enrollments — completed CS101
        var enrollment = new Enrollment
        {
            EnrollID = 1,
            StudentID = 1,
            SectionID = 1,
            Status = EnrollmentStatus.Enrolled,
            GradePostedFlag = true
        };
        _enrollmentRepoMock.Setup(r => r.GetByStudentIdAsync(1))
            .ReturnsAsync(new List<Enrollment> { enrollment });

        // Act
        var result = await _controller.CheckPrerequisites(2, 1);

        // Assert
        var okResult = result.Result as OkObjectResult;
        Assert.That(okResult, Is.Not.Null);

        var response = okResult!.Value as PrerequisiteCheckResponseDto;
        Assert.That(response!.AllPrerequisitesMet, Is.True);
        Assert.That(response.Prerequisites.Count, Is.EqualTo(1));
        Assert.That(response.Prerequisites[0].Met, Is.True);
        Assert.That(response.Prerequisites[0].CourseCode, Is.EqualTo("CS101"));
        Assert.That(response.Prerequisites[0].CompletedInTerm, Is.EqualTo("Fall 2026"));
    }

    [Test]
    public async Task CheckPrerequisites_NotMet_Returns200WithFalse()
    {
        // Arrange — CS201 requires CS101, student has NOT completed CS101
        var cs201 = new Course
        {
            CourseID = 2,
            Code = "CS201",
            Title = "Data Structures",
            Credits = 4,
            PrerequisitesJSON = "[1]",
            Status = CourseStatus.Active
        };
        var cs101 = new Course
        {
            CourseID = 1,
            Code = "CS101",
            Title = "Intro to CS",
            Credits = 3,
            Status = CourseStatus.Active
        };
        var student = new Student
        {
            StudentID = 1,
            Name = "Rahul Kumar",
            UserID = 3,
            ProgramID = 1,
            MRN = "STU-00001",
            DOB = new DateTime(2004, 5, 15),
            Gender = "Male",
            EntryTerm = "Fall 2026"
        };

        _courseRepoMock.Setup(r => r.GetByIdAsync(2)).ReturnsAsync(cs201);
        _courseRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(cs101);
        _studentRepoMock.Setup(r => r.ExistsAsync(1)).ReturnsAsync(true);
        _studentRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(student);

        // Engine: CS101 has a section
        _sectionRepoMock.Setup(r => r.GetByCourseIdAsync(1))
            .ReturnsAsync(new List<Section>
            {
                new Section { SectionID = 1, CourseID = 1, Term = "Fall 2026",
                    InstructorID = 2, Capacity = 30, EnrolledCount = 25 }
            });

        // Engine: student has NO enrollments at all
        _enrollmentRepoMock.Setup(r => r.GetByStudentIdAsync(1))
            .ReturnsAsync(new List<Enrollment>());

        // Act
        var result = await _controller.CheckPrerequisites(2, 1);

        // Assert
        var okResult = result.Result as OkObjectResult;
        var response = okResult!.Value as PrerequisiteCheckResponseDto;
        Assert.That(response!.AllPrerequisitesMet, Is.False);
        Assert.That(response.Prerequisites[0].Met, Is.False);
        Assert.That(response.Prerequisites[0].CompletedInTerm, Is.Null);
    }

    // ════════════════════════════════════════════════════════════════
    // MapToDto verification
    // ════════════════════════════════════════════════════════════════

    [Test]
    public async Task MapToDto_AllFieldsMappedCorrectly()
    {
        // Arrange
        var fullCourse = new Course
        {
            CourseID = 10,
            Code = "EE301",
            Title = "Digital Electronics",
            Description = "Logic gates and circuits",
            Credits = 4,
            DepartmentID = 2,
            Level = "300-level",
            PrerequisitesJSON = "[5, 6]",
            Status = CourseStatus.Deprecated,
            CreatedAt = new DateTime(2026, 1, 15, 9, 0, 0)
        };
        _courseRepoMock.Setup(r => r.GetByIdAsync(10)).ReturnsAsync(fullCourse);

        // Act
        var result = await _controller.GetCourse(10);

        // Assert
        var okResult = result.Result as OkObjectResult;
        var response = okResult!.Value as CourseResponseDto;

        Assert.That(response!.CourseID, Is.EqualTo(10));
        Assert.That(response.Code, Is.EqualTo("EE301"));
        Assert.That(response.Title, Is.EqualTo("Digital Electronics"));
        Assert.That(response.Description, Is.EqualTo("Logic gates and circuits"));
        Assert.That(response.Credits, Is.EqualTo(4));
        Assert.That(response.DepartmentID, Is.EqualTo(2));
        Assert.That(response.Level, Is.EqualTo("300-level"));
        Assert.That(response.PrerequisitesJSON, Is.EqualTo("[5, 6]"));
        Assert.That(response.Status, Is.EqualTo(CourseStatus.Deprecated));
        Assert.That(response.CreatedAt, Is.EqualTo(new DateTime(2026, 1, 15, 9, 0, 0)));
    }
}