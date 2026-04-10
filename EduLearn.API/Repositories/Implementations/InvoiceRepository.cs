using EduLearn.API.Data;
using EduLearn.API.Models;
using EduLearn.API.Models.Enums;
using EduLearn.API.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace EduLearn.API.Repositories.Implementations;

public class InvoiceRepository : IInvoiceRepository
{
    private readonly AppDbContext _context;

    public InvoiceRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<Invoice>> GetAllAsync()
        => await _context.Invoices.ToListAsync();

    public async Task<Invoice?> GetByIdAsync(int invoiceId)
        => await _context.Invoices.FindAsync(invoiceId);

    public async Task<IEnumerable<Invoice>> GetByStudentIdAsync(int studentId)
        => await _context.Invoices.Where(i => i.StudentID == studentId).ToListAsync();

    public async Task<IEnumerable<Invoice>> GetByTermAsync(string term)
        => await _context.Invoices.Where(i => i.Term == term).ToListAsync();

    public async Task<IEnumerable<Invoice>> GetByStatusAsync(InvoiceStatus status)
        => await _context.Invoices.Where(i => i.Status == status).ToListAsync();

    public async Task<Invoice> CreateAsync(Invoice invoice)
    {
        _context.Invoices.Add(invoice);
        await _context.SaveChangesAsync();
        return invoice;
    }

    public async Task<Invoice> UpdateAsync(Invoice invoice)
    {
        _context.Invoices.Update(invoice);
        await _context.SaveChangesAsync();
        return invoice;
    }

    public async Task<bool> DeleteAsync(int invoiceId)
    {
        var invoice = await _context.Invoices.FindAsync(invoiceId);
        if (invoice is null) return false;
        _context.Invoices.Remove(invoice);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> ExistsAsync(int invoiceId)
        => await _context.Invoices.AnyAsync(i => i.InvoiceID == invoiceId);
}
