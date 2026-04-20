using EduLearn.API.DTOs;
using EduLearn.API.Models.Enums;

namespace EduLearn.API.Services;

// NHT-01 — persist-only helper (REST-only after 2026-04-20 restructure; SignalR removed).
//
// Producer modules (Enrollment, Submissions, Invoices, Tickets) inject this interface
// and call NotifyAsync after their primary action commits. Clients read via REST.
public interface INotificationService
{
    // Creates a Notification row. No push side-effect.
    // Throws only on DB failure — placement rule: call AFTER primary transaction commit.
    Task<NotificationResponseDto> NotifyAsync(
        int userId,
        NotificationCategory category,
        NotificationSeverity severity,
        string message,
        int? entityId = null);

    Task<PaginatedResponseDto<NotificationResponseDto>> GetForUserAsync(
        int userId, int page, int pageSize, bool unreadOnly = false);

    Task<int> GetUnreadCountAsync(int userId);

    // Returns a 3-state result so controller maps to 204 / 404 / 403.
    Task<MarkReadResult> MarkReadAsync(int notificationId, int userId);

    Task MarkAllReadAsync(int userId);
}

public enum MarkReadResult
{
    Ok,
    NotFound,
    Forbidden
}
