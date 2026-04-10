using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using EduLearn.API.Models.Enums;

namespace EduLearn.API.Models;

[Table("Assessments")]
public class Assessment
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int AssessmentID { get; set; }

    [Required]
    public int CourseID { get; set; }

    public int? SectionID { get; set; }

    [Required]
    [MaxLength(200)]
    public string Title { get; set; } = null!;

    [Required]
    public AssessmentType Type { get; set; }

    public DateTime? DueAt { get; set; }

    [Required]
    [Column(TypeName = "decimal(5,1)")]
    public decimal MaxScore { get; set; }

    public string? GradingRubricJSON { get; set; }

    [Required]
    public int CreatedByFK { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Required]
    public AssessmentStatus Status { get; set; } = AssessmentStatus.Draft;

    // Navigation properties
    [ForeignKey(nameof(CourseID))]
    public Course Course { get; set; } = null!;

    [ForeignKey(nameof(SectionID))]
    public Section? Section { get; set; }

    [ForeignKey(nameof(CreatedByFK))]
    public User CreatedBy { get; set; } = null!;

    public ICollection<Submission> Submissions { get; set; } = new List<Submission>();
}
