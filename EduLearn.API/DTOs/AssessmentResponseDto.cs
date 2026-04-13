using EduLearn.API.Models.Enums;

namespace EduLearn.API.DTOs
{
    public class AssessmentResponseDto
    {
        public int AssessmentID { get; set; }
        public int CourseID { get; set; }
        public string CourseName { get; set; } = null!;    // From Course.Title navigation
        public int? SectionID { get; set; }
        public string Title { get; set; } = null!;
        public AssessmentType Type { get; set; }            // Shows as "Assignment" / "Quiz" / "Exam" in JSON
        public DateTime? DueAt { get; set; }
        public decimal MaxScore { get; set; }
        public string? GradingRubricJSON { get; set; }
        public int CreatedByFK { get; set; }
        public string CreatedByName { get; set; } = null!;  // From User.FullName navigation
        public DateTime CreatedAt { get; set; }
        public AssessmentStatus Status { get; set; }        // Shows as "Draft" / "Published" / "Closed" in JSON
    }
}
