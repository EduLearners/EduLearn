using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using EduLearn.API.Models.Enums;

namespace EduLearn.API.Models;

[Table("Applicants")]
public class Applicant
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int ApplicantID { get; set; }

    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = null!;

    [Required]
    [Column(TypeName = "date")]
    public DateTime DOB { get; set; }

    [MaxLength(50)]
    public string? NationalID { get; set; }

    public string? ContactInfoJSON { get; set; }

    [Required]
    [MaxLength(100)]
    public string ProgramApplied { get; set; } = null!;

    [Required]
    [MaxLength(30)]
    public ApplicationStatus ApplicationStatus { get; set; } = ApplicationStatus.Submitted;

    public DateTime SubmittedAt { get; set; } = DateTime.UtcNow;

    public string? DocumentsURIJSON { get; set; }
}
