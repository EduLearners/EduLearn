// ============================================================
// AGI-04: PlagiarismController.cs
// Endpoints: report, get, list by submission, integrity status, update status
// ============================================================

using EduLearn.API.DTOs;
using EduLearn.API.Models;
using EduLearn.API.Models.Enums;
using EduLearn.API.Repositories.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace EduLearn.API.Controllers;

[ApiController]
[Route("api/plagiarism")]
[Authorize]
public class PlagiarismController : ControllerBase
{
    private readonly IPlagiarismRepository _plagiarismRepo;
    private readonly ISubmissionRepository _submissionRepo;
    private readonly IStudentRepository _studentRepo;

    public PlagiarismController(
        IPlagiarismRepository plagiarismRepo,
        ISubmissionRepository submissionRepo,
        IStudentRepository studentRepo)
    {
        _plagiarismRepo = plagiarismRepo;
        _submissionRepo = submissionRepo;
        _studentRepo = studentRepo;
    }

    // ── POST /api/plagiarism/report ─────────────────────────────
    /// <summary>
    /// AGI-04: Raise a plagiarism flag against a submission. Instructor and ITAdmin only.
    /// </summary>
    [HttpPost("report")]
    [Authorize(Roles = "Instructor,ITAdmin")]
    public async Task<ActionResult<PlagiarismReportResponseDto>> Report(
        CreatePlagiarismReportDto dto, CancellationToken ct)
    {
        // Validate submission exists
        var submission = await _submissionRepo.GetByIdAsync(dto.SubmissionID);
        if (submission is null)
            return NotFound(new { error = "Submission not found", code = "SUBMISSION_NOT_FOUND" });

        var report = new PlagiarismReport
        {
            SubmissionID = dto.SubmissionID,
            FlaggedByUserID = GetCurrentUserId(),
            SimilarityScore = Math.Round(dto.SimilarityScore, 2),
            Details = dto.Details,
            Status = PlagiarismStatus.Pending
        };

        var created = await _plagiarismRepo.CreateAsync(report, ct);

        // Mark submission status as Plagiarised so roster/grading views reflect it
        submission.Status = SubmissionStatus.Plagiarised;
        await _submissionRepo.UpdateAsync(submission);

        return CreatedAtAction(nameof(GetReport),
            new { id = created.ReportID },
            MapToDto(created));
    }

    // ── GET /api/plagiarism/{id} ────────────────────────────────
    /// <summary>
    /// AGI-04: Get a specific plagiarism report by ID. Instructor, Registrar, ITAdmin only.
    /// </summary>
    [HttpGet("{id}")]
    [Authorize(Roles = "Instructor,Registrar,ITAdmin")]
    public async Task<ActionResult<PlagiarismReportResponseDto>> GetReport(
        int id, CancellationToken ct)
    {
        var report = await _plagiarismRepo.GetByIdAsync(id, ct);
        if (report is null)
            return NotFound(new { error = "Report not found", code = "REPORT_NOT_FOUND" });

        return Ok(MapToDto(report));
    }

    // ── GET /api/plagiarism/submission/{submissionId} ───────────
    /// <summary>
    /// AGI-04: List all plagiarism reports for a specific submission.
    /// </summary>
    [HttpGet("submission/{submissionId}")]
    [Authorize(Roles = "Instructor,Registrar,ITAdmin")]
    public async Task<ActionResult<IEnumerable<PlagiarismReportResponseDto>>> GetBySubmission(
        int submissionId, CancellationToken ct)
    {
        var reports = await _plagiarismRepo.GetBySubmissionIdAsync(submissionId, ct);
        return Ok(reports.Select(MapToDto));
    }

    // ── GET /api/plagiarism/student/{studentId}/integrity ───────
    /// <summary>
    /// AGI-04: Get the academic integrity status summary for a student.
    /// Students may check their own; Instructor/Registrar/ITAdmin may check any.
    /// </summary>
    [HttpGet("student/{studentId}/integrity")]
    [Authorize(Roles = "Student,Instructor,Registrar,ITAdmin")]
    public async Task<ActionResult<IntegrityStatusDto>> GetIntegrityStatus(
        int studentId, CancellationToken ct)
    {
        var student = await _studentRepo.GetByIdAsync(studentId);
        if (student is null)
            return NotFound(new { error = "Student not found", code = "STUDENT_NOT_FOUND" });

        // Ownership check — students see only their own
        var callerRole = GetCurrentUserRole();
        if (callerRole == "Student" && student.UserID != GetCurrentUserId())
            return StatusCode(403, new { error = "You may only view your own integrity status", code = "INTEGRITY_FORBIDDEN" });

        var reports = (await _plagiarismRepo.GetByStudentIdAsync(studentId, ct)).ToList();

        var status = new IntegrityStatusDto
        {
            StudentID = studentId,
            StudentName = student.Name,
            StudentMRN = student.MRN,
            TotalReports = reports.Count,
            PendingCount = reports.Count(r => r.Status == PlagiarismStatus.Pending),
            ConfirmedCount = reports.Count(r => r.Status == PlagiarismStatus.Confirmed),
            DismissedCount = reports.Count(r => r.Status == PlagiarismStatus.Dismissed),
            HasConfirmedViolation = reports.Any(r => r.Status == PlagiarismStatus.Confirmed),
            Reports = reports.Select(MapToDto).ToList()
        };

        return Ok(status);
    }

    // ── PUT /api/plagiarism/{id}/status ─────────────────────────
    /// <summary>
    /// AGI-04: Confirm or dismiss a plagiarism report. ITAdmin only.
    /// Once Confirmed or Dismissed the report is considered resolved.
    /// </summary>
    [HttpPut("{id}/status")]
    [Authorize(Roles = "ITAdmin")]
    public async Task<ActionResult<PlagiarismReportResponseDto>> UpdateStatus(
        int id, UpdatePlagiarismStatusDto dto, CancellationToken ct)
    {
        var report = await _plagiarismRepo.GetByIdAsync(id, ct);
        if (report is null)
            return NotFound(new { error = "Report not found", code = "REPORT_NOT_FOUND" });

        // Guard: Pending -> Confirmed | Dismissed only
        if (report.Status != PlagiarismStatus.Pending)
            return BadRequest(new
            {
                error = $"Only Pending reports can be reviewed (current: {report.Status})",
                code = "INVALID_STATUS_TRANSITION"
            });

        if (dto.Status == PlagiarismStatus.Pending)
            return BadRequest(new { error = "Cannot set status back to Pending", code = "INVALID_STATUS" });

        report.Status = dto.Status;
        report.ResolvedAt = DateTime.UtcNow;

        // If dismissed, revert submission status back to Graded (if it was graded before)
        if (dto.Status == PlagiarismStatus.Dismissed)
        {
            var submission = await _submissionRepo.GetByIdAsync(report.SubmissionID);
            if (submission is not null && submission.Status == SubmissionStatus.Plagiarised)
            {
                submission.Status = submission.Score.HasValue
                    ? SubmissionStatus.Graded
                    : SubmissionStatus.Submitted;
                await _submissionRepo.UpdateAsync(submission);
            }
        }

        var updated = await _plagiarismRepo.UpdateAsync(report, ct);
        return Ok(MapToDto(updated));
    }

    // ── Helpers ─────────────────────────────────────────────────

    private static PlagiarismReportResponseDto MapToDto(PlagiarismReport r) => new()
    {
        ReportID        = r.ReportID,
        SubmissionID    = r.SubmissionID,
        StudentName     = r.Submission?.Student?.Name ?? string.Empty,
        StudentMRN      = r.Submission?.Student?.MRN ?? string.Empty,
        AssessmentTitle = r.Submission?.Assessment?.Title ?? string.Empty,
        CourseName      = r.Submission?.Assessment?.Course?.Title ?? string.Empty,
        FlaggedByUserID = r.FlaggedByUserID,
        FlaggedByName   = r.FlaggedBy?.FullName ?? string.Empty,
        SimilarityScore = r.SimilarityScore,
        Details         = r.Details,
        Status          = r.Status,
        FlaggedAt       = r.FlaggedAt,
        ResolvedAt      = r.ResolvedAt
    };

    private int GetCurrentUserId()
    {
        var raw = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return int.Parse(raw!);
    }

    private string GetCurrentUserRole()
        => User.FindFirst(ClaimTypes.Role)?.Value ?? string.Empty;
}
