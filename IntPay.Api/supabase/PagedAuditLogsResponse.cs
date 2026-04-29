using IntPay.Api.supabase.Models;

namespace IntPay.Api.supabase;

public class PagedAuditLogsResponse
{
  public int CardId { get; set; }
  public int Total { get; set; }
  public int Limit { get; set; }
  public int Offset { get; set; }
  public List<AuditLogDto> Logs { get; set; } = new();
}