using EduLearn.API.DTOs;
using EduLearn.API.Models;
using EduLearn.API.Models.Enums;
using EduLearn.API.Repositories.Interfaces;
using EduLearn.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EduLearn.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly IUserRepository _userRepository;
    private readonly AuditLogService _auditLogService;

    public UsersController(IUserRepository userRepository, AuditLogService auditLogService)
    {
        _userRepository = userRepository;
        _auditLogService = auditLogService;
    }

    // AUTH CHANGE: Only ITAdmin can create users directly (others use /api/auth/register)
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
    [HttpGet]
    [Authorize(Policy = "UserViewPolicy")]
    public async Task<ActionResult<List<UserResponseDto>>> GetUsers()
    {
        var users = await _userRepository.GetAllAsync();
        return Ok(users.Select(u => MapToDto(u)).ToList());
    }

    // AUTH CHANGE: ITAdmin and Registrar can view any user profile
    [HttpGet("{id}")]
    [Authorize(Policy = "UserViewPolicy")]
    public async Task<ActionResult<UserResponseDto>> GetUser(int id)
    {
        var user = await _userRepository.GetByIdAsync(id);

        if (user is null)
            return NotFound(new { error = "User not found", code = "USER_NOT_FOUND" });

        return Ok(MapToDto(user));
    }

    // AUTH CHANGE: Only ITAdmin can update user profiles
    [HttpPut("{id}")]
    [Authorize(Policy = "AdminPolicy")]
    public async Task<ActionResult<UserResponseDto>> UpdateUser(int id, UpdateUserDto dto)
    {
        var user = await _userRepository.GetByIdAsync(id);

        if (user is null)
            return NotFound(new { error = "User not found", code = "USER_NOT_FOUND" });

        user.FullName = dto.FullName;
        user.Email = dto.Email;
        user.Phone = dto.Phone;

        await _userRepository.UpdateAsync(user);
        return Ok(MapToDto(user));
    }

    // AUTH CHANGE: Only ITAdmin can activate/suspend/lock users
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
