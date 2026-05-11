using EduLearn.API.Controllers;
using EduLearn.API.DTOs;
using EduLearn.API.Models;
using EduLearn.API.Models.Enums;
using EduLearn.API.Repositories.Interfaces;
using EduLearn.API.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Moq;

namespace EduLearn_Testing.Controller;

[TestFixture]
public class AuditPackagesControllerTest
{
    // ── Mock dependencies ──
    private Mock<IReportRepository> _reportRepoMock;
    private Mock<ILogger<AuditPackagesController>> _loggerMock;
    private Mock<PdfGeneratorService> _pdfGeneratorMock;

    // ── Controller under test ──
    private AuditPackagesController _controller;

    // ── Reusable test data ──
    private AuditPackage _testPackage;

    [SetUp]
    public void Setup()
    {
        _reportRepoMock = new Mock<IReportRepository>();
        _loggerMock = new Mock<ILogger<AuditPackagesController>>();
        _pdfGeneratorMock = new Mock<PdfGeneratorService>();

        _controller = new AuditPackagesController(
            _reportRepoMock.Object,
            _loggerMock.Object,
            _pdfGeneratorMock.Object);

        _testPackage = new AuditPackage
        {
            PackageID = 1,
            PeriodStart = new DateTime(2026, 1, 1),
            PeriodEnd = new DateTime(2026, 3, 31),
            ContentsJSON = "[{\"reportType\":\"Institution\",\"reportID\":1}]",
            GeneratedAt = DateTime.UtcNow
        };
    }

    // ════════════════════════════════════════════════════════════════
    // POST /api/audit-packages/generate
    // ════════════════════════════════════════════════════════════════

    [Test]
    public async Task Generate_ValidDto_Returns201()
    {
        // Arrange — 1 report falls within the period
        var reports = new List<Report>
        {
            new Report
            {
                ReportID = 1, Scope = ReportScope.Institution,
                GeneratedByFK = 10,
                GeneratedAt = new DateTime(2026, 2, 15)
            }
        };
        _reportRepoMock.Setup(r => r.GetAllReportsAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(reports);
        _reportRepoMock.Setup(r => r.CreateAuditPackageAsync(It.IsAny<AuditPackage>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((AuditPackage p, CancellationToken _) => { p.PackageID = 1; return p; });

        var dto = new GenerateAuditPackageDto
        {
            PeriodStart = new DateTime(2026, 1, 1),
            PeriodEnd = new DateTime(2026, 3, 31)
        };

        // Act
        var result = await _controller.Generate(dto, CancellationToken.None);

        // Assert
        var created = result.Result as CreatedAtActionResult;
        Assert.That(created, Is.Not.Null);
        Assert.That(created!.StatusCode, Is.EqualTo(201));

        var response = created.Value as AuditPackageResponseDto;
        Assert.That(response!.PeriodStart, Is.EqualTo(new DateTime(2026, 1, 1)));
        Assert.That(response.PeriodEnd, Is.EqualTo(new DateTime(2026, 3, 31)));
        Assert.That(response.ContentsJSON, Does.Contain("Institution"));

        _reportRepoMock.Verify(r => r.CreateAuditPackageAsync(It.IsAny<AuditPackage>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Test]
    public async Task Generate_InvalidDateRange_Returns400()
    {
        // Arrange — PeriodEnd before PeriodStart
        var dto = new GenerateAuditPackageDto
        {
            PeriodStart = new DateTime(2026, 6, 30),
            PeriodEnd = new DateTime(2026, 1, 1) // before start
        };

        // Act
        var result = await _controller.Generate(dto, CancellationToken.None);

        // Assert
        var badRequest = result.Result as BadRequestObjectResult;
        Assert.That(badRequest, Is.Not.Null);
        Assert.That(badRequest!.StatusCode, Is.EqualTo(400));

        _reportRepoMock.Verify(r => r.CreateAuditPackageAsync(It.IsAny<AuditPackage>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Test]
    public async Task Generate_NoReportsInPeriod_Returns201WithEmptyContents()
    {
        // Arrange — reports exist but none fall within the period
        var reports = new List<Report>
        {
            new Report
            {
                ReportID = 1, Scope = ReportScope.Course,
                GeneratedByFK = 10,
                GeneratedAt = new DateTime(2025, 6, 15) // outside period
            }
        };
        _reportRepoMock.Setup(r => r.GetAllReportsAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(reports);
        _reportRepoMock.Setup(r => r.CreateAuditPackageAsync(It.IsAny<AuditPackage>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((AuditPackage p, CancellationToken _) => { p.PackageID = 2; return p; });

        var dto = new GenerateAuditPackageDto
        {
            PeriodStart = new DateTime(2026, 1, 1),
            PeriodEnd = new DateTime(2026, 3, 31)
        };

        // Act
        var result = await _controller.Generate(dto, CancellationToken.None);

        // Assert — still creates the package, but with empty contents
        var created = result.Result as CreatedAtActionResult;
        Assert.That(created, Is.Not.Null);

        var response = created!.Value as AuditPackageResponseDto;
        Assert.That(response!.ContentsJSON, Is.EqualTo("[]"));
    }

    // ════════════════════════════════════════════════════════════════
    // GET /api/audit-packages/{id}/download
    // ════════════════════════════════════════════════════════════════

    [Test]
    public async Task Download_NotFound_Returns404()
    {
        // Arrange
        _reportRepoMock.Setup(r => r.GetAuditPackageByIdAsync(999, It.IsAny<CancellationToken>()))
            .ReturnsAsync((AuditPackage?)null);

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
        // Arrange
        _reportRepoMock.Setup(r => r.GetAuditPackageByIdAsync(1, It.IsAny<CancellationToken>()))
            .ReturnsAsync(_testPackage);

        // Act
        var result = await _controller.Download(1, "json", CancellationToken.None);

        // Assert
        var fileResult = result as FileContentResult;
        Assert.That(fileResult, Is.Not.Null);
        Assert.That(fileResult!.ContentType, Is.EqualTo("application/json"));
        Assert.That(fileResult.FileDownloadName, Does.Contain("audit-package-1"));
        Assert.That(fileResult.FileDownloadName, Does.EndWith(".json"));
    }
}