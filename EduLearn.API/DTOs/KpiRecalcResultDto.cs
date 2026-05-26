namespace EduLearn.API.DTOs;

public record KpiRecalcResultDto(
    int KpiId,
    string Name,
    decimal? OldValue,
    decimal? NewValue,
    bool Changed);
