using EduLearn.API.DTOs;
using EduLearn.API.Models;
using EduLearn.API.Repositories.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace EduLearn.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SectionsController : ControllerBase
{
    private readonly ISectionRepository _sectionRepo;
    private readonly ICourseRepository _courseRepo;
    private readonly IUserRepository _userRepo;
    private readonly IRoomRepository _roomRepo;

    public SectionsController(
        ISectionRepository sectionRepo,
        ICourseRepository courseRepo,
        IUserRepository userRepo,
        IRoomRepository roomRepo)
    {
        _sectionRepo = sectionRepo;
        _courseRepo = courseRepo;
        _userRepo = userRepo;
        _roomRepo = roomRepo;
    }

    // POST /api/sections
    [HttpPost]
    public async Task<ActionResult<SectionResponseDto>> CreateSection(
        CreateSectionDto dto, CancellationToken cancellationToken)
    {
        // Validate course exists
        var course = await _courseRepo.GetByIdAsync(dto.CourseID);
        if (course is null)
            return BadRequest(new
            {
                error = "Course not found",
                code = "COURSE_NOT_FOUND"
            });

        // Validate instructor exists and has Instructor role
        var instructor = await _userRepo.GetByIdAsync(dto.InstructorID);
        if (instructor is null)
            return BadRequest(new
            {
                error = "Instructor not found",
                code = "INSTRUCTOR_NOT_FOUND"
            });

        if (instructor.Role != Models.Enums.UserRole.Instructor)
            return BadRequest(new
            {
                error = "The specified user is not an Instructor",
                code = "INVALID_INSTRUCTOR_ROLE"
            });

        // Validate room exists if provided
        if (dto.RoomID.HasValue)
        {
            var roomExists = await _roomRepo.ExistsAsync(dto.RoomID.Value);
            if (!roomExists)
                return BadRequest(new
                {
                    error = "Room not found",
                    code = "ROOM_NOT_FOUND"
                });
        }

        var section = new Section
        {
            CourseID = dto.CourseID,
            Term = dto.Term,
            InstructorID = dto.InstructorID,
            RoomID = dto.RoomID,
            Capacity = dto.Capacity,
            ScheduleJSON = dto.ScheduleJSON
        };

        var created = await _sectionRepo.CreateAsync(section);

        return CreatedAtAction(nameof(GetSection),
            new { id = created.SectionID },
            MapToDto(created, course.Title, instructor.FullName));
    }

    // GET /api/sections/{id}
    [HttpGet("{id}")]
    public async Task<ActionResult<SectionResponseDto>> GetSection(
        int id, CancellationToken cancellationToken)
    {
        var section = await _sectionRepo.GetByIdAsync(id);
        if (section is null)
            return NotFound(new
            {
                error = "Section not found",
                code = "SECTION_NOT_FOUND"
            });

        var course = await _courseRepo.GetByIdAsync(section.CourseID);
        var instructor = await _userRepo.GetByIdAsync(section.InstructorID);

        return Ok(MapToDto(section,
            course?.Title ?? string.Empty,
            instructor?.FullName ?? string.Empty));
    }

    // GET /api/sections/course/{courseId}/term/{term}
    [HttpGet("course/{courseId}/term/{term}")]
    public async Task<ActionResult<IEnumerable<SectionResponseDto>>> GetByCourseAndTerm(
        int courseId, string term, CancellationToken cancellationToken)
    {
        // Validate course exists
        var course = await _courseRepo.GetByIdAsync(courseId);
        if (course is null)
            return NotFound(new
            {
                error = "Course not found",
                code = "COURSE_NOT_FOUND"
            });

        var sections = await _sectionRepo.GetByCourseAndTermAsync(courseId, term);

        var result = new List<SectionResponseDto>();
        foreach (var s in sections)
        {
            var instructor = await _userRepo.GetByIdAsync(s.InstructorID);
            result.Add(MapToDto(s,
                course.Title,
                instructor?.FullName ?? string.Empty));
        }

        return Ok(result);
    }

    private static SectionResponseDto MapToDto(
        Section s, string courseName, string instructorName) => new()
    {
        SectionID = s.SectionID,
        CourseID = s.CourseID,
        CourseName = courseName,
        Term = s.Term,
        InstructorID = s.InstructorID,
        InstructorName = instructorName,
        RoomID = s.RoomID,
        Capacity = s.Capacity,
        EnrolledCount = s.EnrolledCount,
        ScheduleJSON = s.ScheduleJSON,
        Status = s.Status
    };
}
