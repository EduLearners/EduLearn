using EduLearn.API.Models;

namespace EduLearn.API.Repositories.Interfaces;

public interface IScholarshipRepository
{
    Task<IEnumerable<Scholarship>> GetAllAsync(CancellationToken ct);
    Task<IEnumerable<Scholarship>> GetByStudentIdAsync(int studentId, CancellationToken ct);
    Task<IEnumerable<Scholarship>> GetActiveByStudentIdAsync(int studentId, CancellationToken ct);
    Task<Scholarship?> GetByIdAsync(int scholarId, CancellationToken ct);
    Task<Scholarship> CreateAsync(Scholarship scholarship, CancellationToken ct);
    Task<Scholarship> UpdateAsync(Scholarship scholarship, CancellationToken ct);
    Task<bool> ExistsAsync(int scholarId, CancellationToken ct);
}
