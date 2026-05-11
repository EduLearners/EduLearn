using System.Security.Claims;
using EduLearn.API.Controllers;
using EduLearn.API.DTOs;
using EduLearn.API.Models;
using EduLearn.API.Models.Enums;
using EduLearn.API.Repositories.Interfaces;
using EduLearn.API.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Moq;

namespace EduLearn_Testing.Controller;

[TestFixture]
public class ReportsControllerTest
{
    // ── Mock dependencies ──
    private Mock<IReportRepository> _reportRepoMock;
    private Mock<ILogger<ReportsController>> _loggerMock;
    private Mock<PdfGeneratorService> _pdfGeneratorMock;

    // ── Controller under test ──
    private ReportsController _controller;

    // ── Reusable test data ──
    private Report _testReport;

    [SetUp]
    public void Setup()
    {
        _reportRepoMock = new Mock<IReportRepository>();
        _loggerMock = new Mock<ILogger<ReportsController>>();
        _pdfGeneratorMock = new Mock<PdfGeneratorService>();

        _controller = new ReportsController(
            _reportRepoMock.Object,
            _loggerMock.Object,
            _pdfGeneratorMock.Object);

        _testReport = new Report
        {
            ReportID = 1,
            Scope = ReportScope.Institution,
            ParametersJSON = "{\"year\": 2026}",
            MetricsJSON = "{\"totalStudents\": 500}",
            GeneratedByFK = 10,
            GeneratedAt = DateTime.UtcNow,
            GeneratedBy = new User
            {
                UserID = 10,
                Username = "auditor1",
                FullName = "Audit Manager",
                Email = "auditor@edulearn.com",
                Role = UserRole.Auditor,
                PasswordHash = "hash",
                Status = UserStatus.Active
            }
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
    // POST /api/reports/generate
    // ════════════════════════════════════════════════════════════════

    [Test]
    public async Task GenerateReport_ValidDto_Returns201()
    {
        // Arrange
        SetCaller(10, "Auditor");
        _reportRepoMock.Setup(r => r.CreateReportAsync(It.IsAny<Report>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Report r, CancellationToken _) => { r.ReportID = 1; return r; });

        var dto = new GenerateReportDto
        {
            Scope = ReportScope.Institution,
            ParametersJSON = "{\"year\": 2026}"
        };

        // Act
        var result = await _controller.GenerateReport(dto, CancellationToken.None);

        // Assert
        var created = result.Result as CreatedAtActionResult;
        Assert.That(created, Is.Not.Null);
        Assert.That(created!.StatusCode, Is.EqualTo(201));

        var response = created.Value as ReportResponseDto;
        Assert.That(response!.Scope, Is.EqualTo(ReportScope.Institution));
        Assert.That(response.GeneratedByFK, Is.EqualTo(10)); // from JWT, not body

        _reportRepoMock.Verify(r => r.CreateReportAsync(It.IsAny<Report>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Test]
    public async Task GenerateReport_GeneratedByFK_ComesFromJWT()
    {
        // Arrange — H-3: GeneratedByFK always from JWT
        SetCaller(10, "Auditor");

        Report? capturedReport = null;
        _reportRepoMock.Setup(r => r.CreateReportAsync(It.IsAny<Report>(), It.IsAny<CancellationToken>()))
            .Callback<Report, CancellationToken>((r, _) => capturedReport = r)
            .ReturnsAsync((Report r, CancellationToken _) => { r.ReportID = 2; return r; });

        var dto = new GenerateReportDto
        {
            Scope = ReportScope.Course,
            ParametersJSON = null
        };

        // Act
        await _controller.GenerateReport(dto, CancellationToken.None);

        // Assert — GeneratedByFK is 10 (from JWT), not whatever body might have
        Assert.That(capturedReport, Is.Not.Null);
        Assert.That(capturedReport!.GeneratedByFK, Is.EqualTo(10));
    }

    // ════════════════════════════════════════════════════════════════
    // GET /api/reports
    // ════════════════════════════════════════════════════════════════

    [Test]
    public async Task GetAllReports_ReturnsList()
    {
        // Arrange
        SetCaller(10, "Auditor");
        _reportRepoMock.Setup(r => r.GetAllReportsAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Report> { _testReport });

        // Act
        var result = await _controller.GetAllReports(CancellationToken.None);

        // Assert
        var ok = result.Result as OkObjectResult;
        Assert.That(ok, Is.Not.Null);

        var list = (ok!.Value as IEnumerable<ReportResponseDto>)?.ToList();
        Assert.That(list!.Count, Is.EqualTo(1));
        Assert.That(list[0].Scope, Is.EqualTo(ReportScope.Institution));
        Assert.That(list[0].GeneratedByName, Is.EqualTo("Audit Manager"));
    }

    [Test]
    public async Task GetAllReports_Empty_ReturnsEmptyList()
    {
        // Arrange
        SetCaller(10, "Auditor");
        _reportRepoMock.Setup(r => r.GetAllReportsAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Report>());

        // Act
        var result = await _controller.GetAllReports(CancellationToken.None);

        // Assert
        var ok = result.Result as OkObjectResult;
        var list = (ok!.Value as IEnumerable<ReportResponseDto>)?.ToList();
        Assert.That(list!.Count, Is.EqualTo(0));
    }

    // ════════════════════════════════════════════════════════════════
    // GET /api/reports/{id}/download
    // ════════════════════════════════════════════════════════════════

    [Test]
    public async Task Download_NotFound_Returns404()
    {
        // Arrange
        SetCaller(10, "Auditor");
        _reportRepoMock.Setup(r => r.GetReportByIdAsync(999, It.IsAny<CancellationToken>()))
            .ReturnsAsync((Report?)null);

        // Act
        var result = await _controller.Download(999, null, CancellationToken.None);

        // Assert
        var notFound = result as NotFoundObjectResult;
        Assert.That(notFound, Is.Not.Null);
        Assert.That(notFound!.StatusCode, Is.EqualTo(404));
    }

    [Test]
    public async Task Download_JsonFormat_ReturnsJsonFile()
    {
        // Arrange — request JSON format instead of PDF
        SetCaller(10, "Auditor");
        _reportRepoMock.Setup(r => r.GetReportByIdAsync(1, It.IsAny<CancellationToken>()))
            .ReturnsAsync(_testReport);

        // Act
        var result = await _controller.Download(1, "json", CancellationToken.None);

        // Assert — should return a FileContentResult with JSON content type
        var fileResult = result as FileContentResult;
        Assert.That(fileResult, Is.Not.Null);
        Assert.That(fileResult!.ContentType, Is.EqualTo("application/json"));
        Assert.That(fileResult.FileDownloadName, Does.Contain("report-1"));
        Assert.That(fileResult.FileDownloadName, Does.EndWith(".json"));
    }
}