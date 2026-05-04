using EduLearn.API.DTOs;
using EduLearn.API.Models;
using EduLearn.API.Models.Enums;
using EduLearn.API.Repositories.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using System.Text.Json;

namespace EduLearn.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TranscriptsController : ControllerBase
{
    private readonly ITranscriptRepository _transcriptRepo;
    private readonly IStudentRepository _studentRepo;
    private readonly IEnrollmentRepository _enrollRepo;
    private readonly IProgramRepository _programRepo;
    private readonly ISubmissionRepository _submissionRepo;

    public TranscriptsController(
        ITranscriptRepository transcriptRepo,
        IStudentRepository studentRepo,
        IEnrollmentRepository enrollRepo,
        IProgramRepository programRepo,
        ISubmissionRepository submissionRepo)
    {
        _transcriptRepo = transcriptRepo;
        _studentRepo = studentRepo;
        _enrollRepo = enrollRepo;
        _programRepo = programRepo;
        _submissionRepo = submissionRepo;
    }

    // POST /api/transcripts/generate/{studentId} — Generate transcript from enrollment data
    /// <summary>
    /// Generate a new transcript draft for the given student. Registrar and ITAdmin only.
    /// Includes only Enrolled course entries and computes a 10-point CGPA from graded submissions.
    /// </summary>
    [HttpPost("generate/{studentId}")]
    [Authorize(Roles = "Registrar,ITAdmin")]
    public async Task<ActionResult<TranscriptResponseDto>> GenerateTranscript(
        int studentId, CancellationToken cancellationToken)
    {
        var student = await _studentRepo.GetByIdAsync(studentId);
        if (student is null)
            return NotFound(new { error = "Student not found", code = "STUDENT_NOT_FOUND" });

        var program = await _programRepo.GetByIdAsync(student.ProgramID);

        // Get all enrollments for this student (includes Section + Course via Include)
        var enrollments = await _enrollRepo.GetByStudentIdAsync(studentId);

        // R-4: official transcripts must show only Enrolled entries —
        // exclude Dropped and Waitlisted enrollments before serialising.
        var entries = enrollments
            .Where(e => e.Status == EnrollmentStatus.Enrolled)
            .Select(e => new
            {
                courseName = e.Section.Course.Title,
                courseCode = e.Section.Course.Code,
                credits = e.Section.Course.Credits,
                term = e.Section.Term,
                status = e.Status.ToString(),
                gradePosted = e.GradePostedFlag,
                enrolledAt = e.EnrolledAt
            }).ToList();

        var totalCredits = entries.Sum(e => e.credits);

        // R-5: simple GPA computation on the Indian 10-point CGPA scale.
        // Average all of the student's graded submission percentages, then
        // map the average to a CGPA bucket. No credit-weighting (kept
        // intentionally simple — see audit R-5 / docs/AUDIT-REPORT-2026-05-04.md).
        var submissions = await _submissionRepo.GetByStudentIdWithDetailsAsync(studentId);
        var graded = submissions
            .Where(s => s.Score.HasValue && s.Assessment.MaxScore > 0)
            .ToList();
        decimal? gpa = null;
        if (graded.Count > 0)
        {
            var avgPercent = graded.Average(s => s.Score!.Value / s.Assessment.MaxScore * 100m);
            gpa = avgPercent switch
            {
                >= 90m => 10m,
                >= 80m => 9m,
                >= 70m => 8m,
                >= 60m => 7m,
                >= 50m => 6m,
                >= 45m => 5m,
                >= 40m => 4m,
                _      => 0m
            };
        }

        var transcript = new Transcript
        {
            StudentID = studentId,
            EntriesJSON = JsonSerializer.Serialize(entries),
            GPA = gpa,
            Status = TranscriptStatus.Draft
        };

        var created = await _transcriptRepo.CreateAsync(transcript);

        return CreatedAtAction(nameof(GetTranscript),
            new { id = created.TranscriptID },
            MapToDto(created, student, program?.Name ?? "Unknown"));
    }

    // GET /api/transcripts/student/{studentId} — Get all transcripts for a student
    /// <summary>
    /// List all transcripts for a given student. Any authenticated user may call this endpoint.
    /// Students may only view their own transcripts; Registrar and ITAdmin may view any.
    /// </summary>
    [HttpGet("student/{studentId}")]
    public async Task<ActionResult<IEnumerable<TranscriptResponseDto>>> GetByStudent(
        int studentId, CancellationToken cancellationToken)
    {
        var student = await _studentRepo.GetByIdAsync(studentId);
        if (student is null)
            return NotFound(new { error = "Student not found", code = "STUDENT_NOT_FOUND" });

        // Students can only view their own transcripts
        var callerRole = User.FindFirst(ClaimTypes.Role)?.Value ?? string.Empty;
        var callerId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");

        if (callerRole == "Student" && student.UserID != callerId)
            return StatusCode(403, new { error = "You may only view your own transcripts", code = "TRANSCRIPT_FORBIDDEN" });

        var program = await _programRepo.GetByIdAsync(student.ProgramID);
        var transcripts = await _transcriptRepo.GetByStudentIdAsync(studentId);

        return Ok(transcripts.Select(t => MapToDto(t, student, program?.Name ?? "Unknown")));
    }

    // GET /api/transcripts/{id}
    /// <summary>
    /// Retrieve a single transcript by its ID. Any authenticated user may call this endpoint.
    /// Students may only view their own transcripts; Registrar and ITAdmin may view any.
    /// </summary>
    [HttpGet("{id}")]
    public async Task<ActionResult<TranscriptResponseDto>> GetTranscript(
        int id, CancellationToken cancellationToken)
    {
        var transcript = await _transcriptRepo.GetByIdAsync(id);
        if (transcript is null)
            return NotFound(new { error = "Transcript not found", code = "TRANSCRIPT_NOT_FOUND" });

        var student = await _studentRepo.GetByIdAsync(transcript.StudentID);
        if (student is null)
            return NotFound(new { error = "Student not found", code = "STUDENT_NOT_FOUND" });

        // Students can only view their own transcripts
        var callerRole = User.FindFirst(ClaimTypes.Role)?.Value ?? string.Empty;
        var callerId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");

        if (callerRole == "Student" && student.UserID != callerId)
            return StatusCode(403, new { error = "You may only view your own transcripts", code = "TRANSCRIPT_FORBIDDEN" });

        var program = await _programRepo.GetByIdAsync(student.ProgramID);

        return Ok(MapToDto(transcript, student, program?.Name ?? "Unknown"));
    }

    // PUT /api/transcripts/{id}/publish — Publish a draft transcript
    /// <summary>
    /// Promote a Draft transcript to Issued status, recording the issued timestamp. Registrar and ITAdmin only.
    /// Returns 400 if the transcript is already in a non-Draft state.
    /// </summary>
    [HttpPut("{id}/publish")]
    [Authorize(Roles = "Registrar,ITAdmin")]
    public async Task<ActionResult<TranscriptResponseDto>> PublishTranscript(
        int id, CancellationToken cancellationToken)
    {
        var transcript = await _transcriptRepo.GetByIdAsync(id);
        if (transcript is null)
            return NotFound(new { error = "Transcript not found", code = "TRANSCRIPT_NOT_FOUND" });

        if (transcript.Status != TranscriptStatus.Draft)
            return BadRequest(new
            {
                error = $"Only Draft transcripts can be published (current status: {transcript.Status})",
                code = "INVALID_TRANSCRIPT_STATUS"
            });

        transcript.Status = TranscriptStatus.Issued;
        transcript.IssuedAt = DateTime.UtcNow;

        var updated = await _transcriptRepo.UpdateAsync(transcript);

        var student = await _studentRepo.GetByIdAsync(transcript.StudentID);
        var program = await _programRepo.GetByIdAsync(student!.ProgramID);

        return Ok(MapToDto(updated, student, program?.Name ?? "Unknown"));
    }

    private static TranscriptResponseDto MapToDto(Transcript t, Student s, string programName) => new()
    {
        TranscriptID = t.TranscriptID,
        StudentID = t.StudentID,
        StudentName = s.Name,
        MRN = s.MRN,
        ProgramName = programName,
        IssuedAt = t.IssuedAt,
        EntriesJSON = t.EntriesJSON,
        GPA = t.GPA,
        Status = t.Status,
        TranscriptURI = t.TranscriptURI
    };
}
