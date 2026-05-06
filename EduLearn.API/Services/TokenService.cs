// ============================================================
// AUTH CHANGE: TokenService.cs — JWT Token Generator (IAM-01)
// Purpose: Takes a User object → creates a signed JWT token
//          with claims (UserID, Username, Email, Role)
// Used by: AuthService.cs (called after successful login)
// ============================================================

using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using EduLearn.API.Models;

namespace EduLearn.API.Services;

public class TokenService
{
    private readonly IConfiguration _config;

    // AUTH CHANGE: IConfiguration injected by DI — reads Jwt settings from appsettings.json
    public TokenService(IConfiguration config)
    {
        _config = config;
    }

    public string GenerateToken(User user)
    {
        // AUTH CHANGE: Step 1 — Get secret key from appsettings.json → Jwt:Secret
        var key = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(_config["Jwt:Secret"]!));

        // AUTH CHANGE: Step 2 — Create signing credentials (HMAC-SHA256)
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        // AUTH CHANGE: Step 3 — Define claims stored inside the JWT
        // These are readable in any controller via User.FindFirst(ClaimTypes.Role) etc.
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.UserID.ToString()),
            new Claim(ClaimTypes.Name, user.Username),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Role, user.Role.ToString())
        };

        // AUTH CHANGE: Step 4 — Read expiry from config (default 60 min)
        var expiryMinutes = int.Parse(_config["Jwt:AccessTokenExpiryMinutes"] ?? "60");

        // AUTH CHANGE: Step 5 — Build and return the JWT token string
        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"],
            audience: _config["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(expiryMinutes),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    // MFA CHANGE (IAM-03): Short-lived JWT for the MFA challenge / enrollment window.
    // Carries a 'purpose=mfa_pending' claim. The default JWT pipeline rejects any token
    // with a purpose claim; the two MFA endpoints accept it via inline check. 5-minute
    // expiry — enough for a user to scan a QR or punch a code, not enough to be useful
    // if leaked.
    public string GenerateMfaPendingToken(User user)
    {
        var key = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(_config["Jwt:Secret"]!));

        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.UserID.ToString()),
            new Claim(ClaimTypes.Name, user.Username),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Role, user.Role.ToString()),
            new Claim("purpose", "mfa_pending")
        };

        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"],
            audience: _config["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(5),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
