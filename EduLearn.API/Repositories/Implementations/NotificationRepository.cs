using EduLearn.API.Data;
using EduLearn.API.Models;
using EduLearn.API.Models.Enums;
using EduLearn.API.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace EduLearn.API.Repositories.Implementations;

public class NotificationRepository : INotificationRepository
{
    private readonly AppDbContext _context;

    public NotificationRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<Notification>> GetAllAsync()
        => await _context.Notifications.ToListAsync();

    public async Task<Notification?> GetByIdAsync(int notificationId)
        => await _context.Notifications.FindAsync(notificationId);

    public async Task<IEnumerable<Notification>> GetByUserIdAsync(int userId)
        => await _context.Notifications.Where(n => n.UserID == userId).ToListAsync();

    public async Task<IEnumerable<Notification>> GetUnreadByUserIdAsync(int userId)
        => await _context.Notifications.Where(n => n.UserID == userId && n.ReadAt == null).ToListAsync();

    public async Task<IEnumerable<Notification>> GetByCategoryAsync(NotificationCategory category)
        => await _context.Notifications.Where(n => n.Category == category).ToListAsync();

    public async Task<Notification> CreateAsync(Notification notification)
    {
        _context.Notifications.Add(notification);
        await _context.SaveChangesAsync();
        return notification;
    }

    public async Task<Notification> UpdateAsync(Notification notification)
    {
        _context.Notifications.Update(notification);
        await _context.SaveChangesAsync();
        return notification;
    }

    public async Task MarkAsReadAsync(int notificationId)
    {
        var notification = await _context.Notifications.FindAsync(notificationId);
        if (notification is not null)
        {
            notification.ReadAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }
    }

    public async Task MarkAllAsReadAsync(int userId)
    {
        var unread = await _context.Notifications
            .Where(n => n.UserID == userId && n.ReadAt == null)
            .ToListAsync();

        foreach (var n in unread)
            n.ReadAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
    }

    public async Task<bool> DeleteAsync(int notificationId)
    {
        var notification = await _context.Notifications.FindAsync(notificationId);
        if (notification is null) return false;
        _context.Notifications.Remove(notification);
        await _context.SaveChangesAsync();
        return true;
    }
}
