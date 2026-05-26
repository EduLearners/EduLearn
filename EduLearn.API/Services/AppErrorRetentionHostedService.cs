using EduLearn.API.Data;
using Microsoft.EntityFrameworkCore;

namespace EduLearn.API.Services;

public class AppErrorRetentionHostedService : BackgroundService
{
    private readonly IServiceProvider _sp;
    private readonly ILogger<AppErrorRetentionHostedService> _logger;
    private readonly TimeSpan _interval = TimeSpan.FromHours(24);
    private readonly TimeSpan _retain   = TimeSpan.FromDays(90);

    public AppErrorRetentionHostedService(IServiceProvider sp, ILogger<AppErrorRetentionHostedService> logger)
    { _sp = sp; _logger = logger; }

    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        while (!ct.IsCancellationRequested)
        {
            try
            {
                using var scope = _sp.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                var cutoff = DateTime.UtcNow - _retain;
                var removed = await db.AppErrors
                    .Where(e => e.Resolved && e.ResolvedAt < cutoff)
                    .ExecuteDeleteAsync(ct);
                if (removed > 0) _logger.LogInformation("Retention purged {N} resolved AppErrors older than {Cutoff}", removed, cutoff);
                else             _logger.LogInformation("Retention scan: 0 rows purged");
            }
            catch (Exception ex) { _logger.LogWarning(ex, "Retention scan failed"); }
            await Task.Delay(_interval, ct);
        }
    }
}
