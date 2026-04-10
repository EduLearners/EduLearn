using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using EduLearn.API.Models.Enums;
using Microsoft.EntityFrameworkCore;

namespace EduLearn.API.Models;

[Table("Students")]
[Index(nameof(UserID), IsUnique = true)]
[Index(nameof(MRN), IsUnique = true)]
public class Student
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int StudentID { get; set; }

    [Required]
    public int UserID { get; set; }

    [Required]
    [MaxLength(20)]
    public string MRN { get; set; } = null!;

    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = null!;

    [Required]
    [Column(TypeName = "date")]
    public DateTime DOB { get; set; }

    [MaxLength(10)]
    public string? Gender { get; set; }

    public string? ContactInfoJSON { get; set; }

    [Required]
    [MaxLength(20)]
    public StudentLifecycleStatus EnrollmentStatus { get; set; } = StudentLifecycleStatus.Active;

    [Required]
    public int ProgramID { get; set; }

    [Required]
    [MaxLength(20)]
    public string EntryTerm { get; set; } = null!;

    [MaxLength(20)]
    public string? ExpectedGraduationTerm { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    [ForeignKey(nameof(UserID))]
    public User User { get; set; } = null!;

    [ForeignKey(nameof(ProgramID))]
    public Program Program { get; set; } = null!;

    public ICollection<Enrollment> Enrollments { get; set; } = new List<Enrollment>();
    public ICollection<Submission> Submissions { get; set; } = new List<Submission>();
    public ICollection<Transcript> Transcripts { get; set; } = new List<Transcript>();
    public ICollection<Invoice> Invoices { get; set; } = new List<Invoice>();
    public ICollection<Scholarship> Scholarships { get; set; } = new List<Scholarship>();
}
