using System.ComponentModel.DataAnnotations;
using EduLearn.API.Models.Enums;

namespace EduLearn.API.DTOs;

public class CreateUserDto
{
    [Required]
    [MaxLength(100)]
    [RegularExpression(@"^[a-zA-Z0-9][a-zA-Z0-9_]*$", ErrorMessage = "Username must start with a letter or digit and contain only letters, digits, and underscores")]
    public string Username { get; set; } = null!;

    [Required]
    [MaxLength(200)]
    [RegularExpression(@"^[\p{L}\s'\-\.]+$", ErrorMessage = "Full name can only contain letters, spaces, hyphens, apostrophes, and dots")]
    public string FullName { get; set; } = null!;

    [Required]
    [EmailAddress]
    [MaxLength(255)]
    public string Email { get; set; } = null!;

    [MaxLength(20)]
    [RegularExpression(@"^\d{10}$", ErrorMessage = "Phone must be exactly 10 digits")]
    public string? Phone { get; set; }

    [Required]
    public UserRole Role { get; set; }

    [Required]
    [MinLength(8)]
    public string Password { get; set; } = null!;

    // INVITE: If true, backend sends a welcome email with login details
     public bool SendInvite { get; set; } = true;
}
