using EduLearn.API.Data;
using EduLearn.API.Models;
using EduLearn.API.Models.Enums;
using EduLearn.API.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace EduLearn.API.Repositories.Implementations;

public class DiscussionRepository : IDiscussionRepository
{
    private readonly AppDbContext _context;

    public DiscussionRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<Discussion>> GetAllAsync()
        => await _context.Discussions.ToListAsync();

    public async Task<Discussion?> GetByIdAsync(int discussionId)
        => await _context.Discussions.FindAsync(discussionId);

    public async Task<IEnumerable<Discussion>> GetByCourseIdAsync(int courseId)
        => await _context.Discussions.Where(d => d.CourseID == courseId).ToListAsync();

    public async Task<IEnumerable<Discussion>> GetByStatusAsync(DiscussionStatus status)
        => await _context.Discussions.Where(d => d.Status == status).ToListAsync();

    public async Task<IEnumerable<Discussion>> GetByThreadStarterAsync(int userId)
        => await _context.Discussions.Where(d => d.ThreadStarterID == userId).ToListAsync();

    public async Task<Discussion> CreateAsync(Discussion discussion)
    {
        _context.Discussions.Add(discussion);
        await _context.SaveChangesAsync();
        return discussion;
    }

    public async Task<Discussion> UpdateAsync(Discussion discussion)
    {
        _context.Discussions.Update(discussion);
        await _context.SaveChangesAsync();
        return discussion;
    }

    public async Task<bool> DeleteAsync(int discussionId)
    {
        var discussion = await _context.Discussions.FindAsync(discussionId);
        if (discussion is null) return false;
        _context.Discussions.Remove(discussion);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> ExistsAsync(int discussionId)
        => await _context.Discussions.AnyAsync(d => d.DiscussionID == discussionId);
}
