namespace EduLearn.API.DTOs;

public class AuditPackageResponseDto
{
    public int PackageID { get; set; }
    public DateTime PeriodStart { get; set; }
    public DateTime PeriodEnd { get; set; }
    public string ContentsJSON { get; set; } = string.Empty;
    public DateTime GeneratedAt { get; set; }
    public string? PackageURI { get; set; }
}
