using System.ComponentModel.DataAnnotations;
using EduLearn.API.Models.Enums;

namespace EduLearn.API.DTOs
{
    public class UpdateAssessmentStatusDto
    {
        [Required]
        public AssessmentStatus Status { get; set; }
    }
}
