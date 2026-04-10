using EduLearn.API.Data;
using EduLearn.API.Models;
using EduLearn.API.Models.Enums;
using EduLearn.API.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace EduLearn.API.Repositories.Implementations;

public class TranscriptRepository : ITranscriptRepository
{
    private readonly AppDbContext _context;

    public TranscriptRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<Transcript>> GetAllAsync()
        => await _context.Transcripts.ToListAsync();

    public async Task<Transcript?> GetByIdAsync(int transcriptId)
        => await _context.Transcripts.FindAsync(transcriptId);

    public async Task<IEnumerable<Transcript>> GetByStudentIdAsync(int studentId)
        => await _context.Transcripts.Where(t => t.StudentID == studentId).ToListAsync();

    public async Task<IEnumerable<Transcript>> GetByStatusAsync(TranscriptStatus status)
        => await _context.Transcripts.Where(t => t.Status == status).ToListAsync();

    public async Task<Transcript> CreateAsync(Transcript transcript)
    {
        _context.Transcripts.Add(transcript);
        await _context.SaveChangesAsync();
        return transcript;
    }

    public async Task<Transcript> UpdateAsync(Transcript transcript)
    {
        _context.Transcripts.Update(transcript);
        await _context.SaveChangesAsync();
        return transcript;
    }

    public async Task<bool> DeleteAsync(int transcriptId)
    {
        var transcript = await _context.Transcripts.FindAsync(transcriptId);
        if (transcript is null) return false;
        _context.Transcripts.Remove(transcript);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> ExistsAsync(int transcriptId)
        => await _context.Transcripts.AnyAsync(t => t.TranscriptID == transcriptId);
}
