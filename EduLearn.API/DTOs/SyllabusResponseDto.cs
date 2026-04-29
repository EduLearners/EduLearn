namespace EduLearn.API.DTOs;

public class SyllabusResponseDto
{
    public int SyllabusID { get; set; }

    // Course this syllabus belongs to
    public int CourseID { get; set; }

    // CourseName from Course navigation property
    public string CourseName { get; set; } = null!;

    // Version string e.g. "v1.0", "Fall-2026"
    public string Version { get; set; } = null!;

    // JSON of learning outcomes
    public string? LearningOutcomesJSON { get; set; }

    // JSON of assessment plan
    public string? AssessmentPlanJSON { get; set; }

    // Who created this syllabus (UserID)
    public int CreatedByFK { get; set; }

    // Who created this syllabus (full name from CreatedBy navigation)
    public string CreatedByName { get; set; } = null!;

    // When it was created
    public DateTime CreatedAt { get; set; }

    // URI to the full syllabus document (PDF etc.)
    public string? SyllabusURI { get; set; }
}