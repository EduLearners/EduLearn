using System.ComponentModel.DataAnnotations;
using EduLearn.API.Models.Enums;

namespace EduLearn.API.DTOs;

public class UpdateApplicantStatusDto
{
    [Required]
    public ApplicationStatus Status { get; set; }
}
