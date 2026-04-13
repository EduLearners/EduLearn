using EduLearn.API.Models.Enums;

namespace EduLearn.API.DTOs;

public class ReportResponseDto
{
    public int ReportID { get; set; }
    public ReportScope Scope { get; set; }
    public string? ParametersJSON { get; set; }
    public string? MetricsJSON { get; set; }
    public int GeneratedByFK { get; set; }
    public string GeneratedByName { get; set; } = string.Empty;
    public DateTime GeneratedAt { get; set; }
    public string? ReportURI { get; set; }
}
