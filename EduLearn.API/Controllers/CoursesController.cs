using EduLearn.API.DTOs;
using EduLearn.API.Models;
using EduLearn.API.Repositories.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace EduLearn.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CoursesController : ControllerBase
{
    private readonly ICourseRepository _courseRepository;

    public CoursesController(ICourseRepository courseRepository)
    {
        _courseRepository = courseRepository;
    }

    [HttpPost]
    public async Task<ActionResult<CourseResponseDto>> CreateCourse(CreateCourseDto dto)
    {
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

        await _courseRepository.CreateAsync(course);
        return CreatedAtAction(nameof(GetCourse), new { id = course.CourseID }, MapToDto(course));
    }

    [HttpGet]
    public async Task<ActionResult<List<CourseResponseDto>>> GetCourses()
    {
        var courses = await _courseRepository.GetAllAsync();
        return Ok(courses.Select(c => MapToDto(c)).ToList());
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<CourseResponseDto>> GetCourse(int id)
    {
        var course = await _courseRepository.GetByIdAsync(id);

        if (course is null)
            return NotFound(new { error = "Course not found", code = "COURSE_NOT_FOUND" });

        return Ok(MapToDto(course));
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<CourseResponseDto>> UpdateCourse(int id, CreateCourseDto dto)
    {
        var course = await _courseRepository.GetByIdAsync(id);

        if (course is null)
            return NotFound(new { error = "Course not found", code = "COURSE_NOT_FOUND" });

        course.Title = dto.Title;
        course.Description = dto.Description;
        course.Credits = dto.Credits;
        course.DepartmentID = dto.DepartmentID;
        course.Level = dto.Level;
        course.PrerequisitesJSON = dto.PrerequisitesJSON;

        await _courseRepository.UpdateAsync(course);
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
