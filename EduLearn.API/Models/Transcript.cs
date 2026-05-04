using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using EduLearn.API.Models.Enums;

namespace EduLearn.API.Models;

[Table("Transcripts")]
public class Transcript
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int TranscriptID { get; set; }

    [Required]
    public int StudentID { get; set; }

    public DateTime IssuedAt { get; set; } = DateTime.UtcNow;

    [Required]
    public string EntriesJSON { get; set; } = null!;

    // Widened from decimal(3,2) to decimal(4,2) to fit the Indian
    // 10-point CGPA scale (R-5). decimal(3,2) maxed at 9.99 and would
    // overflow for the top bucket (10.00 = O / Outstanding).
    [Column(TypeName = "decimal(4,2)")]
    public decimal? GPA { get; set; }

    [Required]
    public TranscriptStatus Status { get; set; } = TranscriptStatus.Draft;

    [MaxLength(500)]
    public string? TranscriptURI { get; set; }

    // Navigation properties
    [ForeignKey(nameof(StudentID))]
    public Student Student { get; set; } = null!;
}
