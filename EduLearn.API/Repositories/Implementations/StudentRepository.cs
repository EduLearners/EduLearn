using EduLearn.API.Data;
using EduLearn.API.Models;
using EduLearn.API.Models.Enums;
using EduLearn.API.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace EduLearn.API.Repositories.Implementations;

public class StudentRepository : IStudentRepository
{
    private readonly AppDbContext _context;

    public StudentRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<Student>> GetAllAsync()
        => await _context.Students.ToListAsync();

    public async Task<Student?> GetByIdAsync(int studentId)
        => await _context.Students.FindAsync(studentId);

    public async Task<Student?> GetByUserIdAsync(int userId)
        => await _context.Students.FirstOrDefaultAsync(s => s.UserID == userId);

    public async Task<Student?> GetByMRNAsync(string mrn)
        => await _context.Students.FirstOrDefaultAsync(s => s.MRN == mrn);

    public async Task<IEnumerable<Student>> GetByProgramIdAsync(int programId)
        => await _context.Students.Where(s => s.ProgramID == programId).ToListAsync();

    public async Task<IEnumerable<Student>> GetByStatusAsync(StudentLifecycleStatus status)
        => await _context.Students.Where(s => s.EnrollmentStatus == status).ToListAsync();

    public async Task<Student> CreateAsync(Student student)
    {
        _context.Students.Add(student);
        await _context.SaveChangesAsync();
        return student;
    }

    public async Task<Student> UpdateAsync(Student student)
    {
        _context.Students.Update(student);
        await _context.SaveChangesAsync();
        return student;
    }

    public async Task<bool> DeleteAsync(int studentId)
    {
        var student = await _context.Students.FindAsync(studentId);
        if (student is null) return false;
        _context.Students.Remove(student);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> ExistsAsync(int studentId)
        => await _context.Students.AnyAsync(s => s.StudentID == studentId);
}
