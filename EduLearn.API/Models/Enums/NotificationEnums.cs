namespace EduLearn.API.Models.Enums;

// NHT-01 — enum values per PRD §6.9 (Notifications, Helpdesk & Tasks).
// Aligned 2026-04-20: Grade→Assessment, added IT, removed Academic, removed Error severity.
public enum NotificationCategory
{
    Enrollment,
    Assessment,
    Finance,
    IT,
    System
}

public enum NotificationSeverity
{
    Info,
    Warning,
    Critical
}

public enum NotificationStatus
{
    Active,
    Dismissed
}

public enum TicketStatus
{
    Open, InProgress, Resolved, Closed
}

public enum TicketPriority
{
    Low, Medium, High, Critical
}
