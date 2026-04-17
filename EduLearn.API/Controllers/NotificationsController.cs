using System.Security.Claims;
using EduLearn.API.DTOs;
using EduLearn.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EduLearn.API.Controllers;

// NHT-01 — Notifications REST surface.
//
// Real-time push flows through SignalR (/notificationHub); this controller is
// the fallback + history + read-state management REST layer.
//
// Error handling: follows project convention in docs/CODEBASE-AUDIT-REPORT.md §9a
// (pre-validate-then-act, no try/catch, `new { error, code }` shape).
[ApiController]
[Route("api/notifications")]
[Authorize]
public class NotificationsController : ControllerBase
{
    private readonly INotificationService _notificationService;

    public NotificationsController(INotificationService notificationService)
    {
        _notificationService = notificationService;
    }

    // ── GET /api/notifications?page=&pageSize= — caller's own notifications, newest first ──
    [HttpGet]
    public async Task<ActionResult<PaginatedResponseDto<NotificationResponseDto>>> GetMine(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var userId = GetCurrentUserId();
        var result = await _notificationService.GetForUserAsync(userId, page, pageSize);
        return Ok(result);
    }

    // ── GET /api/notifications/unread-count — bell-icon counter ──
    [HttpGet("unread-count")]
    public async Task<ActionResult<UnreadCountDto>> GetUnreadCount()
    {
        var userId = GetCurrentUserId();
        var count = await _notificationService.GetUnreadCountAsync(userId);
        return Ok(new UnreadCountDto { UnreadCount = count });
    }

    // ── PUT /api/notifications/{id}/read — mark one notification read (owner only) ──
    [HttpPut("{id}/read")]
    public async Task<IActionResult> MarkRead(int id)
    {
        var userId = GetCurrentUserId();
        var result = await _notificationService.MarkReadAsync(id, userId);

        return result switch
        {
            MarkReadResult.Ok => NoContent(),
            MarkReadResult.NotFound => NotFound(new
            {
                error = "Notification not found",
                code = "NOTIFICATION_NOT_FOUND"
            }),
            MarkReadResult.Forbidden => StatusCode(403, new
            {
                error = "You cannot mark another user's notification as read",
                code = "NOTIFICATION_FORBIDDEN"
            }),
            _ => StatusCode(500)
        };
    }

    // ── PUT /api/notifications/read-all — mark all the caller's notifications as read ──
    [HttpPut("read-all")]
    public async Task<IActionResult> MarkAllRead()
    {
        var userId = GetCurrentUserId();
        await _notificationService.MarkAllReadAsync(userId);
        return NoContent();
    }

    // ── POST /api/notifications/test — ITAdmin-only seed endpoint for smoke-testing SignalR ──
    //
    // Persists a row via NotificationService.NotifyAsync → same persist-then-push flow as
    // production callers, so a SignalR client connected as the target user should receive
    // a `ReceiveNotification` event in real time.
    [HttpPost("test")]
    [Authorize(Policy = "AdminPolicy")]
    public async Task<ActionResult<NotificationResponseDto>> CreateTest(CreateNotificationDto dto)
    {
        var created = await _notificationService.NotifyAsync(
            dto.UserID,
            dto.Category,
            dto.Severity,
            dto.Message,
            dto.EntityID);

        return CreatedAtAction(nameof(GetMine), new { page = 1, pageSize = 20 }, created);
    }

    private int GetCurrentUserId()
    {
        var raw = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return int.Parse(raw!);
    }
}
