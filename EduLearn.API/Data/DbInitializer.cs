using EduLearn.API.Models;
using EduLearn.API.Models.Enums;
using Microsoft.EntityFrameworkCore;

namespace EduLearn.API.Data;

// Seeds a default ITAdmin account ('admin' / 'Admin@123') on startup so the
// API can be demoed end-to-end via Swagger without any SSMS / SQL role
// promotion. Idempotent: if a user named 'admin' already exists, the seeder
// does nothing. C-26 (register hardcodes Role = Student) is untouched.
public static class DbInitializer
{
    public const string DefaultAdminUsername = "admin";
    public const string DefaultAdminPassword = "Admin@123";

    public static async Task SeedDefaultAdminAsync(IServiceProvider services)
    {
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        if (await db.Users.AnyAsync(u => u.Username == DefaultAdminUsername))
            return;

        db.Users.Add(new User
        {
            Username     = DefaultAdminUsername,
            FullName     = "Default IT Administrator",
            Email        = "admin@edulearn.local",
            Role         = UserRole.ITAdmin,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(DefaultAdminPassword),
            Status       = UserStatus.Active,
            CreatedAt    = DateTime.UtcNow
        });

        await db.SaveChangesAsync();
        Console.WriteLine($"[Seed] Default ITAdmin '{DefaultAdminUsername}' created.");
    }
}
