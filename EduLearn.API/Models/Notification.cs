using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using EduLearn.API.Models.Enums;

namespace EduLearn.API.Models;

[Table("Notifications")]
public class Notification
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int NotificationID { get; set; }

    [Required]
    public int UserID { get; set; }

    public int? EntityID { get; set; }

    [Required]
    [MaxLength(1000)]
    public string Message { get; set; } = null!;

    [Required]
    public NotificationCategory Category { get; set; }

    [Required]
    public NotificationSeverity Severity { get; set; } = NotificationSeverity.Info;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? ReadAt { get; set; }

    [Required]
    public NotificationStatus Status { get; set; } = NotificationStatus.Active;

    // Navigation properties
    [ForeignKey(nameof(UserID))]
    public User User { get; set; } = null!;
}
