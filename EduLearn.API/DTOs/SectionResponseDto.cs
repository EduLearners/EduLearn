using EduLearn.API.Models.Enums;

namespace EduLearn.API.DTOs;

public class SectionResponseDto
{
    public int SectionID { get; set; }
    public int CourseID { get; set; }
    public string CourseName { get; set; } = null!;
    public string Term { get; set; } = null!;
    public int InstructorID { get; set; }
    public string InstructorName { get; set; } = null!;
    public int? RoomID { get; set; }
    public int Capacity { get; set; }
    public int EnrolledCount { get; set; }
    public string? ScheduleJSON { get; set; }
    public SectionStatus Status { get; set; }
}
