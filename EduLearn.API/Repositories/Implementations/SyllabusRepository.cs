using EduLearn.API.Data;
using EduLearn.API.Models;
using EduLearn.API.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace EduLearn.API.Repositories.Implementations;

public class SyllabusRepository : ISyllabusRepository
{
    private readonly AppDbContext _context;

    public SyllabusRepository(AppDbContext context)
    {
        _context = context;
    }

    // AsNoTracking for read-only list queries
    public async Task<IEnumerable<Syllabus>> GetAllAsync()
        => await _context.Syllabi.AsNoTracking().ToListAsync();

    public async Task<Syllabus?> GetByIdAsync(int syllabusId)
        => await _context.Syllabi.FindAsync(syllabusId);

    // Get by ID with Course and CreatedBy loaded — used when we need CourseName and CreatedByName
    public async Task<Syllabus?> GetByIdWithDetailsAsync(int syllabusId)
        => await _context.Syllabi
            .Include(s => s.Course)
            .Include(s => s.CreatedBy)
            .FirstOrDefaultAsync(s => s.SyllabusID == syllabusId);

    public async Task<IEnumerable<Syllabus>> GetByCourseIdAsync(int courseId)
        => await _context.Syllabi.Where(s => s.CourseID == courseId).ToListAsync();

    // Get by CourseID with Course and CreatedBy loaded — used for listing syllabi with names
    public async Task<IEnumerable<Syllabus>> GetByCourseIdWithDetailsAsync(int courseId)
        => await _context.Syllabi
            .AsNoTracking()
            .Where(s => s.CourseID == courseId)
            .Include(s => s.Course)
            .Include(s => s.CreatedBy)
            .OrderByDescending(s => s.CreatedAt)
            .ToListAsync();

    // Check if this version string already exists for a course (e.g. "v1.0" already created)
    public async Task<bool> VersionExistsForCourseAsync(int courseId, string version)
        => await _context.Syllabi.AnyAsync(s => s.CourseID == courseId && s.Version == version);

    public async Task<Syllabus> CreateAsync(Syllabus syllabus)
    {
        _context.Syllabi.Add(syllabus);
        await _context.SaveChangesAsync();
        return syllabus;
    }

    public async Task<Syllabus> UpdateAsync(Syllabus syllabus)
    {
        var entry = _context.Entry(syllabus);
        if (entry.State == EntityState.Detached)
            _context.Syllabi.Update(syllabus);
        await _context.SaveChangesAsync();
        return syllabus;
    }

    public async Task<bool> ExistsAsync(int syllabusId)
        => await _context.Syllabi.AnyAsync(s => s.SyllabusID == syllabusId);
}