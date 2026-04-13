// ============================================================
// AUDIT CHANGE: AuditLogService.cs — Reusable Audit Logging Service (IAM-04)
//
// This is the service ALL teammates will use to log actions.
// One simple method: LogAsync(userId, action, resourceType, resourceId, details)
//
// ┌──────────────────────────────────────────────────────────┐
// │  HOW OTHER TEAMMATES USE THIS SERVICE:                   │
// │                                                          │
// │  Step 1: Inject in constructor                           │
// │    private readonly AuditLogService _auditLogService;    │
// │                                                          │
// │  Step 2: Call LogAsync after any important action         │
// │    await _auditLogService.LogAsync(                      │
// │        userId,                                           │
// │        "EnrollmentCreated",                              │
// │        "Enrollment",                                     │
// │        enrollment.EnrollID,                              │
// │        new { studentId = 1, sectionId = 3 }              │
// │    );                                                    │
// │                                                          │
// │  That's it. No need to touch AuditLog entity or repo.    │
// └──────────────────────────────────────────────────────────┘
//
// Used by: AuthService.cs, and any future controller/service
// ============================================================

using System.Text.Json;
using EduLearn.API.Models;
using EduLearn.API.Repositories.Interfaces;

namespace EduLearn.API.Services;

public class AuditLogService
{
    private readonly IAuditLogRepository _auditLogRepository;

    public AuditLogService(IAuditLogRepository auditLogRepository)
    {
        _auditLogRepository = auditLogRepository;
    }

    // ════════════════════════════════════════
    // AUDIT: The one method everyone calls to log an action
    // ════════════════════════════════════════
    //
    // Parameters:
    //   userId       → WHO did the action (from JWT: User.FindFirst(ClaimTypes.NameIdentifier))
    //   action       → WHAT happened ("LoginSuccess", "EnrollmentCreated", "GradeChanged")
    //   resourceType → WHICH entity ("User", "Enrollment", "Submission", "Payment")
    //   resourceId   → ID of that entity (e.g., enrollmentId = 5)
    //   details      → OPTIONAL extra info as object — gets serialized to JSON
    //
    // Example calls from other services:
    //
    //   // Auth: user registered
    //   await _auditLogService.LogAsync(user.UserID, "UserRegistered", "User", user.UserID,
    //       new { role = "Student" });
    //
    //   // Enrollment: student enrolled
    //   await _auditLogService.LogAsync(userId, "EnrollmentCreated", "Enrollment", enrollment.EnrollID,
    //       new { studentId = 1, sectionId = 3, status = "Enrolled" });
    //
    //   // Grading: submission graded
    //   await _auditLogService.LogAsync(graderId, "SubmissionGraded", "Submission", submission.SubmissionID,
    //       new { score = 85.5, assessmentId = 10 });
    //
    //   // Finance: payment recorded
    //   await _auditLogService.LogAsync(userId, "PaymentRecorded", "Payment", payment.PaymentID,
    //       new { invoiceId = 2, amount = 50000, method = "UPI" });
    //
    //   // Admin: user status changed
    //   await _auditLogService.LogAsync(adminId, "UserStatusChanged", "User", targetUserId,
    //       new { oldStatus = "Active", newStatus = "Suspended" });
    //
    public async Task LogAsync(int userId, string action, string resourceType, int resourceId, object? details = null)
    {
        // AUDIT: Create a new immutable log entry
        var log = new AuditLog
        {
            UserID       = userId,
            Action       = action,
            ResourceType = resourceType,
            ResourceID   = resourceId,
            // AUDIT: Serialize the details object to JSON string (null if no details)
            DetailsJSON  = details != null ? JsonSerializer.Serialize(details) : null,
            Timestamp    = DateTime.UtcNow
        };

        // AUDIT: Save via repository (append-only — no update, no delete)
        await _auditLogRepository.CreateAsync(log);
    }

    // ════════════════════════════════════════
    // AUDIT: Query methods (used by AuditLogController)
    // ════════════════════════════════════════

    // AUDIT: Get all recent logs (default last 100)
    public async Task<IEnumerable<AuditLog>> GetAllAsync(int limit = 100)
    {
        return await _auditLogRepository.GetAllAsync(limit);
    }

    // AUDIT: Get logs filtered by userId
    public async Task<IEnumerable<AuditLog>> GetByUserIdAsync(int userId)
    {
        return await _auditLogRepository.GetByUserIdAsync(userId);
    }

    // AUDIT: Get logs filtered by action
    public async Task<IEnumerable<AuditLog>> GetByActionAsync(string action)
    {
        return await _auditLogRepository.GetByActionAsync(action);
    }

    // AUDIT: Get logs filtered by resource type and id
    public async Task<IEnumerable<AuditLog>> GetByResourceAsync(string resourceType, int resourceId)
    {
        return await _auditLogRepository.GetByResourceAsync(resourceType, resourceId);
    }

    // AUDIT: Get logs filtered by date range
    public async Task<IEnumerable<AuditLog>> GetByDateRangeAsync(DateTime from, DateTime to)
    {
        return await _auditLogRepository.GetByDateRangeAsync(from, to);
    }
}
