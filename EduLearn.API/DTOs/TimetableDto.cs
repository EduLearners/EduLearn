namespace EduLearn.API.DTOs;

public class TimetableEntryDto
{
    public int SectionID { get; set; }
    public string CourseName { get; set; } = null!;
    public string CourseCode { get; set; } = null!;
    public string Term { get; set; } = null!;
    public string InstructorName { get; set; } = null!;
    public string? ScheduleJSON { get; set; }
    public string Status { get; set; } = null!;
}

public class TimetableResponseDto
{
    public int StudentID { get; set; }
    public string StudentName { get; set; } = null!;
    public string Term { get; set; } = null!;
    public List<TimetableEntryDto> Entries { get; set; } = new();
    public int TotalCredits { get; set; }
    public int TotalSections { get; set; }
}

public class ConflictCheckResponseDto
{
    public bool HasConflict { get; set; }
    public string? ConflictMessage { get; set; }
    public TimetableEntryDto? ConflictsWith { get; set; }
}
