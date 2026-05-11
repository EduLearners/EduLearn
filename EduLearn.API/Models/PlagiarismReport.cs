// ============================================================
// AGI-04: PlagiarismReport.cs
// Stores a plagiarism flag raised against a student submission.
// One submission can have multiple reports (e.g. re-review after appeal).
// ============================================================

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using EduLearn.API.Models.Enums;

namespace EduLearn.API.Models;

[Table("PlagiarismReports")]
public class PlagiarismReport
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int ReportID { get; set; }

    // The submission being flagged
    [Required]
    public int SubmissionID { get; set; }

    // User (Instructor or ITAdmin) who raised the flag
    [Required]
    public int FlaggedByUserID { get; set; }

    // Similarity percentage 0.00 - 100.00
    [Required]
    [Column(TypeName = "decimal(5,2)")]
    public decimal SimilarityScore { get; set; }

    // Free-text details: matched sources, tool output, notes, etc.
    [MaxLength(2000)]
    public string? Details { get; set; }

    // Lifecycle: Pending -> Confirmed | Dismissed
    [Required]
    public PlagiarismStatus Status { get; set; } = PlagiarismStatus.Pending;

    public DateTime FlaggedAt { get; set; } = DateTime.UtcNow;

    // Set when an ITAdmin confirms or dismisses the report
    public DateTime? ResolvedAt { get; set; }

    // Navigation properties
    [ForeignKey(nameof(SubmissionID))]
    public Submission Submission { get; set; } = null!;

    [ForeignKey(nameof(FlaggedByUserID))]
    public User FlaggedBy { get; set; } = null!;
}
