using EduLearn.API.DTOs;
using EduLearn.API.Models;
using EduLearn.API.Repositories.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EduLearn.API.Controllers;

[ApiController]
[Route("api/audit-packages")]
[Authorize]
public class AuditPackagesController : ControllerBase
{
    private readonly IReportRepository _reportRepository;
    private readonly ILogger<AuditPackagesController> _logger;

    public AuditPackagesController(IReportRepository reportRepository, ILogger<AuditPackagesController> logger)
    {
        _reportRepository = reportRepository;
        _logger = logger;
    }

    // ── POST /api/audit-packages/generate — Build an audit package for a date range ──
    [HttpPost("generate")]
    [Authorize(Roles = "Auditor,ITAdmin")]
    public async Task<ActionResult<AuditPackageResponseDto>> Generate(GenerateAuditPackageDto dto, CancellationToken ct)
    {
        if (dto.PeriodEnd < dto.PeriodStart)
            return BadRequest(new { error = "PeriodEnd must be after PeriodStart", code = "INVALID_DATE_RANGE" });

        // Gather reports that fall within the requested period
        var reports = (await _reportRepository.GetAllReportsAsync(ct))
            .Where(r => r.GeneratedAt.Date >= dto.PeriodStart.Date && r.GeneratedAt.Date <= dto.PeriodEnd.Date)
            .ToList();

        var contents = reports.Select(r => new
        {
            reportType  = r.Scope.ToString(),
            reportID    = r.ReportID,
            description = $"{r.Scope} report generated at {r.GeneratedAt:yyyy-MM-dd}"
        }).ToList();

        var contentsJson = System.Text.Json.JsonSerializer.Serialize(contents);

        var package = new AuditPackage
        {
            PeriodStart  = dto.PeriodStart.Date,
            PeriodEnd    = dto.PeriodEnd.Date,
            ContentsJSON = contentsJson
        };

        var created = await _reportRepository.CreateAuditPackageAsync(package, ct);
        _logger.LogInformation("Audit package {PackageID} generated — {Count} reports included", created.PackageID, reports.Count);

        return CreatedAtAction(nameof(Download), new { id = created.PackageID }, MapToDto(created));
    }

    // ── GET /api/audit-packages/{id}/download — Retrieve an audit package by ID ──
    [HttpGet("{id}/download")]
    [Authorize(Roles = "Auditor,ITAdmin")]
    public async Task<ActionResult<AuditPackageResponseDto>> Download(int id, CancellationToken ct)
    {
        var package = await _reportRepository.GetAuditPackageByIdAsync(id, ct);

        if (package is null)
            return NotFound(new { error = "Audit package not found", code = "AUDIT_PACKAGE_NOT_FOUND" });

        // TODO post-interim: package as ZIP archive, set PackageURI, return file

        return Ok(MapToDto(package));
    }

    private static AuditPackageResponseDto MapToDto(AuditPackage p) => new()
    {
        PackageID    = p.PackageID,
        PeriodStart  = p.PeriodStart,
        PeriodEnd    = p.PeriodEnd,
        ContentsJSON = p.ContentsJSON,
        GeneratedAt  = p.GeneratedAt,
        PackageURI   = p.PackageURI
    };
}
