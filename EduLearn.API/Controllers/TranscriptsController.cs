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

    public TranscriptsController(
        ITranscriptRepository transcriptRepo,
        IStudentRepository studentRepo,
        IEnrollmentRepository enrollRepo,
        IProgramRepository programRepo)
    {
        _transcriptRepo = transcriptRepo;
        _studentRepo = studentRepo;
        _enrollRepo = enrollRepo;
        _programRepo = programRepo;
    }

    // POST /api/transcripts/generate/{studentId} — Generate transcript from enrollment data
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

        // Build transcript entries from enrollment data
        var entries = enrollments.Select(e => new
        {
            courseName = e.Section.Course.Title,
            courseCode = e.Section.Course.Code,
            credits = e.Section.Course.Credits,
            term = e.Section.Term,
            status = e.Status.ToString(),
            gradePosted = e.GradePostedFlag,
            enrolledAt = e.EnrolledAt
        }).ToList();

        // Calculate GPA placeholder — only count completed (graded) enrollments
        // In a full system, grades would come from Submissions. For now, track enrolled count.
        var completedCount = entries.Count(e => e.gradePosted);
        var totalCredits = entries.Where(e => e.status == "Enrolled").Sum(e => e.credits);

        var transcript = new Transcript
        {
            StudentID = studentId,
            EntriesJSON = JsonSerializer.Serialize(entries),
            GPA = null, // Will be calculated when grades are posted
            Status = TranscriptStatus.Draft
        };

        var created = await _transcriptRepo.CreateAsync(transcript);

        return CreatedAtAction(nameof(GetTranscript),
            new { id = created.TranscriptID },
            MapToDto(created, student, program?.Name ?? "Unknown"));
    }

    // GET /api/transcripts/student/{studentId} — Get all transcripts for a student
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
