using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;

namespace IntPay.Api.supabase.Models;
[Table("intents")]
public class Intent : BaseModel
{
    [PrimaryKey("id", false)]
    public int Id { get; set; }

    [Column("creator_id")]
    public int CreatorId { get; set; }

    [Column("receiver_id")]
    public int ReceiverId { get; set; }

    [Column("amount")]
    public decimal Amount { get; set; }

    [Column("remaining_amount")]
    public decimal RemainingAmount { get; set; }

    [Column("use_times")]
    public int UseTimes { get; set; }

    [Column("uses_left")]
    public int UsesLeft { get; set; }

    [Column("expiry_at")]
    public DateTime? ExpiryAt { get; set; }

    [Column("country")]
    public string? Country { get; set; }

    [Column("city")]
    public string? City { get; set; }

    [Column("description")]
    public string? Description { get; set; }

    [Column("status")]
    public string Status { get; set; } // intent_status

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    [Column("category")]
    public string? Category { get; set; }

    [Column("mcc_codes")]
    public List<string> MccCodes { get; set; }

    [Column("first_date_to_user")]
    public DateTime? FirstDateToUser { get; set; }

    [Column("required_invoice_prove")]
    public bool RequiredInvoiceProve { get; set; }
}