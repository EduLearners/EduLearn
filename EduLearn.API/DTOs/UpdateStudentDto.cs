using System.ComponentModel.DataAnnotations;

namespace EduLearn.API.DTOs;

public class UpdateStudentDto
{
    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = null!;

    [MaxLength(10)]
    public string? Gender { get; set; }

    public string? ContactInfoJSON { get; set; }

    [MaxLength(20)]
    public string? ExpectedGraduationTerm { get; set; }
}
