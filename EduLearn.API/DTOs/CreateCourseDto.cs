using System.ComponentModel.DataAnnotations;

namespace EduLearn.API.DTOs;

public class CreateCourseDto
{
    [Required]
    [MaxLength(20)]
    [RegularExpression(@"^[A-Z]{2,6}\d{2,6}$", ErrorMessage = "Course code must be 2-6 uppercase letters followed by 2-6 digits")]
    public string Code { get; set; } = null!;

    [Required]
    [MaxLength(200)]
    [RegularExpression(@"^[\w\s\-:()&,\.'\""\/]+$", ErrorMessage = "Title contains invalid characters")]
    public string Title { get; set; } = null!;

    [MaxLength(4000)]
    public string? Description { get; set; }

    [Range(1, 12)]
    public int Credits { get; set; } = 3;

    public int? DepartmentID { get; set; }

    [MaxLength(20)]
    [RegularExpression(@"^[a-zA-Z0-9\s\-]*$", ErrorMessage = "Level can only contain letters, digits, spaces, and hyphens")]
    public string? Level { get; set; }

    public string? PrerequisitesJSON { get; set; }
}
