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
public class TranscriptsControllerTest
{
    // ── Mock dependencies ──
    private Mock<ITranscriptRepository> _transcriptRepoMock;
    private Mock<IStudentRepository> _studentRepoMock;
    private Mock<IEnrollmentRepository> _enrollRepoMock;
    private Mock<IProgramRepository> _programRepoMock;
    private Mock<ISubmissionRepository> _submissionRepoMock;

    // ── Controller under test ──
    private TranscriptsController _controller;

    // ── Reusable test data ──
    private Student _testStudent;
    private EduLearn.API.Models.Program _testProgram;
    private Course _testCourse;
    private Section _testSection;
    private Transcript _draftTranscript;
    private Transcript _issuedTranscript;

    [SetUp]
    public void Setup()
    {
        _transcriptRepoMock = new Mock<ITranscriptRepository>();
        _studentRepoMock = new Mock<IStudentRepository>();
        _enrollRepoMock = new Mock<IEnrollmentRepository>();
        _programRepoMock = new Mock<IProgramRepository>();
        _submissionRepoMock = new Mock<ISubmissionRepository>();

        _controller = new TranscriptsController(
            _transcriptRepoMock.Object,
            _studentRepoMock.Object,
            _enrollRepoMock.Object,
            _programRepoMock.Object,
            _submissionRepoMock.Object);

        _testCourse = new Course
        {
            CourseID = 1, Code = "CS101",
            Title = "Introduction to Computer Science",
            Credits = 3, Status = CourseStatus.Active
        };

        _testSection = new Section
        {
            SectionID = 1, CourseID = 1, Term = "Fall 2026",
            InstructorID = 2, Capacity = 30, EnrolledCount = 10,
            Status = SectionStatus.Open, Course = _testCourse
        };

        _testStudent = new Student
        {
            StudentID = 1, UserID = 3, MRN = "STU-00001",
            Name = "Rahul Kumar",
            DOB = new DateTime(2004, 5, 15),
            ProgramID = 1, EntryTerm = "Fall 2026"
        };

        _testProgram = new EduLearn.API.Models.Program
        {
            ProgramID = 1, Name = "B.Tech Computer Science",
            DegreeType = "Bachelor", DurationTerms = 8,
            Status = ProgramStatus.Active
        };

        _draftTranscript = new Transcript
        {
            TranscriptID = 1, StudentID = 1,
            EntriesJSON = "[{\"courseName\":\"CS101\",\"credits\":3,\"term\":\"Fall 2026\"}]",
            GPA = 8.0m, Status = TranscriptStatus.Draft
        };

        _issuedTranscript = new Transcript
        {
            TranscriptID = 2, StudentID = 1,
            EntriesJSON = "[{\"courseName\":\"CS101\",\"credits\":3,\"term\":\"Fall 2026\"}]",
            GPA = 8.0m, Status = TranscriptStatus.Issued,
            IssuedAt = DateTime.UtcNow.AddDays(-1)
        };
    }

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
    // POST /api/transcripts/generate/{studentId}
    // ════════════════════════════════════════════════════════════════

    [Test]
    public async Task GenerateTranscript_ValidStudent_Returns201()
    {
        SetCaller(10, "Registrar");
        _studentRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(_testStudent);
        _programRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(_testProgram);

        var enrollments = new List<Enrollment>
        {
            new Enrollment
            {
                EnrollID = 1, StudentID = 1, SectionID = 1,
                Status = EnrollmentStatus.Enrolled, GradePostedFlag = true,
                Section = _testSection, Student = _testStudent
            }
        };
        _enrollRepoMock.Setup(r => r.GetByStudentIdAsync(1)).ReturnsAsync(enrollments);

        var submissions = new List<Submission>
        {
            new Submission
            {
                SubmissionID = 1, AssessmentID = 1, StudentID = 1,
                Score = 85, Status = SubmissionStatus.Graded,
                Assessment = new Assessment
                {
                    AssessmentID = 1, CourseID = 1, Title = "Quiz 1",
                    MaxScore = 100, Type = AssessmentType.Quiz,
                    Status = AssessmentStatus.Published, CreatedByFK = 2
                }
            }
        };
        _submissionRepoMock.Setup(r => r.GetByStudentIdWithDetailsAsync(1)).ReturnsAsync(submissions);
        _transcriptRepoMock.Setup(r => r.CreateAsync(It.IsAny<Transcript>()))
            .ReturnsAsync((Transcript t) => { t.TranscriptID = 1; return t; });

        var result = await _controller.GenerateTranscript(1, CancellationToken.None);

        var created = result.Result as CreatedAtActionResult;
        Assert.That(created, Is.Not.Null);
        Assert.That(created!.StatusCode, Is.EqualTo(201));

        var response = created.Value as TranscriptResponseDto;
        Assert.That(response!.StudentName, Is.EqualTo("Rahul Kumar"));
        Assert.That(response.ProgramName, Is.EqualTo("B.Tech Computer Science"));
        Assert.That(response.Status, Is.EqualTo(TranscriptStatus.Draft));
        Assert.That(response.GPA, Is.Not.Null);

        _transcriptRepoMock.Verify(r => r.CreateAsync(It.IsAny<Transcript>()), Times.Once);
    }

    [Test]
    public async Task GenerateTranscript_StudentNotFound_Returns404()
    {
        SetCaller(10, "Registrar");
        _studentRepoMock.Setup(r => r.GetByIdAsync(999)).ReturnsAsync((Student?)null);

        var result = await _controller.GenerateTranscript(999, CancellationToken.None);

        var notFound = result.Result as NotFoundObjectResult;
        Assert.That(notFound, Is.Not.Null);
        Assert.That(notFound!.StatusCode, Is.EqualTo(404));
        _transcriptRepoMock.Verify(r => r.CreateAsync(It.IsAny<Transcript>()), Times.Never);
    }

    // ════════════════════════════════════════════════════════════════
    // GET /api/transcripts/student/{studentId}
    // ════════════════════════════════════════════════════════════════

    [Test]
    public async Task GetByStudent_OwnTranscripts_Returns200()
    {
        SetCaller(3, "Student");
        _studentRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(_testStudent);
        _programRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(_testProgram);
        _transcriptRepoMock.Setup(r => r.GetByStudentIdAsync(1))
            .ReturnsAsync(new List<Transcript> { _draftTranscript });

        var result = await _controller.GetByStudent(1, CancellationToken.None);

        var ok = result.Result as OkObjectResult;
        Assert.That(ok, Is.Not.Null);
        var list = (ok!.Value as IEnumerable<TranscriptResponseDto>)?.ToList();
        Assert.That(list!.Count, Is.EqualTo(1));
        Assert.That(list[0].StudentName, Is.EqualTo("Rahul Kumar"));
    }

    [Test]
    public async Task GetByStudent_OtherStudentData_Returns403()
    {
        SetCaller(3, "Student");
        var otherStudent = new Student
        {
            StudentID = 2, UserID = 99, MRN = "STU-00002",
            Name = "Other", DOB = new DateTime(2004, 1, 1),
            ProgramID = 1, EntryTerm = "Fall 2026"
        };
        _studentRepoMock.Setup(r => r.GetByIdAsync(2)).ReturnsAsync(otherStudent);

        var result = await _controller.GetByStudent(2, CancellationToken.None);

        var forbidden = result.Result as ObjectResult;
        Assert.That(forbidden, Is.Not.Null);
        Assert.That(forbidden!.StatusCode, Is.EqualTo(403));
    }

    // ════════════════════════════════════════════════════════════════
    // GET /api/transcripts/{id}
    // ════════════════════════════════════════════════════════════════

    [Test]
    public async Task GetTranscript_Exists_Returns200()
    {
        SetCaller(10, "Registrar");
        _transcriptRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(_draftTranscript);
        _studentRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(_testStudent);
        _programRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(_testProgram);

        var result = await _controller.GetTranscript(1, CancellationToken.None);

        var ok = result.Result as OkObjectResult;
        Assert.That(ok, Is.Not.Null);
        var response = ok!.Value as TranscriptResponseDto;
        Assert.That(response!.TranscriptID, Is.EqualTo(1));
        Assert.That(response.GPA, Is.EqualTo(8.0m));
        Assert.That(response.Status, Is.EqualTo(TranscriptStatus.Draft));
    }

    [Test]
    public async Task GetTranscript_NotFound_Returns404()
    {
        SetCaller(10, "Registrar");
        _transcriptRepoMock.Setup(r => r.GetByIdAsync(999)).ReturnsAsync((Transcript?)null);

        var result = await _controller.GetTranscript(999, CancellationToken.None);

        var notFound = result.Result as NotFoundObjectResult;
        Assert.That(notFound, Is.Not.Null);
        Assert.That(notFound!.StatusCode, Is.EqualTo(404));
    }

    // ════════════════════════════════════════════════════════════════
    // PUT /api/transcripts/{id}/publish
    // ════════════════════════════════════════════════════════════════

    [Test]
    public async Task PublishTranscript_DraftToIssued_Returns200()
    {
        SetCaller(10, "Registrar");
        _transcriptRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(_draftTranscript);
        _transcriptRepoMock.Setup(r => r.UpdateAsync(It.IsAny<Transcript>()))
            .ReturnsAsync((Transcript t) => t);
        _studentRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(_testStudent);
        _programRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(_testProgram);

        var result = await _controller.PublishTranscript(1, CancellationToken.None);

        var ok = result.Result as OkObjectResult;
        var response = ok!.Value as TranscriptResponseDto;
        Assert.That(response!.Status, Is.EqualTo(TranscriptStatus.Issued));
        _transcriptRepoMock.Verify(r => r.UpdateAsync(It.IsAny<Transcript>()), Times.Once);
    }

    [Test]
    public async Task PublishTranscript_AlreadyIssued_Returns400()
    {
        SetCaller(10, "Registrar");
        _transcriptRepoMock.Setup(r => r.GetByIdAsync(2)).ReturnsAsync(_issuedTranscript);

        var result = await _controller.PublishTranscript(2, CancellationToken.None);

        var badRequest = result.Result as BadRequestObjectResult;
        Assert.That(badRequest, Is.Not.Null);
        Assert.That(badRequest!.StatusCode, Is.EqualTo(400));
        _transcriptRepoMock.Verify(r => r.UpdateAsync(It.IsAny<Transcript>()), Times.Never);
    }

    [Test]
    public async Task PublishTranscript_NotFound_Returns404()
    {
        SetCaller(10, "Registrar");
        _transcriptRepoMock.Setup(r => r.GetByIdAsync(999)).ReturnsAsync((Transcript?)null);

        var result = await _controller.PublishTranscript(999, CancellationToken.None);

        var notFound = result.Result as NotFoundObjectResult;
        Assert.That(notFound, Is.Not.Null);
        _transcriptRepoMock.Verify(r => r.UpdateAsync(It.IsAny<Transcript>()), Times.Never);
    }

    // ════════════════════════════════════════════════════════════════
    // GET /api/transcripts/{id}/pdf — validation only
    // ════════════════════════════════════════════════════════════════

    [Test]
    public async Task DownloadPdf_DraftTranscript_Returns400()
    {
        SetCaller(10, "Registrar");
        _transcriptRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(_draftTranscript);

        var result = await _controller.DownloadPdf(1, CancellationToken.None);

        var badRequest = result as BadRequestObjectResult;
        Assert.That(badRequest, Is.Not.Null);
        Assert.That(badRequest!.StatusCode, Is.EqualTo(400));
    }

    [Test]
    public async Task DownloadPdf_NotFound_Returns404()
    {
        SetCaller(10, "Registrar");
        _transcriptRepoMock.Setup(r => r.GetByIdAsync(999)).ReturnsAsync((Transcript?)null);

        var result = await _controller.DownloadPdf(999, CancellationToken.None);

        var notFound = result as NotFoundObjectResult;
        Assert.That(notFound, Is.Not.Null);
        Assert.That(notFound!.StatusCode, Is.EqualTo(404));
    }

    [Test]
    public async Task DownloadPdf_StudentViewsOther_Returns403()
    {
        SetCaller(3, "Student");
        var otherStudentTranscript = new Transcript
        {
            TranscriptID = 5, StudentID = 2,
            EntriesJSON = "[]", Status = TranscriptStatus.Issued,
            GPA = 7.0m
        };
        var otherStudent = new Student
        {
            StudentID = 2, UserID = 99, MRN = "STU-00002",
            Name = "Other", DOB = new DateTime(2004, 1, 1),
            ProgramID = 1, EntryTerm = "Fall 2026"
        };
        _transcriptRepoMock.Setup(r => r.GetByIdAsync(5)).ReturnsAsync(otherStudentTranscript);
        _studentRepoMock.Setup(r => r.GetByIdAsync(2)).ReturnsAsync(otherStudent);

        var result = await _controller.DownloadPdf(5, CancellationToken.None);

        var forbidden = result as ObjectResult;
        Assert.That(forbidden, Is.Not.Null);
        Assert.That(forbidden!.StatusCode, Is.EqualTo(403));
    }
}
