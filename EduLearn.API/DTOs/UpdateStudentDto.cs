using System.ComponentModel.DataAnnotations;
using EduLearn.API.Models.Enums;

namespace EduLearn.API.DTOs;

public class UpdateStudentDto
{
    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = null!;

    [MaxLength(10)]
    public string? Gender { get; set; }

    public string? ContactInfoJSON { get; set; }

    [MaxLength(20)]
    public string? ExpectedGraduationTerm { get; set; }

    // BUG-5 FIX: Allow lifecycle status updates (Active → Graduated/Withdrawn/Suspended)
    public StudentLifecycleStatus? EnrollmentStatus { get; set; }
}
