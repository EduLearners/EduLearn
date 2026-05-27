using System.ComponentModel.DataAnnotations;

namespace EduLearn.API.DTOs;

public class CreateSyllabusDto
{
    // Which course this syllabus belongs to
    [Required]
    public int CourseID { get; set; }

    // Version string — e.g. "v1.0", "Fall-2026", "2026-Semester1"
    [Required]
    [MaxLength(20)]
    [RegularExpression(@"^v?\d+\.\d+(\.\d+)?$", ErrorMessage = "Version must be in format like 1.0, v2.1, or v2.1.3")]
    public string Version { get; set; } = null!;

    // JSON array of learning outcomes — e.g. ["Understand OOP", "Apply SOLID principles"]
    public string? LearningOutcomesJSON { get; set; }

    // JSON describing assessment plan — e.g. [{"type":"Quiz","weight":20},{"type":"Assignment","weight":80}]
    public string? AssessmentPlanJSON { get; set; }

    // Optional URI pointing to the full syllabus document (PDF in blob storage)
    [MaxLength(500)]
    [Url]
    public string? SyllabusURI { get; set; }

    // NOTE: CreatedByFK is NOT here — it comes from the JWT (same pattern as Content and Assessment)
}