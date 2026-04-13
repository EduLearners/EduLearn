using System.ComponentModel.DataAnnotations;
using EduLearn.API.Models.Enums;

namespace EduLearn.API.DTOs;

public class CreatePaymentDto
{
    [Required]
    public int InvoiceID { get; set; }

    [Required]
    public decimal Amount { get; set; }

    [Required]
    public PaymentMethod Method { get; set; }

    public string? Reference { get; set; }
}
