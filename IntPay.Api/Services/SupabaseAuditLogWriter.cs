using IntPay.Api.supabase.Models;
using Supabase;

namespace IntPay.Api.Services;

public sealed class SupabaseAuditLogWriter : IAuditLogWriter
{
    private readonly Client _client;

    public SupabaseAuditLogWriter(Client client) => _client = client;

    public async Task InsertAsync(AuditLog entry, CancellationToken cancellationToken = default) =>
        await _client.From<AuditLog>().Insert(entry);
}
