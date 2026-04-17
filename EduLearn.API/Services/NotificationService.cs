using EduLearn.API.DTOs;
using EduLearn.API.Hubs;
using EduLearn.API.Models;
using EduLearn.API.Models.Enums;
using EduLearn.API.Repositories.Interfaces;
using Microsoft.AspNetCore.SignalR;

namespace EduLearn.API.Services;

// NHT-01 — see INotificationService.
public class NotificationService : INotificationService
{
    private readonly INotificationRepository _repository;
    private readonly IHubContext<NotificationHub> _hubContext;
    private readonly ILogger<NotificationService> _logger;

    private const string ClientEventName = "ReceiveNotification";

    public NotificationService(
        INotificationRepository repository,
        IHubContext<NotificationHub> hubContext,
        ILogger<NotificationService> logger)
    {
        _repository = repository;
        _hubContext = hubContext;
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
        var dto = MapToDto(created);

        // Best-effort push. If the WebSocket is unhealthy we still keep the row —
        // the client will pick it up via GET /api/notifications on next poll/reload.
        try
        {
            await _hubContext.Clients
                .User(userId.ToString())
                .SendAsync(ClientEventName, dto);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex,
                "SignalR push failed for NotificationID={NotificationId} UserID={UserId}. " +
                "Row persisted; client will see it on next REST fetch.",
                created.NotificationID, userId);
        }

        return dto;
    }

    public async Task<PaginatedResponseDto<NotificationResponseDto>> GetForUserAsync(int userId, int page, int pageSize)
    {
        if (page < 1) page = 1;
        if (pageSize < 1) pageSize = 20;
        if (pageSize > 100) pageSize = 100;

        var all = (await _repository.GetByUserIdAsync(userId))
            .OrderByDescending(n => n.CreatedAt)
            .ToList();

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
