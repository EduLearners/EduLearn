using System.ComponentModel.DataAnnotations;
using EduLearn.API.Models.Enums;

namespace EduLearn.API.DTOs
{
    public class CreateContentDto
    {
        [Required]
        public int CourseID { get; set; }

        [Required]
        [MaxLength(200)]
        public string Title { get; set; } = null!;

        // Document | Video | Quiz | Link — what kind of learning material
        [Required]
        public ContentType Type { get; set; }

        [Required]
        [MaxLength(500)]
        public string URI { get; set; } = null!;

        public string? MetadataJSON { get; set; }
    }
}
