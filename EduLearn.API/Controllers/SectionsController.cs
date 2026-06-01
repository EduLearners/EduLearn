using EduLearn.API.DTOs;
using EduLearn.API.Models;
using EduLearn.API.Repositories.Interfaces;
using EduLearn.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EduLearn.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SectionsController : ControllerBase
{
    private readonly ISectionRepository _sectionRepo;
    private readonly ICourseRepository _courseRepo;
    private readonly IUserRepository _userRepo;
    private readonly IRoomRepository _roomRepo;
    private readonly TimetableConflictService _conflictService;

    public SectionsController(
        ISectionRepository sectionRepo,
        ICourseRepository courseRepo,
        IUserRepository userRepo,
        IRoomRepository roomRepo,
        TimetableConflictService conflictService)
    {
        _sectionRepo = sectionRepo;
        _courseRepo = courseRepo;
        _userRepo = userRepo;
        _roomRepo = roomRepo;
        _conflictService = conflictService;
    }

    // GET /api/sections
    /// <summary>
    /// List all sections. Registrar, DeptAdmin, and ITAdmin only.
    /// </summary>
    [HttpGet]
    [Authorize(Roles = "Registrar,DeptAdmin,ITAdmin")]
    public async Task<ActionResult<IEnumerable<SectionResponseDto>>> GetAll(
        CancellationToken cancellationToken)
    {
        var sections = await _sectionRepo.GetAllAsync();
        var courses = (await _courseRepo.GetAllAsync()).ToDictionary(c => c.CourseID);
        var users = (await _userRepo.GetAllAsync()).ToDictionary(u => u.UserID);
        var result = sections.Select(s => MapToDto(s,
            courses.TryGetValue(s.CourseID, out var c) ? c.Title : string.Empty,
            users.TryGetValue(s.InstructorID, out var u) ? u.FullName : string.Empty)).ToList();
        return Ok(result);
    }

    // POST /api/sections
    /// <summary>
    /// Create a new course section with an assigned instructor and optional room. Registrar, DeptAdmin, and ITAdmin only.
    /// Validates that the course, instructor (Instructor role), and room (if provided) all exist.
    /// </summary>
    [HttpPost]
    [Authorize(Roles = "Registrar,DeptAdmin,ITAdmin")]   // HARDENING (C-9): PRD §6.3 ETS-02
    public async Task<ActionResult<SectionResponseDto>> CreateSection(
        CreateSectionDto dto, CancellationToken cancellationToken)
    {
        // Validate course exists
        var course = await _courseRepo.GetByIdAsync(dto.CourseID);
        if (course is null)
            return BadRequest(new
            {
                error = "Course not found",
                code = "COURSE_NOT_FOUND"
            });

        // Validate instructor exists and has Instructor role
        var instructor = await _userRepo.GetByIdAsync(dto.InstructorID);
        if (instructor is null)
            return BadRequest(new
            {
                error = "Instructor not found",
                code = "INSTRUCTOR_NOT_FOUND"
            });

        if (instructor.Role != Models.Enums.UserRole.Instructor)
            return BadRequest(new
            {
                error = "The specified user is not an Instructor",
                code = "INVALID_INSTRUCTOR_ROLE"
            });

        // Validate room exists if provided
        if (dto.RoomID.HasValue)
        {
            var roomExists = await _roomRepo.ExistsAsync(dto.RoomID.Value);
            if (!roomExists)
                return BadRequest(new
                {
                    error = "Room not found",
                    code = "ROOM_NOT_FOUND"
                });
        }

        // ETS-02: Check instructor does not already have a section at the same day/time/term
        var instructorConflict = await CheckInstructorConflictAsync(
            dto.InstructorID, dto.Term, dto.ScheduleJSON);
        if (instructorConflict is not null)
            return Conflict(new
            {
                error = instructorConflict,
                code = "INSTRUCTOR_SCHEDULE_CONFLICT"
            });

        var section = new Section
        {
            CourseID = dto.CourseID,
            Term = dto.Term,
            InstructorID = dto.InstructorID,
            RoomID = dto.RoomID,
            Capacity = dto.Capacity,
            ScheduleJSON = dto.ScheduleJSON
        };

        var created = await _sectionRepo.CreateAsync(section);

        return CreatedAtAction(nameof(GetSection),
            new { id = created.SectionID },
            MapToDto(created, course.Title, instructor.FullName));
    }

    // GET /api/sections/{id}
    /// <summary>
    /// Retrieve a single section by its ID. Requires RosterViewPolicy (Instructor, Registrar, DeptAdmin, or ITAdmin).
    /// Returns 404 if the section does not exist.
    /// </summary>
    [HttpGet("{id}")]
    [Authorize(Policy = "RosterViewPolicy")]
    public async Task<ActionResult<SectionResponseDto>> GetSection(
        int id, CancellationToken cancellationToken)
    {
        var section = await _sectionRepo.GetByIdAsync(id);
        if (section is null)
            return NotFound(new
            {
                error = "Section not found",
                code = "SECTION_NOT_FOUND"
            });

        var course = await _courseRepo.GetByIdAsync(section.CourseID);
        var instructor = await _userRepo.GetByIdAsync(section.InstructorID);

        return Ok(MapToDto(section,
            course?.Title ?? string.Empty,
            instructor?.FullName ?? string.Empty));
    }

    // GET /api/sections/course/{courseId}/term/{term}
    /// <summary>
    /// List all sections for a given course and term. Students need this to browse sections for enrollment.
    /// All authenticated users (including Student).
    /// Returns 404 if the course does not exist or no sections are found for the specified term.
    /// </summary>
    [HttpGet("course/{courseId}/term/{term}")]
    // FIX A1-07: Students must be able to search sections for enrollment
    public async Task<ActionResult<IEnumerable<SectionResponseDto>>> GetByCourseAndTerm(
        int courseId, string term, CancellationToken cancellationToken)
    {
        // Validate course exists
        var course = await _courseRepo.GetByIdAsync(courseId);
        if (course is null)
            return NotFound(new
            {
                error = "Course not found",
                code = "COURSE_NOT_FOUND"
            });

        var sections = await _sectionRepo.GetByCourseAndTermAsync(courseId, term);

        // BUG-7 FIX: Return 404 with meaningful message instead of silent empty 200
        if (!sections.Any())
            return NotFound(new
            {
                error = $"No sections found for course '{course.Title}' in term '{term}'",
                code = "SECTIONS_NOT_FOUND"
            });

        var result = new List<SectionResponseDto>();
        foreach (var s in sections)
        {
            var instructor = await _userRepo.GetByIdAsync(s.InstructorID);
            result.Add(MapToDto(s,
                course.Title,
                instructor?.FullName ?? string.Empty));
        }

        return Ok(result);
    }

    // PUT /api/sections/{id} — Update an existing section
    /// <summary>
    /// Update an existing section's details including instructor, room, capacity, and schedule. Registrar, DeptAdmin, and ITAdmin only.
    /// Rejects capacity reductions that would fall below the current enrolled student count.
    /// </summary>
    [HttpPut("{id}")]
    [Authorize(Roles = "Registrar,DeptAdmin,ITAdmin")]
    public async Task<ActionResult<SectionResponseDto>> UpdateSection(
        int id, CreateSectionDto dto, CancellationToken cancellationToken)
    {
        var section = await _sectionRepo.GetByIdAsync(id);
        if (section is null)
            return NotFound(new { error = "Section not found", code = "SECTION_NOT_FOUND" });

        var course = await _courseRepo.GetByIdAsync(dto.CourseID);
        if (course is null)
            return BadRequest(new { error = "Course not found", code = "COURSE_NOT_FOUND" });

        var instructor = await _userRepo.GetByIdAsync(dto.InstructorID);
        if (instructor is null)
            return BadRequest(new { error = "Instructor not found", code = "INSTRUCTOR_NOT_FOUND" });

        if (instructor.Role != Models.Enums.UserRole.Instructor)
            return BadRequest(new { error = "The specified user is not an Instructor", code = "INVALID_INSTRUCTOR_ROLE" });

        if (dto.RoomID.HasValue)
        {
            var roomExists = await _roomRepo.ExistsAsync(dto.RoomID.Value);
            if (!roomExists)
                return BadRequest(new { error = "Room not found", code = "ROOM_NOT_FOUND" });
        }

        if (dto.Capacity < section.EnrolledCount)
            return BadRequest(new
            {
                error = $"Cannot reduce capacity to {dto.Capacity}. Currently {section.EnrolledCount} students are enrolled.",
                code = "CAPACITY_TOO_LOW"
            });

        // ETS-02: Check instructor does not already have a conflicting section (exclude self)
        var instructorConflict = await CheckInstructorConflictAsync(
            dto.InstructorID, dto.Term, dto.ScheduleJSON, excludeSectionId: id);
        if (instructorConflict is not null)
            return Conflict(new
            {
                error = instructorConflict,
                code = "INSTRUCTOR_SCHEDULE_CONFLICT"
            });

        section.CourseID = dto.CourseID;
        section.Term = dto.Term;
        section.InstructorID = dto.InstructorID;
        section.RoomID = dto.RoomID;
        section.Capacity = dto.Capacity;
        section.ScheduleJSON = dto.ScheduleJSON;

        var updated = await _sectionRepo.UpdateAsync(section);
        return Ok(MapToDto(updated, course.Title, instructor.FullName));
    }

    // GET /api/sections/instructor/{instructorId}
    /// <summary>
    /// Get all sections assigned to a specific instructor. All authenticated users.
    /// </summary>
    [HttpGet("instructor/{instructorId}")]
    public async Task<ActionResult<IEnumerable<SectionResponseDto>>> GetByInstructor(
        int instructorId, CancellationToken cancellationToken)
    {
        var instructor = await _userRepo.GetByIdAsync(instructorId);
        if (instructor is null)
            return NotFound(new { error = "Instructor not found", code = "INSTRUCTOR_NOT_FOUND" });

        var sections = await _sectionRepo.GetByInstructorIdAsync(instructorId);
        var courses = (await _courseRepo.GetAllAsync()).ToDictionary(c => c.CourseID);
        var result = sections.Select(s => MapToDto(s,
            courses.TryGetValue(s.CourseID, out var c) ? c.Title : string.Empty,
            instructor.FullName)).ToList();
        return Ok(result);
    }

    private static SectionResponseDto MapToDto(
        Section s, string courseName, string instructorName) => new()
    {
        SectionID = s.SectionID,
        CourseID = s.CourseID,
        CourseName = courseName,
        Term = s.Term,
        InstructorID = s.InstructorID,
        InstructorName = instructorName,
        RoomID = s.RoomID,
        Capacity = s.Capacity,
        EnrolledCount = s.EnrolledCount,
        ScheduleJSON = s.ScheduleJSON,
        Status = s.Status
    };

    // ── Instructor schedule conflict check ────────────────────────────────────
    // Fetches all existing sections for the instructor in the same term and checks
    // whether any of them overlap in days + time with the new/updated section.
    // excludeSectionId: pass the current section's ID on updates to skip self-comparison.
    private async Task<string?> CheckInstructorConflictAsync(
        int instructorId, string term, string? scheduleJson,
        int excludeSectionId = 0)
    {
        var newSchedule = _conflictService.ParseSchedule(scheduleJson);
        if (newSchedule is null) return null; // no schedule — cannot conflict

        var existing = await _sectionRepo.GetByInstructorAndTermAsync(instructorId, term);

        foreach (var s in existing)
        {
            if (s.SectionID == excludeSectionId) continue; // skip self on update

            var existingSchedule = _conflictService.ParseSchedule(s.ScheduleJSON);
            if (existingSchedule is null) continue;

            // Check day overlap
            var newDays = (newSchedule.Days ?? string.Empty)
                .Split(new[] { '-', ',', '/' })
                .Select(d => d.Trim().ToLowerInvariant())
                .Where(d => d.Length > 0)
                .ToHashSet();

            var existingDays = (existingSchedule.Days ?? string.Empty)
                .Split(new[] { '-', ',', '/' })
                .Select(d => d.Trim().ToLowerInvariant())
                .Where(d => d.Length > 0)
                .ToHashSet();

            bool daysOverlap = newDays.Intersect(existingDays).Any();

            if (daysOverlap && _conflictService.TimesOverlap(newSchedule.Time, existingSchedule.Time))
            {
                return $"Instructor already has Section #{s.SectionID} scheduled on "
                     + $"{existingSchedule.Days} at {existingSchedule.Time} "
                     + $"in term {term}. Please choose a different time or day.";
            }
        }

        return null; // no conflict
    }
}
