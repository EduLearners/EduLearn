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
    private readonly IProgramRepository _programRepository;

    public FeesController(
        IFeeScheduleRepository feeScheduleRepository,
        IProgramRepository programRepository)
    {
        _feeScheduleRepository = feeScheduleRepository;
        _programRepository = programRepository;
    }

    // ── POST /api/fees — SFB-01: Create fee schedule ──
    [HttpPost]
    [Authorize(Policy = "FinancePolicy")]   // HARDENING (C-1.D): PRD requires Finance role
    public async Task<ActionResult<FeeScheduleResponseDto>> Create(CreateFeeScheduleDto dto, CancellationToken ct)
    {
        // HARDENING (M-12): validate ProgramID existence → 400 with code, not DbUpdateException 500.
        if (!await _programRepository.ExistsAsync(dto.ProgramID))
            return BadRequest(new { error = "Program not found", code = "PROGRAM_NOT_FOUND" });

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
    [Authorize(Policy = "FinancePolicy")]   // HARDENING (C-1.D)
    public async Task<ActionResult<FeeScheduleResponseDto>> GetByProgramAndTerm(int programId, string term, CancellationToken ct)
    {
        var fee = await _feeScheduleRepository.GetByProgramAndTermAsync(programId, term, ct);

        if (fee is null)
            return NotFound(new { error = "Fee schedule not found", code = "FEE_SCHEDULE_NOT_FOUND" });

        return Ok(MapToDto(fee));
    }

    // ── PUT /api/fees/{id} — SFB-01: Update fee schedule ──
    [HttpPut("{id}")]
    [Authorize(Policy = "FinancePolicy")]   // HARDENING (C-1.D)
    public async Task<ActionResult<FeeScheduleResponseDto>> Update(int id, UpdateFeeScheduleDto dto, CancellationToken ct)
    {
        var existing = await _feeScheduleRepository.GetByIdAsync(id, ct);

        if (existing is null)
            return NotFound(new { error = "Fee schedule not found", code = "FEE_SCHEDULE_NOT_FOUND" });

        if (dto.EffectiveFrom >= dto.EffectiveTo)
            return BadRequest(new { error = "EffectiveFrom must be before EffectiveTo", code = "INVALID_DATE_RANGE" });

        // HARDENING (M-14): block state regressions. Superseded schedules are terminal —
        // once replaced, they cannot be flipped back to Draft/Active (would re-enable billing).
        if (existing.Status == FeeScheduleStatus.Superseded && dto.Status != FeeScheduleStatus.Superseded)
            return BadRequest(new { error = "Superseded fee schedules cannot be revived", code = "INVALID_STATUS_TRANSITION" });

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
