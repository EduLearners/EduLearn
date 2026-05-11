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
public class StudentsControllerTest
{
    // ── Mock dependencies ──
    private Mock<IStudentRepository> _studentRepoMock;
    private Mock<IUserRepository> _userRepoMock;
    private Mock<IProgramRepository> _programRepoMock;

    // ── Controller under test ──
    private StudentsController _controller;

    // ── Reusable test data ──
    private User _testStudentUser;
    private Student _testStudent;

    [SetUp]
    public void Setup()
    {
        _studentRepoMock = new Mock<IStudentRepository>();
        _userRepoMock = new Mock<IUserRepository>();
        _programRepoMock = new Mock<IProgramRepository>();

        _controller = new StudentsController(
            _studentRepoMock.Object,
            _userRepoMock.Object,
            _programRepoMock.Object);

        _testStudentUser = new User
        {
            UserID = 3,
            Username = "rahul.s",
            FullName = "Rahul Kumar",
            Email = "rahul@edulearn.com",
            Role = UserRole.Student,
            PasswordHash = "hashed",
            Status = UserStatus.Active
        };

        _testStudent = new Student
        {
            StudentID = 1,
            UserID = 3,
            MRN = "STU-A1B2C3D4",
            Name = "Rahul Kumar",
            DOB = new DateTime(2004, 5, 15),
            Gender = "Male",
            ContactInfoJSON = "{\"phone\": \"+91-9876543211\"}",
            EnrollmentStatus = StudentLifecycleStatus.Active,
            ProgramID = 1,
            EntryTerm = "Fall 2026",
            ExpectedGraduationTerm = "Spring 2030"
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
    // POST /api/students — CreateStudent
    // ════════════════════════════════════════════════════════════════

    [Test]
    public async Task CreateStudent_ValidDto_Returns201()
    {
        // Arrange
        SetCaller(10, "Registrar");
        _userRepoMock.Setup(r => r.GetByIdAsync(3)).ReturnsAsync(_testStudentUser);
        _studentRepoMock.Setup(r => r.GetByUserIdAsync(3)).ReturnsAsync((Student?)null);
        _programRepoMock.Setup(r => r.ExistsAsync(1)).ReturnsAsync(true);
        _studentRepoMock.Setup(r => r.CreateAsync(It.IsAny<Student>()))
            .ReturnsAsync((Student s) => { s.StudentID = 1; return s; });

        var dto = new CreateStudentDto
        {
            UserID = 3,
            Name = "Rahul Kumar",
            DOB = new DateTime(2004, 5, 15),
            Gender = "Male",
            ProgramID = 1,
            EntryTerm = "Fall 2026",
            ExpectedGraduationTerm = "Spring 2030"
        };

        // Act
        var result = await _controller.CreateStudent(dto, CancellationToken.None);

        // Assert
        var created = result.Result as CreatedAtActionResult;
        Assert.That(created, Is.Not.Null);
        Assert.That(created!.StatusCode, Is.EqualTo(201));

        var response = created.Value as StudentResponseDto;
        Assert.That(response!.Name, Is.EqualTo("Rahul Kumar"));
        Assert.That(response.MRN, Does.StartWith("STU-")); // auto-generated
        Assert.That(response.EnrollmentStatus, Is.EqualTo(StudentLifecycleStatus.Active));

        _studentRepoMock.Verify(r => r.CreateAsync(It.IsAny<Student>()), Times.Once);
    }

    [Test]
    public async Task CreateStudent_UserNotFound_Returns400()
    {
        // Arrange
        SetCaller(10, "Registrar");
        _userRepoMock.Setup(r => r.GetByIdAsync(999)).ReturnsAsync((User?)null);

        var dto = new CreateStudentDto
        {
            UserID = 999,
            Name = "Ghost",
            DOB = DateTime.UtcNow.AddYears(-20),
            ProgramID = 1,
            EntryTerm = "Fall 2026"
        };

        // Act
        var result = await _controller.CreateStudent(dto, CancellationToken.None);

        // Assert
        var badRequest = result.Result as BadRequestObjectResult;
        Assert.That(badRequest, Is.Not.Null);
        Assert.That(badRequest!.StatusCode, Is.EqualTo(400));

        _studentRepoMock.Verify(r => r.CreateAsync(It.IsAny<Student>()), Times.Never);
    }

    [Test]
    public async Task CreateStudent_UserNotStudentRole_Returns400()
    {
        // Arrange — user has Instructor role, not Student
        SetCaller(10, "Registrar");
        var instructorUser = new User
        {
            UserID = 2,
            Username = "dr.priya",
            FullName = "Dr. Priya",
            Email = "priya@test.com",
            Role = UserRole.Instructor,
            PasswordHash = "hash",
            Status = UserStatus.Active
        };
        _userRepoMock.Setup(r => r.GetByIdAsync(2)).ReturnsAsync(instructorUser);

        var dto = new CreateStudentDto
        {
            UserID = 2,
            Name = "Not a student",
            DOB = DateTime.UtcNow.AddYears(-20),
            ProgramID = 1,
            EntryTerm = "Fall 2026"
        };

        // Act
        var result = await _controller.CreateStudent(dto, CancellationToken.None);

        // Assert
        var badRequest = result.Result as BadRequestObjectResult;
        Assert.That(badRequest, Is.Not.Null);

        _studentRepoMock.Verify(r => r.CreateAsync(It.IsAny<Student>()), Times.Never);
    }

    [Test]
    public async Task CreateStudent_DuplicateStudent_Returns409()
    {
        // Arrange — user already has a student record
        SetCaller(10, "Registrar");
        _userRepoMock.Setup(r => r.GetByIdAsync(3)).ReturnsAsync(_testStudentUser);
        _studentRepoMock.Setup(r => r.GetByUserIdAsync(3)).ReturnsAsync(_testStudent);

        var dto = new CreateStudentDto
        {
            UserID = 3,
            Name = "Rahul",
            DOB = new DateTime(2004, 5, 15),
            ProgramID = 1,
            EntryTerm = "Fall 2026"
        };

        // Act
        var result = await _controller.CreateStudent(dto, CancellationToken.None);

        // Assert
        var conflict = result.Result as ConflictObjectResult;
        Assert.That(conflict, Is.Not.Null);
        Assert.That(conflict!.StatusCode, Is.EqualTo(409));

        _studentRepoMock.Verify(r => r.CreateAsync(It.IsAny<Student>()), Times.Never);
    }

    [Test]
    public async Task CreateStudent_ProgramNotFound_Returns400()
    {
        // Arrange
        SetCaller(10, "Registrar");
        _userRepoMock.Setup(r => r.GetByIdAsync(3)).ReturnsAsync(_testStudentUser);
        _studentRepoMock.Setup(r => r.GetByUserIdAsync(3)).ReturnsAsync((Student?)null);
        _programRepoMock.Setup(r => r.ExistsAsync(999)).ReturnsAsync(false);

        var dto = new CreateStudentDto
        {
            UserID = 3,
            Name = "Rahul",
            DOB = new DateTime(2004, 5, 15),
            ProgramID = 999,
            EntryTerm = "Fall 2026"
        };

        // Act
        var result = await _controller.CreateStudent(dto, CancellationToken.None);

        // Assert
        var badRequest = result.Result as BadRequestObjectResult;
        Assert.That(badRequest, Is.Not.Null);

        _studentRepoMock.Verify(r => r.CreateAsync(It.IsAny<Student>()), Times.Never);
    }

    // ════════════════════════════════════════════════════════════════
    // GET /api/students — GetStudents
    // ════════════════════════════════════════════════════════════════

    [Test]
    public async Task GetStudents_ReturnsList()
    {
        // Arrange
        SetCaller(10, "Registrar");
        _studentRepoMock.Setup(r => r.GetAllAsync())
            .ReturnsAsync(new List<Student> { _testStudent });

        // Act
        var result = await _controller.GetStudents(CancellationToken.None);

        // Assert
        var ok = result.Result as OkObjectResult;
        Assert.That(ok, Is.Not.Null);

        var list = (ok!.Value as IEnumerable<StudentResponseDto>)?.ToList();
        Assert.That(list!.Count, Is.EqualTo(1));
        Assert.That(list[0].Name, Is.EqualTo("Rahul Kumar"));
    }

    // ════════════════════════════════════════════════════════════════
    // GET /api/students/{id} — GetStudent (self-only for Students)
    // ════════════════════════════════════════════════════════════════

    [Test]
    public async Task GetStudent_OwnRecord_Returns200()
    {
        // Arrange — Student (UserID=3) viewing own record
        SetCaller(3, "Student");
        _studentRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(_testStudent);

        // Act
        var result = await _controller.GetStudent(1, CancellationToken.None);

        // Assert
        var ok = result.Result as OkObjectResult;
        Assert.That(ok, Is.Not.Null);

        var response = ok!.Value as StudentResponseDto;
        Assert.That(response!.StudentID, Is.EqualTo(1));
        Assert.That(response.Name, Is.EqualTo("Rahul Kumar"));
    }

    [Test]
    public async Task GetStudent_OtherRecord_Student_Returns403()
    {
        // Arrange — Student (UserID=3) trying to view another student's record (UserID=99)
        SetCaller(3, "Student");
        var otherStudent = new Student
        {
            StudentID = 2,
            UserID = 99,
            MRN = "STU-XXXXXXXX",
            Name = "Other Student",
            DOB = new DateTime(2004, 1, 1),
            ProgramID = 1,
            EntryTerm = "Fall 2026"
        };
        _studentRepoMock.Setup(r => r.GetByIdAsync(2)).ReturnsAsync(otherStudent);

        // Act
        var result = await _controller.GetStudent(2, CancellationToken.None);

        // Assert
        var forbidden = result.Result as ObjectResult;
        Assert.That(forbidden, Is.Not.Null);
        Assert.That(forbidden!.StatusCode, Is.EqualTo(403));
    }

    [Test]
    public async Task GetStudent_Registrar_CanViewAny_Returns200()
    {
        // Arrange — Registrar can view any student
        SetCaller(10, "Registrar");
        _studentRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(_testStudent);

        // Act
        var result = await _controller.GetStudent(1, CancellationToken.None);

        // Assert
        var ok = result.Result as OkObjectResult;
        Assert.That(ok, Is.Not.Null);
    }

    [Test]
    public async Task GetStudent_NotFound_Returns404()
    {
        // Arrange
        SetCaller(10, "Registrar");
        _studentRepoMock.Setup(r => r.GetByIdAsync(999))
            .ReturnsAsync((Student?)null);

        // Act
        var result = await _controller.GetStudent(999, CancellationToken.None);

        // Assert
        var notFound = result.Result as NotFoundObjectResult;
        Assert.That(notFound, Is.Not.Null);
        Assert.That(notFound!.StatusCode, Is.EqualTo(404));
    }

    // ════════════════════════════════════════════════════════════════
    // PUT /api/students/{id} — UpdateStudent
    // ════════════════════════════════════════════════════════════════

    [Test]
    public async Task UpdateStudent_ValidDto_Returns200()
    {
        // Arrange
        SetCaller(10, "Registrar");
        _studentRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(_testStudent);
        _studentRepoMock.Setup(r => r.UpdateAsync(It.IsAny<Student>()))
            .ReturnsAsync((Student s) => s);

        var dto = new UpdateStudentDto
        {
            Name = "Rahul Kumar Singh",
            Gender = "Male",
            ContactInfoJSON = "{\"phone\": \"+91-9999999999\"}",
            ExpectedGraduationTerm = "Fall 2030"
        };

        // Act
        var result = await _controller.UpdateStudent(1, dto, CancellationToken.None);

        // Assert
        var ok = result.Result as OkObjectResult;
        var response = ok!.Value as StudentResponseDto;
        Assert.That(response!.Name, Is.EqualTo("Rahul Kumar Singh"));
        Assert.That(response.ExpectedGraduationTerm, Is.EqualTo("Fall 2030"));

        _studentRepoMock.Verify(r => r.UpdateAsync(It.IsAny<Student>()), Times.Once);
    }

    [Test]
    public async Task UpdateStudent_WithStatusChange_Returns200()
    {
        // Arrange — BUG-5 FIX: lifecycle status update
        SetCaller(10, "Registrar");
        _studentRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(_testStudent);
        _studentRepoMock.Setup(r => r.UpdateAsync(It.IsAny<Student>()))
            .ReturnsAsync((Student s) => s);

        var dto = new UpdateStudentDto
        {
            Name = "Rahul Kumar",
            EnrollmentStatus = StudentLifecycleStatus.Graduated
        };

        // Act
        var result = await _controller.UpdateStudent(1, dto, CancellationToken.None);

        // Assert
        var ok = result.Result as OkObjectResult;
        var response = ok!.Value as StudentResponseDto;
        Assert.That(response!.EnrollmentStatus, Is.EqualTo(StudentLifecycleStatus.Graduated));
    }

    [Test]
    public async Task UpdateStudent_NotFound_Returns404()
    {
        // Arrange
        SetCaller(10, "Registrar");
        _studentRepoMock.Setup(r => r.GetByIdAsync(999))
            .ReturnsAsync((Student?)null);

        var dto = new UpdateStudentDto { Name = "Test" };

        // Act
        var result = await _controller.UpdateStudent(999, dto, CancellationToken.None);

        // Assert
        var notFound = result.Result as NotFoundObjectResult;
        Assert.That(notFound, Is.Not.Null);

        _studentRepoMock.Verify(r => r.UpdateAsync(It.IsAny<Student>()), Times.Never);
    }
}