using EduLearn.API.Controllers;
using EduLearn.API.DTOs;
using EduLearn.API.Models;
using EduLearn.API.Models.Enums;
using EduLearn.API.Repositories.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Moq;

namespace EduLearn_Testing.Controller;

[TestFixture]
public class ApplicantsControllerTest
{
    // ── Mock dependency ──
    private Mock<IApplicantRepository> _applicantRepoMock;

    // ── Controller under test ──
    private ApplicantsController _controller;

    // ── Reusable test data ──
    private Applicant _testApplicant;
    private CreateApplicantDto _validCreateDto;

    [SetUp]
    public void Setup()
    {
        // Create fresh mock for each test — prevents state leaking
        _applicantRepoMock = new Mock<IApplicantRepository>();

        // Create controller with mocked dependency
        _controller = new ApplicantsController(_applicantRepoMock.Object);

        // Reusable test applicant
        _testApplicant = new Applicant
        {
            ApplicantID = 1,
            Name = "Neha Gupta",
            DOB = new DateTime(2005, 3, 15),
            NationalID = "AADHAR123456",
            ContactInfoJSON = "{\"email\": \"neha@gmail.com\", \"phone\": \"+91-8888888888\"}",
            ProgramApplied = "B.Tech Computer Science",
            ApplicationStatus = ApplicationStatus.Submitted,
            SubmittedAt = DateTime.UtcNow,
            DocumentsURIJSON = null
        };

        // Reusable valid DTO
        _validCreateDto = new CreateApplicantDto
        {
            Name = "Neha Gupta",
            DOB = new DateTime(2005, 3, 15),
            NationalID = "AADHAR123456",
            ContactInfoJSON = "{\"email\": \"neha@gmail.com\"}",
            ProgramApplied = "B.Tech Computer Science",
            DocumentsURIJSON = null
        };
    }

    // ════════════════════════════════════════════════════════════════
    // POST /api/applicants — CreateApplicant
    // ════════════════════════════════════════════════════════════════

    [Test]
    public async Task CreateApplicant_ValidDto_Returns201WithResponseDto()
    {
        // Arrange — NationalID not duplicate, CreateAsync succeeds
        _applicantRepoMock.Setup(r => r.GetByNationalIdAsync("AADHAR123456"))
            .ReturnsAsync((Applicant?)null);
        _applicantRepoMock.Setup(r => r.CreateAsync(It.IsAny<Applicant>()))
            .ReturnsAsync((Applicant a) =>
            {
                a.ApplicantID = 1; // simulate DB generating ID
                return a;
            });

        // Act
        var result = await _controller.CreateApplicant(_validCreateDto, CancellationToken.None);

        // Assert
        var createdResult = result.Result as CreatedAtActionResult;
        Assert.That(createdResult, Is.Not.Null);
        Assert.That(createdResult!.StatusCode, Is.EqualTo(201));

        var response = createdResult.Value as ApplicantResponseDto;
        Assert.That(response, Is.Not.Null);
        Assert.That(response!.Name, Is.EqualTo("Neha Gupta"));
        Assert.That(response.ProgramApplied, Is.EqualTo("B.Tech Computer Science"));
        Assert.That(response.ApplicationStatus, Is.EqualTo(ApplicationStatus.Submitted));
        Assert.That(response.NationalID, Is.EqualTo("AADHAR123456"));

        // Verify CreateAsync was called exactly once
        _applicantRepoMock.Verify(r => r.CreateAsync(It.IsAny<Applicant>()), Times.Once);
    }

    [Test]
    public async Task CreateApplicant_NullNationalID_Returns201_SkipsDuplicateCheck()
    {
        // Arrange — NationalID is null, duplicate check should be skipped entirely
        var dto = new CreateApplicantDto
        {
            Name = "Ravi Sharma",
            DOB = new DateTime(2004, 7, 20),
            NationalID = null,
            ProgramApplied = "M.Tech CS"
        };

        _applicantRepoMock.Setup(r => r.CreateAsync(It.IsAny<Applicant>()))
            .ReturnsAsync((Applicant a) => { a.ApplicantID = 2; return a; });

        // Act
        var result = await _controller.CreateApplicant(dto, CancellationToken.None);

        // Assert
        var createdResult = result.Result as CreatedAtActionResult;
        Assert.That(createdResult, Is.Not.Null);

        var response = createdResult!.Value as ApplicantResponseDto;
        Assert.That(response!.NationalID, Is.Null);

        // Verify GetByNationalIdAsync was NEVER called — skipped because NationalID is null
        _applicantRepoMock.Verify(r => r.GetByNationalIdAsync(It.IsAny<string>()), Times.Never);
    }

    [Test]
    public async Task CreateApplicant_DuplicateNationalID_Returns409()
    {
        // Arrange — NationalID already exists in database
        _applicantRepoMock.Setup(r => r.GetByNationalIdAsync("AADHAR123456"))
            .ReturnsAsync(_testApplicant);

        // Act
        var result = await _controller.CreateApplicant(_validCreateDto, CancellationToken.None);

        // Assert
        var conflict = result.Result as ConflictObjectResult;
        Assert.That(conflict, Is.Not.Null);
        Assert.That(conflict!.StatusCode, Is.EqualTo(409));

        // Verify CreateAsync was NEVER called — validation stopped it
        _applicantRepoMock.Verify(r => r.CreateAsync(It.IsAny<Applicant>()), Times.Never);
    }

    [Test]
    public async Task CreateApplicant_FutureDOB_Returns400_InvalidDOB()
    {
        // Arrange — DOB is in the future (BUG-6 fix validation)
        var dto = new CreateApplicantDto
        {
            Name = "Future Person",
            DOB = DateTime.UtcNow.AddYears(1), // 1 year in the future
            NationalID = null,
            ProgramApplied = "B.Tech CS"
        };

        // Act
        var result = await _controller.CreateApplicant(dto, CancellationToken.None);

        // Assert
        var badRequest = result.Result as BadRequestObjectResult;
        Assert.That(badRequest, Is.Not.Null);
        Assert.That(badRequest!.StatusCode, Is.EqualTo(400));

        // Verify neither duplicate check nor create were called
        _applicantRepoMock.Verify(r => r.GetByNationalIdAsync(It.IsAny<string>()), Times.Never);
        _applicantRepoMock.Verify(r => r.CreateAsync(It.IsAny<Applicant>()), Times.Never);
    }

    [Test]
    public async Task CreateApplicant_TodayDOB_Returns400_InvalidDOB()
    {
        // Arrange — DOB is 1 day in the future (guaranteed to trigger DOB >= UtcNow)
        // Using DateTime.UtcNow exactly causes a race — by the time the controller
        // evaluates the check, a few milliseconds have passed and UtcNow is slightly
        // ahead of dto.DOB, making it appear "in the past".
        var dto = new CreateApplicantDto
        {
            Name = "Born Tomorrow",
            DOB = DateTime.UtcNow.AddDays(1),
            NationalID = null,
            ProgramApplied = "B.Tech CS"
        };

        // Act
        var result = await _controller.CreateApplicant(dto, CancellationToken.None);

        // Assert — DOB >= UtcNow returns 400
        var badRequest = result.Result as BadRequestObjectResult;
        Assert.That(badRequest, Is.Not.Null);
    }

    // ════════════════════════════════════════════════════════════════
    // GET /api/applicants — GetApplicants (list all)
    // ════════════════════════════════════════════════════════════════

    [Test]
    public async Task GetApplicants_ReturnsAllApplicants()
    {
        // Arrange
        var applicants = new List<Applicant>
        {
            new Applicant
            {
                ApplicantID = 1, Name = "Neha Gupta",
                DOB = new DateTime(2005, 3, 15),
                ProgramApplied = "B.Tech CS",
                ApplicationStatus = ApplicationStatus.Submitted
            },
            new Applicant
            {
                ApplicantID = 2, Name = "Amit Verma",
                DOB = new DateTime(2004, 8, 22),
                ProgramApplied = "M.Tech CS",
                ApplicationStatus = ApplicationStatus.Accepted
            }
        };
        _applicantRepoMock.Setup(r => r.GetAllAsync()).ReturnsAsync(applicants);

        // Act
        var result = await _controller.GetApplicants(CancellationToken.None);

        // Assert
        var okResult = result.Result as OkObjectResult;
        Assert.That(okResult, Is.Not.Null);
        Assert.That(okResult!.StatusCode, Is.EqualTo(200));

        var list = (okResult.Value as IEnumerable<ApplicantResponseDto>)?.ToList();
        Assert.That(list, Is.Not.Null);
        Assert.That(list!.Count, Is.EqualTo(2));
        Assert.That(list[0].Name, Is.EqualTo("Neha Gupta"));
        Assert.That(list[1].ApplicationStatus, Is.EqualTo(ApplicationStatus.Accepted));
    }

    [Test]
    public async Task GetApplicants_NoApplicants_ReturnsEmptyList()
    {
        // Arrange — database has no applicants
        _applicantRepoMock.Setup(r => r.GetAllAsync())
            .ReturnsAsync(new List<Applicant>());

        // Act
        var result = await _controller.GetApplicants(CancellationToken.None);

        // Assert
        var okResult = result.Result as OkObjectResult;
        var list = (okResult!.Value as IEnumerable<ApplicantResponseDto>)?.ToList();
        Assert.That(list!.Count, Is.EqualTo(0));
    }

    // ════════════════════════════════════════════════════════════════
    // GET /api/applicants/{id} — GetApplicant (single)
    // ════════════════════════════════════════════════════════════════

    [Test]
    public async Task GetApplicant_Exists_Returns200()
    {
        // Arrange
        _applicantRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(_testApplicant);

        // Act
        var result = await _controller.GetApplicant(1, CancellationToken.None);

        // Assert
        var okResult = result.Result as OkObjectResult;
        Assert.That(okResult, Is.Not.Null);
        Assert.That(okResult!.StatusCode, Is.EqualTo(200));

        var response = okResult.Value as ApplicantResponseDto;
        Assert.That(response!.ApplicantID, Is.EqualTo(1));
        Assert.That(response.Name, Is.EqualTo("Neha Gupta"));
        Assert.That(response.NationalID, Is.EqualTo("AADHAR123456"));
    }

    [Test]
    public async Task GetApplicant_NotFound_Returns404()
    {
        // Arrange
        _applicantRepoMock.Setup(r => r.GetByIdAsync(999))
            .ReturnsAsync((Applicant?)null);

        // Act
        var result = await _controller.GetApplicant(999, CancellationToken.None);

        // Assert
        var notFound = result.Result as NotFoundObjectResult;
        Assert.That(notFound, Is.Not.Null);
        Assert.That(notFound!.StatusCode, Is.EqualTo(404));
    }

    // ════════════════════════════════════════════════════════════════
    // PUT /api/applicants/{id}/status — UpdateStatus
    // ════════════════════════════════════════════════════════════════

    [Test]
    public async Task UpdateStatus_SubmittedToAccepted_Returns200()
    {
        // Arrange — applicant is Submitted, changing to Accepted
        _applicantRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(_testApplicant);
        _applicantRepoMock.Setup(r => r.UpdateAsync(It.IsAny<Applicant>()))
            .ReturnsAsync((Applicant a) => a);

        var dto = new UpdateApplicantStatusDto { Status = ApplicationStatus.Accepted };

        // Act
        var result = await _controller.UpdateStatus(1, dto, CancellationToken.None);

        // Assert
        var okResult = result.Result as OkObjectResult;
        Assert.That(okResult, Is.Not.Null);

        var response = okResult!.Value as ApplicantResponseDto;
        Assert.That(response!.ApplicationStatus, Is.EqualTo(ApplicationStatus.Accepted));

        // Verify UpdateAsync was called once
        _applicantRepoMock.Verify(r => r.UpdateAsync(It.IsAny<Applicant>()), Times.Once);
    }

    [Test]
    public async Task UpdateStatus_SubmittedToRejected_Returns200()
    {
        // Arrange
        _applicantRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(_testApplicant);
        _applicantRepoMock.Setup(r => r.UpdateAsync(It.IsAny<Applicant>()))
            .ReturnsAsync((Applicant a) => a);

        var dto = new UpdateApplicantStatusDto { Status = ApplicationStatus.Rejected };

        // Act
        var result = await _controller.UpdateStatus(1, dto, CancellationToken.None);

        // Assert
        var okResult = result.Result as OkObjectResult;
        var response = okResult!.Value as ApplicantResponseDto;
        Assert.That(response!.ApplicationStatus, Is.EqualTo(ApplicationStatus.Rejected));
    }

    [Test]
    public async Task UpdateStatus_SubmittedToWaitlisted_Returns200()
    {
        // Arrange
        _applicantRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(_testApplicant);
        _applicantRepoMock.Setup(r => r.UpdateAsync(It.IsAny<Applicant>()))
            .ReturnsAsync((Applicant a) => a);

        var dto = new UpdateApplicantStatusDto { Status = ApplicationStatus.Waitlisted };

        // Act
        var result = await _controller.UpdateStatus(1, dto, CancellationToken.None);

        // Assert
        var okResult = result.Result as OkObjectResult;
        var response = okResult!.Value as ApplicantResponseDto;
        Assert.That(response!.ApplicationStatus, Is.EqualTo(ApplicationStatus.Waitlisted));
    }

    [Test]
    public async Task UpdateStatus_SubmittedToUnderReview_Returns200()
    {
        // Arrange
        _applicantRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(_testApplicant);
        _applicantRepoMock.Setup(r => r.UpdateAsync(It.IsAny<Applicant>()))
            .ReturnsAsync((Applicant a) => a);

        var dto = new UpdateApplicantStatusDto { Status = ApplicationStatus.UnderReview };

        // Act
        var result = await _controller.UpdateStatus(1, dto, CancellationToken.None);

        // Assert
        var okResult = result.Result as OkObjectResult;
        var response = okResult!.Value as ApplicantResponseDto;
        Assert.That(response!.ApplicationStatus, Is.EqualTo(ApplicationStatus.UnderReview));
    }

    [Test]
    public async Task UpdateStatus_ApplicantNotFound_Returns404()
    {
        // Arrange
        _applicantRepoMock.Setup(r => r.GetByIdAsync(999))
            .ReturnsAsync((Applicant?)null);

        var dto = new UpdateApplicantStatusDto { Status = ApplicationStatus.Accepted };

        // Act
        var result = await _controller.UpdateStatus(999, dto, CancellationToken.None);

        // Assert
        var notFound = result.Result as NotFoundObjectResult;
        Assert.That(notFound, Is.Not.Null);
        Assert.That(notFound!.StatusCode, Is.EqualTo(404));

        // Verify UpdateAsync was NEVER called — applicant not found
        _applicantRepoMock.Verify(r => r.UpdateAsync(It.IsAny<Applicant>()), Times.Never);
    }

    // ════════════════════════════════════════════════════════════════
    // Mapping verification
    // ════════════════════════════════════════════════════════════════

    [Test]
    public async Task MapToDto_AllFieldsMappedCorrectly()
    {
        // Arrange — create an applicant with every field set
        var fullApplicant = new Applicant
        {
            ApplicantID = 5,
            Name = "Full Test",
            DOB = new DateTime(2003, 1, 1),
            NationalID = "NAT789",
            ContactInfoJSON = "{\"phone\": \"+91-1111111111\"}",
            ProgramApplied = "M.Tech Data Science",
            ApplicationStatus = ApplicationStatus.UnderReview,
            SubmittedAt = new DateTime(2026, 4, 1, 10, 30, 0),
            DocumentsURIJSON = "[\"https://docs/transcript.pdf\"]"
        };
        _applicantRepoMock.Setup(r => r.GetByIdAsync(5)).ReturnsAsync(fullApplicant);

        // Act
        var result = await _controller.GetApplicant(5, CancellationToken.None);

        // Assert — verify every field is mapped correctly
        var okResult = result.Result as OkObjectResult;
        var response = okResult!.Value as ApplicantResponseDto;

        Assert.That(response!.ApplicantID, Is.EqualTo(5));
        Assert.That(response.Name, Is.EqualTo("Full Test"));
        Assert.That(response.DOB, Is.EqualTo(new DateTime(2003, 1, 1)));
        Assert.That(response.NationalID, Is.EqualTo("NAT789"));
        Assert.That(response.ContactInfoJSON, Is.EqualTo("{\"phone\": \"+91-1111111111\"}"));
        Assert.That(response.ProgramApplied, Is.EqualTo("M.Tech Data Science"));
        Assert.That(response.ApplicationStatus, Is.EqualTo(ApplicationStatus.UnderReview));
        Assert.That(response.SubmittedAt, Is.EqualTo(new DateTime(2026, 4, 1, 10, 30, 0)));
        Assert.That(response.DocumentsURIJSON, Is.EqualTo("[\"https://docs/transcript.pdf\"]"));
    }
}