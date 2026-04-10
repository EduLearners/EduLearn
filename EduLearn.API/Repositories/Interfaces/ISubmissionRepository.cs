using EduLearn.API.Models;
using EduLearn.API.Models.Enums;

namespace EduLearn.API.Repositories.Interfaces;

public interface ISubmissionRepository
{
    Task<IEnumerable<Submission>> GetAllAsync();
    Task<Submission?> GetByIdAsync(int submissionId);
    Task<IEnumerable<Submission>> GetByAssessmentIdAsync(int assessmentId);
    Task<IEnumerable<Submission>> GetByStudentIdAsync(int studentId);
    Task<IEnumerable<Submission>> GetByStatusAsync(SubmissionStatus status);
    Task<Submission?> GetByStudentAndAssessmentAsync(int studentId, int assessmentId);
    Task<Submission> CreateAsync(Submission submission);
    Task<Submission> UpdateAsync(Submission submission);
    Task<bool> DeleteAsync(int submissionId);
    Task<bool> ExistsAsync(int submissionId);
}
