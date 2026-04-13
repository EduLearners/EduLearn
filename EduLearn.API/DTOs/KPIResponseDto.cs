using EduLearn.API.Models.Enums;

namespace EduLearn.API.DTOs;

public class KPIResponseDto
{
    public int KPIID { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Definition { get; set; }
    public decimal? Target { get; set; }
    public decimal? CurrentValue { get; set; }
    public ReportingPeriod ReportingPeriod { get; set; }
}
