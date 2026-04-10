using EduLearn.API.Models;
using EduLearn.API.Models.Enums;

namespace EduLearn.API.Repositories.Interfaces;

public interface IAssessmentRepository
{
    Task<IEnumerable<Assessment>> GetAllAsync();
    Task<Assessment?> GetByIdAsync(int assessmentId);
    Task<IEnumerable<Assessment>> GetByCourseIdAsync(int courseId);
    Task<IEnumerable<Assessment>> GetBySectionIdAsync(int sectionId);
    Task<IEnumerable<Assessment>> GetByTypeAsync(AssessmentType type);
    Task<IEnumerable<Assessment>> GetByStatusAsync(AssessmentStatus status);
    Task<Assessment> CreateAsync(Assessment assessment);
    Task<Assessment> UpdateAsync(Assessment assessment);
    Task<bool> DeleteAsync(int assessmentId);
    Task<bool> ExistsAsync(int assessmentId);
}
