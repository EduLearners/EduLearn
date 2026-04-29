namespace EduLearn.API.DTOs;

public class PrerequisiteCheckResponseDto
{
    // The course being checked
    public int CourseID { get; set; }
    public string CourseCode { get; set; } = null!;
    public string CourseTitle { get; set; } = null!;

    // The student being checked
    public int StudentID { get; set; }
    public string StudentName { get; set; } = null!;

    // Overall result — true only if ALL prerequisites are met
    public bool AllPrerequisitesMet { get; set; }

    // Detailed result per prerequisite course
    public List<PrerequisiteDetailDto> Prerequisites { get; set; } = new();
}

public class PrerequisiteDetailDto
{
    // The prerequisite course
    public int CourseID { get; set; }
    public string CourseCode { get; set; } = null!;
    public string CourseTitle { get; set; } = null!;

    // Whether the student has completed this prerequisite
    public bool Met { get; set; }

    // Extra info — which term they passed it (if met)
    public string? CompletedInTerm { get; set; }
}
