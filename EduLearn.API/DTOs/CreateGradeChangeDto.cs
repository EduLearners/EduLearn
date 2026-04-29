using System.ComponentModel.DataAnnotations;

namespace EduLearn.API.DTOs;

public class CreateGradeChangeDto
{
    // Which submission is being modified
    [Required]
    public int SubmissionID { get; set; }

    // Score before the change
    [Required]
    [Range(0, 1000)]
    public decimal OldScore { get; set; }

    // Score after the change
    [Required]
    [Range(0, 1000)]
    public decimal NewScore { get; set; }

    // Why the change is being recorded
    [Required]
    [MaxLength(500)]
    public string Reason { get; set; } = null!;

    // Optional internal audit note
    public string? AuditNote { get; set; }

    // NOTE: ChangedByFK is NOT here — it comes from the JWT (same pattern as GradeSubmissionDto)
}