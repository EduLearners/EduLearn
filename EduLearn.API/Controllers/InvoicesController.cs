using EduLearn.API.DTOs;
using EduLearn.API.Models;
using EduLearn.API.Models.Enums;
using EduLearn.API.Repositories.Interfaces;
using EduLearn.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

// AUDIT CHANGE (interim-polish): invoice generation now writes to the append-only audit log.

namespace EduLearn.API.Controllers;

[ApiController]
[Route("api/invoices")]
[Authorize]
public class InvoicesController : ControllerBase
{
    private readonly IInvoiceRepository _invoiceRepository;
    private readonly IFeeScheduleRepository _feeScheduleRepository;
    private readonly IScholarshipRepository _scholarshipRepository;
    private readonly IStudentRepository _studentRepository;
    private readonly INotificationService _notificationService;
    private readonly AuditLogService _auditLogService;

    public InvoicesController(
        IInvoiceRepository invoiceRepository,
        IFeeScheduleRepository feeScheduleRepository,
        IScholarshipRepository scholarshipRepository,
        IStudentRepository studentRepository,
        INotificationService notificationService,
        AuditLogService auditLogService)
    {
        _invoiceRepository = invoiceRepository;
        _feeScheduleRepository = feeScheduleRepository;
        _scholarshipRepository = scholarshipRepository;
        _studentRepository = studentRepository;
        _notificationService = notificationService;
        _auditLogService = auditLogService;
    }

    // ── GET /api/invoices — Finance / ITAdmin: list all invoices ──
    /// <summary>
    /// List all invoices across all students. Finance / ITAdmin only.
    /// </summary>
    [HttpGet]
    [Authorize(Policy = "FinancePolicy")]
    public async Task<ActionResult<IEnumerable<InvoiceResponseDto>>> GetAll(CancellationToken ct)
    {
        var invoices = await _invoiceRepository.GetAllAsync();
        var students = (await _studentRepository.GetAllAsync()).ToDictionary(s => s.StudentID);
        var result = invoices.Select(i =>
            MapToDto(i, students.TryGetValue(i.StudentID, out var s) ? s : null)).ToList();
        return Ok(result);
    }

    // ── POST /api/invoices/generate-bulk ──
    /// <summary>
    /// Generate invoices for ALL active students in a program for a given term.
    /// Skips students who already have an invoice for that term.
    /// Finance / ITAdmin only.
    /// </summary>
    [HttpPost("generate-bulk")]
    [Authorize(Policy = "FinancePolicy")]
    public async Task<IActionResult> GenerateBulk([FromBody] GenerateBulkInvoiceDto dto, CancellationToken ct)
    {
        if (dto.DueDate.Date < DateTime.UtcNow.Date)
            return BadRequest(new { error = "DueDate cannot be in the past", code = "INVALID_DUE_DATE" });

        var fee = await _feeScheduleRepository.GetByProgramAndTermAsync(dto.ProgramID, dto.Term, ct);
        if (fee is null)
            return NotFound(new { error = "No active fee schedule found for this program and term", code = "FEE_SCHEDULE_NOT_FOUND" });

        // Parse fee items once for the whole batch
        List<System.Text.Json.JsonElement> feeItems;
        try { feeItems = System.Text.Json.JsonSerializer.Deserialize<List<System.Text.Json.JsonElement>>(fee.FeeItemsJSON) ?? new(); }
        catch { return BadRequest(new { error = "Fee schedule has malformed JSON", code = "INVALID_FEE_JSON" }); }

        decimal totalFees;
        try { totalFees = feeItems.Sum(item => item.TryGetProperty("amount", out var a) ? a.GetDecimal() : 0m); }
        catch { return BadRequest(new { error = "Fee schedule contains non-numeric amount", code = "INVALID_FEE_JSON" }); }

        var students = await _studentRepository.GetByProgramIdAsync(dto.ProgramID);
        var activeStudents = students.Where(s => s.EnrollmentStatus == StudentLifecycleStatus.Active).ToList();

        int generated = 0, skipped = 0;
        if (!int.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var callerId))
            return Unauthorized(new { error = "Your session is invalid. Please sign in again.", code = "INVALID_TOKEN" });

        foreach (var student in activeStudents)
        {
            // Skip if invoice already exists for this term
            var existing = await _invoiceRepository.GetByStudentAndTermAsync(student.StudentID, dto.Term);
            if (existing is not null) { skipped++; continue; }

            var scholarships = await _scholarshipRepository.GetActiveByStudentIdAsync(student.StudentID, ct);
            decimal scholarshipTotal = scholarships.Sum(s => s.Amount);

            var lineItems = feeItems.Select(item => new
            {
                item    = item.TryGetProperty("item",   out var i)  ? i.GetString()    : "Fee",
                amount  = item.TryGetProperty("amount", out var a)  ? a.GetDecimal()   : 0m,
                discount = 0m,
                net     = item.TryGetProperty("amount", out var a2) ? a2.GetDecimal()  : 0m
            }).ToList<object>();

            if (scholarshipTotal > 0)
                lineItems.Add(new { item = "Scholarship Deduction", amount = 0m, discount = scholarshipTotal, net = -scholarshipTotal });

            var invoice = new Invoice
            {
                StudentID    = student.StudentID,
                Term         = dto.Term,
                LineItemsJSON = System.Text.Json.JsonSerializer.Serialize(lineItems),
                AmountDue    = Math.Round(Math.Max(0m, totalFees - scholarshipTotal), 2),
                DueDate      = dto.DueDate.Date,
                Status       = InvoiceStatus.Pending
            };

            var created = await _invoiceRepository.CreateAsync(invoice);
            generated++;

            await _notificationService.NotifyAsync(
                student.UserID, NotificationCategory.Finance, NotificationSeverity.Info,
                $"Invoice #{created.InvoiceID} generated: ₹{created.AmountDue:0.00} due {created.DueDate:yyyy-MM-dd}.",
                created.InvoiceID);

            await _auditLogService.LogAsync(callerId, "InvoiceGenerated", "Invoice", created.InvoiceID,
                new { studentId = created.StudentID, term = created.Term, amountDue = created.AmountDue, bulk = true });
        }

        return Ok(new
        {
            message    = $"Bulk generation complete.",
            generated,
            skipped,
            total      = activeStudents.Count
        });
    }

    // ── POST /api/invoices/generate — SFB-02: Generate invoice ──
    /// <summary>
    /// Generate a new invoice for a student term, applying any active scholarship deductions. Finance / ITAdmin only.
    /// Rejects duplicate invoices for the same student and term, and past-dated due dates.
    /// </summary>
    [HttpPost("generate")]
    [Authorize(Policy = "FinancePolicy")]
    public async Task<ActionResult<InvoiceResponseDto>> Generate(GenerateInvoiceDto dto, CancellationToken ct)
    {
        var student = await _studentRepository.GetByIdAsync(dto.StudentID);

        if (student is null)
            return NotFound(new { error = "Student not found", code = "STUDENT_NOT_FOUND" });

        // HARDENING (M-10): DueDate must not be in the past.
        if (dto.DueDate.Date < DateTime.UtcNow.Date)
            return BadRequest(new { error = "DueDate cannot be in the past", code = "INVALID_DUE_DATE" });

        // HARDENING (M-8): one invoice per (student, term) — block double-billing from retries.
        var existing = await _invoiceRepository.GetByStudentAndTermAsync(dto.StudentID, dto.Term);
        if (existing is not null)
            return Conflict(new { error = "An invoice already exists for this student and term", code = "DUPLICATE_INVOICE" });

        var fee = await _feeScheduleRepository.GetByProgramAndTermAsync(student.ProgramID, dto.Term, ct);

        if (fee is null)
            return NotFound(new { error = "No active fee schedule found for this program and term", code = "FEE_SCHEDULE_NOT_FOUND" });

        var scholarships = await _scholarshipRepository.GetActiveByStudentIdAsync(dto.StudentID, ct);
        decimal scholarshipTotal = scholarships.Sum(s => s.Amount);

        // HARDENING (M-11): guard against malformed FeeItemsJSON — return 400 not 500.
        List<System.Text.Json.JsonElement> feeItems;
        try
        {
            feeItems = System.Text.Json.JsonSerializer.Deserialize<List<System.Text.Json.JsonElement>>(fee.FeeItemsJSON) ?? new();
        }
        catch (System.Text.Json.JsonException)
        {
            return BadRequest(new { error = "Fee schedule has malformed JSON", code = "INVALID_FEE_JSON" });
        }

        decimal totalFees;
        try
        {
            totalFees = feeItems.Sum(item => item.TryGetProperty("amount", out var a) ? a.GetDecimal() : 0m);
        }
        catch (System.InvalidOperationException)
        {
            return BadRequest(new { error = "Fee schedule contains non-numeric amount", code = "INVALID_FEE_JSON" });
        }

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

        // NHT-01: notify the student a new invoice was generated (Finance category per PRD §6.9).
        await _notificationService.NotifyAsync(
            student.UserID,
            NotificationCategory.Finance,
            NotificationSeverity.Info,
            $"Invoice #{created.InvoiceID} generated: ${created.AmountDue:0.00} due {created.DueDate:yyyy-MM-dd}.",
            created.InvoiceID);

        // AUDIT CHANGE (interim-polish): record invoice generation for IAM-04 / compliance.
        await _auditLogService.LogAsync(
            int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                ?? throw new InvalidOperationException("NameIdentifier claim missing")),
            "InvoiceGenerated",
            "Invoice",
            created.InvoiceID,
            new { studentId = created.StudentID, term = created.Term, amountDue = created.AmountDue });

        return CreatedAtAction(nameof(GetById), new { id = created.InvoiceID }, MapToDto(created, student));
    }

    // ── GET /api/invoices/student/{studentId} — SFB-02: List invoices for student ──
    /// <summary>
    /// List all invoices for a given student. All authenticated roles; Students may only view their own records.
    /// </summary>
    [HttpGet("student/{studentId}")]
    [Authorize(Policy = "FinanceReadPolicy")]
    public async Task<ActionResult<IEnumerable<InvoiceResponseDto>>> GetByStudent(int studentId, CancellationToken ct)
    {
        // phase4-fix-7: Runtime role guard mirrors FinanceReadPolicy; Student allowed with ownership check.
        var callerRole = User.FindFirst(ClaimTypes.Role)?.Value ?? string.Empty;
        var allowedRoles = new[] { "Finance", "ITAdmin", "Student" };
        if (!allowedRoles.Contains(callerRole))
            return StatusCode(403, new { error = "Access denied — finance or admin role required", code = "INVOICE_POLICY_DENIED" });

        if (!int.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var callerId))
            return Unauthorized(new { error = "Your session is invalid. Please sign in again.", code = "INVALID_TOKEN" });
        if (callerRole == "Student")
        {
            var target = await _studentRepository.GetByIdAsync(studentId);
            if (target?.UserID != callerId)
                return StatusCode(403, new { error = "You may only view your own invoices", code = "INVOICE_FORBIDDEN" });
        }

        var invoices = await _invoiceRepository.GetByStudentIdAsync(studentId);
        var student = await _studentRepository.GetByIdAsync(studentId);

        return Ok(invoices.Select(i => MapToDto(i, student)));
    }

    // ── GET /api/invoices/{id} — SFB-02: Get invoice by ID ──
    /// <summary>
    /// Retrieve a single invoice by ID. All authenticated roles; Students may only view their own invoices.
    /// </summary>
    [HttpGet("{id}")]
    [ActionName("GetById")]
    [Authorize(Policy = "FinanceReadPolicy")]
    public async Task<ActionResult<InvoiceResponseDto>> GetById(int id, CancellationToken ct)
    {
        // phase4-fix-7: Runtime role guard mirrors FinanceReadPolicy; Student allowed with ownership check.
        var callerRole = User.FindFirst(ClaimTypes.Role)?.Value ?? string.Empty;
        var allowedRoles = new[] { "Finance", "ITAdmin", "Student" };
        if (!allowedRoles.Contains(callerRole))
            return StatusCode(403, new { error = "Access denied — finance or admin role required", code = "INVOICE_POLICY_DENIED" });

        var invoice = await _invoiceRepository.GetByIdAsync(id);

        if (invoice is null)
            return NotFound(new { error = "Invoice not found", code = "INVOICE_NOT_FOUND" });

        var student = await _studentRepository.GetByIdAsync(invoice.StudentID);

        if (!int.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var callerId))
            return Unauthorized(new { error = "Your session is invalid. Please sign in again.", code = "INVALID_TOKEN" });
        if (callerRole == "Student" && student?.UserID != callerId)
            return StatusCode(403, new { error = "You may only view your own invoices", code = "INVOICE_FORBIDDEN" });

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
