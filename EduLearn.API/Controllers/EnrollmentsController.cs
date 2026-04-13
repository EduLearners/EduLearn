using EduLearn.API.Data;
using EduLearn.API.DTOs;
using EduLearn.API.Models;
using EduLearn.API.Models.Enums;
using EduLearn.API.Repositories.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace EduLearn.API.Controllers;

[ApiController]
[Route("api/enrollment")]
public class EnrollmentsController : ControllerBase
{
    // Repository pattern: data access through repository interfaces
    private readonly IEnrollmentRepository _enrollmentRepository;
    private readonly IStudentRepository _studentRepository;
    private readonly ISectionRepository _sectionRepository;

    // AppDbContext is only used for transaction management (BeginTransaction)
    // All data access goes through repositories
    private readonly AppDbContext _context;

    public EnrollmentsController(
        IEnrollmentRepository enrollmentRepository,
        IStudentRepository studentRepository,
        ISectionRepository sectionRepository,
        AppDbContext context)
    {
        _enrollmentRepository = enrollmentRepository;
        _studentRepository = studentRepository;
        _sectionRepository = sectionRepository;
        _context = context;
    }

    // ── POST /api/enrollment/enroll — Enroll student in a section ──
    [HttpPost("enroll")]
    public async Task<ActionResult<EnrollmentResponseDto>> Enroll(CreateEnrollmentDto dto, CancellationToken cancellationToken)
    {
        // ── Validation (read-only, outside transaction) ──
        var student = await _studentRepository.GetByIdAsync(dto.StudentID);

        if (student is null)
            return BadRequest(new { error = "Student not found", code = "STUDENT_NOT_FOUND" });

        // ── Transaction-wrapped enrollment ──
        // Note: AppDbContext is used ONLY for transaction management here
        // All data access still goes through repositories
        using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);
        try
        {
            // Get section with Course loaded (for CourseName in response)
            var section = await _sectionRepository.GetByIdWithCourseAsync(dto.SectionID);

            if (section is null)
            {
                await transaction.RollbackAsync(cancellationToken);
                return BadRequest(new { error = "Section not found", code = "SECTION_NOT_FOUND" });
            }

            // Check for duplicate active enrollment using repository
            if (await _enrollmentRepository.HasActiveEnrollmentAsync(dto.StudentID, dto.SectionID))
            {
                await transaction.RollbackAsync(cancellationToken);
                return Conflict(new { error = "Student is already enrolled in this section", code = "DUPLICATE_ENROLLMENT" });
            }

            var status = EnrollmentStatus.Enrolled;
            int? waitlistPosition = null;

            // If section is full, put on waitlist
            if (section.EnrolledCount >= section.Capacity)
            {
                status = EnrollmentStatus.Waitlisted;
                var maxPosition = await _enrollmentRepository.GetMaxWaitlistPositionAsync(dto.SectionID);
                waitlistPosition = maxPosition + 1;
            }

            var enrollment = new Enrollment
            {
                StudentID = dto.StudentID,
                SectionID = dto.SectionID,
                Status = status,
                WaitlistPosition = waitlistPosition
            };

            // Repository handles Add + SaveChanges
            await _enrollmentRepository.CreateAsync(enrollment);

            if (status == EnrollmentStatus.Enrolled)
            {
                section.EnrolledCount++;
                await _sectionRepository.SaveChangesAsync();
            }

            await transaction.CommitAsync(cancellationToken);

            var response = new EnrollmentResponseDto
            {
                EnrollID = enrollment.EnrollID,
                StudentID = enrollment.StudentID,
                StudentName = student.Name,
                SectionID = enrollment.SectionID,
                CourseName = section.Course.Title,
                Term = section.Term,
                Status = enrollment.Status,
                WaitlistPosition = enrollment.WaitlistPosition,
                GradePostedFlag = enrollment.GradePostedFlag,
                EnrolledAt = enrollment.EnrolledAt
            };

            return StatusCode(StatusCodes.Status201Created, response);
        }
        catch
        {
            await transaction.RollbackAsync(cancellationToken);
            throw;
        }
    }

    // ── DELETE /api/enrollment/{id}/drop — Drop enrollment (auto-promote waitlist) ──
    [HttpDelete("{id}/drop")]
    public async Task<IActionResult> Drop(int id, CancellationToken cancellationToken)
    {
        using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);
        try
        {
            var enrollment = await _enrollmentRepository.GetByIdAsync(id);

            if (enrollment is null)
            {
                await transaction.RollbackAsync(cancellationToken);
                return NotFound(new { error = "Enrollment not found", code = "ENROLLMENT_NOT_FOUND" });
            }

            var wasEnrolled = enrollment.Status == EnrollmentStatus.Enrolled;
            enrollment.Status = EnrollmentStatus.Dropped;

            if (wasEnrolled)
            {
                var section = await _sectionRepository.GetByIdAsync(enrollment.SectionID);
                section!.EnrolledCount--;

                // Auto-promote first waitlisted student using repository
                var nextInLine = await _enrollmentRepository.GetFirstWaitlistedAsync(enrollment.SectionID);

                if (nextInLine is not null)
                {
                    nextInLine.Status = EnrollmentStatus.Enrolled;
                    nextInLine.WaitlistPosition = null;
                    section.EnrolledCount++;
                }
            }

            // Save all changes (enrollment status + section count + promoted student)
            await _enrollmentRepository.SaveChangesAsync();
            await transaction.CommitAsync(cancellationToken);
            return NoContent();
        }
        catch
        {
            await transaction.RollbackAsync(cancellationToken);
            throw;
        }
    }

    // ── GET /api/enrollment/student/{studentId} — Student's current enrollments ──
    [HttpGet("student/{studentId}")]
    public async Task<ActionResult<List<EnrollmentResponseDto>>> GetByStudent(int studentId)
    {
        // Repository returns enrollments with Student, Section, and Course navigation loaded
        var enrollments = await _enrollmentRepository.GetByStudentIdWithDetailsAsync(studentId);

        var response = enrollments.Select(e => new EnrollmentResponseDto
        {
            EnrollID = e.EnrollID,
            StudentID = e.StudentID,
            StudentName = e.Student.Name,
            SectionID = e.SectionID,
            CourseName = e.Section.Course.Title,
            Term = e.Section.Term,
            Status = e.Status,
            WaitlistPosition = e.WaitlistPosition,
            GradePostedFlag = e.GradePostedFlag,
            EnrolledAt = e.EnrolledAt
        }).ToList();

        return Ok(response);
    }

    // ── GET /api/enrollment/section/{sectionId} — Section roster ──
    [HttpGet("section/{sectionId}")]
    public async Task<ActionResult<List<EnrollmentResponseDto>>> GetBySection(int sectionId)
    {
        // Repository returns enrollments with Student, Section, and Course navigation loaded
        var enrollments = await _enrollmentRepository.GetBySectionIdWithDetailsAsync(sectionId);

        var response = enrollments.Select(e => new EnrollmentResponseDto
        {
            EnrollID = e.EnrollID,
            StudentID = e.StudentID,
            StudentName = e.Student.Name,
            SectionID = e.SectionID,
            CourseName = e.Section.Course.Title,
            Term = e.Section.Term,
            Status = e.Status,
            WaitlistPosition = e.WaitlistPosition,
            GradePostedFlag = e.GradePostedFlag,
            EnrolledAt = e.EnrolledAt
        }).ToList();

        return Ok(response);
    }
}
