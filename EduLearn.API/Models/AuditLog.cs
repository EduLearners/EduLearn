using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EduLearn.API.Models;

[Table("AuditLogs")]
public class AuditLog
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int AuditID { get; set; }

    [Required]
    public int UserID { get; set; }

    [Required]
    [MaxLength(100)]
    public string Action { get; set; } = null!;

    [Required]
    [MaxLength(50)]
    public string ResourceType { get; set; } = null!;

    [Required]
    public int ResourceID { get; set; }

    public string? DetailsJSON { get; set; }

    public DateTime Timestamp { get; set; } = DateTime.UtcNow;

    // Navigation properties
    [ForeignKey(nameof(UserID))]
    public User User { get; set; } = null!;
}
