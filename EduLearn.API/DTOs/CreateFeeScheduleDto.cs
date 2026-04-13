using System.ComponentModel.DataAnnotations;

namespace EduLearn.API.DTOs;

public class CreateFeeScheduleDto
{
    [Required]
    public int ProgramID { get; set; }

    [Required]
    [MaxLength(20)]
    public string Term { get; set; } = null!;

    [Required]
    public string FeeItemsJSON { get; set; } = null!;

    [Required]
    public DateTime EffectiveFrom { get; set; }

    [Required]
    public DateTime EffectiveTo { get; set; }
}
