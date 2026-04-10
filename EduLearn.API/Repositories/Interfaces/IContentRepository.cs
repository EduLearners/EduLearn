using EduLearn.API.Models;

namespace EduLearn.API.Repositories.Interfaces;

public interface IContentRepository
{
    Task<IEnumerable<Content>> GetAllAsync();
    Task<Content?> GetByIdAsync(int contentId);
    Task<IEnumerable<Content>> GetByCourseIdAsync(int courseId);
    Task<IEnumerable<Content>> GetByUploadedByAsync(int userId);
    Task<Content> CreateAsync(Content content);
    Task<Content> UpdateAsync(Content content);
    Task<bool> DeleteAsync(int contentId);
    Task<bool> ExistsAsync(int contentId);
}
