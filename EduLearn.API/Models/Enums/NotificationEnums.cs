namespace EduLearn.API.Models.Enums;

public enum NotificationCategory
{
    Enrollment, Grade, Finance, System, Academic
}

public enum NotificationSeverity
{
    Info, Warning, Error, Critical
}

public enum NotificationStatus
{
    Active, Dismissed
}

public enum TicketStatus
{
    Open, InProgress, Resolved, Closed
}

public enum TicketPriority
{
    Low, Medium, High, Critical
}
