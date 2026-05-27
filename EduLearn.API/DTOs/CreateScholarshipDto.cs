using System.ComponentModel.DataAnnotations;

namespace EduLearn.API.DTOs;

public class CreateScholarshipDto
{
    [Required]
    public int StudentID { get; set; }

    [Required]
    [MaxLength(100)]
    [RegularExpression(@"^[a-zA-Z0-9\s\-]+$", ErrorMessage = "Award type can only contain letters, digits, spaces, and hyphens")]
    public string AwardType { get; set; } = null!;

    [Required]
    [Range(0.01, 99999999.99)]   // HARDENING (D-3): block negative / zero / overflow at validation layer
    public decimal Amount { get; set; }

    [Required]
    public DateTime ValidFrom { get; set; }

    [Required]
    public DateTime ValidTo { get; set; }
}
