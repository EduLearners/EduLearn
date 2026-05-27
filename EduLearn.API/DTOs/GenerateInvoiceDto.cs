using System.ComponentModel.DataAnnotations;

namespace EduLearn.API.DTOs;

public class GenerateInvoiceDto
{
    [Required]
    public int StudentID { get; set; }

    [Required]
    [MaxLength(20)]
    [RegularExpression(@"^20[0-3]\d-(Spring|Summer|Fall|Winter)$", ErrorMessage = "Term must be in format YYYY-Season (e.g. 2026-Spring)")]
    public string Term { get; set; } = null!;

    [Required]
    public DateTime DueDate { get; set; }
}
