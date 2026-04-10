using EduLearn.API.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EduLearn.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class HealthController : ControllerBase
{
    private readonly AppDbContext _context;

    public HealthController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken cancellationToken)
    {
        var dbStatus = "Unhealthy";
        var dbError = (string?)null;

        try
        {
            await _context.Database.ExecuteSqlRawAsync("SELECT 1", cancellationToken);
            dbStatus = "Healthy";
        }
        catch (Exception ex)
        {
            dbError = ex.Message;
        }

        var result = new
        {
            status = dbStatus == "Healthy" ? "Healthy" : "Unhealthy",
            service = "EduLearn.API",
            version = "11.0",
            timestamp = DateTime.UtcNow,
            database = new
            {
                status = dbStatus,
                name = "EduLearnDb",
                error = dbError
            }
        };

        return dbStatus == "Healthy"
            ? Ok(result)
            : StatusCode(503, result);
    }
}
