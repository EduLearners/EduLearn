using EduLearn.API.DTOs;
using EduLearn.API.Repositories.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EduLearn.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ProgramsController : ControllerBase
{
    private readonly IProgramRepository _programRepository;

    public ProgramsController(IProgramRepository programRepository)
    {
        _programRepository = programRepository;
    }

    //Create new degree program
    [HttpPost]
    [Authorize(Policy = "DeptAdminPolicy")]
    public async Task<ActionResult<ProgramResponseDto>> CreateProgram(CreateProgramDto dto)
    {
        if (await _programRepository.ExistsByNameAndDegreeAsync(dto.Name, dto.DegreeType))
            return Conflict(new { error = "Program with this name and degree type already exists", code = "DUPLICATE_PROGRAM" });

       
        var program = new EduLearn.API.Models.Program
        {
            
            Name = dto.Name,
            DepartmentID = dto.DepartmentID,
            DegreeType = dto.DegreeType,
            RequiredCoursesJSON = dto.RequiredCoursesJSON,
            ElectivesJSON = dto.ElectivesJSON,
            DurationTerms = dto.DurationTerms
        };

      
        await _programRepository.CreateAsync(program);

        return CreatedAtAction(nameof(GetProgram), new { id = program.ProgramID }, MapToDto(program));
    }

    //List all programs
    [HttpGet]
    public async Task<ActionResult<List<ProgramResponseDto>>> GetPrograms()
    {
        var programs = await _programRepository.GetAllAsync();

        var response = programs.Select(p => MapToDto(p)).ToList();
        return Ok(response);
    }

    //Get one program by ID
    [HttpGet("{id}")]
    public async Task<ActionResult<ProgramResponseDto>> GetProgram(int id)
    {
        var program = await _programRepository.GetByIdAsync(id);

        if (program is null)
            return NotFound(new { error = "Program not found", code = "PROGRAM_NOT_FOUND" });

        return Ok(MapToDto(program));
    }

    [HttpPut("{id}")]
    [Authorize(Policy = "DeptAdminPolicy")]   
    public async Task<ActionResult<ProgramResponseDto>> UpdateProgram(int id, CreateProgramDto dto)
    {
        var program = await _programRepository.GetByIdAsync(id);

        if (program is null)
            return NotFound(new { error = "Program not found", code = "PROGRAM_NOT_FOUND" });

        program.Name = dto.Name;
        program.DepartmentID = dto.DepartmentID;
        program.DegreeType = dto.DegreeType;
        program.RequiredCoursesJSON = dto.RequiredCoursesJSON;
        program.ElectivesJSON = dto.ElectivesJSON;
        program.DurationTerms = dto.DurationTerms;

        await _programRepository.UpdateAsync(program);

        return Ok(MapToDto(program));
    }

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
