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
public class InvoicesControllerTest
{
    // ── Mock dependencies ──
    private Mock<IInvoiceRepository> _invoiceRepoMock;
    private Mock<IFeeScheduleRepository> _feeRepoMock;
    private Mock<IScholarshipRepository> _scholarshipRepoMock;
    private Mock<IStudentRepository> _studentRepoMock;
    private Mock<INotificationService> _notificationServiceMock;
    private Mock<IAuditLogRepository> _auditLogRepoMock;

    // ── Real service with mocked inner dependency ──
    private AuditLogService _auditLogService;

    // ── Controller under test ──
    private InvoicesController _controller;

    // ── Reusable test data ──
    private Student _testStudent;
    private EduLearn.API.Models.Program _testProgram;
    private FeeSchedule _testFee;

    [SetUp]
    public void Setup()
    {
        _invoiceRepoMock = new Mock<IInvoiceRepository>();
        _feeRepoMock = new Mock<IFeeScheduleRepository>();
        _scholarshipRepoMock = new Mock<IScholarshipRepository>();
        _studentRepoMock = new Mock<IStudentRepository>();
        _notificationServiceMock = new Mock<INotificationService>();
        _auditLogRepoMock = new Mock<IAuditLogRepository>();

        _auditLogService = new AuditLogService(_auditLogRepoMock.Object);

        _controller = new InvoicesController(
            _invoiceRepoMock.Object,
            _feeRepoMock.Object,
            _scholarshipRepoMock.Object,
            _studentRepoMock.Object,
            _notificationServiceMock.Object,
            _auditLogService);

        _testProgram = new EduLearn.API.Models.Program
        {
            ProgramID = 1,
            Name = "B.Tech CS",
            DegreeType = "Bachelor",
            DurationTerms = 8,
            Status = ProgramStatus.Active
        };

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

        _testFee = new FeeSchedule
        {
            FeeID = 1,
            ProgramID = 1,
            Term = "Fall 2026",
            FeeItemsJSON = "[{\"item\":\"Tuition\",\"amount\":50000},{\"item\":\"Lab\",\"amount\":5000}]",
            EffectiveFrom = new DateTime(2026, 7, 1),
            EffectiveTo = new DateTime(2026, 12, 31),
            Status = FeeScheduleStatus.Active,
            Program = _testProgram
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
    // POST /api/invoices/generate
    // ════════════════════════════════════════════════════════════════

    [Test]
    public async Task Generate_ValidDto_Returns201()
    {
        // Arrange
        SetCaller(10, "Finance");
        _studentRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(_testStudent);
        _invoiceRepoMock.Setup(r => r.GetByStudentAndTermAsync(1, "Fall 2026"))
            .ReturnsAsync((Invoice?)null);
        _feeRepoMock.Setup(r => r.GetByProgramAndTermAsync(1, "Fall 2026", It.IsAny<CancellationToken>()))
            .ReturnsAsync(_testFee);
        _scholarshipRepoMock.Setup(r => r.GetActiveByStudentIdAsync(1, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Scholarship>());
        _invoiceRepoMock.Setup(r => r.CreateAsync(It.IsAny<Invoice>()))
            .ReturnsAsync((Invoice i) => { i.InvoiceID = 1; return i; });

        var dto = new GenerateInvoiceDto
        {
            StudentID = 1,
            Term = "Fall 2026",
            DueDate = DateTime.UtcNow.AddDays(30)
        };

        // Act
        var result = await _controller.Generate(dto, CancellationToken.None);

        // Assert
        var created = result.Result as CreatedAtActionResult;
        Assert.That(created, Is.Not.Null);
        Assert.That(created!.StatusCode, Is.EqualTo(201));

        var response = created.Value as InvoiceResponseDto;
        Assert.That(response!.AmountDue, Is.EqualTo(55000m)); // 50000 + 5000
        Assert.That(response.Status, Is.EqualTo(InvoiceStatus.Pending));
        Assert.That(response.StudentName, Is.EqualTo("Rahul Kumar"));

        _invoiceRepoMock.Verify(r => r.CreateAsync(It.IsAny<Invoice>()), Times.Once);
    }

    [Test]
    public async Task Generate_StudentNotFound_Returns404()
    {
        // Arrange
        SetCaller(10, "Finance");
        _studentRepoMock.Setup(r => r.GetByIdAsync(999)).ReturnsAsync((Student?)null);

        var dto = new GenerateInvoiceDto
        {
            StudentID = 999,
            Term = "Fall 2026",
            DueDate = DateTime.UtcNow.AddDays(30)
        };

        // Act
        var result = await _controller.Generate(dto, CancellationToken.None);

        // Assert
        var notFound = result.Result as NotFoundObjectResult;
        Assert.That(notFound, Is.Not.Null);

        _invoiceRepoMock.Verify(r => r.CreateAsync(It.IsAny<Invoice>()), Times.Never);
    }

    [Test]
    public async Task Generate_DuplicateInvoice_Returns409()
    {
        // Arrange — M-8: one invoice per (student, term)
        SetCaller(10, "Finance");
        _studentRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(_testStudent);
        _invoiceRepoMock.Setup(r => r.GetByStudentAndTermAsync(1, "Fall 2026"))
            .ReturnsAsync(new Invoice
            {
                InvoiceID = 1,
                StudentID = 1,
                Term = "Fall 2026",
                LineItemsJSON = "[]",
                AmountDue = 50000,
                DueDate = DateTime.UtcNow.AddDays(30),
                Status = InvoiceStatus.Pending
            });

        var dto = new GenerateInvoiceDto
        {
            StudentID = 1,
            Term = "Fall 2026",
            DueDate = DateTime.UtcNow.AddDays(30)
        };

        // Act
        var result = await _controller.Generate(dto, CancellationToken.None);

        // Assert
        var conflict = result.Result as ConflictObjectResult;
        Assert.That(conflict, Is.Not.Null);
        Assert.That(conflict!.StatusCode, Is.EqualTo(409));

        _invoiceRepoMock.Verify(r => r.CreateAsync(It.IsAny<Invoice>()), Times.Never);
    }

    [Test]
    public async Task Generate_PastDueDate_Returns400()
    {
        // Arrange — M-10: DueDate cannot be in the past
        SetCaller(10, "Finance");
        _studentRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(_testStudent);

        var dto = new GenerateInvoiceDto
        {
            StudentID = 1,
            Term = "Fall 2026",
            DueDate = DateTime.UtcNow.AddDays(-10) // past
        };

        // Act
        var result = await _controller.Generate(dto, CancellationToken.None);

        // Assert
        var badRequest = result.Result as BadRequestObjectResult;
        Assert.That(badRequest, Is.Not.Null);

        _invoiceRepoMock.Verify(r => r.CreateAsync(It.IsAny<Invoice>()), Times.Never);
    }

    // ════════════════════════════════════════════════════════════════
    // GET /api/invoices/student/{studentId}
    // ════════════════════════════════════════════════════════════════

    [Test]
    public async Task GetByStudent_OwnInvoices_Returns200()
    {
        // Arrange — Student views own invoices
        SetCaller(3, "Student");
        _studentRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(_testStudent);
        _invoiceRepoMock.Setup(r => r.GetByStudentIdAsync(1))
            .ReturnsAsync(new List<Invoice>
            {
                new Invoice
                {
                    InvoiceID = 1, StudentID = 1, Term = "Fall 2026",
                    LineItemsJSON = "[]", AmountDue = 55000,
                    DueDate = DateTime.UtcNow.AddDays(30),
                    Status = InvoiceStatus.Pending
                }
            });

        // Act
        var result = await _controller.GetByStudent(1, CancellationToken.None);

        // Assert
        var ok = result.Result as OkObjectResult;
        Assert.That(ok, Is.Not.Null);

        var list = (ok!.Value as IEnumerable<InvoiceResponseDto>)?.ToList();
        Assert.That(list!.Count, Is.EqualTo(1));
    }

    [Test]
    public async Task GetByStudent_OtherStudentData_Returns403()
    {
        // Arrange — C-3: Student can't view another's invoices
        SetCaller(3, "Student");
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
        _studentRepoMock.Setup(r => r.GetByIdAsync(2)).ReturnsAsync(otherStudent);

        // Act
        var result = await _controller.GetByStudent(2, CancellationToken.None);

        // Assert
        var forbidden = result.Result as ObjectResult;
        Assert.That(forbidden!.StatusCode, Is.EqualTo(403));
    }

    // ════════════════════════════════════════════════════════════════
    // GET /api/invoices/{id}
    // ════════════════════════════════════════════════════════════════

    [Test]
    public async Task GetById_Exists_Returns200()
    {
        // Arrange
        SetCaller(10, "Finance");
        var invoice = new Invoice
        {
            InvoiceID = 1,
            StudentID = 1,
            Term = "Fall 2026",
            LineItemsJSON = "[]",
            AmountDue = 55000,
            DueDate = DateTime.UtcNow.AddDays(30),
            Status = InvoiceStatus.Pending
        };
        _invoiceRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(invoice);
        _studentRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(_testStudent);

        // Act
        var result = await _controller.GetById(1, CancellationToken.None);

        // Assert
        var ok = result.Result as OkObjectResult;
        Assert.That(ok, Is.Not.Null);

        var response = ok!.Value as InvoiceResponseDto;
        Assert.That(response!.InvoiceID, Is.EqualTo(1));
        Assert.That(response.StudentName, Is.EqualTo("Rahul Kumar"));
    }

    [Test]
    public async Task GetById_NotFound_Returns404()
    {
        // Arrange
        SetCaller(10, "Finance");
        _invoiceRepoMock.Setup(r => r.GetByIdAsync(999)).ReturnsAsync((Invoice?)null);

        // Act
        var result = await _controller.GetById(999, CancellationToken.None);

        // Assert
        var notFound = result.Result as NotFoundObjectResult;
        Assert.That(notFound, Is.Not.Null);
        Assert.That(notFound!.StatusCode, Is.EqualTo(404));
    }

    [Test]
    public async Task GetById_StudentViewsOther_Returns403()
    {
        // Arrange — C-18: Student can't view another student's invoice
        SetCaller(3, "Student");
        var invoice = new Invoice
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
        _invoiceRepoMock.Setup(r => r.GetByIdAsync(5)).ReturnsAsync(invoice);
        _studentRepoMock.Setup(r => r.GetByIdAsync(2)).ReturnsAsync(otherStudent);

        // Act
        var result = await _controller.GetById(5, CancellationToken.None);

        // Assert
        var forbidden = result.Result as ObjectResult;
        Assert.That(forbidden!.StatusCode, Is.EqualTo(403));
    }

    // ════════════════════════════════════════════════════════════════
    // phase4-fix-7: GetByStudent and GetById must reject non-Finance non-Student roles
    // ════════════════════════════════════════════════════════════════

    [Test]
    [TestCase("Instructor")]
    [TestCase("Registrar")]
    [TestCase("DeptAdmin")]
    [TestCase("Auditor")]
    public async Task GetByStudent_NonFinanceRole_Returns403(string role)
    {
        // Arrange — non-Finance, non-ITAdmin, non-Student caller
        SetCaller(20, role);
        _studentRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(_testStudent);

        // Act
        var result = await _controller.GetByStudent(1, CancellationToken.None);

        // Assert
        var forbidden = result.Result as ObjectResult;
        Assert.That(forbidden, Is.Not.Null);
        Assert.That(forbidden!.StatusCode, Is.EqualTo(403));
    }

    [Test]
    [TestCase("Instructor")]
    [TestCase("Registrar")]
    [TestCase("DeptAdmin")]
    [TestCase("Auditor")]
    public async Task GetById_NonFinanceRole_Returns403(string role)
    {
        // Arrange — non-Finance, non-ITAdmin, non-Student caller
        SetCaller(20, role);
        var invoice = new Invoice
        {
            InvoiceID = 1, StudentID = 1, Term = "Fall 2026",
            LineItemsJSON = "[]", AmountDue = 55000,
            DueDate = DateTime.UtcNow.AddDays(30),
            Status = InvoiceStatus.Pending
        };
        _invoiceRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(invoice);
        _studentRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(_testStudent);

        // Act
        var result = await _controller.GetById(1, CancellationToken.None);

        // Assert
        var forbidden = result.Result as ObjectResult;
        Assert.That(forbidden, Is.Not.Null);
        Assert.That(forbidden!.StatusCode, Is.EqualTo(403));
    }
}