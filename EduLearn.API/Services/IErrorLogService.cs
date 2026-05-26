using System.Security.Claims;
using EduLearn.API.DTOs;
using EduLearn.API.Models;

namespace EduLearn.API.Services;

public interface IErrorLogService
{
    Task LogServerErrorAsync(Exception ex, HttpContext ctx, CancellationToken ct);
    Task LogClientErrorAsync(ClientErrorDto dto, ClaimsPrincipal user, CancellationToken ct);
    Task<(List<AppError> Items, int Total)> QueryAsync(ErrorQueryDto q, CancellationToken ct);
    Task<bool> MarkResolvedAsync(int id, ClaimsPrincipal user, string? note, CancellationToken ct);
}
