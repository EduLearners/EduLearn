using EduLearn.API.DTOs;
using EduLearn.API.Models;
using EduLearn.API.Repositories.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace EduLearn.API.Controllers;

[ApiController]
[Route("api/grade-changes")]
[Authorize]
public class GradeChangesController : ControllerBase
{
    // Repository pattern: data access through repository interfaces
    private readonly IGradeChangeRepository _gradeChangeRepository;
    private readonly ISubmissionRepository _submissionRepository;
    private readonly IUserRepository _userRepository;

    public GradeChangesController(
        IGradeChangeRepository gradeChangeRepository,
        ISubmissionRepository submissionRepository,
        IUserRepository userRepository)
    {
        _gradeChangeRepository = gradeChangeRepository;
        _submissionRepository = submissionRepository;
        _userRepository = userRepository;
    }

    // ── POST /api/grade-changes — Instructor manually records a grade modification ──
    // PRD AGI-03: auto-creation already happens in SubmissionsController on re-grade.
    // This endpoint allows an instructor to record a modification with a reason
    // without going through the full grade flow (e.g. correcting a clerical error).
    [HttpPost]
    [Authorize(Roles = "Instructor,ITAdmin")]   // PRD §6.6 AGI-03 — Instructor only
    public async Task<ActionResult<GradeChangeResponseDto>> CreateGradeChange(CreateGradeChangeDto dto)
    {
        // Validate that the submission exists
        var submission = await _submissionRepository.GetByIdAsync(dto.SubmissionID);

        if (submission is null)
            return NotFound(new { error = "Submission not found", code = "SUBMISSION_NOT_FOUND" });

        // ChangedByFK comes from JWT — not from body (same pattern as grading)
        var callerId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? throw new InvalidOperationException("NameIdentifier claim missing"));
        var changedBy = await _userRepository.GetByIdAsync(callerId);

        if (changedBy is null)
            return BadRequest(new { error = "User not found", code = "USER_NOT_FOUND" });

        // Create the grade change record
        var gradeChange = new GradeChange
        {
            SubmissionID = dto.SubmissionID,
            OldScore = dto.OldScore,
            NewScore = dto.NewScore,
            ChangedByFK = callerId,   // from JWT, not body
            Reason = dto.Reason,
            AuditNote = dto.AuditNote
        };

        await _gradeChangeRepository.CreateAsync(gradeChange);

        return StatusCode(StatusCodes.Status201Created, new GradeChangeResponseDto
        {
            GradeChangeID = gradeChange.GradeChangeID,
            SubmissionID = gradeChange.SubmissionID,
            OldScore = gradeChange.OldScore,
            NewScore = gradeChange.NewScore,
            ChangedByFK = gradeChange.ChangedByFK,
            ChangedByName = changedBy.FullName,
            ChangedAt = gradeChange.ChangedAt,
            Reason = gradeChange.Reason,
            AuditNote = gradeChange.AuditNote
        });
    }

    // ── GET /api/grade-changes/submission/{submissionId} — Grade change audit trail ──
    // PRD AGI-03: Instructor and Auditor can view the full history of score changes
    // for a specific submission. Ordered newest first.
    [HttpGet("submission/{submissionId}")]
    [Authorize(Roles = "Instructor,Auditor,ITAdmin")]   // PRD §6.6 AGI-03
    public async Task<ActionResult<List<GradeChangeResponseDto>>> GetBySubmission(int submissionId)
    {
        // Validate that the submission exists
        var submissionExists = await _submissionRepository.ExistsAsync(submissionId);

        if (!submissionExists)
            return NotFound(new { error = "Submission not found", code = "SUBMISSION_NOT_FOUND" });

        // Repository returns grade changes with ChangedBy navigation loaded
        var gradeChanges = await _gradeChangeRepository.GetBySubmissionIdWithDetailsAsync(submissionId);

        var response = gradeChanges.Select(gc => MapToDto(gc)).ToList();
        return Ok(response);
    }

    // Helper: maps GradeChange entity (with navigation properties loaded) to response DTO
    private static GradeChangeResponseDto MapToDto(GradeChange gc) => new()
    {
        GradeChangeID = gc.GradeChangeID,
        SubmissionID = gc.SubmissionID,
        OldScore = gc.OldScore,
        NewScore = gc.NewScore,
        ChangedByFK = gc.ChangedByFK,
        ChangedByName = gc.ChangedBy.FullName,
        ChangedAt = gc.ChangedAt,
        Reason = gc.Reason,
        AuditNote = gc.AuditNote
    };
}