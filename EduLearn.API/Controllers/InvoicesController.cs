using EduLearn.API.DTOs;
using EduLearn.API.Models;
using EduLearn.API.Models.Enums;
using EduLearn.API.Repositories.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EduLearn.API.Controllers;

[ApiController]
[Route("api/invoices")]
public class InvoicesController : ControllerBase
{
    private readonly IInvoiceRepository _invoiceRepository;
    private readonly IFeeScheduleRepository _feeScheduleRepository;
    private readonly IScholarshipRepository _scholarshipRepository;
    private readonly IStudentRepository _studentRepository;

    public InvoicesController(
        IInvoiceRepository invoiceRepository,
        IFeeScheduleRepository feeScheduleRepository,
        IScholarshipRepository scholarshipRepository,
        IStudentRepository studentRepository)
    {
        _invoiceRepository = invoiceRepository;
        _feeScheduleRepository = feeScheduleRepository;
        _scholarshipRepository = scholarshipRepository;
        _studentRepository = studentRepository;
    }

    // ── POST /api/invoices/generate — SFB-02: Generate invoice ──
    [HttpPost("generate")]
    [Authorize]
    public async Task<ActionResult<InvoiceResponseDto>> Generate(GenerateInvoiceDto dto, CancellationToken ct)
    {
        var student = await _studentRepository.GetByIdAsync(dto.StudentID);

        if (student is null)
            return NotFound(new { error = "Student not found", code = "STUDENT_NOT_FOUND" });

        var fee = await _feeScheduleRepository.GetByProgramAndTermAsync(student.ProgramID, dto.Term, ct);

        if (fee is null)
            return NotFound(new { error = "No active fee schedule found for this program and term", code = "FEE_SCHEDULE_NOT_FOUND" });

        var scholarships = await _scholarshipRepository.GetActiveByStudentIdAsync(dto.StudentID, ct);
        decimal scholarshipTotal = scholarships.Sum(s => s.Amount);

        var feeItems = System.Text.Json.JsonSerializer.Deserialize<List<System.Text.Json.JsonElement>>(fee.FeeItemsJSON) ?? new();
        decimal totalFees = feeItems.Sum(item => item.TryGetProperty("amount", out var a) ? a.GetDecimal() : 0m);

        var lineItems = feeItems.Select(item => new
        {
            item = item.TryGetProperty("item", out var i) ? i.GetString() : "Fee",
            amount = item.TryGetProperty("amount", out var a) ? a.GetDecimal() : 0m,
            discount = 0m,
            net = item.TryGetProperty("amount", out var a2) ? a2.GetDecimal() : 0m
        }).ToList<object>();

        if (scholarshipTotal > 0)
            lineItems.Add(new { item = "Scholarship Deduction", amount = 0m, discount = scholarshipTotal, net = -scholarshipTotal });

        string lineItemsJson = System.Text.Json.JsonSerializer.Serialize(lineItems);
        decimal amountDue = Math.Max(0m, totalFees - scholarshipTotal);

        var invoice = new Invoice
        {
            StudentID = dto.StudentID,
            Term = dto.Term,
            LineItemsJSON = lineItemsJson,
            AmountDue = Math.Round(amountDue, 2),
            DueDate = dto.DueDate.Date,
            Status = InvoiceStatus.Pending
        };

        var created = await _invoiceRepository.CreateAsync(invoice);

        return CreatedAtAction(nameof(GetById), new { id = created.InvoiceID }, MapToDto(created, student));
    }

    // ── GET /api/invoices/student/{studentId} — SFB-02: List invoices for student ──
    [HttpGet("student/{studentId}")]
    [Authorize]
    public async Task<ActionResult<IEnumerable<InvoiceResponseDto>>> GetByStudent(int studentId, CancellationToken ct)
    {
        var invoices = await _invoiceRepository.GetByStudentIdAsync(studentId);
        var student = await _studentRepository.GetByIdAsync(studentId);

        return Ok(invoices.Select(i => MapToDto(i, student)));
    }

    // ── GET /api/invoices/{id} — SFB-02: Get invoice by ID ──
    [HttpGet("{id}")]
    [ActionName("GetById")]
    [Authorize]
    public async Task<ActionResult<InvoiceResponseDto>> GetById(int id, CancellationToken ct)
    {
        var invoice = await _invoiceRepository.GetByIdAsync(id);

        if (invoice is null)
            return NotFound(new { error = "Invoice not found", code = "INVOICE_NOT_FOUND" });

        var student = await _studentRepository.GetByIdAsync(invoice.StudentID);

        return Ok(MapToDto(invoice, student));
    }

    private static InvoiceResponseDto MapToDto(Invoice i, Student? student) => new()
    {
        InvoiceID = i.InvoiceID,
        StudentID = i.StudentID,
        StudentName = student?.Name ?? string.Empty,
        Term = i.Term,
        LineItemsJSON = i.LineItemsJSON,
        AmountDue = i.AmountDue,
        IssuedAt = i.IssuedAt,
        DueDate = i.DueDate,
        Status = i.Status,
        InvoiceURI = i.InvoiceURI
    };
}
