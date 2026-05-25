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

    /// <summary>
    /// Create a new applicant record. Registrar and ITAdmin only.
    /// Validates that date of birth is in the past and National ID is unique.
    /// </summary>
    // POST /api/applicants
    [HttpPost]
    public async Task<ActionResult<ApplicantResponseDto>> CreateApplicant(
        CreateApplicantDto dto, CancellationToken cancellationToken)
    {
        // BUG-6 FIX: Validate DOB is in the past
        if (dto.DOB >= DateTime.UtcNow)
            return BadRequest(new { error = "Date of birth must be in the past", code = "INVALID_DOB" });

        // AGE VALIDATION: applicant must be at least 15 years old
        var minDOB = DateTime.UtcNow.AddYears(-15);
        if (dto.DOB > minDOB)
            return BadRequest(new
            {
                error = "Applicant must be at least 15 years old.",
                code  = "APPLICANT_TOO_YOUNG"
            });

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

    /// <summary>
    /// List all applicant records. Registrar and ITAdmin only.
    /// </summary>
    // GET /api/applicants
    [HttpGet]
    public async Task<ActionResult<IEnumerable<ApplicantResponseDto>>> GetApplicants(
        CancellationToken cancellationToken)
    {
        var applicants = await _applicantRepo.GetAllAsync();
        return Ok(applicants.Select(MapToDto));
    }

    /// <summary>
    /// Retrieve a single applicant by ID. Registrar and ITAdmin only.
    /// Returns 404 if the applicant does not exist.
    /// </summary>
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

    /// <summary>
    /// Update the application status of an existing applicant. Registrar and ITAdmin only.
    /// Returns 404 if the applicant does not exist.
    /// </summary>
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
