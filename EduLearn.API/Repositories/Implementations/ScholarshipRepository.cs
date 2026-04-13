using EduLearn.API.Data;
using EduLearn.API.Models;
using EduLearn.API.Models.Enums;
using EduLearn.API.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace EduLearn.API.Repositories.Implementations;

public class ScholarshipRepository : IScholarshipRepository
{
    private readonly AppDbContext _context;

    public ScholarshipRepository(AppDbContext context) => _context = context;

    public async Task<IEnumerable<Scholarship>> GetByStudentIdAsync(int studentId, CancellationToken ct)
        => await _context.Scholarships
            .AsNoTracking()
            .Include(s => s.Student)
            .Where(s => s.StudentID == studentId)
            .ToListAsync(ct);

    public async Task<IEnumerable<Scholarship>> GetActiveByStudentIdAsync(int studentId, CancellationToken ct)
        => await _context.Scholarships
            .AsNoTracking()
            .Where(s => s.StudentID == studentId
                && s.Status == ScholarshipStatus.Active
                && s.ValidFrom.Date <= DateTime.UtcNow.Date
                && s.ValidTo.Date >= DateTime.UtcNow.Date)
            .ToListAsync(ct);

    public async Task<Scholarship?> GetByIdAsync(int scholarId, CancellationToken ct)
        => await _context.Scholarships
            .AsNoTracking()
            .Include(s => s.Student)
            .FirstOrDefaultAsync(s => s.ScholarID == scholarId, ct);

    public async Task<Scholarship> CreateAsync(Scholarship scholarship, CancellationToken ct)
    {
        _context.Scholarships.Add(scholarship);
        await _context.SaveChangesAsync(ct);
        await _context.Entry(scholarship).Reference(s => s.Student).LoadAsync(ct);
        return scholarship;
    }

    public async Task<Scholarship> UpdateAsync(Scholarship scholarship, CancellationToken ct)
    {
        _context.Scholarships.Update(scholarship);
        await _context.SaveChangesAsync(ct);
        return scholarship;
    }

    public async Task<bool> ExistsAsync(int scholarId, CancellationToken ct)
        => await _context.Scholarships
            .AsNoTracking()
            .AnyAsync(s => s.ScholarID == scholarId, ct);
}
