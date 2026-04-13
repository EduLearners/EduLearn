using System.ComponentModel.DataAnnotations;
using EduLearn.API.Models.Enums;

namespace EduLearn.API.DTOs;

public class UpdateFeeScheduleDto
{
    [Required]
    public string FeeItemsJSON { get; set; } = null!;

    [Required]
    public DateTime EffectiveFrom { get; set; }

    [Required]
    public DateTime EffectiveTo { get; set; }

    [Required]
    public FeeScheduleStatus Status { get; set; }
}
