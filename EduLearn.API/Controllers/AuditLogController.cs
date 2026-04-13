// ============================================================
// AUDIT CHANGE: AuditLogController.cs — Audit Log Query Endpoint (IAM-04)
//
// One endpoint: GET /api/audit-log
// Access: Auditor and ITAdmin only (PRD Section 6.1)
//
// Query filters (all optional, combine as needed):
//   GET /api/audit-log                                    → last 100 logs
//   GET /api/audit-log?userId=1                           → logs by user
//   GET /api/audit-log?action=LoginSuccess                → logs by action
//   GET /api/audit-log?resourceType=Enrollment            → logs by entity type
//   GET /api/audit-log?resourceType=Enrollment&resourceId=5  → logs for specific entity
//   GET /api/audit-log?from=2026-04-01&to=2026-04-13     → logs in date range
//   GET /api/audit-log?limit=50                           → control result count
//
// This is READ-ONLY. No POST/PUT/DELETE endpoints.
// Audit logs are written by AuditLogService.LogAsync() from other services.
// ============================================================

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using EduLearn.API.Services;

namespace EduLearn.API.Controllers;

[ApiController]
[Route("api/audit-log")]
[Authorize] // AUDIT: Requires valid JWT token
public class AuditLogController : ControllerBase
{
    private readonly AuditLogService _auditLogService;

    // AUDIT: AuditLogService injected by DI (registered in Program.cs)
    public AuditLogController(AuditLogService auditLogService)
    {
        _auditLogService = auditLogService;
    }

    // ════════════════════════════════════════
    // AUDIT: GET /api/audit-log — Query audit trail
    // Access: Auditor and ITAdmin only
    // ════════════════════════════════════════
    [HttpGet]
    [Authorize(Roles = "Auditor,ITAdmin")]
    public async Task<IActionResult> GetAuditLogs(
        [FromQuery] int? userId,
        [FromQuery] string? action,
        [FromQuery] string? resourceType,
        [FromQuery] int? resourceId,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] int limit = 100)
    {
        // AUDIT: Apply filters based on which query parameters were provided

        // Filter by user — "show me everything user #1 did"
        if (userId.HasValue)
        {
            var logs = await _auditLogService.GetByUserIdAsync(userId.Value);
            return Ok(logs);
        }

        // Filter by action — "show me all login attempts"
        if (!string.IsNullOrEmpty(action))
        {
            var logs = await _auditLogService.GetByActionAsync(action);
            return Ok(logs);
        }

        // Filter by resource — "show me everything that happened to Enrollment #5"
        if (!string.IsNullOrEmpty(resourceType) && resourceId.HasValue)
        {
            var logs = await _auditLogService.GetByResourceAsync(resourceType, resourceId.Value);
            return Ok(logs);
        }

        // Filter by date range — "show me everything from April 1-13"
        if (from.HasValue && to.HasValue)
        {
            var logs = await _auditLogService.GetByDateRangeAsync(from.Value, to.Value);
            return Ok(logs);
        }

        // No filters — return recent logs (default last 100)
        var allLogs = await _auditLogService.GetAllAsync(limit);
        return Ok(allLogs);
    }
}
