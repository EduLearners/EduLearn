using EduLearn.API.DTOs;
using EduLearn.API.Models;
using EduLearn.API.Models.Enums;
using EduLearn.API.Repositories.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace EduLearn.API.Controllers;

[ApiController]
[Route("api/content")]
[Authorize]
public class ContentsController : ControllerBase
{
    //data access through repository interface
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

    /// <summary>
    /// Upload new content to a course. Instructor and ITAdmin only.
    /// Validates that the course exists and associates the uploader from the JWT claim.
    /// </summary>
    [HttpPost("upload")]
    [Authorize(Roles = "Instructor,ITAdmin")]
    public async Task<ActionResult<ContentResponseDto>> UploadContent(CreateContentDto dto)
    {
        var course = await _courseRepository.GetByIdAsync(dto.CourseID);

        if (course is null)
            return BadRequest(new { error = "Course not found", code = "COURSE_NOT_FOUND" });

        var callerId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? throw new InvalidOperationException("NameIdentifier claim missing"));
        var uploader = await _userRepository.GetByIdAsync(callerId);

        if (uploader is null)
            return BadRequest(new { error = "Uploader user not found", code = "USER_NOT_FOUND" });

        var content = new Content
        {
            CourseID = dto.CourseID,
            Title = dto.Title,
            Type = dto.Type,
            URI = dto.URI,
            UploadedByFK = callerId,  
            MetadataJSON = dto.MetadataJSON
        };

        await _contentRepository.CreateAsync(content);

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

    /// <summary>
    /// List all content items for a given course. All authenticated users.
    /// Returns 404 if the course does not exist.
    /// </summary>
    [HttpGet("course/{courseId}")]
    public async Task<ActionResult<List<ContentResponseDto>>> GetByCourse(int courseId)
    {
        var courseExists = await _courseRepository.ExistsAsync(courseId);

        if (!courseExists)
            return NotFound(new { error = "Course not found", code = "COURSE_NOT_FOUND" });

        var contents = await _contentRepository.GetByCourseIdWithDetailsAsync(courseId);

        var response = contents.Select(c => MapToDto(c)).ToList();
        return Ok(response);
    }

    /// <summary>
    /// Retrieve a single content item by ID. All authenticated users.
    /// Returns 404 if the content does not exist.
    /// </summary>
    // Get specific content item
    [HttpGet("{id}")]
    public async Task<ActionResult<ContentResponseDto>> GetContent(int id)
    {
        var content = await _contentRepository.GetByIdWithDetailsAsync(id);

        if (content is null)
            return NotFound(new { error = "Content not found", code = "CONTENT_NOT_FOUND" });

        return Ok(MapToDto(content));
    }

    /// <summary>
    /// Publish a new version of an existing content item. Instructor and ITAdmin only.
    /// Only Active content can be versioned; increments the version counter.
    /// </summary>
    //Upload a new version of existing content
    [HttpPut("{id}/version")]
    [Authorize(Roles = "Instructor,ITAdmin")]
    public async Task<ActionResult<ContentResponseDto>> UpdateVersion(int id, UpdateContentVersionDto dto)
    {
        var content = await _contentRepository.GetByIdWithDetailsAsync(id);

        if (content is null)
            return NotFound(new { error = "Content not found", code = "CONTENT_NOT_FOUND" });

        if (content.Status != ContentStatus.Active)
            return BadRequest(new { error = "Only Active content can be versioned", code = "CONTENT_NOT_ACTIVE" });

        //version number: 1 → 2 → 3 → ...
        content.Version += 1;

        // Update the URI to point to the new file
        content.URI = dto.URI;

        // Update metadata if provided (new file may have different size, checksum, etc.)
        content.MetadataJSON = dto.MetadataJSON;

        content.UploadedAt = DateTime.UtcNow;

        await _contentRepository.UpdateAsync(content);

        return Ok(MapToDto(content));
    }
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