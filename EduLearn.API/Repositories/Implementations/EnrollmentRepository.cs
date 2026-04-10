using EduLearn.API.Data;
using EduLearn.API.Models;
using EduLearn.API.Models.Enums;
using EduLearn.API.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

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
        => await _context.Enrollments.Where(e => e.StudentID == studentId).ToListAsync();

    public async Task<IEnumerable<Enrollment>> GetBySectionIdAsync(int sectionId)
        => await _context.Enrollments.Where(e => e.SectionID == sectionId).ToListAsync();

    public async Task<IEnumerable<Enrollment>> GetByStatusAsync(EnrollmentStatus status)
        => await _context.Enrollments.Where(e => e.Status == status).ToListAsync();

    public async Task<Enrollment?> GetByStudentAndSectionAsync(int studentId, int sectionId)
        => await _context.Enrollments.FirstOrDefaultAsync(e => e.StudentID == studentId && e.SectionID == sectionId);

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
}
