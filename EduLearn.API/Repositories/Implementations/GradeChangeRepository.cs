using EduLearn.API.Data;
using EduLearn.API.Models;
using EduLearn.API.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace EduLearn.API.Repositories.Implementations;

public class GradeChangeRepository : IGradeChangeRepository
{
    private readonly AppDbContext _context;

    public GradeChangeRepository(AppDbContext context)
    {
        _context = context;
    }

    // Get all grade changes for a submission — ordered newest first
    public async Task<IEnumerable<GradeChange>> GetBySubmissionIdAsync(int submissionId)
        => await _context.GradeChanges
            .AsNoTracking()
            .Where(gc => gc.SubmissionID == submissionId)
            .OrderByDescending(gc => gc.ChangedAt)
            .ToListAsync();

    public async Task<GradeChange?> GetByIdAsync(int gradeChangeId)
        => await _context.GradeChanges.FindAsync(gradeChangeId);

    // Get by SubmissionID with Submission and ChangedBy navigation loaded — for response DTOs
    public async Task<IEnumerable<GradeChange>> GetBySubmissionIdWithDetailsAsync(int submissionId)
        => await _context.GradeChanges
            .AsNoTracking()
            .Where(gc => gc.SubmissionID == submissionId)
            .Include(gc => gc.Submission)
            .Include(gc => gc.ChangedBy)
            .OrderByDescending(gc => gc.ChangedAt)
            .ToListAsync();

    public async Task<GradeChange> CreateAsync(GradeChange gradeChange)
    {
        _context.GradeChanges.Add(gradeChange);
        await _context.SaveChangesAsync();
        return gradeChange;
    }

    public async Task<bool> ExistsAsync(int gradeChangeId)
        => await _context.GradeChanges.AnyAsync(gc => gc.GradeChangeID == gradeChangeId);
}