using System.ComponentModel.DataAnnotations;

namespace EduLearn.API.DTOs;

public class CreateFeeScheduleDto
{
    [Required]
    public int ProgramID { get; set; }

    [Required]
    [MaxLength(20)]
    [RegularExpression(@"^20[0-3]\d-(Spring|Summer|Fall|Winter)$", ErrorMessage = "Term must be in format YYYY-Season (e.g. 2026-Spring)")]
    public string Term { get; set; } = null!;

    [Required]
    public string FeeItemsJSON { get; set; } = null!;

    [Required]
    public DateTime EffectiveFrom { get; set; }

    [Required]
    public DateTime EffectiveTo { get; set; }
}
