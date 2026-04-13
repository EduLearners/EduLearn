using System.ComponentModel.DataAnnotations;

namespace EduLearn.API.DTOs;

public class CreateStudentDto
{
    [Required]
    public int UserID { get; set; }

    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = null!;

    [Required]
    public DateTime DOB { get; set; }

    [MaxLength(10)]
    public string? Gender { get; set; }

    public string? ContactInfoJSON { get; set; }

    [Required]
    public int ProgramID { get; set; }

    [Required]
    [MaxLength(20)]
    public string EntryTerm { get; set; } = null!;

    [MaxLength(20)]
    public string? ExpectedGraduationTerm { get; set; }
}
