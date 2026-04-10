using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using EduLearn.API.Models.Enums;
using Microsoft.EntityFrameworkCore;

namespace EduLearn.API.Models;

[Table("Users")]
[Index(nameof(Username), IsUnique = true)]
[Index(nameof(Email), IsUnique = true)]
public class User
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int UserID { get; set; }

    [Required]
    [MaxLength(100)]
    public string Username { get; set; } = null!;

    [Required]
    [MaxLength(200)]
    public string FullName { get; set; } = null!;

    [Required]
    [MaxLength(255)]
    public string Email { get; set; } = null!;

    [MaxLength(20)]
    public string? Phone { get; set; }

    [Required]
    [MaxLength(30)]
    public UserRole Role { get; set; } = UserRole.Student;

    [Required]
    [MaxLength(500)]
    public string PasswordHash { get; set; } = null!;

    public bool MFAEnabled { get; set; } = false;

    [Required]
    [MaxLength(20)]
    public UserStatus Status { get; set; } = UserStatus.Active;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }

    // Navigation properties
    public ICollection<AuditLog> AuditLogs { get; set; } = new List<AuditLog>();
    public Student? Student { get; set; }
    public ICollection<Section> InstructorSections { get; set; } = new List<Section>();
    public ICollection<Notification> Notifications { get; set; } = new List<Notification>();
}
