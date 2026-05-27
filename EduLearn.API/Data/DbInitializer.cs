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

    // MFA CHANGE (IAM-03): Fixed Base32 TOTP secret used to pre-enroll the seeded
    // 'admin' user so smoke tests can compute valid codes via tests/smoke/lib/totp.sh
    // without needing to scan a QR code.
    //
    // SECURITY NOTE: this is a known-secret bootstrap intended ONLY for local dev /
    // smoke runs. Production deployments override DbInitializer (or skip seeding) and
    // rely on real authenticator-app enrollment.
    public const string DefaultAdminMfaSecret = "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP";

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
            // MFA CHANGE (IAM-03): pre-enroll with the fixed test secret so smoke
            // suite can derive valid TOTPs at runtime. MFAEnabled defaults to false
            // so the admin can log in directly; enable MFA from profile if needed.
            MFASecret    = DefaultAdminMfaSecret,
            MFAEnabled   = false,
            Status       = UserStatus.Active,
            CreatedAt    = DateTime.UtcNow
        });

        await db.SaveChangesAsync();
        Console.WriteLine($"[Seed] Default ITAdmin '{DefaultAdminUsername}' created (MFA secret pre-loaded, MFA disabled — enable from profile if needed).");
    }
}
