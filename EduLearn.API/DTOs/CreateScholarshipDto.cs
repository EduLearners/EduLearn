using System.ComponentModel.DataAnnotations;

namespace EduLearn.API.DTOs;

public class CreateScholarshipDto
{
    [Required]
    public int StudentID { get; set; }

    [Required]
    [MaxLength(100)]
    public string AwardType { get; set; } = null!;

    [Required]
    public decimal Amount { get; set; }

    [Required]
    public DateTime ValidFrom { get; set; }

    [Required]
    public DateTime ValidTo { get; set; }
}
