namespace IntPay.Api.supabase;

/// <summary>POST /api/v1/verify-invoice body.</summary>
public sealed record VerifyInvoiceRequest(int IntentId, string ImageUrl);
