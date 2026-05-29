using System.ComponentModel.DataAnnotations;
using EduLearn.API.Models.Enums;

namespace EduLearn.API.DTOs;

// HARDENING (M-1): Update-only DTO for PUT /api/assessments/{id}.
// Excludes CourseID (an assessment can't be re-parented to a different course) and
// CreatedByFK (immutable — original creator preserved). The PUT handler previously
// accepted CreateAssessmentDto, which allowed both mutations silently.
public class UpdateAssessmentDto
{
    [Required]
    [StringLength(200)]
    [RegularExpression(@"^[\w\s\-:()&,\.'\""\/]+$", ErrorMessage = "Title contains invalid characters")]
    public string Title { get; set; } = string.Empty;

    [Required]
    public AssessmentType Type { get; set; }

    public DateTime? DueAt { get; set; }

    [Required]
    [Range(0.1, 9999.9)]
    public decimal MaxScore { get; set; }

    public string? GradingRubricJSON { get; set; }

    // Optional link to the assignment brief / question paper
    [StringLength(500)]
    [Url]
    public string? InstructionsURI { get; set; }

    public int? SectionID { get; set; }
}
