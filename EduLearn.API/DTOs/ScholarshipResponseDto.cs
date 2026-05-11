using EduLearn.API.Models.Enums;

namespace EduLearn.API.DTOs;

public class ScholarshipResponseDto
{
    public int ScholarID { get; set; }
    public int StudentID { get; set; }
    public string StudentName { get; set; } = string.Empty;
    public string AwardType { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public DateTime AppliedAt { get; set; }
    public DateTime ValidFrom { get; set; }
    public DateTime ValidTo { get; set; }
    public ScholarshipStatus Status { get; set; }
}
