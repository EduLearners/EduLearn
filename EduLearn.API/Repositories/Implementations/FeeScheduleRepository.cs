using EduLearn.API.Data;
using EduLearn.API.Models;
using EduLearn.API.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace EduLearn.API.Repositories.Implementations;

public class FeeScheduleRepository : IFeeScheduleRepository
{
    private readonly AppDbContext _context;

    public FeeScheduleRepository(AppDbContext context) => _context = context;

    public async Task<FeeSchedule?> GetByIdAsync(int feeId, CancellationToken ct)
        => await _context.FeeSchedules
            .AsNoTracking()
            .Include(f => f.Program)
            .FirstOrDefaultAsync(f => f.FeeID == feeId, ct);

    public async Task<FeeSchedule?> GetByProgramAndTermAsync(int programId, string term, CancellationToken ct)
        => await _context.FeeSchedules
            .AsNoTracking()
            .Include(f => f.Program)
            .FirstOrDefaultAsync(f => f.ProgramID == programId && f.Term == term, ct);

    public async Task<IEnumerable<FeeSchedule>> GetAllAsync(CancellationToken ct)
        => await _context.FeeSchedules
            .AsNoTracking()
            .Include(f => f.Program)
            .ToListAsync(ct);

    public async Task<FeeSchedule> CreateAsync(FeeSchedule fee, CancellationToken ct)
    {
        _context.FeeSchedules.Add(fee);
        await _context.SaveChangesAsync(ct);
        await _context.Entry(fee).Reference(f => f.Program).LoadAsync(ct);
        return fee;
    }

    public async Task<FeeSchedule> UpdateAsync(FeeSchedule fee, CancellationToken ct)
    {
        _context.FeeSchedules.Update(fee);
        await _context.SaveChangesAsync(ct);
        return fee;
    }

    public async Task<bool> ExistsAsync(int feeId, CancellationToken ct)
        => await _context.FeeSchedules
            .AsNoTracking()
            .AnyAsync(f => f.FeeID == feeId, ct);
}
