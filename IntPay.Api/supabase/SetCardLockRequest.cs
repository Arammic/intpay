namespace IntPay.Api.supabase;

/// <summary>POST /api/v1/cards/{cardId}/lock-state — toggles manual freeze only (<c>virtual_cards.is_manually_frozen</c>), not invoice verification.</summary>
public sealed record SetCardLockRequest(bool Locked, int ActingUserId);
