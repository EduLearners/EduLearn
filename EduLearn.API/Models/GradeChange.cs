using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EduLearn.API.Models;

[Table("GradeChanges")]
public class GradeChange
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int GradeChangeID { get; set; }

    [Required]
    public int SubmissionID { get; set; }

    [Required]
    [Column(TypeName = "decimal(5,1)")]
    public decimal OldScore { get; set; }

    [Required]
    [Column(TypeName = "decimal(5,1)")]
    public decimal NewScore { get; set; }

    [Required]
    public int ChangedByFK { get; set; }

    public DateTime ChangedAt { get; set; } = DateTime.UtcNow;

    [Required]
    [MaxLength(500)]
    public string Reason { get; set; } = null!;

    public string? AuditNote { get; set; }

    // Navigation properties
    [ForeignKey(nameof(SubmissionID))]
    public Submission Submission { get; set; } = null!;

    [ForeignKey(nameof(ChangedByFK))]
    public User ChangedBy { get; set; } = null!;
}
