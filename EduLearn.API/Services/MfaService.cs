// ============================================================
// MFA CHANGE (IAM-03): MfaService.cs — TOTP helper (RFC 6238)
//
// Pure-function service. No DB access. No state.
//   - GenerateSecret()        → fresh Base32 secret (20 bytes)
//   - BuildOtpauthUri(...)    → otpauth:// URI for QR rendering
//   - VerifyCode(secret, code) → true if code valid for current 30-sec window
//
// Backed by Otp.NET (MIT-licensed). Default verification window allows ±1 step
// to tolerate clock skew (RfcSpecifiedNetworkDelay).
//
// Used by: AuthService.cs (setup, verify), UsersController (reset clears secret only)
// ============================================================

using System.Security.Cryptography;
using EduLearn.API.Models;
using OtpNet;

namespace EduLearn.API.Services;

public class MfaService
{
    private const string Issuer = "EduLearn";

    /// <summary>
    /// Generates a fresh 20-byte cryptographically random TOTP secret,
    /// returned as a Base32 string (the standard wire format for TOTP).
    /// </summary>
    public string GenerateSecret()
    {
        var bytes = new byte[20];
        using (var rng = RandomNumberGenerator.Create())
        {
            rng.GetBytes(bytes);
        }
        return Base32Encoding.ToString(bytes);
    }

    /// <summary>
    /// Builds the standard otpauth:// URI used by authenticator apps when scanning a QR.
    /// Format: otpauth://totp/EduLearn:&lt;username&gt;?secret=&lt;b32&gt;&amp;issuer=EduLearn
    /// </summary>
    public string BuildOtpauthUri(User user, string base32Secret)
    {
        var label = Uri.EscapeDataString($"{Issuer}:{user.Username}");
        var issuerEnc = Uri.EscapeDataString(Issuer);
        return $"otpauth://totp/{label}?secret={base32Secret}&issuer={issuerEnc}";
    }

    /// <summary>
    /// Verifies a 6-digit TOTP code against the stored Base32 secret.
    /// Uses a wider verification window (past=2, future=2 steps / ±60 seconds)
    /// to tolerate development clock skew between server and authenticator app.
    /// Returns false on null/empty inputs or invalid Base32.
    /// </summary>
    public bool VerifyCode(string base32Secret, string code)
    {
        if (string.IsNullOrWhiteSpace(base32Secret) || string.IsNullOrWhiteSpace(code))
            return false;

        byte[] secretBytes;
        try
        {
            secretBytes = Base32Encoding.ToBytes(base32Secret);
        }
        catch (FormatException)
        {
            return false;
        }

        var totp = new Totp(secretBytes);
        // VerificationWindow(past, future) allows ±2 steps = ±60s clock skew tolerance
        return totp.VerifyTotp(code, out _, new VerificationWindow(2, 2));
    }
}
