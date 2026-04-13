using EduLearn.API.Models.Enums;

namespace EduLearn.API.DTOs;

public class InvoiceResponseDto
{
    public int InvoiceID { get; set; }
    public int StudentID { get; set; }
    public string StudentName { get; set; } = string.Empty;
    public string Term { get; set; } = string.Empty;
    public string LineItemsJSON { get; set; } = string.Empty;
    public decimal AmountDue { get; set; }
    public DateTime IssuedAt { get; set; }
    public DateTime DueDate { get; set; }
    public InvoiceStatus Status { get; set; }
    public string? InvoiceURI { get; set; }
}
