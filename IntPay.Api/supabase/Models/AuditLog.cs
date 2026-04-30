using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;

namespace IntPay.Api.supabase.Models;
[Table("audit_logs")]
public class AuditLog : BaseModel
{
    [PrimaryKey("id", false)]
    public int Id { get; set; }

    [Column("card_id")]
    public int CardId { get; set; }

    [Column("transaction_amount")]
    public decimal TransactionAmount { get; set; }

    [Column("merchant_name")]
    public string? MerchantName { get; set; }

    [Column("mcc")]
    public string? Mcc { get; set; }

    [Column("decision")]
    public string Decision { get; set; } // USER-DEFINED

    [Column("reason")]
    public string? Reason { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    [Column("city")]
    public string? City { get; set; }

    /// <summary>Logical entity for this audit row (e.g. intent id for invoice verification).</summary>
    [Column("entity_id")]
    public int? EntityId { get; set; }

    [Column("action")]
    public string? Action { get; set; }

    /// <summary>JSON payload (stored as jsonb).</summary>
    [Column("response_data")]
    public string? ResponseData { get; set; }

    /// <summary>When the audited event occurred (mirrors API "Timestamp").</summary>
    [Column("occurred_at")]
    public DateTime? OccurredAt { get; set; }
}