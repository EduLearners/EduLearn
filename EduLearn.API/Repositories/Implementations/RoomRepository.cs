using EduLearn.API.Data;
using EduLearn.API.Models;
using EduLearn.API.Models.Enums;
using EduLearn.API.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace EduLearn.API.Repositories.Implementations;

public class RoomRepository : IRoomRepository
{
    private readonly AppDbContext _context;

    public RoomRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<Room>> GetAllAsync()
        => await _context.Rooms.ToListAsync();

    public async Task<Room?> GetByIdAsync(int roomId)
        => await _context.Rooms.FindAsync(roomId);

    public async Task<IEnumerable<Room>> GetByStatusAsync(RoomStatus status)
        => await _context.Rooms.Where(r => r.Status == status).ToListAsync();

    public async Task<Room?> GetByBuildingAndNumberAsync(string building, string roomNumber)
        => await _context.Rooms.FirstOrDefaultAsync(r =>
            r.Building == building && r.RoomNumber == roomNumber);

    public async Task<Room> CreateAsync(Room room)
    {
        _context.Rooms.Add(room);
        await _context.SaveChangesAsync();
        return room;
    }

    public async Task<Room> UpdateAsync(Room room)
    {
        _context.Rooms.Update(room);
        await _context.SaveChangesAsync();
        return room;
    }

    public async Task<bool> ExistsAsync(int roomId)
        => await _context.Rooms.AnyAsync(r => r.RoomID == roomId);
}
