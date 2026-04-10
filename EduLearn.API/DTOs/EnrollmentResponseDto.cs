using EduLearn.API.Models.Enums;

namespace EduLearn.API.DTOs;

public class EnrollmentResponseDto
{
    public int EnrollID { get; set; }
    public int StudentID { get; set; }
    public string StudentName { get; set; } = null!;
    public int SectionID { get; set; }
    public string CourseName { get; set; } = null!;
    public string Term { get; set; } = null!;
    public EnrollmentStatus Status { get; set; }
    public int? WaitlistPosition { get; set; }
    public bool GradePostedFlag { get; set; }
    public DateTime EnrolledAt { get; set; }
}
