// ============================================================
// AGI-04: PlagiarismDto.cs
// DTOs for plagiarism report creation, status updates, and responses.
// ============================================================

using System.ComponentModel.DataAnnotations;
using EduLearn.API.Models.Enums;

namespace EduLearn.API.DTOs;

// POST /api/plagiarism/report — raise a flag
public class CreatePlagiarismReportDto
{
    [Required]
    public int SubmissionID { get; set; }

    // 0.00 to 100.00 — percentage similarity score from a tool or manual review
    [Required]
    [Range(0, 100, ErrorMessage = "SimilarityScore must be between 0 and 100")]
    public decimal SimilarityScore { get; set; }

    // Optional: matched sources, tool output, notes
    [MaxLength(2000)]
    public string? Details { get; set; }
}

// PUT /api/plagiarism/{id}/status — confirm or dismiss
public class UpdatePlagiarismStatusDto
{
    [Required]
    public PlagiarismStatus Status { get; set; }
}

// Response for a single plagiarism report
public class PlagiarismReportResponseDto
{
    public int ReportID { get; set; }
    public int SubmissionID { get; set; }
    public string StudentName { get; set; } = string.Empty;
    public string StudentMRN { get; set; } = string.Empty;
    public string AssessmentTitle { get; set; } = string.Empty;
    public string CourseName { get; set; } = string.Empty;
    public int FlaggedByUserID { get; set; }
    public string FlaggedByName { get; set; } = string.Empty;
    public decimal SimilarityScore { get; set; }
    public string? Details { get; set; }
    public PlagiarismStatus Status { get; set; }
    public DateTime FlaggedAt { get; set; }
    public DateTime? ResolvedAt { get; set; }
}

// GET /api/plagiarism/student/{studentId}/integrity — summary view
public class IntegrityStatusDto
{
    public int StudentID { get; set; }
    public string StudentName { get; set; } = string.Empty;
    public string StudentMRN { get; set; } = string.Empty;
    public int TotalReports { get; set; }
    public int PendingCount { get; set; }
    public int ConfirmedCount { get; set; }
    public int DismissedCount { get; set; }

    // Overall flag: true if any report is Confirmed
    public bool HasConfirmedViolation { get; set; }

    // List of reports for full detail
    public List<PlagiarismReportResponseDto> Reports { get; set; } = new();
}
