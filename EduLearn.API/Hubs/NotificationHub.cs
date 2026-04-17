using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace EduLearn.API.Hubs;

// NHT-01 — SignalR hub for real-time notification push.
//
// Route: /notificationHub (mapped in Program.cs)
// Auth: JWT required. Token is read from the `access_token` query string because
//       browser WebSocket clients cannot set custom Authorization headers on the
//       upgrade request. See Program.cs -> JwtBearer.Events.OnMessageReceived.
//
// Client event: "ReceiveNotification" — server sends NotificationResponseDto payload.
//
// No server methods are exposed. All writes go through REST + NotificationService.
[Authorize]
public class NotificationHub : Hub
{
    private readonly ILogger<NotificationHub> _logger;

    public NotificationHub(ILogger<NotificationHub> logger)
    {
        _logger = logger;
    }

    public override Task OnConnectedAsync()
    {
        _logger.LogInformation(
            "SignalR: client connected. ConnectionId={ConnectionId}, UserIdentifier={UserIdentifier}",
            Context.ConnectionId,
            Context.UserIdentifier);
        return base.OnConnectedAsync();
    }

    public override Task OnDisconnectedAsync(Exception? exception)
    {
        _logger.LogInformation(
            "SignalR: client disconnected. ConnectionId={ConnectionId}, UserIdentifier={UserIdentifier}",
            Context.ConnectionId,
            Context.UserIdentifier);
        return base.OnDisconnectedAsync(exception);
    }
}
