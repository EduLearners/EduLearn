using System.ComponentModel.DataAnnotations;

namespace EduLearn.API.DTOs;

public class CreateReplyDto
{
    // The reply message content
    [Required]
    [MaxLength(2000)]
    public string Content { get; set; } = null!;

    // Optional: index of the post being replied to (null = reply to main thread)
    public int? ParentPostIndex { get; set; }

    // NOTE: AuthorID is NOT here — it comes from the JWT
}
