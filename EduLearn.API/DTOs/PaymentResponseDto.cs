using EduLearn.API.Models.Enums;

namespace EduLearn.API.DTOs;

public class PaymentResponseDto
{
    public int PaymentID { get; set; }
    public int InvoiceID { get; set; }
    public decimal Amount { get; set; }
    public PaymentMethod Method { get; set; }
    public string? Reference { get; set; }
    public PaymentStatus Status { get; set; }
    public DateTime PaidAt { get; set; }
}
