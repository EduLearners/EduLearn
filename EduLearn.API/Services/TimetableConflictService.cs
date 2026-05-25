// ============================================================
// BUG-3 FIX: TimetableConflictService.cs
// Shared schedule-conflict detector for ETS-01 (enroll) and ETS-03 (validate).
// Previously the parse + overlap logic lived only in TimetableController, so
// EnrollmentsController had no way to enforce PRD  ("Prerequisite check
// and timetable conflict detection are embedded in the enrollment POST").
//
// Usage:
//   var conflict = await _conflictService.CheckAsync(studentId, sectionId);
//   if (conflict is not null) { ... reject ... }
//
// Returns null when no overlap, or a ConflictResult describing the clashing section.
// ============================================================

using System.Text.Json;
using EduLearn.API.Models.Enums;
using EduLearn.API.Repositories.Interfaces;

namespace EduLearn.API.Services;

public class TimetableConflictService
{
    private readonly IEnrollmentRepository _enrollRepo;
    private readonly ISectionRepository _sectionRepo;

    public TimetableConflictService(
        IEnrollmentRepository enrollRepo,
        ISectionRepository sectionRepo)
    {
        _enrollRepo = enrollRepo;
        _sectionRepo = sectionRepo;
    }

    // Returns:
    //   null                  — no conflict (caller can proceed)
    //   ConflictResult        — caller must reject with the details below
    public async Task<ConflictResult?> CheckAsync(
        int studentId, int candidateSectionId, CancellationToken ct = default)
    {
        var candidate = await _sectionRepo.GetByIdWithCourseAsync(candidateSectionId);
        if (candidate is null) return null; // caller will handle section-not-found

        var candidateSchedule = ParseSchedule(candidate.ScheduleJSON);
        if (candidateSchedule is null) return null; // no schedule → cannot conflict

        // Look at the student's CURRENT enrollments in the SAME term.
        var enrollments = await _enrollRepo.GetByStudentIdAsync(studentId);
        var sameTermEnrolled = enrollments
            .Where(e => e.Section.Term == candidate.Term
                     && e.Status == EnrollmentStatus.Enrolled
                     && e.SectionID != candidateSectionId)
            .ToList();

        foreach (var existing in sameTermEnrolled)
        {
            var existingSchedule = ParseSchedule(existing.Section.ScheduleJSON);
            if (existingSchedule is null) continue;

            var newDays = SplitDays(candidateSchedule.Days);
            var existingDays = SplitDays(existingSchedule.Days);
            var overlappingDays = newDays.Intersect(existingDays).ToList();

            if (overlappingDays.Count > 0 &&
                TimesOverlap(candidateSchedule.Time, existingSchedule.Time))
            {
                return new ConflictResult
                {
                    ConflictingSectionId = existing.SectionID,
                    ConflictingCourseTitle = existing.Section.Course.Title,
                    ConflictingCourseCode = existing.Section.Course.Code,
                    ConflictingTerm = existing.Section.Term,
                    ConflictingScheduleJSON = existing.Section.ScheduleJSON,
                    ConflictingEnrollmentStatus = existing.Status.ToString(),
                    ConflictingInstructorId = existing.Section.InstructorID,
                    OverlapDays = overlappingDays,
                    OverlapTime = existingSchedule.Time ?? string.Empty
                };
            }
        }

        return null;
    }

    // ── Public helpers (still used by TimetableController for parse-only paths) ──

    public ScheduleInfo? ParseSchedule(string? scheduleJson)
    {
        if (string.IsNullOrWhiteSpace(scheduleJson)) return null;

        try
        {
            return JsonSerializer.Deserialize<ScheduleInfo>(
                scheduleJson,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        }
        catch
        {
            return null;
        }
    }

    public bool TimesOverlap(string? time1, string? time2)
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

    private static HashSet<string> SplitDays(string? days) =>
        string.IsNullOrWhiteSpace(days)
            ? new HashSet<string>()
            : days.Split('-', ',', '/')
                  .Select(d => d.Trim().ToLowerInvariant())
                  .Where(d => d.Length > 0)
                  .ToHashSet();

    // ── DTOs returned by this service ────────────────────────────────────────

    public class ScheduleInfo
    {
        public string? Days { get; set; }
        public string? Time { get; set; }
    }

    public class ConflictResult
    {
        public int ConflictingSectionId { get; set; }
        public string ConflictingCourseTitle { get; set; } = string.Empty;
        public string ConflictingCourseCode { get; set; } = string.Empty;
        public string ConflictingTerm { get; set; } = string.Empty;
        public string? ConflictingScheduleJSON { get; set; }
        public string ConflictingEnrollmentStatus { get; set; } = string.Empty;
        public int ConflictingInstructorId { get; set; }
        public List<string> OverlapDays { get; set; } = new();
        public string OverlapTime { get; set; } = string.Empty;
    }
}
