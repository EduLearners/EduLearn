using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using EduLearn.API.Models.Enums;

namespace EduLearn.API.Models;

[Table("Submissions")]
public class Submission
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int SubmissionID { get; set; }

    [Required]
    public int AssessmentID { get; set; }

    [Required]
    public int StudentID { get; set; }

    public DateTime SubmittedAt { get; set; } = DateTime.UtcNow;

    [MaxLength(500)]
    public string? FileURI { get; set; }

    [Column(TypeName = "decimal(5,1)")]
    public decimal? Score { get; set; }

    public int? GraderID { get; set; }

    public DateTime? GradedAt { get; set; }

    [MaxLength(500)]
    public string? PlagiarismReportURI { get; set; }

    [Required]
    public SubmissionStatus Status { get; set; } = SubmissionStatus.Submitted;

    // Navigation properties
    [ForeignKey(nameof(AssessmentID))]
    public Assessment Assessment { get; set; } = null!;

    [ForeignKey(nameof(StudentID))]
    public Student Student { get; set; } = null!;

    [ForeignKey(nameof(GraderID))]
    public User? Grader { get; set; }

    public ICollection<GradeChange> GradeChanges { get; set; } = new List<GradeChange>();
}
