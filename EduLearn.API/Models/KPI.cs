using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using EduLearn.API.Models.Enums;

namespace EduLearn.API.Models;

[Table("KPIs")]
public class KPI
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int KPIID { get; set; }

    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = null!;

    [MaxLength(500)]
    public string? Definition { get; set; }

    [Column(TypeName = "decimal(10,2)")]
    public decimal? Target { get; set; }

    [Column(TypeName = "decimal(10,2)")]
    public decimal? CurrentValue { get; set; }

    [Required]
    public ReportingPeriod ReportingPeriod { get; set; }
}
