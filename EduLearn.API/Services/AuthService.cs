// ============================================================
// AuthService.cs — Register + Login Logic (IAM-01)
//
// Uses IUserRepository (repository pattern) for user operations.
// AUDIT CHANGE: Now also uses AuditLogService to log:
//   - UserRegistered (on successful register)
//   - LoginSuccess   (on successful login)
//   - LoginFailed    (on wrong password)
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

    public AuthService(
        IUserRepository userRepository,
        TokenService tokenService,
        IConfiguration config,
        AuditLogService auditLogService)  // AUDIT CHANGE: added parameter
    {
        _userRepository = userRepository;
        _tokenService = tokenService;
        _config = config;
        _auditLogService = auditLogService;  // AUDIT CHANGE: stored
    }

    // ════════════════════════════════════════
    // REGISTER — POST /api/auth/register
    // ════════════════════════════════════════
    public async Task<object> RegisterAsync(RegisterDto dto)
    {
        // Check duplicate username
        var existingUser = await _userRepository.GetByUsernameAsync(dto.Username);
        if (existingUser != null)
            return new { error = "Username already exists" };

        // Check duplicate email
        var existingEmail = await _userRepository.GetByEmailAsync(dto.Email);
        if (existingEmail != null)
            return new { error = "Email already exists" };

        // BCrypt hash the password
        string hashedPassword = BCrypt.Net.BCrypt.HashPassword(dto.Password);

        // Create user with hashed password
        var user = new User
        {
            Username     = dto.Username,
            Email        = dto.Email,
            FullName     = dto.FullName,
            Phone        = dto.Phone,
            Role         = dto.Role,
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

        return new
        {
            message  = "User registered successfully",
            userId   = user.UserID,
            username = user.Username,
            role     = user.Role.ToString()
        };
    }

    // ════════════════════════════════════════
    // LOGIN — POST /api/auth/login
    // ════════════════════════════════════════
    public async Task<AuthResponseDto?> LoginAsync(LoginDto dto)
    {
        // Find user by username
        var user = await _userRepository.GetByUsernameAsync(dto.Username);

        if (user == null)
            return null;

        // BCrypt verify password
        bool isPasswordCorrect = BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash);

        if (!isPasswordCorrect)
        {
            // AUDIT CHANGE: Log failed login attempt
            await _auditLogService.LogAsync(
                user.UserID,                               // who tried
                "LoginFailed",                             // what happened
                "User",                                    // entity type
                user.UserID,                               // entity id
                new { reason = "Invalid password" }        // why it failed
            );
            return null;
        }

        // Password matched — generate JWT
        var token = _tokenService.GenerateToken(user);
        var expiryMinutes = int.Parse(_config["Jwt:ExpiryInMinutes"] ?? "60");

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
}
