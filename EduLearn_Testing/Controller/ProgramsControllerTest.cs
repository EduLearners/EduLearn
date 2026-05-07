using EduLearn.API.Controllers;
using EduLearn.API.DTOs;
using EduLearn.API.Models.Enums;
using EduLearn.API.Repositories.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Moq;

namespace EduLearn_Testing.Controller;

[TestFixture]
public class ProgramsControllerTest
{
    // ── Mock dependency ──
    private Mock<IProgramRepository> _programRepoMock;

    // ── Controller under test ──
    private ProgramsController _controller;

    // ── Reusable test data ──
    private EduLearn.API.Models.Program _testProgram;
    private CreateProgramDto _validCreateDto;

    [SetUp]
    public void Setup()
    {
        _programRepoMock = new Mock<IProgramRepository>();
        _controller = new ProgramsController(_programRepoMock.Object);

        _testProgram = new EduLearn.API.Models.Program
        {
            ProgramID = 1,
            Name = "B.Tech Computer Science",
            DepartmentID = 1,
            DegreeType = "Bachelor",
            RequiredCoursesJSON = "[1, 2]",
            ElectivesJSON = null,
            DurationTerms = 8,
            Status = ProgramStatus.Active
        };

        _validCreateDto = new CreateProgramDto
        {
            Name = "B.Tech Computer Science",
            DepartmentID = 1,
            DegreeType = "Bachelor",
            RequiredCoursesJSON = "[1, 2]",
            ElectivesJSON = null,
            DurationTerms = 8
        };
    }

    // ════════════════════════════════════════════════════════════════
    // POST /api/programs — CreateProgram
    // ════════════════════════════════════════════════════════════════

    [Test]
    public async Task CreateProgram_ValidDto_Returns201()
    {
        // Arrange — no duplicate, create succeeds
        _programRepoMock.Setup(r => r.ExistsByNameAndDegreeAsync("B.Tech Computer Science", "Bachelor"))
            .ReturnsAsync(false);
        _programRepoMock.Setup(r => r.CreateAsync(It.IsAny<EduLearn.API.Models.Program>()))
            .ReturnsAsync((EduLearn.API.Models.Program p) => { p.ProgramID = 1; return p; });

        // Act
        var result = await _controller.CreateProgram(_validCreateDto);

        // Assert
        var created = result.Result as CreatedAtActionResult;
        Assert.That(created, Is.Not.Null);
        Assert.That(created!.StatusCode, Is.EqualTo(201));

        var response = created.Value as ProgramResponseDto;
        Assert.That(response!.Name, Is.EqualTo("B.Tech Computer Science"));
        Assert.That(response.DegreeType, Is.EqualTo("Bachelor"));
        Assert.That(response.DurationTerms, Is.EqualTo(8));
        Assert.That(response.Status, Is.EqualTo(ProgramStatus.Active));

        _programRepoMock.Verify(r => r.CreateAsync(It.IsAny<EduLearn.API.Models.Program>()), Times.Once);
    }

    [Test]
    public async Task CreateProgram_Duplicate_Returns409()
    {
        // Arrange — same name + degree already exists
        _programRepoMock.Setup(r => r.ExistsByNameAndDegreeAsync("B.Tech Computer Science", "Bachelor"))
            .ReturnsAsync(true);

        // Act
        var result = await _controller.CreateProgram(_validCreateDto);

        // Assert
        var conflict = result.Result as ConflictObjectResult;
        Assert.That(conflict, Is.Not.Null);
        Assert.That(conflict!.StatusCode, Is.EqualTo(409));

        _programRepoMock.Verify(r => r.CreateAsync(It.IsAny<EduLearn.API.Models.Program>()), Times.Never);
    }

    // ════════════════════════════════════════════════════════════════
    // GET /api/programs — GetPrograms
    // ════════════════════════════════════════════════════════════════

    [Test]
    public async Task GetPrograms_ReturnsList()
    {
        // Arrange
        var programs = new List<EduLearn.API.Models.Program>
        {
            _testProgram,
            new EduLearn.API.Models.Program
            {
                ProgramID = 2, Name = "M.Tech CS", DegreeType = "Master",
                DurationTerms = 4, Status = ProgramStatus.Active
            }
        };
        _programRepoMock.Setup(r => r.GetAllAsync()).ReturnsAsync(programs);

        // Act
        var result = await _controller.GetPrograms();

        // Assert
        var ok = result.Result as OkObjectResult;
        Assert.That(ok, Is.Not.Null);

        var list = ok!.Value as List<ProgramResponseDto>;
        Assert.That(list!.Count, Is.EqualTo(2));
        Assert.That(list[0].Name, Is.EqualTo("B.Tech Computer Science"));
        Assert.That(list[1].Name, Is.EqualTo("M.Tech CS"));
    }

    [Test]
    public async Task GetPrograms_Empty_ReturnsEmptyList()
    {
        // Arrange
        _programRepoMock.Setup(r => r.GetAllAsync())
            .ReturnsAsync(new List<EduLearn.API.Models.Program>());

        // Act
        var result = await _controller.GetPrograms();

        // Assert
        var ok = result.Result as OkObjectResult;
        var list = ok!.Value as List<ProgramResponseDto>;
        Assert.That(list!.Count, Is.EqualTo(0));
    }

    // ════════════════════════════════════════════════════════════════
    // GET /api/programs/{id} — GetProgram
    // ════════════════════════════════════════════════════════════════

    [Test]
    public async Task GetProgram_Exists_Returns200()
    {
        // Arrange
        _programRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(_testProgram);

        // Act
        var result = await _controller.GetProgram(1);

        // Assert
        var ok = result.Result as OkObjectResult;
        Assert.That(ok, Is.Not.Null);

        var response = ok!.Value as ProgramResponseDto;
        Assert.That(response!.ProgramID, Is.EqualTo(1));
        Assert.That(response.Name, Is.EqualTo("B.Tech Computer Science"));
        Assert.That(response.RequiredCoursesJSON, Is.EqualTo("[1, 2]"));
    }

    [Test]
    public async Task GetProgram_NotFound_Returns404()
    {
        // Arrange
        _programRepoMock.Setup(r => r.GetByIdAsync(999))
            .ReturnsAsync((EduLearn.API.Models.Program?)null);

        // Act
        var result = await _controller.GetProgram(999);

        // Assert
        var notFound = result.Result as NotFoundObjectResult;
        Assert.That(notFound, Is.Not.Null);
        Assert.That(notFound!.StatusCode, Is.EqualTo(404));
    }

    // ════════════════════════════════════════════════════════════════
    // PUT /api/programs/{id} — UpdateProgram
    // ════════════════════════════════════════════════════════════════

    [Test]
    public async Task UpdateProgram_Exists_Returns200()
    {
        // Arrange
        _programRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(_testProgram);
        _programRepoMock.Setup(r => r.UpdateAsync(It.IsAny<EduLearn.API.Models.Program>()))
            .ReturnsAsync((EduLearn.API.Models.Program p) => p);

        var dto = new CreateProgramDto
        {
            Name = "B.Tech CS (Updated)",
            DepartmentID = 1,
            DegreeType = "Bachelor",
            RequiredCoursesJSON = "[1, 2, 3]",
            ElectivesJSON = null,
            DurationTerms = 10
        };

        // Act
        var result = await _controller.UpdateProgram(1, dto);

        // Assert
        var ok = result.Result as OkObjectResult;
        var response = ok!.Value as ProgramResponseDto;
        Assert.That(response!.Name, Is.EqualTo("B.Tech CS (Updated)"));
        Assert.That(response.DurationTerms, Is.EqualTo(10));
        Assert.That(response.RequiredCoursesJSON, Is.EqualTo("[1, 2, 3]"));

        _programRepoMock.Verify(r => r.UpdateAsync(It.IsAny<EduLearn.API.Models.Program>()), Times.Once);
    }

    [Test]
    public async Task UpdateProgram_NotFound_Returns404()
    {
        // Arrange
        _programRepoMock.Setup(r => r.GetByIdAsync(999))
            .ReturnsAsync((EduLearn.API.Models.Program?)null);

        var dto = new CreateProgramDto
        {
            Name = "Test",
            DegreeType = "Bachelor",
            DurationTerms = 8
        };

        // Act
        var result = await _controller.UpdateProgram(999, dto);

        // Assert
        var notFound = result.Result as NotFoundObjectResult;
        Assert.That(notFound, Is.Not.Null);
        Assert.That(notFound!.StatusCode, Is.EqualTo(404));

        _programRepoMock.Verify(r => r.UpdateAsync(It.IsAny<EduLearn.API.Models.Program>()), Times.Never);
    }
}