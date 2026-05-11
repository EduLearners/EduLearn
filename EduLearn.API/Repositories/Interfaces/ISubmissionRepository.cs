using EduLearn.API.Models;
using EduLearn.API.Models.Enums;

namespace EduLearn.API.Repositories.Interfaces;

public interface ISubmissionRepository
{
    Task<IEnumerable<Submission>> GetAllAsync();
    Task<Submission?> GetByIdAsync(int submissionId);

    // Get by ID with Assessment, Student, and Grader navigation loaded (for response DTOs and grading)
    Task<Submission?> GetByIdWithDetailsAsync(int submissionId);

    Task<IEnumerable<Submission>> GetByAssessmentIdAsync(int assessmentId);

    // Get by AssessmentID with Assessment, Student, and Grader navigation loaded
    Task<IEnumerable<Submission>> GetByAssessmentIdWithDetailsAsync(int assessmentId);

    Task<IEnumerable<Submission>> GetByStudentIdAsync(int studentId);

    // Get by StudentID with Assessment, Student, and Grader navigation loaded
    Task<IEnumerable<Submission>> GetByStudentIdWithDetailsAsync(int studentId);

    Task<IEnumerable<Submission>> GetByStatusAsync(SubmissionStatus status);
    Task<Submission?> GetByStudentAndAssessmentAsync(int studentId, int assessmentId);
    Task<Submission> CreateAsync(Submission submission);
    Task<Submission> UpdateAsync(Submission submission);
    Task CreateGradeChangeAsync(GradeChange gradeChange);
    Task<bool> DeleteAsync(int submissionId);
    Task<bool> ExistsAsync(int submissionId);
}
