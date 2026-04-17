using EduLearn.API.DTOs;
using EduLearn.API.Models;
using EduLearn.API.Models.Enums;
using EduLearn.API.Repositories.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EduLearn.API.Controllers;

[ApiController]
[Route("api/fees")]
public class FeesController : ControllerBase
{
    private readonly IFeeScheduleRepository _feeScheduleRepository;

    public FeesController(IFeeScheduleRepository feeScheduleRepository)
    {
        _feeScheduleRepository = feeScheduleRepository;
    }

    // ── POST /api/fees — SFB-01: Create fee schedule ──
    [HttpPost]
    [Authorize]
    public async Task<ActionResult<FeeScheduleResponseDto>> Create(CreateFeeScheduleDto dto, CancellationToken ct)
    {
        if (dto.EffectiveFrom >= dto.EffectiveTo)
            return BadRequest(new { error = "EffectiveFrom must be before EffectiveTo", code = "INVALID_DATE_RANGE" });

        var fee = new FeeSchedule
        {
            ProgramID = dto.ProgramID,
            Term = dto.Term,
            FeeItemsJSON = dto.FeeItemsJSON,
            EffectiveFrom = dto.EffectiveFrom.Date,
            EffectiveTo = dto.EffectiveTo.Date,
            Status = FeeScheduleStatus.Draft
        };

        var created = await _feeScheduleRepository.CreateAsync(fee, ct);

        return CreatedAtAction(nameof(GetByProgramAndTerm), new { programId = created.ProgramID, term = created.Term }, MapToDto(created));
    }

    // ── GET /api/fees/program/{programId}/term/{term} — SFB-01: Get fee schedule ──
    [HttpGet("program/{programId}/term/{term}")]
    [Authorize]
    public async Task<ActionResult<FeeScheduleResponseDto>> GetByProgramAndTerm(int programId, string term, CancellationToken ct)
    {
        var fee = await _feeScheduleRepository.GetByProgramAndTermAsync(programId, term, ct);

        if (fee is null)
            return NotFound(new { error = "Fee schedule not found", code = "FEE_SCHEDULE_NOT_FOUND" });

        return Ok(MapToDto(fee));
    }

    // ── PUT /api/fees/{id} — SFB-01: Update fee schedule ──
    [HttpPut("{id}")]
    [Authorize]
    public async Task<ActionResult<FeeScheduleResponseDto>> Update(int id, UpdateFeeScheduleDto dto, CancellationToken ct)
    {
        var existing = await _feeScheduleRepository.GetByIdAsync(id, ct);

        if (existing is null)
            return NotFound(new { error = "Fee schedule not found", code = "FEE_SCHEDULE_NOT_FOUND" });

        if (dto.EffectiveFrom >= dto.EffectiveTo)
            return BadRequest(new { error = "EffectiveFrom must be before EffectiveTo", code = "INVALID_DATE_RANGE" });

        existing.FeeItemsJSON = dto.FeeItemsJSON;
        existing.EffectiveFrom = dto.EffectiveFrom.Date;
        existing.EffectiveTo = dto.EffectiveTo.Date;
        existing.Status = dto.Status;

        var updated = await _feeScheduleRepository.UpdateAsync(existing, ct);

        return Ok(MapToDto(updated));
    }

    private static FeeScheduleResponseDto MapToDto(FeeSchedule f) => new()
    {
        FeeID = f.FeeID,
        ProgramID = f.ProgramID,
        ProgramName = f.Program?.Name ?? string.Empty,
        Term = f.Term,
        FeeItemsJSON = f.FeeItemsJSON,
        EffectiveFrom = f.EffectiveFrom,
        EffectiveTo = f.EffectiveTo,
        Status = f.Status
    };
}
