// ============================================================
// AUDIT CHANGE: IAuditLogRepository.cs — Audit Log Repository Interface (IAM-04)
//
// IMPORTANT: This is APPEND-ONLY (PRD requirement)
//   - CreateAsync() → YES (write new log entry)
//   - GetXxxAsync() → YES (read/query logs)
//   - UpdateAsync() → NO (does not exist — logs are immutable)
//   - DeleteAsync() → NO (does not exist — logs are permanent)
//
// Used by: AuditLogService.cs, AuditLogController.cs
// ============================================================

using EduLearn.API.Models;

namespace EduLearn.API.Repositories.Interfaces;

public interface IAuditLogRepository
{
    // AUDIT: Write a new log entry (append-only — this is the only write operation)
    Task<AuditLog> CreateAsync(AuditLog log);

    // AUDIT (HARDENING M-2): Expose an IQueryable so the service layer can AND-compose
    // filters in a single SQL round-trip instead of routing to a first-match helper.
    IQueryable<AuditLog> GetQueryable();

    // AUDIT: Get all logs (with optional limit for performance)
    Task<IEnumerable<AuditLog>> GetAllAsync(int limit = 100);

    // AUDIT: Get logs by user — "show me everything this user did"
    Task<IEnumerable<AuditLog>> GetByUserIdAsync(int userId);

    // AUDIT: Get logs by action type — "show me all login attempts"
    Task<IEnumerable<AuditLog>> GetByActionAsync(string action);

    // AUDIT: Get logs by entity — "show me everything that happened to Enrollment #5"
    Task<IEnumerable<AuditLog>> GetByResourceAsync(string resourceType, int resourceId);

    // AUDIT: Get logs by date range — "show me everything from April 1-13"
    Task<IEnumerable<AuditLog>> GetByDateRangeAsync(DateTime from, DateTime to);

    // NOTE: No UpdateAsync() and no DeleteAsync() — audit logs are immutable per PRD
}
