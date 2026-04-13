using EduLearn.API.Models;
using EduLearn.API.Models.Enums;
using Microsoft.EntityFrameworkCore.Storage;

namespace EduLearn.API.Repositories.Interfaces;

public interface IEnrollmentRepository
{
    Task<IEnumerable<Enrollment>> GetAllAsync();
    Task<Enrollment?> GetByIdAsync(int enrollId);
    Task<IEnumerable<Enrollment>> GetByStudentIdAsync(int studentId);
    Task<IEnumerable<Enrollment>> GetBySectionIdAsync(int sectionId);
    Task<IEnumerable<Enrollment>> GetByStatusAsync(EnrollmentStatus status);
    Task<Enrollment?> GetByStudentAndSectionAsync(int studentId, int sectionId);
    Task<bool> IsAlreadyEnrolledAsync(int studentId, int sectionId);
    Task<bool> HasActiveEnrollmentAsync(int studentId, int sectionId);
    Task<int> GetMaxWaitlistPositionAsync(int sectionId);
    Task<Enrollment?> GetFirstWaitlistedAsync(int sectionId);
    Task<IEnumerable<Enrollment>> GetByStudentIdWithDetailsAsync(int studentId);
    Task<IEnumerable<Enrollment>> GetBySectionIdWithDetailsAsync(int sectionId);
    Task<Enrollment> CreateAsync(Enrollment enrollment);
    Task<Enrollment> UpdateAsync(Enrollment enrollment);
    Task<bool> DeleteAsync(int enrollId);
    Task<bool> ExistsAsync(int enrollId);
    Task SaveChangesAsync();
    Task<IDbContextTransaction> BeginTransactionAsync();
}
