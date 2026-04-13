using EduLearn.API.Data;
using EduLearn.API.Models;
using EduLearn.API.Models.Enums;
using EduLearn.API.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace EduLearn.API.Repositories.Implementations;

public class AssessmentRepository : IAssessmentRepository
{
    private readonly AppDbContext _context;

    public AssessmentRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<Assessment>> GetAllAsync()
        => await _context.Assessments.ToListAsync();

    public async Task<Assessment?> GetByIdAsync(int assessmentId)
        => await _context.Assessments.FindAsync(assessmentId);

    // Get by ID with Course and CreatedBy loaded — used when we need CourseName and CreatedByName
    public async Task<Assessment?> GetByIdWithDetailsAsync(int assessmentId)
        => await _context.Assessments
            .Include(a => a.Course)
            .Include(a => a.CreatedBy)
            .FirstOrDefaultAsync(a => a.AssessmentID == assessmentId);

    public async Task<IEnumerable<Assessment>> GetByCourseIdAsync(int courseId)
        => await _context.Assessments.Where(a => a.CourseID == courseId).ToListAsync();

    // Get by CourseID with Course and CreatedBy loaded — used for listing assessments with names
    public async Task<IEnumerable<Assessment>> GetByCourseIdWithDetailsAsync(int courseId)
        => await _context.Assessments
            .AsNoTracking()
            .Where(a => a.CourseID == courseId)
            .Include(a => a.Course)
            .Include(a => a.CreatedBy)
            .ToListAsync();

    public async Task<IEnumerable<Assessment>> GetBySectionIdAsync(int sectionId)
        => await _context.Assessments.Where(a => a.SectionID == sectionId).ToListAsync();

    public async Task<IEnumerable<Assessment>> GetByTypeAsync(AssessmentType type)
        => await _context.Assessments.Where(a => a.Type == type).ToListAsync();

    public async Task<IEnumerable<Assessment>> GetByStatusAsync(AssessmentStatus status)
        => await _context.Assessments.Where(a => a.Status == status).ToListAsync();

    public async Task<Assessment> CreateAsync(Assessment assessment)
    {
        _context.Assessments.Add(assessment);
        await _context.SaveChangesAsync();
        return assessment;
    }

    public async Task<Assessment> UpdateAsync(Assessment assessment)
    {
        _context.Assessments.Update(assessment);
        await _context.SaveChangesAsync();
        return assessment;
    }

    public async Task<bool> DeleteAsync(int assessmentId)
    {
        var assessment = await _context.Assessments.FindAsync(assessmentId);
        if (assessment is null) return false;
        _context.Assessments.Remove(assessment);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> ExistsAsync(int assessmentId)
        => await _context.Assessments.AnyAsync(a => a.AssessmentID == assessmentId);
}
