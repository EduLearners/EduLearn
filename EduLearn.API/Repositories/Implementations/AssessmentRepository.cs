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

    public async Task<IEnumerable<Assessment>> GetByCourseIdAsync(int courseId)
        => await _context.Assessments.Where(a => a.CourseID == courseId).ToListAsync();

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
