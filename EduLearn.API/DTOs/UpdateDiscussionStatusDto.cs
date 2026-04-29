using System.ComponentModel.DataAnnotations;
using EduLearn.API.Models.Enums;

namespace EduLearn.API.DTOs;

public class UpdateDiscussionStatusDto
{
    // New status — Open | Closed | Pinned | Archived
    [Required]
    public DiscussionStatus Status { get; set; }
}
