using System.ComponentModel.DataAnnotations;

namespace EduLearn.API.DTOs;

public class CreateProgramDto
{
    [Required]
    [MaxLength(200)]
    [RegularExpression(@"^[\p{L}\d\s\-()\.&,]+$", ErrorMessage = "Program name contains invalid characters")]
    public string Name { get; set; } = null!;// The name of the program like B.Tech

    public int? DepartmentID { get; set; }

    [Required]
    [MaxLength(50)]
    [RegularExpression(@"^[a-zA-Z\.\s]+$", ErrorMessage = "Degree type can only contain letters, dots, and spaces")]
    public string DegreeType { get; set; } = null!;

    public string? RequiredCoursesJSON { get; set; }//Nullable because a program might be created before courses are assigned.


    public string? ElectivesJSON { get; set; }

    [Range(1, 20)]
    public int DurationTerms { get; set; } = 8;//years-4
}
