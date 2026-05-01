namespace IntPay.Api.supabase;

/// <summary>Whitelisted metadata updates only (no amount / remaining / uses).</summary>
public sealed class PatchIntentRequest
{
    public string? Description { get; set; }
    public string? City { get; set; }
    public string? Country { get; set; }
    public string? Category { get; set; }
    public List<string>? MccList { get; set; }
    public bool? RequiredInvoiceProve { get; set; }
}
