using System.Security.Claims;
using EduLearn.API.Controllers;
using EduLearn.API.DTOs;
using EduLearn.API.Models;
using EduLearn.API.Models.Enums;
using EduLearn.API.Repositories.Interfaces;
using EduLearn.API.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;

namespace EduLearn_Testing.Controller;

[TestFixture]
public class PaymentsControllerTest
{
    // ── Mock dependencies ──
    private Mock<IPaymentRepository> _paymentRepoMock;
    private Mock<IInvoiceRepository> _invoiceRepoMock;
    private Mock<IStudentRepository> _studentRepoMock;
    private Mock<INotificationService> _notificationServiceMock;
    private Mock<IAuditLogRepository> _auditLogRepoMock;

    // ── Real service with mocked inner dependency ──
    private AuditLogService _auditLogService;

    // ── Controller under test ──
    private PaymentsController _controller;

    // ── Reusable test data ──
    private Student _testStudent;
    private Invoice _pendingInvoice;
    private Invoice _paidInvoice;
    private Invoice _cancelledInvoice;

    [SetUp]
    public void Setup()
    {
        _paymentRepoMock = new Mock<IPaymentRepository>();
        _invoiceRepoMock = new Mock<IInvoiceRepository>();
        _studentRepoMock = new Mock<IStudentRepository>();
        _notificationServiceMock = new Mock<INotificationService>();
        _auditLogRepoMock = new Mock<IAuditLogRepository>();

        _auditLogService = new AuditLogService(_auditLogRepoMock.Object);

        _controller = new PaymentsController(
            _paymentRepoMock.Object,
            _invoiceRepoMock.Object,
            _studentRepoMock.Object,
            _notificationServiceMock.Object,
            _auditLogService);

        _testStudent = new Student
        {
            StudentID = 1,
            UserID = 3,
            MRN = "STU-00001",
            Name = "Rahul Kumar",
            DOB = new DateTime(2004, 5, 15),
            ProgramID = 1,
            EntryTerm = "Fall 2026"
        };

        _pendingInvoice = new Invoice
        {
            InvoiceID = 1,
            StudentID = 1,
            Term = "Fall 2026",
            LineItemsJSON = "[]",
            AmountDue = 55000,
            DueDate = DateTime.UtcNow.AddDays(30),
            Status = InvoiceStatus.Pending
        };

        _paidInvoice = new Invoice
        {
            InvoiceID = 2,
            StudentID = 1,
            Term = "Spring 2026",
            LineItemsJSON = "[]",
            AmountDue = 50000,
            DueDate = DateTime.UtcNow.AddDays(-10),
            Status = InvoiceStatus.Paid
        };

        _cancelledInvoice = new Invoice
        {
            InvoiceID = 3,
            StudentID = 1,
            Term = "Fall 2025",
            LineItemsJSON = "[]",
            AmountDue = 45000,
            DueDate = DateTime.UtcNow.AddDays(-30),
            Status = InvoiceStatus.Cancelled
        };
    }

    private void SetCaller(int userId, string role)
    {
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
            new Claim(ClaimTypes.Role, role)
        };
        var identity = new ClaimsIdentity(claims, "TestAuth");
        _controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(identity) }
        };
    }

    // ════════════════════════════════════════════════════════════════
    // POST /api/payments — Create
    // ════════════════════════════════════════════════════════════════

    [Test]
    public async Task Create_ValidPayment_Returns201()
    {
        // Arrange — full payment covers the invoice
        SetCaller(10, "Finance");
        _invoiceRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(_pendingInvoice);
        _paymentRepoMock.Setup(r => r.CreateAsync(It.IsAny<Payment>()))
            .ReturnsAsync((Payment p) => { p.PaymentID = 1; return p; });
        _paymentRepoMock.Setup(r => r.GetByInvoiceIdAsync(1))
            .ReturnsAsync(new List<Payment>
            {
                new Payment { PaymentID = 1, InvoiceID = 1, Amount = 55000, Status = PaymentStatus.Completed }
            });
        _invoiceRepoMock.Setup(r => r.UpdateAsync(It.IsAny<Invoice>()))
            .ReturnsAsync((Invoice i) => i);
        _studentRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(_testStudent);

        var dto = new CreatePaymentDto
        {
            InvoiceID = 1,
            Amount = 55000,
            Method = PaymentMethod.UPI,
            Reference = "TXN-12345"
        };

        // Act
        var result = await _controller.Create(dto, CancellationToken.None);

        // Assert
        var created = result.Result as CreatedAtActionResult;
        Assert.That(created, Is.Not.Null);
        Assert.That(created!.StatusCode, Is.EqualTo(201));

        var response = created.Value as PaymentResponseDto;
        Assert.That(response!.Amount, Is.EqualTo(55000));
        Assert.That(response.Method, Is.EqualTo(PaymentMethod.UPI));
        Assert.That(response.Status, Is.EqualTo(PaymentStatus.Completed));

        _paymentRepoMock.Verify(r => r.CreateAsync(It.IsAny<Payment>()), Times.Once);
    }

    [Test]
    public async Task Create_InvoiceNotFound_Returns404()
    {
        // Arrange
        SetCaller(10, "Finance");
        _invoiceRepoMock.Setup(r => r.GetByIdAsync(999)).ReturnsAsync((Invoice?)null);

        var dto = new CreatePaymentDto
        {
            InvoiceID = 999,
            Amount = 1000,
            Method = PaymentMethod.Cash
        };

        // Act
        var result = await _controller.Create(dto, CancellationToken.None);

        // Assert
        var notFound = result.Result as NotFoundObjectResult;
        Assert.That(notFound, Is.Not.Null);
        Assert.That(notFound!.StatusCode, Is.EqualTo(404));

        _paymentRepoMock.Verify(r => r.CreateAsync(It.IsAny<Payment>()), Times.Never);
    }

    [Test]
    public async Task Create_InvoiceAlreadyPaid_Returns400()
    {
        // Arrange — invoice is already fully paid
        SetCaller(10, "Finance");
        _invoiceRepoMock.Setup(r => r.GetByIdAsync(2)).ReturnsAsync(_paidInvoice);

        var dto = new CreatePaymentDto
        {
            InvoiceID = 2,
            Amount = 1000,
            Method = PaymentMethod.Card
        };

        // Act
        var result = await _controller.Create(dto, CancellationToken.None);

        // Assert
        var badRequest = result.Result as BadRequestObjectResult;
        Assert.That(badRequest, Is.Not.Null);
        Assert.That(badRequest!.StatusCode, Is.EqualTo(400));

        _paymentRepoMock.Verify(r => r.CreateAsync(It.IsAny<Payment>()), Times.Never);
    }

    [Test]
    public async Task Create_InvoiceCancelled_Returns400()
    {
        // Arrange — invoice is cancelled
        SetCaller(10, "Finance");
        _invoiceRepoMock.Setup(r => r.GetByIdAsync(3)).ReturnsAsync(_cancelledInvoice);

        var dto = new CreatePaymentDto
        {
            InvoiceID = 3,
            Amount = 1000,
            Method = PaymentMethod.BankTransfer
        };

        // Act
        var result = await _controller.Create(dto, CancellationToken.None);

        // Assert
        var badRequest = result.Result as BadRequestObjectResult;
        Assert.That(badRequest, Is.Not.Null);

        _paymentRepoMock.Verify(r => r.CreateAsync(It.IsAny<Payment>()), Times.Never);
    }

    [Test]
    public async Task Create_ZeroAmount_Returns400()
    {
        // Arrange — amount must be positive
        SetCaller(10, "Finance");
        _invoiceRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(_pendingInvoice);

        var dto = new CreatePaymentDto
        {
            InvoiceID = 1,
            Amount = 0,
            Method = PaymentMethod.Cash
        };

        // Act
        var result = await _controller.Create(dto, CancellationToken.None);

        // Assert
        var badRequest = result.Result as BadRequestObjectResult;
        Assert.That(badRequest, Is.Not.Null);

        _paymentRepoMock.Verify(r => r.CreateAsync(It.IsAny<Payment>()), Times.Never);
    }

    [Test]
    public async Task Create_PartialPayment_InvoiceBecomesPartiallyPaid()
    {
        // Arrange — pay 20000 of 55000
        SetCaller(10, "Finance");
        _invoiceRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(_pendingInvoice);
        _paymentRepoMock.Setup(r => r.CreateAsync(It.IsAny<Payment>()))
            .ReturnsAsync((Payment p) => { p.PaymentID = 1; return p; });
        _paymentRepoMock.Setup(r => r.GetByInvoiceIdAsync(1))
            .ReturnsAsync(new List<Payment>
            {
                new Payment { PaymentID = 1, InvoiceID = 1, Amount = 20000, Status = PaymentStatus.Completed }
            });
        _invoiceRepoMock.Setup(r => r.UpdateAsync(It.IsAny<Invoice>()))
            .ReturnsAsync((Invoice i) => i);
        _studentRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(_testStudent);

        var dto = new CreatePaymentDto
        {
            InvoiceID = 1,
            Amount = 20000,
            Method = PaymentMethod.UPI
        };

        // Act
        await _controller.Create(dto, CancellationToken.None);

        // Assert — invoice status should be PartiallyPaid (20000 < 55000)
        _invoiceRepoMock.Verify(r => r.UpdateAsync(
            It.Is<Invoice>(i => i.Status == InvoiceStatus.PartiallyPaid)), Times.Once);
    }

    // ════════════════════════════════════════════════════════════════
    // GET /api/payments/invoice/{invoiceId} — GetByInvoice
    // ════════════════════════════════════════════════════════════════

    [Test]
    public async Task GetByInvoice_Exists_Returns200()
    {
        // Arrange
        SetCaller(10, "Finance");
        _invoiceRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(_pendingInvoice);
        _paymentRepoMock.Setup(r => r.GetByInvoiceIdAsync(1))
            .ReturnsAsync(new List<Payment>
            {
                new Payment
                {
                    PaymentID = 1, InvoiceID = 1, Amount = 25000,
                    Method = PaymentMethod.UPI, Reference = "TXN-001",
                    Status = PaymentStatus.Completed
                }
            });

        // Act
        var result = await _controller.GetByInvoice(1, CancellationToken.None);

        // Assert
        var ok = result.Result as OkObjectResult;
        Assert.That(ok, Is.Not.Null);

        var list = (ok!.Value as IEnumerable<PaymentResponseDto>)?.ToList();
        Assert.That(list!.Count, Is.EqualTo(1));
        Assert.That(list[0].Amount, Is.EqualTo(25000));
        Assert.That(list[0].Method, Is.EqualTo(PaymentMethod.UPI));
    }

    [Test]
    public async Task GetByInvoice_InvoiceNotFound_Returns404()
    {
        // Arrange
        SetCaller(10, "Finance");
        _invoiceRepoMock.Setup(r => r.GetByIdAsync(999)).ReturnsAsync((Invoice?)null);

        // Act
        var result = await _controller.GetByInvoice(999, CancellationToken.None);

        // Assert
        var notFound = result.Result as NotFoundObjectResult;
        Assert.That(notFound, Is.Not.Null);
        Assert.That(notFound!.StatusCode, Is.EqualTo(404));
    }

    [Test]
    public async Task GetByInvoice_StudentViewsOther_Returns403()
    {
        // Arrange — C-19: Student can't view another student's payments
        SetCaller(3, "Student");
        var otherInvoice = new Invoice
        {
            InvoiceID = 5,
            StudentID = 2,
            Term = "Fall 2026",
            LineItemsJSON = "[]",
            AmountDue = 50000,
            DueDate = DateTime.UtcNow.AddDays(30),
            Status = InvoiceStatus.Pending
        };
        var otherStudent = new Student
        {
            StudentID = 2,
            UserID = 99,
            MRN = "STU-00002",
            Name = "Other",
            DOB = new DateTime(2004, 1, 1),
            ProgramID = 1,
            EntryTerm = "Fall 2026"
        };
        _invoiceRepoMock.Setup(r => r.GetByIdAsync(5)).ReturnsAsync(otherInvoice);
        _studentRepoMock.Setup(r => r.GetByIdAsync(2)).ReturnsAsync(otherStudent);

        // Act
        var result = await _controller.GetByInvoice(5, CancellationToken.None);

        // Assert
        var forbidden = result.Result as ObjectResult;
        Assert.That(forbidden!.StatusCode, Is.EqualTo(403));
    }
}