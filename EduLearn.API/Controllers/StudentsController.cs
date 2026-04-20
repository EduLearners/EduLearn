using EduLearn.API.DTOs;
using EduLearn.API.Extensions;
using EduLearn.API.Models;
using EduLearn.API.Models.Enums;
using EduLearn.API.Repositories.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace EduLearn.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class StudentsController : ControllerBase
{
    private readonly IStudentRepository _studentRepo;
    private readonly IUserRepository _userRepo;
    private readonly IProgramRepository _programRepo;

    public StudentsController(
        IStudentRepository studentRepo,
        IUserRepository userRepo,
        IProgramRepository programRepo)
    {
        _studentRepo = studentRepo;
        _userRepo = userRepo;
        _programRepo = programRepo;
    }

    // POST /api/students — Create a new student after applicant is accepted
    // HARDENING C-8: PRD §6.2 SRA-02 requires Registrar (or ITAdmin) for student writes.
    [HttpPost]
    [Authorize(Roles = "Registrar,ITAdmin")]
    public async Task<ActionResult<StudentResponseDto>> CreateStudent(
        CreateStudentDto dto, CancellationToken cancellationToken)
    {
        // Validate that the User exists
        var user = await _userRepo.GetByIdAsync(dto.UserID);
        if (user is null)
            return BadRequest(new
            {
                error = "User not found. Create a User account first.",
                code = "USER_NOT_FOUND"
            });

        // Validate that the User has Student role
        if (user.Role != UserRole.Student)
            return BadRequest(new
            {
                error = "The specified user does not have the Student role",
                code = "INVALID_USER_ROLE"
            });

        // Check if this User is already linked to a Student (UserID is unique)
        var existingStudent = await _studentRepo.GetByUserIdAsync(dto.UserID);
        if (existingStudent is not null)
            return Conflict(new
            {
                error = "This user already has a student record",
                code = "DUPLICATE_STUDENT"
            });

        // Validate that the Program exists
        var programExists = await _programRepo.ExistsAsync(dto.ProgramID);
        if (!programExists)
            return BadRequest(new
            {
                error = "Program not found",
                code = "PROGRAM_NOT_FOUND"
            });

        // Auto-generate MRN (Student Registration Number)
        // Format: STU-00001, STU-00002, etc.
        var count = await _studentRepo.GetCountAsync();
        var mrn = $"STU-{count + 1:D5}";

        var student = new Student
        {
            UserID = dto.UserID,
            MRN = mrn,
            Name = dto.Name,
            DOB = dto.DOB,
            Gender = dto.Gender,
            ContactInfoJSON = dto.ContactInfoJSON,
            ProgramID = dto.ProgramID,
            EntryTerm = dto.EntryTerm,
            ExpectedGraduationTerm = dto.ExpectedGraduationTerm
        };

        // HARDENING M-3: MRN is generated from count+1, which races under concurrent
        // POSTs and can violate the unique index on Students.MRN. Catch the SQL unique
        // constraint violation (2601 = unique index, 2627 = unique constraint) and
        // return 409 so the client can retry, instead of bubbling up as a 500.
        try
        {
            var created = await _studentRepo.CreateAsync(student);
            return CreatedAtAction(nameof(GetStudent),
                new { id = created.StudentID }, MapToDto(created));
        }
        catch (DbUpdateException ex) when (ex.InnerException is SqlException sqlEx
            && (sqlEx.Number == 2601 || sqlEx.Number == 2627))
        {
            return Conflict(new
            {
                error = "MRN collision — please retry",
                code = "DUPLICATE_MRN"
            });
        }
    }

    // GET /api/students
    // HARDENING C-8: PRD line 1826 — list access restricted to staff roles.
    // Students must never enumerate peers (PII leak).
    [HttpGet]
    [Authorize(Roles = "Registrar,Instructor,ITAdmin")]
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

        // HARDENING C-8: Students may only read their own record — prevents
        // cross-student PII reads by id enumeration. Staff roles (Registrar,
        // Instructor, ITAdmin) fall through unchecked.
        if (User.GetUserRole() == "Student" && student.UserID != User.GetUserId())
            return StatusCode(403, new
            {
                error = "You may only view your own student record",
                code = "STUDENT_FORBIDDEN"
            });

        return Ok(MapToDto(student));
    }

    // PUT /api/students/{id}
    // HARDENING C-8: PRD §6.2 SRA-02 — only Registrar (or ITAdmin) may mutate students.
    [Authorize(Roles = "Registrar,ITAdmin")]
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

    private static StudentResponseDto MapToDto(Student s) => new()
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
