using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using EduLearn.API.Models.Enums;

namespace EduLearn.API.Models;

[Table("Reports")]
public class Report
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int ReportID { get; set; }

    [Required]
    public ReportScope Scope { get; set; }

    public string? ParametersJSON { get; set; }

    public string? MetricsJSON { get; set; }

    [Required]
    public int GeneratedByFK { get; set; }

    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;

    [MaxLength(500)]
    public string? ReportURI { get; set; }

    // Navigation properties
    [ForeignKey(nameof(GeneratedByFK))]
    public User GeneratedBy { get; set; } = null!;
}
