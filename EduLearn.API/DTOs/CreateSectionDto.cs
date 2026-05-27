using System.ComponentModel.DataAnnotations;

namespace EduLearn.API.DTOs;

public class CreateSectionDto
{
    [Required]
    public int CourseID { get; set; }

    [Required]
    [MaxLength(20)]
    [RegularExpression(@"^20[0-3]\d-(Spring|Summer|Fall|Winter)$", ErrorMessage = "Term must be in format YYYY-Season (e.g. 2026-Spring)")]
    public string Term { get; set; } = null!;

    [Required]
    public int InstructorID { get; set; }

    public int? RoomID { get; set; }

    [Required]
    [Range(1, 500)]
    public int Capacity { get; set; } = 60;

    [MaxLength(2000)]
    public string? ScheduleJSON { get; set; }
}
