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
public class TimetableControllerTest
{
    // ── Mock dependencies ──
    private Mock<IEnrollmentRepository> _enrollRepoMock;
    private Mock<IStudentRepository> _studentRepoMock;
    private Mock<ISectionRepository> _sectionRepoMock;
    private Mock<IUserRepository> _userRepoMock;

    // ── Real service ──
    private TimetableConflictService _conflictService;

    // ── Controller under test ──
    private TimetableController _controller;

    // ── Reusable test data ──
    private Student _testStudent;
    private Course _course1;
    private Course _course2;
    private Section _section1;
    private Section _section2;

    [SetUp]
    public void Setup()
    {
        _enrollRepoMock = new Mock<IEnrollmentRepository>();
        _studentRepoMock = new Mock<IStudentRepository>();
        _sectionRepoMock = new Mock<ISectionRepository>();
        _userRepoMock = new Mock<IUserRepository>();

        // BUG-1/BUG-3 FIX: TimetableController now requires IUserRepository and TimetableConflictService
        _conflictService = new TimetableConflictService(_enrollRepoMock.Object, _sectionRepoMock.Object);

        _controller = new TimetableController(
            _enrollRepoMock.Object,
            _studentRepoMock.Object,
            _sectionRepoMock.Object,
            _userRepoMock.Object,
            _conflictService);

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

        _course1 = new Course
        {
            CourseID = 1,
            Code = "CS101",
            Title = "Introduction to Computer Science",
            Credits = 3,
            Status = CourseStatus.Active
        };

        _course2 = new Course
        {
            CourseID = 2,
            Code = "CS201",
            Title = "Data Structures",
            Credits = 4,
            Status = CourseStatus.Active
        };

        _section1 = new Section
        {
            SectionID = 1,
            CourseID = 1,
            Term = "Fall 2026",
            InstructorID = 2,
            Capacity = 30,
            EnrolledCount = 10,
            Status = SectionStatus.Open,
            Course = _course1,
            ScheduleJSON = "{\"days\":\"Mon-Wed-Fri\",\"time\":\"10:00-11:00\"}"
        };

        _section2 = new Section
        {
            SectionID = 2,
            CourseID = 2,
            Term = "Fall 2026",
            InstructorID = 2,
            Capacity = 30,
            EnrolledCount = 15,
            Status = SectionStatus.Open,
            Course = _course2,
            ScheduleJSON = "{\"days\":\"Tue-Thu\",\"time\":\"14:00-15:30\"}"
        };
    }

    /// Helper: sets up ControllerContext with given UserID and Role
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
    // GET /api/timetable/student/{studentId}/{term}
    // ════════════════════════════════════════════════════════════════

    [Test]
    public async Task GetStudentTimetable_ValidRequest_Returns200()
    {
        // Arrange — student has 2 enrolled sections in Fall 2026
        SetCaller(3, "Student");
        _studentRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(_testStudent);

        var enrollments = new List<Enrollment>
        {
            new Enrollment
            {
                EnrollID = 1, StudentID = 1, SectionID = 1,
                Status = EnrollmentStatus.Enrolled,
                Student = _testStudent, Section = _section1
            },
            new Enrollment
            {
                EnrollID = 2, StudentID = 1, SectionID = 2,
                Status = EnrollmentStatus.Enrolled,
                Student = _testStudent, Section = _section2
            }
        };
        _enrollRepoMock.Setup(r => r.GetByStudentIdAsync(1)).ReturnsAsync(enrollments);

        // Act
        var result = await _controller.GetStudentTimetable(1, "Fall 2026", CancellationToken.None);

        // Assert
        var ok = result.Result as OkObjectResult;
        Assert.That(ok, Is.Not.Null);

        var response = ok!.Value as TimetableResponseDto;
        Assert.That(response!.StudentName, Is.EqualTo("Rahul Kumar"));
        Assert.That(response.Term, Is.EqualTo("Fall 2026"));
        Assert.That(response.TotalSections, Is.EqualTo(2));
        Assert.That(response.TotalCredits, Is.EqualTo(7)); // 3 + 4
        Assert.That(response.Entries[0].CourseCode, Is.EqualTo("CS101"));
        Assert.That(response.Entries[1].CourseCode, Is.EqualTo("CS201"));
    }

    [Test]
    public async Task GetStudentTimetable_NoEnrollmentsForTerm_ReturnsEmptyEntries()
    {
        // Arrange — student has no enrollments for Spring 2027
        SetCaller(3, "Student");
        _studentRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(_testStudent);

        var enrollments = new List<Enrollment>
        {
            new Enrollment
            {
                EnrollID = 1, StudentID = 1, SectionID = 1,
                Status = EnrollmentStatus.Enrolled,
                Student = _testStudent, Section = _section1 // Fall 2026
            }
        };
        _enrollRepoMock.Setup(r => r.GetByStudentIdAsync(1)).ReturnsAsync(enrollments);

        // Act
        var result = await _controller.GetStudentTimetable(1, "Spring 2027", CancellationToken.None);

        // Assert
        var ok = result.Result as OkObjectResult;
        var response = ok!.Value as TimetableResponseDto;
        Assert.That(response!.TotalSections, Is.EqualTo(0));
        Assert.That(response.TotalCredits, Is.EqualTo(0));
        Assert.That(response.Entries.Count, Is.EqualTo(0));
    }

    [Test]
    public async Task GetStudentTimetable_StudentNotFound_Returns404()
    {
        // Arrange
        SetCaller(10, "Registrar");
        _studentRepoMock.Setup(r => r.GetByIdAsync(999)).ReturnsAsync((Student?)null);

        // Act
        var result = await _controller.GetStudentTimetable(999, "Fall 2026", CancellationToken.None);

        // Assert
        var notFound = result.Result as NotFoundObjectResult;
        Assert.That(notFound, Is.Not.Null);
        Assert.That(notFound!.StatusCode, Is.EqualTo(404));
    }

    [Test]
    public async Task GetStudentTimetable_StudentSelfOnly_Returns403()
    {
        // Arrange — Student UserID=3 trying to view another student's timetable
        SetCaller(3, "Student");
        var otherStudent = new Student
        {
            StudentID = 2,
            UserID = 99,
            MRN = "STU-00002",
            Name = "Other",
            DOB = new DateTime(2004, 1, 1),
            ProgramID = 1,
            EntryTerm = "Fall 2026"
        };
        _studentRepoMock.Setup(r => r.GetByIdAsync(2)).ReturnsAsync(otherStudent);

        // Act
        var result = await _controller.GetStudentTimetable(2, "Fall 2026", CancellationToken.None);

        // Assert
        var forbidden = result.Result as ObjectResult;
        Assert.That(forbidden!.StatusCode, Is.EqualTo(403));
    }

    [Test]
    public async Task GetStudentTimetable_ExcludesDroppedEnrollments()
    {
        // Arrange — student has 1 Enrolled and 1 Dropped in Fall 2026
        SetCaller(3, "Student");
        _studentRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(_testStudent);

        var enrollments = new List<Enrollment>
        {
            new Enrollment
            {
                EnrollID = 1, StudentID = 1, SectionID = 1,
                Status = EnrollmentStatus.Enrolled,
                Student = _testStudent, Section = _section1
            },
            new Enrollment
            {
                EnrollID = 2, StudentID = 1, SectionID = 2,
                Status = EnrollmentStatus.Dropped, // should be excluded
                Student = _testStudent, Section = _section2
            }
        };
        _enrollRepoMock.Setup(r => r.GetByStudentIdAsync(1)).ReturnsAsync(enrollments);

        // Act
        var result = await _controller.GetStudentTimetable(1, "Fall 2026", CancellationToken.None);

        // Assert — only 1 enrolled section, dropped excluded
        var ok = result.Result as OkObjectResult;
        var response = ok!.Value as TimetableResponseDto;
        Assert.That(response!.TotalSections, Is.EqualTo(1));
        Assert.That(response.TotalCredits, Is.EqualTo(3)); // only CS101
    }

    // ════════════════════════════════════════════════════════════════
    // POST /api/timetable/validate-section — ConflictCheck
    // ════════════════════════════════════════════════════════════════

    [Test]
    public async Task ValidateSection_NoConflict_ReturnsHasConflictFalse()
    {
        // Arrange — student enrolled in Mon-Wed-Fri 10-11, checking Tue-Thu 14-15:30
        SetCaller(3, "Student");
        _studentRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(_testStudent);
        _sectionRepoMock.Setup(r => r.GetByIdWithCourseAsync(2)).ReturnsAsync(_section2);

        var enrollments = new List<Enrollment>
        {
            new Enrollment
            {
                EnrollID = 1, StudentID = 1, SectionID = 1,
                Status = EnrollmentStatus.Enrolled,
                Student = _testStudent, Section = _section1
            }
        };
        _enrollRepoMock.Setup(r => r.GetByStudentIdAsync(1)).ReturnsAsync(enrollments);

        // Act
        var result = await _controller.ValidateSection(1, 2, CancellationToken.None);

        // Assert
        var ok = result.Result as OkObjectResult;
        var response = ok!.Value as ConflictCheckResponseDto;
        Assert.That(response!.HasConflict, Is.False);
    }

    [Test]
    public async Task ValidateSection_WithConflict_ReturnsHasConflictTrue()
    {
        // Arrange — student enrolled in Mon-Wed-Fri 10-11, checking Mon-Wed 10:30-11:30 (overlap!)
        SetCaller(3, "Student");
        _studentRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(_testStudent);

        var conflictingSection = new Section
        {
            SectionID = 3,
            CourseID = 2,
            Term = "Fall 2026",
            InstructorID = 2,
            Capacity = 30,
            EnrolledCount = 5,
            Status = SectionStatus.Open,
            Course = _course2,
            ScheduleJSON = "{\"days\":\"Mon-Wed\",\"time\":\"10:30-11:30\"}"
        };
        _sectionRepoMock.Setup(r => r.GetByIdWithCourseAsync(3)).ReturnsAsync(conflictingSection);

        var enrollments = new List<Enrollment>
        {
            new Enrollment
            {
                EnrollID = 1, StudentID = 1, SectionID = 1,
                Status = EnrollmentStatus.Enrolled,
                Student = _testStudent, Section = _section1
            }
        };
        _enrollRepoMock.Setup(r => r.GetByStudentIdAsync(1)).ReturnsAsync(enrollments);

        // Act
        var result = await _controller.ValidateSection(1, 3, CancellationToken.None);

        // Assert
        var ok = result.Result as OkObjectResult;
        var response = ok!.Value as ConflictCheckResponseDto;
        Assert.That(response!.HasConflict, Is.True);
        Assert.That(response.ConflictMessage, Does.Contain("conflict"));
        Assert.That(response.ConflictsWith, Is.Not.Null);
        Assert.That(response.ConflictsWith!.CourseName, Is.EqualTo("Introduction to Computer Science"));
    }

    [Test]
    public async Task ValidateSection_StudentNotFound_Returns404()
    {
        // Arrange
        SetCaller(10, "Registrar");
        _studentRepoMock.Setup(r => r.GetByIdAsync(999)).ReturnsAsync((Student?)null);

        // Act
        var result = await _controller.ValidateSection(999, 1, CancellationToken.None);

        // Assert
        var notFound = result.Result as NotFoundObjectResult;
        Assert.That(notFound, Is.Not.Null);
        Assert.That(notFound!.StatusCode, Is.EqualTo(404));
    }

    [Test]
    public async Task ValidateSection_SectionNotFound_Returns404()
    {
        // Arrange
        SetCaller(10, "Registrar");
        _studentRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(_testStudent);
        _sectionRepoMock.Setup(r => r.GetByIdWithCourseAsync(999)).ReturnsAsync((Section?)null);

        // Act
        var result = await _controller.ValidateSection(1, 999, CancellationToken.None);

        // Assert
        var notFound = result.Result as NotFoundObjectResult;
        Assert.That(notFound, Is.Not.Null);
        Assert.That(notFound!.StatusCode, Is.EqualTo(404));
    }

    [Test]
    public async Task ValidateSection_NewSectionNoSchedule_ReturnsNoConflict()
    {
        // Arrange — new section has no ScheduleJSON
        SetCaller(3, "Student");
        _studentRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(_testStudent);

        var noScheduleSection = new Section
        {
            SectionID = 5,
            CourseID = 2,
            Term = "Fall 2026",
            InstructorID = 2,
            Capacity = 30,
            Status = SectionStatus.Open,
            Course = _course2,
            ScheduleJSON = null // no schedule
        };
        _sectionRepoMock.Setup(r => r.GetByIdWithCourseAsync(5)).ReturnsAsync(noScheduleSection);

        var enrollments = new List<Enrollment>
        {
            new Enrollment
            {
                EnrollID = 1, StudentID = 1, SectionID = 1,
                Status = EnrollmentStatus.Enrolled,
                Student = _testStudent, Section = _section1
            }
        };
        _enrollRepoMock.Setup(r => r.GetByStudentIdAsync(1)).ReturnsAsync(enrollments);

        // Act
        var result = await _controller.ValidateSection(1, 5, CancellationToken.None);

        // Assert
        var ok = result.Result as OkObjectResult;
        var response = ok!.Value as ConflictCheckResponseDto;
        Assert.That(response!.HasConflict, Is.False);
    }
}