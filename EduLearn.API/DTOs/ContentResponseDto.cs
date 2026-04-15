using EduLearn.API.Models.Enums;

namespace EduLearn.API.DTOs
{
    public class ContentResponseDto
    {
        public int ContentID { get; set; }
        public int CourseID { get; set; }
        public string CourseName { get; set; } = null!;       // From Course.Title navigation
        public string Title { get; set; } = null!;
        public ContentType Type { get; set; }                  // Shows as "Document" / "Video" / "Quiz" / "Link"
        public string URI { get; set; } = null!;
        public int UploadedByFK { get; set; }
        public string UploadedByName { get; set; } = null!;    // From User.FullName navigation
        public DateTime UploadedAt { get; set; }
        public int Version { get; set; }                       // 1, 2, 3... increments on each version update
        public string? MetadataJSON { get; set; }
        public ContentStatus Status { get; set; }              // Shows as "Active" / "Archived" / "Draft"
    }
}
