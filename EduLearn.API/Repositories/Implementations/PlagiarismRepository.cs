// AGI-04
using EduLearn.API.Data;
using EduLearn.API.Models;
using EduLearn.API.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace EduLearn.API.Repositories.Implementations;

public class PlagiarismRepository : IPlagiarismRepository
{
    private readonly AppDbContext _context;

    public PlagiarismRepository(AppDbContext context) => _context = context;

    public async Task<PlagiarismReport?> GetByIdAsync(int reportId, CancellationToken ct = default)
        => await _context.PlagiarismReports
            .Include(r => r.Submission)
                .ThenInclude(s => s.Assessment)
                    .ThenInclude(a => a.Course)
            .Include(r => r.Submission)
                .ThenInclude(s => s.Student)
            .Include(r => r.FlaggedBy)
            .FirstOrDefaultAsync(r => r.ReportID == reportId, ct);

    public async Task<IEnumerable<PlagiarismReport>> GetBySubmissionIdAsync(int submissionId, CancellationToken ct = default)
        => await _context.PlagiarismReports
            .Include(r => r.Submission)
                .ThenInclude(s => s.Assessment)
                    .ThenInclude(a => a.Course)
            .Include(r => r.Submission)
                .ThenInclude(s => s.Student)
            .Include(r => r.FlaggedBy)
            .Where(r => r.SubmissionID == submissionId)
            .OrderByDescending(r => r.FlaggedAt)
            .ToListAsync(ct);

    public async Task<IEnumerable<PlagiarismReport>> GetByStudentIdAsync(int studentId, CancellationToken ct = default)
        => await _context.PlagiarismReports
            .Include(r => r.Submission)
                .ThenInclude(s => s.Assessment)
                    .ThenInclude(a => a.Course)
            .Include(r => r.Submission)
                .ThenInclude(s => s.Student)
            .Include(r => r.FlaggedBy)
            .Where(r => r.Submission.StudentID == studentId)
            .OrderByDescending(r => r.FlaggedAt)
            .ToListAsync(ct);

    public async Task<PlagiarismReport> CreateAsync(PlagiarismReport report, CancellationToken ct = default)
    {
        _context.PlagiarismReports.Add(report);
        await _context.SaveChangesAsync(ct);
        // Re-fetch with all includes so the controller can map to DTO immediately
        return (await GetByIdAsync(report.ReportID, ct))!;
    }

    public async Task<PlagiarismReport> UpdateAsync(PlagiarismReport report, CancellationToken ct = default)
    {
        _context.PlagiarismReports.Update(report);
        await _context.SaveChangesAsync(ct);
        return (await GetByIdAsync(report.ReportID, ct))!;
    }
}
