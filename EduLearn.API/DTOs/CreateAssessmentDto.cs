using System.ComponentModel.DataAnnotations;
using EduLearn.API.Models.Enums;

namespace EduLearn.API.DTOs
{
    public class CreateAssessmentDto
    {
        // Which course this assessment belongs to (required, must exist in Courses table)
        [Required]
        public int CourseID { get; set; }

        // Optional: scope to a specific section (null = applies to all sections of the course)
        public int? SectionID { get; set; }

        // Assessment title like "Coding Assignment 1" or "Midterm Exam"
        [Required]
        [MaxLength(200)]
        [RegularExpression(@"^[\w\s\-:()&,\.'\""\/]+$", ErrorMessage = "Title contains invalid characters")]
        public string Title { get; set; } = null!;

        // Assignment | Quiz | Exam — uses the AssessmentType enum
        [Required]
        public AssessmentType Type { get; set; }

        // Initial status when creating — defaults to Draft if not supplied.
        // Instructor can set Published directly to skip the separate Publish step.
        public AssessmentStatus Status { get; set; } = AssessmentStatus.Draft;

        // Submission deadline (nullable — some assessments may not have a deadline)
        public DateTime? DueAt { get; set; }

        // Maximum score possible like 100.0 or 50.0
        [Required]
        [Range(0.1, 9999.9)]
        public decimal MaxScore { get; set; }

        // JSON rubric like [{"criterion": "Code Quality", "maxPoints": 40, "description": "Clean code"}]
        public string? GradingRubricJSON { get; set; }

        // Optional link to the assignment brief / question paper (Google Drive, Notion, PDF URL etc.)
        [MaxLength(500)]
        [Url]
        public string? InstructionsURI { get; set; }

        // The instructor's UserID who is creating this assessment
        public int CreatedByFK { get; set; }
    }
}
