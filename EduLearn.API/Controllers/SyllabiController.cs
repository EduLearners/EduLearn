using EduLearn.API.DTOs;
using EduLearn.API.Extensions;
using EduLearn.API.Models;
using EduLearn.API.Repositories.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EduLearn.API.Controllers;

[ApiController]
[Route("api/syllabi")]
[Authorize]
public class SyllabiController : ControllerBase
{
    // Repository pattern: data access through repository interfaces
    private readonly ISyllabusRepository _syllabusRepository;
    private readonly ICourseRepository _courseRepository;
    private readonly IUserRepository _userRepository;

    public SyllabiController(
        ISyllabusRepository syllabusRepository,
        ICourseRepository courseRepository,
        IUserRepository userRepository)
    {
        _syllabusRepository = syllabusRepository;
        _courseRepository = courseRepository;
        _userRepository = userRepository;
    }

    // ── POST /api/syllabi — Instructor creates a syllabus for a course ──
    [HttpPost]
    [Authorize(Roles = "Instructor,ITAdmin")]   // PRD §6.4 CCM-02 — Instructor only
    public async Task<ActionResult<SyllabusResponseDto>> CreateSyllabus(CreateSyllabusDto dto)
    {
        // Validate that the course exists
        var course = await _courseRepository.GetByIdAsync(dto.CourseID);

        if (course is null)
            return BadRequest(new { error = "Course not found", code = "COURSE_NOT_FOUND" });

        // Check duplicate version for the same course — e.g. "v1.0" already exists for CS101
        var versionExists = await _syllabusRepository.VersionExistsForCourseAsync(dto.CourseID, dto.Version);

        if (versionExists)
            return Conflict(new { error = "A syllabus with this version already exists for this course", code = "DUPLICATE_SYLLABUS_VERSION" });

        // CreatedByFK comes from JWT — not from body (same pattern as Content and Assessment)
        var callerId = User.GetUserId();
        var creator = await _userRepository.GetByIdAsync(callerId);

        if (creator is null)
            return BadRequest(new { error = "Creator user not found", code = "USER_NOT_FOUND" });

        // Create the syllabus entity
        // server sets → SyllabusID (auto), CreatedByFK = callerId, CreatedAt = now
        var syllabus = new Syllabus
        {
            CourseID = dto.CourseID,
            Version = dto.Version,
            LearningOutcomesJSON = dto.LearningOutcomesJSON,
            AssessmentPlanJSON = dto.AssessmentPlanJSON,
            SyllabusURI = dto.SyllabusURI,
            CreatedByFK = callerId   // from JWT, not body
        };

        await _syllabusRepository.CreateAsync(syllabus);

        return StatusCode(StatusCodes.Status201Created, new SyllabusResponseDto
        {
            SyllabusID = syllabus.SyllabusID,
            CourseID = syllabus.CourseID,
            CourseName = course.Title,
            Version = syllabus.Version,
            LearningOutcomesJSON = syllabus.LearningOutcomesJSON,
            AssessmentPlanJSON = syllabus.AssessmentPlanJSON,
            CreatedByFK = syllabus.CreatedByFK,
            CreatedByName = creator.FullName,
            CreatedAt = syllabus.CreatedAt,
            SyllabusURI = syllabus.SyllabusURI
        });
    }

    // ── GET /api/syllabi/course/{courseId} — List all syllabi for a course ──
    [HttpGet("course/{courseId}")]
    public async Task<ActionResult<List<SyllabusResponseDto>>> GetByCourse(int courseId)
    {
        // Validate that the course exists
        var courseExists = await _courseRepository.ExistsAsync(courseId);

        if (!courseExists)
            return NotFound(new { error = "Course not found", code = "COURSE_NOT_FOUND" });

        // Repository returns syllabi with Course and CreatedBy navigation loaded
        var syllabi = await _syllabusRepository.GetByCourseIdWithDetailsAsync(courseId);

        var response = syllabi.Select(s => MapToDto(s)).ToList();
        return Ok(response);
    }

    // ── GET /api/syllabi/{id} — Get specific syllabus by ID ──
    [HttpGet("{id}")]
    public async Task<ActionResult<SyllabusResponseDto>> GetSyllabus(int id)
    {
        // Repository returns syllabus with Course and CreatedBy navigation loaded
        var syllabus = await _syllabusRepository.GetByIdWithDetailsAsync(id);

        if (syllabus is null)
            return NotFound(new { error = "Syllabus not found", code = "SYLLABUS_NOT_FOUND" });

        return Ok(MapToDto(syllabus));
    }

    // ── PUT /api/syllabi/{id} — Instructor updates an existing syllabus ──
    [HttpPut("{id}")]
    [Authorize(Roles = "Instructor,ITAdmin")]   // PRD §6.4 CCM-02 — Instructor only
    public async Task<ActionResult<SyllabusResponseDto>> UpdateSyllabus(int id, UpdateSyllabusDto dto)
    {
        // Get syllabus with navigation properties loaded (for response)
        var syllabus = await _syllabusRepository.GetByIdWithDetailsAsync(id);

        if (syllabus is null)
            return NotFound(new { error = "Syllabus not found", code = "SYLLABUS_NOT_FOUND" });

        // If version string is changing, check it doesn't clash with an existing version
        if (syllabus.Version != dto.Version)
        {
            var versionExists = await _syllabusRepository.VersionExistsForCourseAsync(syllabus.CourseID, dto.Version);

            if (versionExists)
                return Conflict(new { error = "A syllabus with this version already exists for this course", code = "DUPLICATE_SYLLABUS_VERSION" });
        }

        // Update allowed fields — CourseID and CreatedByFK are NOT changeable (not in UpdateSyllabusDto)
        syllabus.Version = dto.Version;
        syllabus.LearningOutcomesJSON = dto.LearningOutcomesJSON;
        syllabus.AssessmentPlanJSON = dto.AssessmentPlanJSON;
        syllabus.SyllabusURI = dto.SyllabusURI;

        await _syllabusRepository.UpdateAsync(syllabus);

        return Ok(MapToDto(syllabus));
    }

    // Helper: maps Syllabus entity (with navigation properties loaded) to response DTO
    private static SyllabusResponseDto MapToDto(Syllabus s) => new()
    {
        SyllabusID = s.SyllabusID,
        CourseID = s.CourseID,
        CourseName = s.Course.Title,
        Version = s.Version,
        LearningOutcomesJSON = s.LearningOutcomesJSON,
        AssessmentPlanJSON = s.AssessmentPlanJSON,
        CreatedByFK = s.CreatedByFK,
        CreatedByName = s.CreatedBy.FullName,
        CreatedAt = s.CreatedAt,
        SyllabusURI = s.SyllabusURI
    };
}