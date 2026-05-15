using EduLearn.API.DTOs;
using EduLearn.API.Models;
using EduLearn.API.Models.Enums;
using EduLearn.API.Repositories.Interfaces;
using EduLearn.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace EduLearn.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly IUserRepository _userRepository;
    private readonly AuditLogService _auditLogService;
    // MFA CHANGE (IAM-03): notify the target user when an admin resets their MFA
    private readonly INotificationService _notificationService;

    public UsersController(
        IUserRepository userRepository,
        AuditLogService auditLogService,
        INotificationService notificationService)  // MFA CHANGE (IAM-03)
    {
        _userRepository = userRepository;
        _auditLogService = auditLogService;
        _notificationService = notificationService;
    }

    // AUTH CHANGE: Only ITAdmin can create users directly (others use /api/auth/register)
    /// <summary>
    /// Create a new user account directly. ITAdmin only (AdminPolicy); other users register via /api/auth/register.
    /// Checks for duplicate email and username before persisting and logs the action in the audit trail.
    /// </summary>
    [HttpPost]
    [Authorize(Policy = "AdminPolicy")]
    public async Task<ActionResult<UserResponseDto>> CreateUser(CreateUserDto dto)
    {
        var existingByEmail = await _userRepository.GetByEmailAsync(dto.Email);
        if (existingByEmail is not null)
            return Conflict(new { error = "Email already exists", code = "DUPLICATE_EMAIL" });

        var existingByUsername = await _userRepository.GetByUsernameAsync(dto.Username);
        if (existingByUsername is not null)
            return Conflict(new { error = "Username already exists", code = "DUPLICATE_USERNAME" });

        var user = new User
        {
            Username = dto.Username,
            FullName = dto.FullName,
            Email = dto.Email,
            Phone = dto.Phone,
            Role = dto.Role,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
            Status = UserStatus.Active,
            CreatedAt = DateTime.UtcNow
        };

        await _userRepository.CreateAsync(user);
        await _auditLogService.LogAsync(user.UserID, "UserCreatedByAdmin", "User", user.UserID,
            new { role = user.Role.ToString() });

        var response = MapToDto(user);
        return CreatedAtAction(nameof(GetUser), new { id = user.UserID }, response);
    }

    // AUTH CHANGE: Only ITAdmin and Registrar can list all users
    /// <summary>
    /// List all user accounts. ITAdmin and Registrar only (UserViewPolicy).
    /// </summary>
    [HttpGet]
    [Authorize(Policy = "UserViewPolicy")]
    public async Task<ActionResult<List<UserResponseDto>>> GetUsers()
    {
        var users = await _userRepository.GetAllAsync();
        return Ok(users.Select(u => MapToDto(u)).ToList());
    }

    // HARDENING (F-1): PRD §6.1 line 1779 says GET /api/users/{id} is '*' (any auth user).
    // Non-privileged roles may view only their own profile; ITAdmin/Registrar may view any.
    /// <summary>
    /// Retrieve a user profile by ID. Any authenticated user may call this endpoint.
    /// Non-privileged roles may only view their own profile; ITAdmin and Registrar may view any.
    /// </summary>
    [HttpGet("{id}")]
    public async Task<ActionResult<UserResponseDto>> GetUser(int id)
    {
        var callerId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? throw new InvalidOperationException("NameIdentifier claim missing"));
        var callerRole = User.FindFirst(ClaimTypes.Role)?.Value ?? string.Empty;
        var isPrivileged = callerRole == "ITAdmin" || callerRole == "Registrar";

        if (!isPrivileged && id != callerId)
            return StatusCode(403, new { error = "You may only view your own profile", code = "USER_FORBIDDEN" });

        var user = await _userRepository.GetByIdAsync(id);
        if (user is null)
            return NotFound(new { error = "User not found", code = "USER_NOT_FOUND" });

        return Ok(MapToDto(user));
    }

    // HARDENING (F-2): PRD §6.1 line 1784 — any user may update their OWN profile.
    // HARDENING (H-9): pre-check email collision instead of letting DbUpdateException bubble as 500.
    /// <summary>
    /// Update a user's full name, email, and phone. Any authenticated user may update their own profile; ITAdmin may update any.
    /// Pre-checks for email collision to prevent a 500 from a unique-constraint violation.
    /// </summary>
    [HttpPut("{id}")]
    public async Task<ActionResult<UserResponseDto>> UpdateUser(int id, UpdateUserDto dto)
    {
        var callerId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? throw new InvalidOperationException("NameIdentifier claim missing"));
        var isAdmin = (User.FindFirst(ClaimTypes.Role)?.Value ?? string.Empty) == "ITAdmin";

        if (!isAdmin && id != callerId)
            return StatusCode(403, new { error = "You may only update your own profile", code = "USER_FORBIDDEN" });

        var user = await _userRepository.GetByIdAsync(id);
        if (user is null)
            return NotFound(new { error = "User not found", code = "USER_NOT_FOUND" });

        // HARDENING (H-9): only check for collision if the email actually changed
        if (!string.Equals(user.Email, dto.Email, StringComparison.OrdinalIgnoreCase))
        {
            var collider = await _userRepository.GetByEmailAsync(dto.Email);
            if (collider is not null && collider.UserID != id)
                return Conflict(new { error = "Email already in use", code = "DUPLICATE_EMAIL" });
        }

        user.FullName = dto.FullName;
        user.Email = dto.Email;
        user.Phone = dto.Phone;

        await _userRepository.UpdateAsync(user);
        return Ok(MapToDto(user));
    }

    // AUTH CHANGE: Only ITAdmin can activate/suspend/lock users
    /// <summary>
    /// Update the account status (Active, Suspended, Locked) for a user. ITAdmin only (AdminPolicy).
    /// </summary>
    [HttpPut("{id}/status")]
    [Authorize(Policy = "AdminPolicy")]
    public async Task<ActionResult<UserResponseDto>> UpdateUserStatus(int id, UpdateStatusDto dto)
    {
        var user = await _userRepository.GetByIdAsync(id);

        if (user is null)
            return NotFound(new { error = "User not found", code = "USER_NOT_FOUND" });

        user.Status = dto.Status;

        await _userRepository.UpdateAsync(user);
        return Ok(MapToDto(user));
    }

    // MFA CHANGE (IAM-03): ITAdmin-only safety valve for users who have lost their authenticator
    // device. Clears MFASecret + MFAEnabled. Idempotent: re-running on a user who has no MFA
    // enrolled is a no-op and still returns 204. Audits MFAReset and drops a Warning notification
    // on the target user so they see the change on their next session.
    /// <summary>
    /// Reset a user's MFA enrollment (clear MFASecret and MFAEnabled). ITAdmin only.
    /// The target user will be asked to enroll again on their next login. Idempotent.
    /// </summary>
    [HttpPost("{id}/mfa/reset")]
    [Authorize(Policy = "AdminPolicy")]
    public async Task<IActionResult> ResetMfa(int id)
    {
        var user = await _userRepository.GetByIdAsync(id);
        if (user is null)
            return NotFound(new { error = "User not found", code = "USER_NOT_FOUND" });

        var callerId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? throw new InvalidOperationException("NameIdentifier claim missing"));

        user.MFASecret = null;
        user.MFAEnabled = false;
        await _userRepository.UpdateAsync(user);

        await _auditLogService.LogAsync(
            callerId,
            "MFAReset",
            "User",
            user.UserID,
            new { resetBy = callerId, targetRole = user.Role.ToString() }
        );

        await _notificationService.NotifyAsync(
            user.UserID,
            NotificationCategory.System,
            NotificationSeverity.Warning,
            "Your MFA was reset by an administrator. You will be asked to enroll again on your next login."
        );

        return NoContent();
    }

    /// <summary>
    /// Change password for a logged-in user using their current password.
    /// </summary>
    [HttpPut("{id}/password")]
    public async Task<IActionResult> ChangePassword(int id, ChangePasswordDto dto)
    {
        // Only the user themselves can change their own password
        var callerId = int.Parse(
            User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? throw new InvalidOperationException("NameIdentifier claim missing"));

        if (id != callerId)
            return StatusCode(403, new
            {
                error = "You can only change your own password.",
                code = "USER_FORBIDDEN"
            });

        var user = await _userRepository.GetByIdAsync(id);
        if (user is null)
            return NotFound(new { error = "User not found.", code = "USER_NOT_FOUND" });

        // Verify current password matches stored BCrypt hash
        if (!BCrypt.Net.BCrypt.Verify(dto.CurrentPassword, user.PasswordHash))
            return BadRequest(new
            {
                error = "Current password is incorrect.",
                code = "WRONG_CURRENT_PASSWORD"
            });

        // Check new password and confirm match
        if (dto.NewPassword != dto.ConfirmPassword)
            return BadRequest(new
            {
                error = "New password and confirm password do not match.",
                code = "PASSWORD_MISMATCH"
            });

        // Check new password is not same as current
        if (BCrypt.Net.BCrypt.Verify(dto.NewPassword, user.PasswordHash))
            return BadRequest(new
            {
                error = "New password must be different from current password.",
                code = "SAME_PASSWORD"
            });

        // Hash and save the new password
        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
        user.UpdatedAt = DateTime.UtcNow;
        await _userRepository.UpdateAsync(user);

        // Audit log
        await _auditLogService.LogAsync(
            callerId,
            "PasswordChanged",
            "User",
            user.UserID,
            null);

        return Ok(new { message = "Password changed successfully." });
    }
    private static UserResponseDto MapToDto(User user) => new()
    {
        UserID = user.UserID,
        Username = user.Username,
        FullName = user.FullName,
        Email = user.Email,
        Phone = user.Phone,
        Role = user.Role,
        MFAEnabled = user.MFAEnabled,
        Status = user.Status,
        CreatedAt = user.CreatedAt,
        UpdatedAt = user.UpdatedAt
    };
}
