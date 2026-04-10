using System.ComponentModel.DataAnnotations;

namespace EduLearn.API.DTOs;

public class UpdateUserDto
{
    [Required]
    [MaxLength(200)]
    public string FullName { get; set; } = null!;

    [Required]
    [EmailAddress]
    [MaxLength(255)]
    public string Email { get; set; } = null!;

    [MaxLength(20)]
    public string? Phone { get; set; }
}
