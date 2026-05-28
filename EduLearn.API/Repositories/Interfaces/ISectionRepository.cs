using EduLearn.API.Models;

namespace EduLearn.API.Repositories.Interfaces;

public interface ISectionRepository
{
    Task<IEnumerable<Section>> GetAllAsync();
    Task<Section?> GetByIdAsync(int sectionId);
    Task<Section?> GetByIdWithCourseAsync(int sectionId);
    Task<IEnumerable<Section>> GetByCourseIdAsync(int courseId);
    Task<IEnumerable<Section>> GetByInstructorIdAsync(int instructorId);
    Task<IEnumerable<Section>> GetByTermAsync(string term);
    Task<IEnumerable<Section>> GetByCourseAndTermAsync(int courseId, string term);
    Task<IEnumerable<Section>> GetByInstructorAndTermAsync(int instructorId, string term);
    Task<Section> CreateAsync(Section section);
    Task<Section> UpdateAsync(Section section);
    Task<bool> DeleteAsync(int sectionId);
    Task<bool> ExistsAsync(int sectionId);
    Task SaveChangesAsync();
}
