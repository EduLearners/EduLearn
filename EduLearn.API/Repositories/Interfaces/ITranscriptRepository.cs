using EduLearn.API.Models;
using EduLearn.API.Models.Enums;

namespace EduLearn.API.Repositories.Interfaces;

public interface ITranscriptRepository
{
    Task<IEnumerable<Transcript>> GetAllAsync();
    Task<Transcript?> GetByIdAsync(int transcriptId);
    Task<IEnumerable<Transcript>> GetByStudentIdAsync(int studentId);
    Task<IEnumerable<Transcript>> GetByStatusAsync(TranscriptStatus status);
    Task<Transcript> CreateAsync(Transcript transcript);
    Task<Transcript> UpdateAsync(Transcript transcript);
    Task<bool> DeleteAsync(int transcriptId);
    Task<bool> ExistsAsync(int transcriptId);
}
