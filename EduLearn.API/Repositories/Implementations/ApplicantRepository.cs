using EduLearn.API.Data;
using EduLearn.API.Models;
using EduLearn.API.Models.Enums;
using EduLearn.API.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace EduLearn.API.Repositories.Implementations;

public class ApplicantRepository : IApplicantRepository
{
    private readonly AppDbContext _context;

    public ApplicantRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<Applicant>> GetAllAsync()
        => await _context.Applicants.ToListAsync();

    public async Task<Applicant?> GetByIdAsync(int applicantId)
        => await _context.Applicants.FindAsync(applicantId);

    public async Task<IEnumerable<Applicant>> GetByStatusAsync(ApplicationStatus status)
        => await _context.Applicants.Where(a => a.ApplicationStatus == status).ToListAsync();

    public async Task<Applicant?> GetByNationalIdAsync(string nationalId)
        => await _context.Applicants.FirstOrDefaultAsync(a => a.NationalID == nationalId);

    public async Task<Applicant> CreateAsync(Applicant applicant)
    {
        _context.Applicants.Add(applicant);
        await _context.SaveChangesAsync();
        return applicant;
    }

    public async Task<Applicant> UpdateAsync(Applicant applicant)
    {
        _context.Applicants.Update(applicant);
        await _context.SaveChangesAsync();
        return applicant;
    }

    public async Task<bool> ExistsAsync(int applicantId)
        => await _context.Applicants.AnyAsync(a => a.ApplicantID == applicantId);
}
