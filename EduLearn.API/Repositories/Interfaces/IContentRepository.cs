using EduLearn.API.Models;

namespace EduLearn.API.Repositories.Interfaces;

public interface IContentRepository
{
    Task<IEnumerable<Content>> GetAllAsync();
    Task<Content?> GetByIdAsync(int contentId);

    // Get by ID with Course and UploadedBy navigation loaded (for response DTOs)
    Task<Content?> GetByIdWithDetailsAsync(int contentId);

    Task<IEnumerable<Content>> GetByCourseIdAsync(int courseId);

    // Get by CourseID with Course and UploadedBy navigation loaded (for response DTOs)
    Task<IEnumerable<Content>> GetByCourseIdWithDetailsAsync(int courseId);

    Task<IEnumerable<Content>> GetByUploadedByAsync(int userId);
    Task<Content> CreateAsync(Content content);
    Task<Content> UpdateAsync(Content content);
    Task<bool> DeleteAsync(int contentId);
    Task<bool> ExistsAsync(int contentId);
}
