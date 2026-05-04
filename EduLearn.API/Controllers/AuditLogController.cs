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
    /// <summary>
    /// Query the audit trail with optional filters. Auditor and ITAdmin only.
    /// Supports filtering by user, action, resource type, resource ID, and date range.
    /// </summary>
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
        // AUDIT (HARDENING M-2): Delegate to QueryAsync which AND-composes every
        // supplied filter into a single IQueryable. This replaces the previous
        // first-match if/else chain that silently ignored secondary filters
        // (e.g. ?userId=1&action=Login only honored userId before).
        //
        // AUDIT (HARDENING U-2): `limit` is clamped to [1, 1000] inside
        // QueryAsync to block attackers passing limit=int.MaxValue.
        var logs = await _auditLogService.QueryAsync(
            userId,
            action,
            resourceType,
            resourceId,
            from,
            to,
            limit);

        return Ok(logs);
    }
}
