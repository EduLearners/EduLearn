using EduLearn.API.DTOs;
using EduLearn.API.Repositories.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace EduLearn.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class StudentsController : ControllerBase
{
    private readonly IStudentRepository _studentRepo;

    public StudentsController(IStudentRepository studentRepo)
    {
        _studentRepo = studentRepo;
    }

    // GET /api/students
    [HttpGet]
    public async Task<ActionResult<IEnumerable<StudentResponseDto>>> GetStudents(
        CancellationToken cancellationToken)
    {
        var students = await _studentRepo.GetAllAsync();
        return Ok(students.Select(MapToDto));
    }

    // GET /api/students/{id}
    [HttpGet("{id}")]
    public async Task<ActionResult<StudentResponseDto>> GetStudent(
        int id, CancellationToken cancellationToken)
    {
        var student = await _studentRepo.GetByIdAsync(id);

        if (student is null)
            return NotFound(new
            {
                error = "Student not found",
                code = "STUDENT_NOT_FOUND"
            });

        return Ok(MapToDto(student));
    }

    // PUT /api/students/{id}
    [HttpPut("{id}")]
    public async Task<ActionResult<StudentResponseDto>> UpdateStudent(
        int id, UpdateStudentDto dto, CancellationToken cancellationToken)
    {
        var student = await _studentRepo.GetByIdAsync(id);

        if (student is null)
            return NotFound(new
            {
                error = "Student not found",
                code = "STUDENT_NOT_FOUND"
            });

        student.Name = dto.Name;
        student.Gender = dto.Gender;
        student.ContactInfoJSON = dto.ContactInfoJSON;
        student.ExpectedGraduationTerm = dto.ExpectedGraduationTerm;

        var updated = await _studentRepo.UpdateAsync(student);
        return Ok(MapToDto(updated));
    }

    private static StudentResponseDto MapToDto(Models.Student s) => new()
    {
        StudentID = s.StudentID,
        UserID = s.UserID,
        MRN = s.MRN,
        Name = s.Name,
        DOB = s.DOB,
        Gender = s.Gender,
        ContactInfoJSON = s.ContactInfoJSON,
        EnrollmentStatus = s.EnrollmentStatus,
        ProgramID = s.ProgramID,
        EntryTerm = s.EntryTerm,
        ExpectedGraduationTerm = s.ExpectedGraduationTerm,
        CreatedAt = s.CreatedAt
    };
}
