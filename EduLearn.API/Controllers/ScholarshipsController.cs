using EduLearn.API.DTOs;
using EduLearn.API.Models;
using EduLearn.API.Models.Enums;
using EduLearn.API.Repositories.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EduLearn.API.Controllers;

[ApiController]
[Route("api/scholarships")]
public class ScholarshipsController : ControllerBase
{
    private readonly IScholarshipRepository _scholarshipRepository;

    public ScholarshipsController(IScholarshipRepository scholarshipRepository)
    {
        _scholarshipRepository = scholarshipRepository;
    }

    // ── POST /api/scholarships — SFB-04: Award scholarship ──
    [HttpPost]
    [Authorize]
    public async Task<ActionResult<ScholarshipResponseDto>> Create(CreateScholarshipDto dto, CancellationToken ct)
    {
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

        return CreatedAtAction(nameof(GetByStudent), new { studentId = created.StudentID }, MapToDto(created));
    }

    // ── GET /api/scholarships/student/{studentId} — SFB-04: List scholarships for student ──
    [HttpGet("student/{studentId}")]
    [ActionName("GetByStudent")]
    [Authorize]
    public async Task<ActionResult<IEnumerable<ScholarshipResponseDto>>> GetByStudent(int studentId, CancellationToken ct)
    {
        var scholarships = await _scholarshipRepository.GetByStudentIdAsync(studentId, ct);

        return Ok(scholarships.Select(MapToDto));
    }

    // ── PUT /api/scholarships/{id} — SFB-04: Update/revoke scholarship ──
    [HttpPut("{id}")]
    [Authorize]
    public async Task<ActionResult<ScholarshipResponseDto>> Update(int id, UpdateScholarshipDto dto, CancellationToken ct)
    {
        var existing = await _scholarshipRepository.GetByIdAsync(id, ct);

        if (existing is null)
            return NotFound(new { error = "Scholarship not found", code = "SCHOLARSHIP_NOT_FOUND" });

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
