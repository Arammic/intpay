using IntPay.Api.supabase.Models;

namespace IntPay.Api.supabase;

/// <summary>Audit logs for virtual cards where the user is the intent receiver, newest first.</summary>
public sealed class ReceiverPagedAuditLogsResponse
{
    public int ReceiverUserId { get; set; }
    public int Total { get; set; }
    public int Limit { get; set; }
    public int Offset { get; set; }
    public List<AuditLogDto> Logs { get; set; } = new();
}
