using EduLearn.API.Models;
using EduLearn.API.Models.Enums;

namespace EduLearn.API.Repositories.Interfaces;

public interface IRoomRepository
{
    Task<IEnumerable<Room>> GetAllAsync();
    Task<Room?> GetByIdAsync(int roomId);
    Task<IEnumerable<Room>> GetByStatusAsync(RoomStatus status);
    Task<Room?> GetByBuildingAndNumberAsync(string building, string roomNumber);
    Task<Room> CreateAsync(Room room);
    Task<Room> UpdateAsync(Room room);
    Task<bool> ExistsAsync(int roomId);
}
