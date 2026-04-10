using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using EduLearn.API.Models.Enums;

namespace EduLearn.API.Models;

[Table("Tickets")]
public class Ticket
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int TicketID { get; set; }

    [Required]
    public int CreatedByFK { get; set; }

    public int? AssignedToFK { get; set; }

    [Required]
    [MaxLength(200)]
    public string Subject { get; set; } = null!;

    [Required]
    public string Description { get; set; } = null!;

    [Required]
    public TicketPriority Priority { get; set; } = TicketPriority.Medium;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }

    [Required]
    public TicketStatus Status { get; set; } = TicketStatus.Open;

    [MaxLength(500)]
    public string? ResolutionURI { get; set; }

    // Navigation properties
    [ForeignKey(nameof(CreatedByFK))]
    public User CreatedBy { get; set; } = null!;

    [ForeignKey(nameof(AssignedToFK))]
    public User? AssignedTo { get; set; }
}
