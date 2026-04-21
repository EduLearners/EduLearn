using System.Security.Claims;

namespace EduLearn.API.Extensions;


public static class ClaimsPrincipalExtensions
{
    
    public static int GetUserId(this ClaimsPrincipal user)
    {//we are searching the security tocken(JWT) for the claim that has the nameidentifier, which is the user id. If it is not found
        var raw = user.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? throw new InvalidOperationException(//?? is row is null then it will be executes
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
