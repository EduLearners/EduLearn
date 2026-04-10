using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EduLearn.API.Models;

[Table("Syllabi")]
public class Syllabus
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int SyllabusID { get; set; }

    [Required]
    public int CourseID { get; set; }

    [Required]
    [MaxLength(20)]
    public string Version { get; set; } = null!;

    public string? LearningOutcomesJSON { get; set; }

    public string? AssessmentPlanJSON { get; set; }

    [Required]
    public int CreatedByFK { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [MaxLength(500)]
    public string? SyllabusURI { get; set; }

    // Navigation properties
    [ForeignKey(nameof(CourseID))]
    public Course Course { get; set; } = null!;

    [ForeignKey(nameof(CreatedByFK))]
    public User CreatedBy { get; set; } = null!;
}
