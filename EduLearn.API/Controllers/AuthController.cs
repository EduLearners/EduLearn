// ============================================================
// AUTH CHANGE: AuthController.cs — Authentication Endpoints (IAM-01)
//
// Endpoints:
//   POST /api/auth/register     → Register new user (BCrypt hashes password)
//   POST /api/auth/login        → Login with username + password → returns JWT or MFA challenge
//   POST /api/auth/mfa/setup    → (MFA CHANGE IAM-03) generate TOTP secret for enrollment
//   POST /api/auth/mfa/confirm  → (MFA CHANGE IAM-03) confirm enrollment with first code
//   POST /api/auth/mfa/verify   → (MFA CHANGE IAM-03) verify TOTP code on subsequent logins
//
// Flow (no MFA / Student or Instructor):
//   1. Register at /register
//   2. Login at /login → full JWT
//   3. Use JWT in Authorization header
//
// Flow (privileged role, FIRST-TIME enrollment):
//   1. Login at /login → returns mfa_pending token ("setup required")
//   2. POST /mfa/setup    (with mfa_pending) → returns secret + otpauth URI
//   3. User scans QR / enters secret in authenticator app
//   4. POST /mfa/confirm  (with mfa_pending + first code) → enrollment done + full JWT
//
// Flow (privileged role, SUBSEQUENT logins):
//   1. Login at /login → returns mfa_pending token ("code required")
//   2. POST /mfa/verify   (with mfa_pending + code) → returns full JWT
// ============================================================

using System.Security.Claims;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using EduLearn.API.DTOs;
using EduLearn.API.Services;

namespace EduLearn.API.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly AuthService _authService;
    private readonly EmailService _emailService;
    private readonly IConfiguration _config;

    public AuthController(
        AuthService authService,
        EmailService emailService,
        IConfiguration config)
    {
        _authService = authService;
        _emailService = emailService;
        _config = config;
    }

    /// <summary>
    /// Register a new user account. Open to anonymous callers.
    /// Hashes the password with BCrypt before persisting the record.
    /// </summary>
    // POST /api/auth/register — BCrypt hashes password before saving
    [HttpPost("register")]
    [AllowAnonymous]
    public async Task<IActionResult> Register([FromBody] RegisterDto dto)
    {
        var (success, result) = await _authService.RegisterAsync(dto);

        if (!success)
            return BadRequest(result);

        // INVITE: Send welcome email if requested
        if (dto.SendInvite)
        {
            var loginUrl = _config["Email:FrontendBaseUrl"] ?? "http://localhost:5173/login";
            try
            {
                await _emailService.SendWelcomeEmailAsync(
                    toEmail      : dto.Email,
                    toName       : dto.FullName,
                    username     : dto.Username,
                    role         : "Student",
                    loginUrl     : loginUrl,
                    tempPassword : dto.Password
                );
            }
            catch { /* silent fail — don't block registration if email fails */ }
        }

        return Ok(result);
    }

    /// <summary>
    /// Authenticate with username and password. Open to anonymous callers.
    /// Returns a signed JWT for non-privileged roles, or a short-lived mfa_pending
    /// challenge token for the five privileged roles (Registrar, DeptAdmin, Finance,
    /// ITAdmin, Auditor). Returns 401 if credentials are invalid or the account is
    /// not Active.
    /// </summary>
    // AUTH CHANGE: POST /api/auth/login — validates password → returns JWT or MFA challenge
    [HttpPost("login")]
    [AllowAnonymous]  // HARDENING (C-25): explicit opt-out from FallbackPolicy
    public async Task<IActionResult> Login([FromBody] LoginDto dto)
    {
        var result = await _authService.LoginAsync(dto);

        // AUTH CHANGE: null = wrong username, wrong password, or non-Active account
        if (result == null)
            return Unauthorized(new { error = "Invalid username or password" });

        return Ok(result);
    }

    /// <summary>
    /// MFA enrollment: generate a fresh TOTP secret for the calling user and persist it.
    /// Requires a valid mfa_pending token (issued by /api/auth/login for privileged roles).
    /// Returns the Base32 secret and an otpauth:// URI suitable for QR rendering.
    /// Returns 409 if MFA is already enrolled (use admin reset to rotate).
    /// </summary>
    // MFA CHANGE (IAM-03): POST /api/auth/mfa/setup
    [HttpPost("mfa/setup")]
    [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
    public async Task<IActionResult> SetupMfa()
    {
        var userId = TryGetMfaPendingUserId();
        if (userId is null)
            return Unauthorized(new { error = "MFA pending token required", code = "MFA_PENDING_TOKEN_REQUIRED" });

        var (outcome, response) = await _authService.SetupMfaAsync(userId.Value);
        return outcome switch
        {
            AuthService.MfaSetupOutcome.Ok              => Ok(response),
            AuthService.MfaSetupOutcome.UserNotFound    => Unauthorized(new { error = "User not found", code = "USER_NOT_FOUND" }),
            AuthService.MfaSetupOutcome.AlreadyEnrolled => Conflict(new { error = "MFA already enrolled. Contact an administrator to reset.", code = "ALREADY_ENROLLED" }),
            _                                           => StatusCode(500)
        };
    }

    /// <summary>
    /// MFA enrollment confirmation: verify the FIRST 6-digit TOTP code after /setup.
    /// This proves the user successfully configured their authenticator app.
    /// On success: MFAEnabled is set to true, MFAEnrolled audit entry is written,
    /// and a full session JWT is returned.
    /// Returns 409 if the user is already enrolled (use /verify instead).
    /// Returns 400 if /setup has not been called yet.
    /// Returns 401 if the code is invalid.
    /// </summary>
    // MFA CHANGE (IAM-03): POST /api/auth/mfa/confirm — FIRST-TIME ENROLLMENT ONLY
    [HttpPost("mfa/confirm")]
    [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
    public async Task<IActionResult> ConfirmMfa([FromBody] MfaVerifyDto dto)
    {
        var userId = TryGetMfaPendingUserId();
        if (userId is null)
            return Unauthorized(new { error = "MFA pending token required", code = "MFA_PENDING_TOKEN_REQUIRED" });

        var (outcome, response) = await _authService.ConfirmMfaAsync(userId.Value, dto.Code);
        return outcome switch
        {
            AuthService.MfaVerifyOutcome.Ok               => Ok(response),
            AuthService.MfaVerifyOutcome.UserNotFound     => Unauthorized(new { error = "User not found", code = "USER_NOT_FOUND" }),
            AuthService.MfaVerifyOutcome.NotInitialized   => BadRequest(new { error = "MFA not initialized. Call /api/auth/mfa/setup first.", code = "MFA_NOT_INITIALIZED" }),
            AuthService.MfaVerifyOutcome.AlreadyEnrolled  => Conflict(new { error = "MFA is already enrolled. Use /api/auth/mfa/verify for login.", code = "MFA_ALREADY_ENROLLED" }),
            AuthService.MfaVerifyOutcome.InvalidCode      => Unauthorized(new { error = "Invalid MFA code", code = "MFA_INVALID_CODE" }),
            _                                             => StatusCode(500)
        };
    }

    /// <summary>
    /// MFA login challenge: verify a 6-digit TOTP code for an ALREADY-ENROLLED user.
    /// Returns a full session JWT on success.
    /// Returns 400 if the user has not completed enrollment yet (call /confirm instead).
    /// Returns 401 if the code is invalid.
    /// </summary>
    // MFA CHANGE (IAM-03): POST /api/auth/mfa/verify — SUBSEQUENT LOGINS ONLY
    [HttpPost("mfa/verify")]
    [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
    public async Task<IActionResult> VerifyMfa([FromBody] MfaVerifyDto dto)
    {
        var userId = TryGetMfaPendingUserId();
        if (userId is null)
            return Unauthorized(new { error = "MFA pending token required", code = "MFA_PENDING_TOKEN_REQUIRED" });

        var (outcome, response) = await _authService.VerifyMfaAsync(userId.Value, dto.Code);
        return outcome switch
        {
            AuthService.MfaVerifyOutcome.Ok               => Ok(response),
            AuthService.MfaVerifyOutcome.UserNotFound     => Unauthorized(new { error = "User not found", code = "USER_NOT_FOUND" }),
            AuthService.MfaVerifyOutcome.NotInitialized   => BadRequest(new { error = "MFA not initialized. Call /api/auth/mfa/setup first.", code = "MFA_NOT_INITIALIZED" }),
            AuthService.MfaVerifyOutcome.NotEnrolled      => BadRequest(new { error = "MFA enrollment not complete. Call /api/auth/mfa/confirm with your first code.", code = "MFA_NOT_ENROLLED" }),
            AuthService.MfaVerifyOutcome.InvalidCode      => Unauthorized(new { error = "Invalid MFA code", code = "MFA_INVALID_CODE" }),
            _                                             => StatusCode(500)
        };
    }

    // MFA CHANGE (IAM-03): Inline helper
    [HttpPost("mfa/setup-self")]
    [Authorize(Roles = "Registrar,DeptAdmin,Finance,ITAdmin,Auditor")]
    public async Task<IActionResult> SetupMfaSelf()
    {
        var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!int.TryParse(idClaim, out var userId))
            return Unauthorized(new { error = "Invalid token" });

        var (outcome, response) = await _authService.SetupMfaSelfAsync(userId);
        return outcome switch
        {
            AuthService.MfaSetupOutcome.Ok           => Ok(response),
            AuthService.MfaSetupOutcome.UserNotFound  => Unauthorized(new { error = "User not found" }),
            _                                         => StatusCode(500)
        };
    }

    [HttpPost("mfa/confirm-self")]
    [Authorize(Roles = "Registrar,DeptAdmin,Finance,ITAdmin,Auditor")]
    public async Task<IActionResult> ConfirmMfaSelf([FromBody] MfaVerifyDto dto)
    {
        var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!int.TryParse(idClaim, out var userId))
            return Unauthorized(new { error = "Invalid token" });

        var (outcome, response) = await _authService.ConfirmMfaSelfAsync(userId, dto.Code);
        return outcome switch
        {
            AuthService.MfaVerifyOutcome.Ok             => Ok(response),
            AuthService.MfaVerifyOutcome.UserNotFound   => Unauthorized(new { error = "User not found" }),
            AuthService.MfaVerifyOutcome.NotInitialized => BadRequest(new { error = "Call /mfa/setup-self first" }),
            AuthService.MfaVerifyOutcome.InvalidCode    => BadRequest(new { error = "Invalid code", code = "MFA_INVALID_CODE" }),
            _                                           => StatusCode(500)
        };
    }

    [HttpPost("mfa/disable")]
    [Authorize(Roles = "Registrar,DeptAdmin,Finance,ITAdmin,Auditor")]
    public async Task<IActionResult> DisableMfa()
    {
        var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!int.TryParse(idClaim, out var userId))
            return Unauthorized(new { error = "Invalid token" });
        var outcome = await _authService.DisableMfaAsync(userId);
        return outcome switch
        {
            AuthService.MfaDisableOutcome.Ok           => Ok(new { message = "MFA disabled successfully." }),
            AuthService.MfaDisableOutcome.UserNotFound  => Unauthorized(new { error = "User not found" }),
            _                                           => StatusCode(500)
        };
    }

    private int? TryGetMfaPendingUserId()
    {
        var purpose = User.FindFirst("purpose")?.Value;
        if (purpose != "mfa_pending")
            return null;

        var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!int.TryParse(idClaim, out var userId))
            return null;

        return userId;
    }

    /// <summary>
    /// Sends a password reset email to the given address.
    /// Always returns 200 OK regardless of whether the email exists (prevents enumeration).
    /// The reset link expires in 15 minutes.
    /// </summary>
    [HttpPost("forgot-password")]
    [AllowAnonymous]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordDto dto)
    {
        await _authService.ForgotPasswordAsync(dto);
        // Always 200 — never reveal whether the email is registered
        return Ok(new { message = "If this email is registered, a reset link has been sent. Check your inbox." });
    }

    /// <summary>
    /// Resets the user's password using the token received by email.
    /// Token is valid for 15 minutes and can only be used once.
    /// Returns 400 if token is invalid, expired, or passwords don't match.
    /// </summary>
    [HttpPost("reset-password")]
    [AllowAnonymous]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordDto dto)
    {
        var outcome = await _authService.ResetPasswordAsync(dto);
        return outcome switch
        {
            AuthService.ResetPasswordOutcome.Ok              => Ok(new { message = "Password reset successfully. You can now log in with your new password." }),
            AuthService.ResetPasswordOutcome.PasswordMismatch => BadRequest(new { error = "Passwords do not match.", code = "PASSWORD_MISMATCH" }),
            AuthService.ResetPasswordOutcome.TokenExpired    => BadRequest(new { error = "Reset link has expired. Please request a new one.", code = "TOKEN_EXPIRED" }),
            AuthService.ResetPasswordOutcome.InvalidToken    => BadRequest(new { error = "Invalid or already used reset link.", code = "INVALID_TOKEN" }),
            _                                                => StatusCode(500)
        };
    }
}
