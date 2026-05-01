using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;

namespace IntPay.Api.supabase.Models;
[Table("audit_logs")]
public class AuditLog : BaseModel
{
    [PrimaryKey("id", false)]
    public int Id { get; set; }

    /// <summary>Null when the event is not tied to a card (e.g. profile vault change via DB trigger, unknown PAN).</summary>
    [Column("card_id")]
    public int? CardId { get; set; }

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

    /// <summary>When the audited event occurred (mirrors API "Timestamp").</summary>
    [Column("occurred_at")]
    public DateTime? OccurredAt { get; set; }

    [Column("user_id")]
    public int? UserId { get; set; }

    [Column("entity_type")]
    public string? EntityType { get; set; }

    /// <summary>Simplified outcome: success | failed | info (business audit column).</summary>
    [Column("status")]
    public string? OutcomeStatus { get; set; }

    [Column("before_balance")]
    public decimal? BeforeBalance { get; set; }

    [Column("after_balance")]
    public decimal? AfterBalance { get; set; }

    [Column("before_status")]
    public string? BeforeStatus { get; set; }

    [Column("after_status")]
    public string? AfterStatus { get; set; }

    [Column("note")]
    public string? Note { get; set; }
}
