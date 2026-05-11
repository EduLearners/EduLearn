using System.ComponentModel.DataAnnotations;

namespace EduLearn.API.DTOs
{
    public class CreateSubmissionDto
    {
        [Required]
        public int AssessmentID { get; set; }

        [Required]
        public int StudentID { get; set; }

        // URI to the uploaded file in blob storage (optional — some assessments may be in-person)
        [MaxLength(500)]
        public string? FileURI { get; set; }
    }
}
