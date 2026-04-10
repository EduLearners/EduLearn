using EduLearn.API.Data;
using EduLearn.API.DTOs;
using EduLearn.API.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EduLearn.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CoursesController : ControllerBase
{
    private readonly AppDbContext _context;

    public CoursesController(AppDbContext context)
    {
        _context = context;
    }

    [HttpPost]
    public async Task<ActionResult<CourseResponseDto>> CreateCourse(CreateCourseDto dto, CancellationToken cancellationToken)
    {
        if (await _context.Courses.AnyAsync(c => c.Code == dto.Code, cancellationToken))
            return Conflict(new { error = "Course code already exists", code = "DUPLICATE_COURSE_CODE" });

        var course = new Course
        {
            Code = dto.Code,
            Title = dto.Title,
            Description = dto.Description,
            Credits = dto.Credits,
            DepartmentID = dto.DepartmentID,
            Level = dto.Level,
            PrerequisitesJSON = dto.PrerequisitesJSON
        };

        _context.Courses.Add(course);
        await _context.SaveChangesAsync(cancellationToken);

        return CreatedAtAction(nameof(GetCourse), new { id = course.CourseID }, MapToDto(course));
    }

    [HttpGet]
    public async Task<ActionResult<List<CourseResponseDto>>> GetCourses(CancellationToken cancellationToken)
    {
        var courses = await _context.Courses
            .AsNoTracking()
            .Select(c => new CourseResponseDto
            {
                CourseID = c.CourseID,
                Code = c.Code,
                Title = c.Title,
                Description = c.Description,
                Credits = c.Credits,
                DepartmentID = c.DepartmentID,
                Level = c.Level,
                PrerequisitesJSON = c.PrerequisitesJSON,
                Status = c.Status,
                CreatedAt = c.CreatedAt
            })
            .ToListAsync(cancellationToken);

        return Ok(courses);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<CourseResponseDto>> GetCourse(int id, CancellationToken cancellationToken)
    {
        var course = await _context.Courses
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.CourseID == id, cancellationToken);

        if (course is null)
            return NotFound(new { error = "Course not found", code = "COURSE_NOT_FOUND" });

        return Ok(MapToDto(course));
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<CourseResponseDto>> UpdateCourse(int id, CreateCourseDto dto, CancellationToken cancellationToken)
    {
        var course = await _context.Courses.FirstOrDefaultAsync(c => c.CourseID == id, cancellationToken);

        if (course is null)
            return NotFound(new { error = "Course not found", code = "COURSE_NOT_FOUND" });

        course.Title = dto.Title;
        course.Description = dto.Description;
        course.Credits = dto.Credits;
        course.DepartmentID = dto.DepartmentID;
        course.Level = dto.Level;
        course.PrerequisitesJSON = dto.PrerequisitesJSON;

        await _context.SaveChangesAsync(cancellationToken);
        return Ok(MapToDto(course));
    }

    private static CourseResponseDto MapToDto(Course course) => new()
    {
        CourseID = course.CourseID,
        Code = course.Code,
        Title = course.Title,
        Description = course.Description,
        Credits = course.Credits,
        DepartmentID = course.DepartmentID,
        Level = course.Level,
        PrerequisitesJSON = course.PrerequisitesJSON,
        Status = course.Status,
        CreatedAt = course.CreatedAt
    };
}
