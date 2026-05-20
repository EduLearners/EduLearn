using System.ComponentModel.DataAnnotations;

namespace EduLearn.API.DTOs;

// PASSWORD RESET: What the user sends to POST /api/auth/forgot-password
public class ForgotPasswordDto
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;
}

// PASSWORD RESET: What the user sends to POST /api/auth/reset-password
public class ResetPasswordDto
{
    [Required]
    public string Token { get; set; } = string.Empty;

    [Required]
    [MinLength(8)]
    public string NewPassword { get; set; } = string.Empty;

    [Required]
    [MinLength(8)]
    public string ConfirmPassword { get; set; } = string.Empty;
}
