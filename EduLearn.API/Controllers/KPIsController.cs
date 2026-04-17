using EduLearn.API.DTOs;
using EduLearn.API.Models;
using EduLearn.API.Models.Enums;
using EduLearn.API.Repositories.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EduLearn.API.Controllers;

[ApiController]
[Route("api/kpis")]
public class KPIsController : ControllerBase
{
    private readonly IReportRepository _reportRepository;
    private readonly ILogger<KPIsController> _logger;

    public KPIsController(IReportRepository reportRepository, ILogger<KPIsController> logger)
    {
        _reportRepository = reportRepository;
        _logger = logger;
    }

    // ── GET /api/kpis — List all KPIs ──
    [HttpGet]
    [Authorize]
    public async Task<ActionResult<IEnumerable<KPIResponseDto>>> GetAllKPIs(CancellationToken ct)
    {
        var kpis = await _reportRepository.GetAllKPIsAsync(ct);
        return Ok(kpis.Select(MapToDto));
    }

    // ── POST /api/kpis/recalculate — Recalculate all KPI current values ──
    [HttpPost("recalculate")]
    [Authorize(Roles = "ITAdmin,Auditor")]
    public async Task<ActionResult<RecalculateResponseDto>> Recalculate(CancellationToken ct)
    {
        var recalculatedAt = DateTime.UtcNow;
        var updatedKpis = await _reportRepository.RecalculateAndSaveAsync(ct);
        var kpiList = updatedKpis.Select(MapToDto).ToList();

        _logger.LogInformation("KPI recalculation completed — {Count} KPIs updated", kpiList.Count);

        return Ok(new RecalculateResponseDto
        {
            RecalculatedAt = recalculatedAt,
            KPIsUpdated = kpiList.Count,
            KPIs = kpiList
        });
    }

    // ── POST /api/kpis/seed — Seed default KPI definitions (idempotent guard) ──
    [HttpPost("seed")]
    [Authorize(Roles = "ITAdmin")]
    public async Task<IActionResult> SeedKPIs(CancellationToken ct)
    {
        var alreadySeeded = await _reportRepository.AnyKPIsExistAsync(ct);

        if (alreadySeeded)
            return Conflict(new { error = "KPIs already seeded", code = "ALREADY_SEEDED" });

        var seedKpis = new List<KPI>
        {
            new() { Name = "Active Student Count",        Definition = "Total students with EnrollmentStatus = Active",                   ReportingPeriod = ReportingPeriod.Semester, Target = null },
            new() { Name = "Section Fill Rate",           Definition = "Average EnrolledCount / Capacity across all sections (as %)",     ReportingPeriod = ReportingPeriod.Semester, Target = 80.00m },
            new() { Name = "Assessment Published Rate",   Definition = "Published assessments / total assessments (as %)",                ReportingPeriod = ReportingPeriod.Semester, Target = 90.00m },
            new() { Name = "Enrollment Waitlist Rate",    Definition = "Waitlisted enrollments / total enrollments (as %)",               ReportingPeriod = ReportingPeriod.Semester, Target = null }
        };

        await _reportRepository.SeedKPIsAsync(seedKpis, ct);
        _logger.LogInformation("KPI seed completed — {Count} KPIs inserted", seedKpis.Count);

        return Ok(new { message = "KPIs seeded successfully", count = seedKpis.Count });
    }

    private static KPIResponseDto MapToDto(KPI k) => new()
    {
        KPIID = k.KPIID,
        Name = k.Name,
        Definition = k.Definition,
        Target = k.Target,
        CurrentValue = k.CurrentValue,
        ReportingPeriod = k.ReportingPeriod
    };
}
