using System.ComponentModel.DataAnnotations;
using EduLearn.API.Models.Enums;

namespace EduLearn.API.DTOs;

public class UpdateStatusDto
{
    [Required]
    public UserStatus Status { get; set; }
}
