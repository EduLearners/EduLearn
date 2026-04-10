using EduLearn.API.Models.Enums;

namespace EduLearn.API.DTOs;

public class UserResponseDto
{
    public int UserID { get; set; }
    public string Username { get; set; } = null!;
    public string FullName { get; set; } = null!;
    public string Email { get; set; } = null!;
    public string? Phone { get; set; }
    public UserRole Role { get; set; }
    public bool MFAEnabled { get; set; }
    public UserStatus Status { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}
