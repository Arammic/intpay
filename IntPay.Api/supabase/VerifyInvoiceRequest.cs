namespace IntPay.Api.supabase;

/// <summary>POST /api/v1/verify-invoice body. ActingUserId is the temporary request-level auth boundary.</summary>
public sealed record VerifyInvoiceRequest(int IntentId, string ImageUrl, int ActingUserId);
