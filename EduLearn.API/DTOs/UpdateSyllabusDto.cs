using System.ComponentModel.DataAnnotations;

namespace EduLearn.API.DTOs;

public class UpdateSyllabusDto
{
    // Version can be updated — e.g. fix a typo or bump "v1.0" to "v1.1"
    [Required]
    [MaxLength(20)]
    [RegularExpression(@"^v?\d+\.\d+(\.\d+)?$", ErrorMessage = "Version must be in format like 1.0, v2.1, or v2.1.3")]
    public string Version { get; set; } = null!;

    // Updated learning outcomes
    public string? LearningOutcomesJSON { get; set; }

    // Updated assessment plan
    public string? AssessmentPlanJSON { get; set; }

    // Updated URI if the document was re-uploaded
    [MaxLength(500)]
    [Url]
    public string? SyllabusURI { get; set; }

    // NOTE: CourseID and CreatedByFK are NOT here
    // Course cannot change after creation (syllabus belongs to a course permanently)
    // CreatedByFK cannot change (who created it is immutable)
}