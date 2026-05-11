using EduLearn.API.Data;
using EduLearn.API.Models;
using EduLearn.API.Models.Enums;
using EduLearn.API.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace EduLearn.API.Repositories.Implementations;

public class SubmissionRepository : ISubmissionRepository
{
    private readonly AppDbContext _context;

    public SubmissionRepository(AppDbContext context)
    {
        _context = context;
    }

    // AsNoTracking for read-only list queries
    public async Task<IEnumerable<Submission>> GetAllAsync()
        => await _context.Submissions.AsNoTracking().ToListAsync();

    public async Task<Submission?> GetByIdAsync(int submissionId)
        => await _context.Submissions.FindAsync(submissionId);

    // Get by ID with Assessment, Student, and Grader loaded — used for grading and response DTOs
    public async Task<Submission?> GetByIdWithDetailsAsync(int submissionId)
        => await _context.Submissions
            .Include(s => s.Assessment)
            .Include(s => s.Student)
            .Include(s => s.Grader)
            .FirstOrDefaultAsync(s => s.SubmissionID == submissionId);

    public async Task<IEnumerable<Submission>> GetByAssessmentIdAsync(int assessmentId)
        => await _context.Submissions.Where(s => s.AssessmentID == assessmentId).ToListAsync();

    // Get by AssessmentID with navigation properties loaded — used for listing submissions with names
    public async Task<IEnumerable<Submission>> GetByAssessmentIdWithDetailsAsync(int assessmentId)
        => await _context.Submissions
            .AsNoTracking()
            .Where(s => s.AssessmentID == assessmentId)
            .Include(s => s.Assessment)
            .Include(s => s.Student)
            .Include(s => s.Grader)
            .ToListAsync();

    public async Task<IEnumerable<Submission>> GetByStudentIdAsync(int studentId)
        => await _context.Submissions.Where(s => s.StudentID == studentId).ToListAsync();

    // Get by StudentID with navigation properties loaded — used for student's submission history
    public async Task<IEnumerable<Submission>> GetByStudentIdWithDetailsAsync(int studentId)
        => await _context.Submissions
            .AsNoTracking()
            .Where(s => s.StudentID == studentId)
            .Include(s => s.Assessment)
            .Include(s => s.Student)
            .Include(s => s.Grader)
            .ToListAsync();

    public async Task<IEnumerable<Submission>> GetByStatusAsync(SubmissionStatus status)
        => await _context.Submissions.Where(s => s.Status == status).ToListAsync();

    public async Task<Submission?> GetByStudentAndAssessmentAsync(int studentId, int assessmentId)
        => await _context.Submissions.FirstOrDefaultAsync(s => s.StudentID == studentId && s.AssessmentID == assessmentId);

    public async Task<Submission> CreateAsync(Submission submission)
    {
        _context.Submissions.Add(submission);
        await _context.SaveChangesAsync();
        return submission;
    }

    public async Task<Submission> UpdateAsync(Submission submission)
    {
        var entry = _context.Entry(submission);
        if (entry.State == EntityState.Detached)
            _context.Submissions.Update(submission);
        await _context.SaveChangesAsync();
        return submission;
    }

    public async Task CreateGradeChangeAsync(GradeChange gradeChange)
    {
        _context.GradeChanges.Add(gradeChange);
        await _context.SaveChangesAsync();
    }

    public async Task<bool> DeleteAsync(int submissionId)
    {
        var submission = await _context.Submissions.FindAsync(submissionId);
        if (submission is null) return false;
        _context.Submissions.Remove(submission);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> ExistsAsync(int submissionId)
        => await _context.Submissions.AnyAsync(s => s.SubmissionID == submissionId);
}