using EduLearn.API.Models.Enums;

namespace EduLearn.API.DTOs;

public class NotificationResponseDto
{
    public int NotificationID { get; set; }
    public int UserID { get; set; }
    public int? EntityID { get; set; }
    public string Message { get; set; } = string.Empty;
    public NotificationCategory Category { get; set; }
    public NotificationSeverity Severity { get; set; }
    public NotificationStatus Status { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? ReadAt { get; set; }
    public bool IsRead => ReadAt != null;
}
