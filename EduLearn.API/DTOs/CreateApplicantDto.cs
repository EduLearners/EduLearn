using System.ComponentModel.DataAnnotations;

namespace EduLearn.API.DTOs;

public class CreateApplicantDto
{
    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = null!;

    [Required]
    public DateTime DOB { get; set; }

    [MaxLength(50)]
    [MinLength(4)]
    public string? NationalID { get; set; }

    public string? ContactInfoJSON { get; set; }

    [Required]
    [MaxLength(100)]
    public string ProgramApplied { get; set; } = null!;

    public string? DocumentsURIJSON { get; set; }
}
