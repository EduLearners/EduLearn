using EduLearn.API.Models.Enums;

namespace EduLearn.API.Models;

public class AppError
{
    public int Id { get; set; }
    public DateTime OccurredAt { get; set; } = DateTime.UtcNow;
    public ErrorSource Source { get; set; }
    public ErrorSeverity Severity { get; set; } = ErrorSeverity.Error;
    public string? RequestPath { get; set; }
    public string? Method { get; set; }
    public int? StatusCode { get; set; }
    public string Message { get; set; } = "";
    public string? StackTrace { get; set; }
    public int? UserId { get; set; }
    public string? Role { get; set; }
    public string? CorrelationId { get; set; }
    public string? UserAgent { get; set; }
    public string? ClientUrl { get; set; }
    public string? ComponentStack { get; set; }
    public string? Kind { get; set; }
    public bool Resolved { get; set; }
    public DateTime? ResolvedAt { get; set; }
    public int? ResolvedById { get; set; }
    public string? ResolvedNote { get; set; }
}
