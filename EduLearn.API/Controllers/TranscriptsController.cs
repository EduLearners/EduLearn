using EduLearn.API.DTOs;
using EduLearn.API.Models;
using EduLearn.API.Models.Enums;
using EduLearn.API.Repositories.Interfaces;
using EduLearn.API.Services;
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

        // Load all graded submissions for this student to look up grade per course
        var submissions = await _submissionRepo.GetByStudentIdWithDetailsAsync(studentId);

        // Helper: compute letter grade from percentage
        static string ToLetterGrade(decimal pct) => pct switch
        {
            >= 90m => "A+",
            >= 80m => "A",
            >= 70m => "B+",
            >= 60m => "B",
            >= 50m => "C",
            >= 45m => "D",
            >= 40m => "E",
            _      => "F"
        };

        // Helper: compute GPA points from percentage (10-point CGPA scale)
        static decimal ToGpaPoints(decimal pct) => pct switch
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

        // R-4: official transcripts must show only Enrolled entries
        var entries = enrollments
            .Where(e => e.Status == EnrollmentStatus.Enrolled)
            .Select(e =>
            {
                // Find the best graded submission for this course's section
                var courseSubmissions = submissions
                    .Where(s =>
                        s.Assessment.SectionID == e.SectionID &&
                        s.Score.HasValue &&
                        s.Assessment.MaxScore > 0)
                    .ToList();

                decimal? percentage = null;
                decimal? score = null;
                decimal? maxScore = null;
                string? letterGrade = null;
                bool gradePosted = e.GradePostedFlag;

                if (courseSubmissions.Any())
                {
                    // Use the best (highest) score among all graded submissions for this section
                    var best = courseSubmissions.OrderByDescending(s => s.Score!.Value / s.Assessment.MaxScore).First();
                    score = best.Score;
                    maxScore = best.Assessment.MaxScore;
                    percentage = Math.Round(best.Score!.Value / best.Assessment.MaxScore * 100m, 2);
                    letterGrade = ToLetterGrade(percentage.Value);
                    gradePosted = true;
                }

                return new
                {
                    courseName = e.Section.Course.Title,
                    courseCode = e.Section.Course.Code,
                    credits = e.Section.Course.Credits,
                    term = e.Section.Term,
                    status = e.Status.ToString(),
                    gradePosted,
                    enrolledAt = e.EnrolledAt,
                    score,
                    maxScore,
                    percentage,
                    letterGrade
                };
            }).ToList();

        var totalCredits = entries.Sum(e => e.credits);

        // R-5: CGPA from graded entries only
        var gradedEntries = entries.Where(e => e.percentage.HasValue).ToList();
        decimal? gpa = null;
        if (gradedEntries.Any())
        {
            var avgPercent = gradedEntries.Average(e => e.percentage!.Value);
            gpa = ToGpaPoints(avgPercent);
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
    [Authorize(Policy = "TranscriptViewPolicy")]
    public async Task<ActionResult<IEnumerable<TranscriptResponseDto>>> GetByStudent(
        int studentId, CancellationToken cancellationToken)
    {
        // phase4-fix-8: Runtime role guard mirrors TranscriptViewPolicy; Student allowed with ownership check.
        var callerRole = User.FindFirst(ClaimTypes.Role)?.Value ?? string.Empty;
        var allowedRoles = new[] { "Registrar", "ITAdmin", "Student" };
        if (!allowedRoles.Contains(callerRole))
            return StatusCode(403, new { error = "Access denied — registrar or admin role required", code = "TRANSCRIPT_POLICY_DENIED" });

        var student = await _studentRepo.GetByIdAsync(studentId);
        if (student is null)
            return NotFound(new { error = "Student not found", code = "STUDENT_NOT_FOUND" });

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
    [Authorize(Policy = "TranscriptViewPolicy")]
    public async Task<ActionResult<TranscriptResponseDto>> GetTranscript(
        int id, CancellationToken cancellationToken)
    {
        // phase4-fix-8: Runtime role guard mirrors TranscriptViewPolicy; Student allowed with ownership check.
        var callerRole = User.FindFirst(ClaimTypes.Role)?.Value ?? string.Empty;
        var allowedRoles = new[] { "Registrar", "ITAdmin", "Student" };
        if (!allowedRoles.Contains(callerRole))
            return StatusCode(403, new { error = "Access denied — registrar or admin role required", code = "TRANSCRIPT_POLICY_DENIED" });

        var transcript = await _transcriptRepo.GetByIdAsync(id);
        if (transcript is null)
            return NotFound(new { error = "Transcript not found", code = "TRANSCRIPT_NOT_FOUND" });

        var student = await _studentRepo.GetByIdAsync(transcript.StudentID);
        if (student is null)
            return NotFound(new { error = "Student not found", code = "STUDENT_NOT_FOUND" });

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

    // GET /api/transcripts/{id}/pdf — SRA-03: Download transcript as a formatted PDF
    /// <summary>
    /// Download an Issued transcript as a PDF file. Only Issued transcripts can be downloaded.
    /// Students may only download their own. Registrar and ITAdmin may download any.
    /// </summary>
    [HttpGet("{id}/pdf")]
    public async Task<IActionResult> DownloadPdf(int id, CancellationToken cancellationToken)
    {
        var transcript = await _transcriptRepo.GetByIdAsync(id);
        if (transcript is null)
            return NotFound(new { error = "Transcript not found", code = "TRANSCRIPT_NOT_FOUND" });

        // Only Issued transcripts can be downloaded as PDF
        if (transcript.Status != TranscriptStatus.Issued)
            return BadRequest(new
            {
                error = $"Only Issued transcripts can be downloaded as PDF (current status: {transcript.Status})",
                code = "TRANSCRIPT_NOT_ISSUED"
            });

        var student = await _studentRepo.GetByIdAsync(transcript.StudentID);
        if (student is null)
            return NotFound(new { error = "Student not found", code = "STUDENT_NOT_FOUND" });

        // Ownership check: students can only download their own transcript
        var callerRole = User.FindFirst(ClaimTypes.Role)?.Value ?? string.Empty;
        var callerId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
        if (callerRole == "Student" && student.UserID != callerId)
            return StatusCode(403, new { error = "You may only download your own transcript", code = "TRANSCRIPT_FORBIDDEN" });

        var program = await _programRepo.GetByIdAsync(student.ProgramID);

        // Deserialize the stored EntriesJSON back into typed rows
        var entries = JsonSerializer.Deserialize<List<TranscriptEntryRow>>(
            transcript.EntriesJSON,
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true })
            ?? new List<TranscriptEntryRow>();

        var pdfData = new TranscriptPdfData
        {
            StudentName = student.Name,
            MRN = student.MRN,
            ProgramName = program?.Name ?? "Unknown",
            GPA = transcript.GPA,
            IssuedAt = transcript.IssuedAt,
            Status = transcript.Status.ToString(),
            Entries = entries
        };

        // Generate PDF bytes in memory using QuestPDF
        var doc = new TranscriptPdfDocument(pdfData);
        var pdfBytes = doc.ToPdfBytes();

        var filename = $"Transcript_{student.MRN}_{DateTime.UtcNow:yyyyMMdd}.pdf";
        return File(pdfBytes, "application/pdf", filename);
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
