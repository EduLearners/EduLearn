using EduLearn.API.Data;
using EduLearn.API.Models;
using EduLearn.API.Models.Enums;
using EduLearn.API.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

namespace EduLearn.API.Repositories.Implementations;

public class EnrollmentRepository : IEnrollmentRepository
{
    private readonly AppDbContext _context;

    public EnrollmentRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<Enrollment>> GetAllAsync()
        => await _context.Enrollments.ToListAsync();

    public async Task<Enrollment?> GetByIdAsync(int enrollId)
        => await _context.Enrollments.FindAsync(enrollId);

    public async Task<IEnumerable<Enrollment>> GetByStudentIdAsync(int studentId)
        => await _context.Enrollments
            .Where(e => e.StudentID == studentId)
            .Include(e => e.Student)
            .Include(e => e.Section)
                .ThenInclude(s => s.Course)
            .AsNoTracking()
            .ToListAsync();

    public async Task<IEnumerable<Enrollment>> GetBySectionIdAsync(int sectionId)
        => await _context.Enrollments
            .Where(e => e.SectionID == sectionId)
            .Include(e => e.Student)
            .Include(e => e.Section)
                .ThenInclude(s => s.Course)
            .AsNoTracking()
            .ToListAsync();

    public async Task<IEnumerable<Enrollment>> GetByStatusAsync(EnrollmentStatus status)
        => await _context.Enrollments.Where(e => e.Status == status).ToListAsync();

    public async Task<Enrollment?> GetByStudentAndSectionAsync(int studentId, int sectionId)
        => await _context.Enrollments
            .FirstOrDefaultAsync(e => e.StudentID == studentId && e.SectionID == sectionId);

    public async Task<bool> IsAlreadyEnrolledAsync(int studentId, int sectionId)
        => await _context.Enrollments.AnyAsync(e =>
            e.StudentID == studentId &&
            e.SectionID == sectionId &&
            e.Status != EnrollmentStatus.Dropped);

    public async Task<bool> HasActiveEnrollmentAsync(int studentId, int sectionId)
        => await _context.Enrollments.AnyAsync(e =>
            e.StudentID == studentId &&
            e.SectionID == sectionId &&
            e.Status != EnrollmentStatus.Dropped);

    public async Task<int> GetMaxWaitlistPositionAsync(int sectionId)
        => await _context.Enrollments
            .Where(e => e.SectionID == sectionId && e.Status == EnrollmentStatus.Waitlisted)
            .MaxAsync(e => (int?)e.WaitlistPosition) ?? 0;

    public async Task<Enrollment?> GetFirstWaitlistedAsync(int sectionId)
        => await _context.Enrollments
            .Where(e => e.SectionID == sectionId && e.Status == EnrollmentStatus.Waitlisted)
            .OrderBy(e => e.WaitlistPosition)
            .FirstOrDefaultAsync();

    public async Task<IEnumerable<Enrollment>> GetWaitlistedBySectionAsync(int sectionId)
        => await _context.Enrollments
            .Where(e => e.SectionID == sectionId && e.Status == EnrollmentStatus.Waitlisted)
            .OrderBy(e => e.WaitlistPosition)
            .ToListAsync();

    public async Task<IEnumerable<Enrollment>> GetByStudentIdWithDetailsAsync(int studentId)
        => await _context.Enrollments
            .AsNoTracking()
            .Where(e => e.StudentID == studentId)
            .Include(e => e.Student)
            .Include(e => e.Section)
                .ThenInclude(s => s.Course)
            .ToListAsync();

    public async Task<IEnumerable<Enrollment>> GetBySectionIdWithDetailsAsync(int sectionId)
        => await _context.Enrollments
            .AsNoTracking()
            .Where(e => e.SectionID == sectionId)
            .Include(e => e.Student)
            .Include(e => e.Section)
                .ThenInclude(s => s.Course)
            .ToListAsync();

    public async Task<Enrollment> CreateAsync(Enrollment enrollment)
    {
        _context.Enrollments.Add(enrollment);
        await _context.SaveChangesAsync();
        return enrollment;
    }

    public async Task<Enrollment> UpdateAsync(Enrollment enrollment)
    {
        _context.Enrollments.Update(enrollment);
        await _context.SaveChangesAsync();
        return enrollment;
    }

    public async Task<bool> DeleteAsync(int enrollId)
    {
        var enrollment = await _context.Enrollments.FindAsync(enrollId);
        if (enrollment is null) return false;
        _context.Enrollments.Remove(enrollment);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> ExistsAsync(int enrollId)
        => await _context.Enrollments.AnyAsync(e => e.EnrollID == enrollId);

    public async Task SaveChangesAsync()
        => await _context.SaveChangesAsync();

    public async Task<IDbContextTransaction> BeginTransactionAsync()
        => await _context.Database.BeginTransactionAsync();
}
