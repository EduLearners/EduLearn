using EduLearn.API.DTOs;
using EduLearn.API.Models;
using EduLearn.API.Models.Enums;
using EduLearn.API.Repositories.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EduLearn.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SubmissionsController : ControllerBase
{
    // Repository pattern: data access through repository interfaces
    private readonly ISubmissionRepository _submissionRepository;
    private readonly IAssessmentRepository _assessmentRepository;
    private readonly IStudentRepository _studentRepository;
    private readonly IUserRepository _userRepository;

    public SubmissionsController(
        ISubmissionRepository submissionRepository,
        IAssessmentRepository assessmentRepository,
        IStudentRepository studentRepository,
        IUserRepository userRepository)
    {
        _submissionRepository = submissionRepository;
        _assessmentRepository = assessmentRepository;
        _studentRepository = studentRepository;
        _userRepository = userRepository;
    }

    // ── POST /api/submissions — Student submits work for an assessment ──
    [HttpPost]
    public async Task<ActionResult<SubmissionResponseDto>> CreateSubmission(CreateSubmissionDto dto)
    {
        // Validate that the assessment exists and is Published (students can only submit to published assessments)
        var assessment = await _assessmentRepository.GetByIdAsync(dto.AssessmentID);

        if (assessment is null)
            return BadRequest(new { error = "Assessment not found", code = "ASSESSMENT_NOT_FOUND" });

        if (assessment.Status != AssessmentStatus.Published)
            return BadRequest(new { error = "Assessment is not open for submissions. Only Published assessments accept submissions", code = "ASSESSMENT_NOT_PUBLISHED" });

        // Validate that the student exists
        var student = await _studentRepository.GetByIdAsync(dto.StudentID);

        if (student is null)
            return BadRequest(new { error = "Student not found", code = "STUDENT_NOT_FOUND" });

        // Check for duplicate submission (same student + same assessment)
        var existingSubmission = await _submissionRepository.GetByStudentAndAssessmentAsync(dto.StudentID, dto.AssessmentID);

        if (existingSubmission is not null)
            return Conflict(new { error = "Student has already submitted for this assessment", code = "DUPLICATE_SUBMISSION" });

        // Determine if submission is late
        var status = SubmissionStatus.Submitted;
        if (assessment.DueAt.HasValue && DateTime.UtcNow > assessment.DueAt.Value)
        {
            status = SubmissionStatus.Late;
        }

        // Create the submission entity
        var submission = new Submission
        {
            AssessmentID = dto.AssessmentID,
            StudentID = dto.StudentID,
            FileURI = dto.FileURI,
            Status = status
        };

        // Repository handles Add + SaveChanges
        await _submissionRepository.CreateAsync(submission);

        // Build response
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

    // ── GET /api/submissions/assessment/{assessmentId} — List all submissions for an assessment ──
    [HttpGet("assessment/{assessmentId}")]
    public async Task<ActionResult<List<SubmissionResponseDto>>> GetByAssessment(int assessmentId)
    {
        // Validate assessment exists
        var assessmentExists = await _assessmentRepository.ExistsAsync(assessmentId);

        if (!assessmentExists)
            return NotFound(new { error = "Assessment not found", code = "ASSESSMENT_NOT_FOUND" });

        // Repository returns submissions with Assessment, Student, and Grader navigation loaded
        var submissions = await _submissionRepository.GetByAssessmentIdWithDetailsAsync(assessmentId);

        var response = submissions.Select(s => MapToDto(s)).ToList();
        return Ok(response);
    }

    // ── POST /api/submissions/{id}/grade — Instructor grades a submission ──
    [HttpPost("{id}/grade")]
    public async Task<ActionResult<SubmissionResponseDto>> GradeSubmission(int id, GradeSubmissionDto dto)
    {
        // Get submission with navigation properties loaded
        var submission = await _submissionRepository.GetByIdWithDetailsAsync(id);

        if (submission is null)
            return NotFound(new { error = "Submission not found", code = "SUBMISSION_NOT_FOUND" });

        // Validate the grader (instructor) exists
        var grader = await _userRepository.GetByIdAsync(dto.GraderID);

        if (grader is null)
            return BadRequest(new { error = "Grader user not found", code = "GRADER_NOT_FOUND" });

        // Validate score doesn't exceed assessment max score
        if (dto.Score > submission.Assessment.MaxScore)
            return BadRequest(new
            {
                error = $"Score ({dto.Score}) exceeds maximum score ({submission.Assessment.MaxScore})",
                code = "SCORE_EXCEEDS_MAX"
            });

        // If this is a re-grade (score already exists), auto-create a GradeChange audit record
        if (submission.Score.HasValue)
        {
            var gradeChange = new GradeChange
            {
                SubmissionID = submission.SubmissionID,
                OldScore = submission.Score.Value,
                NewScore = dto.Score,
                ChangedByFK = dto.GraderID,
                Reason = dto.Reason ?? "Grade updated by instructor",
                AuditNote = $"Re-graded from {submission.Score.Value} to {dto.Score}"
            };

            // Create grade change record via repository pattern
            await _submissionRepository.CreateGradeChangeAsync(gradeChange);
        }

        // Apply the grade
        submission.Score = dto.Score;
        submission.GraderID = dto.GraderID;
        submission.GradedAt = DateTime.UtcNow;
        submission.Status = SubmissionStatus.Graded;

        // Repository saves the updated submission
        await _submissionRepository.UpdateAsync(submission);

        // Build response with grader name
        var response = MapToDto(submission);
        response.GraderName = grader.FullName;

        return Ok(response);
    }

    // ── GET /api/submissions/student/{studentId} — Student's submissions across all assessments ──
    [HttpGet("student/{studentId}")]
    public async Task<ActionResult<List<SubmissionResponseDto>>> GetByStudent(int studentId)
    {
        // Validate student exists
        var studentExists = await _studentRepository.ExistsAsync(studentId);

        if (!studentExists)
            return NotFound(new { error = "Student not found", code = "STUDENT_NOT_FOUND" });

        // Repository returns submissions with Assessment, Student, and Grader navigation loaded
        var submissions = await _submissionRepository.GetByStudentIdWithDetailsAsync(studentId);

        var response = submissions.Select(s => MapToDto(s)).ToList();
        return Ok(response);
    }

    // Helper: maps Submission entity (with navigation properties loaded) to response DTO
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