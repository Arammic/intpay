using IntPay.Api.supabase.Models;

namespace IntPay.Api.supabase;

/// <summary>Audit log feed for all cards where the user is creator or receiver.</summary>
public sealed class UserTransactionsResponse
{
    public int UserId { get; set; }
    public int Total { get; set; }
    public int Limit { get; set; }
    public int Offset { get; set; }
    public List<AuditLogDto> Logs { get; set; } = new();
}
