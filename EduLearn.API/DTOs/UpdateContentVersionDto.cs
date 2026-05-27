using System.ComponentModel.DataAnnotations;

namespace EduLearn.API.DTOs
{
    public class UpdateContentVersionDto
    {
        [Required]
        [MaxLength(500)]
        [Url]
        public string URI { get; set; } = null!;

        // Updated metadata for the new version (fileSize, mimeType, sha256 of new file)
        public string? MetadataJSON { get; set; }
    }
}
