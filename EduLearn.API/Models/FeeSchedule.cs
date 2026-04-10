using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using EduLearn.API.Models.Enums;

namespace EduLearn.API.Models;

[Table("FeeSchedules")]
public class FeeSchedule
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int FeeID { get; set; }

    [Required]
    public int ProgramID { get; set; }

    [Required]
    [MaxLength(20)]
    public string Term { get; set; } = null!;

    [Required]
    public string FeeItemsJSON { get; set; } = null!;

    [Required]
    [Column(TypeName = "date")]
    public DateTime EffectiveFrom { get; set; }

    [Required]
    [Column(TypeName = "date")]
    public DateTime EffectiveTo { get; set; }

    [Required]
    public FeeScheduleStatus Status { get; set; } = FeeScheduleStatus.Draft;

    // Navigation properties
    [ForeignKey(nameof(ProgramID))]
    public Program Program { get; set; } = null!;
}
