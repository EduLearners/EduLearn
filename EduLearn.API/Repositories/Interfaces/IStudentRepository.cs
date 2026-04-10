using EduLearn.API.Models;
using EduLearn.API.Models.Enums;

namespace EduLearn.API.Repositories.Interfaces;

public interface IStudentRepository
{
    Task<IEnumerable<Student>> GetAllAsync();
    Task<Student?> GetByIdAsync(int studentId);
    Task<Student?> GetByUserIdAsync(int userId);
    Task<Student?> GetByMRNAsync(string mrn);
    Task<IEnumerable<Student>> GetByProgramIdAsync(int programId);
    Task<IEnumerable<Student>> GetByStatusAsync(StudentLifecycleStatus status);
    Task<Student> CreateAsync(Student student);
    Task<Student> UpdateAsync(Student student);
    Task<bool> DeleteAsync(int studentId);
    Task<bool> ExistsAsync(int studentId);
}
