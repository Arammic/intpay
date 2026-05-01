namespace IntPay.Api.supabase;

/// <summary>POST /api/v1/cards/{cardId}/lifecycle-status — sets <c>virtual_cards.status</c> to active or inactive.</summary>
public sealed record SetCardLifecycleStatusRequest(string Status, int ActingUserId);
