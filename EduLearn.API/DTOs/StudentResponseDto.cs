using EduLearn.API.Models.Enums;

namespace EduLearn.API.DTOs;

public class StudentResponseDto
{
    public int StudentID { get; set; }
    public int UserID { get; set; }
    public string MRN { get; set; } = null!;
    public string Name { get; set; } = null!;
    public DateTime DOB { get; set; }
    public string? Gender { get; set; }
    public string? ContactInfoJSON { get; set; }
    public StudentLifecycleStatus EnrollmentStatus { get; set; }
    public int ProgramID { get; set; }
    public string EntryTerm { get; set; } = null!;
    public string? ExpectedGraduationTerm { get; set; }
    public DateTime CreatedAt { get; set; }
}
