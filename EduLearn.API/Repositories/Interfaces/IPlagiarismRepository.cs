// AGI-04
using EduLearn.API.Models;

namespace EduLearn.API.Repositories.Interfaces;

public interface IPlagiarismRepository
{
    Task<PlagiarismReport?> GetByIdAsync(int reportId, CancellationToken ct = default);
    Task<IEnumerable<PlagiarismReport>> GetBySubmissionIdAsync(int submissionId, CancellationToken ct = default);
    Task<IEnumerable<PlagiarismReport>> GetByStudentIdAsync(int studentId, CancellationToken ct = default);
    Task<PlagiarismReport> CreateAsync(PlagiarismReport report, CancellationToken ct = default);
    Task<PlagiarismReport> UpdateAsync(PlagiarismReport report, CancellationToken ct = default);
}
