using EduLearn.API.DTOs;
using EduLearn.API.Models;
using EduLearn.API.Repositories.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EduLearn.API.Controllers;

[ApiController]
[Route("api/[controller]")]
// HARDENING (C-7): PRD §6.2 SRA-01 requires Registrar (or ITAdmin) for applicant CRUD.
// Previously bare [Authorize] meant any Student could list/read/accept applicants (PII leak).
[Authorize(Roles = "Registrar,ITAdmin")]
public class ApplicantsController : ControllerBase
{
    private readonly IApplicantRepository _applicantRepo;

    public ApplicantsController(IApplicantRepository applicantRepo)
    {
        _applicantRepo = applicantRepo;
    }

    // POST /api/applicants
    [HttpPost]
    public async Task<ActionResult<ApplicantResponseDto>> CreateApplicant(
        CreateApplicantDto dto, CancellationToken cancellationToken)
    {
        // If NationalID is provided, check it is not already registered
        if (!string.IsNullOrWhiteSpace(dto.NationalID))
        {
            var existing = await _applicantRepo.GetByNationalIdAsync(dto.NationalID);
            if (existing is not null)
                return Conflict(new
                {
                    error = "An applicant with this National ID already exists",
                    code = "DUPLICATE_NATIONAL_ID"
                });
        }

        var applicant = new Applicant
        {
            Name = dto.Name,
            DOB = dto.DOB,
            NationalID = dto.NationalID,
            ContactInfoJSON = dto.ContactInfoJSON,
            ProgramApplied = dto.ProgramApplied,
            DocumentsURIJSON = dto.DocumentsURIJSON
        };

        var created = await _applicantRepo.CreateAsync(applicant);
        return CreatedAtAction(nameof(GetApplicant),
            new { id = created.ApplicantID }, MapToDto(created));
    }

    // GET /api/applicants
    [HttpGet]
    public async Task<ActionResult<IEnumerable<ApplicantResponseDto>>> GetApplicants(
        CancellationToken cancellationToken)
    {
        var applicants = await _applicantRepo.GetAllAsync();
        return Ok(applicants.Select(MapToDto));
    }

    // GET /api/applicants/{id}
    [HttpGet("{id}")]
    public async Task<ActionResult<ApplicantResponseDto>> GetApplicant(
        int id, CancellationToken cancellationToken)
    {
        var applicant = await _applicantRepo.GetByIdAsync(id);

        if (applicant is null)
            return NotFound(new
            {
                error = "Applicant not found",
                code = "APPLICANT_NOT_FOUND"
            });

        return Ok(MapToDto(applicant));
    }

    // PUT /api/applicants/{id}/status
    [HttpPut("{id}/status")]
    public async Task<ActionResult<ApplicantResponseDto>> UpdateStatus(
        int id, UpdateApplicantStatusDto dto, CancellationToken cancellationToken)
    {
        var applicant = await _applicantRepo.GetByIdAsync(id);

        if (applicant is null)
            return NotFound(new
            {
                error = "Applicant not found",
                code = "APPLICANT_NOT_FOUND"
            });

        applicant.ApplicationStatus = dto.Status;
        var updated = await _applicantRepo.UpdateAsync(applicant);
        return Ok(MapToDto(updated));
    }

    private static ApplicantResponseDto MapToDto(Applicant a) => new()
    {
        ApplicantID = a.ApplicantID,
        Name = a.Name,
        DOB = a.DOB,
        NationalID = a.NationalID,
        ContactInfoJSON = a.ContactInfoJSON,
        ProgramApplied = a.ProgramApplied,
        ApplicationStatus = a.ApplicationStatus,
        SubmittedAt = a.SubmittedAt,
        DocumentsURIJSON = a.DocumentsURIJSON
    };
}
