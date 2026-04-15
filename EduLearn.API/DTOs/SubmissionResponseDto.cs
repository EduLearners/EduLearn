using EduLearn.API.Models.Enums;

namespace EduLearn.API.DTOs
{
    public class SubmissionResponseDto
    {
        public int SubmissionID { get; set; }
        public int AssessmentID { get; set; }
        public string AssessmentTitle { get; set; } = null!;  
        public int StudentID { get; set; }
        public string StudentName { get; set; } = null!;      
        public DateTime SubmittedAt { get; set; }
        public string? FileURI { get; set; }
        public decimal? Score { get; set; }
        public decimal MaxScore { get; set; }                   
        public int? GraderID { get; set; }
        public string? GraderName { get; set; }                 
        public DateTime? GradedAt { get; set; }
        public string? PlagiarismReportURI { get; set; }
        public SubmissionStatus Status { get; set; }            // Submitted | Graded | Late | Plagiarised
    }
}
