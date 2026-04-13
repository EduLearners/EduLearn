using EduLearn.API.Models.Enums;

namespace EduLearn.API.DTOs;

public class RoomResponseDto
{
    public int RoomID { get; set; }
    public string Building { get; set; } = null!;
    public string RoomNumber { get; set; } = null!;
    public int Capacity { get; set; }
    public string? ResourcesJSON { get; set; }
    public RoomStatus Status { get; set; }
}
