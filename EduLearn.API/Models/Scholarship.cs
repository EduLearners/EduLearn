using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using EduLearn.API.Models.Enums;

namespace EduLearn.API.Models;

[Table("Scholarships")]
public class Scholarship
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int ScholarID { get; set; }

    [Required]
    public int StudentID { get; set; }

    [Required]
    [MaxLength(100)]
    public string AwardType { get; set; } = null!;

    [Required]
    [Column(TypeName = "decimal(10,2)")]
    public decimal Amount { get; set; }

    public DateTime AppliedAt { get; set; } = DateTime.UtcNow;

    [Required]
    [Column(TypeName = "date")]
    public DateTime ValidFrom { get; set; }

    [Required]
    [Column(TypeName = "date")]
    public DateTime ValidTo { get; set; }

    [Required]
    public ScholarshipStatus Status { get; set; } = ScholarshipStatus.Active;

    // Navigation properties
    [ForeignKey(nameof(StudentID))]
    public Student Student { get; set; } = null!;
}
