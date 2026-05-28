using System.ComponentModel.DataAnnotations;

namespace EduLearn.API.DTOs;

public class CreateStudentDto
{
    [Required]
    public int UserID { get; set; }

    [Required]
    [MaxLength(200)]
    [RegularExpression(@"^[\p{L}\s'\-\.]+$", ErrorMessage = "Name can only contain letters, spaces, hyphens, apostrophes, and dots")]
    public string Name { get; set; } = null!;

    [Required]
    public DateTime DOB { get; set; }

    [MaxLength(18)]
    [RegularExpression(@"^(Male|Female|Other|Prefer not to say)$", ErrorMessage = "Gender must be Male, Female, Other, or Prefer not to say")]
    public string? Gender { get; set; }

    public string? ContactInfoJSON { get; set; }

    [Required]
    public int ProgramID { get; set; }

    [Required]
    [MaxLength(20)]
    [RegularExpression(@"^20[0-3]\d-(Spring|Summer|Fall|Winter)$", ErrorMessage = "Term must be in format YYYY-Season (e.g. 2026-Spring)")]
    public string EntryTerm { get; set; } = null!;

    [MaxLength(20)]
    [RegularExpression(@"^20[0-3]\d-(Spring|Summer|Fall|Winter)$", ErrorMessage = "Term must be in format YYYY-Season (e.g. 2026-Spring)")]
    public string? ExpectedGraduationTerm { get; set; }
}
