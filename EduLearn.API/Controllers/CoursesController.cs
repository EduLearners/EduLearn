using EduLearn.API.DTOs;
using EduLearn.API.Models;
using EduLearn.API.Repositories.Interfaces;
using EduLearn.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EduLearn.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize] 
public class CoursesController : ControllerBase
{
    private readonly ICourseRepository _courseRepository;
    private readonly PrerequisiteEngine _prerequisiteEngine;
    private readonly IStudentRepository _studentRepository;

    public CoursesController(
        ICourseRepository courseRepository,
        PrerequisiteEngine prerequisiteEngine,
        IStudentRepository studentRepository)
    {
        _courseRepository    = courseRepository;
        _prerequisiteEngine  = prerequisiteEngine;
        _studentRepository   = studentRepository;
    }

    /// <summary>
    /// Create a new course. CourseManager policy (Instructor / ITAdmin) only.
    /// Returns 409 if a course with the same code already exists.
    /// </summary>
    [HttpPost]
    [Authorize(Policy = "CourseManagerPolicy")]
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

    /// <summary>
    /// List all courses. All authenticated users (AllUsersPolicy).
    /// </summary>
    [HttpGet]
    [Authorize(Policy = "AllUsersPolicy")]
    public async Task<ActionResult<List<CourseResponseDto>>> GetCourses()
    {
        var courses = await _courseRepository.GetAllAsync();
        return Ok(courses.Select(c => MapToDto(c)).ToList());
    }

    /// <summary>
    /// Retrieve a single course by ID. All authenticated users (AllUsersPolicy).
    /// Returns 404 if the course does not exist.
    /// </summary>
    [HttpGet("{id}")]
    [Authorize(Policy = "AllUsersPolicy")]
    public async Task<ActionResult<CourseResponseDto>> GetCourse(int id)
    {
        var course = await _courseRepository.GetByIdAsync(id);

        if (course is null)
            return NotFound(new { error = "Course not found", code = "COURSE_NOT_FOUND" });

        return Ok(MapToDto(course));
    }

    /// <summary>
    /// Update an existing course. CourseManager policy (Instructor / ITAdmin) only.
    /// Returns 404 if the course does not exist.
    /// </summary>
    [HttpPut("{id}")]
    [Authorize(Policy = "CourseManagerPolicy")]
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

    // ── GET /api/courses/{id}/check-prerequisites/{studentId} ──
    // CCM-03: Checks if a student has completed all prerequisites for a course.
    // Multi-table join: Course.PrerequisitesJSON → Sections → Enrollments (GradePostedFlag = true)
    /// <summary>
    /// Check whether a student has satisfied all prerequisites for a course. All authenticated users.
    /// Returns 404 if either the course or the student does not exist.
    /// </summary>
    [HttpGet("{id}/check-prerequisites/{studentId}")]
    [Authorize(Policy = "AllUsersPolicy")]
    public async Task<ActionResult<PrerequisiteCheckResponseDto>> CheckPrerequisites(
        int id, int studentId)
    {
        // Validate the course exists
        var course = await _courseRepository.GetByIdAsync(id);
        if (course is null)
            return NotFound(new { error = "Course not found", code = "COURSE_NOT_FOUND" });

        // Validate the student exists — PrerequisiteEngine uses null-forgiving operator
        // so we validate here to return a clean 404 instead of a NullReferenceException
        var studentExists = await _studentRepository.ExistsAsync(studentId);
        if (!studentExists)
            return NotFound(new { error = "Student not found", code = "STUDENT_NOT_FOUND" });

        // Delegate full logic to PrerequisiteEngine service
        var result = await _prerequisiteEngine.CheckAsync(id, studentId);
        return Ok(result);
    }
}