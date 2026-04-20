using EduLearn.API.DTOs;
using EduLearn.API.Extensions;
using EduLearn.API.Models;
using EduLearn.API.Models.Enums;
using EduLearn.API.Repositories.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EduLearn.API.Controllers;

[ApiController]
[Route("api/payments")]
public class PaymentsController : ControllerBase
{
    private readonly IPaymentRepository _paymentRepository;
    private readonly IInvoiceRepository _invoiceRepository;
    private readonly IStudentRepository _studentRepository;

    public PaymentsController(
        IPaymentRepository paymentRepository,
        IInvoiceRepository invoiceRepository,
        IStudentRepository studentRepository)
    {
        _paymentRepository = paymentRepository;
        _invoiceRepository = invoiceRepository;
        _studentRepository = studentRepository;
    }

    // ── POST /api/payments — SFB-03: Record a payment ──
    [HttpPost]
    [Authorize(Policy = "FinancePolicy")]   // HARDENING (C-1.C): PRD requires Finance role
    public async Task<ActionResult<PaymentResponseDto>> Create(CreatePaymentDto dto, CancellationToken ct)
    {
        var invoice = await _invoiceRepository.GetByIdAsync(dto.InvoiceID);

        if (invoice is null)
            return NotFound(new { error = "Invoice not found", code = "INVOICE_NOT_FOUND" });

        if (invoice.Status == InvoiceStatus.Paid)
            return BadRequest(new { error = "Invoice is already fully paid", code = "INVOICE_ALREADY_PAID" });

        if (invoice.Status == InvoiceStatus.Cancelled)
            return BadRequest(new { error = "Invoice is cancelled", code = "INVOICE_CANCELLED" });

        if (dto.Amount <= 0)
            return BadRequest(new { error = "Payment amount must be positive", code = "INVALID_AMOUNT" });

        var payment = new Payment
        {
            InvoiceID = dto.InvoiceID,
            Amount = Math.Round(dto.Amount, 2),
            Method = dto.Method,
            Reference = dto.Reference,
            Status = PaymentStatus.Completed
        };

        var created = await _paymentRepository.CreateAsync(payment);

        var allPayments = await _paymentRepository.GetByInvoiceIdAsync(dto.InvoiceID);
        decimal totalPaid = allPayments.Sum(p => p.Status == PaymentStatus.Completed ? p.Amount : 0m);
        invoice.Status = totalPaid >= invoice.AmountDue ? InvoiceStatus.Paid : InvoiceStatus.PartiallyPaid;
        await _invoiceRepository.UpdateAsync(invoice);

        return CreatedAtAction(nameof(GetByInvoice), new { invoiceId = created.InvoiceID }, MapToDto(created));
    }

    // ── GET /api/payments/invoice/{invoiceId} — SFB-03: List payments for invoice ──
    [HttpGet("invoice/{invoiceId}")]
    [ActionName("GetByInvoice")]
    [Authorize]
    public async Task<ActionResult<IEnumerable<PaymentResponseDto>>> GetByInvoice(int invoiceId, CancellationToken ct)
    {
        var invoice = await _invoiceRepository.GetByIdAsync(invoiceId);
        if (invoice is null)
            return NotFound(new { error = "Invoice not found", code = "INVOICE_NOT_FOUND" });

        // HARDENING (C-19): Student role may only read payments against their own invoice.
        var callerRole = User.GetUserRole();
        if (callerRole == "Student")
        {
            var student = await _studentRepository.GetByIdAsync(invoice.StudentID);
            if (student?.UserID != User.GetUserId())
                return StatusCode(403, new { error = "You may only view payments on your own invoices", code = "PAYMENT_FORBIDDEN" });
        }

        var payments = await _paymentRepository.GetByInvoiceIdAsync(invoiceId);

        return Ok(payments.Select(MapToDto));
    }

    private static PaymentResponseDto MapToDto(Payment p) => new()
    {
        PaymentID = p.PaymentID,
        InvoiceID = p.InvoiceID,
        Amount = p.Amount,
        Method = p.Method,
        Reference = p.Reference,
        Status = p.Status,
        PaidAt = p.PaidAt
    };
}
