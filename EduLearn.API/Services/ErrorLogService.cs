using System.Security.Claims;
using EduLearn.API.Data;
using EduLearn.API.DTOs;
using EduLearn.API.Models;
using EduLearn.API.Models.Enums;
using Microsoft.EntityFrameworkCore;

namespace EduLearn.API.Services;

public class ErrorLogService : IErrorLogService
{
    private readonly AppDbContext _ctx;
    private readonly ILogger<ErrorLogService> _logger;

    public ErrorLogService(AppDbContext ctx, ILogger<ErrorLogService> logger)
    { _ctx = ctx; _logger = logger; }

    public async Task LogServerErrorAsync(Exception ex, HttpContext ctx, CancellationToken ct)
    {
        try
        {
            var userIdStr = ctx.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            _ctx.AppErrors.Add(new AppError {
                Source = ErrorSource.Server,
                Severity = ErrorSeverity.Error,
                Message = ex.Message,
                StackTrace = ex.ToString(),
                RequestPath = ctx.Request?.Path.Value,
                Method = ctx.Request?.Method,
                StatusCode = ctx.Response?.StatusCode,
                UserId = int.TryParse(userIdStr, out var uid) ? uid : null,
                Role = ctx.User?.FindFirst(ClaimTypes.Role)?.Value,
                UserAgent = ctx.Request?.Headers["User-Agent"].ToString(),
                CorrelationId = ctx.TraceIdentifier
            });
            await _ctx.SaveChangesAsync(ct);
        }
        catch (Exception logEx)
        {
            _logger.LogWarning(logEx, "AppError write failed (server side) — swallowing");
        }
    }

    public async Task LogClientErrorAsync(ClientErrorDto dto, ClaimsPrincipal user, CancellationToken ct)
    {
        try
        {
            var userIdStr = user?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            Enum.TryParse<ErrorSeverity>(dto.Severity, true, out var sev);
            _ctx.AppErrors.Add(new AppError {
                Source = ErrorSource.Client,
                Severity = sev,
                Message = dto.Message ?? "",
                StackTrace = dto.StackTrace,
                ComponentStack = dto.ComponentStack,
                ClientUrl = dto.ClientUrl,
                UserAgent = dto.UserAgent,
                CorrelationId = dto.CorrelationId,
                UserId = int.TryParse(userIdStr, out var uid) ? uid : null,
                Role = user?.FindFirst(ClaimTypes.Role)?.Value
            });
            await _ctx.SaveChangesAsync(ct);
        }
        catch (Exception logEx)
        {
            _logger.LogWarning(logEx, "AppError write failed (client side) — swallowing");
        }
    }

    public async Task<(List<AppError> Items, int Total)> QueryAsync(ErrorQueryDto q, CancellationToken ct)
    {
        var query = _ctx.AppErrors.AsQueryable();
        if (Enum.TryParse<ErrorSource>(q.Source, true, out var src)) query = query.Where(e => e.Source == src);
        if (Enum.TryParse<ErrorSeverity>(q.Severity, true, out var sev)) query = query.Where(e => e.Severity == sev);
        if (q.Resolved.HasValue) query = query.Where(e => e.Resolved == q.Resolved.Value);
        if (q.From.HasValue) query = query.Where(e => e.OccurredAt >= q.From.Value);
        if (q.To.HasValue) query = query.Where(e => e.OccurredAt <= q.To.Value);
        var total = await query.CountAsync(ct);
        var items = await query.OrderByDescending(e => e.OccurredAt)
            .Skip((q.Page - 1) * q.PageSize).Take(q.PageSize).ToListAsync(ct);
        return (items, total);
    }

    public async Task<bool> MarkResolvedAsync(int id, ClaimsPrincipal user, string? note, CancellationToken ct)
    {
        var err = await _ctx.AppErrors.FindAsync(new object?[] { id }, ct);
        if (err is null) return false;
        err.Resolved = true;
        err.ResolvedAt = DateTime.UtcNow;
        err.ResolvedNote = note;
        var userIdStr = user?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (int.TryParse(userIdStr, out var uid)) err.ResolvedById = uid;
        await _ctx.SaveChangesAsync(ct);
        return true;
    }
}
