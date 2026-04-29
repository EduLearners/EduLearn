namespace EduLearn.API.DTOs;

public class GradeChangeResponseDto
{
    public int GradeChangeID { get; set; }

    // Which submission was re-graded
    public int SubmissionID { get; set; }

    // Score before the change
    public decimal OldScore { get; set; }

    // Score after the change
    public decimal NewScore { get; set; }

    // Who made the change (instructor UserID)
    public int ChangedByFK { get; set; }

    // Who made the change (instructor full name — from ChangedBy navigation)
    public string ChangedByName { get; set; } = null!;

    // When the change was made
    public DateTime ChangedAt { get; set; }

    // Why the change was made
    public string Reason { get; set; } = null!;

    // Optional internal audit note (e.g. "Re-graded from 40 to 45")
    public string? AuditNote { get; set; }
}