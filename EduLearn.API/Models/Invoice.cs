using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using EduLearn.API.Models.Enums;

namespace EduLearn.API.Models;

[Table("Invoices")]
public class Invoice
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int InvoiceID { get; set; }

    [Required]
    public int StudentID { get; set; }

    [Required]
    [MaxLength(20)]
    public string Term { get; set; } = null!;

    [Required]
    public string LineItemsJSON { get; set; } = null!;

    [Required]
    [Column(TypeName = "decimal(10,2)")]
    public decimal AmountDue { get; set; }

    public DateTime IssuedAt { get; set; } = DateTime.UtcNow;

    [Required]
    [Column(TypeName = "date")]
    public DateTime DueDate { get; set; }

    [Required]
    public InvoiceStatus Status { get; set; } = InvoiceStatus.Pending;

    [MaxLength(500)]
    public string? InvoiceURI { get; set; }

    // Navigation properties
    [ForeignKey(nameof(StudentID))]
    public Student Student { get; set; } = null!;

    public ICollection<Payment> Payments { get; set; } = new List<Payment>();
}
