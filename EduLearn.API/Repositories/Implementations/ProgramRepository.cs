using EduLearn.API.Data;
using EduLearn.API.Models.Enums;
using EduLearn.API.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace EduLearn.API.Repositories.Implementations;

public class ProgramRepository : IProgramRepository
{
    private readonly AppDbContext _context;

    public ProgramRepository(AppDbContext context)
    {
        _context = context;
    }

    // Get all programs (read-only, no change tracking needed)
    public async Task<IEnumerable<EduLearn.API.Models.Program>> GetAllAsync()
        => await _context.Programs.AsNoTracking().ToListAsync();

    // Get a single program by ID (tracked — so controller can modify and save)
    public async Task<EduLearn.API.Models.Program?> GetByIdAsync(int programId)
        => await _context.Programs.FirstOrDefaultAsync(p => p.ProgramID == programId);

    // Check for duplicate Name + DegreeType combination
    public async Task<bool> ExistsByNameAndDegreeAsync(string name, string degreeType)
        => await _context.Programs.AnyAsync(p => p.Name == name && p.DegreeType == degreeType);

    // Create a new program and save to database
    public async Task<EduLearn.API.Models.Program> CreateAsync(EduLearn.API.Models.Program program)
    {
        _context.Programs.Add(program);
        await _context.SaveChangesAsync();
        return program;
    }

    // Save changes to an already-tracked program entity
    public async Task<EduLearn.API.Models.Program> UpdateAsync(EduLearn.API.Models.Program program)
    {
        _context.Programs.Update(program);
        await _context.SaveChangesAsync();
        return program;
    }

    // Check if a program exists by ID
    public async Task<bool> ExistsAsync(int programId)
        => await _context.Programs.AnyAsync(p => p.ProgramID == programId);
}
