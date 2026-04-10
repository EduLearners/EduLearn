using EduLearn.API.Models;
using EduLearn.API.Models.Enums;

namespace EduLearn.API.Repositories.Interfaces;

public interface ICourseRepository
{
    Task<IEnumerable<Course>> GetAllAsync();
    Task<Course?> GetByIdAsync(int courseId);
    Task<Course?> GetByCodeAsync(string code);
    Task<IEnumerable<Course>> GetByStatusAsync(CourseStatus status);
    Task<IEnumerable<Course>> GetByDepartmentAsync(int departmentId);
    Task<Course> CreateAsync(Course course);
    Task<Course> UpdateAsync(Course course);
    Task<bool> DeleteAsync(int courseId);
    Task<bool> ExistsAsync(int courseId);
}
