using System.ComponentModel.DataAnnotations;

namespace EduLearn.API.DTOs;

public class GenerateInvoiceDto
{
    [Required]
    public int StudentID { get; set; }

    [Required]
    [MaxLength(20)]
    public string Term { get; set; } = null!;

    [Required]
    public DateTime DueDate { get; set; }
}
