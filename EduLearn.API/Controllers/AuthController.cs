// ============================================================
// AUTH CHANGE: AuthController.cs — Authentication Endpoints (IAM-01)
//
// Endpoints:
//   POST /api/auth/register     → Register new user (BCrypt hashes password)
//   POST /api/auth/login        → Login with username + password → returns JWT or MFA challenge
//   POST /api/auth/mfa/setup    → (MFA CHANGE IAM-03) generate TOTP secret for enrollment
//   POST /api/auth/mfa/verify   → (MFA CHANGE IAM-03) verify TOTP code, return full JWT
//
// Flow (no MFA / Student or Instructor):
//   1. Register at /register
//   2. Login at /login → full JWT
//   3. Use JWT in Authorization header
//
// Flow (privileged role with MFA):
//   1. Login at /login → returns mfa_pending token + Message hint
//   2. POST /mfa/setup (with mfa_pending token) → returns secret + otpauth URI
//   3. POST /mfa/verify (with mfa_pending token + code) → returns full JWT
//   4. Subsequent login → /verify-only (skip /setup since MFAEnabled=true)
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

    // AUTH CHANGE: AuthService injected by DI (registered in Program.cs)
    public AuthController(AuthService authService)
    {
        _authService = authService;
    }

    /// <summary>
    /// Register a new user account. Open to anonymous callers.
    /// Hashes the password with BCrypt before persisting the record.
    /// </summary>
    // POST /api/auth/register — BCrypt hashes password before saving
    [HttpPost("register")]
    [AllowAnonymous]  // HARDENING (C-25): explicit opt-out from FallbackPolicy
    public async Task<IActionResult> Register([FromBody] RegisterDto dto)
    {
        var (success, result) = await _authService.RegisterAsync(dto);

        if (!success)
            return BadRequest(result);

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
    /// MFA challenge / enrollment-confirm: verify a 6-digit TOTP code.
    /// Requires a valid mfa_pending token (issued by /api/auth/login for privileged roles).
    /// On the first successful verify after enrollment, MFAEnabled flips to true
    /// (audited as MFAEnrolled). On subsequent successes, audited as MFAVerifySuccess.
    /// Returns a full session JWT on success, 401 on invalid code, 400 if no secret has
    /// been initialized for the user.
    /// </summary>
    // MFA CHANGE (IAM-03): POST /api/auth/mfa/verify
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
            AuthService.MfaVerifyOutcome.Ok             => Ok(response),
            AuthService.MfaVerifyOutcome.UserNotFound   => Unauthorized(new { error = "User not found", code = "USER_NOT_FOUND" }),
            AuthService.MfaVerifyOutcome.NotInitialized => BadRequest(new { error = "MFA not initialized. Call /api/auth/mfa/setup first.", code = "MFA_NOT_INITIALIZED" }),
            AuthService.MfaVerifyOutcome.InvalidCode    => Unauthorized(new { error = "Invalid MFA code", code = "MFA_INVALID_CODE" }),
            _                                           => StatusCode(500)
        };
    }

    // MFA CHANGE (IAM-03): Inline helper — read the calling user's UserID, but only if
    // the JWT carries a purpose=mfa_pending claim. The default JWT pipeline rejects any
    // token with a purpose claim from regular endpoints (see Program.cs OnTokenValidated),
    // and these two endpoints are the only callsites that explicitly accept it.
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
}
