using EduLearn.API.Models.Enums;

namespace EduLearn.API.Repositories.Interfaces;

public interface IProgramRepository
{
    // Get all programs
    Task<IEnumerable<EduLearn.API.Models.Program>> GetAllAsync();

    // Get a single program by ID
    Task<EduLearn.API.Models.Program?> GetByIdAsync(int programId);

    // Check if a program with the same Name + DegreeType already exists
    Task<bool> ExistsByNameAndDegreeAsync(string name, string degreeType);

    // Create a new program
    Task<EduLearn.API.Models.Program> CreateAsync(EduLearn.API.Models.Program program);

    // Update an existing program (caller modifies fields, repo saves)
    Task<EduLearn.API.Models.Program> UpdateAsync(EduLearn.API.Models.Program program);

    // Check if a program exists by ID
    Task<bool> ExistsAsync(int programId);
}
