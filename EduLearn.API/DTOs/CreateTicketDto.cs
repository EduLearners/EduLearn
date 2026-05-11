using System.ComponentModel.DataAnnotations;
using EduLearn.API.Models.Enums;

namespace EduLearn.API.DTOs;

public class CreateTicketDto
{
    [Required]
    [MaxLength(200)]
    public string Subject { get; set; } = null!;

    [Required]
    [MaxLength(4000)]
    public string Description { get; set; } = null!;

    public TicketPriority Priority { get; set; } = TicketPriority.Medium;
}
