using System.ComponentModel.DataAnnotations;

namespace EduLearn.API.DTOs;

public class CreateRoomDto
{
    [Required]
    [MaxLength(100)]
    public string Building { get; set; } = null!;

    [Required]
    [MaxLength(20)]
    public string RoomNumber { get; set; } = null!;

    [Required]
    [Range(1, 1000)]
    public int Capacity { get; set; }

    public string? ResourcesJSON { get; set; }
}
