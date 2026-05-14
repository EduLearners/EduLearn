using EduLearn.API.DTOs;
using EduLearn.API.Models;
using EduLearn.API.Models.Enums;
using EduLearn.API.Repositories.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

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
    /// <summary>
    /// Create a new student record linked to an existing User with the Student role. Registrar and ITAdmin only.
    /// Generates a collision-safe MRN and validates the user, role, and program before persisting.
    /// </summary>
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

        // BUG-2 FIX: Guid-based MRN to avoid race condition under concurrent requests
        var mrn = $"STU-{Guid.NewGuid().ToString("N")[..8].ToUpper()}";

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

    /// <summary>
    /// List all student records. Registrar, Instructor, and ITAdmin only.
    /// </summary>
    [HttpGet]
    [Authorize(Roles = "Registrar,Instructor,ITAdmin")]
    public async Task<ActionResult<IEnumerable<StudentResponseDto>>> GetStudents(
        CancellationToken cancellationToken)
    {
        var students = await _studentRepo.GetAllAsync();
        return Ok(students.Select(MapToDto));
    }

    /// <summary>
    /// Returns the student record for the currently authenticated Student user.
    /// Resolves StudentID from the JWT UserID claim — no ID needed in the URL.
    /// </summary>
    [HttpGet("me")]
    [Authorize(Roles = "Student")]
    public async Task<ActionResult<StudentResponseDto>> GetMyStudentRecord()
    {
        var callerId = int.Parse(
            User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? throw new InvalidOperationException("NameIdentifier claim missing"));

        var student = await _studentRepo.GetByUserIdAsync(callerId);

        if (student is null)
            return NotFound(new
            {
                error = "No student record found for your account. Please contact the Registrar.",
                code = "STUDENT_NOT_FOUND"
            });

        return Ok(MapToDto(student));
    }

    // GET /api/students/{id}
    /// <summary>
    /// Retrieve a single student record by ID. Any authenticated user may call this endpoint.
    /// Students may only view their own record; privileged roles may view any.
    /// </summary>
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

   
        if ((User.FindFirst(ClaimTypes.Role)?.Value ?? string.Empty) == "Student" && student.UserID != int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0"))
            return StatusCode(403, new
            {
                error = "You may only view your own student record",
                code = "STUDENT_FORBIDDEN"
            });

        return Ok(MapToDto(student));
    }

    /// <summary>
    /// Update a student's personal details and enrollment status. Registrar and ITAdmin only.
    /// Allows lifecycle status transitions such as Active to Graduated or Withdrawn.
    /// </summary>
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

        // BUG-5 FIX: Allow lifecycle status updates
        if (dto.EnrollmentStatus.HasValue)
            student.EnrollmentStatus = dto.EnrollmentStatus.Value;

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
