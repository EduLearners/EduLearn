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

    // POST /api/transcripts/generate/{studentId}
    /// <summary>
    /// Generate a new transcript draft for the given student. Registrar and ITAdmin only.
    /// CGPA is credit-weighted and only shown when ALL graded courses are passed.
    /// If any course has grade F → CGPA is withheld and Remark = "XP".
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

        var enrollments = await _enrollRepo.GetByStudentIdAsync(studentId);
        var submissions = await _submissionRepo.GetByStudentIdWithDetailsAsync(studentId);

        // Helper: letter grade from percentage
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

        // Helper: GPA points from percentage (10-point scale)
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

        // R-4: only Enrolled entries appear on official transcripts
        var entries = enrollments
            .Where(e => e.Status == EnrollmentStatus.Enrolled)
            .Select(e =>
            {
                var courseSubmissions = submissions
                    .Where(s =>
                        s.Assessment.SectionID == e.SectionID &&
                        s.Score.HasValue &&
                        s.Assessment.MaxScore > 0)
                    .ToList();

                decimal? percentage  = null;
                decimal? score       = null;
                decimal? maxScore    = null;
                string?  letterGrade = null;
                bool     gradePosted = e.GradePostedFlag;

                if (courseSubmissions.Any())
                {
                    var best = courseSubmissions
                        .OrderByDescending(s => s.Score!.Value / s.Assessment.MaxScore)
                        .First();
                    score       = best.Score;
                    maxScore    = best.Assessment.MaxScore;
                    percentage  = Math.Round(best.Score!.Value / best.Assessment.MaxScore * 100m, 2);
                    letterGrade = ToLetterGrade(percentage.Value);
                    gradePosted = true;
                }

                return new
                {
                    courseName   = e.Section.Course.Title,
                    courseCode   = e.Section.Course.Code,
                    credits      = e.Section.Course.Credits,
                    term         = e.Section.Term,
                    status       = e.Status.ToString(),
                    gradePosted,
                    enrolledAt   = e.EnrolledAt,
                    score,
                    maxScore,
                    percentage,
                    letterGrade
                };
            }).ToList();

        // Graded entries = entries that have a percentage value
        var gradedEntries = entries.Where(e => e.percentage.HasValue).ToList();

        // R-5: CGPA + Remark logic
        // Policy: CGPA shown only if ALL graded courses are passed (no F grade)
        // Any F → CGPA withheld, Remark = "XP"
        // No graded courses yet → CGPA null, Remark null (Result Awaited)
        decimal? gpa;
        if (!gradedEntries.Any())
        {
            // No grades recorded yet
            gpa = null;
        }
        else if (gradedEntries.Any(e => e.letterGrade == "F"))
        {
            // At least one failed course → withhold CGPA
            gpa = null;
        }
        else
        {
            // All graded courses passed → credit-weighted CGPA
            // Correct formula: Σ(GPA points × credits) / Σ(credits)
            var totalWeightedPoints = gradedEntries
                .Sum(e => ToGpaPoints(e.percentage!.Value) * e.credits);
            var totalCredits = gradedEntries.Sum(e => e.credits);
            gpa = totalCredits > 0
                ? Math.Round(totalWeightedPoints / totalCredits, 2)
                : (decimal?)null;
        }

        var transcript = new Transcript
        {
            StudentID    = studentId,
            EntriesJSON  = JsonSerializer.Serialize(entries),
            GPA          = gpa,
            Status       = TranscriptStatus.Draft
        };

        var created = await _transcriptRepo.CreateAsync(transcript);

        return CreatedAtAction(nameof(GetTranscript),
            new { id = created.TranscriptID },
            MapToDto(created, student, program?.Name ?? "Unknown"));
    }

    // GET /api/transcripts/student/{studentId}
    /// <summary>
    /// List all transcripts for a given student.
    /// Students may only view their own; Registrar and ITAdmin may view any.
    /// </summary>
    [HttpGet("student/{studentId}")]
    [Authorize(Policy = "TranscriptReadPolicy")]
    public async Task<ActionResult<IEnumerable<TranscriptResponseDto>>> GetByStudent(
        int studentId, CancellationToken cancellationToken)
    {
        var callerRole = User.FindFirst(ClaimTypes.Role)?.Value ?? string.Empty;
        var allowedRoles = new[] { "Registrar", "ITAdmin", "Student" };
        if (!allowedRoles.Contains(callerRole))
            return StatusCode(403, new { error = "Access denied", code = "TRANSCRIPT_POLICY_DENIED" });

        var student = await _studentRepo.GetByIdAsync(studentId);
        if (student is null)
            return NotFound(new { error = "Student not found", code = "STUDENT_NOT_FOUND" });

        if (!int.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var callerId))
            return Unauthorized(new { error = "Your session is invalid.", code = "INVALID_TOKEN" });

        if (callerRole == "Student" && student.UserID != callerId)
            return StatusCode(403, new { error = "You may only view your own transcripts", code = "TRANSCRIPT_FORBIDDEN" });

        var program    = await _programRepo.GetByIdAsync(student.ProgramID);
        var transcripts = await _transcriptRepo.GetByStudentIdAsync(studentId);

        return Ok(transcripts.Select(t => MapToDto(t, student, program?.Name ?? "Unknown")));
    }

    // GET /api/transcripts/{id}
    /// <summary>Retrieve a single transcript by ID.</summary>
    [HttpGet("{id}")]
    [Authorize(Policy = "TranscriptReadPolicy")]
    public async Task<ActionResult<TranscriptResponseDto>> GetTranscript(
        int id, CancellationToken cancellationToken)
    {
        var callerRole = User.FindFirst(ClaimTypes.Role)?.Value ?? string.Empty;
        var allowedRoles = new[] { "Registrar", "ITAdmin", "Student" };
        if (!allowedRoles.Contains(callerRole))
            return StatusCode(403, new { error = "Access denied", code = "TRANSCRIPT_POLICY_DENIED" });

        var transcript = await _transcriptRepo.GetByIdAsync(id);
        if (transcript is null)
            return NotFound(new { error = "Transcript not found", code = "TRANSCRIPT_NOT_FOUND" });

        var student = await _studentRepo.GetByIdAsync(transcript.StudentID);
        if (student is null)
            return NotFound(new { error = "Student not found", code = "STUDENT_NOT_FOUND" });

        if (!int.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var callerId))
            return Unauthorized(new { error = "Your session is invalid.", code = "INVALID_TOKEN" });

        if (callerRole == "Student" && student.UserID != callerId)
            return StatusCode(403, new { error = "You may only view your own transcripts", code = "TRANSCRIPT_FORBIDDEN" });

        var program = await _programRepo.GetByIdAsync(student.ProgramID);
        return Ok(MapToDto(transcript, student, program?.Name ?? "Unknown"));
    }

    // PUT /api/transcripts/{id}/publish
    /// <summary>Promote a Draft transcript to Issued status. Registrar and ITAdmin only.</summary>
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
                error = $"Only Draft transcripts can be published (current: {transcript.Status})",
                code  = "INVALID_TRANSCRIPT_STATUS"
            });

        transcript.Status   = TranscriptStatus.Issued;
        transcript.IssuedAt = DateTime.UtcNow;

        var updated = await _transcriptRepo.UpdateAsync(transcript);
        var student = await _studentRepo.GetByIdAsync(transcript.StudentID);
        var program = await _programRepo.GetByIdAsync(student!.ProgramID);

        return Ok(MapToDto(updated, student, program?.Name ?? "Unknown"));
    }

    // GET /api/transcripts/{id}/pdf
    /// <summary>Download an Issued transcript as a PDF. Only Issued transcripts can be downloaded.</summary>
    [HttpGet("{id}/pdf")]
    public async Task<IActionResult> DownloadPdf(int id, CancellationToken cancellationToken)
    {
        var transcript = await _transcriptRepo.GetByIdAsync(id);
        if (transcript is null)
            return NotFound(new { error = "Transcript not found", code = "TRANSCRIPT_NOT_FOUND" });

        if (transcript.Status != TranscriptStatus.Issued)
            return BadRequest(new
            {
                error = $"Only Issued transcripts can be downloaded (current: {transcript.Status})",
                code  = "TRANSCRIPT_NOT_ISSUED"
            });

        var student = await _studentRepo.GetByIdAsync(transcript.StudentID);
        if (student is null)
            return NotFound(new { error = "Student not found", code = "STUDENT_NOT_FOUND" });

        var callerRole = User.FindFirst(ClaimTypes.Role)?.Value ?? string.Empty;
        if (!int.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var callerId))
            return Unauthorized(new { error = "Your session is invalid.", code = "INVALID_TOKEN" });
        if (callerRole == "Student" && student.UserID != callerId)
            return StatusCode(403, new { error = "You may only download your own transcript", code = "TRANSCRIPT_FORBIDDEN" });

        var program = await _programRepo.GetByIdAsync(student.ProgramID);

        var entries = JsonSerializer.Deserialize<List<TranscriptEntryRow>>(
            transcript.EntriesJSON,
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true })
            ?? new List<TranscriptEntryRow>();

        var pdfData = new TranscriptPdfData
        {
            StudentName = student.Name,
            MRN         = student.MRN,
            ProgramName = program?.Name ?? "Unknown",
            GPA         = transcript.GPA,
            Remark      = ComputeRemark(transcript.EntriesJSON),
            IssuedAt    = transcript.IssuedAt,
            Status      = transcript.Status.ToString(),
            Entries     = entries
        };

        var doc      = new TranscriptPdfDocument(pdfData);
        var pdfBytes = doc.ToPdfBytes();
        var filename = $"Transcript_{student.MRN}_{DateTime.UtcNow:yyyyMMdd}.pdf";
        return File(pdfBytes, "application/pdf", filename);
    }

    // ── Helpers ─────────────────────────────────────────────────

    /// <summary>
    /// Computes the Remark from stored EntriesJSON.
    /// "PASS" = all graded courses passed, "XP" = at least one F, null = no grades yet.
    /// </summary>
    private static string? ComputeRemark(string? entriesJson)
    {
        if (string.IsNullOrEmpty(entriesJson)) return null;
        try
        {
            using var doc     = JsonDocument.Parse(entriesJson);
            var allEntries    = doc.RootElement.EnumerateArray().ToList();

            var gradedEntries = allEntries.Where(e =>
            {
                if (e.TryGetProperty("percentage", out var p))
                    return p.ValueKind != JsonValueKind.Null;
                return false;
            }).ToList();

            if (!gradedEntries.Any()) return null; // Result Awaited

            var hasF = gradedEntries.Any(e =>
                e.TryGetProperty("letterGrade", out var g) &&
                g.ValueKind != JsonValueKind.Null &&
                g.GetString() == "F");

            return hasF ? "XP" : "PASS";
        }
        catch { return null; }
    }

    private static TranscriptResponseDto MapToDto(Transcript t, Student s, string programName) => new()
    {
        TranscriptID  = t.TranscriptID,
        StudentID     = t.StudentID,
        StudentName   = s.Name,
        MRN           = s.MRN,
        ProgramName   = programName,
        IssuedAt      = t.IssuedAt,
        EntriesJSON   = t.EntriesJSON,
        GPA           = t.GPA,
        Remark        = ComputeRemark(t.EntriesJSON),
        Status        = t.Status,
        TranscriptURI = t.TranscriptURI
    };
}
