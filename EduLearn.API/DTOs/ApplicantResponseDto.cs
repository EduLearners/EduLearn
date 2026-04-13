using EduLearn.API.Models.Enums;

namespace EduLearn.API.DTOs;

public class ApplicantResponseDto
{
    public int ApplicantID { get; set; }
    public string Name { get; set; } = null!;
    public DateTime DOB { get; set; }
    public string? NationalID { get; set; }
    public string? ContactInfoJSON { get; set; }
    public string ProgramApplied { get; set; } = null!;
    public ApplicationStatus ApplicationStatus { get; set; }
    public DateTime SubmittedAt { get; set; }
    public string? DocumentsURIJSON { get; set; }
}
