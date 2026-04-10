using System.ComponentModel.DataAnnotations;

namespace EduLearn.API.DTOs;

public class CreateEnrollmentDto
{
    [Required]
    public int StudentID { get; set; }

    [Required]
    public int SectionID { get; set; }
}
