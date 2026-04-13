using EduLearn.API.Models.Enums;

namespace EduLearn.API.DTOs;

public class FeeScheduleResponseDto
{
    public int FeeID { get; set; }
    public int ProgramID { get; set; }
    public string ProgramName { get; set; } = string.Empty;
    public string Term { get; set; } = string.Empty;
    public string FeeItemsJSON { get; set; } = string.Empty;
    public DateTime EffectiveFrom { get; set; }
    public DateTime EffectiveTo { get; set; }
    public FeeScheduleStatus Status { get; set; }
}
