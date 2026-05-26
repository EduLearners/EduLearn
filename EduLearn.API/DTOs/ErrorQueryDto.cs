namespace EduLearn.API.DTOs;
public record ErrorQueryDto(
    string? Source = null,
    string? Severity = null,
    bool? Resolved = null,
    DateTime? From = null,
    DateTime? To = null,
    int Page = 1,
    int PageSize = 25);
