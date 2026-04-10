using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using EduLearn.API.Models.Enums;

namespace EduLearn.API.Models;

[Table("Contents")]
public class Content
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int ContentID { get; set; }

    [Required]
    public int CourseID { get; set; }

    [Required]
    [MaxLength(200)]
    public string Title { get; set; } = null!;

    [Required]
    public ContentType Type { get; set; }

    [Required]
    [MaxLength(500)]
    public string URI { get; set; } = null!;

    [Required]
    public int UploadedByFK { get; set; }

    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;

    [Required]
    public int Version { get; set; } = 1;

    public string? MetadataJSON { get; set; }

    [Required]
    public ContentStatus Status { get; set; } = ContentStatus.Active;

    // Navigation properties
    [ForeignKey(nameof(CourseID))]
    public Course Course { get; set; } = null!;

    [ForeignKey(nameof(UploadedByFK))]
    public User UploadedBy { get; set; } = null!;
}
