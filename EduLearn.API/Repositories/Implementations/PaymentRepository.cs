using EduLearn.API.Data;
using EduLearn.API.Models;
using EduLearn.API.Models.Enums;
using EduLearn.API.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace EduLearn.API.Repositories.Implementations;

public class PaymentRepository : IPaymentRepository
{
    private readonly AppDbContext _context;

    public PaymentRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<Payment>> GetAllAsync()
        => await _context.Payments.ToListAsync();

    public async Task<Payment?> GetByIdAsync(int paymentId)
        => await _context.Payments.FindAsync(paymentId);

    public async Task<IEnumerable<Payment>> GetByInvoiceIdAsync(int invoiceId)
        => await _context.Payments.Where(p => p.InvoiceID == invoiceId).ToListAsync();

    public async Task<IEnumerable<Payment>> GetByStatusAsync(PaymentStatus status)
        => await _context.Payments.Where(p => p.Status == status).ToListAsync();

    public async Task<IEnumerable<Payment>> GetByMethodAsync(PaymentMethod method)
        => await _context.Payments.Where(p => p.Method == method).ToListAsync();

    public async Task<Payment> CreateAsync(Payment payment)
    {
        _context.Payments.Add(payment);
        await _context.SaveChangesAsync();
        return payment;
    }

    public async Task<Payment> UpdateAsync(Payment payment)
    {
        _context.Payments.Update(payment);
        await _context.SaveChangesAsync();
        return payment;
    }

    public async Task<bool> DeleteAsync(int paymentId)
    {
        var payment = await _context.Payments.FindAsync(paymentId);
        if (payment is null) return false;
        _context.Payments.Remove(payment);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> ExistsAsync(int paymentId)
        => await _context.Payments.AnyAsync(p => p.PaymentID == paymentId);
}
