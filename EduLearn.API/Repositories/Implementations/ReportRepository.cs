using EduLearn.API.Data;
using EduLearn.API.DTOs;
using EduLearn.API.Models;
using EduLearn.API.Models.Enums;
using EduLearn.API.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace EduLearn.API.Repositories.Implementations;

public class ReportRepository : IReportRepository
{
    private readonly AppDbContext _context;
    private readonly ILogger<ReportRepository> _logger;

    public ReportRepository(AppDbContext context, ILogger<ReportRepository> logger)
    {
        _context = context;
        _logger = logger;
    }

    // ── Report methods ─────────────────────────────────────────────────────────

    public async Task<Report> CreateReportAsync(Report report, CancellationToken ct)
    {
        // Compute MetricsJSON based on the report's Scope
        report.MetricsJSON = report.Scope switch
        {
            ReportScope.Course => JsonSerializer.Serialize(new
            {
                totalAssessments = await _context.Assessments.AsNoTracking().CountAsync(ct),
                published        = await _context.Assessments.AsNoTracking()
                                       .CountAsync(a => a.Status == AssessmentStatus.Published, ct)
            }),

            ReportScope.Department => JsonSerializer.Serialize(new
            {
                totalSections = await _context.Sections.AsNoTracking().CountAsync(ct)
            }),

            ReportScope.Institution => JsonSerializer.Serialize(new
            {
                totalStudents      = await _context.Students.AsNoTracking().CountAsync(ct),
                activeEnrollments  = await _context.Enrollments.AsNoTracking()
                                         .CountAsync(e => e.Status == EnrollmentStatus.Enrolled, ct)
            }),

            ReportScope.Student => JsonSerializer.Serialize(new
            {
                totalEnrollments = await _context.Enrollments.AsNoTracking().CountAsync(ct)
            }),

            ReportScope.Enrollment => JsonSerializer.Serialize(new
            {
                totalEnrollments  = await _context.Enrollments.AsNoTracking().CountAsync(ct),
                activeEnrollments = await _context.Enrollments.AsNoTracking()
                                        .CountAsync(e => e.Status == EnrollmentStatus.Enrolled, ct),
                waitlisted        = await _context.Enrollments.AsNoTracking()
                                        .CountAsync(e => e.Status == EnrollmentStatus.Waitlisted, ct)
            }),

            _ => JsonSerializer.Serialize(new { })
        };

        _context.Reports.Add(report);
        await _context.SaveChangesAsync(ct);

        // Reload navigation so the caller gets GeneratedBy populated
        await _context.Entry(report).Reference(r => r.GeneratedBy).LoadAsync(ct);

        return report;
    }

    public async Task<IEnumerable<Report>> GetAllReportsAsync(CancellationToken ct)
        => await _context.Reports
            .AsNoTracking()
            .Include(r => r.GeneratedBy)
            .ToListAsync(ct);

    public async Task<Report?> GetReportByIdAsync(int id, CancellationToken ct)
        => await _context.Reports
            .AsNoTracking()
            .Include(r => r.GeneratedBy)
            .FirstOrDefaultAsync(r => r.ReportID == id, ct);

    // ── KPI methods ────────────────────────────────────────────────────────────

    public async Task<IEnumerable<KPI>> GetAllKPIsAsync(CancellationToken ct)
        => await _context.KPIs.AsNoTracking().ToListAsync(ct);

    public async Task<bool> AnyKPIsExistAsync(CancellationToken ct)
        => await _context.KPIs.AsNoTracking().AnyAsync(ct);

    public async Task SeedKPIsAsync(IEnumerable<KPI> kpis, CancellationToken ct)
    {
        _context.KPIs.AddRange(kpis);
        await _context.SaveChangesAsync(ct);
    }

    public async Task<List<KpiRecalcResultDto>> RecalculateKpisAsync(CancellationToken ct)
    {
        var kpis = await _context.KPIs.ToListAsync(ct);
        var results = new List<KpiRecalcResultDto>();

        foreach (var kpi in kpis)
        {
            var old = kpi.CurrentValue;
            decimal? next = kpi.ComputationKey switch
            {
                KpiComputationKey.ActiveStudentCount       => (decimal)await _context.Students.CountAsync(s => s.EnrollmentStatus == StudentLifecycleStatus.Active, ct),
                KpiComputationKey.SectionFillRate          => await ComputeSectionFillRateAsync(ct),
                KpiComputationKey.InvoiceCollectionRate    => await ComputeCollectionRateAsync(ct),
                KpiComputationKey.AssessmentCompletionRate => await ComputeAssessmentCompletionAsync(ct),
                _ => null
            };

            var changed = next.HasValue && next.Value != old;
            if (next.HasValue)
            {
                kpi.CurrentValue = next.Value;
            }
            else
            {
                _logger.LogWarning("KPI {Id} '{Name}' has no recognized ComputationKey ({Key}) — skipping",
                    kpi.KPIID, kpi.Name, kpi.ComputationKey);
            }

            results.Add(new KpiRecalcResultDto(kpi.KPIID, kpi.Name, old, next, changed));
        }

        await _context.SaveChangesAsync(ct);
        return results;
    }

    // ── AuditPackage methods ───────────────────────────────────────────────────

    public async Task<AuditPackage> CreateAuditPackageAsync(AuditPackage package, CancellationToken ct)
    {
        _context.AuditPackages.Add(package);
        await _context.SaveChangesAsync(ct);
        return package;
    }

    public async Task<AuditPackage?> GetAuditPackageByIdAsync(int id, CancellationToken ct)
        => await _context.AuditPackages
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.PackageID == id, ct);

    // ── Private helpers ────────────────────────────────────────────────────────

    private async Task<decimal> ComputeSectionFillRateAsync(CancellationToken ct)
    {
        var sections = await _context.Sections.Select(s => new { s.Capacity, s.EnrolledCount }).ToListAsync(ct);
        if (sections.Count == 0) return 0m;
        var totalCap = sections.Sum(s => s.Capacity);
        return totalCap == 0 ? 0m : Math.Round((decimal)sections.Sum(s => s.EnrolledCount) / totalCap * 100m, 2);
    }

    private async Task<decimal> ComputeCollectionRateAsync(CancellationToken ct)
    {
        var totalInvoiced = await _context.Invoices.SumAsync(i => (decimal?)i.AmountDue, ct) ?? 0m;
        var totalPaid     = await _context.Payments.SumAsync(p => (decimal?)p.Amount, ct) ?? 0m;
        return totalInvoiced == 0 ? 0m : Math.Round(totalPaid / totalInvoiced * 100m, 2);
    }

    private async Task<decimal> ComputeAssessmentCompletionAsync(CancellationToken ct)
    {
        var pub  = await _context.Assessments.CountAsync(a => a.Status == AssessmentStatus.Published, ct);
        if (pub == 0) return 0m;
        var subs = await _context.Submissions.Select(s => s.AssessmentID).Distinct().CountAsync(ct);
        return Math.Round((decimal)subs / pub * 100m, 2);
    }
}
