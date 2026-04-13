using EduLearn.API.DTOs;
using EduLearn.API.Models;
using EduLearn.API.Repositories.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace EduLearn.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CoursesController : ControllerBase
{
    // Repository pattern: controller talks to repository interface, NOT AppDbContext directly
    private readonly ICourseRepository _courseRepository;

    public CoursesController(ICourseRepository courseRepository)
    {
        _courseRepository = courseRepository;
    }

    // ── POST /api/courses — Create a new course in the catalog ──
    [HttpPost]
    public async Task<ActionResult<CourseResponseDto>> CreateCourse(CreateCourseDto dto)
    {
        // Check duplicate using repository method (searches by unique Code)
        var existing = await _courseRepository.GetByCodeAsync(dto.Code);
        if (existing is not null)
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

        // Repository handles Add + SaveChanges internally
        await _courseRepository.CreateAsync(course);

        return CreatedAtAction(nameof(GetCourse), new { id = course.CourseID }, MapToDto(course));
    }

    // ── GET /api/courses — List all courses ──
    [HttpGet]
    public async Task<ActionResult<List<CourseResponseDto>>> GetCourses()
    {
        // Repository returns all courses
        var courses = await _courseRepository.GetAllAsync();

        var response = courses.Select(c => MapToDto(c)).ToList();
        return Ok(response);
    }

    // ── GET /api/courses/{id} — Get one course by ID ──
    [HttpGet("{id}")]
    public async Task<ActionResult<CourseResponseDto>> GetCourse(int id)
    {
        var course = await _courseRepository.GetByIdAsync(id);

        if (course is null)
            return NotFound(new { error = "Course not found", code = "COURSE_NOT_FOUND" });

        return Ok(MapToDto(course));
    }

    // ── PUT /api/courses/{id} — Update a course ──
    [HttpPut("{id}")]
    public async Task<ActionResult<CourseResponseDto>> UpdateCourse(int id, CreateCourseDto dto)
    {
        var course = await _courseRepository.GetByIdAsync(id);

        if (course is null)
            return NotFound(new { error = "Course not found", code = "COURSE_NOT_FOUND" });

        // Update fields from DTO
        course.Title = dto.Title;
        course.Description = dto.Description;
        course.Credits = dto.Credits;
        course.DepartmentID = dto.DepartmentID;
        course.Level = dto.Level;
        course.PrerequisitesJSON = dto.PrerequisitesJSON;

        // Repository calls SaveChanges
        await _courseRepository.UpdateAsync(course);

        return Ok(MapToDto(course));
    }

    // Helper method that converts the entity to a response DTO
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
