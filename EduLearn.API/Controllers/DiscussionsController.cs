using System.Text.Json;
using System.Security.Claims;
using EduLearn.API.DTOs;
using EduLearn.API.Models;
using EduLearn.API.Models.Enums;
using EduLearn.API.Repositories.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EduLearn.API.Controllers;

[ApiController]
[Route("api/discussions")]
[Authorize]
public class DiscussionsController : ControllerBase
{
    // Repository pattern: data access through repository interfaces
    private readonly IDiscussionRepository _discussionRepository;
    private readonly ICourseRepository _courseRepository;
    private readonly IUserRepository _userRepository;

    public DiscussionsController(
        IDiscussionRepository discussionRepository,
        ICourseRepository courseRepository,
        IUserRepository userRepository)
    {
        _discussionRepository = discussionRepository;
        _courseRepository = courseRepository;
        _userRepository = userRepository;
    }

    /// <summary>
    /// Create a new discussion thread for a course. All authenticated users.
    /// Thread starter ID is derived from the JWT; an optional initial message seeds the posts list.
    /// </summary>
    // ── POST /api/discussions — Any authenticated user creates a discussion thread ──
    [HttpPost]
    [Authorize(Roles = "Student,Instructor,Registrar,ITAdmin")]
    public async Task<ActionResult<DiscussionResponseDto>> CreateDiscussion(CreateDiscussionDto dto)
    {
        // Validate that the course exists
        var course = await _courseRepository.GetByIdAsync(dto.CourseID);

        if (course is null)
            return BadRequest(new { error = "Course not found", code = "COURSE_NOT_FOUND" });

        // ThreadStarterID comes from JWT — not from body
        var callerId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? throw new InvalidOperationException("NameIdentifier claim missing"));
        var caller = await _userRepository.GetByIdAsync(callerId);

        if (caller is null)
            return BadRequest(new { error = "User not found", code = "USER_NOT_FOUND" });

        // If an initial message is provided, build PostsJSON with it as post #0
        string? postsJson = null;

        if (!string.IsNullOrWhiteSpace(dto.InitialMessage))
        {
            var initialPost = new[]
            {
                new
                {
                    authorID        = callerId,
                    authorName      = caller.FullName,
                    content         = dto.InitialMessage,
                    timestamp       = DateTime.UtcNow,
                    parentPostIndex = (int?)null
                }
            };

            postsJson = JsonSerializer.Serialize(initialPost);
        }

        // Create the discussion entity
        // server sets → DiscussionID (auto), ThreadStarterID = callerId, Status = Open, CreatedAt = now
        var discussion = new Discussion
        {
            CourseID        = dto.CourseID,
            ThreadStarterID = callerId,   // from JWT, not body
            Title           = dto.Title,
            PostsJSON       = postsJson
        };

        await _discussionRepository.CreateAsync(discussion);

        return StatusCode(StatusCodes.Status201Created, new DiscussionResponseDto
        {
            DiscussionID      = discussion.DiscussionID,
            CourseID          = discussion.CourseID,
            CourseName        = course.Title,
            ThreadStarterID   = discussion.ThreadStarterID,
            ThreadStarterName = caller.FullName,
            Title             = discussion.Title,
            PostsJSON         = discussion.PostsJSON,
            CreatedAt         = discussion.CreatedAt,
            Status            = discussion.Status
        });
    }

    /// <summary>
    /// List all discussion threads for a course. All authenticated users.
    /// Returns 404 if the course does not exist.
    /// </summary>
    // ── GET /api/discussions/course/{courseId} — List all discussions for a course ──
    [HttpGet("course/{courseId}")]
    [Authorize(Roles = "Student,Instructor,Registrar,ITAdmin")]
    public async Task<ActionResult<List<DiscussionResponseDto>>> GetByCourse(int courseId)
    {
        // Validate that the course exists
        var courseExists = await _courseRepository.ExistsAsync(courseId);

        if (!courseExists)
            return NotFound(new { error = "Course not found", code = "COURSE_NOT_FOUND" });

        // Repository returns discussions with Course and ThreadStarter navigation loaded
        var discussions = await _discussionRepository.GetByCourseIdWithDetailsAsync(courseId);

        var response = discussions.Select(d => MapToDto(d)).ToList();
        return Ok(response);
    }

    /// <summary>
    /// Append a reply to an existing discussion thread. All authenticated users.
    /// Only threads in Open or Pinned status accept replies; Closed and Archived are locked.
    /// </summary>
    // ── POST /api/discussions/{id}/reply — Any authenticated user replies to a discussion ──
    // KEY LOGIC: reads PostsJSON, deserializes, appends new reply, re-serializes, saves back
    [HttpPost("{id}/reply")]
    [Authorize(Roles = "Student,Instructor,Registrar,ITAdmin")]
    public async Task<ActionResult<DiscussionResponseDto>> AddReply(int id, CreateReplyDto dto)
    {
        // Fetch discussion with Course and ThreadStarter navigation loaded
        var discussion = await _discussionRepository.GetByIdWithDetailsAsync(id);

        if (discussion is null)
            return NotFound(new { error = "Discussion not found", code = "DISCUSSION_NOT_FOUND" });

        // Only Open and Pinned discussions accept replies — Closed/Archived are locked
        if (discussion.Status != DiscussionStatus.Open && discussion.Status != DiscussionStatus.Pinned)
            return BadRequest(new { error = "This discussion is not open for replies", code = "DISCUSSION_NOT_OPEN" });

        // AuthorID comes from JWT — not from body
        var callerId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? throw new InvalidOperationException("NameIdentifier claim missing"));
        var caller = await _userRepository.GetByIdAsync(callerId);

        if (caller is null)
            return BadRequest(new { error = "User not found", code = "USER_NOT_FOUND" });

        // ── JSON ARRAY APPEND LOGIC ──
        // Step 1: Deserialize existing PostsJSON (could be null if no posts yet)
        var posts = new List<object>();

        if (!string.IsNullOrWhiteSpace(discussion.PostsJSON))
        {
            var existingPosts = JsonSerializer.Deserialize<List<JsonElement>>(discussion.PostsJSON);
            if (existingPosts is not null)
                posts.AddRange(existingPosts.Cast<object>());
        }

        // Step 2: Build the new reply object
        var newReply = new
        {
            authorID        = callerId,
            authorName      = caller.FullName,
            content         = dto.Content,
            timestamp       = DateTime.UtcNow,
            parentPostIndex = dto.ParentPostIndex
        };

        // Step 3: Append the new reply
        posts.Add(newReply);

        // Step 4: Re-serialize the updated list back to JSON string and save
        discussion.PostsJSON = JsonSerializer.Serialize(posts);

        await _discussionRepository.UpdateAsync(discussion);

        return Ok(MapToDto(discussion));
    }

    /// <summary>
    /// Update the moderation status of a discussion thread. Instructor and ITAdmin only.
    /// Returns 404 if the discussion does not exist.
    /// </summary>
    // ── PUT /api/discussions/{id}/status — Instructor moderates the discussion ──
    [HttpPut("{id}/status")]
    [Authorize(Roles = "Instructor,ITAdmin")]   // PRD §6.5 LMS-02 — Instructor only
    public async Task<ActionResult<DiscussionResponseDto>> UpdateStatus(int id, UpdateDiscussionStatusDto dto)
    {
        // Fetch discussion with navigation properties loaded
        var discussion = await _discussionRepository.GetByIdWithDetailsAsync(id);

        if (discussion is null)
            return NotFound(new { error = "Discussion not found", code = "DISCUSSION_NOT_FOUND" });

        // Apply the new status
        discussion.Status = dto.Status;

        await _discussionRepository.UpdateAsync(discussion);

        return Ok(MapToDto(discussion));
    }

    // Helper: maps Discussion entity (with navigation properties loaded) to response DTO
    private static DiscussionResponseDto MapToDto(Discussion d) => new()
    {
        DiscussionID      = d.DiscussionID,
        CourseID          = d.CourseID,
        CourseName        = d.Course.Title,
        ThreadStarterID   = d.ThreadStarterID,
        ThreadStarterName = d.ThreadStarter.FullName,
        Title             = d.Title,
        PostsJSON         = d.PostsJSON,
        CreatedAt         = d.CreatedAt,
        Status            = d.Status
    };
}
