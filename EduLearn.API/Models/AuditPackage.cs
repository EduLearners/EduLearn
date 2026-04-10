using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EduLearn.API.Models;

[Table("AuditPackages")]
public class AuditPackage
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int PackageID { get; set; }

    [Required]
    [Column(TypeName = "date")]
    public DateTime PeriodStart { get; set; }

    [Required]
    [Column(TypeName = "date")]
    public DateTime PeriodEnd { get; set; }

    [Required]
    public string ContentsJSON { get; set; } = null!;

    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;

    [MaxLength(500)]
    public string? PackageURI { get; set; }
}
