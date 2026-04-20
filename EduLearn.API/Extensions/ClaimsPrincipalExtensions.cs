using System.Security.Claims;

namespace EduLearn.API.Extensions;

// Shared JWT subject/role extraction helpers.
// Single source of truth for "who is calling" — used by every controller
// that needs ownership checks. Previously duplicated inline in Tickets and
// Notifications controllers.
public static class ClaimsPrincipalExtensions
{
    // Returns the UserID from the JWT NameIdentifier claim.
    // Safe to call from any [Authorize]-protected endpoint.
    // Throws InvalidOperationException if the claim is missing — which
    // only happens when called from an unauthenticated context.
    public static int GetUserId(this ClaimsPrincipal user)
    {
        var raw = user.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? throw new InvalidOperationException(
                "NameIdentifier claim missing — is the endpoint [Authorize]-protected?");
        return int.Parse(raw);
    }

    // Returns the role string from the JWT Role claim, or empty if absent.
    public static string GetUserRole(this ClaimsPrincipal user)
        => user.FindFirst(ClaimTypes.Role)?.Value ?? string.Empty;

    // True if the caller has the ITAdmin role.
    public static bool IsITAdmin(this ClaimsPrincipal user)
        => user.GetUserRole() == "ITAdmin";
}
