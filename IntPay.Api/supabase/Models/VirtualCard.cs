using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;

namespace IntPay.Api.supabase.Models;
[Table("virtual_cards")]
public class VirtualCard : BaseModel
{
    [PrimaryKey("id", false)]
    public int Id { get; set; }

    [Column("stripe_card_id")]
    public string StripeCardId { get; set; }

    [Column("intent_id")]
    public int IntentId { get; set; }

    [Column("card_number")]
    public string? CardNumber { get; set; }

    [Column("last4")]
    public string? Last4 { get; set; }

    [Column("cardholder_name")]
    public string? CardholderName { get; set; }

    [Column("exp_month")]
    public int? ExpMonth { get; set; }

    [Column("exp_year")]
    public int? ExpYear { get; set; }

    [Column("status")]
    public string Status { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    [Column("card_cvv")]
    public string? CardCvv { get; set; }

    [Column("is_locked_by_pending_invoice")]
    public bool IsLockedByPendingInvoice { get; set; }

    [Column("is_manually_frozen")]
    public bool IsManuallyFrozen { get; set; }

    [Column("is_request_refund")]
    public bool IsRequestRefund { get; set; }
}