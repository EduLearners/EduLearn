using System.ComponentModel.DataAnnotations;

namespace EduLearn.API.DTOs;

public class CreateCourseDto
{
    [Required]
    [MaxLength(20)]
    public string Code { get; set; } = null!;

    [Required]
    [MaxLength(200)]
    public string Title { get; set; } = null!;

    public string? Description { get; set; }

    [Range(1, 12)]
    public int Credits { get; set; } = 3;

    public int? DepartmentID { get; set; }

    [MaxLength(20)]
    public string? Level { get; set; }

    public string? PrerequisitesJSON { get; set; }
}
