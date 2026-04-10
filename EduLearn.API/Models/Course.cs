using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using EduLearn.API.Models.Enums;
using Microsoft.EntityFrameworkCore;

namespace EduLearn.API.Models;

[Table("Courses")]
[Index(nameof(Code), IsUnique = true)]
public class Course
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int CourseID { get; set; }

    [Required]
    [MaxLength(20)]
    public string Code { get; set; } = null!;

    [Required]
    [MaxLength(200)]
    public string Title { get; set; } = null!;

    public string? Description { get; set; }

    [Required]
    public int Credits { get; set; } = 3;

    public int? DepartmentID { get; set; }

    [MaxLength(20)]
    public string? Level { get; set; }

    public string? PrerequisitesJSON { get; set; }

    [Required]
    public CourseStatus Status { get; set; } = CourseStatus.Active;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public ICollection<Section> Sections { get; set; } = new List<Section>();
    public ICollection<Content> Contents { get; set; } = new List<Content>();
    public ICollection<Discussion> Discussions { get; set; } = new List<Discussion>();
    public ICollection<Assessment> Assessments { get; set; } = new List<Assessment>();
    public ICollection<Syllabus> Syllabi { get; set; } = new List<Syllabus>();
}
