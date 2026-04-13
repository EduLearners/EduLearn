using EduLearn.API.DTOs;
using EduLearn.API.Models;
using EduLearn.API.Models.Enums;
using EduLearn.API.Repositories.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace EduLearn.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AssessmentsController : ControllerBase
{
    // Repository pattern: controller talks to repository interfaces, NOT AppDbContext directly
    private readonly IAssessmentRepository _assessmentRepository;
    private readonly ICourseRepository _courseRepository;
    private readonly IUserRepository _userRepository;
    private readonly ISectionRepository _sectionRepository;

    public AssessmentsController(
        IAssessmentRepository assessmentRepository,
        ICourseRepository courseRepository,
        IUserRepository userRepository,
        ISectionRepository sectionRepository)
    {
        _assessmentRepository = assessmentRepository;
        _courseRepository = courseRepository;
        _userRepository = userRepository;
        _sectionRepository = sectionRepository;
    }

    // ── POST /api/assessments — Create a new assessment (always starts as Draft) ──
    [HttpPost]
    public async Task<ActionResult<AssessmentResponseDto>> CreateAssessment(CreateAssessmentDto dto)
    {
        // Validate that the course exists using course repository
        var course = await _courseRepository.GetByIdAsync(dto.CourseID);

        if (course is null)
            return BadRequest(new { error = "Course not found", code = "COURSE_NOT_FOUND" });

        // Validate that the section exists (only if SectionID is provided) using section repository
        if (dto.SectionID.HasValue)
        {
            var sectionExists = await _sectionRepository.ExistsAsync(dto.SectionID.Value);

            if (!sectionExists)
                return BadRequest(new { error = "Section not found", code = "SECTION_NOT_FOUND" });
        }

        // Validate that the creator (instructor) exists using user repository
        var creator = await _userRepository.GetByIdAsync(dto.CreatedByFK);

        if (creator is null)
            return BadRequest(new { error = "Creator user not found", code = "USER_NOT_FOUND" });

        // Create the assessment entity — Status defaults to Draft from the model
        var assessment = new Assessment
        {
            CourseID = dto.CourseID,
            SectionID = dto.SectionID,
            Title = dto.Title,
            Type = dto.Type,
            DueAt = dto.DueAt,
            MaxScore = dto.MaxScore,
            GradingRubricJSON = dto.GradingRubricJSON,
            CreatedByFK = dto.CreatedByFK
        };

        // Repository handles Add + SaveChanges internally
        await _assessmentRepository.CreateAsync(assessment);

        // Build response with course name and creator name
        var response = new AssessmentResponseDto
        {
            AssessmentID = assessment.AssessmentID,
            CourseID = assessment.CourseID,
            CourseName = course.Title,
            SectionID = assessment.SectionID,
            Title = assessment.Title,
            Type = assessment.Type,
            DueAt = assessment.DueAt,
            MaxScore = assessment.MaxScore,
            GradingRubricJSON = assessment.GradingRubricJSON,
            CreatedByFK = assessment.CreatedByFK,
            CreatedByName = creator.FullName,
            CreatedAt = assessment.CreatedAt,
            Status = assessment.Status
        };

        return CreatedAtAction(nameof(GetAssessmentsByCourse), new { courseId = assessment.CourseID }, response);
    }

    // ── GET /api/assessments/course/{courseId} — List all assessments for a course ──
    [HttpGet("course/{courseId}")]
    public async Task<ActionResult<List<AssessmentResponseDto>>> GetAssessmentsByCourse(int courseId)
    {
        // Check if the course exists using course repository
        var courseExists = await _courseRepository.ExistsAsync(courseId);

        if (!courseExists)
            return NotFound(new { error = "Course not found", code = "COURSE_NOT_FOUND" });

        // Repository returns assessments with Course and CreatedBy navigation properties loaded
        var assessments = await _assessmentRepository.GetByCourseIdWithDetailsAsync(courseId);

        var response = assessments.Select(a => new AssessmentResponseDto
        {
            AssessmentID = a.AssessmentID,
            CourseID = a.CourseID,
            CourseName = a.Course.Title,
            SectionID = a.SectionID,
            Title = a.Title,
            Type = a.Type,
            DueAt = a.DueAt,
            MaxScore = a.MaxScore,
            GradingRubricJSON = a.GradingRubricJSON,
            CreatedByFK = a.CreatedByFK,
            CreatedByName = a.CreatedBy.FullName,
            CreatedAt = a.CreatedAt,
            Status = a.Status
        }).ToList();

        return Ok(response);
    }

    // ── PUT /api/assessments/{id} — Update assessment details (only if still in Draft) ──
    [HttpPut("{id}")]
    public async Task<ActionResult<AssessmentResponseDto>> UpdateAssessment(int id, CreateAssessmentDto dto)
    {
        // Repository returns assessment with Course and CreatedBy loaded (for response DTO)
        var assessment = await _assessmentRepository.GetByIdWithDetailsAsync(id);

        if (assessment is null)
            return NotFound(new { error = "Assessment not found", code = "ASSESSMENT_NOT_FOUND" });

        // Only Draft assessments can be edited — Published/Closed are locked
        if (assessment.Status != AssessmentStatus.Draft)
            return BadRequest(new { error = "Only Draft assessments can be updated", code = "ASSESSMENT_NOT_DRAFT" });

        // Validate section if provided using section repository
        if (dto.SectionID.HasValue)
        {
            var sectionExists = await _sectionRepository.ExistsAsync(dto.SectionID.Value);

            if (!sectionExists)
                return BadRequest(new { error = "Section not found", code = "SECTION_NOT_FOUND" });
        }

        // Update fields from DTO
        assessment.CourseID = dto.CourseID;
        assessment.SectionID = dto.SectionID;
        assessment.Title = dto.Title;
        assessment.Type = dto.Type;
        assessment.DueAt = dto.DueAt;
        assessment.MaxScore = dto.MaxScore;
        assessment.GradingRubricJSON = dto.GradingRubricJSON;

        // Repository calls SaveChanges
        await _assessmentRepository.UpdateAsync(assessment);

        return Ok(new AssessmentResponseDto
        {
            AssessmentID = assessment.AssessmentID,
            CourseID = assessment.CourseID,
            CourseName = assessment.Course.Title,
            SectionID = assessment.SectionID,
            Title = assessment.Title,
            Type = assessment.Type,
            DueAt = assessment.DueAt,
            MaxScore = assessment.MaxScore,
            GradingRubricJSON = assessment.GradingRubricJSON,
            CreatedByFK = assessment.CreatedByFK,
            CreatedByName = assessment.CreatedBy.FullName,
            CreatedAt = assessment.CreatedAt,
            Status = assessment.Status
        });
    }

    // ── PUT /api/assessments/{id}/publish — Change status: Draft → Published → Closed ──
    [HttpPut("{id}/publish")]
    public async Task<ActionResult<AssessmentResponseDto>> PublishAssessment(int id, UpdateAssessmentStatusDto dto)
    {
        // Repository returns assessment with Course and CreatedBy loaded
        var assessment = await _assessmentRepository.GetByIdWithDetailsAsync(id);

        if (assessment is null)
            return NotFound(new { error = "Assessment not found", code = "ASSESSMENT_NOT_FOUND" });

        // Enforce valid status transitions: Draft → Published → Closed
        var validTransition = (assessment.Status, dto.Status) switch
        {
            (AssessmentStatus.Draft, AssessmentStatus.Published) => true,
            (AssessmentStatus.Published, AssessmentStatus.Closed) => true,
            _ => false
        };

        if (!validTransition)
            return BadRequest(new
            {
                error = $"Cannot transition from {assessment.Status} to {dto.Status}. Valid: Draft → Published → Closed",
                code = "INVALID_STATUS_TRANSITION"
            });

        // Apply the status change
        assessment.Status = dto.Status;

        // Repository calls SaveChanges
        await _assessmentRepository.UpdateAsync(assessment);

        return Ok(new AssessmentResponseDto
        {
            AssessmentID = assessment.AssessmentID,
            CourseID = assessment.CourseID,
            CourseName = assessment.Course.Title,
            SectionID = assessment.SectionID,
            Title = assessment.Title,
            Type = assessment.Type,
            DueAt = assessment.DueAt,
            MaxScore = assessment.MaxScore,
            GradingRubricJSON = assessment.GradingRubricJSON,
            CreatedByFK = assessment.CreatedByFK,
            CreatedByName = assessment.CreatedBy.FullName,
            CreatedAt = assessment.CreatedAt,
            Status = assessment.Status
        });
    }
}
