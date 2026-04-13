using EduLearn.API.Data;
using EduLearn.API.DTOs;
using EduLearn.API.Models;
using Microsoft.AspNetCore.Authorization; // AUTH CHANGE: added for [Authorize]
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EduLearn.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize] // AUTH CHANGE: All endpoints require a valid JWT token
public class UsersController : ControllerBase
{
    private readonly AppDbContext _context;

    public UsersController(AppDbContext context)
    {
        _context = context;
    }

    // AUTH CHANGE: Only ITAdmin can create users directly (others use /api/auth/register)
    [HttpPost]
    [Authorize(Policy = "AdminPolicy")]
    public async Task<ActionResult<UserResponseDto>> CreateUser(CreateUserDto dto, CancellationToken cancellationToken)
    {
        if (await _context.Users.AnyAsync(u => u.Email == dto.Email, cancellationToken))
            return Conflict(new { error = "Email already exists", code = "DUPLICATE_EMAIL" });

        if (await _context.Users.AnyAsync(u => u.Username == dto.Username, cancellationToken))
            return Conflict(new { error = "Username already exists", code = "DUPLICATE_USERNAME" });

        var user = new User
        {
            Username = dto.Username,
            FullName = dto.FullName,
            Email = dto.Email,
            Phone = dto.Phone,
            Role = dto.Role,
            // AUTH CHANGE: BCrypt hash the password instead of saving plain text
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password)
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync(cancellationToken);

        var response = MapToDto(user);
        return CreatedAtAction(nameof(GetUser), new { id = user.UserID }, response);
    }

    // AUTH CHANGE: Only ITAdmin and Registrar can list all users
    [HttpGet]
    [Authorize(Policy = "UserViewPolicy")]
    public async Task<ActionResult<List<UserResponseDto>>> GetUsers(CancellationToken cancellationToken)
    {
        var users = await _context.Users
            .AsNoTracking()
            .Select(u => new UserResponseDto
            {
                UserID = u.UserID,
                Username = u.Username,
                FullName = u.FullName,
                Email = u.Email,
                Phone = u.Phone,
                Role = u.Role,
                MFAEnabled = u.MFAEnabled,
                Status = u.Status,
                CreatedAt = u.CreatedAt,
                UpdatedAt = u.UpdatedAt
            })
            .ToListAsync(cancellationToken);

        return Ok(users);
    }

    // AUTH CHANGE: ITAdmin and Registrar can view any user profile
    [HttpGet("{id}")]
    [Authorize(Policy = "UserViewPolicy")]
    public async Task<ActionResult<UserResponseDto>> GetUser(int id, CancellationToken cancellationToken)
    {
        var user = await _context.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.UserID == id, cancellationToken);

        if (user is null)
            return NotFound(new { error = "User not found", code = "USER_NOT_FOUND" });

        return Ok(MapToDto(user));
    }

    // AUTH CHANGE: Only ITAdmin can update user profiles
    [HttpPut("{id}")]
    [Authorize(Policy = "AdminPolicy")]
    public async Task<ActionResult<UserResponseDto>> UpdateUser(int id, UpdateUserDto dto, CancellationToken cancellationToken)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.UserID == id, cancellationToken);

        if (user is null)
            return NotFound(new { error = "User not found", code = "USER_NOT_FOUND" });

        user.FullName = dto.FullName;
        user.Email = dto.Email;
        user.Phone = dto.Phone;
        user.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);
        return Ok(MapToDto(user));
    }

    // AUTH CHANGE: Only ITAdmin can activate/suspend/lock users
    [HttpPut("{id}/status")]
    [Authorize(Policy = "AdminPolicy")]
    public async Task<ActionResult<UserResponseDto>> UpdateUserStatus(int id, UpdateStatusDto dto, CancellationToken cancellationToken)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.UserID == id, cancellationToken);

        if (user is null)
            return NotFound(new { error = "User not found", code = "USER_NOT_FOUND" });

        user.Status = dto.Status;
        user.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);
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
