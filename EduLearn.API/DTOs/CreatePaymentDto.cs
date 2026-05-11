using System.ComponentModel.DataAnnotations;
using EduLearn.API.Models.Enums;

namespace EduLearn.API.DTOs;

public class CreatePaymentDto
{
    [Required]
    public int InvoiceID { get; set; }

    [Required]
    [Range(0.01, 99999999.99)]   // HARDENING (D-4): block negative / zero / overflow at validation layer
    public decimal Amount { get; set; }

    [Required]
    public PaymentMethod Method { get; set; }

    public string? Reference { get; set; }
}
