namespace IntPay.Api.supabase;
public record CreateIntentRequest(
    int CreatorId,
    int UserId, // The Receiver
    decimal Amount,
    int UseTimes,
    DateTime? ExpiryDate = null,
    string? Country = null,
    string? City = null,
    string? Description = null,
    List<string>? MccList = null,
    DateTime? FirstDateToUser = null,
    bool RequiredInvoiceProve = false
);