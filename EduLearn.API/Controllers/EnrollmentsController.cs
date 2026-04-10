using EduLearn.API.Data;
using EduLearn.API.DTOs;
using EduLearn.API.Models;
using EduLearn.API.Models.Enums;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EduLearn.API.Controllers;

[ApiController]
[Route("api/enrollment")]
public class EnrollmentsController : ControllerBase
{
    private readonly AppDbContext _context;

    public EnrollmentsController(AppDbContext context)
    {
        _context = context;
    }

    [HttpPost("enroll")]
    public async Task<ActionResult<EnrollmentResponseDto>> Enroll(CreateEnrollmentDto dto, CancellationToken cancellationToken)
    {
        // ── Validation (read-only, outside transaction) ──
        var student = await _context.Students
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.StudentID == dto.StudentID, cancellationToken);

        if (student is null)
            return BadRequest(new { error = "Student not found", code = "STUDENT_NOT_FOUND" });

        // ── Transaction-wrapped enrollment ──
        using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);
        try
        {
            var section = await _context.Sections
                .Include(s => s.Course)
                .FirstOrDefaultAsync(s => s.SectionID == dto.SectionID, cancellationToken);

            if (section is null)
            {
                await transaction.RollbackAsync(cancellationToken);
                return BadRequest(new { error = "Section not found", code = "SECTION_NOT_FOUND" });
            }

            if (await _context.Enrollments.AnyAsync(
                e => e.StudentID == dto.StudentID && e.SectionID == dto.SectionID && e.Status != EnrollmentStatus.Dropped, cancellationToken))
            {
                await transaction.RollbackAsync(cancellationToken);
                return Conflict(new { error = "Student is already enrolled in this section", code = "DUPLICATE_ENROLLMENT" });
            }

            var status = EnrollmentStatus.Enrolled;
            int? waitlistPosition = null;

            if (section.EnrolledCount >= section.Capacity)
            {
                status = EnrollmentStatus.Waitlisted;
                var maxPosition = await _context.Enrollments
                    .Where(e => e.SectionID == dto.SectionID && e.Status == EnrollmentStatus.Waitlisted)
                    .MaxAsync(e => (int?)e.WaitlistPosition, cancellationToken) ?? 0;
                waitlistPosition = maxPosition + 1;
            }

            var enrollment = new Enrollment
            {
                StudentID = dto.StudentID,
                SectionID = dto.SectionID,
                Status = status,
                WaitlistPosition = waitlistPosition
            };

            _context.Enrollments.Add(enrollment);

            if (status == EnrollmentStatus.Enrolled)
            {
                section.EnrolledCount++;
            }

            await _context.SaveChangesAsync(cancellationToken);
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

    [HttpDelete("{id}/drop")]
    public async Task<IActionResult> Drop(int id, CancellationToken cancellationToken)
    {
        using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);
        try
        {
            var enrollment = await _context.Enrollments
                .FirstOrDefaultAsync(e => e.EnrollID == id, cancellationToken);

            if (enrollment is null)
            {
                await transaction.RollbackAsync(cancellationToken);
                return NotFound(new { error = "Enrollment not found", code = "ENROLLMENT_NOT_FOUND" });
            }

            var wasEnrolled = enrollment.Status == EnrollmentStatus.Enrolled;
            enrollment.Status = EnrollmentStatus.Dropped;

            if (wasEnrolled)
            {
                var section = await _context.Sections.FirstAsync(s => s.SectionID == enrollment.SectionID, cancellationToken);
                section.EnrolledCount--;

                // Auto-promote first waitlisted student
                var nextInLine = await _context.Enrollments
                    .Where(e => e.SectionID == enrollment.SectionID && e.Status == EnrollmentStatus.Waitlisted)
                    .OrderBy(e => e.WaitlistPosition)
                    .FirstOrDefaultAsync(cancellationToken);

                if (nextInLine is not null)
                {
                    nextInLine.Status = EnrollmentStatus.Enrolled;
                    nextInLine.WaitlistPosition = null;
                    section.EnrolledCount++;
                }
            }

            await _context.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
            return NoContent();
        }
        catch
        {
            await transaction.RollbackAsync(cancellationToken);
            throw;
        }
    }

    [HttpGet("student/{studentId}")]
    public async Task<ActionResult<List<EnrollmentResponseDto>>> GetByStudent(int studentId, CancellationToken cancellationToken)
    {
        var enrollments = await _context.Enrollments
            .AsNoTracking()
            .Where(e => e.StudentID == studentId)
            .Include(e => e.Student)
            .Include(e => e.Section)
                .ThenInclude(s => s.Course)
            .Select(e => new EnrollmentResponseDto
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
            })
            .ToListAsync(cancellationToken);

        return Ok(enrollments);
    }

    [HttpGet("section/{sectionId}")]
    public async Task<ActionResult<List<EnrollmentResponseDto>>> GetBySection(int sectionId, CancellationToken cancellationToken)
    {
        var enrollments = await _context.Enrollments
            .AsNoTracking()
            .Where(e => e.SectionID == sectionId)
            .Include(e => e.Student)
            .Include(e => e.Section)
                .ThenInclude(s => s.Course)
            .Select(e => new EnrollmentResponseDto
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
            })
            .ToListAsync(cancellationToken);

        return Ok(enrollments);
    }
}
