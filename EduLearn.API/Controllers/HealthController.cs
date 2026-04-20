using EduLearn.API.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EduLearn.API.Controllers;

[ApiController]
[Route("api/[controller]")]
// HARDENING (N-1): operational endpoint, ITAdmin only. Previously anonymous + leaked
// ex.Message from DB probes. Now gated by AdminPolicy.
[Authorize(Policy = "AdminPolicy")]
public class HealthController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ILogger<HealthController> _logger;

    public HealthController(AppDbContext context, ILogger<HealthController> logger)
    {
        _context = context;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken cancellationToken)
    {
        var dbHealthy = false;

        try
        {
            await _context.Database.ExecuteSqlRawAsync("SELECT 1", cancellationToken);
            dbHealthy = true;
        }
        catch (Exception ex)
        {
            // HARDENING (N-1): log server-side, return only a boolean to the caller.
            // Previously returned ex.Message, leaking SQL server names and schema hints.
            _logger.LogWarning(ex, "Health check DB probe failed");
        }

        var result = new
        {
            status = dbHealthy ? "Healthy" : "Unhealthy",
            service = "EduLearn.API",
            timestamp = DateTime.UtcNow,
            database = dbHealthy ? "Healthy" : "Unhealthy"
        };

        return dbHealthy ? Ok(result) : StatusCode(503, result);
    }
}
