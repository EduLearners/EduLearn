namespace EduLearn.API.Models.Enums;

public enum FeeScheduleStatus
{
    Draft, Active, Superseded
}

public enum InvoiceStatus
{
    Pending, PartiallyPaid, Paid, Overdue, Cancelled
}

public enum PaymentStatus
{
    Completed, Failed, Refunded
}

public enum PaymentMethod
{
    BankTransfer, Cash, Card, UPI, Cheque
}

public enum ScholarshipStatus
{
    Active, Suspended, Revoked, Expired
}
