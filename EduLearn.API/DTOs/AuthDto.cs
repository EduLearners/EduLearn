// ============================================================
// AUTH CHANGE: AuthDto.cs — Authentication DTOs (IAM-01)
// Contains: RegisterDto, LoginDto, AuthResponseDto
// Used by: AuthController.cs, AuthService.cs
// ============================================================

using System.ComponentModel.DataAnnotations;
using EduLearn.API.Models.Enums;

namespace EduLearn.API.DTOs;

// AUTH CHANGE: What the user sends to POST /api/auth/register
public class RegisterDto
{
    [Required]
    public string Username { get; set; } = string.Empty;

    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    // AUTH CHANGE: Plain text password — BCrypt will hash this before saving to DB
    [Required]
    [MinLength(8)]
    public string Password { get; set; } = string.Empty;

    [Required]
    public string FullName { get; set; } = string.Empty;

    public string? Phone { get; set; }

    // AUTH CHANGE: Role dropdown in Swagger shows: Student, Instructor, ITAdmin, etc.
    [Required]
    public UserRole Role { get; set; }
}

// AUTH CHANGE: What the user sends to POST /api/auth/login
public class LoginDto
{
    [Required]
    public string Username { get; set; } = string.Empty;

    // AUTH CHANGE: Plain text password — BCrypt.Verify compares with stored hash
    [Required]
    public string Password { get; set; } = string.Empty;
}

// AUTH CHANGE: What we return after successful login
public class AuthResponseDto
{
    public string Token { get; set; } = string.Empty;     // JWT token string
    public DateTime Expiry { get; set; }                   // When this token expires
    public string Role { get; set; } = string.Empty;       // User's role
    public string Username { get; set; } = string.Empty;   // User's username
}
