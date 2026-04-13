using System.ComponentModel.DataAnnotations;

namespace EduLearn.API.DTOs;

public class GenerateAuditPackageDto
{
    [Required]
    public DateTime PeriodStart { get; set; }

    [Required]
    public DateTime PeriodEnd { get; set; }
}
