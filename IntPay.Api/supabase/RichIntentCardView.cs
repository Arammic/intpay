using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;

namespace IntPay.Api.supabase;

[Table("rich_intent_cards")]
public class RichIntentCardView : BaseModel
{
    [Column("intent_id")] public int IntentId { get; set; }
    [Column("creator_id")] public int CreatorId { get; set; }
    [Column("receiver_id")] public int ReceiverId { get; set; }
    [Column("amount")] public decimal Amount { get; set; }
    [Column("remaining_amount")] public decimal RemainingAmount { get; set; }
    /// <summary><c>virtual_cards.status</c> (active | inactive), not intent status.</summary>
    [Column("status")] public string Status { get; set; } = string.Empty;
    [Column("mcc_codes")] public List<string> MccCodes { get; set; } = new();
    [Column("first_date_to_user")] public DateTime? FirstDateToUser { get; set; }
    [Column("created_at")] public DateTime CreatedAt { get; set; }

    // Intent extra fields (added)
    [Column("city")] public string? City { get; set; }
    [Column("country")] public string? Country { get; set; }
    [Column("use_times")] public int UseTimes { get; set; }
    [Column("uses_left")] public int UsesLeft { get; set; }
    [Column("description")] public string? Description { get; set; }
    [Column("required_invoice_prove")] public bool RequiredInvoiceProve { get; set; }

    // Card Details
    [Column("card_id")] public int CardId { get; set; }
    [Column("card_number")] public string CardNumber { get; set; } = string.Empty;
    [Column("last4")] public string Last4 { get; set; } = string.Empty;
    [Column("card_cvv")] public string CardCvv { get; set; } = string.Empty;
    [Column("cardholder_name")] public string CardholderName { get; set; } = string.Empty;
    [Column("exp_month")] public int ExpMonth { get; set; }
    [Column("exp_year")] public int ExpYear { get; set; }
    [Column("stripe_card_id")] public string StripeCardId { get; set; } = string.Empty;

    [Column("sender_name")] public string? SenderName { get; set; }

    [Column("is_locked_by_pending_invoice")] public bool IsLockedByPendingInvoice { get; set; }
    [Column("is_manually_frozen")] public bool IsManuallyFrozen { get; set; }

    [Column("is_request_refund")] public bool IsRequestRefund { get; set; }
}
