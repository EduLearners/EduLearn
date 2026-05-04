using EduLearn.API.Data;
using EduLearn.API.Models;
using EduLearn.API.Models.Enums;
using EduLearn.API.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace EduLearn.API.Repositories.Implementations;

public class ReportRepository : IReportRepository
{
    private readonly AppDbContext _context;

    public ReportRepository(AppDbContext context) => _context = context;

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

    public async Task<IEnumerable<KPI>> RecalculateAndSaveAsync(CancellationToken ct)
    {
        // Load with tracking so EF Core detects and persists the changes
        var kpis = await _context.KPIs.ToListAsync(ct);

        foreach (var kpi in kpis)
        {
            kpi.CurrentValue = kpi.Name switch
            {
                "Active Student Count" =>
                    (decimal)await _context.Students
                        .AsNoTracking()
                        .CountAsync(s => s.EnrollmentStatus == StudentLifecycleStatus.Active, ct),

                "Section Fill Rate" => await ComputeSectionFillRateAsync(ct),

                "Assessment Published Rate" => await ComputeAssessmentPublishedRateAsync(ct),

                "Enrollment Waitlist Rate" => await ComputeEnrollmentWaitlistRateAsync(ct),

                _ => kpi.CurrentValue   // leave unchanged for unknown KPI names
            };
        }

        // Single SaveChangesAsync for all updates
        await _context.SaveChangesAsync(ct);

        return kpis;
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
        var sections = await _context.Sections.AsNoTracking().ToListAsync(ct);
        if (!sections.Any()) return 0m;
        return Math.Round(
            sections.Average(s => s.Capacity == 0 ? 0m : (decimal)s.EnrolledCount / s.Capacity * 100m),
            2);
    }

    private async Task<decimal> ComputeAssessmentPublishedRateAsync(CancellationToken ct)
    {
        var total     = await _context.Assessments.AsNoTracking().CountAsync(ct);
        var published = await _context.Assessments.AsNoTracking()
                            .CountAsync(a => a.Status == AssessmentStatus.Published, ct);
        return total == 0 ? 0m : Math.Round((decimal)published / total * 100m, 2);
    }

    private async Task<decimal> ComputeEnrollmentWaitlistRateAsync(CancellationToken ct)
    {
        var total     = await _context.Enrollments.AsNoTracking().CountAsync(ct);
        var waitlisted = await _context.Enrollments.AsNoTracking()
                             .CountAsync(e => e.Status == EnrollmentStatus.Waitlisted, ct);
        return total == 0 ? 0m : Math.Round((decimal)waitlisted / total * 100m, 2);
    }
}
