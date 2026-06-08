//using System.Security.Claims;
//using EduLearn.API.Controllers;
//using EduLearn.API.DTOs;
//using EduLearn.API.Models;
//using EduLearn.API.Models.Enums;
//using EduLearn.API.Repositories.Interfaces;
//using EduLearn.API.Services;
//using Microsoft.AspNetCore.Http;
//using Microsoft.AspNetCore.Mvc;
//using Moq;

//namespace EduLearn_Testing.Controller;

//[TestFixture]
//public class SubmissionsControllerTest
//{
//    // ── Mock dependencies ──
//    private Mock<ISubmissionRepository> _submissionRepoMock;
//    private Mock<IAssessmentRepository> _assessmentRepoMock;
//    private Mock<IStudentRepository> _studentRepoMock;
//    private Mock<IUserRepository> _userRepoMock;
//    private Mock<ISectionRepository> _sectionRepoMock;
//    private Mock<INotificationService> _notificationServiceMock;
//    private Mock<AuditLogService> _auditLogServiceMock;

//    // ── Controller under test ──
//    private SubmissionsController _controller;

//    // ── Reusable test data ──
//    private Assessment _publishedAssessment;
//    private Assessment _closedAssessment;
//    private Student _testStudent;
//    private User _testInstructor;
//    private Submission _testSubmission;

//    [SetUp]
//    public void Setup()
//    {
//        _submissionRepoMock = new Mock<ISubmissionRepository>();
//        _assessmentRepoMock = new Mock<IAssessmentRepository>();
//        _studentRepoMock = new Mock<IStudentRepository>();
//        _userRepoMock = new Mock<IUserRepository>();
//        _sectionRepoMock = new Mock<ISectionRepository>();
//        _notificationServiceMock = new Mock<INotificationService>();

//        // AuditLogService requires IAuditLogRepository — mock it
//        var auditLogRepoMock = new Mock<IAuditLogRepository>();
//        _auditLogServiceMock = new Mock<AuditLogService>(auditLogRepoMock.Object);

//        _controller = new SubmissionsController(
//            _submissionRepoMock.Object,
//            _assessmentRepoMock.Object,
//            _studentRepoMock.Object,
//            _userRepoMock.Object,
//            _sectionRepoMock.Object,
//            _notificationServiceMock.Object,
//            _auditLogServiceMock.Object);

//        _publishedAssessment = new Assessment
//        {
//            AssessmentID = 1,
//            CourseID = 1,
//            Title = "Quiz 1 - Programming Basics",
//            Type = AssessmentType.Quiz,
//            MaxScore = 50,
//            Status = AssessmentStatus.Published,
//            DueAt = DateTime.UtcNow.AddDays(30),
//            CreatedByFK = 2
//        };

//        _closedAssessment = new Assessment
//        {
//            AssessmentID = 2,
//            CourseID = 1,
//            Title = "Old Quiz",
//            Type = AssessmentType.Quiz,
//            MaxScore = 50,
//            Status = AssessmentStatus.Closed,
//            CreatedByFK = 2
//        };

//        _testStudent = new Student
//        {
//            StudentID = 1,
//            UserID = 3,
//            Name = "Rahul Kumar",
//            MRN = "STU-00001",
//            DOB = new DateTime(2004, 5, 15),
//            Gender = "Male",
//            ProgramID = 1,
//            EntryTerm = "Fall 2026"
//        };

//        _testInstructor = new User
//        {
//            UserID = 2,
//            Username = "dr.priya",
//            FullName = "Dr. Priya Sharma",
//            Email = "priya@edulearn.com",
//            Role = UserRole.Instructor,
//            PasswordHash = "hashed",
//            Status = UserStatus.Active
//        };

//        _testSubmission = new Submission
//        {
//            SubmissionID = 1,
//            AssessmentID = 1,
//            StudentID = 1,
//            FileURI = "https://blob/rahul-quiz1.pdf",
//            Status = SubmissionStatus.Submitted,
//            Score = null,
//            GraderID = null,
//            GradedAt = null,
//            Assessment = _publishedAssessment,
//            Student = _testStudent,
//            Grader = null
//        };
//    }

//    /// Helper: sets up ControllerContext with given UserID and Role
//    private void SetCaller(int userId, string role)
//    {
//        var claims = new List<Claim>
//        {
//            new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
//            new Claim(ClaimTypes.Role, role)
//        };
//        var identity = new ClaimsIdentity(claims, "TestAuth");
//        _controller.ControllerContext = new ControllerContext
//        {
//            HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(identity) }
//        };
//    }

//    // ════════════════════════════════════════════════════════════════
//    // POST /api/submissions — CreateSubmission
//    // ════════════════════════════════════════════════════════════════

//    [Test]
//    public async Task CreateSubmission_ValidDto_Returns201()
//    {
//        // Arrange — logged in as the student who owns the record
//        SetCaller(3, "Student");

//        _assessmentRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(_publishedAssessment);
//        _studentRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(_testStudent);
//        _submissionRepoMock.Setup(r => r.GetByStudentAndAssessmentAsync(1, 1))
//            .ReturnsAsync((Submission?)null);
//        _submissionRepoMock.Setup(r => r.CreateAsync(It.IsAny<Submission>()))
//            .ReturnsAsync((Submission s) => { s.SubmissionID = 1; return s; });

//        var dto = new CreateSubmissionDto
//        {
//            AssessmentID = 1,
//            StudentID = 1,
//            FileURI = "https://blob/rahul-quiz1.pdf"
//        };

//        // Act
//        var result = await _controller.CreateSubmission(dto);

//        // Assert
//        var created = result.Result as ObjectResult;
//        Assert.That(created, Is.Not.Null);
//        Assert.That(created!.StatusCode, Is.EqualTo(201));

//        var response = created.Value as SubmissionResponseDto;
//        Assert.That(response!.AssessmentTitle, Is.EqualTo("Quiz 1 - Programming Basics"));
//        Assert.That(response.StudentName, Is.EqualTo("Rahul Kumar"));
//        Assert.That(response.Status, Is.EqualTo(SubmissionStatus.Submitted));

//        _submissionRepoMock.Verify(r => r.CreateAsync(It.IsAny<Submission>()), Times.Once);
//    }

//    [Test]
//    public async Task CreateSubmission_AssessmentNotPublished_Returns400()
//    {
//        // Arrange
//        SetCaller(3, "Student");
//        _assessmentRepoMock.Setup(r => r.GetByIdAsync(2)).ReturnsAsync(_closedAssessment);

//        var dto = new CreateSubmissionDto { AssessmentID = 2, StudentID = 1 };

//        // Act
//        var result = await _controller.CreateSubmission(dto);

//        // Assert
//        var badRequest = result.Result as BadRequestObjectResult;
//        Assert.That(badRequest, Is.Not.Null);
//        Assert.That(badRequest!.StatusCode, Is.EqualTo(400));

//        _submissionRepoMock.Verify(r => r.CreateAsync(It.IsAny<Submission>()), Times.Never);
//    }

//    [Test]
//    public async Task CreateSubmission_DuplicateSubmission_Returns409()
//    {
//        // Arrange — student already submitted for this assessment
//        SetCaller(3, "Student");
//        _assessmentRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(_publishedAssessment);
//        _studentRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(_testStudent);
//        _submissionRepoMock.Setup(r => r.GetByStudentAndAssessmentAsync(1, 1))
//            .ReturnsAsync(_testSubmission);

//        var dto = new CreateSubmissionDto { AssessmentID = 1, StudentID = 1 };

//        // Act
//        var result = await _controller.CreateSubmission(dto);

//        // Assert
//        var conflict = result.Result as ConflictObjectResult;
//        Assert.That(conflict, Is.Not.Null);
//        Assert.That(conflict!.StatusCode, Is.EqualTo(409));

//        _submissionRepoMock.Verify(r => r.CreateAsync(It.IsAny<Submission>()), Times.Never);
//    }

//    [Test]
//    public async Task CreateSubmission_StudentSelfOnlyCheck_Returns403()
//    {
//        // Arrange — Student UserID=3 trying to submit for Student with UserID=99
//        SetCaller(3, "Student");
//        var otherStudent = new Student
//        {
//            StudentID = 2,
//            UserID = 99,
//            Name = "Other Student",
//            MRN = "STU-00002",
//            DOB = new DateTime(2004, 1, 1),
//            ProgramID = 1,
//            EntryTerm = "Fall 2026"
//        };
//        _assessmentRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(_publishedAssessment);
//        _studentRepoMock.Setup(r => r.GetByIdAsync(2)).ReturnsAsync(otherStudent);

//        var dto = new CreateSubmissionDto { AssessmentID = 1, StudentID = 2 };

//        // Act
//        var result = await _controller.CreateSubmission(dto);

//        // Assert
//        var forbidden = result.Result as ObjectResult;
//        Assert.That(forbidden, Is.Not.Null);
//        Assert.That(forbidden!.StatusCode, Is.EqualTo(403));
//    }

//    [Test]
//    public async Task CreateSubmission_PastDueDate_StatusIsLate()
//    {
//        // Arrange — assessment DueAt is in the past
//        SetCaller(3, "Student");
//        var expiredAssessment = new Assessment
//        {
//            AssessmentID = 3,
//            CourseID = 1,
//            Title = "Expired Quiz",
//            Type = AssessmentType.Quiz,
//            MaxScore = 50,
//            Status = AssessmentStatus.Published,
//            DueAt = DateTime.UtcNow.AddDays(-1), // past due
//            CreatedByFK = 2
//        };
//        _assessmentRepoMock.Setup(r => r.GetByIdAsync(3)).ReturnsAsync(expiredAssessment);
//        _studentRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(_testStudent);
//        _submissionRepoMock.Setup(r => r.GetByStudentAndAssessmentAsync(1, 3))
//            .ReturnsAsync((Submission?)null);
//        _submissionRepoMock.Setup(r => r.CreateAsync(It.IsAny<Submission>()))
//            .ReturnsAsync((Submission s) => { s.SubmissionID = 2; return s; });

//        var dto = new CreateSubmissionDto { AssessmentID = 3, StudentID = 1 };

//        // Act
//        var result = await _controller.CreateSubmission(dto);

//        // Assert
//        var created = result.Result as ObjectResult;
//        var response = created!.Value as SubmissionResponseDto;
//        Assert.That(response!.Status, Is.EqualTo(SubmissionStatus.Late));
//    }

//    // ════════════════════════════════════════════════════════════════
//    // GET /api/submissions/assessment/{assessmentId} — GetByAssessment
//    // ════════════════════════════════════════════════════════════════

//    [Test]
//    public async Task GetByAssessment_Exists_Returns200()
//    {
//        // Arrange — logged in as Instructor
//        SetCaller(2, "Instructor");
//        _assessmentRepoMock.Setup(r => r.ExistsAsync(1)).ReturnsAsync(true);
//        _submissionRepoMock.Setup(r => r.GetByAssessmentIdWithDetailsAsync(1))
//            .ReturnsAsync(new List<Submission> { _testSubmission });

//        // Act
//        var result = await _controller.GetByAssessment(1);

//        // Assert
//        var ok = result.Result as OkObjectResult;
//        Assert.That(ok, Is.Not.Null);

//        var list = ok!.Value as List<SubmissionResponseDto>;
//        Assert.That(list!.Count, Is.EqualTo(1));
//        Assert.That(list[0].StudentName, Is.EqualTo("Rahul Kumar"));
//    }

//    [Test]
//    public async Task GetByAssessment_NotFound_Returns404()
//    {
//        // Arrange
//        SetCaller(2, "Instructor");
//        _assessmentRepoMock.Setup(r => r.ExistsAsync(999)).ReturnsAsync(false);

//        // Act
//        var result = await _controller.GetByAssessment(999);

//        // Assert
//        var notFound = result.Result as NotFoundObjectResult;
//        Assert.That(notFound, Is.Not.Null);
//        Assert.That(notFound!.StatusCode, Is.EqualTo(404));
//    }

//    // ════════════════════════════════════════════════════════════════
//    // POST /api/submissions/{id}/grade — GradeSubmission
//    // ════════════════════════════════════════════════════════════════

//    [Test]
//    public async Task GradeSubmission_ValidScore_Returns200()
//    {
//        // Arrange — logged in as Instructor
//        SetCaller(2, "Instructor");
//        _submissionRepoMock.Setup(r => r.GetByIdWithDetailsAsync(1)).ReturnsAsync(_testSubmission);
//        _userRepoMock.Setup(r => r.GetByIdAsync(2)).ReturnsAsync(_testInstructor);
//        _submissionRepoMock.Setup(r => r.UpdateAsync(It.IsAny<Submission>()))
//            .ReturnsAsync((Submission s) => s);

//        var dto = new GradeSubmissionDto { Score = 42.0m, Reason = "Good work" };

//        // Act
//        var result = await _controller.GradeSubmission(1, dto);

//        // Assert
//        var ok = result.Result as OkObjectResult;
//        Assert.That(ok, Is.Not.Null);

//        var response = ok!.Value as SubmissionResponseDto;
//        Assert.That(response!.Score, Is.EqualTo(42.0m));
//        Assert.That(response.Status, Is.EqualTo(SubmissionStatus.Graded));
//        Assert.That(response.GraderName, Is.EqualTo("Dr. Priya Sharma"));

//        _submissionRepoMock.Verify(r => r.UpdateAsync(It.IsAny<Submission>()), Times.Once);
//    }

//    [Test]
//    public async Task GradeSubmission_ScoreExceedsMax_Returns400()
//    {
//        // Arrange
//        SetCaller(2, "Instructor");
//        _submissionRepoMock.Setup(r => r.GetByIdWithDetailsAsync(1)).ReturnsAsync(_testSubmission);
//        _userRepoMock.Setup(r => r.GetByIdAsync(2)).ReturnsAsync(_testInstructor);

//        var dto = new GradeSubmissionDto { Score = 999.0m, Reason = "Test" };

//        // Act
//        var result = await _controller.GradeSubmission(1, dto);

//        // Assert
//        var badRequest = result.Result as BadRequestObjectResult;
//        Assert.That(badRequest, Is.Not.Null);
//        Assert.That(badRequest!.StatusCode, Is.EqualTo(400));

//        _submissionRepoMock.Verify(r => r.UpdateAsync(It.IsAny<Submission>()), Times.Never);
//    }

//    [Test]
//    public async Task GradeSubmission_ReGrade_CreatesGradeChange()
//    {
//        // Arrange — submission already has a score (re-grading)
//        SetCaller(2, "Instructor");
//        var gradedSubmission = new Submission
//        {
//            SubmissionID = 1,
//            AssessmentID = 1,
//            StudentID = 1,
//            Score = 40.0m,
//            GraderID = 2,
//            Status = SubmissionStatus.Graded,
//            Assessment = _publishedAssessment,
//            Student = _testStudent,
//            Grader = _testInstructor
//        };
//        _submissionRepoMock.Setup(r => r.GetByIdWithDetailsAsync(1)).ReturnsAsync(gradedSubmission);
//        _userRepoMock.Setup(r => r.GetByIdAsync(2)).ReturnsAsync(_testInstructor);
//        _submissionRepoMock.Setup(r => r.UpdateAsync(It.IsAny<Submission>()))
//            .ReturnsAsync((Submission s) => s);
//        _submissionRepoMock.Setup(r => r.CreateGradeChangeAsync(It.IsAny<GradeChange>()))
//            .Returns(Task.CompletedTask);

//        var dto = new GradeSubmissionDto { Score = 45.0m, Reason = "Found partial credit" };

//        // Act
//        var result = await _controller.GradeSubmission(1, dto);

//        // Assert
//        var ok = result.Result as OkObjectResult;
//        var response = ok!.Value as SubmissionResponseDto;
//        Assert.That(response!.Score, Is.EqualTo(45.0m));

//        // Verify GradeChange was created (because re-grade)
//        _submissionRepoMock.Verify(r => r.CreateGradeChangeAsync(
//            It.Is<GradeChange>(gc =>
//                gc.OldScore == 40.0m &&
//                gc.NewScore == 45.0m &&
//                gc.ChangedByFK == 2)),
//            Times.Once);
//    }

//    [Test]
//    public async Task GradeSubmission_SubmissionNotFound_Returns404()
//    {
//        // Arrange
//        SetCaller(2, "Instructor");
//        _submissionRepoMock.Setup(r => r.GetByIdWithDetailsAsync(999))
//            .ReturnsAsync((Submission?)null);

//        var dto = new GradeSubmissionDto { Score = 40.0m };

//        // Act
//        var result = await _controller.GradeSubmission(999, dto);

//        // Assert
//        var notFound = result.Result as NotFoundObjectResult;
//        Assert.That(notFound, Is.Not.Null);
//        Assert.That(notFound!.StatusCode, Is.EqualTo(404));
//    }

//    // ════════════════════════════════════════════════════════════════
//    // GET /api/submissions/student/{studentId} — GetByStudent
//    // ════════════════════════════════════════════════════════════════

//    [Test]
//    public async Task GetByStudent_OwnSubmissions_Returns200()
//    {
//        // Arrange — Student viewing own submissions
//        SetCaller(3, "Student");
//        _studentRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(_testStudent);
//        _submissionRepoMock.Setup(r => r.GetByStudentIdWithDetailsAsync(1))
//            .ReturnsAsync(new List<Submission> { _testSubmission });

//        // Act
//        var result = await _controller.GetByStudent(1);

//        // Assert
//        var ok = result.Result as OkObjectResult;
//        Assert.That(ok, Is.Not.Null);

//        var list = ok!.Value as List<SubmissionResponseDto>;
//        Assert.That(list!.Count, Is.EqualTo(1));
//    }

//    [Test]
//    public async Task GetByStudent_OtherStudentData_Returns403()
//    {
//        // Arrange — Student UserID=3 trying to view Student with UserID=99
//        SetCaller(3, "Student");
//        var otherStudent = new Student
//        {
//            StudentID = 2,
//            UserID = 99,
//            Name = "Other",
//            MRN = "STU-00002",
//            DOB = new DateTime(2004, 1, 1),
//            ProgramID = 1,
//            EntryTerm = "Fall 2026"
//        };
//        _studentRepoMock.Setup(r => r.GetByIdAsync(2)).ReturnsAsync(otherStudent);

//        // Act
//        var result = await _controller.GetByStudent(2);

//        // Assert
//        var forbidden = result.Result as ObjectResult;
//        Assert.That(forbidden, Is.Not.Null);
//        Assert.That(forbidden!.StatusCode, Is.EqualTo(403));
//    }

//    [Test]
//    public async Task GetByStudent_StudentNotFound_Returns404()
//    {
//        // Arrange
//        SetCaller(3, "Student");
//        _studentRepoMock.Setup(r => r.GetByIdAsync(999))
//            .ReturnsAsync((Student?)null);

//        // Act
//        var result = await _controller.GetByStudent(999);

//        // Assert
//        var notFound = result.Result as NotFoundObjectResult;
//        Assert.That(notFound, Is.Not.Null);
//        Assert.That(notFound!.StatusCode, Is.EqualTo(404));
//    }

//    // ════════════════════════════════════════════════════════════════
//    // phase4-fix-10: GetByStudent must reject DeptAdmin/Finance/Auditor
//    // ════════════════════════════════════════════════════════════════

//    [Test]
//    [TestCase("DeptAdmin")]
//    [TestCase("Finance")]
//    [TestCase("Auditor")]
//    public async Task GetByStudent_ExcludedRole_Returns403(string role)
//    {
//        // Arrange — roles that must not access submission data
//        SetCaller(20, role);
//        _studentRepoMock.Setup(r => r.GetByIdAsync(1))
//            .ReturnsAsync(new Student { StudentID = 1, UserID = 3, MRN = "STU-001", Name = "Test", DOB = new DateTime(2004,1,1), ProgramID = 1, EntryTerm = "Fall 2026" });

//        // Act
//        var result = await _controller.GetByStudent(1);

//        // Assert
//        var forbidden = result.Result as ObjectResult;
//        Assert.That(forbidden, Is.Not.Null);
//        Assert.That(forbidden!.StatusCode, Is.EqualTo(403));
//    }
//}