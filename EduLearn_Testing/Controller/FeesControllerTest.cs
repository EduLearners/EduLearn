using EduLearn.API.Controllers;
using EduLearn.API.DTOs;
using EduLearn.API.Models;
using EduLearn.API.Models.Enums;
using EduLearn.API.Repositories.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Moq;

namespace EduLearn_Testing.Controller;

[TestFixture]
public class FeesControllerTest
{
    // ── Mock dependencies ──
    private Mock<IFeeScheduleRepository> _feeRepoMock;
    private Mock<IProgramRepository> _programRepoMock;

    // ── Controller under test ──
    private FeesController _controller;

    // ── Reusable test data ──
    private EduLearn.API.Models.Program _testProgram;
    private FeeSchedule _draftFee;
    private FeeSchedule _supersededFee;
    private CreateFeeScheduleDto _validCreateDto;

    [SetUp]
    public void Setup()
    {
        _feeRepoMock = new Mock<IFeeScheduleRepository>();
        _programRepoMock = new Mock<IProgramRepository>();

        _controller = new FeesController(
            _feeRepoMock.Object,
            _programRepoMock.Object);

        _testProgram = new EduLearn.API.Models.Program
        {
            ProgramID = 1,
            Name = "B.Tech Computer Science",
            DegreeType = "Bachelor",
            DurationTerms = 8,
            Status = ProgramStatus.Active
        };

        _draftFee = new FeeSchedule
        {
            FeeID = 1,
            ProgramID = 1,
            Term = "Fall 2026",
            FeeItemsJSON = "[{\"item\":\"Tuition\",\"amount\":50000}]",
            EffectiveFrom = new DateTime(2026, 7, 1),
            EffectiveTo = new DateTime(2026, 12, 31),
            Status = FeeScheduleStatus.Draft,
            Program = _testProgram
        };

        _supersededFee = new FeeSchedule
        {
            FeeID = 2,
            ProgramID = 1,
            Term = "Spring 2026",
            FeeItemsJSON = "[{\"item\":\"Tuition\",\"amount\":45000}]",
            EffectiveFrom = new DateTime(2026, 1, 1),
            EffectiveTo = new DateTime(2026, 6, 30),
            Status = FeeScheduleStatus.Superseded,
            Program = _testProgram
        };

        _validCreateDto = new CreateFeeScheduleDto
        {
            ProgramID = 1,
            Term = "Fall 2026",
            FeeItemsJSON = "[{\"item\":\"Tuition\",\"amount\":50000}]",
            EffectiveFrom = new DateTime(2026, 7, 1),
            EffectiveTo = new DateTime(2026, 12, 31)
        };
    }

    // ════════════════════════════════════════════════════════════════
    // POST /api/fees — Create
    // ════════════════════════════════════════════════════════════════

    [Test]
    public async Task Create_ValidDto_Returns201()
    {
        // Arrange
        _programRepoMock.Setup(r => r.ExistsAsync(1)).ReturnsAsync(true);
        _feeRepoMock.Setup(r => r.CreateAsync(It.IsAny<FeeSchedule>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((FeeSchedule f, CancellationToken _) =>
            {
                f.FeeID = 1;
                f.Program = _testProgram;
                return f;
            });

        // Act
        var result = await _controller.Create(_validCreateDto, CancellationToken.None);

        // Assert
        var created = result.Result as CreatedAtActionResult;
        Assert.That(created, Is.Not.Null);
        Assert.That(created!.StatusCode, Is.EqualTo(201));

        var response = created.Value as FeeScheduleResponseDto;
        Assert.That(response!.Term, Is.EqualTo("Fall 2026"));
        Assert.That(response.Status, Is.EqualTo(FeeScheduleStatus.Draft));

        _feeRepoMock.Verify(r => r.CreateAsync(It.IsAny<FeeSchedule>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Test]
    public async Task Create_ProgramNotFound_Returns400()
    {
        // Arrange
        _programRepoMock.Setup(r => r.ExistsAsync(999)).ReturnsAsync(false);

        var dto = new CreateFeeScheduleDto
        {
            ProgramID = 999,
            Term = "Fall 2026",
            FeeItemsJSON = "[]",
            EffectiveFrom = new DateTime(2026, 7, 1),
            EffectiveTo = new DateTime(2026, 12, 31)
        };

        // Act
        var result = await _controller.Create(dto, CancellationToken.None);

        // Assert
        var badRequest = result.Result as BadRequestObjectResult;
        Assert.That(badRequest, Is.Not.Null);
        Assert.That(badRequest!.StatusCode, Is.EqualTo(400));

        _feeRepoMock.Verify(r => r.CreateAsync(It.IsAny<FeeSchedule>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Test]
    public async Task Create_InvalidDateRange_Returns400()
    {
        // Arrange — EffectiveFrom AFTER EffectiveTo
        _programRepoMock.Setup(r => r.ExistsAsync(1)).ReturnsAsync(true);

        var dto = new CreateFeeScheduleDto
        {
            ProgramID = 1,
            Term = "Fall 2026",
            FeeItemsJSON = "[]",
            EffectiveFrom = new DateTime(2026, 12, 31), // after
            EffectiveTo = new DateTime(2026, 7, 1)      // before
        };

        // Act
        var result = await _controller.Create(dto, CancellationToken.None);

        // Assert
        var badRequest = result.Result as BadRequestObjectResult;
        Assert.That(badRequest, Is.Not.Null);

        _feeRepoMock.Verify(r => r.CreateAsync(It.IsAny<FeeSchedule>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    // ════════════════════════════════════════════════════════════════
    // GET /api/fees/program/{programId}/term/{term}
    // ════════════════════════════════════════════════════════════════

    [Test]
    public async Task GetByProgramAndTerm_Exists_Returns200()
    {
        // Arrange
        _feeRepoMock.Setup(r => r.GetByProgramAndTermAsync(1, "Fall 2026", It.IsAny<CancellationToken>()))
            .ReturnsAsync(_draftFee);

        // Act
        var result = await _controller.GetByProgramAndTerm(1, "Fall 2026", CancellationToken.None);

        // Assert
        var ok = result.Result as OkObjectResult;
        Assert.That(ok, Is.Not.Null);

        var response = ok!.Value as FeeScheduleResponseDto;
        Assert.That(response!.FeeID, Is.EqualTo(1));
        Assert.That(response.Term, Is.EqualTo("Fall 2026"));
        Assert.That(response.ProgramName, Is.EqualTo("B.Tech Computer Science"));
    }

    [Test]
    public async Task GetByProgramAndTerm_NotFound_Returns404()
    {
        // Arrange
        _feeRepoMock.Setup(r => r.GetByProgramAndTermAsync(999, "Fall 2026", It.IsAny<CancellationToken>()))
            .ReturnsAsync((FeeSchedule?)null);

        // Act
        var result = await _controller.GetByProgramAndTerm(999, "Fall 2026", CancellationToken.None);

        // Assert
        var notFound = result.Result as NotFoundObjectResult;
        Assert.That(notFound, Is.Not.Null);
        Assert.That(notFound!.StatusCode, Is.EqualTo(404));
    }

    // ════════════════════════════════════════════════════════════════
    // PUT /api/fees/{id} — Update
    // ════════════════════════════════════════════════════════════════

    [Test]
    public async Task Update_ValidDto_Returns200()
    {
        // Arrange
        _feeRepoMock.Setup(r => r.GetByIdAsync(1, It.IsAny<CancellationToken>()))
            .ReturnsAsync(_draftFee);
        _feeRepoMock.Setup(r => r.UpdateAsync(It.IsAny<FeeSchedule>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((FeeSchedule f, CancellationToken _) => f);

        var dto = new UpdateFeeScheduleDto
        {
            FeeItemsJSON = "[{\"item\":\"Tuition\",\"amount\":55000}]",
            EffectiveFrom = new DateTime(2026, 7, 1),
            EffectiveTo = new DateTime(2026, 12, 31),
            Status = FeeScheduleStatus.Active
        };

        // Act
        var result = await _controller.Update(1, dto, CancellationToken.None);

        // Assert
        var ok = result.Result as OkObjectResult;
        var response = ok!.Value as FeeScheduleResponseDto;
        Assert.That(response!.Status, Is.EqualTo(FeeScheduleStatus.Active));

        _feeRepoMock.Verify(r => r.UpdateAsync(It.IsAny<FeeSchedule>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Test]
    public async Task Update_NotFound_Returns404()
    {
        // Arrange
        _feeRepoMock.Setup(r => r.GetByIdAsync(999, It.IsAny<CancellationToken>()))
            .ReturnsAsync((FeeSchedule?)null);

        var dto = new UpdateFeeScheduleDto
        {
            FeeItemsJSON = "[]",
            EffectiveFrom = new DateTime(2026, 7, 1),
            EffectiveTo = new DateTime(2026, 12, 31),
            Status = FeeScheduleStatus.Draft
        };

        // Act
        var result = await _controller.Update(999, dto, CancellationToken.None);

        // Assert
        var notFound = result.Result as NotFoundObjectResult;
        Assert.That(notFound, Is.Not.Null);

        _feeRepoMock.Verify(r => r.UpdateAsync(It.IsAny<FeeSchedule>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Test]
    public async Task Update_InvalidDateRange_Returns400()
    {
        // Arrange
        _feeRepoMock.Setup(r => r.GetByIdAsync(1, It.IsAny<CancellationToken>()))
            .ReturnsAsync(_draftFee);

        var dto = new UpdateFeeScheduleDto
        {
            FeeItemsJSON = "[]",
            EffectiveFrom = new DateTime(2026, 12, 31),
            EffectiveTo = new DateTime(2026, 7, 1), // before EffectiveFrom
            Status = FeeScheduleStatus.Draft
        };

        // Act
        var result = await _controller.Update(1, dto, CancellationToken.None);

        // Assert
        var badRequest = result.Result as BadRequestObjectResult;
        Assert.That(badRequest, Is.Not.Null);

        _feeRepoMock.Verify(r => r.UpdateAsync(It.IsAny<FeeSchedule>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Test]
    public async Task Update_SupersededCannotBeRevived_Returns400()
    {
        // Arrange — HARDENING M-14: Superseded is terminal
        _feeRepoMock.Setup(r => r.GetByIdAsync(2, It.IsAny<CancellationToken>()))
            .ReturnsAsync(_supersededFee);

        var dto = new UpdateFeeScheduleDto
        {
            FeeItemsJSON = "[]",
            EffectiveFrom = new DateTime(2026, 1, 1),
            EffectiveTo = new DateTime(2026, 6, 30),
            Status = FeeScheduleStatus.Active // trying to revive from Superseded
        };

        // Act
        var result = await _controller.Update(2, dto, CancellationToken.None);

        // Assert
        var badRequest = result.Result as BadRequestObjectResult;
        Assert.That(badRequest, Is.Not.Null);
        Assert.That(badRequest!.StatusCode, Is.EqualTo(400));

        _feeRepoMock.Verify(r => r.UpdateAsync(It.IsAny<FeeSchedule>(), It.IsAny<CancellationToken>()), Times.Never);
    }
}