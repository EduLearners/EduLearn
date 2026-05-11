using EduLearn.API.Models.Enums;

namespace EduLearn.API.DTOs;

public class TicketResponseDto
{
    public int TicketID { get; set; }
    public int CreatedByUserID { get; set; }
    public string CreatedByUsername { get; set; } = string.Empty;
    public int? AssignedToUserID { get; set; }
    public string? AssignedToUsername { get; set; }
    public string Subject { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public TicketPriority Priority { get; set; }
    public TicketStatus Status { get; set; }
    public string? ResolutionURI { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}
