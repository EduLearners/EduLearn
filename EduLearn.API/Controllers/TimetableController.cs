using EduLearn.API.DTOs;
using EduLearn.API.Models.Enums;
using EduLearn.API.Repositories.Interfaces;
using EduLearn.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace EduLearn.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TimetableController : ControllerBase
{
    private readonly IEnrollmentRepository _enrollRepo;
    private readonly IStudentRepository _studentRepo;
    private readonly ISectionRepository _sectionRepo;
    // fetch real instructor names instead of "See section details".
    private readonly IUserRepository _userRepo;
    // shared service for schedule parsing + overlap detection.
    private readonly TimetableConflictService _conflictService;

    public TimetableController(
        IEnrollmentRepository enrollRepo,
        IStudentRepository studentRepo,
        ISectionRepository sectionRepo,
        IUserRepository userRepo,
        TimetableConflictService conflictService)
    {
        _enrollRepo = enrollRepo;
        _studentRepo = studentRepo;
        _sectionRepo = sectionRepo;
        _userRepo = userRepo;
        _conflictService = conflictService;
    }

    // GET /api/timetable/student/{studentId}/{term} — Get student's weekly schedule
    /// <summary>
    /// Retrieve a student's weekly timetable for a given term, including schedule JSON for each enrolled section. EnrollmentViewPolicy required.
    /// Students may only view their own timetable; other roles with the policy may view any.
    /// </summary>
    [HttpGet("student/{studentId}/{term}")]
    [Authorize(Policy = "EnrollmentViewPolicy")]
    public async Task<ActionResult<TimetableResponseDto>> GetStudentTimetable(
        int studentId, string term, CancellationToken cancellationToken)
    {
        var student = await _studentRepo.GetByIdAsync(studentId);
        if (student is null)
            return NotFound(new { error = "Student not found", code = "STUDENT_NOT_FOUND" });

        // Students can only view their own timetable
        var callerRole = User.FindFirst(ClaimTypes.Role)?.Value ?? string.Empty;
        if (!int.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var callerId))
            return Unauthorized(new { error = "Your session is invalid. Please sign in again.", code = "INVALID_TOKEN" });

        if (callerRole == "Student" && student.UserID != callerId)
            return StatusCode(403, new { error = "You may only view your own timetable", code = "TIMETABLE_FORBIDDEN" });

        // Get all active enrollments for this student (Enrolled status only)
        var enrollments = await _enrollRepo.GetByStudentIdAsync(studentId);

        var termEnrollments = enrollments
            .Where(e => e.Section.Term == term && e.Status == EnrollmentStatus.Enrolled)
            .ToList();

        // BUG-1 FIX: Batch-load the distinct instructors so each timetable entry can
        // show the real instructor name instead of the previous "See section details"
        // placeholder. One DB call per unique instructor, not per entry (no N+1).
        var instructorIds = termEnrollments
            .Select(e => e.Section.InstructorID)
            .Distinct()
            .ToList();

        var instructorNames = new Dictionary<int, string>();
        foreach (var instructorId in instructorIds)
        {
            var instructor = await _userRepo.GetByIdAsync(instructorId);
            instructorNames[instructorId] = instructor?.FullName ?? string.Empty;
        }

        var entries = termEnrollments.Select(e => new TimetableEntryDto
        {
            SectionID = e.SectionID,
            CourseName = e.Section.Course.Title,
            CourseCode = e.Section.Course.Code,
            Term = e.Section.Term,
            InstructorName = instructorNames.TryGetValue(e.Section.InstructorID, out var n)
                ? n
                : string.Empty,
            ScheduleJSON = e.Section.ScheduleJSON,
            Status = e.Status.ToString()
        }).ToList();

        var totalCredits = termEnrollments.Sum(e => e.Section.Course.Credits);

        return Ok(new TimetableResponseDto
        {
            StudentID = studentId,
            StudentName = student.Name,
            Term = term,
            Entries = entries,
            TotalCredits = totalCredits,
            TotalSections = entries.Count
        });
    }

    // POST /api/timetable/validate-section — Check if a section conflicts with student's schedule
    /// <summary>
    /// Check whether a candidate section's schedule conflicts with a student's current term enrollments. EnrollmentPolicy required.
    /// Returns a conflict report including the clashing section details if an overlap is detected.
    /// </summary>
    [HttpPost("validate-section")]
    [Authorize(Policy = "EnrollmentPolicy")]
    public async Task<ActionResult<ConflictCheckResponseDto>> ValidateSection(
        [FromQuery] int studentId, [FromQuery] int sectionId, CancellationToken cancellationToken)
    {
        var student = await _studentRepo.GetByIdAsync(studentId);
        if (student is null)
            return NotFound(new { error = "Student not found", code = "STUDENT_NOT_FOUND" });

        var newSection = await _sectionRepo.GetByIdWithCourseAsync(sectionId);
        if (newSection is null)
            return NotFound(new { error = "Section not found", code = "SECTION_NOT_FOUND" });

        // BUG-3 FIX: Delegate the parse + overlap detection to TimetableConflictService
        // so EnrollmentsController can reuse the same logic in PRD §14.1.
        var conflict = await _conflictService.CheckAsync(studentId, sectionId, cancellationToken);

        if (conflict is null)
        {
            return Ok(new ConflictCheckResponseDto
            {
                HasConflict = false,
                ConflictMessage = "No schedule conflicts found"
            });
        }

        // BUG-1 FIX: Resolve the real instructor name for the clashing section.
        var instructor = await _userRepo.GetByIdAsync(conflict.ConflictingInstructorId);
        var instructorName = instructor?.FullName ?? string.Empty;

        return Ok(new ConflictCheckResponseDto
        {
            HasConflict = true,
            ConflictMessage =
                $"Schedule conflict with {conflict.ConflictingCourseTitle} on " +
                $"{string.Join(", ", conflict.OverlapDays)} at {conflict.OverlapTime}",
            ConflictsWith = new TimetableEntryDto
            {
                SectionID = conflict.ConflictingSectionId,
                CourseName = conflict.ConflictingCourseTitle,
                CourseCode = conflict.ConflictingCourseCode,
                Term = conflict.ConflictingTerm,
                InstructorName = instructorName,
                ScheduleJSON = conflict.ConflictingScheduleJSON,
                Status = conflict.ConflictingEnrollmentStatus
            }
        });
    }
}
