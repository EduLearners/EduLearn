using EduLearn.API.Controllers;
using EduLearn.API.DTOs;
using EduLearn.API.Models;
using EduLearn.API.Models.Enums;
using EduLearn.API.Repositories.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Moq;

namespace EduLearn_Testing.Controller;

[TestFixture]
public class KPIsControllerTest
{
    // ── Mock dependencies ──
    private Mock<IReportRepository> _reportRepoMock;
    private Mock<ILogger<KPIsController>> _loggerMock;

    // ── Controller under test ──
    private KPIsController _controller;

    // ── Reusable test data ──
    private List<KPI> _testKPIs;

    [SetUp]
    public void Setup()
    {
        _reportRepoMock = new Mock<IReportRepository>();
        _loggerMock = new Mock<ILogger<KPIsController>>();

        _controller = new KPIsController(
            _reportRepoMock.Object,
            _loggerMock.Object);

        _testKPIs = new List<KPI>
        {
            new KPI
            {
                KPIID = 1, Name = "Active Student Count",
                Definition = "Total students with Active status",
                Target = null, CurrentValue = 350,
                ReportingPeriod = ReportingPeriod.Semester
            },
            new KPI
            {
                KPIID = 2, Name = "Section Fill Rate",
                Definition = "Average EnrolledCount / Capacity (%)",
                Target = 80.00m, CurrentValue = 72.50m,
                ReportingPeriod = ReportingPeriod.Semester
            }
        };
    }

    // ════════════════════════════════════════════════════════════════
    // GET /api/kpis
    // ════════════════════════════════════════════════════════════════

    [Test]
    public async Task GetAllKPIs_ReturnsList()
    {
        // Arrange
        _reportRepoMock.Setup(r => r.GetAllKPIsAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(_testKPIs);

        // Act
        var result = await _controller.GetAllKPIs(CancellationToken.None);

        // Assert
        var ok = result.Result as OkObjectResult;
        Assert.That(ok, Is.Not.Null);

        var list = (ok!.Value as IEnumerable<KPIResponseDto>)?.ToList();
        Assert.That(list!.Count, Is.EqualTo(2));
        Assert.That(list[0].Name, Is.EqualTo("Active Student Count"));
        Assert.That(list[0].CurrentValue, Is.EqualTo(350));
        Assert.That(list[1].Name, Is.EqualTo("Section Fill Rate"));
        Assert.That(list[1].Target, Is.EqualTo(80.00m));
    }

    [Test]
    public async Task GetAllKPIs_Empty_ReturnsEmptyList()
    {
        // Arrange
        _reportRepoMock.Setup(r => r.GetAllKPIsAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<KPI>());

        // Act
        var result = await _controller.GetAllKPIs(CancellationToken.None);

        // Assert
        var ok = result.Result as OkObjectResult;
        var list = (ok!.Value as IEnumerable<KPIResponseDto>)?.ToList();
        Assert.That(list!.Count, Is.EqualTo(0));
    }

    // ════════════════════════════════════════════════════════════════
    // POST /api/kpis/recalculate
    // ════════════════════════════════════════════════════════════════

    [Test]
    public async Task Recalculate_Returns200WithUpdatedKPIs()
    {
        // Arrange — recalculation updates CurrentValue
        var recalculated = new List<KPI>
        {
            new KPI
            {
                KPIID = 1, Name = "Active Student Count",
                Definition = "Total students with Active status",
                Target = null, CurrentValue = 380, // updated
                ReportingPeriod = ReportingPeriod.Semester
            },
            new KPI
            {
                KPIID = 2, Name = "Section Fill Rate",
                Definition = "Average EnrolledCount / Capacity (%)",
                Target = 80.00m, CurrentValue = 75.00m, // updated
                ReportingPeriod = ReportingPeriod.Semester
            }
        };
        _reportRepoMock.Setup(r => r.RecalculateAndSaveAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(recalculated);

        // Act
        var result = await _controller.Recalculate(CancellationToken.None);

        // Assert
        var ok = result.Result as OkObjectResult;
        Assert.That(ok, Is.Not.Null);

        var response = ok!.Value as RecalculateResponseDto;
        Assert.That(response!.KPIsUpdated, Is.EqualTo(2));
        Assert.That(response.KPIs[0].CurrentValue, Is.EqualTo(380));
        Assert.That(response.KPIs[1].CurrentValue, Is.EqualTo(75.00m));

        _reportRepoMock.Verify(r => r.RecalculateAndSaveAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    // ════════════════════════════════════════════════════════════════
    // POST /api/kpis/seed
    // ════════════════════════════════════════════════════════════════

    [Test]
    public async Task SeedKPIs_FirstTime_Returns200()
    {
        // Arrange — no KPIs exist yet
        _reportRepoMock.Setup(r => r.AnyKPIsExistAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);
        _reportRepoMock.Setup(r => r.SeedKPIsAsync(It.IsAny<IEnumerable<KPI>>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        // Act
        var result = await _controller.SeedKPIs(CancellationToken.None);

        // Assert
        var ok = result as OkObjectResult;
        Assert.That(ok, Is.Not.Null);
        Assert.That(ok!.StatusCode, Is.EqualTo(200));

        _reportRepoMock.Verify(r => r.SeedKPIsAsync(It.IsAny<IEnumerable<KPI>>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Test]
    public async Task SeedKPIs_AlreadySeeded_Returns409()
    {
        // Arrange — KPIs already exist
        _reportRepoMock.Setup(r => r.AnyKPIsExistAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        // Act
        var result = await _controller.SeedKPIs(CancellationToken.None);

        // Assert
        var conflict = result as ConflictObjectResult;
        Assert.That(conflict, Is.Not.Null);
        Assert.That(conflict!.StatusCode, Is.EqualTo(409));

        _reportRepoMock.Verify(r => r.SeedKPIsAsync(It.IsAny<IEnumerable<KPI>>(), It.IsAny<CancellationToken>()), Times.Never);
    }
}