using EduLearn.API.DTOs;
using EduLearn.API.Models;
using EduLearn.API.Repositories.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace EduLearn.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class UsersController : ControllerBase
{
    // Repository pattern: controller talks to repository interface, NOT AppDbContext directly
    private readonly IUserRepository _userRepository;

    public UsersController(IUserRepository userRepository)
    {
        _userRepository = userRepository;
    }

    // ── POST /api/users — Create a new user ──
    [HttpPost]
    public async Task<ActionResult<UserResponseDto>> CreateUser(CreateUserDto dto)
    {
        // Check duplicate email using repository
        var existingByEmail = await _userRepository.GetByEmailAsync(dto.Email);
        if (existingByEmail is not null)
            return Conflict(new { error = "Email already exists", code = "DUPLICATE_EMAIL" });

        // Check duplicate username using repository
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
            PasswordHash = dto.Password // Plain text for now — BCrypt later
        };

        // Repository handles Add + SaveChanges internally
        await _userRepository.CreateAsync(user);

        var response = MapToDto(user);
        return CreatedAtAction(nameof(GetUser), new { id = user.UserID }, response);
    }

    // ── GET /api/users — List all users ──
    [HttpGet]
    public async Task<ActionResult<List<UserResponseDto>>> GetUsers()
    {
        // Repository returns all users
        var users = await _userRepository.GetAllAsync();

        var response = users.Select(u => MapToDto(u)).ToList();
        return Ok(response);
    }

    // ── GET /api/users/{id} — Get one user by ID ──
    [HttpGet("{id}")]
    public async Task<ActionResult<UserResponseDto>> GetUser(int id)
    {
        var user = await _userRepository.GetByIdAsync(id);

        if (user is null)
            return NotFound(new { error = "User not found", code = "USER_NOT_FOUND" });

        return Ok(MapToDto(user));
    }

    // ── PUT /api/users/{id} — Update user profile ──
    [HttpPut("{id}")]
    public async Task<ActionResult<UserResponseDto>> UpdateUser(int id, UpdateUserDto dto)
    {
        var user = await _userRepository.GetByIdAsync(id);

        if (user is null)
            return NotFound(new { error = "User not found", code = "USER_NOT_FOUND" });

        user.FullName = dto.FullName;
        user.Email = dto.Email;
        user.Phone = dto.Phone;
        // UpdatedAt is set automatically inside UserRepository.UpdateAsync()

        // Repository calls SaveChanges
        await _userRepository.UpdateAsync(user);

        return Ok(MapToDto(user));
    }

    // ── PUT /api/users/{id}/status — Activate/suspend/lock user ──
    [HttpPut("{id}/status")]
    public async Task<ActionResult<UserResponseDto>> UpdateUserStatus(int id, UpdateStatusDto dto)
    {
        var user = await _userRepository.GetByIdAsync(id);

        if (user is null)
            return NotFound(new { error = "User not found", code = "USER_NOT_FOUND" });

        user.Status = dto.Status;
        // UpdatedAt is set automatically inside UserRepository.UpdateAsync()

        // Repository calls SaveChanges
        await _userRepository.UpdateAsync(user);

        return Ok(MapToDto(user));
    }

    // Helper method that converts the entity to a response DTO (strips PasswordHash)
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
