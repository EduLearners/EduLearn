using EduLearn.API.Data;
using EduLearn.API.Models;
using EduLearn.API.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace EduLearn.API.Repositories.Implementations;

public class ContentRepository : IContentRepository
{
    private readonly AppDbContext _context;

    public ContentRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<Content>> GetAllAsync()
        => await _context.Contents.ToListAsync();

    public async Task<Content?> GetByIdAsync(int contentId)
        => await _context.Contents.FindAsync(contentId);

    public async Task<IEnumerable<Content>> GetByCourseIdAsync(int courseId)
        => await _context.Contents.Where(c => c.CourseID == courseId).ToListAsync();

    public async Task<IEnumerable<Content>> GetByUploadedByAsync(int userId)
        => await _context.Contents.Where(c => c.UploadedByFK == userId).ToListAsync();

    public async Task<Content> CreateAsync(Content content)
    {
        _context.Contents.Add(content);
        await _context.SaveChangesAsync();
        return content;
    }

    public async Task<Content> UpdateAsync(Content content)
    {
        _context.Contents.Update(content);
        await _context.SaveChangesAsync();
        return content;
    }

    public async Task<bool> DeleteAsync(int contentId)
    {
        var content = await _context.Contents.FindAsync(contentId);
        if (content is null) return false;
        _context.Contents.Remove(content);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> ExistsAsync(int contentId)
        => await _context.Contents.AnyAsync(c => c.ContentID == contentId);
}
