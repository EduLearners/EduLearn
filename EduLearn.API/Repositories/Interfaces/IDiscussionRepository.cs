using EduLearn.API.Models;
using EduLearn.API.Models.Enums;

namespace EduLearn.API.Repositories.Interfaces;

public interface IDiscussionRepository
{
    Task<IEnumerable<Discussion>> GetAllAsync();
    Task<Discussion?> GetByIdAsync(int discussionId);
    Task<IEnumerable<Discussion>> GetByCourseIdAsync(int courseId);

    // Get by CourseID with Course and ThreadStarter navigation loaded (for response DTOs)
    Task<IEnumerable<Discussion>> GetByCourseIdWithDetailsAsync(int courseId);

    // Get by ID with Course and ThreadStarter navigation loaded (for reply and status endpoints)
    Task<Discussion?> GetByIdWithDetailsAsync(int discussionId);
    Task<IEnumerable<Discussion>> GetByStatusAsync(DiscussionStatus status);
    Task<IEnumerable<Discussion>> GetByThreadStarterAsync(int userId);
    Task<Discussion> CreateAsync(Discussion discussion);
    Task<Discussion> UpdateAsync(Discussion discussion);
    Task<bool> DeleteAsync(int discussionId);
    Task<bool> ExistsAsync(int discussionId);
}
