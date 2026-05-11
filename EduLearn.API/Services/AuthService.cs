// ============================================================
// AuthService.cs — Register + Login Logic (IAM-01)
//
// Uses IUserRepository (repository pattern) for user operations.
// AUDIT CHANGE: Now also uses AuditLogService to log:
//   - UserRegistered (on successful register)
//   - LoginSuccess   (on successful login)
//   - LoginFailed    (on wrong password)
//
// MFA CHANGE (IAM-03): LoginAsync is now role-aware. Privileged roles
// (Registrar, DeptAdmin, Finance, ITAdmin, Auditor) receive a short-lived
// mfa_pending token instead of a full JWT, and must complete the MFA flow
// at /api/auth/mfa/setup and /api/auth/mfa/verify before getting a session.
//
// Used by: AuthController.cs
// ============================================================

using EduLearn.API.DTOs;
using EduLearn.API.Models;
using EduLearn.API.Models.Enums;
using EduLearn.API.Repositories.Interfaces;

namespace EduLearn.API.Services;

public class AuthService
{
    private readonly IUserRepository _userRepository;
    private readonly TokenService _tokenService;
    private readonly IConfiguration _config;
    // AUDIT CHANGE: Injecting AuditLogService to log register/login actions
    private readonly AuditLogService _auditLogService;
    // MFA CHANGE (IAM-03): TOTP secret + verify helper
    private readonly MfaService _mfaService;

    public AuthService(
        IUserRepository userRepository,
        TokenService tokenService,
        IConfiguration config,
        AuditLogService auditLogService,  // AUDIT CHANGE: added parameter
        MfaService mfaService)             // MFA CHANGE (IAM-03): added parameter
    {
        _userRepository = userRepository;
        _tokenService = tokenService;
        _config = config;
        _auditLogService = auditLogService;  // AUDIT CHANGE: stored
        _mfaService = mfaService;             // MFA CHANGE (IAM-03): stored
    }

    // MFA CHANGE (IAM-03): Roles that MUST complete MFA before getting a full JWT.
    // Student and Instructor are deliberately excluded per PRD IAM-03 scope.
    private static readonly HashSet<UserRole> PrivilegedRoles = new()
    {
        UserRole.Registrar,
        UserRole.DeptAdmin,
        UserRole.Finance,
        UserRole.ITAdmin,
        UserRole.Auditor
    };

    // MFA CHANGE (IAM-03): Outcome enums returned by SetupMfaAsync/VerifyMfaAsync so
    // the controller can map cleanly to HTTP status codes without leaking service internals.
    public enum MfaSetupOutcome
    {
        Ok,
        UserNotFound,
        AlreadyEnrolled
    }

    public enum MfaVerifyOutcome
    {
        Ok,
        UserNotFound,
        NotInitialized,
        InvalidCode,
        NotEnrolled,        // /verify called but user has not completed enrollment yet
        AlreadyEnrolled     // /confirm called but user is already enrolled
    }

    // ════════════════════════════════════════
    // REGISTER — POST /api/auth/register
    // ════════════════════════════════════════
    public async Task<(bool Success, object Result)> RegisterAsync(RegisterDto dto)
    {
        // Check duplicate username
        var existingUser = await _userRepository.GetByUsernameAsync(dto.Username);
        if (existingUser != null)
            return (false, new { error = "Username already exists" });

        // Check duplicate email
        var existingEmail = await _userRepository.GetByEmailAsync(dto.Email);
        if (existingEmail != null)
            return (false, new { error = "Email already exists" });

        // BCrypt hash the password
        string hashedPassword = BCrypt.Net.BCrypt.HashPassword(dto.Password);

        // Create user with hashed password
        var user = new User
        {
            Username     = dto.Username,
            Email        = dto.Email,
            FullName     = dto.FullName,
            Phone        = dto.Phone,
            // HARDENING (C-26): Public registration cannot choose a privileged role.
            // dto.Role is deliberately IGNORED; server forces Student. Privileged accounts
            // are minted via POST /api/users (AdminPolicy-gated — ITAdmin only).
            Role         = UserRole.Student,
            PasswordHash = hashedPassword,
            Status       = UserStatus.Active,
            CreatedAt    = DateTime.UtcNow
        };

        await _userRepository.CreateAsync(user);

        // AUDIT CHANGE: Log the registration event
        await _auditLogService.LogAsync(
            user.UserID,                         // who
            "UserRegistered",                    // what
            "User",                              // which entity type
            user.UserID,                         // entity id
            new { role = user.Role.ToString() }  // extra details
        );

        return (true, new
        {
            message  = "User registered successfully",
            userId   = user.UserID,
            username = user.Username,
            role     = user.Role.ToString()
        });
    }

    // HARDENING (C-24): Dummy hash neutralizes the timing side-channel that previously
    // let attackers enumerate valid usernames by comparing login response times. Computed
    // once at class-load; BCrypt.Verify against it runs the full work factor (~300ms),
    // matching the time to verify a real user's password.
    private static readonly string DummyHash =
        BCrypt.Net.BCrypt.HashPassword("dummy-hash-for-timing-consistency-never-a-real-password");

    // ════════════════════════════════════════
    // LOGIN — POST /api/auth/login
    // ════════════════════════════════════════
    //
    // MFA CHANGE (IAM-03): Return type widened from Task<AuthResponseDto?> to Task<object?>
    // because the response shape now depends on role:
    //   - Student / Instructor : AuthResponseDto (full JWT, existing flow)
    //   - Privileged role      : MfaChallengeResponseDto (mfa_pending token)
    public async Task<object?> LoginAsync(LoginDto dto)
    {
        // Find user by username
        var user = await _userRepository.GetByUsernameAsync(dto.Username);

        // HARDENING (C-24): Always run BCrypt.Verify — against a dummy hash when the user
        // does not exist — so response time for "user not found" matches "wrong password".
        // Without this, valid usernames respond ~300ms slower than invalid ones, leaking
        // account existence to probing attackers.
        var hashToCheck = user?.PasswordHash ?? DummyHash;
        bool isPasswordCorrect = BCrypt.Net.BCrypt.Verify(dto.Password, hashToCheck);

        if (user == null || !isPasswordCorrect)
        {
            if (user != null)
            {
                // AUDIT CHANGE: Log failed login attempt. We only log for real users;
                // probing non-existent usernames creates no audit row (log-pollution guard).
                await _auditLogService.LogAsync(
                    user.UserID,                               // who tried
                    "LoginFailed",                             // what happened
                    "User",                                    // entity type
                    user.UserID,                               // entity id
                    new { reason = "Invalid password" }        // why it failed
                );
            }
            return null;
        }

        // Reject suspended or locked accounts before issuing a token
        if (user.Status != UserStatus.Active)
            return null;

        // MFA CHANGE (IAM-03): Privileged roles must clear an MFA challenge before getting
        // a full JWT. This branch runs AFTER status check, BEFORE JWT generation, so the
        // C-24 timing-equality and status-rejection hardenings are preserved verbatim.
        if (PrivilegedRoles.Contains(user.Role))
        {
            var mfaToken = _tokenService.GenerateMfaPendingToken(user);
            var message = user.MFAEnabled
                ? "MFA code required. POST /api/auth/mfa/verify with your authenticator code."
                : "MFA enrollment required. POST /api/auth/mfa/setup to begin.";

            return new MfaChallengeResponseDto
            {
                MfaToken  = mfaToken,
                Purpose   = "mfa_pending",
                ExpiresIn = 300,
                Message   = message
            };
        }

        // Password matched — generate JWT
        var token = _tokenService.GenerateToken(user);
        var expiryMinutes = int.Parse(_config["Jwt:AccessTokenExpiryMinutes"] ?? "60");

        // AUDIT CHANGE: Log successful login
        await _auditLogService.LogAsync(
            user.UserID,                      // who
            "LoginSuccess",                   // what
            "User",                           // entity type
            user.UserID,                      // entity id
            new { role = user.Role.ToString() }  // extra details
        );

        return new AuthResponseDto
        {
            Token    = token,
            Expiry   = DateTime.UtcNow.AddMinutes(expiryMinutes),
            Role     = user.Role.ToString(),
            Username = user.Username
        };
    }

    // ════════════════════════════════════════
    // MFA SETUP — POST /api/auth/mfa/setup  (MFA CHANGE IAM-03)
    // ════════════════════════════════════════
    //
    // Generates a fresh Base32 secret, persists it to the user, returns secret + otpauth URI.
    // Does NOT flip MFAEnabled — that only happens after a successful /mfa/verify.
    // Rejects with AlreadyEnrolled if MFAEnabled is already true (use admin reset to rotate).
    public async Task<(MfaSetupOutcome Outcome, MfaSetupResponseDto? Response)> SetupMfaAsync(int userId)
    {
        var user = await _userRepository.GetByIdAsync(userId);
        if (user == null)
            return (MfaSetupOutcome.UserNotFound, null);

        if (user.MFAEnabled)
            return (MfaSetupOutcome.AlreadyEnrolled, null);

        var secret = _mfaService.GenerateSecret();
        user.MFASecret = secret;
        await _userRepository.UpdateAsync(user);

        var otpauthUri = _mfaService.BuildOtpauthUri(user, secret);
        return (MfaSetupOutcome.Ok, new MfaSetupResponseDto
        {
            Secret = secret,
            OtpauthUri = otpauthUri
        });
    }

    // ════════════════════════════════════════
    // MFA CONFIRM — POST /api/auth/mfa/confirm  (MFA CHANGE IAM-03)
    // ════════════════════════════════════════
    //
    // FIRST-TIME ENROLLMENT ONLY. User has called /setup and added the secret to their
    // authenticator app. They submit the first 6-digit code to PROVE they configured
    // the authenticator correctly. On success:
    //   - MFAEnabled flips from false to true
    //   - MFAEnrolled audit log entry written
    //   - Full session JWT returned (so user doesn't have to login again right away)
    //
    // Errors:
    //   - NotInitialized:   /setup was never called (no secret in DB)
    //   - AlreadyEnrolled:  user is already enrolled; use /verify instead
    //   - InvalidCode:      the code does not match
    public async Task<(MfaVerifyOutcome Outcome, AuthResponseDto? Response)> ConfirmMfaAsync(int userId, string code)
    {
        var user = await _userRepository.GetByIdAsync(userId);
        if (user == null)
            return (MfaVerifyOutcome.UserNotFound, null);

        if (string.IsNullOrEmpty(user.MFASecret))
            return (MfaVerifyOutcome.NotInitialized, null);

        if (user.MFAEnabled)
            return (MfaVerifyOutcome.AlreadyEnrolled, null);

        if (!_mfaService.VerifyCode(user.MFASecret, code))
        {
            await _auditLogService.LogAsync(
                user.UserID, "MFAConfirmFailed", "User", user.UserID,
                new { reason = "Invalid code during enrollment" });
            return (MfaVerifyOutcome.InvalidCode, null);
        }

        // Flip the flag — enrollment is now complete.
        user.MFAEnabled = true;
        await _userRepository.UpdateAsync(user);

        await _auditLogService.LogAsync(
            user.UserID, "MFAEnrolled", "User", user.UserID,
            new { role = user.Role.ToString() });

        var token = _tokenService.GenerateToken(user);
        var expiryMinutes = int.Parse(_config["Jwt:AccessTokenExpiryMinutes"] ?? "60");

        return (MfaVerifyOutcome.Ok, new AuthResponseDto
        {
            Token = token,
            Expiry = DateTime.UtcNow.AddMinutes(expiryMinutes),
            Role = user.Role.ToString(),
            Username = user.Username
        });
    }

    // ════════════════════════════════════════
    // MFA VERIFY — POST /api/auth/mfa/verify  (MFA CHANGE IAM-03)
    // ════════════════════════════════════════
    //
    // EVERY SUBSEQUENT LOGIN (user is already enrolled, MFAEnabled = true). User
    // submits a fresh 6-digit code from their authenticator app and receives a full
    // session JWT.
    //
    // Errors:
    //   - NotInitialized:  user has no MFASecret (shouldn't happen if enrolled)
    //   - NotEnrolled:     user hasn't completed enrollment; use /confirm instead
    //   - InvalidCode:     the code does not match
    public async Task<(MfaVerifyOutcome Outcome, AuthResponseDto? Response)> VerifyMfaAsync(int userId, string code)
    {
        var user = await _userRepository.GetByIdAsync(userId);
        if (user == null)
            return (MfaVerifyOutcome.UserNotFound, null);

        if (string.IsNullOrEmpty(user.MFASecret))
            return (MfaVerifyOutcome.NotInitialized, null);

        if (!user.MFAEnabled)
            return (MfaVerifyOutcome.NotEnrolled, null);

        if (!_mfaService.VerifyCode(user.MFASecret, code))
        {
            await _auditLogService.LogAsync(
                user.UserID, "MFAVerifyFailed", "User", user.UserID,
                new { reason = "Invalid code" });
            return (MfaVerifyOutcome.InvalidCode, null);
        }

        await _auditLogService.LogAsync(
            user.UserID, "MFAVerifySuccess", "User", user.UserID,
            new { role = user.Role.ToString() });

        var token = _tokenService.GenerateToken(user);
        var expiryMinutes = int.Parse(_config["Jwt:AccessTokenExpiryMinutes"] ?? "60");

        return (MfaVerifyOutcome.Ok, new AuthResponseDto
        {
            Token = token,
            Expiry = DateTime.UtcNow.AddMinutes(expiryMinutes),
            Role = user.Role.ToString(),
            Username = user.Username
        });
    }
}
