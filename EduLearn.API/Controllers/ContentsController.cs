using EduLearn.API.DTOs;
using EduLearn.API.Models;
using EduLearn.API.Models.Enums;
using EduLearn.API.Repositories.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EduLearn.API.Controllers;

[ApiController]
[Route("api/content")]
[Authorize]
public class ContentsController : ControllerBase
{
    // Repository pattern: data access through repository interfaces
    private readonly IContentRepository _contentRepository;
    private readonly ICourseRepository _courseRepository;
    private readonly IUserRepository _userRepository;

    public ContentsController(
        IContentRepository contentRepository,
        ICourseRepository courseRepository,
        IUserRepository userRepository)
    {
        _contentRepository = contentRepository;
        _courseRepository = courseRepository;
        _userRepository = userRepository;
    }

    // ── POST /api/content/upload — Instructor uploads new learning material ──
    [HttpPost("upload")]
    public async Task<ActionResult<ContentResponseDto>> UploadContent(CreateContentDto dto)
    {
        // Validate that the course exists
        var course = await _courseRepository.GetByIdAsync(dto.CourseID);

        if (course is null)
            return BadRequest(new { error = "Course not found", code = "COURSE_NOT_FOUND" });

        // Validate that the uploader (instructor) exists
        var uploader = await _userRepository.GetByIdAsync(dto.UploadedByFK);

        if (uploader is null)
            return BadRequest(new { error = "Uploader user not found", code = "USER_NOT_FOUND" });

        // Create the content entity — Version defaults to 1, Status defaults to Active from the model
        var content = new Content
        {
            CourseID = dto.CourseID,
            Title = dto.Title,
            Type = dto.Type,
            URI = dto.URI,
            UploadedByFK = dto.UploadedByFK,
            MetadataJSON = dto.MetadataJSON
        };

        // Repository handles Add + SaveChanges
        await _contentRepository.CreateAsync(content);

        // Build response with course name and uploader name
        var response = new ContentResponseDto
        {
            ContentID = content.ContentID,
            CourseID = content.CourseID,
            CourseName = course.Title,
            Title = content.Title,
            Type = content.Type,
            URI = content.URI,
            UploadedByFK = content.UploadedByFK,
            UploadedByName = uploader.FullName,
            UploadedAt = content.UploadedAt,
            Version = content.Version,
            MetadataJSON = content.MetadataJSON,
            Status = content.Status
        };

        return StatusCode(StatusCodes.Status201Created, response);
    }

    // ── GET /api/content/course/{courseId} — List all content for a course ──
    [HttpGet("course/{courseId}")]
    public async Task<ActionResult<List<ContentResponseDto>>> GetByCourse(int courseId)
    {
        // Check if the course exists
        var courseExists = await _courseRepository.ExistsAsync(courseId);

        if (!courseExists)
            return NotFound(new { error = "Course not found", code = "COURSE_NOT_FOUND" });

        // Repository returns content with Course and UploadedBy navigation loaded
        var contents = await _contentRepository.GetByCourseIdWithDetailsAsync(courseId);

        var response = contents.Select(c => MapToDto(c)).ToList();
        return Ok(response);
    }

    // ── GET /api/content/{id} — Get specific content item ──
    [HttpGet("{id}")]
    public async Task<ActionResult<ContentResponseDto>> GetContent(int id)
    {
        // Repository returns content with Course and UploadedBy navigation loaded
        var content = await _contentRepository.GetByIdWithDetailsAsync(id);

        if (content is null)
            return NotFound(new { error = "Content not found", code = "CONTENT_NOT_FOUND" });

        return Ok(MapToDto(content));
    }

    // ── PUT /api/content/{id}/version — Upload a new version of existing content ──
    [HttpPut("{id}/version")]
    public async Task<ActionResult<ContentResponseDto>> UpdateVersion(int id, UpdateContentVersionDto dto)
    {
        // Get content with navigation properties loaded (for response)
        var content = await _contentRepository.GetByIdWithDetailsAsync(id);

        if (content is null)
            return NotFound(new { error = "Content not found", code = "CONTENT_NOT_FOUND" });

        // Only Active content can be versioned — Archived/Draft content is locked
        if (content.Status != ContentStatus.Active)
            return BadRequest(new { error = "Only Active content can be versioned", code = "CONTENT_NOT_ACTIVE" });

        // Bump the version number: 1 → 2 → 3 → ...
        content.Version += 1;

        // Update the URI to point to the new file
        content.URI = dto.URI;

        // Update metadata if provided (new file may have different size, checksum, etc.)
        content.MetadataJSON = dto.MetadataJSON;

        // Update the upload timestamp to reflect when this version was uploaded
        content.UploadedAt = DateTime.UtcNow;

        // Repository saves the changes
        await _contentRepository.UpdateAsync(content);

        return Ok(MapToDto(content));
    }

    // Helper: maps Content entity (with navigation properties loaded) to response DTO
    private static ContentResponseDto MapToDto(Content c) => new()
    {
        ContentID = c.ContentID,
        CourseID = c.CourseID,
        CourseName = c.Course.Title,
        Title = c.Title,
        Type = c.Type,
        URI = c.URI,
        UploadedByFK = c.UploadedByFK,
        UploadedByName = c.UploadedBy.FullName,
        UploadedAt = c.UploadedAt,
        Version = c.Version,
        MetadataJSON = c.MetadataJSON,
        Status = c.Status
    };
}