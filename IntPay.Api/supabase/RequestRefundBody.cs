namespace IntPay.Api.supabase;

/// <summary>POST /api/v1/cards/{cardId}/request-refund — sets <c>is_request_refund</c> on the virtual card.</summary>
public sealed class RequestRefundBody
{
    public int ActingUserId { get; set; }
}
