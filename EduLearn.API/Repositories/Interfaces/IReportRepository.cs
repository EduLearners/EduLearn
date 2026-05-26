using EduLearn.API.DTOs;
using EduLearn.API.Models;

namespace EduLearn.API.Repositories.Interfaces;

public interface IReportRepository
{
    // --- Report methods ---
    Task<Report> CreateReportAsync(Report report, CancellationToken ct);
    Task<IEnumerable<Report>> GetAllReportsAsync(CancellationToken ct);
    Task<Report?> GetReportByIdAsync(int id, CancellationToken ct);

    // --- KPI methods ---
    Task<IEnumerable<KPI>> GetAllKPIsAsync(CancellationToken ct);
    Task<bool> AnyKPIsExistAsync(CancellationToken ct);
    Task SeedKPIsAsync(IEnumerable<KPI> kpis, CancellationToken ct);
    Task<List<KpiRecalcResultDto>> RecalculateKpisAsync(CancellationToken ct);

    // --- AuditPackage methods ---
    Task<AuditPackage> CreateAuditPackageAsync(AuditPackage package, CancellationToken ct);
    Task<AuditPackage?> GetAuditPackageByIdAsync(int id, CancellationToken ct);
}
