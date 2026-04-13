using EduLearn.API.DTOs;
using EduLearn.API.Repositories.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace EduLearn.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ProgramsController : ControllerBase
{
    // Repository pattern: controller talks to repository interface, NOT AppDbContext directly
    private readonly IProgramRepository _programRepository;

    public ProgramsController(IProgramRepository programRepository)
    {
        _programRepository = programRepository;
    }

    // ── POST /api/programs — Create a new degree program ──
    [HttpPost]
    public async Task<ActionResult<ProgramResponseDto>> CreateProgram(CreateProgramDto dto)
    {
        // Check duplicate using repository method
        if (await _programRepository.ExistsByNameAndDegreeAsync(dto.Name, dto.DegreeType))
            return Conflict(new { error = "Program with this name and degree type already exists", code = "DUPLICATE_PROGRAM" });

        // Creating a new Program entity from the DTO like-b.tech(AI)
        var program = new EduLearn.API.Models.Program
        {
            // Maps the incoming DTO to a new Program entity
            Name = dto.Name,
            DepartmentID = dto.DepartmentID,
            DegreeType = dto.DegreeType,
            RequiredCoursesJSON = dto.RequiredCoursesJSON,
            ElectivesJSON = dto.ElectivesJSON,
            DurationTerms = dto.DurationTerms
        };

        // Repository handles Add + SaveChanges internally
        await _programRepository.CreateAsync(program);

        return CreatedAtAction(nameof(GetProgram), new { id = program.ProgramID }, MapToDto(program));
    }

    // ── GET /api/programs — List all programs ──
    [HttpGet]
    public async Task<ActionResult<List<ProgramResponseDto>>> GetPrograms()
    {
        // Repository returns all programs (already uses AsNoTracking internally)
        var programs = await _programRepository.GetAllAsync();

        var response = programs.Select(p => MapToDto(p)).ToList();
        return Ok(response);
    }

    // ── GET /api/programs/{id} — Get one program by ID ──
    [HttpGet("{id}")]
    public async Task<ActionResult<ProgramResponseDto>> GetProgram(int id)
    {
        var program = await _programRepository.GetByIdAsync(id);

        if (program is null)
            return NotFound(new { error = "Program not found", code = "PROGRAM_NOT_FOUND" });

        return Ok(MapToDto(program));
    }

    // ── PUT /api/programs/{id} — Update a program ──
    [HttpPut("{id}")]
    public async Task<ActionResult<ProgramResponseDto>> UpdateProgram(int id, CreateProgramDto dto)
    {
        var program = await _programRepository.GetByIdAsync(id);

        if (program is null)
            return NotFound(new { error = "Program not found", code = "PROGRAM_NOT_FOUND" });

        // Update fields from DTO
        program.Name = dto.Name;
        program.DepartmentID = dto.DepartmentID;
        program.DegreeType = dto.DegreeType;
        program.RequiredCoursesJSON = dto.RequiredCoursesJSON;
        program.ElectivesJSON = dto.ElectivesJSON;
        program.DurationTerms = dto.DurationTerms;

        // EF Core detects the changes automatically, repository calls SaveChanges
        await _programRepository.UpdateAsync(program);

        return Ok(MapToDto(program));
    }

    // A private static helper method that converts the entity to a response DTO
    private static ProgramResponseDto MapToDto(EduLearn.API.Models.Program program) => new()
    {
        ProgramID = program.ProgramID,
        Name = program.Name,
        DepartmentID = program.DepartmentID,
        DegreeType = program.DegreeType,
        RequiredCoursesJSON = program.RequiredCoursesJSON,
        ElectivesJSON = program.ElectivesJSON,
        DurationTerms = program.DurationTerms,
        Status = program.Status
    };
}
