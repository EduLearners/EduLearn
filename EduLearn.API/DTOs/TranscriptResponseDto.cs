using EduLearn.API.Models.Enums;

namespace EduLearn.API.DTOs;

public class TranscriptResponseDto
{
    public int TranscriptID { get; set; }
    public int StudentID { get; set; }
    public string StudentName { get; set; } = null!;
    public string MRN { get; set; } = null!;
    public string ProgramName { get; set; } = null!;
    public DateTime IssuedAt { get; set; }
    public string EntriesJSON { get; set; } = null!;
    public decimal? GPA { get; set; }
    public string? Remark { get; set; }   // "PASS" | "XP" | null (Result Awaited)
    public TranscriptStatus Status { get; set; }
    public string? TranscriptURI { get; set; }
}
