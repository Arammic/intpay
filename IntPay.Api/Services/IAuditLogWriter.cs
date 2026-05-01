using IntPay.Api.supabase.Models;

namespace IntPay.Api.Services;

/// <summary>Narrow port for inserting governance and payment audit rows (Clean Architecture boundary over Supabase).</summary>
public interface IAuditLogWriter
{
    Task InsertAsync(AuditLog entry, CancellationToken cancellationToken = default);
}
