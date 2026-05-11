using EduLearn.API.DTOs;
using EduLearn.API.Models;
using EduLearn.API.Models.Enums;
using EduLearn.API.Repositories.Interfaces;
using EduLearn.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EduLearn.API.Controllers;

[ApiController]
[Route("api/scholarships")]
[Authorize]
public class ScholarshipsController : ControllerBase
{
    private readonly IScholarshipRepository _scholarshipRepository;
    private readonly IStudentRepository _studentRepository;
    // NHT-01 CHANGE (interim-polish): notify the student when a scholarship is awarded.
    private readonly INotificationService _notificationService;

    public ScholarshipsController(
        IScholarshipRepository scholarshipRepository,
        IStudentRepository studentRepository,
        INotificationService notificationService)
    {
        _scholarshipRepository = scholarshipRepository;
        _studentRepository = studentRepository;
        _notificationService = notificationService;
    }

    // ── POST /api/scholarships — SFB-04: Award scholarship ──
    /// <summary>
    /// Award a scholarship to a student and notify them. Finance / ITAdmin only.
    /// Validates student existence, positive amount, and a valid date range before creating.
    /// </summary>
    [HttpPost]
    [Authorize(Policy = "FinancePolicy")]   // HARDENING (C-1.A): PRD requires Finance role
    public async Task<ActionResult<ScholarshipResponseDto>> Create(CreateScholarshipDto dto, CancellationToken ct)
    {
        // HARDENING (M-12): validate StudentID existence → 400 with code, not DbUpdateException 500.
        if (!await _studentRepository.ExistsAsync(dto.StudentID))
            return BadRequest(new { error = "Student not found", code = "STUDENT_NOT_FOUND" });

        if (dto.ValidFrom >= dto.ValidTo)
            return BadRequest(new { error = "ValidFrom must be before ValidTo", code = "INVALID_DATE_RANGE" });

        if (dto.Amount <= 0)
            return BadRequest(new { error = "Amount must be positive", code = "INVALID_AMOUNT" });

        var scholarship = new Scholarship
        {
            StudentID = dto.StudentID,
            AwardType = dto.AwardType,
            Amount = Math.Round(dto.Amount, 2),
            ValidFrom = dto.ValidFrom.Date,
            ValidTo = dto.ValidTo.Date,
            Status = ScholarshipStatus.Active
        };

        var created = await _scholarshipRepository.CreateAsync(scholarship, ct);

        // NHT-01 CHANGE (interim-polish): notify the student that a scholarship has been awarded.
        // Re-fetch student to obtain UserID (ExistsAsync above only returned a bool).
        var student = await _studentRepository.GetByIdAsync(created.StudentID);
        if (student is not null)
        {
            await _notificationService.NotifyAsync(
                student.UserID,
                NotificationCategory.Finance,
                NotificationSeverity.Info,
                $"Scholarship awarded: {created.AwardType} (${created.Amount:0.00}) valid {created.ValidFrom:yyyy-MM-dd} to {created.ValidTo:yyyy-MM-dd}.",
                created.ScholarID);
        }

        return CreatedAtAction(nameof(GetByStudent), new { studentId = created.StudentID }, MapToDto(created));
    }

    // ── GET /api/scholarships/student/{studentId} — SFB-04: List scholarships for student ──
    /// <summary>
    /// List all scholarships awarded to a given student. Finance / ITAdmin only.
    /// </summary>
    [HttpGet("student/{studentId}")]
    [ActionName("GetByStudent")]
    [Authorize(Policy = "FinancePolicy")]   // HARDENING (C-1.A)
    public async Task<ActionResult<IEnumerable<ScholarshipResponseDto>>> GetByStudent(int studentId, CancellationToken ct)
    {
        var scholarships = await _scholarshipRepository.GetByStudentIdAsync(studentId, ct);

        return Ok(scholarships.Select(MapToDto));
    }

    // ── PUT /api/scholarships/{id} — SFB-04: Update/revoke scholarship ──
    /// <summary>
    /// Update or revoke a scholarship's status. Finance / ITAdmin only.
    /// Revoked scholarships cannot be reactivated; attempting to do so returns 400.
    /// </summary>
    [HttpPut("{id}")]
    [Authorize(Policy = "FinancePolicy")]   // HARDENING (C-1.A)
    public async Task<ActionResult<ScholarshipResponseDto>> Update(int id, UpdateScholarshipDto dto, CancellationToken ct)
    {
        var existing = await _scholarshipRepository.GetByIdAsync(id, ct);

        if (existing is null)
            return NotFound(new { error = "Scholarship not found", code = "SCHOLARSHIP_NOT_FOUND" });

        // HARDENING (M-13): Revoked is terminal — cannot be reactivated/expired.
        if (existing.Status == ScholarshipStatus.Revoked && dto.Status != ScholarshipStatus.Revoked)
            return BadRequest(new { error = "Revoked scholarships cannot be re-activated", code = "INVALID_STATUS_TRANSITION" });

        existing.Status = dto.Status;

        var updated = await _scholarshipRepository.UpdateAsync(existing, ct);

        return Ok(MapToDto(updated));
    }

    private static ScholarshipResponseDto MapToDto(Scholarship s) => new()
    {
        ScholarID = s.ScholarID,
        StudentID = s.StudentID,
        StudentName = s.Student?.Name ?? string.Empty,
        AwardType = s.AwardType,
        Amount = s.Amount,
        AppliedAt = s.AppliedAt,
        ValidFrom = s.ValidFrom,
        ValidTo = s.ValidTo,
        Status = s.Status
    };
}
