using EduLearn.API.Models.Enums;

namespace EduLearn.API.DTOs;

public class DiscussionResponseDto
{
    public int DiscussionID { get; set; }

    public int CourseID { get; set; }

    // From Course navigation property
    public string CourseName { get; set; } = null!;

    public int ThreadStarterID { get; set; }

    // From ThreadStarter navigation property
    public string ThreadStarterName { get; set; } = null!;

    public string Title { get; set; } = null!;

    // JSON array of all posts/replies
    // Each post: { authorID, authorName, content, timestamp, parentPostIndex }
    public string? PostsJSON { get; set; }

    public DateTime CreatedAt { get; set; }

    // Open | Closed | Pinned | Archived
    public DiscussionStatus Status { get; set; }
}
