using EduLearn.API.Models;
using EduLearn.API.Models.Enums;

namespace EduLearn.API.Repositories.Interfaces;

public interface IEnrollmentRepository
{
    Task<IEnumerable<Enrollment>> GetAllAsync();
    Task<Enrollment?> GetByIdAsync(int enrollId);
    Task<IEnumerable<Enrollment>> GetByStudentIdAsync(int studentId);
    Task<IEnumerable<Enrollment>> GetBySectionIdAsync(int sectionId);
    Task<IEnumerable<Enrollment>> GetByStatusAsync(EnrollmentStatus status);
    Task<Enrollment?> GetByStudentAndSectionAsync(int studentId, int sectionId);
    Task<Enrollment> CreateAsync(Enrollment enrollment);
    Task<Enrollment> UpdateAsync(Enrollment enrollment);
    Task<bool> DeleteAsync(int enrollId);
    Task<bool> ExistsAsync(int enrollId);
}
