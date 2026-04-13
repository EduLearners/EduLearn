using System.ComponentModel.DataAnnotations;
using EduLearn.API.Models.Enums;

namespace EduLearn.API.DTOs;

public class UpdateScholarshipDto
{
    [Required]
    public ScholarshipStatus Status { get; set; }
}
