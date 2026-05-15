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

// MFA CHANGE (IAM-03): Returned by POST /api/auth/login when the user holds a
// privileged role (Registrar, DeptAdmin, Finance, ITAdmin, Auditor). Carries a
// short-lived (5-min) JWT scoped only to /api/auth/mfa/setup and /api/auth/mfa/verify.
public class MfaChallengeResponseDto
{
    public string MfaToken { get; set; } = string.Empty;   // 5-min JWT, purpose=mfa_pending
    public string Purpose { get; set; } = "mfa_pending";   // marker so clients can branch
    public int ExpiresIn { get; set; } = 300;              // seconds
    public string Message { get; set; } = string.Empty;    // human-readable next-step hint
}

// MFA CHANGE (IAM-03): Returned by POST /api/auth/mfa/setup. The Secret is the raw
// Base32 string (for users who can't scan a QR); OtpauthUri is the standard
// otpauth:// URI which the client renders into a QR for authenticator apps.
public class MfaSetupResponseDto
{
    public string Secret { get; set; } = string.Empty;
    public string OtpauthUri { get; set; } = string.Empty;
}

// MFA CHANGE (IAM-03): Body for POST /api/auth/mfa/verify.
public class MfaVerifyDto
{
    [Required]
    public string Code { get; set; } = string.Empty;
}

// CHANGE PASSWORD: What the user sends to PUT /api/users/{id}/password
// Available to all authenticated roles — user can only change their own password.
// CurrentPassword is verified against the stored BCrypt hash before updating.
public class ChangePasswordDto
{
    [Required]
    public string CurrentPassword { get; set; } = string.Empty;

    [Required]
    [MinLength(8, ErrorMessage = "New password must be at least 8 characters.")]
    public string NewPassword { get; set; } = string.Empty;

    [Required]
    [MinLength(8)]
    public string ConfirmPassword { get; set; } = string.Empty;
}