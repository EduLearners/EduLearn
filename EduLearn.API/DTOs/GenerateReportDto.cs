using System.ComponentModel.DataAnnotations;
using EduLearn.API.Models.Enums;

namespace EduLearn.API.DTOs;

public class GenerateReportDto
{
    [Required]
    public int GeneratedByFK { get; set; }

    [Required]
    public ReportScope Scope { get; set; }

    public string? ParametersJSON { get; set; }
}
