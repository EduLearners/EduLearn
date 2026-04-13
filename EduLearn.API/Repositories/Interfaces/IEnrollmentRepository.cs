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

    // Check if student has an active (non-dropped) enrollment in a section
    Task<bool> HasActiveEnrollmentAsync(int studentId, int sectionId);

    // Get the highest waitlist position for a section
    Task<int> GetMaxWaitlistPositionAsync(int sectionId);

    // Get first waitlisted student in a section (ordered by position)
    Task<Enrollment?> GetFirstWaitlistedAsync(int sectionId);

    // Get enrollments by student with Student, Section, and Course navigation loaded
    Task<IEnumerable<Enrollment>> GetByStudentIdWithDetailsAsync(int studentId);

    // Get enrollments by section with Student, Section, and Course navigation loaded
    Task<IEnumerable<Enrollment>> GetBySectionIdWithDetailsAsync(int sectionId);

    // Save changes without creating/updating a specific entity (for transaction scenarios)
    Task SaveChangesAsync();
}
