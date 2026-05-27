using System.ComponentModel.DataAnnotations;

namespace EduLearn.API.DTOs;

public class CreateDiscussionDto
{
    // Which course this discussion belongs to
    [Required]
    public int CourseID { get; set; }

    // Discussion title
    [Required]
    [MaxLength(200)]
    [RegularExpression(@"^[\w\s\-:()&,\.'\""\/]+$", ErrorMessage = "Title contains invalid characters")]
    public string Title { get; set; } = null!;

    // Optional first post when creating the thread
    public string? InitialMessage { get; set; }

    // NOTE: ThreadStarterID is NOT here — it comes from the JWT
    // NOTE: Status is NOT here — always starts as Open
}
