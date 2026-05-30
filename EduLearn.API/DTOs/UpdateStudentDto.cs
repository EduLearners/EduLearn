using System.ComponentModel.DataAnnotations;
using EduLearn.API.Models.Enums;

namespace EduLearn.API.DTOs;

public class UpdateStudentDto
{
    [Required]
    [MaxLength(200)]
    [RegularExpression(@"^[\p{L}\s'\-\.]+$", ErrorMessage = "Name can only contain letters, spaces, hyphens, apostrophes, and dots")]
    public string Name { get; set; } = null!;

    [MaxLength(20)]
    [RegularExpression(@"^(Male|Female|Other|Prefer not to say)$", ErrorMessage = "Gender must be Male, Female, Other, or Prefer not to say")]
    public string? Gender { get; set; }

    public string? ContactInfoJSON { get; set; }

    [MaxLength(20)]
    [RegularExpression(@"^20[0-3]\d-(Spring|Summer|Fall|Winter)$", ErrorMessage = "Term must be in format YYYY-Season (e.g. 2026-Spring)")]
    public string? ExpectedGraduationTerm { get; set; }

    // BUG-5 FIX: Allow lifecycle status updates (Active → Graduated/Withdrawn/Suspended)
    public StudentLifecycleStatus? EnrollmentStatus { get; set; }
}
