using EduLearn.API.DTOs;
using EduLearn.API.Models;
using EduLearn.API.Models.Enums;
using EduLearn.API.Repositories.Interfaces;

namespace EduLearn.API.Services;

// NHT-01 — REST-only notification service.
//
// 2026-04-20 restructure: SignalR push removed (out of syllabus). NotifyAsync now
// persists a row and returns; clients (React, Swagger, smoke tests) read via
// GET /api/notifications and GET /api/notifications/unread-count.
public class NotificationService : INotificationService
{
    private readonly INotificationRepository _repository;
    private readonly ILogger<NotificationService> _logger;

    public NotificationService(
        INotificationRepository repository,
        ILogger<NotificationService> logger)
    {
        _repository = repository;
        _logger = logger;
    }

    public async Task<NotificationResponseDto> NotifyAsync(
        int userId,
        NotificationCategory category,
        NotificationSeverity severity,
        string message,
        int? entityId = null)
    {
        var entity = new Notification
        {
            UserID = userId,
            EntityID = entityId,
            Message = message,
            Category = category,
            Severity = severity,
            Status = NotificationStatus.Active,
            CreatedAt = DateTime.UtcNow
        };

        var created = await _repository.CreateAsync(entity);

        _logger.LogInformation(
            "Notification persisted: NotificationID={NotificationId} UserID={UserId} Category={Category}",
            created.NotificationID, userId, category);

        return MapToDto(created);
    }

    public async Task<PaginatedResponseDto<NotificationResponseDto>> GetForUserAsync(
        int userId, int page, int pageSize, bool unreadOnly = false)
    {
        if (page < 1) page = 1;
        if (pageSize < 1) pageSize = 20;
        if (pageSize > 100) pageSize = 100;

        var source = unreadOnly
            ? await _repository.GetUnreadByUserIdAsync(userId)
            : await _repository.GetByUserIdAsync(userId);

        var all = source.OrderByDescending(n => n.CreatedAt).ToList();

        var totalCount = all.Count;
        var totalPages = totalCount == 0 ? 0 : (int)Math.Ceiling(totalCount / (double)pageSize);

        var items = all
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(MapToDto)
            .ToList();

        return new PaginatedResponseDto<NotificationResponseDto>
        {
            Items = items,
            Page = page,
            PageSize = pageSize,
            TotalCount = totalCount,
            TotalPages = totalPages
        };
    }

    public async Task<int> GetUnreadCountAsync(int userId)
    {
        var unread = await _repository.GetUnreadByUserIdAsync(userId);
        return unread.Count();
    }

    public async Task<MarkReadResult> MarkReadAsync(int notificationId, int userId)
    {
        var notification = await _repository.GetByIdAsync(notificationId);
        if (notification is null)
            return MarkReadResult.NotFound;

        if (notification.UserID != userId)
            return MarkReadResult.Forbidden;

        if (notification.ReadAt is null)
        {
            notification.ReadAt = DateTime.UtcNow;
            await _repository.UpdateAsync(notification);
        }

        return MarkReadResult.Ok;
    }

    public Task MarkAllReadAsync(int userId) => _repository.MarkAllAsReadAsync(userId);

    internal static NotificationResponseDto MapToDto(Notification n) => new()
    {
        NotificationID = n.NotificationID,
        UserID = n.UserID,
        EntityID = n.EntityID,
        Message = n.Message,
        Category = n.Category,
        Severity = n.Severity,
        Status = n.Status,
        CreatedAt = n.CreatedAt,
        ReadAt = n.ReadAt
    };
}
