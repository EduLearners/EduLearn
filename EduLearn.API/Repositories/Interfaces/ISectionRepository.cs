using EduLearn.API.Models;

namespace EduLearn.API.Repositories.Interfaces;

public interface ISectionRepository
{
    Task<IEnumerable<Section>> GetAllAsync();
    Task<Section?> GetByIdAsync(int sectionId);
    Task<IEnumerable<Section>> GetByCourseIdAsync(int courseId);
    Task<IEnumerable<Section>> GetByInstructorIdAsync(int instructorId);
    Task<IEnumerable<Section>> GetByTermAsync(string term);
    Task<Section> CreateAsync(Section section);
    Task<Section> UpdateAsync(Section section);
    Task<bool> DeleteAsync(int sectionId);
    Task<bool> ExistsAsync(int sectionId);
}
