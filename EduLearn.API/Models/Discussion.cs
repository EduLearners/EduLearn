using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using EduLearn.API.Models.Enums;

namespace EduLearn.API.Models;

[Table("Discussions")]
public class Discussion
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int DiscussionID { get; set; }

    [Required]
    public int CourseID { get; set; }

    [Required]
    public int ThreadStarterID { get; set; }

    [Required]
    [MaxLength(200)]
    public string Title { get; set; } = null!;

    public string? PostsJSON { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Required]
    public DiscussionStatus Status { get; set; } = DiscussionStatus.Open;

    // Navigation properties
    [ForeignKey(nameof(CourseID))]
    public Course Course { get; set; } = null!;

    [ForeignKey(nameof(ThreadStarterID))]
    public User ThreadStarter { get; set; } = null!;
}
