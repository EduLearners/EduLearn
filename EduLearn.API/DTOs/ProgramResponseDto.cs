using EduLearn.API.Models.Enums;

namespace EduLearn.API.DTOs;

public class ProgramResponseDto
{
    public int ProgramID { get; set; }
    public string Name { get; set; } = null!;
    public int? DepartmentID { get; set; }
    public string DegreeType { get; set; } = null!;
    public string? RequiredCoursesJSON { get; set; }
    public string? ElectivesJSON { get; set; }
    public int DurationTerms { get; set; }
    public ProgramStatus Status { get; set; }//status enum (Active/Suspended/Discontinued)
}
