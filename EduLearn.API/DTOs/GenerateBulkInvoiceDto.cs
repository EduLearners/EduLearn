using System.ComponentModel.DataAnnotations;

namespace EduLearn.API.DTOs;

public class GenerateBulkInvoiceDto
{
    [Required]
    public int ProgramID { get; set; }

    [Required]
    [MaxLength(20)]
    public string Term { get; set; } = null!;

    [Required]
    public DateTime DueDate { get; set; }
}
