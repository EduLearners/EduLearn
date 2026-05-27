using System.ComponentModel.DataAnnotations;

namespace EduLearn.API.DTOs;

public class CreateRoomDto
{
    [Required]
    [MaxLength(100)]
    [RegularExpression(@"^[\p{L}\d\s\-\.]+$", ErrorMessage = "Building name contains invalid characters")]
    public string Building { get; set; } = null!;

    [Required]
    [MaxLength(20)]
    [RegularExpression(@"^[a-zA-Z0-9\-]+$", ErrorMessage = "Room number can only contain letters, digits, and hyphens")]
    public string RoomNumber { get; set; } = null!;

    [Required]
    [Range(1, 1000)]
    public int Capacity { get; set; }

    public string? ResourcesJSON { get; set; }
}
