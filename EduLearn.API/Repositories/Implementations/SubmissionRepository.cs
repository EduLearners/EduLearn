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

    public async Task<IEnumerable<Submission>> GetAllAsync()
        => await _context.Submissions.ToListAsync();

    public async Task<Submission?> GetByIdAsync(int submissionId)
        => await _context.Submissions.FindAsync(submissionId);

    public async Task<IEnumerable<Submission>> GetByAssessmentIdAsync(int assessmentId)
        => await _context.Submissions.Where(s => s.AssessmentID == assessmentId).ToListAsync();

    public async Task<IEnumerable<Submission>> GetByStudentIdAsync(int studentId)
        => await _context.Submissions.Where(s => s.StudentID == studentId).ToListAsync();

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
        _context.Submissions.Update(submission);
        await _context.SaveChangesAsync();
        return submission;
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
