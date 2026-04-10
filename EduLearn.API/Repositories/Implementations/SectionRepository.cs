using EduLearn.API.Data;
using EduLearn.API.Models;
using EduLearn.API.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace EduLearn.API.Repositories.Implementations;

public class SectionRepository : ISectionRepository
{
    private readonly AppDbContext _context;

    public SectionRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<Section>> GetAllAsync()
        => await _context.Sections.ToListAsync();

    public async Task<Section?> GetByIdAsync(int sectionId)
        => await _context.Sections.FindAsync(sectionId);

    public async Task<IEnumerable<Section>> GetByCourseIdAsync(int courseId)
        => await _context.Sections.Where(s => s.CourseID == courseId).ToListAsync();

    public async Task<IEnumerable<Section>> GetByInstructorIdAsync(int instructorId)
        => await _context.Sections.Where(s => s.InstructorID == instructorId).ToListAsync();

    public async Task<IEnumerable<Section>> GetByTermAsync(string term)
        => await _context.Sections.Where(s => s.Term == term).ToListAsync();

    public async Task<Section> CreateAsync(Section section)
    {
        _context.Sections.Add(section);
        await _context.SaveChangesAsync();
        return section;
    }

    public async Task<Section> UpdateAsync(Section section)
    {
        _context.Sections.Update(section);
        await _context.SaveChangesAsync();
        return section;
    }

    public async Task<bool> DeleteAsync(int sectionId)
    {
        var section = await _context.Sections.FindAsync(sectionId);
        if (section is null) return false;
        _context.Sections.Remove(section);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> ExistsAsync(int sectionId)
        => await _context.Sections.AnyAsync(s => s.SectionID == sectionId);
}
