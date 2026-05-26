namespace EduLearn.API.DTOs;
public record ClientErrorDto(
    string Severity,
    string Kind,
    string Message,
    string? StackTrace,
    string? ComponentStack,
    string? ClientUrl,
    string? UserAgent,
    string? CorrelationId);
