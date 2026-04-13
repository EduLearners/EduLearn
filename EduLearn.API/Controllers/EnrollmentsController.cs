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
    private readonly IEnrollmentRepository _enrollRepo;
    private readonly IStudentRepository _studentRepo;
    private readonly ISectionRepository _sectionRepo;

    public EnrollmentsController(
        IEnrollmentRepository enrollRepo,
        IStudentRepository studentRepo,
        ISectionRepository sectionRepo)
    {
        _enrollRepo = enrollRepo;
        _studentRepo = studentRepo;
        _sectionRepo = sectionRepo;
    }

    // POST /api/enrollment/enroll
    [HttpPost("enroll")]
    public async Task<ActionResult<EnrollmentResponseDto>> Enroll(
        CreateEnrollmentDto dto, CancellationToken cancellationToken)
    {
        var student = await _studentRepo.GetByIdAsync(dto.StudentID);
        if (student is null)
            return BadRequest(new { error = "Student not found", code = "STUDENT_NOT_FOUND" });

        using var transaction = await _enrollRepo.BeginTransactionAsync();
        try
        {
            var section = await _sectionRepo.GetByIdWithCourseAsync(dto.SectionID);
            if (section is null)
            {
                await transaction.RollbackAsync(cancellationToken);
                return BadRequest(new { error = "Section not found", code = "SECTION_NOT_FOUND" });
            }

            var isDuplicate = await _enrollRepo.IsAlreadyEnrolledAsync(dto.StudentID, dto.SectionID);
            if (isDuplicate)
            {
                await transaction.RollbackAsync(cancellationToken);
                return Conflict(new
                {
                    error = "Student is already enrolled in this section",
                    code = "DUPLICATE_ENROLLMENT"
                });
            }

            var status = EnrollmentStatus.Enrolled;
            int? waitlistPosition = null;

            if (section.EnrolledCount >= section.Capacity)
            {
                status = EnrollmentStatus.Waitlisted;
                var maxPosition = await _enrollRepo.GetMaxWaitlistPositionAsync(dto.SectionID);
                waitlistPosition = maxPosition + 1;
            }

            var enrollment = new Enrollment
            {
                StudentID = dto.StudentID,
                SectionID = dto.SectionID,
                Status = status,
                WaitlistPosition = waitlistPosition
            };

            await _enrollRepo.CreateAsync(enrollment);

            if (status == EnrollmentStatus.Enrolled)
            {
                section.EnrolledCount++;
                await _sectionRepo.UpdateAsync(section);
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

    // DELETE /api/enrollment/{id}/drop
    [HttpDelete("{id}/drop")]
    public async Task<IActionResult> Drop(int id, CancellationToken cancellationToken)
    {
        using var transaction = await _enrollRepo.BeginTransactionAsync();
        try
        {
            var enrollment = await _enrollRepo.GetByIdAsync(id);
            if (enrollment is null)
            {
                await transaction.RollbackAsync(cancellationToken);
                return NotFound(new { error = "Enrollment not found", code = "ENROLLMENT_NOT_FOUND" });
            }

            var wasEnrolled = enrollment.Status == EnrollmentStatus.Enrolled;
            enrollment.Status = EnrollmentStatus.Dropped;
            await _enrollRepo.UpdateAsync(enrollment);

            if (wasEnrolled)
            {
                var section = await _sectionRepo.GetByIdAsync(enrollment.SectionID);
                if (section is not null)
                {
                    section.EnrolledCount--;

                    var nextInLine = await _enrollRepo.GetFirstWaitlistedAsync(enrollment.SectionID);
                    if (nextInLine is not null)
                    {
                        nextInLine.Status = EnrollmentStatus.Enrolled;
                        nextInLine.WaitlistPosition = null;
                        await _enrollRepo.UpdateAsync(nextInLine);
                        section.EnrolledCount++;
                    }

                    await _sectionRepo.UpdateAsync(section);
                }
            }

            await transaction.CommitAsync(cancellationToken);
            return NoContent();
        }
        catch
        {
            await transaction.RollbackAsync(cancellationToken);
            throw;
        }
    }

    // GET /api/enrollment/student/{studentId}
    [HttpGet("student/{studentId}")]
    public async Task<ActionResult<IEnumerable<EnrollmentResponseDto>>> GetByStudent(
        int studentId, CancellationToken cancellationToken)
    {
        var enrollments = await _enrollRepo.GetByStudentIdAsync(studentId);

        var result = enrollments.Select(e => new EnrollmentResponseDto
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
        });

        return Ok(result);
    }

    // GET /api/enrollment/section/{sectionId}
    [HttpGet("section/{sectionId}")]
    public async Task<ActionResult<IEnumerable<EnrollmentResponseDto>>> GetBySection(
        int sectionId, CancellationToken cancellationToken)
    {
        var enrollments = await _enrollRepo.GetBySectionIdAsync(sectionId);

        var result = enrollments.Select(e => new EnrollmentResponseDto
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
        });

        return Ok(result);
    }
}
