using EduLearn.API.Models;
using EduLearn.API.Models.Enums;

namespace EduLearn.API.Repositories.Interfaces;

public interface IApplicantRepository
{
    Task<IEnumerable<Applicant>> GetAllAsync();
    Task<Applicant?> GetByIdAsync(int applicantId);
    Task<IEnumerable<Applicant>> GetByStatusAsync(ApplicationStatus status);
    Task<Applicant?> GetByNationalIdAsync(string nationalId);
    Task<Applicant> CreateAsync(Applicant applicant);
    Task<Applicant> UpdateAsync(Applicant applicant);
    Task<bool> ExistsAsync(int applicantId);
}
