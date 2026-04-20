using System.Security.Claims;
using EduLearn.API.DTOs;
using EduLearn.API.Models;
using EduLearn.API.Models.Enums;
using EduLearn.API.Repositories.Interfaces;
using EduLearn.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

// NHT-03 ↔ NHT-01 bridge: ticket state changes push realtime notifications
// through INotificationService (persist-then-push).

namespace EduLearn.API.Controllers;

// NHT-03 — Helpdesk Ticketing.
//
// Error handling: follows the project convention documented in
// docs/CODEBASE-AUDIT-REPORT.md §9a — pre-validate-then-act, no try/catch,
// errors returned as `new { error, code }` with SCREAMING_SNAKE_CASE codes.
[ApiController]
[Route("api/tickets")]
[Authorize]
public class TicketsController : ControllerBase
{
    private readonly ITicketRepository _ticketRepository;
    private readonly IUserRepository _userRepository;
    private readonly AuditLogService _auditLogService;
    private readonly INotificationService _notificationService;

    public TicketsController(
        ITicketRepository ticketRepository,
        IUserRepository userRepository,
        AuditLogService auditLogService,
        INotificationService notificationService)
    {
        _ticketRepository = ticketRepository;
        _userRepository = userRepository;
        _auditLogService = auditLogService;
        _notificationService = notificationService;
    }

    // ── POST /api/tickets — Any authenticated user raises a ticket ──
    [HttpPost]
    public async Task<ActionResult<TicketResponseDto>> Create(CreateTicketDto dto)
    {
        var currentUserId = GetCurrentUserId();

        var ticket = new Ticket
        {
            CreatedByFK = currentUserId,
            Subject = dto.Subject,
            Description = dto.Description,
            Priority = dto.Priority,
            Status = TicketStatus.Open,
            CreatedAt = DateTime.UtcNow
        };

        var created = await _ticketRepository.CreateAsync(ticket);

        // Re-fetch with navigation properties so the response carries usernames.
        var hydrated = await _ticketRepository.GetByIdWithUsersAsync(created.TicketID);

        await _auditLogService.LogAsync(
            currentUserId,
            "TicketCreated",
            "Ticket",
            created.TicketID,
            new { subject = created.Subject, priority = created.Priority.ToString() });

        return CreatedAtAction(
            nameof(GetById),
            new { id = created.TicketID },
            MapToDto(hydrated!));
    }

    // ── GET /api/tickets — ITAdmin sees all, others see their own ──
    [HttpGet]
    public async Task<ActionResult<IEnumerable<TicketResponseDto>>> GetAll()
    {
        var currentUserId = GetCurrentUserId();
        var currentRole = GetCurrentUserRole();

        IEnumerable<Ticket> tickets = currentRole == "ITAdmin"
            ? await _ticketRepository.GetAllWithUsersAsync()
            : await _ticketRepository.GetByUserAsync(currentUserId);

        return Ok(tickets.Select(MapToDto));
    }

    // ── GET /api/tickets/{id} — creator, assignee, or ITAdmin only ──
    [HttpGet("{id}")]
    public async Task<ActionResult<TicketResponseDto>> GetById(int id)
    {
        var ticket = await _ticketRepository.GetByIdWithUsersAsync(id);

        if (ticket is null)
            return NotFound(new { error = "Ticket not found", code = "TICKET_NOT_FOUND" });

        var currentUserId = GetCurrentUserId();
        var currentRole = GetCurrentUserRole();

        var isCreator = ticket.CreatedByFK == currentUserId;
        var isAssignee = ticket.AssignedToFK == currentUserId;
        var isAdmin = currentRole == "ITAdmin";

        if (!isCreator && !isAssignee && !isAdmin)
            return StatusCode(403, new
            {
                error = "You are not allowed to view this ticket",
                code = "TICKET_FORBIDDEN"
            });

        return Ok(MapToDto(ticket));
    }

    // ── PUT /api/tickets/{id}/assign — ITAdmin assigns ticket to a support user ──
    [HttpPut("{id}/assign")]
    [Authorize(Policy = "SupportStaffPolicy")]
    public async Task<ActionResult<TicketResponseDto>> Assign(int id, AssignTicketDto dto)
    {
        var ticket = await _ticketRepository.GetByIdAsync(id);
        if (ticket is null)
            return NotFound(new { error = "Ticket not found", code = "TICKET_NOT_FOUND" });

        if (ticket.Status == TicketStatus.Resolved || ticket.Status == TicketStatus.Closed)
            return BadRequest(new
            {
                error = $"Cannot assign a ticket with status '{ticket.Status}'",
                code = "INVALID_TICKET_STATUS_TRANSITION"
            });

        var assignee = await _userRepository.GetByIdAsync(dto.AssignedToUserId);
        if (assignee is null)
            return BadRequest(new { error = "Assignee user not found", code = "ASSIGNEE_NOT_FOUND" });

        if (assignee.Role != UserRole.ITAdmin)
            return BadRequest(new
            {
                error = "Assignee must have the ITAdmin role",
                code = "ASSIGNEE_NOT_ITADMIN"
            });

        ticket.AssignedToFK = dto.AssignedToUserId;
        ticket.Status = TicketStatus.InProgress;

        var updated = await _ticketRepository.UpdateAsync(ticket);
        var hydrated = await _ticketRepository.GetByIdWithUsersAsync(updated.TicketID);

        var currentUserId = GetCurrentUserId();
        await _auditLogService.LogAsync(
            currentUserId,
            "TicketAssigned",
            "Ticket",
            ticket.TicketID,
            new { assignedToUserId = dto.AssignedToUserId, newStatus = ticket.Status.ToString() });

        // NHT-03 ↔ NHT-01: notify the new assignee in real time.
        await _notificationService.NotifyAsync(
            dto.AssignedToUserId,
            NotificationCategory.IT,
            NotificationSeverity.Info,
            $"Ticket #{ticket.TicketID} '{ticket.Subject}' has been assigned to you.",
            ticket.TicketID);

        return Ok(MapToDto(hydrated!));
    }

    // ── PUT /api/tickets/{id}/resolve — ITAdmin closes with resolution URI ──
    [HttpPut("{id}/resolve")]
    [Authorize(Policy = "SupportStaffPolicy")]
    public async Task<ActionResult<TicketResponseDto>> Resolve(int id, ResolveTicketDto dto)
    {
        var ticket = await _ticketRepository.GetByIdAsync(id);
        if (ticket is null)
            return NotFound(new { error = "Ticket not found", code = "TICKET_NOT_FOUND" });

        if (ticket.Status == TicketStatus.Resolved || ticket.Status == TicketStatus.Closed)
            return BadRequest(new
            {
                error = $"Ticket is already '{ticket.Status}' and cannot be resolved again",
                code = "INVALID_TICKET_STATUS_TRANSITION"
            });

        ticket.Status = TicketStatus.Resolved;
        ticket.ResolutionURI = dto.ResolutionURI;

        var updated = await _ticketRepository.UpdateAsync(ticket);
        var hydrated = await _ticketRepository.GetByIdWithUsersAsync(updated.TicketID);

        var currentUserId = GetCurrentUserId();
        // ResolutionNote is captured only in the audit trail — no schema change on Tickets.
        await _auditLogService.LogAsync(
            currentUserId,
            "TicketResolved",
            "Ticket",
            ticket.TicketID,
            new
            {
                resolutionURI = dto.ResolutionURI,
                resolutionNote = dto.ResolutionNote,
                newStatus = ticket.Status.ToString()
            });

        // NHT-03 ↔ NHT-01: notify the ticket creator that their ticket is resolved.
        await _notificationService.NotifyAsync(
            ticket.CreatedByFK,
            NotificationCategory.IT,
            NotificationSeverity.Info,
            $"Your ticket #{ticket.TicketID} '{ticket.Subject}' has been resolved.",
            ticket.TicketID);

        return Ok(MapToDto(hydrated!));
    }

    // ── helpers ──
    private int GetCurrentUserId()
    {
        var raw = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return int.Parse(raw!);
    }

    private string GetCurrentUserRole()
        => User.FindFirst(ClaimTypes.Role)?.Value ?? string.Empty;

    private static TicketResponseDto MapToDto(Ticket t) => new()
    {
        TicketID = t.TicketID,
        CreatedByUserID = t.CreatedByFK,
        CreatedByUsername = t.CreatedBy?.Username ?? string.Empty,
        AssignedToUserID = t.AssignedToFK,
        AssignedToUsername = t.AssignedTo?.Username,
        Subject = t.Subject,
        Description = t.Description,
        Priority = t.Priority,
        Status = t.Status,
        ResolutionURI = t.ResolutionURI,
        CreatedAt = t.CreatedAt,
        UpdatedAt = t.UpdatedAt
    };
}
