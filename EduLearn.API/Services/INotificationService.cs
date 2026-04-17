using EduLearn.API.DTOs;
using EduLearn.API.Models.Enums;

namespace EduLearn.API.Services;

// NHT-01 — persist-then-push helper.
//
// Other modules (Enrollment, Grading, Finance, Tickets) depend on this interface
// instead of SignalR directly, so they never need to know a hub exists.
public interface INotificationService
{
    // Creates a Notification row, then best-effort pushes it via SignalR.
    // A failed push never rolls back the persisted notification.
    Task<NotificationResponseDto> NotifyAsync(
        int userId,
        NotificationCategory category,
        NotificationSeverity severity,
        string message,
        int? entityId = null);

    Task<PaginatedResponseDto<NotificationResponseDto>> GetForUserAsync(int userId, int page, int pageSize);

    Task<int> GetUnreadCountAsync(int userId);

    // Returns:
    //   true  — marked read
    //   false — notification not found
    // Throws nothing for ownership mismatch; caller gets a 3-state result via a second method.
    Task<MarkReadResult> MarkReadAsync(int notificationId, int userId);

    Task MarkAllReadAsync(int userId);
}

public enum MarkReadResult
{
    Ok,
    NotFound,
    Forbidden
}
