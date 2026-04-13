// ============================================================
// AUTH CHANGE: AuthController.cs — Authentication Endpoints (IAM-01)
//
// Endpoints:
//   POST /api/auth/register  → Register new user (BCrypt hashes password)
//   POST /api/auth/login     → Login with username + password → returns JWT
//
// Flow:
//   1. Register at /register
//   2. Login at /login with same username + password
//   3. Copy JWT token from response
//   4. Click 🔒 Authorize in Swagger → paste token
//   5. Access protected endpoints based on role
// ============================================================

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

    // AUTH CHANGE: POST /api/auth/register — BCrypt hashes password before saving
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterDto dto)
    {
        var result = await _authService.RegisterAsync(dto);

        // AUTH CHANGE: If result has "error" property → registration failed (duplicate)
        var errorProp = result.GetType().GetProperty("error");
        if (errorProp != null)
            return BadRequest(result);

        return Ok(result);
    }

    // AUTH CHANGE: POST /api/auth/login — validates password → returns JWT
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginDto dto)
    {
        var result = await _authService.LoginAsync(dto);

        // AUTH CHANGE: null = wrong username or wrong password
        if (result == null)
            return Unauthorized(new { error = "Invalid username or password" });

        return Ok(result);
    }
}
