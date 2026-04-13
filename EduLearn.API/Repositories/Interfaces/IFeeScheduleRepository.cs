using EduLearn.API.Models;

namespace EduLearn.API.Repositories.Interfaces;

public interface IFeeScheduleRepository
{
    Task<FeeSchedule?> GetByIdAsync(int feeId, CancellationToken ct);
    Task<FeeSchedule?> GetByProgramAndTermAsync(int programId, string term, CancellationToken ct);
    Task<IEnumerable<FeeSchedule>> GetAllAsync(CancellationToken ct);
    Task<FeeSchedule> CreateAsync(FeeSchedule fee, CancellationToken ct);
    Task<FeeSchedule> UpdateAsync(FeeSchedule fee, CancellationToken ct);
    Task<bool> ExistsAsync(int feeId, CancellationToken ct);
}
