using System.ComponentModel.DataAnnotations;

namespace EduLearn.API.DTOs;

public class CreateApplicantDto
{
    [Required]
    [MaxLength(200)]
    [RegularExpression(@"^[\p{L}\s'\-\.]+$", ErrorMessage = "Name can only contain letters, spaces, hyphens, apostrophes, and dots")]
    public string Name { get; set; } = null!;

    [Required]
    public DateTime DOB { get; set; }

    [MaxLength(50)]
    [MinLength(4)]
    [RegularExpression(@"^[a-zA-Z0-9\-]+$", ErrorMessage = "National ID can only contain letters, digits, and hyphens")]
    public string? NationalID { get; set; }

    public string? ContactInfoJSON { get; set; }

    [Required]
    [MaxLength(100)]
    [RegularExpression(@"^[\p{L}\d\s\-()\.&,]+$", ErrorMessage = "Program name contains invalid characters")]
    public string ProgramApplied { get; set; } = null!;

    public string? DocumentsURIJSON { get; set; }
}
