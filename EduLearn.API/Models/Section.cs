using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using EduLearn.API.Models.Enums;

namespace EduLearn.API.Models;

[Table("Sections")]
public class Section
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int SectionID { get; set; }

    [Required]
    public int CourseID { get; set; }

    [Required]
    [MaxLength(20)]
    public string Term { get; set; } = null!;

    [Required]
    public int InstructorID { get; set; }

    public int? RoomID { get; set; }

    [Required]
    public int Capacity { get; set; } = 60;

    [Required]
    public int EnrolledCount { get; set; } = 0;

    public string? ScheduleJSON { get; set; }

    [Required]
    public SectionStatus Status { get; set; } = SectionStatus.Open;

    // Navigation properties
    [ForeignKey(nameof(CourseID))]
    public Course Course { get; set; } = null!;

    [ForeignKey(nameof(InstructorID))]
    public User Instructor { get; set; } = null!;

    [ForeignKey(nameof(RoomID))]
    public Room? Room { get; set; }

    public ICollection<Enrollment> Enrollments { get; set; } = new List<Enrollment>();
    public ICollection<Assessment> Assessments { get; set; } = new List<Assessment>();
}
