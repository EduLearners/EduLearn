using EduLearn.API.DTOs;
using EduLearn.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace EduLearn.API.Controllers;

[ApiController]
[Route("api/clientlogs")]
public class ClientLogsController : ControllerBase
{
    private readonly IErrorLogService _svc;
    public ClientLogsController(IErrorLogService svc) { _svc = svc; }

    [HttpPost]
    [Authorize]
    [EnableRateLimiting("clientlog")]
    public async Task<IActionResult> Post([FromBody] ClientErrorDto dto, CancellationToken ct)
    {
        await _svc.LogClientErrorAsync(dto, User, ct);
        return Accepted();
    }

    [HttpGet]
    [Authorize(Policy = "AdminPolicy")]
    public async Task<ActionResult> List([FromQuery] ErrorQueryDto q, CancellationToken ct)
    {
        var (items, total) = await _svc.QueryAsync(q, ct);
        return Ok(new { items, total, q.Page, q.PageSize });
    }

    [HttpPost("{id:int}/resolve")]
    [Authorize(Policy = "AdminPolicy")]
    public async Task<IActionResult> Resolve(int id, [FromBody] ResolveDto dto, CancellationToken ct)
    {
        var ok = await _svc.MarkResolvedAsync(id, User, dto?.Note, ct);
        return ok ? NoContent() : NotFound();
    }
}
