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
public class SubmissionsController : ControllerBase
{
    private readonly ISubmissionRepository _submissionRepository;
    private readonly IAssessmentRepository _assessmentRepository;
    private readonly IStudentRepository _studentRepository;
    private readonly IUserRepository _userRepository;
    private readonly INotificationService _notificationService;
    private readonly AuditLogService _auditLogService;

    public SubmissionsController(
        ISubmissionRepository submissionRepository,
        IAssessmentRepository assessmentRepository,
        IStudentRepository studentRepository,
        IUserRepository userRepository,
        INotificationService notificationService,
        AuditLogService auditLogService)
    {
        _submissionRepository = submissionRepository;
        _assessmentRepository = assessmentRepository;
        _studentRepository = studentRepository;
        _userRepository = userRepository;
        _notificationService = notificationService;
        _auditLogService = auditLogService;
    }

    /// <summary>
    /// Submit work for a published assessment. Student role only.
    /// Marks the submission as Late if the assessment due date has passed; rejects duplicates.
    /// </summary>
    [HttpPost]
    [Authorize(Roles = "Student")]
    public async Task<ActionResult<SubmissionResponseDto>> CreateSubmission(CreateSubmissionDto dto)
    {
        var assessment = await _assessmentRepository.GetByIdAsync(dto.AssessmentID);

        if (assessment is null)
            return BadRequest(new { error = "Assessment not found", code = "ASSESSMENT_NOT_FOUND" });

        if (assessment.Status != AssessmentStatus.Published)
            return BadRequest(new { error = "Assessment is not open for submissions. Only Published assessments accept submissions", code = "ASSESSMENT_NOT_PUBLISHED" });

        var student = await _studentRepository.GetByIdAsync(dto.StudentID);

        if (student is null)
            return BadRequest(new { error = "Student not found", code = "STUDENT_NOT_FOUND" });

        var callerRole = User.FindFirst(ClaimTypes.Role)?.Value ?? string.Empty;
        if (callerRole == "Student" && student.UserID != int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0"))
            return StatusCode(403, new { error = "Students may only submit their own work", code = "SUBMISSION_FORBIDDEN" });

        // Check for duplicate submission (same student + same assessment)
        var existingSubmission = await _submissionRepository.GetByStudentAndAssessmentAsync(dto.StudentID, dto.AssessmentID);

        if (existingSubmission is not null)
            return Conflict(new { error = "Student has already submitted for this assessment", code = "DUPLICATE_SUBMISSION" });

        var status = SubmissionStatus.Submitted;
        if (assessment.DueAt.HasValue && DateTime.UtcNow > assessment.DueAt.Value)
        {
            status = SubmissionStatus.Late;
        }

        var submission = new Submission
        {
            AssessmentID = dto.AssessmentID,
            StudentID = dto.StudentID,
            FileURI = dto.FileURI,
            Status = status
        };

        await _submissionRepository.CreateAsync(submission);

        var response = new SubmissionResponseDto
        {
            SubmissionID = submission.SubmissionID,
            AssessmentID = submission.AssessmentID,
            AssessmentTitle = assessment.Title,
            StudentID = submission.StudentID,
            StudentName = student.Name,
            SubmittedAt = submission.SubmittedAt,
            FileURI = submission.FileURI,
            Score = submission.Score,
            MaxScore = assessment.MaxScore,
            GraderID = submission.GraderID,
            GraderName = null,
            GradedAt = submission.GradedAt,
            PlagiarismReportURI = submission.PlagiarismReportURI,
            Status = submission.Status
        };

        return StatusCode(StatusCodes.Status201Created, response);
    }

    /// <summary>
    /// List all submissions for a given assessment. Instructor and ITAdmin only.
    /// Returns 404 if the assessment does not exist.
    /// </summary>
    [HttpGet("assessment/{assessmentId}")]
    [Authorize(Roles = "Instructor,ITAdmin")]
    public async Task<ActionResult<List<SubmissionResponseDto>>> GetByAssessment(int assessmentId)
    {
        var assessmentExists = await _assessmentRepository.ExistsAsync(assessmentId);

        if (!assessmentExists)
            return NotFound(new { error = "Assessment not found", code = "ASSESSMENT_NOT_FOUND" });

        var submissions = await _submissionRepository.GetByAssessmentIdWithDetailsAsync(assessmentId);

        var response = submissions.Select(s => MapToDto(s)).ToList();
        return Ok(response);
    }

    /// <summary>
    /// Get a single submission by ID. Instructor, ITAdmin and Registrar only.
    /// Used by the GradePage to load submission details before grading.
    /// Returns 404 if the submission does not exist.
    /// </summary>
    [HttpGet("{id}")]
    [Authorize(Roles = "Instructor,ITAdmin,Registrar")]
    public async Task<ActionResult<SubmissionResponseDto>> GetById(int id)
    {
        var submission = await _submissionRepository.GetByIdWithDetailsAsync(id);

        if (submission is null)
            return NotFound(new { error = "Submission not found", code = "SUBMISSION_NOT_FOUND" });

        return Ok(MapToDto(submission));
    }

    /// <summary>
    /// Assign or update a score for a submission. Instructor and ITAdmin only.
    /// Records a GradeChange audit row on re-grades and sends a notification to the student.
    /// </summary>
    [HttpPost("{id}/grade")]
    [Authorize(Roles = "Instructor,ITAdmin")]
    public async Task<ActionResult<SubmissionResponseDto>> GradeSubmission(int id, GradeSubmissionDto dto)
    {
        var submission = await _submissionRepository.GetByIdWithDetailsAsync(id);

        if (submission is null)
            return NotFound(new { error = "Submission not found", code = "SUBMISSION_NOT_FOUND" });

        if (submission.Assessment.Status != AssessmentStatus.Published)
            return BadRequest(new { error = "Cannot grade a submission whose assessment is not Published", code = "ASSESSMENT_NOT_OPEN_FOR_GRADING" });

        var callerId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? throw new InvalidOperationException("NameIdentifier claim missing"));
        var grader = await _userRepository.GetByIdAsync(callerId);
        if (grader is null)
            return BadRequest(new { error = "Grader user not found", code = "GRADER_NOT_FOUND" });

        if (grader.Role != UserRole.Instructor && grader.Role != UserRole.ITAdmin)
            return StatusCode(403, new { error = "Only Instructors may grade submissions", code = "NOT_INSTRUCTOR" });

        if (dto.Score > submission.Assessment.MaxScore)
            return BadRequest(new
            {
                error = $"Score ({dto.Score}) exceeds maximum score ({submission.Assessment.MaxScore})",
                code = "SCORE_EXCEEDS_MAX"
            });

        if (submission.Score.HasValue)
        {
            var gradeChange = new GradeChange
            {
                SubmissionID = submission.SubmissionID,
                OldScore = submission.Score.Value,
                NewScore = dto.Score,
                ChangedByFK = callerId,
                Reason = dto.Reason ?? "Grade updated by instructor",
                AuditNote = $"Re-graded from {submission.Score.Value} to {dto.Score}"
            };

            await _submissionRepository.CreateGradeChangeAsync(gradeChange);
        }

        // Apply the grade
        submission.Score = dto.Score;
        submission.GraderID = callerId;
        submission.GradedAt = DateTime.UtcNow;
        submission.Status = SubmissionStatus.Graded;

        await _submissionRepository.UpdateAsync(submission);

        await _notificationService.NotifyAsync(
            submission.Student.UserID,
            NotificationCategory.Assessment,
            NotificationSeverity.Info,
            $"Grade posted for {submission.Assessment.Title}: {dto.Score}/{submission.Assessment.MaxScore}.",
            submission.SubmissionID);

        await _auditLogService.LogAsync(
            callerId,
            "SubmissionGraded",
            "Submission",
            submission.SubmissionID,
            new { assessmentId = submission.AssessmentID, studentId = submission.StudentID, score = dto.Score, maxScore = submission.Assessment.MaxScore });

        var response = MapToDto(submission);
        response.GraderName = grader.FullName;

        return Ok(response);
    }

    /// <summary>
    /// List all submissions made by a given student across all assessments. Any authenticated user may call this endpoint.
    /// Students may only view their own submissions; privileged roles may view any student's submissions.
    /// </summary>
    [HttpGet("student/{studentId}")]
    [Authorize(Policy = "SubmissionReadPolicy")]
    public async Task<ActionResult<List<SubmissionResponseDto>>> GetByStudent(int studentId)
    {
        // phase4-fix-10: Restrict to Instructor/Registrar/ITAdmin + Student-ownership.
        // DeptAdmin, Finance, and Auditor are explicitly excluded.
        var callerRole = User.FindFirst(ClaimTypes.Role)?.Value ?? string.Empty;
        var allowedRoles = new[] { "Instructor", "Registrar", "ITAdmin", "Student" };
        if (!allowedRoles.Contains(callerRole))
            return StatusCode(403, new { error = "Access denied — instructor or admin role required", code = "SUBMISSION_POLICY_DENIED" });

        var student = await _studentRepository.GetByIdAsync(studentId);
        if (student is null)
            return NotFound(new { error = "Student not found", code = "STUDENT_NOT_FOUND" });

        if (callerRole == "Student" && student.UserID != int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0"))
            return StatusCode(403, new { error = "You may only view your own submissions", code = "SUBMISSION_FORBIDDEN" });

        var submissions = await _submissionRepository.GetByStudentIdWithDetailsAsync(studentId);

        var response = submissions.Select(s => MapToDto(s)).ToList();
        return Ok(response);
    }

    private static SubmissionResponseDto MapToDto(Submission s) => new()
    {
        SubmissionID = s.SubmissionID,
        AssessmentID = s.AssessmentID,
        AssessmentTitle = s.Assessment.Title,
        StudentID = s.StudentID,
        StudentName = s.Student.Name,
        SubmittedAt = s.SubmittedAt,
        FileURI = s.FileURI,
        Score = s.Score,
        MaxScore = s.Assessment.MaxScore,
        GraderID = s.GraderID,
        GraderName = s.Grader?.FullName,
        GradedAt = s.GradedAt,
        PlagiarismReportURI = s.PlagiarismReportURI,
        Status = s.Status
    };
}
