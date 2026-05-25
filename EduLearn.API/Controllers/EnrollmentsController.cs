using EduLearn.API.DTOs;
using EduLearn.API.Models;
using EduLearn.API.Models.Enums;
using EduLearn.API.Repositories.Interfaces;          
using EduLearn.API.Services;                          
using Microsoft.AspNetCore.Authorization;           
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace EduLearn.API.Controllers;

[ApiController]
[Route("api/enrollment")]
[Authorize] // AUTH CHANGE: All endpoints require a valid JWT token
public class EnrollmentsController : ControllerBase
{
    // Changed from AppDbContext to repositories
    private readonly IEnrollmentRepository _enrollRepo;
    private readonly IStudentRepository _studentRepo;
    private readonly ISectionRepository _sectionRepo;
    private readonly INotificationService _notificationService;
    // AUDIT CHANGE (interim-polish): log enrollment state changes to the append-only audit trail
    // so the Auditor demo has meaningful IAM-04 content beyond auth events.
    private readonly AuditLogService _auditLogService;
    // requires prereq + conflict detection embedded in enroll POST.
    private readonly PrerequisiteEngine _prerequisiteEngine;
    private readonly TimetableConflictService _conflictService;

    public EnrollmentsController(
        IEnrollmentRepository enrollRepo,
        IStudentRepository studentRepo,
        ISectionRepository sectionRepo,
        INotificationService notificationService,
        AuditLogService auditLogService,
        PrerequisiteEngine prerequisiteEngine,
        TimetableConflictService conflictService)
    {
        _enrollRepo = enrollRepo;
        _studentRepo = studentRepo;
        _sectionRepo = sectionRepo;
        _notificationService = notificationService;
        _auditLogService = auditLogService;
        _prerequisiteEngine = prerequisiteEngine;
        _conflictService = conflictService;
    }

    /// <summary>
    /// Enroll a student in a section. Student, Registrar, and ITAdmin (EnrollmentPolicy).
    /// Students may only enroll themselves; auto-waitlists when section capacity is full.
    /// </summary>
    // AUTH CHANGE: Student, Registrar, ITAdmin can enroll
    [HttpPost("enroll")]
    [Authorize(Policy = "EnrollmentPolicy")]
    public async Task<ActionResult<EnrollmentResponseDto>> Enroll(
        CreateEnrollmentDto dto, CancellationToken cancellationToken)
    {
        var student = await _studentRepo.GetByIdAsync(dto.StudentID);
        if (student is null)
            return BadRequest(new { error = "Student not found", code = "STUDENT_NOT_FOUND" });

        // HARDENING (C-22): If caller is a Student, dto.StudentID must equal caller's own record.
        // Registrar/ITAdmin may pass any StudentID (they're doing bulk enrollment).
        var callerRole = User.FindFirst(ClaimTypes.Role)?.Value ?? string.Empty;
        if (callerRole == "Student" && student.UserID != int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0"))
            return StatusCode(403, new { error = "Students may only enroll themselves", code = "ENROLLMENT_FORBIDDEN" });

        // BUG-2 FIX (PRD §14.1): Validate prerequisites BEFORE reserving a seat.
        // We need the section first to know which course to check prerequisites against.
        // These read-only checks run outside the transaction — they cannot affect DB state.
        var sectionForChecks = await _sectionRepo.GetByIdWithCourseAsync(dto.SectionID);
        if (sectionForChecks is null)
            return BadRequest(new { error = "Section not found", code = "SECTION_NOT_FOUND" });

        var prereqResult = await _prerequisiteEngine.CheckAsync(sectionForChecks.CourseID, dto.StudentID);
        if (!prereqResult.AllPrerequisitesMet)
        {
            var unmet = prereqResult.Prerequisites
                .Where(p => !p.Met)
                .Select(p => $"{p.CourseCode} - {p.CourseTitle}")
                .ToList();
            return UnprocessableEntity(new
            {
                error = $"Prerequisites not met: {string.Join(", ", unmet)}",
                code = "PREREQUISITES_NOT_MET",
                unmetPrerequisites = unmet
            });
        }

        // BUG-2 FIX (PRD §14.1): Detect schedule conflicts against student's current enrollments.
        var conflict = await _conflictService.CheckAsync(dto.StudentID, dto.SectionID, cancellationToken);
        if (conflict is not null)
        {
            return UnprocessableEntity(new
            {
                error = $"Schedule conflict with {conflict.ConflictingCourseTitle} " +
                        $"on {string.Join(", ", conflict.OverlapDays)} at {conflict.OverlapTime}",
                code = "SCHEDULE_CONFLICT",
                conflictingSectionId = conflict.ConflictingSectionId,
                conflictingCourseCode = conflict.ConflictingCourseCode
            });
        }

        using var transaction = await _enrollRepo.BeginTransactionAsync();
        try
        {
            var section = await _sectionRepo.GetByIdWithCourseAsync(dto.SectionID);
            if (section is null)
            {
                await transaction.RollbackAsync(cancellationToken);
                return BadRequest(new { error = "Section not found", code = "SECTION_NOT_FOUND" });
            }

            // BUG-1 FIX: Check section is open before allowing enrollment
            if (section.Status != SectionStatus.Open)
            {
                await transaction.RollbackAsync(cancellationToken);
                return BadRequest(new
                {
                    error = "Section is not open for enrollment",
                    code = "SECTION_NOT_OPEN"
                });
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

            // FIX: If student was previously enrolled and dropped, reuse the existing
            // record instead of creating a new one (unique index on StudentID+SectionID)
            var existingDropped = await _enrollRepo.GetDroppedEnrollmentAsync(dto.StudentID, dto.SectionID);
            if (existingDropped is not null)
            {
                existingDropped.Status = status;
                existingDropped.WaitlistPosition = waitlistPosition;
                existingDropped.EnrolledAt = DateTime.UtcNow;
                await _enrollRepo.UpdateAsync(existingDropped);
                enrollment = existingDropped;
            }
            else
            {
                await _enrollRepo.CreateAsync(enrollment);
            }

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
                CourseID = section.CourseID,
                CourseName = section.Course.Title,
                Term = section.Term,
                Status = enrollment.Status,
                WaitlistPosition = enrollment.WaitlistPosition,
                GradePostedFlag = enrollment.GradePostedFlag,
                EnrolledAt = enrollment.EnrolledAt
            };

            // NHT-01: notify the student. After commit so a failed notify doesn't undo enrollment.
            var msg = status == EnrollmentStatus.Waitlisted
                ? $"Added to waitlist for {section.Course.Title} ({section.Term}) — position #{waitlistPosition}."
                : $"Enrolled in {section.Course.Title} ({section.Term}).";
            await _notificationService.NotifyAsync(
                student.UserID, NotificationCategory.Enrollment, NotificationSeverity.Info,
                msg, enrollment.EnrollID);

            // AUDIT CHANGE (interim-polish): record the enrollment event for IAM-04.
            await _auditLogService.LogAsync(
                int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                    ?? throw new InvalidOperationException("NameIdentifier claim missing")),
                "EnrollmentCreated",
                "Enrollment",
                enrollment.EnrollID,
                new { studentId = enrollment.StudentID, sectionId = enrollment.SectionID, status = enrollment.Status.ToString() });

            return StatusCode(StatusCodes.Status201Created, response);
        }
        catch
        {
            await transaction.RollbackAsync(cancellationToken);
            throw;
        }
    }

    /// <summary>
    /// Drop an enrollment by ID. Student, Registrar, and ITAdmin (EnrollmentPolicy).
    /// Students may only drop their own enrollments; promotes the next waitlisted student automatically.
    /// </summary>
    // AUTH CHANGE: Student, Registrar, ITAdmin can drop
    [HttpDelete("{id}/drop")]
    [Authorize(Policy = "EnrollmentPolicy")]
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

            // HARDENING (C-21): If caller is a Student, enrollment must belong to them.
            // Registrar/ITAdmin may drop any enrollment.
            var callerRole = User.FindFirst(ClaimTypes.Role)?.Value ?? string.Empty;
            if (callerRole == "Student")
            {
                var owner = await _studentRepo.GetByIdAsync(enrollment.StudentID);
                if (owner?.UserID != int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0"))
                {
                    await transaction.RollbackAsync(cancellationToken);
                    return StatusCode(403, new { error = "You may only drop your own enrollments", code = "ENROLLMENT_FORBIDDEN" });
                }
            }

            var wasEnrolled = enrollment.Status == EnrollmentStatus.Enrolled;
            enrollment.Status = EnrollmentStatus.Dropped;
            await _enrollRepo.UpdateAsync(enrollment);

            // AUDIT CHANGE (interim-polish): capture promoted enrollment so we can notify
            // the waitlisted-then-promoted student AFTER the transaction commits.
            int? promotedEnrollId = null;
            int? promotedStudentId = null;

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
                        promotedEnrollId = nextInLine.EnrollID;
                        promotedStudentId = nextInLine.StudentID;

                        // BUG-3 FIX: Flush promoted student to DB before renumbering
                        // to avoid EF Core returning stale cached data
                        await _enrollRepo.SaveChangesAsync();

                        // Shift remaining waitlist positions (2,3,4... → 1,2,3...)
                        var remainingWaitlisted = await _enrollRepo.GetWaitlistedBySectionAsync(enrollment.SectionID);
                        var newPosition = 1;
                        foreach (var waitlisted in remainingWaitlisted)
                        {
                            waitlisted.WaitlistPosition = newPosition;
                            await _enrollRepo.UpdateAsync(waitlisted);
                            newPosition++;
                        }
                    }

                    await _sectionRepo.UpdateAsync(section);
                }
            }

            await transaction.CommitAsync(cancellationToken);

            // NHT-01: notify the student their enrollment was dropped (Warning severity).
            var droppedStudent = await _studentRepo.GetByIdAsync(enrollment.StudentID);
            var droppedSection = await _sectionRepo.GetByIdWithCourseAsync(enrollment.SectionID);
            var courseTitle = droppedSection?.Course.Title ?? $"Section #{enrollment.SectionID}";
            var term = droppedSection?.Term ?? string.Empty;

            if (droppedStudent is not null)
            {
                await _notificationService.NotifyAsync(
                    droppedStudent.UserID, NotificationCategory.Enrollment, NotificationSeverity.Warning,
                    $"Dropped from {courseTitle} ({term}).", enrollment.EnrollID);
            }

            // NHT-01 (interim-polish): notify the promoted waitlist student that they're now enrolled.
            if (promotedStudentId.HasValue && promotedEnrollId.HasValue)
            {
                var promotedStudent = await _studentRepo.GetByIdAsync(promotedStudentId.Value);
                if (promotedStudent is not null)
                {
                    await _notificationService.NotifyAsync(
                        promotedStudent.UserID,
                        NotificationCategory.Enrollment,
                        NotificationSeverity.Info,
                        $"You have been promoted from the waitlist and are now enrolled in {courseTitle} ({term}).",
                        promotedEnrollId.Value);
                }
            }

            // AUDIT CHANGE (interim-polish): record the drop event for IAM-04.
            await _auditLogService.LogAsync(
                int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                    ?? throw new InvalidOperationException("NameIdentifier claim missing")),
                "EnrollmentDropped",
                "Enrollment",
                enrollment.EnrollID,
                new { studentId = enrollment.StudentID, sectionId = enrollment.SectionID, promotedEnrollId });

            return NoContent();
        }
        catch
        {
            await transaction.RollbackAsync(cancellationToken);
            throw;
        }
    }

    /// <summary>
    /// List all enrollments for a student. EnrollmentViewPolicy (Student, Instructor, Registrar, ITAdmin).
    /// Students may only view their own enrollment records.
    /// </summary>
    // AUTH CHANGE: Student, Instructor, Registrar, ITAdmin can view student enrollments
    [HttpGet("student/{studentId}")]
    [Authorize(Policy = "EnrollmentViewPolicy")]
    public async Task<ActionResult<IEnumerable<EnrollmentResponseDto>>> GetByStudent(
        int studentId, CancellationToken cancellationToken)
    {
        // HARDENING (C-14/F-4): Student role may only read their own enrollments.
        var callerRole = User.FindFirst(ClaimTypes.Role)?.Value ?? string.Empty;
        if (callerRole == "Student")
        {
            var target = await _studentRepo.GetByIdAsync(studentId);
            if (target?.UserID != int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0"))
                return StatusCode(403, new { error = "You may only view your own enrollments", code = "ENROLLMENT_FORBIDDEN" });
        }

        var enrollments = await _enrollRepo.GetByStudentIdAsync(studentId);

        var result = enrollments.Select(e => new EnrollmentResponseDto
        {
            EnrollID = e.EnrollID,
            StudentID = e.StudentID,
            StudentName = e.Student.Name,
            SectionID = e.SectionID,
            CourseName = e.Section.Course.Title,
            CourseID = e.Section.CourseID,
            Term = e.Section.Term,
            Status = e.Status,
            WaitlistPosition = e.WaitlistPosition,
            GradePostedFlag = e.GradePostedFlag,
            EnrolledAt = e.EnrolledAt
        });

        return Ok(result);
    }

    /// <summary>
    /// List all enrollments for a section (roster view). RosterViewPolicy (Instructor, Registrar, DeptAdmin, ITAdmin).
    /// </summary>
    // AUTH CHANGE: Instructor, Registrar, DeptAdmin, ITAdmin can view section roster
    [HttpGet("section/{sectionId}")]
    [Authorize(Policy = "RosterViewPolicy")]
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
            CourseID = e.Section.CourseID,
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
