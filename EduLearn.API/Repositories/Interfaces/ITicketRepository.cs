using EduLearn.API.Models;

namespace EduLearn.API.Repositories.Interfaces;

public interface ITicketRepository
{
    Task<Ticket?> GetByIdAsync(int ticketId);
    Task<Ticket?> GetByIdWithUsersAsync(int ticketId);
    Task<IEnumerable<Ticket>> GetAllWithUsersAsync();
    Task<IEnumerable<Ticket>> GetByUserAsync(int userId);
    Task<Ticket> CreateAsync(Ticket ticket);
    Task<Ticket> UpdateAsync(Ticket ticket);
}
