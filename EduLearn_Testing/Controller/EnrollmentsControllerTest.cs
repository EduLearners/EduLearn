using System.Security.Claims;
using EduLearn.API.Controllers;
using EduLearn.API.DTOs;
using EduLearn.API.Models;
using EduLearn.API.Models.Enums;
using EduLearn.API.Repositories.Interfaces;
using EduLearn.API.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore.Storage;
using Moq;

namespace EduLearn_Testing.Controller;

[TestFixture]
public class EnrollmentsControllerTest
{
    // ── Mock dependencies ──
    private Mock<IEnrollmentRepository> _enrollRepoMock;
    private Mock<IStudentRepository> _studentRepoMock;
    private Mock<ISectionRepository> _sectionRepoMock;
    private Mock<INotificationService> _notificationServiceMock;
    private Mock<IAuditLogRepository> _auditLogRepoMock;
    private Mock<IDbContextTransaction> _transactionMock;

    // ── Real services with mocked inner dependencies ──
    private AuditLogService _auditLogService;
    private PrerequisiteEngine _prerequisiteEngine;
    private TimetableConflictService _conflictService;

    // ── Controller under test ──
    private EnrollmentsController _controller;

    // ── Reusable test data ──
    private Student _testStudent;
    private Course _testCourse;
    private Section _openSection;

    [SetUp]
    public void Setup()
    {
        _enrollRepoMock = new Mock<IEnrollmentRepository>();
        _studentRepoMock = new Mock<IStudentRepository>();
        _sectionRepoMock = new Mock<ISectionRepository>();
        _notificationServiceMock = new Mock<INotificationService>();
        _auditLogRepoMock = new Mock<IAuditLogRepository>();
        _transactionMock = new Mock<IDbContextTransaction>();

        _auditLogService = new AuditLogService(_auditLogRepoMock.Object);

        // BUG-2 FIX: PrerequisiteEngine requires 4 dependencies, TimetableConflictService requires 2
        var courseRepoMock = new Mock<ICourseRepository>();
        var sectionRepoForEngine = _sectionRepoMock.Object;
        var studentRepoForEngine = _studentRepoMock.Object;
        _prerequisiteEngine = new PrerequisiteEngine(
            courseRepoMock.Object,
            sectionRepoForEngine,
            _enrollRepoMock.Object,
            studentRepoForEngine);
        _conflictService = new TimetableConflictService(_enrollRepoMock.Object, _sectionRepoMock.Object);

        _controller = new EnrollmentsController(
            _enrollRepoMock.Object,
            _studentRepoMock.Object,
            _sectionRepoMock.Object,
            _notificationServiceMock.Object,
            _auditLogService,
            _prerequisiteEngine,
            _conflictService);

        // Default: mock transaction for every test
        _enrollRepoMock.Setup(r => r.BeginTransactionAsync())
            .ReturnsAsync(_transactionMock.Object);

        _testCourse = new Course
        {
            CourseID = 1,
            Code = "CS101",
            Title = "Introduction to Computer Science",
            Credits = 3,
            Status = CourseStatus.Active
        };

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

        _openSection = new Section
        {
            SectionID = 1,
            CourseID = 1,
            Term = "Fall 2026",
            InstructorID = 2,
            Capacity = 30,
            EnrolledCount = 10,
            Status = SectionStatus.Open,
            Course = _testCourse
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
    // POST /api/enrollment/enroll — Enroll
    // ════════════════════════════════════════════════════════════════

    [Test]
    public async Task Enroll_ValidDto_Returns201_Enrolled()
    {
        // Arrange — student enrolls in open section with capacity
        SetCaller(3, "Student");
        _studentRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(_testStudent);
        _sectionRepoMock.Setup(r => r.GetByIdWithCourseAsync(1)).ReturnsAsync(_openSection);
        _enrollRepoMock.Setup(r => r.IsAlreadyEnrolledAsync(1, 1)).ReturnsAsync(false);
        _enrollRepoMock.Setup(r => r.GetDroppedEnrollmentAsync(1, 1)).ReturnsAsync((Enrollment?)null);
        _enrollRepoMock.Setup(r => r.CreateAsync(It.IsAny<Enrollment>()))
            .ReturnsAsync((Enrollment e) => { e.EnrollID = 1; return e; });
        _sectionRepoMock.Setup(r => r.UpdateAsync(It.IsAny<Section>()))
            .ReturnsAsync((Section s) => s);

        var dto = new CreateEnrollmentDto { StudentID = 1, SectionID = 1 };

        // Act
        var result = await _controller.Enroll(dto, CancellationToken.None);

        // Assert
        var created = result.Result as ObjectResult;
        Assert.That(created, Is.Not.Null);
        Assert.That(created!.StatusCode, Is.EqualTo(201));

        var response = created.Value as EnrollmentResponseDto;
        Assert.That(response!.Status, Is.EqualTo(EnrollmentStatus.Enrolled));
        Assert.That(response.StudentName, Is.EqualTo("Rahul Kumar"));
        Assert.That(response.CourseName, Is.EqualTo("Introduction to Computer Science"));
        Assert.That(response.WaitlistPosition, Is.Null);

        _transactionMock.Verify(t => t.CommitAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Test]
    public async Task Enroll_CapacityFull_Returns201_Waitlisted()
    {
        // Arrange — section at full capacity
        SetCaller(3, "Student");
        var fullSection = new Section
        {
            SectionID = 2,
            CourseID = 1,
            Term = "Fall 2026",
            InstructorID = 2,
            Capacity = 2,
            EnrolledCount = 2,
            Status = SectionStatus.Open,
            Course = _testCourse
        };
        _studentRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(_testStudent);
        _sectionRepoMock.Setup(r => r.GetByIdWithCourseAsync(2)).ReturnsAsync(fullSection);
        _enrollRepoMock.Setup(r => r.IsAlreadyEnrolledAsync(1, 2)).ReturnsAsync(false);
        _enrollRepoMock.Setup(r => r.GetMaxWaitlistPositionAsync(2)).ReturnsAsync(0);
        _enrollRepoMock.Setup(r => r.GetDroppedEnrollmentAsync(1, 2)).ReturnsAsync((Enrollment?)null);
        _enrollRepoMock.Setup(r => r.CreateAsync(It.IsAny<Enrollment>()))
            .ReturnsAsync((Enrollment e) => { e.EnrollID = 2; return e; });

        var dto = new CreateEnrollmentDto { StudentID = 1, SectionID = 2 };

        // Act
        var result = await _controller.Enroll(dto, CancellationToken.None);

        // Assert
        var created = result.Result as ObjectResult;
        var response = created!.Value as EnrollmentResponseDto;
        Assert.That(response!.Status, Is.EqualTo(EnrollmentStatus.Waitlisted));
        Assert.That(response.WaitlistPosition, Is.EqualTo(1));
    }

    [Test]
    public async Task Enroll_StudentNotFound_Returns400()
    {
        // Arrange
        SetCaller(3, "Student");
        _studentRepoMock.Setup(r => r.GetByIdAsync(999)).ReturnsAsync((Student?)null);

        var dto = new CreateEnrollmentDto { StudentID = 999, SectionID = 1 };

        // Act
        var result = await _controller.Enroll(dto, CancellationToken.None);

        // Assert
        var badRequest = result.Result as BadRequestObjectResult;
        Assert.That(badRequest, Is.Not.Null);
        Assert.That(badRequest!.StatusCode, Is.EqualTo(400));
    }

    [Test]
    public async Task Enroll_DuplicateEnrollment_Returns409()
    {
        // Arrange — student already enrolled
        SetCaller(3, "Student");
        _studentRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(_testStudent);
        _sectionRepoMock.Setup(r => r.GetByIdWithCourseAsync(1)).ReturnsAsync(_openSection);
        _enrollRepoMock.Setup(r => r.IsAlreadyEnrolledAsync(1, 1)).ReturnsAsync(true);

        var dto = new CreateEnrollmentDto { StudentID = 1, SectionID = 1 };

        // Act
        var result = await _controller.Enroll(dto, CancellationToken.None);

        // Assert
        var conflict = result.Result as ConflictObjectResult;
        Assert.That(conflict, Is.Not.Null);
        Assert.That(conflict!.StatusCode, Is.EqualTo(409));

        _transactionMock.Verify(t => t.RollbackAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Test]
    public async Task Enroll_SectionNotOpen_Returns400()
    {
        // Arrange — section is Closed
        SetCaller(3, "Student");
        var closedSection = new Section
        {
            SectionID = 3,
            CourseID = 1,
            Term = "Fall 2026",
            InstructorID = 2,
            Capacity = 30,
            EnrolledCount = 0,
            Status = SectionStatus.Closed,
            Course = _testCourse
        };
        _studentRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(_testStudent);
        _sectionRepoMock.Setup(r => r.GetByIdWithCourseAsync(3)).ReturnsAsync(closedSection);

        var dto = new CreateEnrollmentDto { StudentID = 1, SectionID = 3 };

        // Act
        var result = await _controller.Enroll(dto, CancellationToken.None);

        // Assert
        var badRequest = result.Result as BadRequestObjectResult;
        Assert.That(badRequest, Is.Not.Null);

        _transactionMock.Verify(t => t.RollbackAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Test]
    public async Task Enroll_StudentSelfOnly_Returns403()
    {
        // Arrange — Student UserID=3 trying to enroll a different student (UserID=99)
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

        var dto = new CreateEnrollmentDto { StudentID = 2, SectionID = 1 };

        // Act
        var result = await _controller.Enroll(dto, CancellationToken.None);

        // Assert
        var forbidden = result.Result as ObjectResult;
        Assert.That(forbidden!.StatusCode, Is.EqualTo(403));
    }

    // ════════════════════════════════════════════════════════════════
    // DELETE /api/enrollment/{id}/drop — Drop
    // ════════════════════════════════════════════════════════════════

    [Test]
    public async Task Drop_ValidEnrollment_Returns204()
    {
        // Arrange
        SetCaller(3, "Student");
        var enrollment = new Enrollment
        {
            EnrollID = 1,
            StudentID = 1,
            SectionID = 1,
            Status = EnrollmentStatus.Enrolled
        };
        _enrollRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(enrollment);
        _studentRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(_testStudent);
        _enrollRepoMock.Setup(r => r.UpdateAsync(It.IsAny<Enrollment>()))
            .ReturnsAsync((Enrollment e) => e);

        var section = new Section
        {
            SectionID = 1,
            CourseID = 1,
            Term = "Fall 2026",
            InstructorID = 2,
            Capacity = 30,
            EnrolledCount = 11,
            Status = SectionStatus.Open,
            Course = _testCourse
        };
        _sectionRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(section);
        _sectionRepoMock.Setup(r => r.GetByIdWithCourseAsync(1)).ReturnsAsync(section);
        _sectionRepoMock.Setup(r => r.UpdateAsync(It.IsAny<Section>()))
            .ReturnsAsync((Section s) => s);
        _enrollRepoMock.Setup(r => r.GetFirstWaitlistedAsync(1))
            .ReturnsAsync((Enrollment?)null);

        // Act
        var result = await _controller.Drop(1, CancellationToken.None);

        // Assert
        var noContent = result as NoContentResult;
        Assert.That(noContent, Is.Not.Null);
        Assert.That(noContent!.StatusCode, Is.EqualTo(204));

        _transactionMock.Verify(t => t.CommitAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Test]
    public async Task Drop_EnrollmentNotFound_Returns404()
    {
        // Arrange
        SetCaller(10, "Registrar");
        _enrollRepoMock.Setup(r => r.GetByIdAsync(999)).ReturnsAsync((Enrollment?)null);

        // Act
        var result = await _controller.Drop(999, CancellationToken.None);

        // Assert
        var notFound = result as NotFoundObjectResult;
        Assert.That(notFound, Is.Not.Null);
        Assert.That(notFound!.StatusCode, Is.EqualTo(404));

        _transactionMock.Verify(t => t.RollbackAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Test]
    public async Task Drop_StudentSelfOnly_Returns403()
    {
        // Arrange — Student UserID=3 trying to drop another student's enrollment
        SetCaller(3, "Student");
        var otherEnrollment = new Enrollment
        {
            EnrollID = 5,
            StudentID = 2,
            SectionID = 1,
            Status = EnrollmentStatus.Enrolled
        };
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
        _enrollRepoMock.Setup(r => r.GetByIdAsync(5)).ReturnsAsync(otherEnrollment);
        _studentRepoMock.Setup(r => r.GetByIdAsync(2)).ReturnsAsync(otherStudent);

        // Act
        var result = await _controller.Drop(5, CancellationToken.None);

        // Assert
        var forbidden = result as ObjectResult;
        Assert.That(forbidden!.StatusCode, Is.EqualTo(403));

        _transactionMock.Verify(t => t.RollbackAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    // ════════════════════════════════════════════════════════════════
    // GET /api/enrollment/student/{studentId} — GetByStudent
    // ════════════════════════════════════════════════════════════════

    [Test]
    public async Task GetByStudent_OwnEnrollments_Returns200()
    {
        // Arrange
        SetCaller(3, "Student");
        _studentRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(_testStudent);
        _enrollRepoMock.Setup(r => r.GetByStudentIdAsync(1))
            .ReturnsAsync(new List<Enrollment>
            {
                new Enrollment
                {
                    EnrollID = 1, StudentID = 1, SectionID = 1,
                    Status = EnrollmentStatus.Enrolled,
                    Student = _testStudent,
                    Section = _openSection
                }
            });

        // Act
        var result = await _controller.GetByStudent(1, CancellationToken.None);

        // Assert
        var ok = result.Result as OkObjectResult;
        Assert.That(ok, Is.Not.Null);

        var list = (ok!.Value as IEnumerable<EnrollmentResponseDto>)?.ToList();
        Assert.That(list!.Count, Is.EqualTo(1));
        Assert.That(list[0].StudentName, Is.EqualTo("Rahul Kumar"));
    }

    [Test]
    public async Task GetByStudent_OtherStudent_Returns403()
    {
        // Arrange
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
        var result = await _controller.GetByStudent(2, CancellationToken.None);

        // Assert
        var forbidden = result.Result as ObjectResult;
        Assert.That(forbidden!.StatusCode, Is.EqualTo(403));
    }

    // ════════════════════════════════════════════════════════════════
    // GET /api/enrollment/section/{sectionId} — GetBySection
    // ════════════════════════════════════════════════════════════════

    [Test]
    public async Task GetBySection_Returns200()
    {
        // Arrange
        SetCaller(2, "Instructor");
        _enrollRepoMock.Setup(r => r.GetBySectionIdAsync(1))
            .ReturnsAsync(new List<Enrollment>
            {
                new Enrollment
                {
                    EnrollID = 1, StudentID = 1, SectionID = 1,
                    Status = EnrollmentStatus.Enrolled,
                    Student = _testStudent,
                    Section = _openSection
                }
            });

        // Act
        var result = await _controller.GetBySection(1, CancellationToken.None);

        // Assert
        var ok = result.Result as OkObjectResult;
        Assert.That(ok, Is.Not.Null);

        var list = (ok!.Value as IEnumerable<EnrollmentResponseDto>)?.ToList();
        Assert.That(list!.Count, Is.EqualTo(1));
        Assert.That(list[0].CourseName, Is.EqualTo("Introduction to Computer Science"));
    }
}