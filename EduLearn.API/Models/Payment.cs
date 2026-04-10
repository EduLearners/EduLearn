using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using EduLearn.API.Models.Enums;

namespace EduLearn.API.Models;

[Table("Payments")]
public class Payment
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int PaymentID { get; set; }

    [Required]
    public int InvoiceID { get; set; }

    public DateTime PaidAt { get; set; } = DateTime.UtcNow;

    [Required]
    [Column(TypeName = "decimal(10,2)")]
    public decimal Amount { get; set; }

    [Required]
    public PaymentMethod Method { get; set; }

    [MaxLength(100)]
    public string? Reference { get; set; }

    [Required]
    public PaymentStatus Status { get; set; } = PaymentStatus.Completed;

    // Navigation properties
    [ForeignKey(nameof(InvoiceID))]
    public Invoice Invoice { get; set; } = null!;
}
