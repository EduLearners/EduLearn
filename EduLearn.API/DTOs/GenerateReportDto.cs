using System.ComponentModel.DataAnnotations;
using EduLearn.API.Models.Enums;

namespace EduLearn.API.DTOs;

public class GenerateReportDto
{
    /// <summary>The scope of the report to generate.</summary>
    [Required]
    public ReportScope Scope { get; set; }

    /// <summary>Optional JSON filter parameters (e.g. {"courseId":1}).</summary>
    public string? ParametersJSON { get; set; }
}
