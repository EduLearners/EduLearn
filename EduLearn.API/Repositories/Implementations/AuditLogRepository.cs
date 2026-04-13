// ============================================================
// AUDIT CHANGE: AuditLogRepository.cs — Audit Log Repository (IAM-04)
//
// Implements IAuditLogRepository with AppDbContext.
// APPEND-ONLY: Only Add() and read queries. No Update, no Remove.
// All read queries use .AsNoTracking() for performance (PRD 5.4).
// Results ordered by Timestamp descending (newest first).
//
// Used by: AuditLogService.cs (via DI)
// ============================================================

using EduLearn.API.Data;
using EduLearn.API.Models;
using EduLearn.API.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace EduLearn.API.Repositories.Implementations;

public class AuditLogRepository : IAuditLogRepository
{
    private readonly AppDbContext _context;

    public AuditLogRepository(AppDbContext context)
    {
        _context = context;
    }

    // AUDIT: Write a new log entry — the only write operation allowed
    public async Task<AuditLog> CreateAsync(AuditLog log)
    {
        _context.AuditLogs.Add(log);
        await _context.SaveChangesAsync();
        return log;
    }

    // AUDIT: Get recent logs (default last 100, newest first)
    public async Task<IEnumerable<AuditLog>> GetAllAsync(int limit = 100)
    {
        return await _context.AuditLogs
            .AsNoTracking()
            .OrderByDescending(a => a.Timestamp)
            .Take(limit)
            .ToListAsync();
    }

    // AUDIT: Get all logs for a specific user
    public async Task<IEnumerable<AuditLog>> GetByUserIdAsync(int userId)
    {
        return await _context.AuditLogs
            .AsNoTracking()
            .Where(a => a.UserID == userId)
            .OrderByDescending(a => a.Timestamp)
            .ToListAsync();
    }

    // AUDIT: Get all logs for a specific action (e.g., "LoginSuccess")
    public async Task<IEnumerable<AuditLog>> GetByActionAsync(string action)
    {
        return await _context.AuditLogs
            .AsNoTracking()
            .Where(a => a.Action == action)
            .OrderByDescending(a => a.Timestamp)
            .ToListAsync();
    }

    // AUDIT: Get all logs for a specific entity (e.g., ResourceType="Enrollment", ResourceID=5)
    public async Task<IEnumerable<AuditLog>> GetByResourceAsync(string resourceType, int resourceId)
    {
        return await _context.AuditLogs
            .AsNoTracking()
            .Where(a => a.ResourceType == resourceType && a.ResourceID == resourceId)
            .OrderByDescending(a => a.Timestamp)
            .ToListAsync();
    }

    // AUDIT: Get logs within a date range
    public async Task<IEnumerable<AuditLog>> GetByDateRangeAsync(DateTime from, DateTime to)
    {
        return await _context.AuditLogs
            .AsNoTracking()
            .Where(a => a.Timestamp >= from && a.Timestamp <= to)
            .OrderByDescending(a => a.Timestamp)
            .ToListAsync();
    }

    // NOTE: No UpdateAsync() — audit logs cannot be modified (PRD: append-only)
    // NOTE: No DeleteAsync() — audit logs cannot be deleted (PRD: immutable)
}
