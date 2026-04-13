namespace EduLearn.API.DTOs;

public class RecalculateResponseDto
{
    public DateTime RecalculatedAt { get; set; }
    public int KPIsUpdated { get; set; }
    public List<KPIResponseDto> KPIs { get; set; } = new();
}
