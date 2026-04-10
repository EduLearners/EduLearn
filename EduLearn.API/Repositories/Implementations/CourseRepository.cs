using EduLearn.API.Data;
using EduLearn.API.Models;
using EduLearn.API.Models.Enums;
using EduLearn.API.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace EduLearn.API.Repositories.Implementations;

public class CourseRepository : ICourseRepository
{
    private readonly AppDbContext _context;

    public CourseRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<Course>> GetAllAsync()
        => await _context.Courses.ToListAsync();

    public async Task<Course?> GetByIdAsync(int courseId)
        => await _context.Courses.FindAsync(courseId);

    public async Task<Course?> GetByCodeAsync(string code)
        => await _context.Courses.FirstOrDefaultAsync(c => c.Code == code);

    public async Task<IEnumerable<Course>> GetByStatusAsync(CourseStatus status)
        => await _context.Courses.Where(c => c.Status == status).ToListAsync();

    public async Task<IEnumerable<Course>> GetByDepartmentAsync(int departmentId)
        => await _context.Courses.Where(c => c.DepartmentID == departmentId).ToListAsync();

    public async Task<Course> CreateAsync(Course course)
    {
        _context.Courses.Add(course);
        await _context.SaveChangesAsync();
        return course;
    }

    public async Task<Course> UpdateAsync(Course course)
    {
        _context.Courses.Update(course);
        await _context.SaveChangesAsync();
        return course;
    }

    public async Task<bool> DeleteAsync(int courseId)
    {
        var course = await _context.Courses.FindAsync(courseId);
        if (course is null) return false;
        _context.Courses.Remove(course);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> ExistsAsync(int courseId)
        => await _context.Courses.AnyAsync(c => c.CourseID == courseId);
}
