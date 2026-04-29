using EduLearn.API.Models;

namespace EduLearn.API.Repositories.Interfaces
{
    public interface IGradeChangeRepository
    {
        // Get all grade changes for a specific submission — used for audit trail
        Task<IEnumerable<GradeChange>> GetBySubmissionIdAsync(int submissionId);

        // Get single grade change by ID
        Task<GradeChange?> GetByIdAsync(int gradeChangeId);

        // Get by SubmissionID with Submission, ChangedBy navigation properties loaded
        Task<IEnumerable<GradeChange>> GetBySubmissionIdWithDetailsAsync(int submissionId);

        // Create a grade change record manually (PRD AGI-03 POST endpoint)
        Task<GradeChange> CreateAsync(GradeChange gradeChange);

        Task<bool> ExistsAsync(int gradeChangeId);
    }
}
