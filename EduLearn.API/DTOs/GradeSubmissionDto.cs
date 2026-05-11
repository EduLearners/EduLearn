using System.ComponentModel.DataAnnotations;

namespace EduLearn.API.DTOs
{
    public class GradeSubmissionDto
    {

        // Score awarded by the instructor (must be between 0 and Assessment.MaxScore)
        [Required]
        [Range(0, 9999.9)]
        public decimal Score { get; set; }

        // Reason for grade change (required only when re-grading, but we always capture it)
        [MaxLength(500)]
        public string? Reason { get; set; }
    }
}
