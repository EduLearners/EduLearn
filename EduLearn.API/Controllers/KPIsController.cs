using EduLearn.API.DTOs;
using EduLearn.API.Models;
using EduLearn.API.Models.Enums;
using EduLearn.API.Repositories.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EduLearn.API.Controllers;

[ApiController]
[Route("api/kpis")]
[Authorize]
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
    /// <summary>
    /// List all KPI definitions with their current calculated values. Auditor and ITAdmin only.
    /// </summary>
    [HttpGet]
    [Authorize(Roles = "Auditor,ITAdmin")]
    public async Task<ActionResult<IEnumerable<KPIResponseDto>>> GetAllKPIs(CancellationToken ct)
    {
        var kpis = await _reportRepository.GetAllKPIsAsync(ct);
        return Ok(kpis.Select(MapToDto));
    }

    // ── POST /api/kpis/recalculate — Recalculate all KPI current values ──
    /// <summary>
    /// Recalculate and persist the current values for all KPIs. ITAdmin only.
    /// Returns a per-KPI delta list showing old value, new value, and whether it changed.
    /// </summary>
    [HttpPost("recalculate")]
    [Authorize(Roles = "ITAdmin")]
    public async Task<ActionResult<List<KpiRecalcResultDto>>> Recalculate(CancellationToken ct)
    {
        var results = await _reportRepository.RecalculateKpisAsync(ct);
        var changedCount = results.Count(r => r.Changed);
        _logger.LogInformation("KPI recalc: {Changed}/{Total} changed", changedCount, results.Count);
        return Ok(results);
    }

    // ── POST /api/kpis/seed — Seed default KPI definitions (idempotent guard) ──
    /// <summary>
    /// Seed the default KPI definitions into the database. ITAdmin only.
    /// Returns 409 Conflict if KPIs have already been seeded.
    /// </summary>
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
