using System.ComponentModel.DataAnnotations;

namespace EduLearn.API.DTOs;

public class UpdateSyllabusDto
{
    // Version can be updated — e.g. fix a typo or bump "v1.0" to "v1.1"
    [Required]
    [MaxLength(20)]
    public string Version { get; set; } = null!;

    // Updated learning outcomes
    public string? LearningOutcomesJSON { get; set; }

    // Updated assessment plan
    public string? AssessmentPlanJSON { get; set; }

    // Updated URI if the document was re-uploaded
    [MaxLength(500)]
    public string? SyllabusURI { get; set; }

    // NOTE: CourseID and CreatedByFK are NOT here
    // Course cannot change after creation (syllabus belongs to a course permanently)
    // CreatedByFK cannot change (who created it is immutable)
}