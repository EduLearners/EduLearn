using EduLearn.API.Models;

namespace EduLearn.API.Repositories.Interfaces;

public interface ISyllabusRepository
{
    Task<IEnumerable<Syllabus>> GetAllAsync();
    Task<Syllabus?> GetByIdAsync(int syllabusId);

    // Get by ID with Course and CreatedBy navigation loaded (for response DTOs)
    Task<Syllabus?> GetByIdWithDetailsAsync(int syllabusId);

    Task<IEnumerable<Syllabus>> GetByCourseIdAsync(int courseId);

    // Get by CourseID with Course and CreatedBy navigation loaded (for response DTOs)
    Task<IEnumerable<Syllabus>> GetByCourseIdWithDetailsAsync(int courseId);

    // Check if a version already exists for a course — used for duplicate version check
    Task<bool> VersionExistsForCourseAsync(int courseId, string version);

    Task<Syllabus> CreateAsync(Syllabus syllabus);
    Task<Syllabus> UpdateAsync(Syllabus syllabus);
    Task<bool> ExistsAsync(int syllabusId);
}