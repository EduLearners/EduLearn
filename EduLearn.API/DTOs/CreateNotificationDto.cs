using System.ComponentModel.DataAnnotations;
using EduLearn.API.Models.Enums;

namespace EduLearn.API.DTOs;

// Used only by the ITAdmin-only POST /api/notifications/test seed endpoint.
// Lets you smoke-test SignalR pushes without having to wire other modules in yet.
public class CreateNotificationDto
{
    [Required]
    public int UserID { get; set; }

    [Required]
    public NotificationCategory Category { get; set; }

    public NotificationSeverity Severity { get; set; } = NotificationSeverity.Info;

    [Required]
    [MaxLength(1000)]
    public string Message { get; set; } = null!;

    public int? EntityID { get; set; }
}
