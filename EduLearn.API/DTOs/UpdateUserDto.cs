using System.ComponentModel.DataAnnotations;

namespace EduLearn.API.DTOs;

public class UpdateUserDto
{
    [Required]
    [MaxLength(200)]
    [RegularExpression(@"^[\p{L}\s'\-\.]+$", ErrorMessage = "Full name can only contain letters, spaces, hyphens, apostrophes, and dots")]
    public string FullName { get; set; } = null!;

    [Required]
    [EmailAddress]
    [MaxLength(255)]
    public string Email { get; set; } = null!;

    [MaxLength(20)]
    [RegularExpression(@"^\d{10}$", ErrorMessage = "Phone must be exactly 10 digits.")]
    public string? Phone { get; set; }
}
