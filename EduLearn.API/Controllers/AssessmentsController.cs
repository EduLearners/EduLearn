using EduLearn.API.DTOs;
using EduLearn.API.Models;
using EduLearn.API.Models.Enums;
using EduLearn.API.Repositories.Interfaces;
using EduLearn.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace EduLearn.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AssessmentsController : ControllerBase
{
    private readonly IAssessmentRepository _assessmentRepository;
    private readonly ICourseRepository _courseRepository;
    private readonly IUserRepository _userRepository;
    private readonly ISectionRepository _sectionRepository;
    private readonly IEnrollmentRepository _enrollmentRepository;
    private readonly IStudentRepository _studentRepository;
    private readonly INotificationService _notificationService;

    public AssessmentsController(
        IAssessmentRepository assessmentRepository,
        ICourseRepository courseRepository,
        IUserRepository userRepository,
        ISectionRepository sectionRepository,
        IEnrollmentRepository enrollmentRepository,
        IStudentRepository studentRepository,
        INotificationService notificationService)
    {
        _assessmentRepository = assessmentRepository;
        _courseRepository = courseRepository;
        _userRepository = userRepository;
        _sectionRepository = sectionRepository;
        _enrollmentRepository = enrollmentRepository;
        _studentRepository = studentRepository;
        _notificationService = notificationService;
    }

    /// <summary>
    /// Create a new assessment for a course. Instructor and ITAdmin only.
    /// Validates that the target course and optional section exist before saving.
    /// Status defaults to Draft if not supplied; instructor can pass Published to skip the separate Publish step.
    /// </summary>
    [HttpPost]
    [Authorize(Roles = "Instructor,ITAdmin")]
    public async Task<ActionResult<AssessmentResponseDto>> CreateAssessment(CreateAssessmentDto dto)
    {
        var course = await _courseRepository.GetByIdAsync(dto.CourseID);

        if (course is null)
            return BadRequest(new { error = "Course not found", code = "COURSE_NOT_FOUND" });

        if (dto.SectionID.HasValue)
        {
            var sectionExists = await _sectionRepository.ExistsAsync(dto.SectionID.Value);

            if (!sectionExists)
                return BadRequest(new { error = "Section not found", code = "SECTION_NOT_FOUND" });
        }

        var callerId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? throw new InvalidOperationException("NameIdentifier claim missing"));
        var creator = await _userRepository.GetByIdAsync(callerId);

        if (creator is null)
            return BadRequest(new { error = "Creator user not found", code = "USER_NOT_FOUND" });

        var assessment = new Assessment
        {
            CourseID      = dto.CourseID,
            SectionID     = dto.SectionID,
            Title         = dto.Title,
            Type          = dto.Type,
            Status        = dto.Status,
            DueAt         = dto.DueAt,
            MaxScore      = dto.MaxScore,
            GradingRubricJSON = dto.GradingRubricJSON,
            InstructionsURI   = dto.InstructionsURI,
            CreatedByFK   = callerId
        };

        await _assessmentRepository.CreateAsync(assessment);

        // Notify enrolled students immediately if created as Published
        if (assessment.Status == AssessmentStatus.Published)
            await NotifyEnrolledStudentsAsync(assessment, course.Title);

        return CreatedAtAction(nameof(GetById),
            new { id = assessment.AssessmentID },
            MapToDto(assessment, course.Title, creator.FullName));
    }

    /// <summary>
    /// List all assessments for a given course. All authenticated users.
    /// Returns 404 if the course does not exist.
    /// </summary>
    [HttpGet("course/{courseId}")]
    public async Task<ActionResult<List<AssessmentResponseDto>>> GetAssessmentsByCourse(int courseId)
    {
        var courseExists = await _courseRepository.ExistsAsync(courseId);

        if (!courseExists)
            return NotFound(new { error = "Course not found", code = "COURSE_NOT_FOUND" });

        var assessments = await _assessmentRepository.GetByCourseIdWithDetailsAsync(courseId);

        return Ok(assessments.Select(a =>
            MapToDto(a, a.Course.Title, a.CreatedBy.FullName)).ToList());
    }

    /// <summary>
    /// Get a single assessment by ID. All authenticated users.
    /// </summary>
    [HttpGet("{id}")]
    public async Task<ActionResult<AssessmentResponseDto>> GetById(int id)
    {
        var assessment = await _assessmentRepository.GetByIdWithDetailsAsync(id);

        if (assessment is null)
            return NotFound(new { error = "Assessment not found", code = "ASSESSMENT_NOT_FOUND" });

        return Ok(MapToDto(assessment, assessment.Course.Title, assessment.CreatedBy.FullName));
    }

    /// <summary>
    /// Update an existing assessment. Instructor and ITAdmin only.
    /// Only Draft assessments can be updated. Published, Closed, and Archived are locked.
    /// </summary>
    [HttpPut("{id}")]
    [Authorize(Roles = "Instructor,ITAdmin")]
    public async Task<ActionResult<AssessmentResponseDto>> UpdateAssessment(int id, UpdateAssessmentDto dto)
    {
        var assessment = await _assessmentRepository.GetByIdWithDetailsAsync(id);

        if (assessment is null)
            return NotFound(new { error = "Assessment not found", code = "ASSESSMENT_NOT_FOUND" });

        if (assessment.Status != AssessmentStatus.Draft)
            return BadRequest(new { error = "Only Draft assessments can be updated", code = "ASSESSMENT_LOCKED" });

        if (dto.SectionID.HasValue)
        {
            var sectionExists = await _sectionRepository.ExistsAsync(dto.SectionID.Value);

            if (!sectionExists)
                return BadRequest(new { error = "Section not found", code = "SECTION_NOT_FOUND" });
        }

        assessment.SectionID        = dto.SectionID;
        assessment.Title            = dto.Title;
        assessment.Type             = dto.Type;
        assessment.DueAt            = dto.DueAt;
        assessment.MaxScore         = dto.MaxScore;
        assessment.GradingRubricJSON = dto.GradingRubricJSON;
        assessment.InstructionsURI  = dto.InstructionsURI;

        await _assessmentRepository.UpdateAsync(assessment);

        return Ok(MapToDto(assessment, assessment.Course.Title, assessment.CreatedBy.FullName));
    }

    /// <summary>
    /// Transition an assessment through its status lifecycle. Instructor and ITAdmin only.
    /// Enforces valid transitions: Draft → Published → Closed → Archived.
    /// </summary>
    [HttpPut("{id}/publish")]
    [Authorize(Roles = "Instructor,ITAdmin")]
    public async Task<ActionResult<AssessmentResponseDto>> PublishAssessment(int id, UpdateAssessmentStatusDto dto)
    {
        var assessment = await _assessmentRepository.GetByIdWithDetailsAsync(id);

        if (assessment is null)
            return NotFound(new { error = "Assessment not found", code = "ASSESSMENT_NOT_FOUND" });

        var validTransition = (assessment.Status, dto.Status) switch
        {
            (AssessmentStatus.Draft,     AssessmentStatus.Published) => true,
            (AssessmentStatus.Published, AssessmentStatus.Closed)    => true,
            (AssessmentStatus.Closed,    AssessmentStatus.Archived)  => true,
            _ => false
        };

        if (!validTransition)
            return BadRequest(new
            {
                error = $"Cannot transition from {assessment.Status} to {dto.Status}. Valid: Draft → Published → Closed → Archived",
                code  = "INVALID_STATUS_TRANSITION"
            });

        assessment.Status = dto.Status;
        await _assessmentRepository.UpdateAsync(assessment);

        // Notify enrolled students when assessment transitions to Published
        if (dto.Status == AssessmentStatus.Published)
            await NotifyEnrolledStudentsAsync(assessment, assessment.Course.Title);

        return Ok(MapToDto(assessment, assessment.Course.Title, assessment.CreatedBy.FullName));
    }

    // ── Notify enrolled students when assessment is published ────
    // If assessment has a specific section → notify students in that section.
    // If assessment is course-wide (no section) → notify students across all sections of that course.
    private async Task NotifyEnrolledStudentsAsync(Assessment assessment, string courseTitle)
    {
        try
        {
            IEnumerable<int> studentIds;

            if (assessment.SectionID.HasValue)
            {
                // Section-scoped: only students enrolled in that section
                var enrollments = await _enrollmentRepository.GetBySectionIdWithDetailsAsync(assessment.SectionID.Value);
                studentIds = enrollments
                    .Where(e => e.Status == EnrollmentStatus.Enrolled)
                    .Select(e => e.Student.UserID);
            }
            else
            {
                // Course-wide: collect enrolled students from all sections of this course
                var sections = await _sectionRepository.GetByCourseIdAsync(assessment.CourseID);
                var userIdSet = new HashSet<int>();
                foreach (var section in sections)
                {
                    var enrollments = await _enrollmentRepository.GetBySectionIdWithDetailsAsync(section.SectionID);
                    foreach (var e in enrollments.Where(e => e.Status == EnrollmentStatus.Enrolled))
                        userIdSet.Add(e.Student.UserID);
                }
                studentIds = userIdSet;
            }

            var dueText = assessment.DueAt.HasValue
                ? $" Due: {assessment.DueAt.Value:MMM dd, yyyy}."
                : string.Empty;

            var message = $"New {assessment.Type} published: \"{assessment.Title}\" in {courseTitle}.{dueText}";

            foreach (var userId in studentIds)
            {
                await _notificationService.NotifyAsync(
                    userId,
                    NotificationCategory.Assessment,
                    NotificationSeverity.Info,
                    message,
                    assessment.AssessmentID);
            }
        }
        catch
        {
            // Notifications are best-effort — never fail the main request
        }
    }

    // ── shared mapper ────────────────────────────────────────────
    private static AssessmentResponseDto MapToDto(
        Assessment a, string courseName, string createdByName) => new()
    {
        AssessmentID      = a.AssessmentID,
        CourseID          = a.CourseID,
        CourseName        = courseName,
        SectionID         = a.SectionID,
        Title             = a.Title,
        Type              = a.Type,
        DueAt             = a.DueAt,
        MaxScore          = a.MaxScore,
        GradingRubricJSON = a.GradingRubricJSON,
        InstructionsURI   = a.InstructionsURI,
        CreatedByFK       = a.CreatedByFK,
        CreatedByName     = createdByName,
        CreatedAt         = a.CreatedAt,
        Status            = a.Status
    };
}
