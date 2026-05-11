using System.ComponentModel.DataAnnotations;

namespace EduLearn.API.DTOs;

public class AssignTicketDto
{
    [Required]
    public int AssignedToUserId { get; set; }
}
