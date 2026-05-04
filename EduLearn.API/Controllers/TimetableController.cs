using EduLearn.API.DTOs;
using EduLearn.API.Models.Enums;
using EduLearn.API.Repositories.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using System.Text.Json;

namespace EduLearn.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TimetableController : ControllerBase
{
    private readonly IEnrollmentRepository _enrollRepo;
    private readonly IStudentRepository _studentRepo;
    private readonly ISectionRepository _sectionRepo;

    public TimetableController(
        IEnrollmentRepository enrollRepo,
        IStudentRepository studentRepo,
        ISectionRepository sectionRepo)
    {
        _enrollRepo = enrollRepo;
        _studentRepo = studentRepo;
        _sectionRepo = sectionRepo;
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
        var callerId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");

        if (callerRole == "Student" && student.UserID != callerId)
            return StatusCode(403, new { error = "You may only view your own timetable", code = "TIMETABLE_FORBIDDEN" });

        // Get all active enrollments for this student (Enrolled status only)
        var enrollments = await _enrollRepo.GetByStudentIdAsync(studentId);

        var termEnrollments = enrollments
            .Where(e => e.Section.Term == term && e.Status == EnrollmentStatus.Enrolled)
            .ToList();

        var entries = termEnrollments.Select(e => new TimetableEntryDto
        {
            SectionID = e.SectionID,
            CourseName = e.Section.Course.Title,
            CourseCode = e.Section.Course.Code,
            Term = e.Section.Term,
            InstructorName = "See section details",
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

        // Get student's current enrollments for the same term
        var enrollments = await _enrollRepo.GetByStudentIdAsync(studentId);
        var sameTermEnrollments = enrollments
            .Where(e => e.Section.Term == newSection.Term && e.Status == EnrollmentStatus.Enrolled)
            .ToList();

        // Parse the new section's schedule
        var newSchedule = ParseSchedule(newSection.ScheduleJSON);
        if (newSchedule is null)
        {
            return Ok(new ConflictCheckResponseDto
            {
                HasConflict = false,
                ConflictMessage = "New section has no schedule defined"
            });
        }

        // Check each existing enrollment for time conflict
        foreach (var enrollment in sameTermEnrollments)
        {
            var existingSchedule = ParseSchedule(enrollment.Section.ScheduleJSON);
            if (existingSchedule is null) continue;

            // Check if days overlap
            var newDays = newSchedule.Days?.Split('-', ',', '/')
                .Select(d => d.Trim().ToLower()).ToHashSet() ?? new HashSet<string>();
            var existingDays = existingSchedule.Days?.Split('-', ',', '/')
                .Select(d => d.Trim().ToLower()).ToHashSet() ?? new HashSet<string>();

            var overlappingDays = newDays.Intersect(existingDays).ToList();

            if (overlappingDays.Any() && TimesOverlap(newSchedule.Time, existingSchedule.Time))
            {
                return Ok(new ConflictCheckResponseDto
                {
                    HasConflict = true,
                    ConflictMessage = $"Schedule conflict with {enrollment.Section.Course.Title} on {string.Join(", ", overlappingDays)} at {existingSchedule.Time}",
                    ConflictsWith = new TimetableEntryDto
                    {
                        SectionID = enrollment.SectionID,
                        CourseName = enrollment.Section.Course.Title,
                        CourseCode = enrollment.Section.Course.Code,
                        Term = enrollment.Section.Term,
                        InstructorName = "See section details",
                        ScheduleJSON = enrollment.Section.ScheduleJSON,
                        Status = enrollment.Status.ToString()
                    }
                });
            }
        }

        return Ok(new ConflictCheckResponseDto
        {
            HasConflict = false,
            ConflictMessage = "No schedule conflicts found"
        });
    }

    // Parse ScheduleJSON like {"days":"Mon-Wed-Fri","time":"10:00-11:00"}
    private static ScheduleInfo? ParseSchedule(string? scheduleJson)
    {
        if (string.IsNullOrWhiteSpace(scheduleJson)) return null;

        try
        {
            return JsonSerializer.Deserialize<ScheduleInfo>(scheduleJson,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        }
        catch
        {
            return null;
        }
    }

    // Check if two time ranges overlap: "10:00-11:00" vs "10:30-11:30"
    private static bool TimesOverlap(string? time1, string? time2)
    {
        if (string.IsNullOrWhiteSpace(time1) || string.IsNullOrWhiteSpace(time2))
            return false;

        try
        {
            var parts1 = time1.Split('-');
            var parts2 = time2.Split('-');

            if (parts1.Length != 2 || parts2.Length != 2) return false;

            var start1 = TimeOnly.Parse(parts1[0].Trim());
            var end1 = TimeOnly.Parse(parts1[1].Trim());
            var start2 = TimeOnly.Parse(parts2[0].Trim());
            var end2 = TimeOnly.Parse(parts2[1].Trim());

            return start1 < end2 && start2 < end1;
        }
        catch
        {
            return false;
        }
    }

    private class ScheduleInfo
    {
        public string? Days { get; set; }
        public string? Time { get; set; }
    }
}
