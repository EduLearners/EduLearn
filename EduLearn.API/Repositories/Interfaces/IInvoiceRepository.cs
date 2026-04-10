using EduLearn.API.Models;
using EduLearn.API.Models.Enums;

namespace EduLearn.API.Repositories.Interfaces;

public interface IInvoiceRepository
{
    Task<IEnumerable<Invoice>> GetAllAsync();
    Task<Invoice?> GetByIdAsync(int invoiceId);
    Task<IEnumerable<Invoice>> GetByStudentIdAsync(int studentId);
    Task<IEnumerable<Invoice>> GetByTermAsync(string term);
    Task<IEnumerable<Invoice>> GetByStatusAsync(InvoiceStatus status);
    Task<Invoice> CreateAsync(Invoice invoice);
    Task<Invoice> UpdateAsync(Invoice invoice);
    Task<bool> DeleteAsync(int invoiceId);
    Task<bool> ExistsAsync(int invoiceId);
}
